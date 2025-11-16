use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Binary;

#[cw_serde]
pub struct InstantiateMsg {}

#[cw_serde]
pub enum ExecuteMsg {
    /// Verify Dilithium-5 signature (on-chain)
    Verify {
        pubkey: Binary,      // 2592 B
        signature: Binary,   // ~4595 B
        message_hash: Binary, // 32 B SHA-256
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Returns code-id of this verifier
    #[returns(CodeIdResponse)]
    CodeId {},
}

#[cw_serde]
pub struct CodeIdResponse {
    pub code_id: u64,
}
