#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_json_binary, BankMsg, Binary, Coin, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    Uint128,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{BalanceResponse, ConfigResponse, ExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::{Config, CONFIG, REQUEST_COUNT};

const CONTRACT_NAME: &str = "crates.io:gas-sponsor";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");
const SECONDS_PER_DAY: u64 = 86400;

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let config = Config {
        owner: info.sender,
        grant_amount: msg.grant_amount,
        max_requests_per_day: msg.max_requests_per_day,
    };
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("grant_amount", msg.grant_amount)
        .add_attribute("max_requests_per_day", msg.max_requests_per_day.to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::FundPool {} => execute_fund_pool(info),
        ExecuteMsg::RequestFeeGrant {} => execute_request_fee_grant(deps, env, info),
        ExecuteMsg::UpdateConfig {
            grant_amount,
            max_requests_per_day,
        } => execute_update_config(deps, info, grant_amount, max_requests_per_day),
    }
}

fn execute_fund_pool(info: MessageInfo) -> Result<Response, ContractError> {
    if info.funds.is_empty() {
        return Err(ContractError::Std(cosmwasm_std::StdError::generic_err(
            "No funds sent",
        )));
    }

    Ok(Response::new()
        .add_attribute("action", "fund_pool")
        .add_attribute("funder", info.sender)
        .add_attribute("amount", info.funds[0].amount))
}

fn execute_request_fee_grant(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Calculate current day (timestamp divided by seconds per day)
    let current_day = env.block.time.seconds() / SECONDS_PER_DAY;

    // Get current request count for today
    let count = REQUEST_COUNT
        .may_load(deps.storage, (&info.sender, current_day))?
        .unwrap_or(0);

    // Check rate limit
    if count >= config.max_requests_per_day {
        return Err(ContractError::RateLimitExceeded {
            max: config.max_requests_per_day,
        });
    }

    // Check pool balance
    let contract_balance = deps
        .querier
        .query_balance(&env.contract.address, "uatom")?;

    if contract_balance.amount < config.grant_amount {
        return Err(ContractError::InsufficientBalance);
    }

    // Update request count
    REQUEST_COUNT.save(deps.storage, (&info.sender, current_day), &(count + 1))?;

    // Send grant
    let send_msg = BankMsg::Send {
        to_address: info.sender.to_string(),
        amount: vec![Coin {
            denom: "uatom".to_string(),
            amount: config.grant_amount,
        }],
    };

    Ok(Response::new()
        .add_message(send_msg)
        .add_attribute("action", "request_fee_grant")
        .add_attribute("recipient", info.sender)
        .add_attribute("amount", config.grant_amount))
}

fn execute_update_config(
    deps: DepsMut,
    info: MessageInfo,
    grant_amount: Option<Uint128>,
    max_requests_per_day: Option<u32>,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized);
    }

    if let Some(amount) = grant_amount {
        config.grant_amount = amount;
    }
    if let Some(max) = max_requests_per_day {
        config.max_requests_per_day = max;
    }

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new().add_attribute("action", "update_config"))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::Balance {} => to_json_binary(&query_balance(deps, env)?),
    }
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        owner: config.owner.to_string(),
        grant_amount: config.grant_amount,
        max_requests_per_day: config.max_requests_per_day,
    })
}

fn query_balance(deps: Deps, env: Env) -> StdResult<BalanceResponse> {
    let balance = deps
        .querier
        .query_balance(&env.contract.address, "uatom")?;
    Ok(BalanceResponse {
        balance: balance.amount,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, Addr};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
        };
        let info = mock_info("creator", &[]);

        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // Query config
        let res = query_config(deps.as_ref()).unwrap();
        assert_eq!(res.grant_amount, Uint128::new(1000));
        assert_eq!(res.max_requests_per_day, 5);
    }

    #[test]
    fn test_fund_pool() {
        let mut deps = mock_dependencies();

        // Instantiate first
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Fund pool
        let info = mock_info("funder", &coins(10000, "uatom"));
        let res = execute_fund_pool(info).unwrap();
        assert_eq!(res.messages.len(), 0);
    }

    #[test]
    fn test_unauthorized_update() {
        let mut deps = mock_dependencies();

        // Instantiate
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Try to update as non-owner
        let info = mock_info("hacker", &[]);
        let res = execute_update_config(deps.as_mut(), info, Some(Uint128::new(2000)), None);
        assert!(matches!(res, Err(ContractError::Unauthorized)));
    }
}
