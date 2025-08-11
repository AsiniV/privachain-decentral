use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Binary, Timestamp};

#[cw_serde]
pub struct InstantiateMsg {
    /// Admin address that can update contract parameters
    pub admin: String,
    /// Cost in uatom to register a domain (anti-spam)
    pub registration_cost: u128,
    /// Maximum domain name length
    pub max_domain_length: u32,
    /// Domain expiration period in seconds
    pub domain_expiration_seconds: u64,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Register a new .prv domain with ZK proof of ownership
    Register {
        /// Domain name without .prv suffix (e.g., "alice")
        domain_hash: String,
        /// Public key for domain owner
        owner_pubkey: Binary,
        /// ZK commitment proving domain ownership without revealing domain
        zk_commitment: Binary,
        /// ZK proof that commitment is valid (real proof, no mocks)
        zk_proof: Binary,
        /// Nonce to prevent replay attacks
        nonce: u64,
    },
    /// Renew an existing domain registration
    Renew {
        /// Domain hash to renew
        domain_hash: String,
        /// Proof of ownership (signature or ZK proof)
        ownership_proof: Binary,
    },
    /// Transfer domain ownership (requires current owner signature)
    Transfer {
        /// Domain hash to transfer
        domain_hash: String,
        /// New owner public key
        new_owner_pubkey: Binary,
        /// Current owner signature authorizing transfer
        owner_signature: Binary,
        /// ZK proof from new owner
        new_owner_zk_proof: Binary,
    },
    /// Update domain metadata (MX records, etc.)
    UpdateMetadata {
        /// Domain hash
        domain_hash: String,
        /// New metadata (encrypted)
        metadata: Binary,
        /// Owner signature
        owner_signature: Binary,
    },
    /// Admin-only: Update contract parameters
    UpdateConfig {
        /// New registration cost (optional)
        registration_cost: Option<u128>,
        /// New max domain length (optional)
        max_domain_length: Option<u32>,
        /// New admin (optional)
        new_admin: Option<String>,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get domain information by hash
    #[returns(DomainInfoResponse)]
    Domain { domain_hash: String },
    
    /// Get domains owned by a public key
    #[returns(DomainsOwnedResponse)]
    DomainsOwned { 
        owner_pubkey: Binary,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get domains expiring soon
    #[returns(ExpiringDomainsResponse)]
    ExpiringSoon { 
        within_seconds: u64,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get contract configuration
    #[returns(ConfigResponse)]
    Config {},
    
    /// Get contract statistics
    #[returns(StatsResponse)]
    Stats {},
    
    /// Verify a ZK proof without storing (testing/validation)
    #[returns(VerifyProofResponse)]
    VerifyProof { 
        commitment: Binary,
        proof: Binary,
        public_inputs: Binary,
    },
}

#[cw_serde]
pub struct DomainInfoResponse {
    pub domain_hash: String,
    pub owner_pubkey: Binary,
    pub registered_at: Timestamp,
    pub expires_at: Timestamp,
    pub metadata: Option<Binary>,
    pub is_active: bool,
}

#[cw_serde]
pub struct DomainsOwnedResponse {
    pub domains: Vec<DomainInfoResponse>,
}

#[cw_serde]
pub struct ExpiringDomainsResponse {
    pub domains: Vec<DomainInfoResponse>,
}

#[cw_serde]
pub struct ConfigResponse {
    pub admin: Addr,
    pub registration_cost: u128,
    pub max_domain_length: u32,
    pub domain_expiration_seconds: u64,
    pub total_domains: u64,
}

#[cw_serde]
pub struct StatsResponse {
    pub total_domains: u64,
    pub active_domains: u64,
    pub expired_domains: u64,
    pub total_registrations_today: u64,
}

#[cw_serde]
pub struct VerifyProofResponse {
    pub valid: bool,
    pub error: Option<String>,
}

#[cw_serde]
pub struct MigrateMsg {}