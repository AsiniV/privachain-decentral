#[cfg(feature = "post-quantum")]
pub mod pq_rotation;

#[cfg(feature = "post-quantum")]
pub mod pq_mnemonic;

#[cfg(feature = "post-quantum")]
pub use pq_rotation::{rotate_if_needed, get_rotation_interval_hours};

#[cfg(feature = "post-quantum")]
pub use pq_mnemonic::{pq_seed_from_mnemonic, validate_mnemonic_format, derive_key_material};
