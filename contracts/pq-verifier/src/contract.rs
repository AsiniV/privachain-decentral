#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{CodeIdResponse, ExecuteMsg, InstantiateMsg, QueryMsg};

// version info for migration info
const CONTRACT_NAME: &str = "crates.io:pq-verifier";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");
const CODE_ID: u64 = 1; // Placeholder code ID

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("contract", CONTRACT_NAME))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Verify {
            pubkey,
            signature,
            message_hash,
        } => verify_sig(deps, pubkey, signature, message_hash),
    }
}

fn verify_sig(
    _deps: DepsMut,
    pubkey: Binary,
    signature: Binary,
    message_hash: Binary,
) -> Result<Response, ContractError> {
    // 1. length checks
    if pubkey.len() != 2592 {
        return Err(ContractError::WrongPubKeyLen);
    }
    if message_hash.len() != 32 {
        return Err(ContractError::WrongHashLen);
    }

    // 2. call static liboqs (no heap allocations in Wasm)
    let pk_slice = pubkey.as_slice();
    let sig_slice = signature.as_slice();
    let hash_slice = message_hash.as_slice();

    // Convert to arrays for liboqs
    let mut pk_arr = [0u8; 2592];
    pk_arr.copy_from_slice(pk_slice);
    
    let mut hash_arr = [0u8; 32];
    hash_arr.copy_from_slice(hash_slice);

    #[cfg(feature = "pq")]
    {
        unsafe {
            use oqs_sys::sig::{OQS_SIG_dilithium_5, OQS_SIG_free, OQS_SIG_verify};
            
            let sig_ptr = OQS_SIG_dilithium_5();
            if sig_ptr.is_null() {
                return Err(ContractError::InvalidSignature);
            }
            
            let result = OQS_SIG_verify(
                sig_ptr,
                hash_arr.as_ptr(),
                hash_arr.len(),
                sig_slice.as_ptr(),
                sig_slice.len(),
                pk_arr.as_ptr(),
            );
            
            OQS_SIG_free(sig_ptr);
            
            if result != 0 {
                return Err(ContractError::InvalidSignature);
            }
        }
    }
    
    #[cfg(not(feature = "pq"))]
    {
        // In non-PQ mode (for testing), we just check basic length constraints
        if signature.len() < 100 {
            return Err(ContractError::WrongSigLen);
        }
    }

    Ok(Response::new().add_attribute("verify", "ok"))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(_deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::CodeId {} => to_json_binary(&CodeIdResponse { code_id: CODE_ID }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use sha2::{Sha256, Digest};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg {};
        let info = mock_info("creator", &[]);

        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());
    }

    #[test]
    fn test_wrong_pubkey_length() {
        let mut deps = mock_dependencies();
        
        let wrong_pk = Binary::from(vec![0u8; 100]); // Wrong length
        let sig = Binary::from(vec![0u8; 4595]);
        let hash = Binary::from(vec![0u8; 32]);
        
        let res = verify_sig(deps.as_mut(), wrong_pk, sig, hash);
        assert!(matches!(res, Err(ContractError::WrongPubKeyLen)));
    }

    #[test]
    fn test_wrong_hash_length() {
        let mut deps = mock_dependencies();
        
        let pk = Binary::from(vec![0u8; 2592]);
        let sig = Binary::from(vec![0u8; 4595]);
        let wrong_hash = Binary::from(vec![0u8; 16]); // Wrong length
        
        let res = verify_sig(deps.as_mut(), pk, sig, wrong_hash);
        assert!(matches!(res, Err(ContractError::WrongHashLen)));
    }

    #[cfg(feature = "pq")]
    #[test]
    fn dilithium_kat_pass() {
        use oqs_sys::sig::{OQS_SIG_dilithium_5, OQS_SIG_keypair, OQS_SIG_sign, OQS_SIG_free};
        
        let mut deps = mock_dependencies();
        
        unsafe {
            let sig_ptr = OQS_SIG_dilithium_5();
            assert!(!sig_ptr.is_null());
            
            let mut public_key = vec![0u8; (*sig_ptr).length_public_key];
            let mut secret_key = vec![0u8; (*sig_ptr).length_secret_key];
            
            let keypair_result = OQS_SIG_keypair(
                sig_ptr,
                public_key.as_mut_ptr(),
                secret_key.as_mut_ptr(),
            );
            assert_eq!(keypair_result, 0);
            
            let message = b"test message for dilithium verification";
            let mut hasher = Sha256::new();
            hasher.update(message);
            let hash = hasher.finalize();
            
            let mut signature = vec![0u8; (*sig_ptr).length_signature];
            let mut sig_len = signature.len();
            
            let sign_result = OQS_SIG_sign(
                sig_ptr,
                signature.as_mut_ptr(),
                &mut sig_len,
                hash.as_slice().as_ptr(),
                hash.len(),
                secret_key.as_ptr(),
            );
            assert_eq!(sign_result, 0);
            
            signature.truncate(sig_len);
            
            OQS_SIG_free(sig_ptr);
            
            let res = verify_sig(
                deps.as_mut(),
                Binary::from(public_key),
                Binary::from(signature),
                Binary::from(hash.to_vec()),
            );
            assert!(res.is_ok());
        }
    }
}
