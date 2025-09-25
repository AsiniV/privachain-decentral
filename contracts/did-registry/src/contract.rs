use cosmwasm_std::*;
use serde::{Deserialize, Serialize};
use cw_storage_plus::Map;

use crate::state::{ADMIN, ADMIN_ROTATION, AdminRotation};
use crate::error::ContractError;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct InstantiateMsg {
    pub admins: Vec<String>, // Multi-sig admin addresses
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Register { did: String, pub_key: Vec<u8> },
    RotateAdmin { new_admins: Vec<String> },
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

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(deps: DepsMut, _env: Env, info: MessageInfo, msg: InstantiateMsg) -> StdResult<Response> {
    // Validate admin addresses and create multi-sig admin
    if msg.admins.is_empty() || msg.admins.len() < 2 {
        return Err(StdError::generic_err("Multi-sig requires at least 2 admins"));
    }
    
    let admin_addrs: Result<Vec<Addr>, StdError> = msg.admins
        .into_iter()
        .map(|addr| deps.api.addr_validate(&addr))
        .collect();
    
    let admin_addrs = admin_addrs?;
    
    // Save multi-sig admin list
    ADMIN.save(deps.storage, &admin_addrs)?;
    
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin_count", admin_addrs.len().to_string())
        .add_attribute("deployer", info.sender))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(deps: DepsMut, env: Env, info: MessageInfo, msg: ExecuteMsg) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Register { did, pub_key } => {
            // Check multi-sig admin access (requires any admin)
            let admins = ADMIN.load(deps.storage)?;
            if !admins.contains(&info.sender) {
                return Err(ContractError::Unauthorized {});
            }
            
            deps.api.addr_validate(info.sender.as_str())?;
            DID.save(deps.storage, &did, &pub_key)?;
            Ok(Response::new()
                .add_attribute("action", "register")
                .add_attribute("did", did)
                .add_attribute("admin", info.sender))
        },
        ExecuteMsg::RotateAdmin { new_admins } => {
            execute_rotate_admin(deps, env, info, new_admins)
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
    
    let new_admins: Result<Vec<Addr>, StdError> = new_admin_strs
        .into_iter()
        .map(|addr| deps.api.addr_validate(&addr))
        .collect();
    
    let new_admins = new_admins?;
    
    // Set 7-day timelock
    let unlock_time = env.block.time.plus_seconds(7 * 24 * 60 * 60); // 7 days
    
    let rotation = AdminRotation {
        new_admins: new_admins.clone(),
        unlock_time: unlock_time.into(),
        proposer: info.sender.clone(),
    };
    
    ADMIN_ROTATION.save(deps.storage, &rotation)?;
    
    Ok(Response::new()
        .add_attribute("action", "rotate_admin_timelock")
        .add_attribute("proposer", info.sender)
        .add_attribute("unlock_time", unlock_time.seconds().to_string())
        .add_attribute("new_admin_count", new_admins.len().to_string()))
}

pub fn execute_admin_rotation(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    // Check if rotation is pending
    let rotation = ADMIN_ROTATION.may_load(deps.storage)?
        .ok_or(ContractError::Std(StdError::generic_err("No pending admin rotation")))?;
    
    // Check if timelock has passed
    if env.block.time < rotation.unlock_time.into() {
        return Err(ContractError::Std(StdError::generic_err("Timelock not yet expired")));
    }
    
    // Check current admin access
    let admins = ADMIN.load(deps.storage)?;
    if !admins.contains(&info.sender) {
        return Err(ContractError::Unauthorized {});
    }
    
    // Execute rotation
    ADMIN.save(deps.storage, &rotation.new_admins)?;
    ADMIN_ROTATION.remove(deps.storage);
    
    Ok(Response::new()
        .add_attribute("action", "execute_admin_rotation")
        .add_attribute("executor", info.sender)
        .add_attribute("new_admin_count", rotation.new_admins.len().to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Resolve { did } => to_json_binary(&DID.load(deps.storage, &did)?),
        QueryMsg::GetAdmins {} => {
            let admins = ADMIN.load(deps.storage)?;
            to_json_binary(&admins)
        },
        QueryMsg::GetPendingRotation {} => {
            let rotation = ADMIN_ROTATION.may_load(deps.storage)?;
            to_json_binary(&rotation)
        }
    }
}