use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Rate limit exceeded: maximum {max} requests per day")]
    RateLimitExceeded { max: u32 },

    #[error("Insufficient pool balance")]
    InsufficientBalance,
}
