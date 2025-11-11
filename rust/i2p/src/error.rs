//! I2P error types

use thiserror::Error;

#[derive(Debug, Error)]
pub enum I2pError {
    #[error("I2P connection error: {0}")]
    ConnectionError(String),

    #[error("I2P protocol error: {0}")]
    ProtocolError(String),

    #[error("I2P session error: {0}")]
    SessionError(String),

    #[error("I2P key error: {0}")]
    KeyError(String),

    #[error("I2P timeout: {0}")]
    Timeout(String),

    #[error("I2P IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("I2P configuration error: {0}")]
    ConfigError(String),
}

pub type I2pResult<T> = Result<T, I2pError>;
