#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{to_json_binary, Binary, Deps, DepsMut, Empty, Env, MessageInfo, Response, StdResult};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{CodeIdResponse, ExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::CODE_ID;

// version info for migration info
const CONTRACT_NAME: &str = "crates.io:pq-verifier";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    CODE_ID.save(deps.storage, &msg.code_id)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("contract", CONTRACT_NAME)
        .add_attribute("code_id", msg.code_id.to_string()))
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
    // --- 1. iron-clad length checks -------------------------
    if pubkey.len() != 2592 {
        return Err(ContractError::WrongPubKeyLen(pubkey.len()));
    }
    if signature.len() != 4595 {
        return Err(ContractError::WrongSigLen(signature.len()));
    }
    if message_hash.len() != 32 {
        return Err(ContractError::WrongHashLen(message_hash.len()));
    }

    // --- 2. mock mode (no-op) -------------------------------
    #[cfg(not(feature = "pq"))]
    {
        Ok(Response::new()
            .add_attribute("method", "verify_sig")
            .add_attribute("mode", "mock"))
    }

    // --- 3. PQ mode (real Dilithium-5) ----------------------
    #[cfg(feature = "pq")]
    {
        unsafe {
            use oqs_sys::sig::*;
            let sig = OQS_SIG_dilithium_5();
            if sig.is_null() {
                return Err(ContractError::LiboqsError(
                    "OQS_SIG_dilithium_5 returned null".into(),
                ));
            }
            let pk_slice = pubkey.as_slice();
            let sig_slice = signature.as_slice();
            let msg_slice = message_hash.as_slice();

            let rc = OQS_SIG_verify(
                sig,
                msg_slice.as_ptr(),
                msg_slice.len(),
                sig_slice.as_ptr(),
                sig_slice.len(),
                pk_slice.as_ptr(),
            );
            OQS_SIG_free(sig);
            if rc != 0 {
                return Err(ContractError::InvalidSignature);
            }
        }
        Ok(Response::new()
            .add_attribute("method", "verify_sig")
            .add_attribute("result", "valid"))
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::CodeId {} => {
            let id = CODE_ID.load(deps.storage)?;
            to_json_binary(&CodeIdResponse { code_id: id })
        }
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(deps: DepsMut, _env: Env, _msg: Empty) -> Result<Response, ContractError> {
    let version = cw2::get_contract_version(deps.storage)?;
    if version.contract != CONTRACT_NAME {
        return Err(ContractError::Std(cosmwasm_std::StdError::generic_err(
            "Cannot migrate from different contract type",
        )));
    }
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new()
        .add_attribute("action", "migrate")
        .add_attribute("from_version", version.version)
        .add_attribute("to_version", CONTRACT_VERSION))
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    
    #[cfg(feature = "pq")]
    use sha2::{Sha256, Digest};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { code_id: 123 };
        let info = mock_info("creator", &[]);

        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());
        
        // Verify code_id was stored
        let code_id = CODE_ID.load(&deps.storage).unwrap();
        assert_eq!(code_id, 123);
    }

    #[test]
    fn test_wrong_pubkey_length() {
        let mut deps = mock_dependencies();
        
        let wrong_pk = Binary::from(vec![0u8; 100]); // Wrong length
        let sig = Binary::from(vec![0u8; 4595]);
        let hash = Binary::from(vec![0u8; 32]);
        
        let res = verify_sig(deps.as_mut(), wrong_pk, sig, hash);
        assert!(matches!(res, Err(ContractError::WrongPubKeyLen(100))));
    }

    #[test]
    fn test_wrong_hash_length() {
        let mut deps = mock_dependencies();
        
        let pk = Binary::from(vec![0u8; 2592]);
        let sig = Binary::from(vec![0u8; 4595]);
        let wrong_hash = Binary::from(vec![0u8; 16]); // Wrong length
        
        let res = verify_sig(deps.as_mut(), pk, sig, wrong_hash);
        assert!(matches!(res, Err(ContractError::WrongHashLen(16))));
    }

    #[test]
    fn test_wrong_sig_length_rejected() {
        let mut deps = mock_dependencies();
        let err = verify_sig(
            deps.as_mut(),
            Binary(vec![0; 2592]),
            Binary(vec![0; 4000]), // bad length
            Binary(vec![0; 32]),
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::WrongSigLen(4000)));
    }

    #[test]
    fn test_mock_mode_ok() {
        let mut deps = mock_dependencies();
        let res = verify_sig(
            deps.as_mut(),
            Binary(vec![0; 2592]),
            Binary(vec![0; 4595]),
            Binary(vec![0; 32]),
        )
        .unwrap();
        assert_eq!(res.attributes[0].value, "verify_sig");
        assert_eq!(res.attributes[1].value, "mock");
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
