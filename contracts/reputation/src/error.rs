use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Invalid Dilithium-5 signature")]
    InvalidSignature,

    #[error("Wrong pubkey length (expected 2592 B)")]
    WrongPubKeyLen,

    #[error("Wrong signature length: expected 4595, got {0}")]
    WrongSigLen(usize),

    #[error("Zero-filled input detected")]
    ZeroInput,

    #[error("Invalid score (must be 0-100)")]
    InvalidScore,

    #[error("Reputation not found")]
    ReputationNotFound,

    #[error("Unauthorized")]
    Unauthorized,

    #[cfg(feature = "pq")]
    #[error("liboqs error: {0}")]
    LiboqsError(String),
}
