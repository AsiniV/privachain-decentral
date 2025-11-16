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

    #[error("Wrong signature length")]
    WrongSigLen,

    #[error("Wrong message hash length (expected 32 B)")]
    WrongHashLen,
}
