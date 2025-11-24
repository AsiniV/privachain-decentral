use cosmwasm_std::{Addr, Binary, Uint128};
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    /// Contract administrator (renamed from admin to owner for consistency with problem statement)
    pub owner: Option<Addr>,
    /// Configurable denom (was hard-coded "upriv")
    pub denom: String,
    /// Fee to register a .prv domain
    pub domain_registration_fee: Uint128,
    /// Fee to send an email (anti-spam)
    pub email_fee: Uint128,
    /// Minimum proof-of-work difficulty (bits 0..128)
    pub pow_difficulty: u32,
    /// Reward per delivered email (for relay nodes)
    pub relay_reward: Uint128,
    /// Total domains registered (u32 sufficient for realistic usage) - DEPRECATED, use STATS
    pub total_domains: u32,
    /// Total emails sent (u32 sufficient for 4B emails) - DEPRECATED, use STATS
    pub total_emails: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Domain {
    /// Domain owner address (hashed for privacy)
    pub owner_hash: Binary,
    /// Original owner address (for access control)
    pub owner: Addr,
    /// PGP public key for email encryption
    pub public_key: Binary,
    /// Mail exchanger records for routing
    pub mx_records: Vec<String>,
    /// Registration timestamp (using Timestamp for better compatibility)
    pub registered_at: u64,
    /// Domain expiration (renewable, using Timestamp)
    pub expires_at: u64,
    /// Whether domain accepts emails
    pub active: bool,
    /// Reputation score (0-100, affects spam filtering)
    pub reputation: u32,
    /// Number of emails received (u32 sufficient) 
    pub emails_received: u32,
    /// Number of spam reports (u32 sufficient)
    pub spam_reports: u32,
    /// ZK proof of ownership (opaque)
    pub zk_proof: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Email {
    /// Unique email identifier
    pub id: String,
    /// Sender domain (from_domain)
    pub from_domain: String,
    /// Recipient local part (to_local)
    pub to_local: String,
    /// Recipient domain (kept for backward compatibility)
    pub recipient_domain: String,
    /// Anonymous sender alias (prevents correlation)
    pub sender_alias: String,
    /// IPFS content hash of encrypted email (CIDv1)
    pub content_cid: String,
    /// Email timestamp (created_at)
    pub timestamp: u64,
    /// Delivery status
    pub delivered: bool,
    /// Relay that successfully delivered (delivered_by)
    pub delivered_by: Option<Addr>,
    /// Relay path (for debugging, optional)
    pub relay_path: Vec<Addr>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct RelayNode {
    /// Node operator address
    pub operator: Addr,
    /// Geographic location for routing
    pub location: String,
    /// Staked amount for reputation
    pub stake: Uint128,
    /// Service endpoint URL
    pub endpoint: String,
    /// Registration timestamp
    pub registered_at: u64,
    /// Total emails relayed (u32 sufficient)
    pub emails_relayed: u32,
    /// Successful deliveries (u32 sufficient)
    pub successful_deliveries: u32,
    /// Failed deliveries (u32 sufficient)
    pub failed_deliveries: u32,
    /// Total rewards earned
    pub rewards_earned: Uint128,
    /// Unclaimed rewards
    pub pending_rewards: Uint128,
    /// Whether relay is currently active
    pub active: bool,
    /// Last activity timestamp
    pub last_activity: u64,
}

/// Contract configuration
pub const CONFIG: Item<Config> = Item::new("config");

/// ✅ H5: Namespaced storage keys to prevent collision
/// Domain registry: domain_name -> Domain
pub const DOMAINS: Map<&str, Domain> = Map::new("domain:");

/// Email storage: (domain, email_id) -> Email
pub const EMAILS: Map<(&str, &str), Email> = Map::new("email:");

/// Domain emails index: domain -> Vec<email_id>
pub const DOMAIN_EMAILS: Map<&str, Vec<String>> = Map::new("domain_emails:");

/// Relay nodes: relay_address -> RelayNode
pub const RELAYS: Map<&Addr, RelayNode> = Map::new("relay:");

/// Active relays by location: location -> Vec<relay_address>
pub const RELAYS_BY_LOCATION: Map<&str, Vec<Addr>> = Map::new("relay_location:");

/// Spam reports: (target, reporter) -> timestamp
pub const SPAM_REPORTS: Map<(&str, &Addr), u64> = Map::new("spam_report:");

/// Used proof-of-work nonces to prevent replay attacks
pub const USED_NONCES: Map<&[u8], bool> = Map::new("pow_nonce:");

/// Domain reservation system (for premium domains)
pub const RESERVED_DOMAINS: Map<&str, Addr> = Map::new("reserved:");

/// ✅ H3: Rate limiting per address (address -> last_action_timestamp)
pub const RATE_LIMIT: Map<&Addr, u64> = Map::new("rate_limit:");

/// Email sequence counter for unique email IDs
pub const EMAIL_SEQ: Item<u64> = Item::new("email_seq");

/// EMAILS storage by ID for relay delivery (use u64 directly as key)
pub const EMAILS_BY_ID: Map<u64, Email> = Map::new("emails_by_id:");

/// Stats counters (O(1) instead of O(n) range)
pub const STATS: Item<Stats> = Item::new("stats");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Stats {
    /// Total domains registered (including inactive)
    pub total_domains: u64,
    /// Number of active domains
    pub active_domains: u64,
    /// Total emails sent
    pub total_emails: u64,
    /// Total emails delivered
    pub total_delivered: u64,
}