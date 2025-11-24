#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    attr, coins, to_json_binary, BankMsg, Binary, Deps, DepsMut, Empty, Env, MessageInfo,
    Response, StdResult, Uint128,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{BalanceResponse, ConfigResponse, ExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::{Config, CONFIG, DAILY_COUNT};

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

    // --- validation --------------------------
    if msg.grant_amount.is_zero() {
        return Err(ContractError::InvalidAmount);
    }
    if msg.max_requests_per_day == 0 {
        return Err(ContractError::InvalidAmount);
    }

    let config = Config {
        owner: info.sender.clone(),
        grant_amount: msg.grant_amount,
        denom: msg.denom.clone(),
        max_requests_per_day: msg.max_requests_per_day,
    };
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("owner", config.owner)
        .add_attribute("denom", msg.denom)
        .add_attribute("grant_amount", msg.grant_amount)
        .add_attribute("max_per_day", msg.max_requests_per_day.to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::FundPool {} => execute_fund_pool(deps, info),
        ExecuteMsg::RequestFeeGrant {} => execute_request_fee_grant(deps, env, info),
        ExecuteMsg::UpdateConfig {
            grant_amount,
            max_requests_per_day,
        } => execute_update_config(deps, info, grant_amount, max_requests_per_day),
        ExecuteMsg::Withdraw { amount } => execute_withdraw(deps, env, info, amount),
    }
}

fn execute_fund_pool(deps: DepsMut, info: MessageInfo) -> Result<Response, ContractError> {
    if info.funds.is_empty() {
        return Err(ContractError::NoFunds);
    }
    let cfg = CONFIG.load(deps.storage)?;

    let mut attrs = vec![attr("action", "fund_pool"), attr("funder", info.sender)];

    // accept ONLY config.denom
    for coin in &info.funds {
        if coin.denom != cfg.denom {
            return Err(ContractError::UnsupportedDenom {
                expected: cfg.denom.clone(),
                got: coin.denom.clone(),
            });
        }
        attrs.push(attr("amount", coin.amount));
    }
    // total transferred
    let total: Uint128 = info.funds.iter().map(|c| c.amount).sum();
    attrs.push(attr("total", total));

    Ok(Response::new().add_attributes(attrs))
}

fn execute_request_fee_grant(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let cfg = CONFIG.load(deps.storage)?;
    let user = info.sender;

    // --- 1. daily window -----------------------------------
    let day = env.block.time.seconds() / SECONDS_PER_DAY;
    let used = DAILY_COUNT
        .may_load(deps.storage, (&user, day))?
        .unwrap_or(0);
    if used >= cfg.max_requests_per_day {
        return Err(ContractError::DailyLimitExceeded {
            max: cfg.max_requests_per_day,
            used,
        });
    }

    // --- 2. pool balance check (config.denom) --------------
    let balance = deps
        .querier
        .query_balance(env.contract.address, cfg.denom.clone())?
        .amount;
    if balance < cfg.grant_amount {
        return Err(ContractError::InsufficientPool {
            need: cfg.grant_amount,
            have: balance,
        });
    }

    // --- 3. send grant -------------------------------------
    let grant = BankMsg::Send {
        to_address: user.to_string(),
        amount: coins(cfg.grant_amount.u128(), cfg.denom.clone()),
    };

    // --- 4. update counter ---------------------------------
    DAILY_COUNT.save(deps.storage, (&user, day), &(used + 1))?;

    Ok(Response::new()
        .add_message(grant)
        .add_attribute("action", "request_fee_grant")
        .add_attribute("recipient", user)
        .add_attribute("amount", cfg.grant_amount)
        .add_attribute("denom", cfg.denom))
}

fn execute_update_config(
    deps: DepsMut,
    info: MessageInfo,
    grant_amount: Option<Uint128>,
    max_requests_per_day: Option<u32>,
) -> Result<Response, ContractError> {
    let mut cfg = CONFIG.load(deps.storage)?;

    if info.sender != cfg.owner {
        return Err(ContractError::Unauthorized);
    }

    if let Some(a) = grant_amount {
        if a.is_zero() {
            return Err(ContractError::InvalidAmount);
        }
        cfg.grant_amount = a;
    }
    if let Some(m) = max_requests_per_day {
        if m == 0 {
            return Err(ContractError::InvalidAmount);
        }
        cfg.max_requests_per_day = m;
    }

    CONFIG.save(deps.storage, &cfg)?;

    Ok(Response::new()
        .add_attribute("action", "update_config")
        .add_attribute("owner", cfg.owner)
        .add_attribute("grant_amount", cfg.grant_amount)
        .add_attribute("max_per_day", cfg.max_requests_per_day.to_string())
        .add_attribute("denom", cfg.denom))
}

fn execute_withdraw(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let cfg = CONFIG.load(deps.storage)?;
    if info.sender != cfg.owner {
        return Err(ContractError::Unauthorized);
    }
    if amount.is_zero() {
        return Err(ContractError::InvalidAmount);
    }

    let balance = deps
        .querier
        .query_balance(env.contract.address, cfg.denom.clone())?
        .amount;
    if balance < amount {
        return Err(ContractError::InsufficientPool {
            need: amount,
            have: balance,
        });
    }

    let withdraw_msg = BankMsg::Send {
        to_address: cfg.owner.to_string(),
        amount: coins(amount.u128(), cfg.denom.clone()),
    };

    Ok(Response::new()
        .add_message(withdraw_msg)
        .add_attribute("action", "withdraw")
        .add_attribute("owner", cfg.owner)
        .add_attribute("amount", amount))
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
        denom: config.denom,
    })
}

fn query_balance(deps: Deps, env: Env) -> StdResult<BalanceResponse> {
    let config = CONFIG.load(deps.storage)?;
    let balance = deps
        .querier
        .query_balance(&env.contract.address, config.denom.clone())?;
    Ok(BalanceResponse {
        balance: balance.amount,
        denom: config.denom,
    })
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(deps: DepsMut, _env: Env, _msg: Empty) -> Result<Response, ContractError> {
    // v0.1.0 → v0.2.0
    // Note: In production, you would want to handle version mismatch more gracefully
    let version = cw2::get_contract_version(deps.storage)?;
    if version.contract != CONTRACT_NAME {
        return Err(ContractError::Std(cosmwasm_std::StdError::generic_err(
            format!("Cannot migrate from {}", version.contract),
        )));
    }
    
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, "0.2.0")?;
    Ok(Response::new().add_attribute("action", "migrate"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::coins;

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
            denom: "uosmo".to_string(),
        };
        let info = mock_info("creator", &[]);

        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // Query config
        let res = query_config(deps.as_ref()).unwrap();
        assert_eq!(res.grant_amount, Uint128::new(1000));
        assert_eq!(res.max_requests_per_day, 5);
        assert_eq!(res.denom, "uosmo");
    }

    #[test]
    fn test_zero_amount_rejected() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg {
            grant_amount: Uint128::zero(),
            max_requests_per_day: 5,
            denom: "uatom".to_string(),
        };
        let info = mock_info("creator", &[]);

        let err = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        assert!(matches!(err, ContractError::InvalidAmount));
    }

    #[test]
    fn test_zero_max_requests_rejected() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 0,
            denom: "uatom".to_string(),
        };
        let info = mock_info("creator", &[]);

        let err = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        assert!(matches!(err, ContractError::InvalidAmount));
    }

    #[test]
    fn test_fund_pool() {
        let mut deps = mock_dependencies();

        // Instantiate first
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
            denom: "uatom".to_string(),
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Fund pool with correct denom
        let info = mock_info("funder", &coins(10000, "uatom"));
        let res = execute_fund_pool(deps.as_mut(), info).unwrap();
        assert_eq!(res.messages.len(), 0);
    }

    #[test]
    fn test_fund_pool_wrong_denom() {
        let mut deps = mock_dependencies();

        // Instantiate with uatom
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
            denom: "uatom".to_string(),
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Try to fund with wrong denom
        let info = mock_info("funder", &coins(10000, "uosmo"));
        let err = execute_fund_pool(deps.as_mut(), info).unwrap_err();
        assert!(matches!(
            err,
            ContractError::UnsupportedDenom { .. }
        ));
    }

    #[test]
    fn test_unauthorized_update() {
        let mut deps = mock_dependencies();

        // Instantiate
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
            denom: "uatom".to_string(),
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Try to update as non-owner
        let info = mock_info("hacker", &[]);
        let res = execute_update_config(deps.as_mut(), info, Some(Uint128::new(2000)), None);
        assert!(matches!(res, Err(ContractError::Unauthorized)));
    }

    #[test]
    fn test_update_config_zero_amount_rejected() {
        let mut deps = mock_dependencies();

        // Instantiate
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
            denom: "uatom".to_string(),
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info.clone(), msg).unwrap();

        // Try to update with zero amount
        let err = execute_update_config(deps.as_mut(), info, Some(Uint128::zero()), None)
            .unwrap_err();
        assert!(matches!(err, ContractError::InvalidAmount));
    }

    #[test]
    fn test_withdraw_unauthorized() {
        let mut deps = mock_dependencies();

        // Instantiate
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
            denom: "ujuno".to_string(),
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Try to withdraw as non-owner
        let info = mock_info("hacker", &[]);
        let err = execute_withdraw(
            deps.as_mut(),
            mock_env(),
            info,
            Uint128::new(500),
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized));
    }

    #[test]
    fn test_withdraw_zero_amount() {
        let mut deps = mock_dependencies();

        // Instantiate
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
            denom: "ujuno".to_string(),
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info.clone(), msg).unwrap();

        // Try to withdraw zero amount
        let err = execute_withdraw(deps.as_mut(), mock_env(), info, Uint128::zero())
            .unwrap_err();
        assert!(matches!(err, ContractError::InvalidAmount));
    }

    #[test]
    fn test_query_balance_includes_denom() {
        let mut deps = mock_dependencies();

        // Instantiate with uosmo
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(1000),
            max_requests_per_day: 5,
            denom: "uosmo".to_string(),
        };
        let info = mock_info("creator", &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Query balance
        let res = query_balance(deps.as_ref(), mock_env()).unwrap();
        assert_eq!(res.denom, "uosmo");
    }

    #[test]
    fn test_multiple_denoms_supported() {
        let mut deps = mock_dependencies();

        // Instantiate with ujuno
        let msg = InstantiateMsg {
            grant_amount: Uint128::new(50_000),
            max_requests_per_day: 10,
            denom: "ujuno".to_string(),
        };
        let info = mock_info("creator", &[]);
        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        
        // Verify attributes include denom
        let denom_attr = res.attributes.iter().find(|a| a.key == "denom").unwrap();
        assert_eq!(denom_attr.value, "ujuno");

        // Query config
        let cfg = query_config(deps.as_ref()).unwrap();
        assert_eq!(cfg.denom, "ujuno");
    }
}
