#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Order, Response, StdResult, Uint128};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, HistoryEntry, HistoryResponse, InstantiateMsg, QueryMsg, ReputationResponse};
use crate::state::{Reputation, ReputationRecord, COUNTER, HISTORY, REPUTATION};
use cw_storage_plus::Bound;

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
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Update {
            score,
            dilithium_pk,
            dilithium_sig,
        } => execute_update(deps, env, info, score, dilithium_pk, dilithium_sig),
    }
}

fn execute_update(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    score: u32,
    dilithium_pk: Binary,
    dilithium_sig: Binary,
) -> Result<Response, ContractError> {
    // --- 1. length & zero check (only in pq mode) ----------------------------
    #[cfg(feature = "pq")]
    {
        if dilithium_sig.len() != 4595 {
            return Err(ContractError::WrongSigLen(dilithium_sig.len()));
        }
        if dilithium_sig.as_slice().iter().all(|&b| b == 0) {
            return Err(ContractError::ZeroInput);
        }
    }

    // --- 2. score range ------------------------------------
    if score > 100 {
        return Err(ContractError::InvalidScore);
    }

    // --- 3. Validate pubkey length -------------------------
    if dilithium_pk.len() != 2592 {
        return Err(ContractError::WrongPubKeyLen);
    }

    // --- 4. self-only guard (feature) ----------------------
    #[cfg(feature = "self_only")]
    {
        use sha2::{Digest, Sha256};
        let pk_hash = Sha256::digest(dilithium_pk.as_slice());
        let addr_bytes = &pk_hash[0..20];
        let expected_addr = deps.api.addr_validate(&hex::encode(addr_bytes))?;
        if info.sender != expected_addr {
            return Err(ContractError::Unauthorized);
        }
    }

    // --- 5. Create message to hash --------------------------
    let mut message = info.sender.as_bytes().to_vec();
    message.extend_from_slice(&score.to_be_bytes());

    // Hash the message
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(&message);
    let hash = hasher.finalize();
    let mut hash_arr = [0u8; 32];
    hash_arr.copy_from_slice(hash.as_slice());

    // --- 6. verify signature (reuse pq-verifier logic) -----
    pq_verify_sig(dilithium_pk.clone(), dilithium_sig.clone(), Binary::from(hash_arr.to_vec()))?;

    // --- 7. save history (non-breaking) --------------------
    let counter = COUNTER.may_load(deps.storage)?.unwrap_or_default() + Uint128::from(1u32);
    COUNTER.save(deps.storage, &counter)?;
    
    // Create a pseudo tx_hash from block height and tx index
    let tx_hash = env.transaction
        .as_ref()
        .map(|t| {
            let mut hash = Vec::with_capacity(32);
            hash.extend_from_slice(&env.block.height.to_be_bytes());
            hash.extend_from_slice(&t.index.to_be_bytes());
            // Pad to 32 bytes
            hash.resize(32, 0);
            hash
        })
        .unwrap_or_else(|| vec![0u8; 32]);
    
    HISTORY.save(
        deps.storage,
        (&info.sender, counter.u128() as u32),
        &ReputationRecord {
            score,
            timestamp: env.block.time,
            tx_hash,
        },
    )?;

    // --- 8. overwrite current score (old behaviour) --------
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

/// Post-quantum signature verification helper
#[cfg(feature = "pq")]
fn pq_verify_sig(pk: Binary, sig: Binary, hash: Binary) -> Result<(), ContractError> {
    unsafe {
        use oqs_sys::sig::{OQS_SIG_dilithium_5, OQS_SIG_free, OQS_SIG_verify};

        let scheme = OQS_SIG_dilithium_5();
        if scheme.is_null() {
            return Err(ContractError::LiboqsError("null scheme".into()));
        }

        let pk_slice = pk.as_slice();
        let sig_slice = sig.as_slice();
        let hash_slice = hash.as_slice();

        let mut pk_arr = [0u8; 2592];
        pk_arr.copy_from_slice(pk_slice);

        let rc = OQS_SIG_verify(
            scheme,
            hash_slice.as_ptr(),
            hash_slice.len(),
            sig_slice.as_ptr(),
            sig_slice.len(),
            pk_arr.as_ptr(),
        );

        OQS_SIG_free(scheme);

        if rc != 0 {
            return Err(ContractError::InvalidSignature);
        }
        Ok(())
    }
}

/// Mock mode - no actual verification
#[cfg(not(feature = "pq"))]
fn pq_verify_sig(_pk: Binary, sig: Binary, _hash: Binary) -> Result<(), ContractError> {
    // In non-PQ mode (for testing), we just check basic length constraints
    if sig.len() < 100 {
        return Err(ContractError::WrongSigLen(sig.len()));
    }
    Ok(())
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetReputation { address } => {
            to_json_binary(&query_reputation(deps, address)?)
        }
        QueryMsg::GetHistory {
            address,
            start_after,
            limit,
        } => to_json_binary(&query_history(deps, address, start_after, limit)?),
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

fn query_history(
    deps: Deps,
    address: String,
    start_after: Option<u32>,
    limit: Option<u32>,
) -> StdResult<HistoryResponse> {
    let addr = deps.api.addr_validate(&address)?;
    let limit = limit.unwrap_or(10).min(30) as usize;
    let start = start_after.map(|s| Bound::exclusive(s));

    let entries: Vec<_> = HISTORY
        .prefix(&addr)
        .range(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (idx, rec) = item?;
            Ok(HistoryEntry {
                index: idx,
                score: rec.score,
                timestamp: rec.timestamp,
                tx_hash: rec.tx_hash,
            })
        })
        .collect::<StdResult<_>>()?;
    Ok(HistoryResponse { entries })
}

/// Migration entry point for contract upgrades
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(deps: DepsMut, _env: Env, _msg: cosmwasm_std::Empty) -> Result<Response, ContractError> {
    // Verify we're migrating from version 0.1.0
    let version = cw2::get_contract_version(deps.storage)?;
    if version.contract != CONTRACT_NAME {
        return Err(ContractError::Std(cosmwasm_std::StdError::generic_err(
            "Cannot migrate from different contract type",
        )));
    }
    
    // Set new version
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    
    Ok(Response::new().add_attribute("action", "migrate"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};

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
            mock_env(),
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
            mock_env(),
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
            mock_env(),
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

    // KAT tests with test data
    const PK: &[u8] = include_bytes!("../test-data/dil5-pk.bin"); // 2592
    const SIG: &[u8] = include_bytes!("../test-data/dil5-sig.bin"); // 4595

    #[test]
    #[cfg(feature = "pq")]
    fn wrong_sig_len_fails() {
        // This test only makes sense with pq feature enabled
        let mut deps = mock_dependencies();
        let err = execute_update(
            deps.as_mut(),
            mock_env(),
            mock_info("sender", &[]),
            50,
            Binary::from(PK.to_vec()),
            Binary::from(vec![0; 4000]), // bad length
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::WrongSigLen(4000)));
    }

    #[test]
    #[cfg(not(feature = "pq"))]
    fn wrong_sig_len_fails_mock() {
        // In mock mode, only very short signatures fail
        let mut deps = mock_dependencies();
        let err = execute_update(
            deps.as_mut(),
            mock_env(),
            mock_info("sender", &[]),
            50,
            Binary::from(PK.to_vec()),
            Binary::from(vec![0; 50]), // too short even for mock
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::WrongSigLen(50)));
    }

    #[test]
    #[cfg(feature = "pq")]
    fn zero_sig_fails() {
        // This test only makes sense with pq feature enabled
        let mut deps = mock_dependencies();
        let err = execute_update(
            deps.as_mut(),
            mock_env(),
            mock_info("sender", &[]),
            50,
            Binary::from(PK.to_vec()),
            Binary::from(vec![0; 4595]), // all-zero
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::ZeroInput));
    }

    #[test]
    fn zero_sig_mock_mode_ok() {
        // In mock mode, zero signature with correct length should pass basic checks
        let mut deps = mock_dependencies();
        // Note: without pq feature, we don't check for zero-filled signatures
        let res = execute_update(
            deps.as_mut(),
            mock_env(),
            mock_info("sender", &[]),
            50,
            Binary::from(PK.to_vec()),
            Binary::from(vec![0; 4595]), // all-zero but valid length in mock mode
        );
        // In mock mode, this should succeed as we don't enforce zero-input check
        assert!(res.is_ok());
    }

    #[test]
    fn mock_mode_ok() {
        let mut deps = mock_dependencies();
        let res = execute_update(
            deps.as_mut(),
            mock_env(),
            mock_info("sender", &[]),
            100,
            Binary::from(PK.to_vec()),
            Binary::from(SIG.to_vec()),
        )
        .unwrap();
        assert_eq!(res.attributes[2].value, "100");
    }

    #[test]
    fn test_history_query() {
        let mut deps = mock_dependencies();
        
        // First instantiate
        let msg = InstantiateMsg {};
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Add multiple updates
        let info = mock_info("user1", &[]);
        for score in [50, 60, 70] {
            execute_update(
                deps.as_mut(),
                mock_env(),
                info.clone(),
                score,
                Binary::from(vec![0u8; 2592]),
                Binary::from(vec![1u8; 4595]),
            )
            .unwrap();
        }

        // Query history
        let res = query_history(deps.as_ref(), "user1".to_string(), None, None).unwrap();
        assert_eq!(res.entries.len(), 3);
        assert_eq!(res.entries[0].score, 50);
        assert_eq!(res.entries[1].score, 60);
        assert_eq!(res.entries[2].score, 70);
    }
}
