use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("DID already exists")]
    DIDAlreadyExists {},

    #[error("DID not found")]
    DIDNotFound {},

    #[error("Already approved")]
    AlreadyApproved {},

    #[error("Insufficient approvals")]
    InsufficientApprovals {},

    #[error("Invalid proof")]
    InvalidProof {},
}

impl From<ContractError> for StdError {
    fn from(source: ContractError) -> Self {
        StdError::generic_err(source.to_string())
    }
}