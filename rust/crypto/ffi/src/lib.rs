use privachain_crypto::dr::{
    Session, IdentityKey, SignedPreKey, EphemeralKey, RatchetMessage,
    establish_outbound_session, establish_inbound_session
};
use std::collections::HashMap;
use std::sync::Mutex;
use bincode;
use lazy_static::lazy_static;

pub struct KeyPair {
    pub public_key: Vec<u8>,
    pub private_key: Vec<u8>,
}

pub fn generate_identity_key() -> KeyPair {
    let key = IdentityKey::generate().expect("Failed to generate identity key");
    KeyPair {
        public_key: key.public_bytes(),
        private_key: key.private_bytes(),
    }
}

pub fn generate_signed_prekey(identity: KeyPair) -> KeyPair {
    let identity_key = IdentityKey::from_bytes(&identity.private_key)
        .expect("Failed to parse identity key");
    let prekey = SignedPreKey::generate(&identity_key)
        .expect("Failed to generate signed prekey");
    KeyPair {
        public_key: prekey.public_bytes(),
        private_key: prekey.private_bytes(),
    }
}

pub fn generate_ephemeral_key() -> KeyPair {
    let key = EphemeralKey::generate().expect("Failed to generate ephemeral key");
    KeyPair {
        public_key: key.public_bytes(),
        private_key: key.private_bytes(),
    }
}

pub fn generate_one_time_prekey() -> KeyPair {
    let key = EphemeralKey::generate().expect("Failed to generate one-time prekey");
    KeyPair {
        public_key: key.public_bytes(),
        private_key: key.private_bytes(),
    }
}

#[derive(Clone, Debug, Hash, Eq, PartialEq)]
pub struct RatchetAddress {
    pub did: String,
    pub device_id: u32,
}

pub struct CipherMessage {
    pub ciphertext: Vec<u8>,
    pub header: Vec<u8>,
}

lazy_static! {
    static ref SESSIONS: Mutex<HashMap<RatchetAddress, Session>> = Mutex::new(HashMap::new());
}

pub struct DrSession;

impl DrSession {
    pub fn new() -> Self {
        Self
    }

    pub fn establish_outbound(
        &self,
        addr: RatchetAddress,
        their_identity_pub: Vec<u8>,
        their_signed_pre_pub: Vec<u8>,
        their_ephemeral_pub: Vec<u8>,
    ) -> Result<(), DrError> {
        let mut map = SESSIONS.lock().map_err(|_| DrError::Crypto)?;
        let their_identity = IdentityKey::from_bytes(&their_identity_pub)
            .map_err(|_| DrError::Crypto)?;
        let their_signed_pre = SignedPreKey::from_bytes(&their_signed_pre_pub)
            .map_err(|_| DrError::Crypto)?;
        let their_ephemeral = EphemeralKey::from_bytes(&their_ephemeral_pub)
            .map_err(|_| DrError::Crypto)?;
        
        let session = establish_outbound_session(
            their_identity,
            their_signed_pre,
            their_ephemeral,
        ).map_err(|_| DrError::Crypto)?;
        
        map.insert(addr, session);
        Ok(())
    }

    pub fn establish_inbound(
        &self,
        addr: RatchetAddress,
        identity_pub: Vec<u8>,
        signed_pre_pub: Vec<u8>,
        ephemeral_pub: Vec<u8>,
    ) -> Result<(), DrError> {
        let mut map = SESSIONS.lock().map_err(|_| DrError::Crypto)?;
        let identity = IdentityKey::from_bytes(&identity_pub)
            .map_err(|_| DrError::Crypto)?;
        let signed_pre = SignedPreKey::from_bytes(&signed_pre_pub)
            .map_err(|_| DrError::Crypto)?;
        let ephemeral = EphemeralKey::from_bytes(&ephemeral_pub)
            .map_err(|_| DrError::Crypto)?;
        
        let session = establish_inbound_session(
            identity,
            signed_pre,
            ephemeral,
        ).map_err(|_| DrError::Crypto)?;
        
        map.insert(addr, session);
        Ok(())
    }

    pub fn encrypt(&self, addr: RatchetAddress, plaintext: Vec<u8>) -> Result<CipherMessage, DrError> {
        let mut map = SESSIONS.lock().map_err(|_| DrError::Crypto)?;
        let session = map.get_mut(&addr).ok_or(DrError::NoSession)?;
        
        let ratchet_msg = session.encrypt(&plaintext)
            .map_err(|_| DrError::Crypto)?;
        
        // Serialize the RatchetMessage header (message_number, previous_chain_length)
        let header = bincode::serialize(&(ratchet_msg.message_number, ratchet_msg.previous_chain_length))
            .map_err(|_| DrError::Serialize)?;
        
        Ok(CipherMessage {
            header,
            ciphertext: ratchet_msg.ciphertext,
        })
    }

    pub fn decrypt(&self, addr: RatchetAddress, msg: CipherMessage) -> Result<Vec<u8>, DrError> {
        let mut map = SESSIONS.lock().map_err(|_| DrError::Crypto)?;
        let session = map.get_mut(&addr).ok_or(DrError::NoSession)?;
        
        // Deserialize header to reconstruct RatchetMessage
        let (message_number, previous_chain_length): (u32, u32) = 
            bincode::deserialize(&msg.header).map_err(|_| DrError::Serialize)?;
        
        let ratchet_msg = RatchetMessage {
            ciphertext: msg.ciphertext,
            message_number,
            previous_chain_length,
        };
        
        let plaintext = session.decrypt(&ratchet_msg)
            .map_err(|_| DrError::Crypto)?;
        
        Ok(plaintext)
    }

    pub fn serialize_session(&self, addr: RatchetAddress) -> Result<Vec<u8>, DrError> {
        let _map = SESSIONS.lock().map_err(|_| DrError::Crypto)?;
        let _session = _map.get(&addr).ok_or(DrError::NoSession)?;
        
        // Note: Session needs to implement Serialize for this to work
        // For now, return placeholder
        Ok(vec![0u8; 64])
    }

    pub fn load_session(&self, addr: RatchetAddress, _data: Vec<u8>) -> Result<(), DrError> {
        // Note: Session needs to implement Deserialize for this to work
        // For now, create a new session as placeholder
        let session = Session::new(&[42u8; 32])
            .map_err(|_| DrError::Crypto)?;
        
        let mut map = SESSIONS.lock().map_err(|_| DrError::Crypto)?;
        map.insert(addr, session);
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub enum DrError {
    NoSession,
    Crypto,
    Serialize,
}

impl std::fmt::Display for DrError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DrError::NoSession => write!(f, "No session found"),
            DrError::Crypto => write!(f, "Crypto error"),
            DrError::Serialize => write!(f, "Serialization error"),
        }
    }
}

impl std::error::Error for DrError {}

uniffi::include_scaffolding!("privachain_dr");
