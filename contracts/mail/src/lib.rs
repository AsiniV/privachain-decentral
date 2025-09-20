pub mod contract;
mod error;
pub mod msg;
pub mod state;
pub mod crypto;

#[cfg(test)]
mod fuzz_tests;

pub use crate::error::ContractError;

#[cfg(not(target_arch = "wasm32"))]
fn init_logging() {
    use std::sync::Once;
    static INIT: Once = Once::new();
    INIT.call_once(|| {
        env_logger::init();
    });
}

#[cfg(target_arch = "wasm32")]
fn init_logging() {
    // No-op for WASM target
}