use cosmwasm_std::{StdError, Uint128};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Only owner can call this")]
    Unauthorized,

    #[error("Zero or invalid amount")]
    InvalidAmount,

    #[error("No funds sent")]
    NoFunds,

    #[error("Unsupported denom: expected {expected}, got {got}")]
    UnsupportedDenom { expected: String, got: String },

    #[error("Pool balance too low: need {need}, have {have}")]
    InsufficientPool { need: Uint128, have: Uint128 },

    #[error("Daily limit exceeded: max {max}, already used {used}")]
    DailyLimitExceeded { max: u32, used: u32 },
}
