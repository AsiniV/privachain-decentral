use cosmwasm_std::{StdError, Uint128};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized: {reason}")]
    Unauthorized { reason: String },

    #[error("Domain already exists: {domain}")]
    DomainExists { domain: String },

    #[error("Domain not found: {domain}")]
    DomainNotFound { domain: String },

    #[error("Domain expired: {domain}")]
    DomainExpired { domain: String },

    #[error("Invalid domain hash: {reason}")]
    InvalidDomainHash { reason: String },

    #[error("Invalid ZK proof: {reason}")]
    InvalidZKProof { reason: String },

    #[error("Invalid signature: {reason}")]
    InvalidSignature { reason: String },

    #[error("Insufficient payment: got {got}, need {need}")]
    InsufficientPayment { got: u128, need: u128 },

    #[error("Domain name too long: {length} > {max}")]
    DomainTooLong { length: u32, max: u32 },

    #[error("Invalid nonce: expected > {expected}, got {got}")]
    InvalidNonce { expected: u64, got: u64 },

    #[error("ZK proof verification failed: {details}")]
    ZKProofVerificationFailed { details: String },

    #[error("Replay attack detected: nonce {nonce} already used")]
    ReplayAttack { nonce: u64 },

    #[error("Configuration error: {reason}")]
    ConfigError { reason: String },

    #[error("Invalid input for {field}: {reason}")]
    InvalidInput { field: String, reason: String },

    #[error("Unsupported denom: expected {expected}, got {got}")]
    UnsupportedDenom { expected: String, got: String },

    #[error("Registration cost must be > 0")]
    InvalidCost,

    #[error("Metadata too long: max {max} bytes")]
    MetadataTooLong { max: usize },

    #[error("Rate limited: wait {remaining} seconds")]
    RateLimited { remaining: u64 },

    #[error("No funds sent")]
    NoFunds,

    #[error("Invalid amount")]
    InvalidAmount,

    #[error("Insufficient funds: need {need}, have {have}")]
    InsufficientFunds { need: Uint128, have: Uint128 },

    #[error("ZK proof too long")]
    ZkProofTooLong,

    #[error("Domain already exists")]
    DomainAlreadyExists,
}