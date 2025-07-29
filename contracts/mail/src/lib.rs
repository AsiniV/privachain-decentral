pub mod contract;
mod error;
pub mod msg;
pub mod state;

pub use crate::error::ContractError;

#[cfg(not(target_arch = "wasm32"))]
fn init_logging() {
    env_logger::init();
}

#[cfg(target_arch = "wasm32")]
fn init_logging() {
    // No-op for WASM target
}