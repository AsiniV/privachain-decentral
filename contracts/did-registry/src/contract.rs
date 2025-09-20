use cosmwasm_std::*;
use serde::{Deserialize, Serialize};

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

use cw_storage_plus::{Map, Item};

pub const DID: Map<&str, Vec<u8>> = Map::new("did");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(_deps: DepsMut, _env: Env, _info: MessageInfo, _msg: InstantiateMsg) -> StdResult<Response> {
    Ok(Response::new())
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(deps: DepsMut, _env: Env, info: MessageInfo, msg: ExecuteMsg) -> StdResult<Response> {
    match msg {
        ExecuteMsg::Register { did, pub_key } => {
            deps.api.addr_validate(&info.sender)?;
            DID.save(deps.storage, &did, &pub_key)?;
            Ok(Response::new().add_attribute("action", "register"))
        }
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Resolve { did } => to_json_binary(&DID.load(deps.storage, &did)?),
    }
}