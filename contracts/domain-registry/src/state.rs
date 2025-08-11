use cosmwasm_std::{Addr, Binary, Timestamp};
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    pub admin: Addr,
    pub registration_cost: u128,
    pub max_domain_length: u32,
    pub domain_expiration_seconds: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct DomainRecord {
    /// SHA256 hash of the domain name
    pub domain_hash: String,
    /// Owner's public key
    pub owner_pubkey: Binary,
    /// When the domain was registered
    pub registered_at: Timestamp,
    /// When the domain expires
    pub expires_at: Timestamp,
    /// Encrypted metadata (MX records, etc.)
    pub metadata: Option<Binary>,
    /// ZK commitment hash (for proof verification)
    pub zk_commitment: Binary,
    /// Nonce used in registration (prevents replay)
    pub nonce: u64,
    /// Whether domain is currently active
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ContractStats {
    pub total_domains: u64,
    pub active_domains: u64,
    pub expired_domains: u64,
    pub registrations_today: u64,
    pub last_stats_update: Timestamp,
}

// Storage keys
pub const CONFIG: Item<Config> = Item::new("config");
pub const STATS: Item<ContractStats> = Item::new("stats");

// Map: domain_hash -> DomainRecord
pub const DOMAINS: Map<String, DomainRecord> = Map::new("domains");

// Map: owner_pubkey_hex -> Vec<domain_hash> (for efficient lookup)
pub const DOMAINS_BY_OWNER: Map<String, Vec<String>> = Map::new("domains_by_owner");

// Map: expiration_timestamp -> Vec<domain_hash> (for cleanup)
pub const DOMAINS_BY_EXPIRY: Map<u64, Vec<String>> = Map::new("domains_by_expiry");

// Map: date (YYYY-MM-DD) -> registration_count (for daily stats)
pub const DAILY_REGISTRATIONS: Map<String, u64> = Map::new("daily_registrations");