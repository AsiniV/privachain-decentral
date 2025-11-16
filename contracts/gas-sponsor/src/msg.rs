use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128;

#[cw_serde]
pub struct InstantiateMsg {
    pub grant_amount: Uint128,
    pub max_requests_per_day: u32,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Fund the gas sponsor pool
    FundPool {},
    /// Request fee grant (rate-limited)
    RequestFeeGrant {},
    /// Update config (owner only)
    UpdateConfig {
        grant_amount: Option<Uint128>,
        max_requests_per_day: Option<u32>,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get current config
    #[returns(ConfigResponse)]
    Config {},
    /// Get pool balance
    #[returns(BalanceResponse)]
    Balance {},
}

#[cw_serde]
pub struct ConfigResponse {
    pub owner: String,
    pub grant_amount: Uint128,
    pub max_requests_per_day: u32,
}

#[cw_serde]
pub struct BalanceResponse {
    pub balance: Uint128,
}
