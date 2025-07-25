use cosmwasm_std::StdError;
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

    #[error("Invalid ZK proof")]
    InvalidZkProof {},

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
}