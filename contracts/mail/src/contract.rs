use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    StdError, Uint128, Addr, BankMsg, Coin, Order,
};
use cw2::set_contract_version;
use sha2::{Sha256, Digest};

use crate::error::ContractError;
use crate::msg::{
    ConfigResponse, DomainResponse, EmailInfo, EmailsResponse, ExecuteMsg, InstantiateMsg,
    QueryMsg, RelayResponse, RelaysResponse, StatsResponse,
};
use crate::state::{
    Config, Domain, Email, RelayNode, CONFIG, DOMAINS, EMAILS, DOMAIN_EMAILS, 
    RELAYS, RELAYS_BY_LOCATION, SPAM_REPORTS, USED_NONCES,
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
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let admin = msg
        .admin
        .map(|a| deps.api.addr_validate(&a))
        .transpose()?;

    let config = Config {
        admin,
        domain_registration_fee: msg.domain_registration_fee,
        email_fee: msg.email_fee,
        pow_difficulty: msg.pow_difficulty,
        total_domains: 0,
        total_emails: 0,
    };

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("domain_fee", msg.domain_registration_fee)
        .add_attribute("email_fee", msg.email_fee)
        .add_attribute("pow_difficulty", msg.pow_difficulty.to_string()))
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
        } => execute_register_domain(deps, env, info, domain, zk_proof, public_key, mx_records),
        ExecuteMsg::SendEmail {
            recipient_domain,
            content_cid,
            pow_proof,
            sender_alias,
        } => execute_send_email(deps, env, info, recipient_domain, content_cid, pow_proof, sender_alias),
        ExecuteMsg::UpdateDomain {
            domain,
            public_key,
            mx_records,
            active,
        } => execute_update_domain(deps, info, domain, public_key, mx_records, active),
        ExecuteMsg::RegisterRelay {
            location,
            stake,
            endpoint,
        } => execute_register_relay(deps, env, info, location, stake, endpoint),
        ExecuteMsg::ClaimRelayRewards {} => execute_claim_relay_rewards(deps, info),
        ExecuteMsg::ReportSpam { target, evidence } => execute_report_spam(deps, info, target, evidence),
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
    let config = CONFIG.load(deps.storage)?;
    
    // Validate domain name
    if domain.is_empty() || domain.len() > 63 || domain.contains('.') {
        return Err(ContractError::InvalidDomain {});
    }

    // Check if domain already exists
    if DOMAINS.has(deps.storage, &domain) {
        return Err(ContractError::DomainAlreadyExists {});
    }

    // Verify payment
    let payment = info
        .funds
        .iter()
        .find(|coin| coin.denom == "upriv")
        .map(|coin| coin.amount)
        .unwrap_or_else(Uint128::zero);

    if payment < config.domain_registration_fee {
        return Err(ContractError::InsufficientFunds {});
    }

    // TODO: Verify ZK-SNARK proof of ownership
    // For now, we'll just validate the proof is not empty
    if zk_proof.is_empty() {
        return Err(ContractError::InvalidZkProof {});
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
    };

    DOMAINS.save(deps.storage, &domain, &domain_info)?;

    // Update config
    let mut config = CONFIG.load(deps.storage)?;
    config.total_domains += 1;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "register_domain")
        .add_attribute("domain", &domain)
        .add_attribute("owner", info.sender)
        .add_attribute("registration_fee", payment))
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
    let config = CONFIG.load(deps.storage)?;

    // Verify payment
    let payment = info
        .funds
        .iter()
        .find(|coin| coin.denom == "upriv")
        .map(|coin| coin.amount)
        .unwrap_or_else(Uint128::zero);

    if payment < config.email_fee {
        return Err(ContractError::InsufficientFunds {});
    }

    // Verify recipient domain exists
    let domain = DOMAINS.load(deps.storage, &recipient_domain)?;
    if !domain.active {
        return Err(ContractError::DomainInactive {});
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

    // Generate unique email ID
    let email_id = generate_email_id(&env, &info.sender, &content_cid);

    // Generate sender alias if not provided
    let alias = sender_alias.unwrap_or_else(|| {
        generate_sender_alias(&info.sender, &recipient_domain)
    });

    let email = Email {
        id: email_id.clone(),
        recipient_domain: recipient_domain.clone(),
        sender_alias: alias,
        content_cid,
        timestamp: env.block.time.seconds(),
        delivered: false,
        relay_path: vec![],
    };

    // Store email
    EMAILS.save(deps.storage, (&recipient_domain, &email_id), &email)?;

    // Update domain emails index
    let mut domain_emails = DOMAIN_EMAILS
        .may_load(deps.storage, &recipient_domain)?
        .unwrap_or_default();
    domain_emails.push(email_id.clone());
    DOMAIN_EMAILS.save(deps.storage, &recipient_domain, &domain_emails)?;

    // Update stats
    let mut config = CONFIG.load(deps.storage)?;
    config.total_emails += 1;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "send_email")
        .add_attribute("recipient", &recipient_domain)
        .add_attribute("email_id", &email_id)
        .add_attribute("sender_fee", payment))
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
            denom: "upriv".to_string(),
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

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetDomain { domain } => to_json_binary(&query_domain(deps, domain)?),
        QueryMsg::GetEmails { domain, start_after, limit } => {
            to_json_binary(&query_emails(deps, domain, start_after, limit).map_err(|e| StdError::generic_err(e.to_string()))?)
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
    _start_after: Option<String>,
    limit: Option<u32>,
) -> Result<EmailsResponse, ContractError> {
    let email_ids = DOMAIN_EMAILS
        .may_load(deps.storage, &domain)?
        .unwrap_or_default();
    
    let limit = limit.unwrap_or(50) as usize;
    let emails: Result<Vec<EmailInfo>, crate::ContractError> = email_ids
        .iter()
        .take(limit)
        .map(|id| {
            let email = EMAILS.load(deps.storage, (&domain, id))?;
            Ok::<EmailInfo, crate::ContractError>(EmailInfo {
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
        ((relay.successful_deliveries * 100) / relay.emails_relayed) as u32
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
                    ((relay.successful_deliveries * 100) / relay.emails_relayed) as u32
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
                    ((relay.successful_deliveries * 100) / relay.emails_relayed) as u32
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
        admin: config.admin,
        domain_registration_fee: config.domain_registration_fee,
        email_fee: config.email_fee,
        pow_difficulty: config.pow_difficulty,
        total_domains: config.total_domains,
        total_emails: config.total_emails,
    })
}

pub fn query_stats(deps: Deps) -> StdResult<StatsResponse> {
    let config = CONFIG.load(deps.storage)?;
    
    // Count active domains
    let active_domains = DOMAINS
        .range(deps.storage, None, None, Order::Ascending)
        .filter_map(|item| {
            if let Ok((_, domain)) = item {
                if domain.active { Some(1) } else { None }
            } else {
                None
            }
        })
        .count() as u64;

    // Count active relays
    let active_relays = RELAYS
        .range(deps.storage, None, None, Order::Ascending)
        .filter_map(|item| {
            if let Ok((_, relay)) = item {
                if relay.active { Some(1) } else { None }
            } else {
                None
            }
        })
        .count() as u64;

    let total_relays = RELAYS
        .range(deps.storage, None, None, Order::Ascending)
        .count() as u64;

    Ok(StatsResponse {
        total_domains: config.total_domains,
        active_domains,
        total_emails: config.total_emails,
        total_relays,
        active_relays,
    })
}

// Helper functions

fn verify_pow(proof: &Binary, difficulty: u32) -> bool {
    if proof.len() < 32 {
        return false;
    }
    
    let mut hasher = Sha256::new();
    hasher.update(proof);
    let hash = hasher.finalize();
    
    // Check if hash has required number of leading zeros
    let leading_zeros = hash.iter().take_while(|&&b| b == 0).count() * 8;
    leading_zeros >= difficulty as usize
}

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