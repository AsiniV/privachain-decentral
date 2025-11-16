use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Binary};

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
}

#[cw_serde]
pub struct ReputationResponse {
    pub score: u32,
    pub dilithium_pk: Binary,
    pub dilithium_sig: Binary,
}
