// crypto/mod.rs - Post-quantum cryptography modules
//
// Feature-gated modules for v3.0 PQ support

#[cfg(feature = "post-quantum")]
pub mod pq_handshake;

#[cfg(feature = "post-quantum")]
pub mod pq_sign;

#[cfg(feature = "post-quantum")]
pub mod pq_ffi;
