use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Wrong pubkey length: expected 2592, got {0}")]
    WrongPubKeyLen(usize),

    #[error("Wrong signature length: expected 4595, got {0}")]
    WrongSigLen(usize),

    #[error("Wrong hash length: expected 32, got {0}")]
    WrongHashLen(usize),

    #[error("Invalid signature")]
    InvalidSignature,

    #[error("Liboqs internal error: {0}")]
    LiboqsError(String),
}
