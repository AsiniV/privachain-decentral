use cosmwasm_std::{Addr, Uint64};
use cw_storage_plus::Item;
use serde::{Deserialize, Serialize};

// Multi-sig admin support (2-of-3)
pub const ADMIN: Item<Vec<Addr>> = Item::new("admin_multisig");

// Timelock rotation support (7 days)
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct AdminRotation {
    pub new_admins: Vec<Addr>,
    pub unlock_time: Uint64,
    pub proposer: Addr,
}

pub const ADMIN_ROTATION: Item<AdminRotation> = Item::new("admin_rotation");