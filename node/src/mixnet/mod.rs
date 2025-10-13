#[cfg(feature = "post-quantum")]
pub mod pq_bandwidth;

#[cfg(feature = "post-quantum")]
pub use pq_bandwidth::buy_pq_bandwidth;
