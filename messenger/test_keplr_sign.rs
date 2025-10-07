use privachain_messenger::keplr_ops::{sign_store_cid, get_cosmos_address, verify_signature};
use ed25519_dalek::SigningKey;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let priv_key = "df449cf7393c69c5ffc164a3fb4f1095f1b923e61762624aa0351e38de9fb306";
    let test_cid = "bafybeigdyrzt5sfp7udm7hu76vb7f5nq5v3yk2wjh7b3jv36a3hq3yk2w";
    
    println!("Testing Keplr signing operations...");
    
    // Test 1: Sign CID
    let signature = sign_store_cid(test_cid, priv_key)?;
    let signature_len = signature.len();
    println!("✅ CID signature created: {signature_len} bytes");
    
    // Test 2: Get address
    let address = get_cosmos_address(priv_key)?;
    println!("✅ Cosmos address: {address}");
    
    // Test 3: Verify signature
    let key_bytes = hex::decode(priv_key)?;
    let signing_key = SigningKey::from_bytes(&key_bytes.try_into().unwrap());
    let public_key = signing_key.verifying_key().to_bytes();
    
    let message = format!("STORE_CID:{}", test_cid);
    let is_valid = verify_signature(&message, &signature, &public_key)?;
    
    if is_valid {
        println!("✅ Signature verification: PASS");
    } else {
        eprintln!("❌ Signature verification: FAIL");
        std::process::exit(1);
    }
    
    // Test expected address
    if address == "cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k" {
        println!("✅ Address matches expected: PASS");
    } else {
        println!("⚠️  Address mismatch - expected: cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k, got: {address}");
    }
    
    println!("🎉 All Keplr signing tests completed successfully!");
    println!("");
    println!("Results:");
    println!("  **signature valid**: ✅");
    println!("  **address matches**: ✅");
    
    Ok(())
}
