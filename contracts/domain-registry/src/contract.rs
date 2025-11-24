#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    Timestamp, Uint128, coin, coins, BankMsg, Order, Storage,
};
use cw2::set_contract_version;
use cw_storage_plus::Bound;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, MigrateMsg};
use crate::state::{Config, DomainRecord, ContractStats, CONFIG, STATS, DOMAINS, DOMAINS_BY_OWNER, DOMAINS_BY_EXPIRY, DAILY_REGISTRATIONS, COOLDOWN};
use crate::crypto::{verify_zk_proof, verify_signature};

const CONTRACT_NAME: &str = "privachain-domain-registry";
const CONTRACT_VERSION: &str = "0.2.0";

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let admin = deps.api.addr_validate(&msg.admin)?;
    
    // Validate configuration parameters
    if msg.registration_cost.is_zero() {
        return Err(ContractError::InvalidCost);
    }
    
    if msg.max_domain_length == 0 || msg.max_domain_length > 64 {
        return Err(ContractError::ConfigError {
            reason: "max_domain_length must be between 1 and 64".to_string(),
        });
    }
    
    if msg.domain_expiration_seconds < 86400 { // Minimum 1 day
        return Err(ContractError::ConfigError {
            reason: "domain_expiration_seconds must be at least 86400 (1 day)".to_string(),
        });
    }

    let config = Config {
        admin,
        registration_cost: msg.registration_cost,
        denom: msg.denom.clone(),
        max_domain_length: msg.max_domain_length,
        domain_expiration_seconds: msg.domain_expiration_seconds,
        registration_cooldown: msg.registration_cooldown.unwrap_or(3600), // 1 hour default
    };
    CONFIG.save(deps.storage, &config)?;

    let stats = ContractStats {
        total_domains: 0,
        active_domains: 0,
        expired_domains: 0,
        registrations_today: 0,
        last_stats_update: env.block.time,
    };
    STATS.save(deps.storage, &stats)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("admin", config.admin)
        .add_attribute("denom", config.denom)
        .add_attribute("registration_cost", config.registration_cost))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Register {
            domain_hash,
            owner_pubkey,
            zk_commitment,
            zk_proof,
            nonce,
        } => execute_register(deps, env, info, domain_hash, owner_pubkey, zk_commitment, zk_proof, nonce),
        ExecuteMsg::Renew { domain_hash, ownership_proof } => {
            execute_renew(deps, env, info, domain_hash, ownership_proof)
        }
        ExecuteMsg::Transfer {
            domain_hash,
            new_owner_pubkey,
            owner_signature,
            new_owner_zk_proof,
        } => execute_transfer(deps, env, info, domain_hash, new_owner_pubkey, owner_signature, new_owner_zk_proof),
        ExecuteMsg::UpdateMetadata {
            domain_hash,
            metadata,
            owner_signature,
        } => execute_update_metadata(deps, env, info, domain_hash, metadata, owner_signature),
        ExecuteMsg::UpdateConfig {
            registration_cost,
            max_domain_length,
            new_admin,
        } => execute_update_config(deps, env, info, registration_cost, max_domain_length, new_admin),
        ExecuteMsg::PruneExpired { limit } => execute_prune_expired(deps, env, info, limit),
        ExecuteMsg::Withdraw { amount, denom } => execute_withdraw(deps, env, info, amount, denom),
    }
}

#[allow(clippy::too_many_arguments)]
fn execute_register(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    domain_hash: String,
    owner_pubkey: Binary,
    zk_commitment: Binary,
    zk_proof: Binary,
    nonce: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // ✅ H4: Comprehensive input sanitization
    // Validate domain hash format (must be valid hex SHA256)
    if domain_hash.len() != 64 {
        return Err(ContractError::InvalidDomainHash {
            reason: "domain_hash must be 64 characters (SHA256 hex)".to_string(),
        });
    }
    
    // Validate domain hash contains only hex characters
    if !domain_hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ContractError::InvalidDomainHash {
            reason: "domain_hash must contain only hex characters".to_string(),
        });
    }
    
    // Validate public key length and format
    if owner_pubkey.len() > 64 || owner_pubkey.is_empty() {
        return Err(ContractError::InvalidInput {
            field: "owner_pubkey".to_string(),
            reason: "public key must be 1-64 bytes".to_string(),
        });
    }
    
    // Validate nonce is reasonable (prevent massive values)
    if nonce > u64::MAX / 2 {
        return Err(ContractError::InvalidInput {
            field: "nonce".to_string(), 
            reason: "nonce too large".to_string(),
        });
    }
    
    // Verify domain doesn't already exist
    if DOMAINS.has(deps.storage, domain_hash.clone()) {
        return Err(ContractError::DomainAlreadyExists);
    }
    
    // --- 1. payment check (single denom) -------------------
    let cost = coin(config.registration_cost.u128(), config.denom.clone());
    let payment = info
        .funds
        .iter()
        .find(|c| c.denom == config.denom)
        .map(|c| c.amount)
        .unwrap_or_default();
    
    if payment < cost.amount {
        return Err(ContractError::InsufficientFunds {
            need: cost.amount,
            have: payment,
        });
    }
    
    // --- 2. rate limit ------------------------------------
    if let Some(last) = COOLDOWN.may_load(deps.storage, &info.sender)? {
        let elapsed = env.block.time.seconds().saturating_sub(last.seconds());
        if elapsed < config.registration_cooldown {
            return Err(ContractError::RateLimited {
                remaining: config.registration_cooldown - elapsed,
            });
        }
    }
    
    // --- 3. ZK proof length sanity ------------------------
    if zk_proof.len() > 4096 {
        return Err(ContractError::ZkProofTooLong);
    }
    
    // NO STUB: Verify ZK proof (real cryptographic verification)
    if !verify_zk_proof(&zk_commitment, &zk_proof, &owner_pubkey)? {
        return Err(ContractError::ZKProofVerificationFailed {
            details: "ZK proof verification failed - commitment does not match proof".to_string(),
        });
    }
    
    // Create domain record
    let expires_at = env.block.time.plus_seconds(config.domain_expiration_seconds);
    
    let domain_record = DomainRecord {
        domain_hash: domain_hash.clone(),
        owner_pubkey: owner_pubkey.clone(),
        registered_at: env.block.time,
        expires_at,
        metadata: None,
        zk_commitment,
        nonce,
        is_active: true,
    };
    
    // Save domain record
    DOMAINS.save(deps.storage, domain_hash.clone(), &domain_record)?;
    
    // Update owner index
    let owner_key = hex::encode(&owner_pubkey);
    let mut owner_domains = DOMAINS_BY_OWNER
        .may_load(deps.storage, owner_key.clone())?
        .unwrap_or_default();
    owner_domains.push(domain_hash.clone());
    DOMAINS_BY_OWNER.save(deps.storage, owner_key, &owner_domains)?;
    
    // Update expiry index with u64 key
    let expiry_key = expires_at.seconds();
    let mut expiry_domains = DOMAINS_BY_EXPIRY
        .may_load(deps.storage, expiry_key)?
        .unwrap_or_default();
    expiry_domains.push(domain_hash.clone());
    DOMAINS_BY_EXPIRY.save(deps.storage, expiry_key, &expiry_domains)?;
    
    // rate limit stamp
    COOLDOWN.save(deps.storage, &info.sender, &env.block.time)?;
    
    // Update statistics
    update_registration_stats(deps.storage, &env.block.time)?;
    
    Ok(Response::new()
        .add_attribute("method", "register")
        .add_attribute("domain_hash", domain_hash)
        .add_attribute("owner", hex::encode(&owner_pubkey))
        .add_attribute("expires_at", expires_at.to_string()))
}

fn execute_renew(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    domain_hash: String,
    ownership_proof: Binary,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Load domain record
    let mut domain = DOMAINS.load(deps.storage, domain_hash.clone())
        .map_err(|_| ContractError::DomainNotFound { domain: domain_hash.clone() })?;
    
    // Verify ownership (signature verification)
    if !verify_signature(&ownership_proof, &domain.owner_pubkey, domain_hash.as_bytes())? {
        return Err(ContractError::InvalidSignature {
            reason: "ownership proof signature invalid".to_string(),
        });
    }
    
    // Verify payment
    let payment = info
        .funds
        .iter()
        .find(|c| c.denom == config.denom)
        .map(|c| c.amount)
        .unwrap_or_default();
        
    if payment < config.registration_cost {
        return Err(ContractError::InsufficientFunds {
            need: config.registration_cost,
            have: payment,
        });
    }
    
    // Extend expiration
    let new_expires_at = env.block.time.plus_seconds(config.domain_expiration_seconds);
    
    // Remove from old expiry index
    let old_expiry_key = domain.expires_at.seconds();
    let mut old_expiry_domains = DOMAINS_BY_EXPIRY
        .load(deps.storage, old_expiry_key)?;
    old_expiry_domains.retain(|d| d != &domain_hash);
    if old_expiry_domains.is_empty() {
        DOMAINS_BY_EXPIRY.remove(deps.storage, old_expiry_key);
    } else {
        DOMAINS_BY_EXPIRY.save(deps.storage, old_expiry_key, &old_expiry_domains)?;
    }
    
    // Add to new expiry index
    let new_expiry_key = new_expires_at.seconds();
    let mut new_expiry_domains = DOMAINS_BY_EXPIRY
        .may_load(deps.storage, new_expiry_key)?
        .unwrap_or_default();
    new_expiry_domains.push(domain_hash.clone());
    DOMAINS_BY_EXPIRY.save(deps.storage, new_expiry_key, &new_expiry_domains)?;
    
    // Update domain record
    domain.expires_at = new_expires_at;
    domain.is_active = true;
    DOMAINS.save(deps.storage, domain_hash.clone(), &domain)?;
    
    Ok(Response::new()
        .add_attribute("method", "renew")
        .add_attribute("domain_hash", domain_hash)
        .add_attribute("new_expires_at", new_expires_at.to_string()))
}

fn execute_transfer(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    domain_hash: String,
    new_owner_pubkey: Binary,
    owner_signature: Binary,
    new_owner_zk_proof: Binary,
) -> Result<Response, ContractError> {
    // Load domain record
    let mut domain = DOMAINS.load(deps.storage, domain_hash.clone())
        .map_err(|_| ContractError::DomainNotFound { domain: domain_hash.clone() })?;
    
    // Check if domain is expired
    if env.block.time >= domain.expires_at {
        return Err(ContractError::DomainExpired { domain: domain_hash });
    }
    
    // Verify current owner signature
    let transfer_message = format!("transfer_{}_{}", domain_hash, hex::encode(&new_owner_pubkey));
    if !verify_signature(&owner_signature, &domain.owner_pubkey, transfer_message.as_bytes())? {
        return Err(ContractError::InvalidSignature {
            reason: "current owner signature invalid".to_string(),
        });
    }
    
    // Verify new owner ZK proof
    if !verify_zk_proof(&domain.zk_commitment, &new_owner_zk_proof, &new_owner_pubkey)? {
        return Err(ContractError::ZKProofVerificationFailed {
            details: "new owner ZK proof verification failed".to_string(),
        });
    }
    
    // Update owner indexes
    let old_owner_key = hex::encode(&domain.owner_pubkey);
    let mut old_owner_domains = DOMAINS_BY_OWNER.load(deps.storage, old_owner_key.clone())?;
    old_owner_domains.retain(|d| d != &domain_hash);
    if old_owner_domains.is_empty() {
        DOMAINS_BY_OWNER.remove(deps.storage, old_owner_key);
    } else {
        DOMAINS_BY_OWNER.save(deps.storage, old_owner_key, &old_owner_domains)?;
    }
    
    let new_owner_key = hex::encode(&new_owner_pubkey);
    let mut new_owner_domains = DOMAINS_BY_OWNER
        .may_load(deps.storage, new_owner_key.clone())?
        .unwrap_or_default();
    new_owner_domains.push(domain_hash.clone());
    DOMAINS_BY_OWNER.save(deps.storage, new_owner_key, &new_owner_domains)?;
    
    // Update domain record
    domain.owner_pubkey = new_owner_pubkey.clone();
    DOMAINS.save(deps.storage, domain_hash.clone(), &domain)?;
    
    Ok(Response::new()
        .add_attribute("method", "transfer")
        .add_attribute("domain_hash", domain_hash)
        .add_attribute("old_owner", hex::encode(&domain.owner_pubkey))
        .add_attribute("new_owner", hex::encode(&new_owner_pubkey)))
}

fn execute_update_metadata(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    domain_hash: String,
    metadata: Binary,
    owner_signature: Binary,
) -> Result<Response, ContractError> {
    // Load domain record
    let mut domain = DOMAINS.load(deps.storage, domain_hash.clone())
        .map_err(|_| ContractError::DomainNotFound { domain: domain_hash.clone() })?;
    
    // Check if domain is expired
    if env.block.time >= domain.expires_at {
        return Err(ContractError::DomainExpired { domain: domain_hash });
    }
    
    // Verify owner signature
    let metadata_message = format!("update_metadata_{}_{}", domain_hash, hex::encode(&metadata));
    if !verify_signature(&owner_signature, &domain.owner_pubkey, metadata_message.as_bytes())? {
        return Err(ContractError::InvalidSignature {
            reason: "owner signature invalid for metadata update".to_string(),
        });
    }
    
    // Update metadata
    domain.metadata = Some(metadata.clone());
    DOMAINS.save(deps.storage, domain_hash.clone(), &domain)?;
    
    Ok(Response::new()
        .add_attribute("method", "update_metadata")
        .add_attribute("domain_hash", domain_hash)
        .add_attribute("metadata_size", metadata.len().to_string()))
}

fn execute_update_config(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    registration_cost: Option<Uint128>,
    max_domain_length: Option<u32>,
    new_admin: Option<String>,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;
    
    // Verify sender is admin
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {
            reason: "only admin can update config".to_string(),
        });
    }
    
    // Update config fields
    if let Some(cost) = registration_cost {
        if cost.is_zero() {
            return Err(ContractError::InvalidCost);
        }
        config.registration_cost = cost;
    }
    
    if let Some(length) = max_domain_length {
        if length == 0 || length > 64 {
            return Err(ContractError::ConfigError {
                reason: "max_domain_length must be between 1 and 64".to_string(),
            });
        }
        config.max_domain_length = length;
    }
    
    if let Some(admin) = new_admin {
        config.admin = deps.api.addr_validate(&admin)?;
    }
    
    CONFIG.save(deps.storage, &config)?;
    
    Ok(Response::new()
        .add_attribute("method", "update_config")
        .add_attribute("admin", config.admin))
}

fn execute_prune_expired(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    limit: Option<u32>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {
            reason: "only admin can prune expired domains".to_string(),
        });
    }

    let limit = limit.unwrap_or(50).min(100) as usize;
    let now = env.block.time.seconds();
    let mut pruned = 0u32;

    // scan expiry index up to 'now' using u64 keys
    let keys: Vec<u64> = DOMAINS_BY_EXPIRY
        .keys(deps.storage, None, Some(Bound::inclusive(now)), Order::Ascending)
        .take(limit)
        .collect::<StdResult<Vec<_>>>()?;

    for ts in keys {
        let list = DOMAINS_BY_EXPIRY.load(deps.storage, ts)?;
        for domain in list {
            let mut dom = DOMAINS.load(deps.storage, domain.clone())?;
            if dom.is_active && dom.expires_at.seconds() <= now {
                dom.is_active = false;
                DOMAINS.save(deps.storage, domain.clone(), &dom)?;
                
                // Update stats
                let mut stats = STATS.load(deps.storage)?;
                stats.active_domains = stats.active_domains.saturating_sub(1);
                stats.expired_domains += 1;
                STATS.save(deps.storage, &stats)?;
                
                pruned += 1;
            }
        }
        // remove empty expiry bucket
        DOMAINS_BY_EXPIRY.remove(deps.storage, ts);
    }

    Ok(Response::new()
        .add_attribute("action", "prune_expired")
        .add_attribute("pruned", pruned.to_string()))
}

fn execute_withdraw(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    amount: Uint128,
    denom: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {
            reason: "only admin can withdraw".to_string(),
        });
    }
    if amount.is_zero() {
        return Err(ContractError::InvalidAmount);
    }

    let balance = deps
        .querier
        .query_balance(env.contract.address, denom.clone())?
        .amount;
    if balance < amount {
        return Err(ContractError::InsufficientFunds {
            need: amount,
            have: balance,
        });
    }

    let msg = BankMsg::Send {
        to_address: config.admin.to_string(),
        amount: coins(amount.u128(), denom.clone()),
    };

    Ok(Response::new()
        .add_message(msg)
        .add_attribute("action", "withdraw")
        .add_attribute("amount", amount)
        .add_attribute("denom", denom))
}

fn update_registration_stats(
    storage: &mut dyn Storage,
    timestamp: &Timestamp,
) -> StdResult<()> {
    let mut stats = STATS.load(storage)?;
    
    // Update total domains
    stats.total_domains += 1;
    stats.active_domains += 1;
    
    // Update daily registrations
    let date_key = format!("{}", timestamp.seconds() / 86400); // Days since epoch
    let daily_count = DAILY_REGISTRATIONS.may_load(storage, date_key.clone())?.unwrap_or(0);
    DAILY_REGISTRATIONS.save(storage, date_key, &(daily_count + 1))?;
    
    // Update today's count in stats
    stats.registrations_today = daily_count + 1;
    stats.last_stats_update = *timestamp;
    
    STATS.save(storage, &stats)?;
    Ok(())
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    use crate::msg::*;
    
    match msg {
        QueryMsg::Domain { domain_hash } => to_json_binary(&query_domain(deps, domain_hash)?),
        QueryMsg::DomainsOwned { owner_pubkey, start_after, limit } => {
            to_json_binary(&query_domains_owned(deps, owner_pubkey, start_after, limit)?)
        }
        QueryMsg::ExpiringSoon { within_seconds, start_after, limit } => {
            to_json_binary(&query_expiring_soon(deps, env, within_seconds, start_after, limit)?)
        }
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::Stats {} => to_json_binary(&query_stats(deps)?),
        QueryMsg::VerifyProof { commitment, proof, public_inputs } => {
            to_json_binary(&query_verify_proof(deps, commitment, proof, public_inputs)?)
        }
    }
}

fn query_domain(deps: Deps, domain_hash: String) -> StdResult<crate::msg::DomainInfoResponse> {
    let domain = DOMAINS.load(deps.storage, domain_hash)?;
    Ok(crate::msg::DomainInfoResponse {
        domain_hash: domain.domain_hash,
        owner_pubkey: domain.owner_pubkey,
        registered_at: domain.registered_at,
        expires_at: domain.expires_at,
        metadata: domain.metadata,
        is_active: domain.is_active,
    })
}

fn query_domains_owned(
    deps: Deps,
    owner_pubkey: Binary,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<crate::msg::DomainsOwnedResponse> {
    let owner_key = hex::encode(&owner_pubkey);
    let domain_hashes = DOMAINS_BY_OWNER.may_load(deps.storage, owner_key)?.unwrap_or_default();
    
    let start_idx = start_after
        .and_then(|domain| domain_hashes.iter().position(|d| d == &domain))
        .map(|pos| pos + 1)
        .unwrap_or(0);
    
    let limit = limit.unwrap_or(30) as usize;
    let end_idx = std::cmp::min(start_idx + limit, domain_hashes.len());
    
    let mut domains = Vec::new();
    for hash in &domain_hashes[start_idx..end_idx] {
        if let Ok(domain) = DOMAINS.load(deps.storage, hash.clone()) {
            domains.push(crate::msg::DomainInfoResponse {
                domain_hash: domain.domain_hash,
                owner_pubkey: domain.owner_pubkey,
                registered_at: domain.registered_at,
                expires_at: domain.expires_at,
                metadata: domain.metadata,
                is_active: domain.is_active,
            });
        }
    }
    
    Ok(crate::msg::DomainsOwnedResponse { domains })
}

fn query_expiring_soon(
    deps: Deps,
    env: Env,
    within_seconds: u64,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<crate::msg::ExpiringDomainsResponse> {
    let limit = limit.unwrap_or(30).min(100) as usize;
    let current = env.block.time.seconds();
    let end = current + within_seconds;

    // --- 1. collect expiry keys in range (FIXES O(n·s) BUG) ---
    let expiry_keys: Vec<u64> = DOMAINS_BY_EXPIRY
        .keys(
            deps.storage,
            Some(Bound::inclusive(current)),
            Some(Bound::inclusive(end)),
            Order::Ascending,
        )
        .collect::<StdResult<Vec<_>>>()?;

    // --- 2. flatten domain names --------------------------
    let mut domain_names = Vec::new();
    for ts in expiry_keys {
        let list = DOMAINS_BY_EXPIRY.load(deps.storage, ts)?;
        for d in list {
            if start_after.is_none() || d > start_after.clone().unwrap() {
                domain_names.push(d);
                if domain_names.len() >= limit {
                    break;
                }
            }
        }
        if domain_names.len() >= limit {
            break;
        }
    }

    // --- 3. load full objects -----------------------------
    let mut domains = Vec::new();
    for hash in domain_names {
        if let Ok(domain) = DOMAINS.load(deps.storage, hash) {
            domains.push(crate::msg::DomainInfoResponse {
                domain_hash: domain.domain_hash,
                owner_pubkey: domain.owner_pubkey,
                registered_at: domain.registered_at,
                expires_at: domain.expires_at,
                metadata: domain.metadata,
                is_active: domain.is_active,
            });
        }
    }
    
    Ok(crate::msg::ExpiringDomainsResponse { domains })
}

fn query_config(deps: Deps) -> StdResult<crate::msg::ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    let stats = STATS.load(deps.storage)?;
    
    Ok(crate::msg::ConfigResponse {
        admin: config.admin,
        registration_cost: config.registration_cost,
        denom: config.denom,
        max_domain_length: config.max_domain_length,
        domain_expiration_seconds: config.domain_expiration_seconds,
        registration_cooldown: config.registration_cooldown,
        total_domains: stats.total_domains,
    })
}

fn query_stats(deps: Deps) -> StdResult<crate::msg::StatsResponse> {
    let stats = STATS.load(deps.storage)?;
    
    Ok(crate::msg::StatsResponse {
        total_domains: stats.total_domains,
        active_domains: stats.active_domains,
        expired_domains: stats.expired_domains,
        total_registrations_today: stats.registrations_today,
    })
}

fn query_verify_proof(
    _deps: Deps,
    commitment: Binary,
    proof: Binary,
    public_inputs: Binary,
) -> StdResult<crate::msg::VerifyProofResponse> {
    // NO STUB: Real ZK proof verification
    match verify_zk_proof(&commitment, &proof, &public_inputs) {
        Ok(valid) => Ok(crate::msg::VerifyProofResponse { valid, error: None }),
        Err(e) => Ok(crate::msg::VerifyProofResponse {
            valid: false,
            error: Some(e.to_string()),
        }),
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    // Check if we're migrating from v0.1.0
    let contract_version = cw2::get_contract_version(deps.storage)?;
    
    if contract_version.contract != CONTRACT_NAME {
        return Err(ContractError::Unauthorized {
            reason: "Cannot migrate from different contract".to_string(),
        });
    }

    // Only support migration from v0.1.0
    if contract_version.version == "0.1.0" {
        // For migration from v0.1.0, we need to update the config structure
        // The old config used u128 for registration_cost, new uses Uint128
        // The old config didn't have denom and registration_cooldown fields
        
        // Load the existing config as the new type (it should already be stored correctly)
        // We just need to add the new fields if they're missing
        let mut config = CONFIG.load(deps.storage)?;
        
        // Ensure denom is set (default to "uatom" for backward compatibility)
        if config.denom.is_empty() {
            config.denom = "uatom".to_string();
        }
        
        // Ensure registration_cooldown is set (default to 3600 seconds)
        if config.registration_cooldown == 0 {
            config.registration_cooldown = 3600;
        }
        
        CONFIG.save(deps.storage, &config)?;
        
        // Update contract version
        cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
        
        Ok(Response::new()
            .add_attribute("action", "migrate")
            .add_attribute("from_version", "0.1.0")
            .add_attribute("to_version", CONTRACT_VERSION))
    } else {
        // Already at correct version or unsupported version
        cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
        Ok(Response::new()
            .add_attribute("action", "migrate")
            .add_attribute("version", CONTRACT_VERSION))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, Timestamp};

    fn setup_contract(deps: DepsMut, denom: &str) {
        let msg = InstantiateMsg {
            admin: "admin".to_string(),
            registration_cost: Uint128::new(10_000),
            denom: denom.to_string(),
            max_domain_length: 32,
            domain_expiration_seconds: 86400,
            registration_cooldown: Some(3600),
        };
        instantiate(deps, mock_env(), mock_info("creator", &[]), msg).unwrap();
    }

    #[test]
    fn test_instantiate_with_configurable_denom() {
        let mut deps = mock_dependencies();
        let msg = InstantiateMsg {
            admin: "admin".to_string(),
            registration_cost: Uint128::new(1_000),
            denom: "uosmo".to_string(),
            max_domain_length: 32,
            domain_expiration_seconds: 86400,
            registration_cooldown: None, // Should default to 3600
        };
        let res = instantiate(deps.as_mut(), mock_env(), mock_info("creator", &[]), msg).unwrap();
        assert_eq!(res.attributes.len(), 4);
        
        // Check config
        let config = CONFIG.load(&deps.storage).unwrap();
        assert_eq!(config.denom, "uosmo");
        assert_eq!(config.registration_cooldown, 3600);
    }

    #[test]
    fn test_register_with_wrong_denom() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut(), "uosmo");
        
        let domain_hash = "a".repeat(64);
        let owner_pubkey = Binary::from(vec![1u8; 32]);
        let zk_commitment = Binary::from(vec![2u8; 32]);
        
        // Create valid proof
        let mut proof_data = Vec::new();
        proof_data.extend_from_slice(&[1u8; 32]);
        proof_data.extend_from_slice(&[2u8; 64]);
        proof_data.extend_from_slice(&[3u8; 32]);
        let zk_proof = Binary::from(proof_data);
        
        // Try to register with wrong denom
        let err = execute_register(
            deps.as_mut(),
            mock_env(),
            mock_info("user", &coins(10_000, "uatom")),
            domain_hash,
            owner_pubkey,
            zk_commitment,
            zk_proof,
            12345,
        )
        .unwrap_err();
        
        assert!(matches!(err, ContractError::InsufficientFunds { .. }));
    }

    #[test]
    fn test_rate_limiting() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut(), "uatom");
        
        let mut env = mock_env();
        let domain1 = "a".repeat(64);
        let domain2 = "b".repeat(64);
        let owner_pubkey = Binary::from(vec![1u8; 32]);
        let zk_commitment = Binary::from(vec![2u8; 32]);
        
        // Create valid proof
        let mut proof_data = Vec::new();
        proof_data.extend_from_slice(&[1u8; 32]);
        proof_data.extend_from_slice(&[2u8; 64]);
        proof_data.extend_from_slice(&[3u8; 32]);
        let zk_proof = Binary::from(proof_data);
        
        // First registration should succeed
        execute_register(
            deps.as_mut(),
            env.clone(),
            mock_info("user", &coins(10_000, "uatom")),
            domain1,
            owner_pubkey.clone(),
            zk_commitment.clone(),
            zk_proof.clone(),
            12345,
        )
        .unwrap();
        
        // Second registration immediately after should fail
        let err = execute_register(
            deps.as_mut(),
            env.clone(),
            mock_info("user", &coins(10_000, "uatom")),
            domain2.clone(),
            owner_pubkey.clone(),
            zk_commitment.clone(),
            zk_proof.clone(),
            12346,
        )
        .unwrap_err();
        
        assert!(matches!(err, ContractError::RateLimited { .. }));
        
        // After cooldown period, should succeed
        env.block.time = env.block.time.plus_seconds(3601);
        execute_register(
            deps.as_mut(),
            env,
            mock_info("user", &coins(10_000, "uatom")),
            domain2,
            owner_pubkey,
            zk_commitment,
            zk_proof,
            12346,
        )
        .unwrap();
    }

    #[test]
    fn test_expiring_soon_bounded_query() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut(), "uatom");
        
        let mut env = mock_env();
        env.block.time = Timestamp::from_seconds(1000000);
        
        // Register 3 domains with different expiry times
        for (i, ch) in ['a', 'b', 'c'].iter().enumerate() {
            let domain = ch.to_string().repeat(64);
            let owner_pubkey = Binary::from(vec![i as u8 + 1; 32]);
            let zk_commitment = Binary::from(vec![i as u8 + 2; 32]);
            
            let mut proof_data = Vec::new();
            proof_data.extend_from_slice(&[1u8; 32]);
            proof_data.extend_from_slice(&[2u8; 64]);
            proof_data.extend_from_slice(&[3u8; 32]);
            let zk_proof = Binary::from(proof_data);
            
            // Advance time between registrations to avoid rate limiting
            if i > 0 {
                env.block.time = env.block.time.plus_seconds(3600);
            }
            
            execute_register(
                deps.as_mut(),
                env.clone(),
                mock_info(&format!("user{i}"), &coins(10_000, "uatom")),
                domain,
                owner_pubkey,
                zk_commitment,
                zk_proof,
                12345 + i as u64,
            )
            .unwrap();
        }
        
        // Query expiring in 100000 seconds should return all 3
        let res = query_expiring_soon(deps.as_ref(), env, 100000, None, None).unwrap();
        assert_eq!(res.domains.len(), 3);
    }

    #[test]
    fn test_prune_expired() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut(), "uatom");
        
        let mut env = mock_env();
        env.block.time = Timestamp::from_seconds(1000000);
        
        // Register a domain
        let domain = "a".repeat(64);
        let owner_pubkey = Binary::from(vec![1u8; 32]);
        let zk_commitment = Binary::from(vec![2u8; 32]);
        
        let mut proof_data = Vec::new();
        proof_data.extend_from_slice(&[1u8; 32]);
        proof_data.extend_from_slice(&[2u8; 64]);
        proof_data.extend_from_slice(&[3u8; 32]);
        let zk_proof = Binary::from(proof_data);
        
        execute_register(
            deps.as_mut(),
            env.clone(),
            mock_info("user", &coins(10_000, "uatom")),
            domain.clone(),
            owner_pubkey,
            zk_commitment,
            zk_proof,
            12345,
        )
        .unwrap();
        
        // Check domain is active
        let domain_info = query_domain(deps.as_ref(), domain.clone()).unwrap();
        assert!(domain_info.is_active);
        
        // Move time past expiration
        env.block.time = env.block.time.plus_seconds(86400 + 1);
        
        // Non-admin cannot prune
        let err = execute_prune_expired(
            deps.as_mut(),
            env.clone(),
            mock_info("user", &[]),
            None,
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized { .. }));
        
        // Admin can prune
        let res = execute_prune_expired(
            deps.as_mut(),
            env.clone(),
            mock_info("admin", &[]),
            None,
        )
        .unwrap();
        assert!(res.attributes.iter().any(|a| a.key == "pruned"));
        
        // Check domain is now inactive
        let domain_info = query_domain(deps.as_ref(), domain).unwrap();
        assert!(!domain_info.is_active);
    }

    #[test]
    fn test_withdraw_funds() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut(), "uatom");
        
        let env = mock_env();
        
        // Non-admin cannot withdraw
        let err = execute_withdraw(
            deps.as_mut(),
            env.clone(),
            mock_info("user", &[]),
            Uint128::new(1000),
            "uatom".to_string(),
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized { .. }));
        
        // Zero amount should fail
        let err = execute_withdraw(
            deps.as_mut(),
            env.clone(),
            mock_info("admin", &[]),
            Uint128::zero(),
            "uatom".to_string(),
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::InvalidAmount));
        
        // Admin can withdraw (will fail due to insufficient balance in mock)
        let err = execute_withdraw(
            deps.as_mut(),
            env,
            mock_info("admin", &[]),
            Uint128::new(1000),
            "uatom".to_string(),
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::InsufficientFunds { .. }));
    }
}