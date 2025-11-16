#[cfg(test)]
mod tests {
    use crate::helpers::ReputationContract;
    use crate::msg::{ExecuteMsg, InstantiateMsg};
    use cosmwasm_std::{Addr, Binary, Empty};
    use cw_multi_test::{App, AppBuilder, Contract, ContractWrapper, Executor};

    pub fn contract_template() -> Box<dyn Contract<Empty>> {
        let contract = ContractWrapper::new(
            crate::contract::execute,
            crate::contract::instantiate,
            crate::contract::query,
        );
        Box::new(contract)
    }

    const ADMIN: &str = "ADMIN";

    fn mock_app() -> App {
        AppBuilder::new().build(|_router, _, _storage| {})
    }

    fn proper_instantiate() -> (App, ReputationContract) {
        let mut app = mock_app();
        let reputation_id = app.store_code(contract_template());

        let msg = InstantiateMsg {};
        let reputation_contract_addr = app
            .instantiate_contract(
                reputation_id,
                Addr::unchecked(ADMIN),
                &msg,
                &[],
                "reputation",
                None,
            )
            .unwrap();

        let reputation_contract = ReputationContract(reputation_contract_addr);

        (app, reputation_contract)
    }

    mod update {
        use super::*;

        #[test]
        fn test_update_invalid_score() {
            let (mut app, reputation_contract) = proper_instantiate();

            // Invalid score > 100
            let msg = ExecuteMsg::Update {
                score: 101,
                dilithium_pk: Binary::from(vec![0u8; 2592]),
                dilithium_sig: Binary::from(vec![0u8; 4595]),
            };
            let cosmos_msg = reputation_contract.call(msg).unwrap();
            let result = app.execute(Addr::unchecked(ADMIN), cosmos_msg);
            assert!(result.is_err());
        }

        #[test]
        fn test_update_wrong_pubkey_length() {
            let (mut app, reputation_contract) = proper_instantiate();

            // Wrong pubkey length
            let msg = ExecuteMsg::Update {
                score: 50,
                dilithium_pk: Binary::from(vec![0u8; 100]),
                dilithium_sig: Binary::from(vec![0u8; 4595]),
            };
            let cosmos_msg = reputation_contract.call(msg).unwrap();
            let result = app.execute(Addr::unchecked(ADMIN), cosmos_msg);
            assert!(result.is_err());
        }
    }
}
