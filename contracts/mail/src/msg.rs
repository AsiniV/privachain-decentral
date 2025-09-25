use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Binary, Uint128};

#[cw_serde]
pub struct InstantiateMsg {
    /// Admin address for contract upgrades
    pub admin: Option<String>,
    /// Cost to register a .prv domain in PRIV tokens
    pub domain_registration_fee: Uint128,
    /// Cost to send an email in PRIV tokens (anti-spam)
    pub email_fee: Uint128,
    /// Minimum proof-of-work difficulty for emails
    pub pow_difficulty: u32,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Register a new .prv domain with ZK proof of ownership
    RegisterDomain {
        /// Domain name (without .prv suffix)
        domain: String,
        /// ZK-SNARK proof of private key ownership
        zk_proof: Binary,
        /// PGP public key for encryption
        public_key: Binary,
        /// Optional MX records for mail routing
        mx_records: Option<Vec<String>>,
    },
    /// Send an encrypted email to a .prv domain
    SendEmail {
        /// Recipient domain (with .prv suffix)
        recipient_domain: String,
        /// IPFS content hash of encrypted email
        content_cid: String,
        /// Proof-of-work for anti-spam
        pow_proof: Binary,
        /// Optional sender alias for reply routing
        sender_alias: Option<String>,
    },
    /// Update domain settings (only domain owner)
    UpdateDomain {
        domain: String,
        /// New PGP public key
        public_key: Option<Binary>,
        /// Updated MX records
        mx_records: Option<Vec<String>>,
        /// Enable/disable domain
        active: Option<bool>,
    },
    /// Register as a mail relay node
    RegisterRelay {
        /// Geographic location for routing optimization
        location: String,
        /// Stake amount for relay reputation
        stake: Uint128,
        /// Endpoint for mail delivery
        endpoint: String,
    },
    /// Claim rewards for mail relay services
    ClaimRelayRewards {},
    /// Report spam or malicious activity
    ReportSpam {
        /// Domain or content hash being reported
        target: String,
        /// Evidence of spam/malicious behavior
        evidence: Binary,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get domain information
    #[returns(DomainResponse)]
    GetDomain { domain: String },
    
    /// Get emails for a domain (only domain owner can query)
    #[returns(EmailsResponse)]
    GetEmails { 
        domain: String, 
        /// Optional pagination
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get relay node information
    #[returns(RelayResponse)]
    GetRelay { address: String },
    
    /// Get all active relay nodes for routing
    #[returns(RelaysResponse)]
    GetRelays {
        /// Optional location filter for geographic routing
        location: Option<String>,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get contract configuration
    #[returns(ConfigResponse)]
    GetConfig {},
    
    /// Get domain statistics
    #[returns(StatsResponse)]
    GetStats {},
}

#[cw_serde]
pub struct DomainResponse {
    /// Domain name
    pub domain: String,
    /// Domain owner address (hashed for privacy)
    pub owner_hash: Binary,
    /// PGP public key for encryption
    pub public_key: Binary,
    /// Mail exchanger records
    pub mx_records: Vec<String>,
    /// Domain registration timestamp
    pub registered_at: u64,
    /// Domain expiration timestamp
    pub expires_at: u64,
    /// Whether domain is active
    pub active: bool,
    /// Domain reputation score (0-100)
    pub reputation: u32,
}

#[cw_serde]
pub struct EmailsResponse {
    pub emails: Vec<EmailInfo>,
}

#[cw_serde]
pub struct EmailInfo {
    /// Unique email ID
    pub id: String,
    /// Anonymous sender alias
    pub sender_alias: String,
    /// IPFS content hash
    pub content_cid: String,
    /// Email timestamp
    pub timestamp: u64,
    /// Delivery confirmation
    pub delivered: bool,
}

#[cw_serde]
pub struct RelayResponse {
    /// Relay node address
    pub address: Addr,
    /// Geographic location
    pub location: String,
    /// Staked amount for reputation
    pub stake: Uint128,
    /// Service endpoint
    pub endpoint: String,
    /// Number of emails relayed (u32 for gas optimization)
    pub emails_relayed: u32,
    /// Success rate percentage
    pub success_rate: u32,
    /// Total earned rewards
    pub rewards_earned: Uint128,
    /// Whether relay is active
    pub active: bool,
}

#[cw_serde]
pub struct RelaysResponse {
    pub relays: Vec<RelayResponse>,
}

#[cw_serde]
pub struct ConfigResponse {
    /// Contract admin
    pub admin: Option<Addr>,
    /// Domain registration fee
    pub domain_registration_fee: Uint128,
    /// Email sending fee
    pub email_fee: Uint128,
    /// Proof-of-work difficulty
    pub pow_difficulty: u32,
    /// Total domains registered (u32 for gas optimization)
    pub total_domains: u32,
    /// Total emails sent (u32 for gas optimization)
    pub total_emails: u32,
}

#[cw_serde]
pub struct StatsResponse {
    /// Total domains registered (u32 for gas optimization)
    pub total_domains: u32,
    /// Active domains (u32 for gas optimization)
    pub active_domains: u32,
    /// Total emails sent (u32 for gas optimization)
    pub total_emails: u32,
    /// Total relay nodes (u32 for gas optimization)
    pub total_relays: u32,
    /// Active relay nodes (u32 for gas optimization)
    pub active_relays: u32,
}

/// Migration message for contract upgrades
#[cw_serde]
pub struct MigrateMsg {}