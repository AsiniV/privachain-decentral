use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Config {
    pub owner: Addr,
    pub grant_amount: Uint128,     // Amount to grant per request
    pub max_requests_per_day: u32, // Rate limit per address
}

pub const CONFIG: Item<Config> = Item::new("config");

// Track request count per address per day (timestamp -> count)
pub const REQUEST_COUNT: Map<(&Addr, u64), u32> = Map::new("request_count");
