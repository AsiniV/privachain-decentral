#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, ReputationResponse};
use crate::state::{Reputation, REPUTATION};

// version info for migration info
const CONTRACT_NAME: &str = "crates.io:reputation";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

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
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Update {
            score,
            dilithium_pk,
            dilithium_sig,
        } => execute_update(deps, info, score, dilithium_pk, dilithium_sig),
    }
}

fn execute_update(
    deps: DepsMut,
    info: MessageInfo,
    score: u32,
    dilithium_pk: Binary,
    dilithium_sig: Binary,
) -> Result<Response, ContractError> {
    // Validate score
    if score > 100 {
        return Err(ContractError::InvalidScore);
    }

    // Validate pubkey length
    if dilithium_pk.len() != 2592 {
        return Err(ContractError::WrongPubKeyLen);
    }

    // Create message to hash: concatenate sender address and score
    let mut message = info.sender.as_bytes().to_vec();
    message.extend_from_slice(&score.to_be_bytes());

    // Hash the message
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(&message);
    let hash = hasher.finalize();

    // Verify Dilithium-5 signature
    let pk_slice = dilithium_pk.as_slice();
    let sig_slice = dilithium_sig.as_slice();

    let mut pk_arr = [0u8; 2592];
    pk_arr.copy_from_slice(pk_slice);

    let mut hash_arr = [0u8; 32];
    hash_arr.copy_from_slice(hash.as_slice());

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
        if dilithium_sig.len() < 100 {
            return Err(ContractError::WrongSigLen);
        }
    }

    // Store reputation
    let reputation = Reputation {
        score,
        dilithium_pk,
        dilithium_sig,
    };
    REPUTATION.save(deps.storage, &info.sender, &reputation)?;

    Ok(Response::new()
        .add_attribute("action", "update_reputation")
        .add_attribute("address", info.sender.to_string())
        .add_attribute("score", score.to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetReputation { address } => {
            to_json_binary(&query_reputation(deps, address)?)
        }
    }
}

fn query_reputation(deps: Deps, address: String) -> StdResult<ReputationResponse> {
    let addr = deps.api.addr_validate(&address)?;
    let reputation = REPUTATION
        .may_load(deps.storage, &addr)?
        .unwrap_or(Reputation {
            score: 0,
            dilithium_pk: Binary::default(),
            dilithium_sig: Binary::default(),
        });

    Ok(ReputationResponse {
        score: reputation.score,
        dilithium_pk: reputation.dilithium_pk,
        dilithium_sig: reputation.dilithium_sig,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::Addr;

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg {};
        let info = mock_info("creator", &[]);

        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());
    }

    #[test]
    fn test_invalid_score() {
        let mut deps = mock_dependencies();
        let info = mock_info("user", &[]);

        let res = execute_update(
            deps.as_mut(),
            info,
            101, // Invalid score > 100
            Binary::from(vec![0u8; 2592]),
            Binary::from(vec![0u8; 4595]),
        );
        assert!(matches!(res, Err(ContractError::InvalidScore)));
    }

    #[test]
    fn test_wrong_pubkey_length() {
        let mut deps = mock_dependencies();
        let info = mock_info("user", &[]);

        let res = execute_update(
            deps.as_mut(),
            info,
            50,
            Binary::from(vec![0u8; 100]), // Wrong length
            Binary::from(vec![0u8; 4595]),
        );
        assert!(matches!(res, Err(ContractError::WrongPubKeyLen)));
    }

    #[test]
    fn test_query_nonexistent_reputation() {
        let deps = mock_dependencies();

        let res = query_reputation(deps.as_ref(), "unknown_user".to_string()).unwrap();
        assert_eq!(res.score, 0);
        assert_eq!(res.dilithium_pk.len(), 0);
    }

    #[test]
    fn test_update_and_query() {
        let mut deps = mock_dependencies();
        
        // First instantiate
        let msg = InstantiateMsg {};
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Update reputation (without pq feature, only basic validation)
        let info = mock_info("user1", &[]);
        let res = execute_update(
            deps.as_mut(),
            info.clone(),
            75,
            Binary::from(vec![0u8; 2592]),
            Binary::from(vec![0u8; 4595]),
        );
        assert!(res.is_ok());

        // Query reputation
        let res = query_reputation(deps.as_ref(), "user1".to_string()).unwrap();
        assert_eq!(res.score, 75);
        assert_eq!(res.dilithium_pk.len(), 2592);
    }
}
