use cosmwasm_std::*;
use serde::{Deserialize, Serialize};
use cw_storage_plus::Map;
use std::collections::HashSet;

use crate::state::{ADMIN, THRESHOLD, ADMIN_PROPOSAL, Proposal, VK};
use crate::error::ContractError;

use ark_bn254::{Bn254, Fr as BnFr};
use ark_groth16::{Groth16, Proof, VerifyingKey, prepare_verifying_key};
use ark_serialize::CanonicalDeserialize;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct InstantiateMsg {
    pub admins: Vec<String>, // Multi-sig admin addresses
    pub threshold: u8,       // Approval threshold for multi-sig
    pub vk: Binary,          // Serialized verifying key for ZK proofs
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Register { did: String, pub_key: Vec<u8>, proof_data: Option<Binary>, public_inputs: Vec<Binary> },
    RotateAdmin { new_admins: Vec<String> },
    ApproveRotation {},
    ExecuteAdminRotation {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    Resolve { did: String },
    GetAdmins {},
    GetPendingRotation {},
}

pub const DID: Map<&str, Vec<u8>> = Map::new("did");

fn verify_zk_proof(deps: Deps, proof: &Proof<Bn254>, public_inputs: &[BnFr]) -> Result<bool, ContractError> {
    let vk_bytes = VK.load(deps.storage)?;
    let vk = VerifyingKey::<Bn254>::deserialize_uncompressed(&*vk_bytes)
        .map_err(|e| ContractError::Std(StdError::generic_err(e.to_string())))?;
    
    let pvk = prepare_verifying_key(&vk);
    Groth16::<Bn254>::verify_proof(&pvk, proof, public_inputs)
        .map_err(|e| ContractError::Std(StdError::generic_err(e.to_string())))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(deps: DepsMut, _env: Env, info: MessageInfo, msg: InstantiateMsg) -> StdResult<Response> {
    // Validate admin addresses and create multi-sig admin
    if msg.admins.is_empty() || msg.admins.len() < 2 {
        return Err(StdError::generic_err("Multi-sig requires at least 2 admins"));
    }
    
    if msg.threshold == 0 || msg.threshold > msg.admins.len() as u8 {
        return Err(StdError::generic_err("Invalid threshold"));
    }

    let mut admin_set: HashSet<Addr> = HashSet::new();
    for addr_str in msg.admins {
        let addr = deps.api.addr_validate(&addr_str)?;
        if !admin_set.insert(addr.clone()) {
            return Err(StdError::generic_err("Duplicate admins"));
        }
    }

    let admin_addrs: Vec<Addr> = admin_set.into_iter().collect();
    
    // Save multi-sig admin list and threshold
    ADMIN.save(deps.storage, &admin_addrs)?;
    THRESHOLD.save(deps.storage, &msg.threshold)?;
    VK.save(deps.storage, &msg.vk.to_vec())?;
    
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin_count", admin_addrs.len().to_string())
        .add_attribute("threshold", msg.threshold.to_string())
        .add_attribute("deployer", info.sender))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(deps: DepsMut, env: Env, info: MessageInfo, msg: ExecuteMsg) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Register { did, pub_key, proof_data, public_inputs } => {
            // ✅ H4: Comprehensive input sanitization
            // Validate DID format and length
            if did.len() > 64 || did.is_empty() {
                return Err(ContractError::Std(StdError::generic_err("DID length must be 1-64 characters")));
            }
            
            // Validate DID contains only alphanumeric, hyphens, and colons
            if !did.chars().all(|c| c.is_alphanumeric() || c == '-' || c == ':') {
                return Err(ContractError::Std(StdError::generic_err("DID contains invalid characters")));
            }
            
            // Validate public key length
            if pub_key.len() > 128 || pub_key.is_empty() {
                return Err(ContractError::Std(StdError::generic_err("Public key length must be 1-128 bytes")));
            }
            
            // Check multi-sig admin access (requires any admin)
            let admins = ADMIN.load(deps.storage)?;
            if !admins.contains(&info.sender) {
                return Err(ContractError::Unauthorized {});
            }

            // Check if DID already exists
            if DID.has(deps.storage, &did) {
                return Err(ContractError::DIDAlreadyExists {});
            }
            
            // If proof provided, verify it
            if let Some(proof_data) = proof_data {
                let proof = Proof::deserialize_uncompressed(&*proof_data)
                    .map_err(|e| ContractError::Std(StdError::generic_err(e.to_string())))?;
                
                let mut inputs: Vec<BnFr> = vec![];
                for input in public_inputs {
                    let fr = BnFr::deserialize_uncompressed(&*input)
                        .map_err(|e| ContractError::Std(StdError::generic_err(e.to_string())))?;
                    inputs.push(fr);
                }
                
                let verified = verify_zk_proof(deps.as_ref(), &proof, &inputs)?;
                if !verified {
                    return Err(ContractError::InvalidProof {});
                }
            }
            
            DID.save(deps.storage, &did, &pub_key)?;
            Ok(Response::new()
                .add_attribute("action", "register")
                .add_attribute("did", did)
                .add_attribute("admin", info.sender))
        },
        ExecuteMsg::RotateAdmin { new_admins } => {
            execute_rotate_admin(deps, env, info, new_admins)
        },
        ExecuteMsg::ApproveRotation {} => {
            execute_approve_rotation(deps, info)
        },
        ExecuteMsg::ExecuteAdminRotation {} => {
            execute_admin_rotation(deps, env, info)
        }
    }
}

pub fn execute_rotate_admin(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    new_admin_strs: Vec<String>,
) -> Result<Response, ContractError> {
    // Check current admin access
    let admins = ADMIN.load(deps.storage)?;
    if !admins.contains(&info.sender) {
        return Err(ContractError::Unauthorized {});
    }
    
    // Validate new admin addresses
    if new_admin_strs.is_empty() || new_admin_strs.len() < 2 {
        return Err(ContractError::Std(StdError::generic_err("Multi-sig requires at least 2 admins")));
    }
    
    let mut admin_set: HashSet<Addr> = HashSet::new();
    for addr_str in new_admin_strs {
        let addr = deps.api.addr_validate(&addr_str)?;
        if !admin_set.insert(addr.clone()) {
            return Err(ContractError::Std(StdError::generic_err("Duplicate admins")));
        }
    }

    let new_admins: Vec<Addr> = admin_set.into_iter().collect();
    
    // Set 7-day timelock
    let unlock_time = env.block.time.plus_seconds(7 * 24 * 60 * 60); // 7 days
    let threshold = THRESHOLD.load(deps.storage)?;
    
    let proposal = Proposal {
        new_admins: new_admins.clone(),
        unlock_time,
        proposer: info.sender.clone(),
        approvals: vec![info.sender.clone()], // Proposer auto-approves
        threshold,
    };
    
    ADMIN_PROPOSAL.save(deps.storage, &proposal)?;
    
    Ok(Response::new()
        .add_attribute("action", "propose_admin_rotation")
        .add_attribute("proposer", info.sender)
        .add_attribute("unlock_time", unlock_time.seconds().to_string())
        .add_attribute("new_admin_count", new_admins.len().to_string())
        .add_attribute("threshold", threshold.to_string()))
}

pub fn execute_approve_rotation(
    deps: DepsMut,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let admins = ADMIN.load(deps.storage)?;
    if !admins.contains(&info.sender) {
        return Err(ContractError::Unauthorized {});
    }

    let mut proposal = ADMIN_PROPOSAL.may_load(deps.storage)?
        .ok_or(ContractError::Std(StdError::generic_err("No pending admin rotation")))?;

    if proposal.approvals.contains(&info.sender) {
        return Err(ContractError::AlreadyApproved {});
    }

    proposal.approvals.push(info.sender.clone());
    ADMIN_PROPOSAL.save(deps.storage, &proposal)?;

    Ok(Response::new()
        .add_attribute("action", "approve_admin_rotation")
        .add_attribute("approver", info.sender)
        .add_attribute("approval_count", proposal.approvals.len().to_string()))
}

pub fn execute_admin_rotation(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    // Check current admin access
    let admins = ADMIN.load(deps.storage)?;
    if !admins.contains(&info.sender) {
        return Err(ContractError::Unauthorized {});
    }

    // Check if rotation is pending
    let proposal = ADMIN_PROPOSAL.may_load(deps.storage)?
        .ok_or(ContractError::Std(StdError::generic_err("No pending admin rotation")))?;
    
    // Check if timelock has passed
    if env.block.time < proposal.unlock_time {
        return Err(ContractError::Std(StdError::generic_err("Timelock not yet expired")));
    }
    
    // Check sufficient approvals
    if proposal.approvals.len() < proposal.threshold as usize {
        return Err(ContractError::InsufficientApprovals {});
    }
    
    // Execute rotation
    ADMIN.save(deps.storage, &proposal.new_admins)?;
    ADMIN_PROPOSAL.remove(deps.storage);
    
    Ok(Response::new()
        .add_attribute("action", "execute_admin_rotation")
        .add_attribute("executor", info.sender)
        .add_attribute("new_admin_count", proposal.new_admins.len().to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Resolve { did } => {
            let key = DID.may_load(deps.storage, &did)?
                .ok_or(ContractError::DIDNotFound {})?;
            to_json_binary(&key)
        },
        QueryMsg::GetAdmins {} => {
            let admins = ADMIN.load(deps.storage)?;
            to_json_binary(&admins)
        },
        QueryMsg::GetPendingRotation {} => {
            let proposal = ADMIN_PROPOSAL.may_load(deps.storage)?;
            to_json_binary(&proposal)
        }
    }
}