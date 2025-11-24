use cosmwasm_std::{StdError, Uint128};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Domain already exists")]
    DomainAlreadyExists {},

    #[error("Domain not found")]
    DomainNotFound {},

    #[error("Domain is inactive")]
    DomainInactive {},

    #[error("Invalid domain name")]
    InvalidDomain {},

    #[error("Invalid ZK proof: {reason}")]
    InvalidZkProof { reason: String },

    #[error("Invalid public key")]
    InvalidPublicKey {},

    #[error("Invalid proof of work")]
    InvalidProofOfWork {},

    #[error("Nonce already used")]
    NonceAlreadyUsed {},

    #[error("Insufficient funds")]
    InsufficientFunds {},

    #[error("Insufficient stake")]
    InsufficientStake {},

    #[error("Relay already exists")]
    RelayAlreadyExists {},

    #[error("Relay not found")]
    RelayNotFound {},

    #[error("No rewards to claim")]
    NoRewardsToClaim {},

    #[error("Already reported")]
    AlreadyReported {},

    #[error("Domain expired")]
    DomainExpired {},

    #[error("Invalid email format")]
    InvalidEmail {},

    #[error("Spam detected")]
    SpamDetected {},

    #[error("Rate limit exceeded")]
    RateLimitExceeded {},

    #[error("Unsupported denom: expected {expected}, got {got}")]
    UnsupportedDenom { expected: String, got: String },

    #[error("Insufficient funds: need {need}, have {have}")]
    InsufficientFundsDetailed { need: Uint128, have: Uint128 },

    #[error("Email not found")]
    EmailNotFound {},

    #[error("Not domain owner")]
    NotDomainOwner {},

    #[error("Invalid PoW: hash >= target")]
    InvalidPow {},

    #[error("Relay not registered")]
    RelayNotRegistered {},

    #[error("Email already delivered")]
    AlreadyDelivered {},

    #[error("Amount must be > 0")]
    InvalidAmount {},

    #[error("Insufficient pool: need {need}, have {have}")]
    InsufficientPool { need: Uint128, have: Uint128 },
}