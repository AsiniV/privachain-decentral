use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Binary, Timestamp, Uint128};
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Reputation {
    pub score: u32,              // 0-100
    pub dilithium_pk: Binary,    // 2592 B
    pub dilithium_sig: Binary,   // ~4595 B
}

pub const REPUTATION: Map<&Addr, Reputation> = Map::new("rep");

/// New history table (optional read)
pub const HISTORY: Map<(&Addr, u32), ReputationRecord> = Map::new("history");

/// Counter for unique history keys
pub const COUNTER: Item<Uint128> = Item::new("counter");

#[cw_serde]
pub struct ReputationRecord {
    pub score: u32,
    pub timestamp: Timestamp,
    pub tx_hash: Vec<u8>, // transaction hash
}
