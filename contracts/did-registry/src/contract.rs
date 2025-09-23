use cosmwasm_std::*;
use serde::{Deserialize, Serialize};
use cw_storage_plus::Map;

use crate::state::ADMIN;
use crate::error::ContractError;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct InstantiateMsg {}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Register { did: String, pub_key: Vec<u8> },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    Resolve { did: String },
}

pub const DID: Map<&str, Vec<u8>> = Map::new("did");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(deps: DepsMut, _env: Env, info: MessageInfo, _msg: InstantiateMsg) -> StdResult<Response> {
    // Save the contract deployer as admin
    ADMIN.save(deps.storage, &info.sender)?;
    Ok(Response::new().add_attribute("action", "instantiate").add_attribute("admin", info.sender))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(deps: DepsMut, _env: Env, info: MessageInfo, msg: ExecuteMsg) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Register { did, pub_key } => {
            // Check admin access
            let admin = ADMIN.load(deps.storage)?;
            if info.sender != admin {
                return Err(ContractError::Unauthorized {});
            }
            
            deps.api.addr_validate(info.sender.as_str())?;
            DID.save(deps.storage, &did, &pub_key)?;
            Ok(Response::new().add_attribute("action", "register").add_attribute("did", did))
        }
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Resolve { did } => to_json_binary(&DID.load(deps.storage, &did)?),
    }
}