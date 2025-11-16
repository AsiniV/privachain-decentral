use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Binary};
use cw_storage_plus::Map;

#[cw_serde]
pub struct Reputation {
    pub score: u32,              // 0-100
    pub dilithium_pk: Binary,    // 2592 B
    pub dilithium_sig: Binary,   // ~4595 B
}

pub const REPUTATION: Map<&Addr, Reputation> = Map::new("rep");
