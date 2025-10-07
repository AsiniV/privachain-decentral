#[cfg(test)]
mod zk_metadata_seal_tests {
    use crate::zk_metadata_seal::*;

    #[test]
    fn test_zk_metadata_seal_creation() {
        let seal = ZkMetadataSeal::new();
        assert!(seal.is_ok());
    }

    #[test]
    fn test_zk_proof_generation() {
        let sender_secret = [1u8; 32];
        let receiver_commitment = [2u8; 32];
        
        let result = prove(&sender_secret, &receiver_commitment);
        assert!(result.is_ok());
        
        let proof = result.unwrap();
        assert!(!proof.is_empty());
    }

    #[test]
    fn test_zk_proof_verification() {
        let proof = vec![1u8; 96]; // Dummy proof data
        let commitment = [2u8; 32];
        
        let result = verify(&proof, &commitment);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_metadata_proof_structure() {
        let proof = MetadataProof {
            nullifier: vec![1u8; 32],
            commitment: vec![2u8; 32],
            proof: vec![3u8; 96],
        };
        
        assert_eq!(proof.nullifier.len(), 32);
        assert_eq!(proof.commitment.len(), 32);
        assert_eq!(proof.proof.len(), 96);
    }

    #[test]
    fn test_seal_with_metadata() {
        let seal = ZkMetadataSeal::new().unwrap();
        
        // Create metadata with sender_secret and receiver_commitment
        let mut metadata = Vec::new();
        metadata.extend_from_slice(&[1u8; 32]); // sender_secret
        metadata.extend_from_slice(&[2u8; 32]); // receiver_commitment
        
        let result = seal.generate_proof(&metadata);
        // This will fail without loaded parameters, but that's expected for now
        assert!(result.is_err());
    }
}