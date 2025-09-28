use cosmwasm_std::{Addr, Timestamp};
use cw_storage_plus::Item;
use serde::{Deserialize, Serialize};

pub const ADMIN: Item<Vec<Addr>> = Item::new("admin_multisig");
pub const THRESHOLD: Item<u8> = Item::new("threshold");
pub const VK: Item<Vec<u8>> = Item::new("vk");

// Timelock rotation support (7 days) with multi-sig approvals
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Proposal {
    pub new_admins: Vec<Addr>,
    pub unlock_time: Timestamp,
    pub proposer: Addr,
    pub approvals: Vec<Addr>,
    pub threshold: u8,
}

pub const ADMIN_PROPOSAL: Item<Proposal> = Item::new("admin_proposal");