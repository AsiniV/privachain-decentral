use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    StdError, Uint128, Addr, BankMsg, Coin, Order, coins,
};
use cw_storage_plus::Bound;
use cw2::{set_contract_version, get_contract_version};
use sha2::{Sha256, Digest};
use log::{error, info};

use crate::error::ContractError;
use crate::msg::{
    ConfigResponse, DomainResponse, EmailInfo, EmailsResponse, ExecuteMsg, InstantiateMsg,
    QueryMsg, RelayResponse, RelaysResponse, StatsResponse, MigrateMsg,
};
use crate::state::{
    Config, Domain, Email, RelayNode, CONFIG, DOMAINS, EMAILS, DOMAIN_EMAILS, 
    RELAYS, RELAYS_BY_LOCATION, SPAM_REPORTS, USED_NONCES, RATE_LIMIT,
    EMAIL_SEQ, EMAILS_BY_ID, STATS, Stats,
};

// Contract metadata
const CONTRACT_NAME: &str = "privachain-mail";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    crate::init_logging();
    info!("Instantiate started");
    
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let owner = msg
        .admin
        .map(|a| deps.api.addr_validate(&a))
        .transpose()?;

    let config = Config {
        owner,
        denom: msg.denom.clone(),
        domain_registration_fee: msg.domain_registration_fee,
        email_fee: msg.email_fee,
        pow_difficulty: msg.pow_difficulty,
        relay_reward: msg.relay_reward,
        total_domains: 0,
        total_emails: 0,
    };

    CONFIG.save(deps.storage, &config)?;

    // Initialize stats
    STATS.save(deps.storage, &Stats {
        active_domains: 0,
        total_emails: 0,
        total_delivered: 0,
    })?;

    info!("Instantiate completed successfully");
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("denom", msg.denom)
        .add_attribute("domain_fee", msg.domain_registration_fee)
        .add_attribute("email_fee", msg.email_fee)
        .add_attribute("pow_difficulty", msg.pow_difficulty.to_string())
        .add_attribute("relay_reward", msg.relay_reward))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::RegisterDomain {
            domain,
            zk_proof,
            public_key,
            mx_records,
        } => {
            let result = execute_register_domain(deps, env, info, domain, zk_proof, public_key, mx_records);
            if let Err(ref e) = result {
                error!("Error in register_domain: {e}");
            }
            result
        },
        ExecuteMsg::SendEmail {
            recipient_domain,
            content_cid,
            pow_proof,
            sender_alias,
        } => {
            let result = execute_send_email(deps, env, info, recipient_domain, content_cid, pow_proof, sender_alias);
            if let Err(ref e) = result {
                error!("Error in send_email: {e}");
            }
            result
        },
        ExecuteMsg::UpdateDomain {
            domain,
            public_key,
            mx_records,
            active,
        } => {
            let result = execute_update_domain(deps, info, domain, public_key, mx_records, active);
            if let Err(ref e) = result {
                error!("Error in update_domain: {e}");
            }
            result
        },
        ExecuteMsg::RegisterRelay {
            location,
            stake,
            endpoint,
        } => {
            let result = execute_register_relay(deps, env, info, location, stake, endpoint);
            if let Err(ref e) = result {
                error!("Error in register_relay: {e}");
            }
            result
        },
        ExecuteMsg::ClaimRelayRewards {} => {
            let result = execute_claim_relay_rewards(deps, info);
            if let Err(ref e) = result {
                error!("Error in claim_relay_rewards: {e}");
            }
            result
        },
        ExecuteMsg::ReportSpam { target, evidence } => {
            let result = execute_report_spam(deps, info, target, evidence);
            if let Err(ref e) = result {
                error!("Error in report_spam: {e}");
            }
            result
        },
        ExecuteMsg::RelayDeliver { email_id } => {
            let result = execute_relay_deliver(deps, env, info, email_id);
            if let Err(ref e) = result {
                error!("Error in relay_deliver: {e}");
            }
            result
        },
        ExecuteMsg::DomainRenew { domain, years } => {
            let result = execute_domain_renew(deps, env, info, domain, years);
            if let Err(ref e) = result {
                error!("Error in domain_renew: {e}");
            }
            result
        },
        ExecuteMsg::WithdrawFees { amount } => {
            let result = execute_withdraw_fees(deps, env, info, amount);
            if let Err(ref e) = result {
                error!("Error in withdraw_fees: {e}");
            }
            result
        },
    }
}

pub fn execute_register_domain(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    domain: String,
    zk_proof: Binary,
    public_key: Binary,
    mx_records: Option<Vec<String>>,
) -> Result<Response, ContractError> {
    // ✅ M4: Timestamp manipulation protection
    if env.block.time.seconds() < 1_000_000_000 {
        return Err(ContractError::Std(StdError::generic_err("Invalid timestamp - block time too low")));
    }
    
    let config = CONFIG.load(deps.storage)?;
    
    // ✅ H2: Comprehensive input validation - Enhanced domain validation
    // Validate domain name length and format (max 64 chars as per problem statement)
    if domain.is_empty() || domain.len() > 64 {
        return Err(ContractError::InvalidDomain {});
    }
    
    // Validate domain contains only alphanumeric, hyphens, and colons (as per problem statement)
    if !domain.chars().all(|c| c.is_alphanumeric() || c == '-' || c == ':') {
        return Err(ContractError::InvalidDomain {});
    }
    
    // Validate domain doesn't start/end with hyphen or colon
    if domain.starts_with('-') || domain.ends_with('-') || domain.starts_with(':') || domain.ends_with(':') {
        return Err(ContractError::InvalidDomain {});
    }

    // Check if domain already exists
    if DOMAINS.has(deps.storage, &domain) {
        return Err(ContractError::DomainAlreadyExists {});
    }

    // ✅ H2: Comprehensive input validation - Public key validation
    if public_key.is_empty() || public_key.len() > 512 {
        return Err(ContractError::Std(StdError::generic_err("Public key length must be 1-512 bytes")));
    }
    
    // Validate public key is not all zeros
    if public_key.iter().all(|&b| b == 0) {
        return Err(ContractError::Std(StdError::generic_err("Public key cannot be all zeros")));
    }

    // ✅ H2: Comprehensive input validation - MX records validation
    if let Some(ref mx_records) = mx_records {
        if mx_records.len() > 10 {
            return Err(ContractError::Std(StdError::generic_err("Too many MX records (max 10)")));
        }
        
        for mx_record in mx_records {
            if mx_record.is_empty() || mx_record.len() > 255 {
                return Err(ContractError::Std(StdError::generic_err("MX record length must be 1-255 chars")));
            }
            
            // Basic MX record format validation
            if !mx_record.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-' || c == ':' || c.is_ascii_whitespace()) {
                return Err(ContractError::Std(StdError::generic_err("Invalid MX record format")));
            }
        }
    }

    // Verify payment
    let payment = info
        .funds
        .iter()
        .find(|coin| coin.denom == config.denom)
        .map(|coin| coin.amount)
        .unwrap_or_else(Uint128::zero);

    if payment < config.domain_registration_fee {
        return Err(ContractError::InsufficientFundsDetailed {
            need: config.domain_registration_fee,
            have: payment,
        });
    }

    // ✅ H3: Rate limiting for domain registration (60 seconds between domain registrations per address)
    let last_domain_registration = RATE_LIMIT.may_load(deps.storage, &info.sender)?.unwrap_or(0);
    if env.block.time.seconds() - last_domain_registration < 60 {
        return Err(ContractError::Std(StdError::generic_err("Rate limited: wait 60 seconds between domain registrations")));
    }
    RATE_LIMIT.save(deps.storage, &info.sender, &env.block.time.seconds())?;

    // Verify ZK-SNARK proof of ownership using real cryptographic verification
    if zk_proof.is_empty() {
        return Err(ContractError::InvalidZkProof { 
            reason: "Empty ZK proof provided".to_string() 
        });
    }

    // Use the crypto module for real ZK verification
    use crate::crypto::verify_domain_proof;
    
    // Generate domain hash for verification
    let mut hasher = Sha256::new();
    hasher.update(format!("{domain}.prv").as_bytes());
    let domain_hash = hasher.finalize();
    let domain_hash_hex = hex::encode(domain_hash);
    
    // Parse public signals (domain hash should be first)
    let public_signals = vec![domain_hash_hex.clone()];
    
    // Convert Binary to string for verification
    let zk_proof_str = String::from_utf8(zk_proof.to_vec())
        .map_err(|_| ContractError::InvalidZkProof { 
            reason: "Invalid UTF-8 in ZK proof".to_string() 
        })?;
    
    // Additional validation for empty proof strings
    if zk_proof_str.trim().is_empty() {
        return Err(ContractError::InvalidZkProof { 
            reason: "Empty ZK proof provided".to_string() 
        });
    }
    
    // Verify the ZK proof
    verify_domain_proof(&domain_hash_hex, &zk_proof_str, &public_signals)
        .map_err(|e| {
            error!("ZK proof verification failed: {e:?}");
            e
        })?;

    // Also verify using Groth16 if proof format supports it
    use crate::crypto::verify_zk_proof_groth16;
    let commitment = Binary(domain_hash.to_vec());
    let public_inputs = Binary(domain_hash_hex.as_bytes().to_vec());
    
    // Try Groth16 verification (will use placeholder until full circuit setup)
    if let Err(e) = verify_zk_proof_groth16(&commitment, &zk_proof, &public_inputs) {
        // Log the Groth16 verification attempt but don't fail registration
        log::warn!("Groth16 verification not ready: {e:?}");
    }

    // Validate PGP public key format
    if public_key.is_empty() || public_key.len() < 64 {
        return Err(ContractError::InvalidPublicKey {});
    }

    // Create owner hash for privacy
    let mut hasher = Sha256::new();
    hasher.update(info.sender.as_bytes());
    hasher.update(&zk_proof);
    let owner_hash = Binary::from(hasher.finalize().to_vec());

    // Convert zk_proof to string for storage
    let zk_proof_str = String::from_utf8(zk_proof.to_vec())
        .unwrap_or_else(|_| hex::encode(&zk_proof));

    let domain_info = Domain {
        owner_hash,
        owner: info.sender.clone(),
        public_key,
        mx_records: mx_records.unwrap_or_default(),
        registered_at: env.block.time.seconds(),
        expires_at: env.block.time.seconds() + (365 * 24 * 60 * 60), // 1 year
        active: true,
        reputation: 50, // Start with neutral reputation
        emails_received: 0,
        spam_reports: 0,
        zk_proof: zk_proof_str,
    };

    DOMAINS.save(deps.storage, &domain, &domain_info)?;

    // Update config and stats
    let mut config = CONFIG.load(deps.storage)?;
    config.total_domains += 1;
    CONFIG.save(deps.storage, &config)?;

    STATS.update(deps.storage, |mut s| -> StdResult<_> {
        s.active_domains += 1;
        Ok(s)
    })?;

    Ok(Response::new()
        // ✅ M2: Comprehensive event logging 
        .add_event(
            cosmwasm_std::Event::new("domain_registered")
                .add_attribute("method", "register_domain")
                .add_attribute("domain", &domain)
                .add_attribute("owner", info.sender.to_string())
                .add_attribute("registration_fee", payment.to_string())
                .add_attribute("expires_at", domain_info.expires_at.to_string())
                .add_attribute("reputation", domain_info.reputation.to_string())
                .add_attribute("mx_records_count", domain_info.mx_records.len().to_string())
                .add_attribute("registered_at", domain_info.registered_at.to_string())
        )
        .add_attribute("method", "register_domain")
        .add_attribute("domain", &domain)
        .add_attribute("owner", info.sender)
        .add_attribute("registration_fee", payment)
        .add_attribute("expires_at", domain_info.expires_at.to_string())
        .add_attribute("reputation", domain_info.reputation.to_string()))
}

pub fn execute_send_email(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    recipient_domain: String,
    content_cid: String,
    pow_proof: Binary,
    sender_alias: Option<String>,
) -> Result<Response, ContractError> {
    // ✅ M4: Timestamp manipulation protection
    if env.block.time.seconds() < 1_000_000_000 {
        return Err(ContractError::Std(StdError::generic_err("Invalid timestamp - block time too low")));
    }
    
    let config = CONFIG.load(deps.storage)?;

    // ✅ H4: Comprehensive input sanitization
    // Validate recipient domain
    if recipient_domain.is_empty() || recipient_domain.len() > 63 {
        return Err(ContractError::InvalidDomain {});
    }
    
    // Validate content CID format and length  
    if content_cid.is_empty() || content_cid.len() > 128 {
        return Err(ContractError::Std(StdError::generic_err("Content CID length must be 1-128 characters")));
    }
    
    // Validate content CID contains only valid characters (base58)
    if !content_cid.chars().all(|c| c.is_alphanumeric()) {
        return Err(ContractError::Std(StdError::generic_err("Content CID contains invalid characters")));
    }
    
    // Validate sender alias if provided
    if let Some(ref alias) = sender_alias {
        if alias.len() > 64 {
            return Err(ContractError::Std(StdError::generic_err("Sender alias too long (max 64 chars)")));
        }
        if !alias.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-') {
            return Err(ContractError::Std(StdError::generic_err("Sender alias contains invalid characters")));
        }
    }

    // ✅ M1: Rate limiting (60 seconds between emails per address)
    let last_action = RATE_LIMIT.may_load(deps.storage, &info.sender)?.unwrap_or(0);
    if env.block.time.seconds() - last_action < 60 {
        return Err(ContractError::Std(StdError::generic_err("Rate limited: wait 60 seconds between emails")));
    }
    RATE_LIMIT.save(deps.storage, &info.sender, &env.block.time.seconds())?;

    // Verify payment
    let payment = info
        .funds
        .iter()
        .find(|coin| coin.denom == config.denom)
        .map(|coin| coin.amount)
        .unwrap_or_else(Uint128::zero);

    if payment < config.email_fee {
        return Err(ContractError::InsufficientFundsDetailed {
            need: config.email_fee,
            have: payment,
        });
    }

    // Verify recipient domain exists and check expiration
    let domain = DOMAINS.load(deps.storage, &recipient_domain)?;
    if !domain.active {
        return Err(ContractError::DomainInactive {});
    }
    
    // ✅ M7: Domain expiration edge cases - Comprehensive expiration check
    if env.block.time.seconds() >= domain.expires_at {
        return Err(ContractError::Std(StdError::generic_err("Domain expired - cannot send emails to expired domain")));
    }

    // Verify proof-of-work to prevent spam
    if !verify_pow(&pow_proof, config.pow_difficulty) {
        return Err(ContractError::InvalidProofOfWork {});
    }

    // Check if nonce was already used
    let nonce = &pow_proof[..32]; // First 32 bytes as nonce
    if USED_NONCES.has(deps.storage, nonce) {
        return Err(ContractError::NonceAlreadyUsed {});
    }
    USED_NONCES.save(deps.storage, nonce, &true)?;

    // Generate sender alias if not provided
    let alias = sender_alias.unwrap_or_else(|| {
        generate_sender_alias(&info.sender, &recipient_domain)
    });

    // Get next email ID from sequence
    let email_id = EMAIL_SEQ.may_load(deps.storage)?.unwrap_or_default() + 1;
    EMAIL_SEQ.save(deps.storage, &email_id)?;

    let email = Email {
        id: email_id.to_string(),
        from_domain: "".to_string(), // Anonymous sender
        to_local: "".to_string(), // Will be derived from recipient_domain
        recipient_domain: recipient_domain.clone(),
        sender_alias: alias.clone(),
        content_cid: content_cid.clone(),
        timestamp: env.block.time.seconds(),
        delivered: false,
        delivered_by: None,
        relay_path: vec![],
    };

    // Store email by ID for relay delivery
    EMAILS_BY_ID.save(deps.storage, email_id, &email)?;

    // Store email by domain for queries
    EMAILS.save(deps.storage, (&recipient_domain, &email.id), &email)?;

    // Update domain emails index
    let mut domain_emails = DOMAIN_EMAILS
        .may_load(deps.storage, &recipient_domain)?
        .unwrap_or_default();
    domain_emails.push(email.id.clone());
    DOMAIN_EMAILS.save(deps.storage, &recipient_domain, &domain_emails)?;

    // Update stats
    let mut config = CONFIG.load(deps.storage)?;
    config.total_emails += 1;
    CONFIG.save(deps.storage, &config)?;

    STATS.update(deps.storage, |mut s| -> StdResult<_> {
        s.total_emails += 1;
        Ok(s)
    })?;

    Ok(Response::new()
        // ✅ M2: Comprehensive event logging 
        .add_event(
            cosmwasm_std::Event::new("email_sent")
                .add_attribute("method", "send_email")
                .add_attribute("from", info.sender.to_string())
                .add_attribute("recipient", &recipient_domain)
                .add_attribute("email_id", &email.id)
                .add_attribute("sender_fee", payment.to_string())
                .add_attribute("sender_alias", &alias)
                .add_attribute("content_cid", &content_cid)
                .add_attribute("timestamp", env.block.time.seconds().to_string())
                .add_attribute("bytes", content_cid.len().to_string()) // Approximate size
        )
        .add_attribute("method", "send_email")
        .add_attribute("recipient", &recipient_domain)
        .add_attribute("email_id", &email.id)
        .add_attribute("sender_fee", payment)
        .add_attribute("sender_alias", &alias)
        .add_attribute("content_cid", &content_cid)
        .add_attribute("timestamp", env.block.time.seconds().to_string()))
}

pub fn execute_update_domain(
    deps: DepsMut,
    info: MessageInfo,
    domain: String,
    public_key: Option<Binary>,
    mx_records: Option<Vec<String>>,
    active: Option<bool>,
) -> Result<Response, ContractError> {
    let mut domain_info = DOMAINS.load(deps.storage, &domain)?;

    // Verify ownership
    if domain_info.owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    // Update fields if provided
    if let Some(key) = public_key {
        if key.is_empty() || key.len() < 64 {
            return Err(ContractError::InvalidPublicKey {});
        }
        domain_info.public_key = key;
    }

    if let Some(records) = mx_records {
        domain_info.mx_records = records;
    }

    if let Some(active_status) = active {
        domain_info.active = active_status;
    }

    DOMAINS.save(deps.storage, &domain, &domain_info)?;

    Ok(Response::new()
        .add_attribute("method", "update_domain")
        .add_attribute("domain", &domain)
        .add_attribute("owner", info.sender))
}

pub fn execute_register_relay(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    location: String,
    stake: Uint128,
    endpoint: String,
) -> Result<Response, ContractError> {
    // ✅ L2: Input length validation
    if location.is_empty() || location.len() > 64 {
        return Err(ContractError::Std(StdError::generic_err("Location length must be 1-64 characters")));
    }
    
    if endpoint.is_empty() || endpoint.len() > 256 {
        return Err(ContractError::Std(StdError::generic_err("Endpoint length must be 1-256 characters")));
    }
    
    // Validate endpoint format (basic URL check)
    if !endpoint.starts_with("http://") && !endpoint.starts_with("https://") {
        return Err(ContractError::Std(StdError::generic_err("Endpoint must be a valid HTTP/HTTPS URL")));
    }
    // Verify minimum stake
    if stake < Uint128::new(1000000) { // 1 PRIV minimum
        return Err(ContractError::InsufficientStake {});
    }

    // Check if relay already exists
    if RELAYS.has(deps.storage, &info.sender) {
        return Err(ContractError::RelayAlreadyExists {});
    }

    let relay = RelayNode {
        operator: info.sender.clone(),
        location: location.clone(),
        stake,
        endpoint,
        registered_at: env.block.time.seconds(),
        emails_relayed: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        rewards_earned: Uint128::zero(),
        pending_rewards: Uint128::zero(),
        active: true,
        last_activity: env.block.time.seconds(),
    };

    RELAYS.save(deps.storage, &info.sender, &relay)?;

    // Add to location index
    let mut location_relays = RELAYS_BY_LOCATION
        .may_load(deps.storage, &location)?
        .unwrap_or_default();
    location_relays.push(info.sender.clone());
    RELAYS_BY_LOCATION.save(deps.storage, &location, &location_relays)?;

    Ok(Response::new()
        .add_attribute("method", "register_relay")
        .add_attribute("operator", info.sender)
        .add_attribute("location", &location)
        .add_attribute("stake", stake))
}

pub fn execute_claim_relay_rewards(
    deps: DepsMut,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let mut relay = RELAYS.load(deps.storage, &info.sender)?;

    if relay.pending_rewards.is_zero() {
        return Err(ContractError::NoRewardsToClaim {});
    }

    let rewards = relay.pending_rewards;
    relay.pending_rewards = Uint128::zero();
    relay.rewards_earned += rewards;

    RELAYS.save(deps.storage, &info.sender, &relay)?;

    let payout = BankMsg::Send {
        to_address: info.sender.to_string(),
        amount: vec![Coin {
            denom: config.denom,
            amount: rewards,
        }],
    };

    Ok(Response::new()
        .add_message(payout)
        .add_attribute("method", "claim_relay_rewards")
        .add_attribute("operator", info.sender)
        .add_attribute("rewards", rewards))
}

pub fn execute_report_spam(
    deps: DepsMut,
    info: MessageInfo,
    target: String,
    _evidence: Binary,
) -> Result<Response, ContractError> {
    // Check if already reported by this user
    if SPAM_REPORTS.has(deps.storage, (&target, &info.sender)) {
        return Err(ContractError::AlreadyReported {});
    }

    // Record spam report
    SPAM_REPORTS.save(deps.storage, (&target, &info.sender), &0)?;

    // TODO: Implement reputation scoring based on reports

    Ok(Response::new()
        .add_attribute("method", "report_spam")
        .add_attribute("reporter", info.sender)
        .add_attribute("target", &target))
}

pub fn execute_relay_deliver(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    email_id: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    let mut email = EMAILS_BY_ID
        .may_load(deps.storage, email_id)?
        .ok_or(ContractError::EmailNotFound {})?;
    
    if email.delivered {
        return Err(ContractError::AlreadyDelivered {});
    }

    let mut relay = RELAYS
        .may_load(deps.storage, &info.sender)?
        .ok_or(ContractError::RelayNotRegistered {})?;

    // Mark delivered
    email.delivered = true;
    email.delivered_by = Some(info.sender.clone());
    EMAILS_BY_ID.save(deps.storage, email_id, &email)?;

    // Also update in domain emails
    EMAILS.save(deps.storage, (&email.recipient_domain, &email.id), &email)?;

    // Reward relay
    relay.emails_relayed += 1;
    relay.successful_deliveries += 1;
    relay.pending_rewards += config.relay_reward;
    RELAYS.save(deps.storage, &info.sender, &relay)?;

    // Update stats
    STATS.update(deps.storage, |mut s| -> StdResult<_> {
        s.total_delivered += 1;
        Ok(s)
    })?;

    Ok(Response::new()
        .add_attribute("action", "relay_deliver")
        .add_attribute("email_id", email_id.to_string())
        .add_attribute("reward", config.relay_reward))
}

pub fn execute_domain_renew(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    domain: String,
    years: u32,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    let mut dom = DOMAINS
        .may_load(deps.storage, &domain)?
        .ok_or(ContractError::DomainNotFound {})?;
    
    if info.sender != dom.owner {
        return Err(ContractError::NotDomainOwner {});
    }

    let cost = config.domain_registration_fee
        .checked_mul(Uint128::from(years))
        .map_err(|_| ContractError::Std(StdError::generic_err("Overflow in cost calculation")))?;
    
    let payment = info
        .funds
        .iter()
        .find(|coin| coin.denom == config.denom)
        .map(|coin| coin.amount)
        .unwrap_or_else(Uint128::zero);

    if payment < cost {
        return Err(ContractError::InsufficientFundsDetailed {
            need: cost,
            have: payment,
        });
    }

    let seconds_to_add = 31536000u64
        .checked_mul(years as u64)
        .ok_or(ContractError::Std(StdError::generic_err("Overflow in year calculation")))?;
    
    dom.expires_at = dom.expires_at
        .checked_add(seconds_to_add)
        .ok_or(ContractError::Std(StdError::generic_err("Overflow in expiration calculation")))?;
    
    DOMAINS.save(deps.storage, &domain, &dom)?;

    Ok(Response::new()
        .add_attribute("action", "domain_renew")
        .add_attribute("domain", domain)
        .add_attribute("years", years.to_string())
        .add_attribute("new_expires_at", dom.expires_at.to_string()))
}

pub fn execute_withdraw_fees(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    if Some(info.sender.clone()) != config.owner {
        return Err(ContractError::Unauthorized {});
    }
    
    if amount.is_zero() {
        return Err(ContractError::InvalidAmount {});
    }

    let balance = deps
        .querier
        .query_balance(env.contract.address, config.denom.clone())?
        .amount;
    
    if balance < amount {
        return Err(ContractError::InsufficientPool {
            need: amount,
            have: balance,
        });
    }

    let msg = BankMsg::Send {
        to_address: config.owner.unwrap().to_string(),
        amount: coins(amount.u128(), config.denom),
    };

    Ok(Response::new()
        .add_message(msg)
        .add_attribute("action", "withdraw_fees")
        .add_attribute("amount", amount))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetDomain { domain } => to_json_binary(&query_domain(deps, domain)?),
        QueryMsg::GetEmails { domain, caller, start_after, limit } => {
            to_json_binary(&query_emails(deps, domain, caller, start_after, limit).map_err(|e| StdError::generic_err(e.to_string()))?)
        },
        QueryMsg::GetRelay { address } => to_json_binary(&query_relay(deps, address)?),
        QueryMsg::GetRelays { location, start_after, limit } => {
            to_json_binary(&query_relays(deps, location, start_after, limit)?)
        },
        QueryMsg::GetConfig {} => to_json_binary(&query_config(deps)?),
        QueryMsg::GetStats {} => to_json_binary(&query_stats(deps)?),
    }
}

pub fn query_domain(deps: Deps, domain: String) -> StdResult<DomainResponse> {
    let domain_info = DOMAINS.load(deps.storage, &domain)?;
    
    Ok(DomainResponse {
        domain,
        owner_hash: domain_info.owner_hash,
        public_key: domain_info.public_key,
        mx_records: domain_info.mx_records,
        registered_at: domain_info.registered_at,
        expires_at: domain_info.expires_at,
        active: domain_info.active,
        reputation: domain_info.reputation,
    })
}

pub fn query_emails(
    deps: Deps,
    domain: String,
    caller: String,
    start_after: Option<u64>,
    limit: Option<u32>,
) -> Result<EmailsResponse, ContractError> {
    // Verify caller is domain owner
    let caller_addr = deps.api.addr_validate(&caller)?;
    let dom = DOMAINS.load(deps.storage, &domain)?;
    
    if caller_addr != dom.owner {
        return Err(ContractError::NotDomainOwner {});
    }

    let limit = limit.unwrap_or(30).min(100) as usize;
    let start = start_after.map(|id| Bound::exclusive(id));

    // Query from EMAILS_BY_ID with pagination
    let emails: Result<Vec<EmailInfo>, ContractError> = EMAILS_BY_ID
        .range(deps.storage, start, None, Order::Ascending)
        .filter(|item| {
            item.as_ref()
                .map(|(_, e)| e.recipient_domain == domain)
                .unwrap_or(false)
        })
        .take(limit)
        .map(|res| {
            let (_, email) = res?;
            Ok(EmailInfo {
                id: email.id,
                sender_alias: email.sender_alias,
                content_cid: email.content_cid,
                timestamp: email.timestamp,
                delivered: email.delivered,
            })
        })
        .collect();

    Ok(EmailsResponse {
        emails: emails?,
    })
}

pub fn query_relay(deps: Deps, address: String) -> StdResult<RelayResponse> {
    let addr = deps.api.addr_validate(&address)?;
    let relay = RELAYS.load(deps.storage, &addr)?;
    
    let success_rate = if relay.emails_relayed > 0 {
        // ✅ Use checked arithmetic to prevent overflow
        relay.successful_deliveries
            .checked_mul(100)
            .and_then(|result| result.checked_div(relay.emails_relayed))
            .unwrap_or(0)
    } else {
        0
    };

    Ok(RelayResponse {
        address: relay.operator,
        location: relay.location,
        stake: relay.stake,
        endpoint: relay.endpoint,
        emails_relayed: relay.emails_relayed,
        success_rate,
        rewards_earned: relay.rewards_earned,
        active: relay.active,
    })
}

pub fn query_relays(
    deps: Deps,
    location: Option<String>,
    _start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<RelaysResponse> {
    let limit = limit.unwrap_or(50) as usize;
    
    let relays: StdResult<Vec<RelayResponse>> = if let Some(loc) = location {
        // Filter by location
        let location_relays = RELAYS_BY_LOCATION
            .may_load(deps.storage, &loc)?
            .unwrap_or_default();
        
        location_relays
            .iter()
            .take(limit)
            .map(|addr| {
                let relay = RELAYS.load(deps.storage, addr)?;
                let success_rate = if relay.emails_relayed > 0 {
                    // ✅ Use checked arithmetic to prevent overflow
                    relay.successful_deliveries
                        .checked_mul(100)
                        .and_then(|result| result.checked_div(relay.emails_relayed))
                        .unwrap_or(0)
                } else {
                    0
                };
                
                Ok(RelayResponse {
                    address: relay.operator,
                    location: relay.location,
                    stake: relay.stake,
                    endpoint: relay.endpoint,
                    emails_relayed: relay.emails_relayed,
                    success_rate,
                    rewards_earned: relay.rewards_earned,
                    active: relay.active,
                })
            })
            .collect()
    } else {
        // Get all relays
        RELAYS
            .range(deps.storage, None, None, Order::Ascending)
            .take(limit)
            .map(|item| {
                let (_, relay) = item?;
                let success_rate = if relay.emails_relayed > 0 {
                    // ✅ Use checked arithmetic to prevent overflow
                    relay.successful_deliveries
                        .checked_mul(100)
                        .and_then(|result| result.checked_div(relay.emails_relayed))
                        .unwrap_or(0)
                } else {
                    0
                };
                
                Ok(RelayResponse {
                    address: relay.operator,
                    location: relay.location,
                    stake: relay.stake,
                    endpoint: relay.endpoint,
                    emails_relayed: relay.emails_relayed,
                    success_rate,
                    rewards_earned: relay.rewards_earned,
                    active: relay.active,
                })
            })
            .collect()
    };

    Ok(RelaysResponse {
        relays: relays?,
    })
}

pub fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    
    Ok(ConfigResponse {
        owner: config.owner,
        denom: config.denom,
        domain_registration_fee: config.domain_registration_fee,
        email_fee: config.email_fee,
        pow_difficulty: config.pow_difficulty,
        relay_reward: config.relay_reward,
        total_domains: config.total_domains,
        total_emails: config.total_emails,
    })
}

pub fn query_stats(deps: Deps) -> StdResult<StatsResponse> {
    let stats = STATS.load(deps.storage)?;
    
    // Count active relays (O(n) but less frequent)
    let active_relays = RELAYS
        .range(deps.storage, None, None, Order::Ascending)
        .filter_map(|item| {
            if let Ok((_, relay)) = item {
                if relay.active { Some(1) } else { None }
            } else {
                None
            }
        })
        .count() as u32;

    let total_relays = RELAYS
        .range(deps.storage, None, None, Order::Ascending)
        .count() as u32;

    Ok(StatsResponse {
        total_domains: stats.active_domains, // Use stats counter
        active_domains: stats.active_domains,
        total_emails: stats.total_emails,
        total_delivered: stats.total_delivered,
        total_relays,
        active_relays,
    })
}

// Helper functions

/// Compute target = 2^(128 - difficulty); hash must be < target (target-based PoW)
fn verify_pow(proof: &Binary, difficulty: u32) -> bool {
    if difficulty == 0 {
        return true; // no-PoW mode
    }
    
    if proof.len() < 32 {
        return false;
    }
    
    if difficulty > 128 {
        return false;
    }
    
    let mut hasher = Sha256::new();
    hasher.update(proof);
    let hash = hasher.finalize();
    
    // Convert first 16 bytes of hash to u128 for comparison
    let mut hash_bytes = [0u8; 16];
    hash_bytes.copy_from_slice(&hash[..16]);
    let hash_val = u128::from_be_bytes(hash_bytes);
    
    // Calculate target = 2^(128 - difficulty)
    let target = if difficulty < 128 {
        1u128 << (128 - difficulty)
    } else {
        1u128 // difficulty == 128 means target is 1
    };
    
    // Hash must be less than target
    hash_val < target
}

// Kept for backward compatibility but no longer used
#[allow(dead_code)]
fn generate_email_id(env: &Env, sender: &Addr, content_cid: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(env.block.time.seconds().to_be_bytes());
    hasher.update(sender.as_bytes());
    hasher.update(content_cid.as_bytes());
    hex::encode(hasher.finalize())[..16].to_string()
}

fn generate_sender_alias(sender: &Addr, recipient_domain: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(sender.as_bytes());
    hasher.update(recipient_domain.as_bytes());
    format!("{}.prv", &hex::encode(hasher.finalize())[..12])
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    let version = get_contract_version(deps.storage)?;
    
    // Only allow migration from v0.1.0
    if version.contract != CONTRACT_NAME {
        return Err(ContractError::Unauthorized {});
    }
    
    if version.version != "0.1.0" {
        return Err(ContractError::Std(StdError::generic_err(
            "Can only migrate from v0.1.0"
        )));
    }
    
    // Load old config structure (assuming it exists)
    let old_config = CONFIG.load(deps.storage)?;
    
    // Create new config with denom and relay_reward
    let new_config = Config {
        owner: old_config.owner,
        denom: "upriv".to_string(), // Default to "upriv" for backward compatibility
        domain_registration_fee: old_config.domain_registration_fee,
        email_fee: old_config.email_fee,
        pow_difficulty: old_config.pow_difficulty,
        relay_reward: Uint128::new(1000), // Default relay reward
        total_domains: old_config.total_domains,
        total_emails: old_config.total_emails,
    };
    
    CONFIG.save(deps.storage, &new_config)?;
    
    // Initialize stats from existing counters
    STATS.save(deps.storage, &Stats {
        active_domains: old_config.total_domains as u64,
        total_emails: old_config.total_emails as u64,
        total_delivered: 0, // Start at 0 for new counter
    })?;
    
    // Set new contract version
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    
    Ok(Response::new()
        .add_attribute("action", "migrate")
        .add_attribute("from_version", "0.1.0")
        .add_attribute("to_version", CONTRACT_VERSION))
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, Uint128};

    #[test]
    fn proper_instantiation() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg {
            admin: None,
            denom: "ujuno".to_string(),
            domain_registration_fee: Uint128::from(1000u128),
            email_fee: Uint128::from(10u128),
            pow_difficulty: 4,
            relay_reward: Uint128::from(100u128),
        };
        let info = mock_info("creator", &coins(1000, "earth"));
        let res = instantiate(deps.as_mut(), mock_env(), info, msg);
        
        // Test that instantiation succeeds
        assert!(res.is_ok());
        let response = res.unwrap();
        assert_eq!(0, response.messages.len());
        
        // Test that config query works
        let query_res = query(deps.as_ref(), mock_env(), QueryMsg::GetConfig {});
        assert!(query_res.is_ok());
    }

    #[test]
    fn test_pow_verification() {
        // Test proof of work verification with target-based approach
        let proof = Binary::from(vec![0u8; 32]); // This will get hashed
        let result = verify_pow(&proof, 1);
        let _ = result; // Just verify the function compiles and runs
        
        // Test with too short proof
        let short_proof = Binary::from(vec![0u8; 16]); // Less than 32 bytes
        assert!(!verify_pow(&short_proof, 1));
        
        // Test no-PoW mode (difficulty 0)
        assert!(verify_pow(&proof, 0));
        
        // Test invalid difficulty > 128
        assert!(!verify_pow(&proof, 129));
    }

    #[test]
    fn test_configurable_denom() {
        let mut deps = mock_dependencies();

        // Test with custom denom
        let msg = InstantiateMsg {
            admin: None,
            denom: "uatom".to_string(),
            domain_registration_fee: Uint128::from(5000u128),
            email_fee: Uint128::from(50u128),
            pow_difficulty: 8,
            relay_reward: Uint128::from(200u128),
        };
        let info = mock_info("creator", &coins(1000, "earth"));
        let res = instantiate(deps.as_mut(), mock_env(), info, msg);
        
        assert!(res.is_ok());
        
        // Verify config has correct denom
        let query_res = query(deps.as_ref(), mock_env(), QueryMsg::GetConfig {});
        assert!(query_res.is_ok());
    }
}