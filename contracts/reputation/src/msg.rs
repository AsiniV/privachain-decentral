use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Binary, Timestamp};

#[cw_serde]
pub struct InstantiateMsg {}

#[cw_serde]
pub enum ExecuteMsg {
    /// Update reputation score with Dilithium-5 signature
    Update {
        score: u32,
        dilithium_pk: Binary,
        dilithium_sig: Binary, // signed (score + sender)
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get reputation for an address
    #[returns(ReputationResponse)]
    GetReputation { address: String },
    /// Get history for an address
    #[returns(HistoryResponse)]
    GetHistory {
        address: String,
        start_after: Option<u32>,
        limit: Option<u32>,
    },
}

#[cw_serde]
pub struct ReputationResponse {
    pub score: u32,
    pub dilithium_pk: Binary,
    pub dilithium_sig: Binary,
}

#[cw_serde]
pub struct HistoryResponse {
    pub entries: Vec<HistoryEntry>,
}

#[cw_serde]
pub struct HistoryEntry {
    pub index: u32,
    pub score: u32,
    pub timestamp: Timestamp,
    pub tx_hash: Vec<u8>,
}
