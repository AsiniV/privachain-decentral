pub mod cosmos_light;
pub use cosmos_light::*;

// Modules for the node binary
#[cfg(not(target_arch = "wasm32"))]
pub mod cli;
#[cfg(not(target_arch = "wasm32"))]
pub mod tor_runner;

#[cfg(not(target_arch = "wasm32"))]
pub mod network;

#[cfg(all(not(target_arch = "wasm32"), feature = "post-quantum"))]
pub mod mixnet;

#[cfg(all(not(target_arch = "wasm32"), feature = "post-quantum"))]
pub mod crypto;

#[cfg(all(not(target_arch = "wasm32"), feature = "zk-proofs"))]
pub mod zk;

// ECH (Encrypted Client Hello) module for QUIC+ECH integration
#[cfg(all(not(target_arch = "wasm32"), feature = "quic-ech"))]
pub mod ech;

// IPFS module with QUIC+ECH fetch support
#[cfg(not(target_arch = "wasm32"))]
pub mod ipfs;
