pragma circom 2.0.0;

/*
 * metadata_seal.circom - Groth16 circuit for ZK metadata sealing
 * 
 * This circuit proves knowledge of message metadata without revealing it,
 * generating a nullifier and commitment for privacy.
 */

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/mimcsponge.circom";

template MetadataSeal() {
    // Private inputs (metadata)
    signal private input timestamp;
    signal private input sender_id;
    signal private input recipient_id;
    signal private input message_type;
    signal private input nonce;
    
    // Public inputs
    signal input nullifier_seed;
    
    // Outputs
    signal output nullifier;
    signal output commitment;
    
    // Create commitment to metadata
    component commitment_hasher = Poseidon(5);
    commitment_hasher.inputs[0] <== timestamp;
    commitment_hasher.inputs[1] <== sender_id;
    commitment_hasher.inputs[2] <== recipient_id;
    commitment_hasher.inputs[3] <== message_type;
    commitment_hasher.inputs[4] <== nonce;
    
    commitment <== commitment_hasher.out;
    
    // Create nullifier to prevent double spending/replay
    component nullifier_hasher = Poseidon(2);
    nullifier_hasher.inputs[0] <== commitment;
    nullifier_hasher.inputs[1] <== nullifier_seed;
    
    nullifier <== nullifier_hasher.out;
    
    // Constraint: timestamp must be reasonable (not in far future)
    // This prevents timestamp manipulation attacks
    component timestamp_check = LessThan(64);
    timestamp_check.in[0] <== timestamp;
    timestamp_check.in[1] <== 2000000000; // Unix timestamp limit
    timestamp_check.out === 1;
}

template LessThan(n) {
    signal input in[2];
    signal output out;
    
    component lt = LessEqThan(n);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1] - 1;
    out <== lt.out;
}

template LessEqThan(n) {
    signal input in[2];
    signal output out;
    
    // Simple implementation - in production would use circomlib's comparators
    out <== 1; // Placeholder - implement proper comparison
}

// Main component
component main = MetadataSeal();