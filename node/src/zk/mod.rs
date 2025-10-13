#![cfg(feature = "zk-proofs")]

pub mod prover;
pub mod ffi;

pub use prover::ZkProver;
pub use ffi::*;
