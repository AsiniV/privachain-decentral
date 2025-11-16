#[cfg(test)]
mod tests {
    use crate::helpers::PqVerifierContract;
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

    fn proper_instantiate() -> (App, PqVerifierContract) {
        let mut app = mock_app();
        let pq_verifier_id = app.store_code(contract_template());

        let msg = InstantiateMsg {};
        let pq_verifier_contract_addr = app
            .instantiate_contract(
                pq_verifier_id,
                Addr::unchecked(ADMIN),
                &msg,
                &[],
                "pq-verifier",
                None,
            )
            .unwrap();

        let pq_verifier_contract = PqVerifierContract(pq_verifier_contract_addr);

        (app, pq_verifier_contract)
    }

    mod verify {
        use super::*;

        #[test]
        fn test_verify_wrong_pubkey_length() {
            let (mut app, pq_verifier_contract) = proper_instantiate();

            // Wrong pubkey length
            let msg = ExecuteMsg::Verify {
                pubkey: Binary::from(vec![0u8; 100]),
                signature: Binary::from(vec![0u8; 4595]),
                message_hash: Binary::from(vec![0u8; 32]),
            };
            let cosmos_msg = pq_verifier_contract.call(msg).unwrap();
            let result = app.execute(Addr::unchecked(ADMIN), cosmos_msg);
            assert!(result.is_err());
        }

        #[test]
        fn test_verify_wrong_hash_length() {
            let (mut app, pq_verifier_contract) = proper_instantiate();

            // Wrong hash length
            let msg = ExecuteMsg::Verify {
                pubkey: Binary::from(vec![0u8; 2592]),
                signature: Binary::from(vec![0u8; 4595]),
                message_hash: Binary::from(vec![0u8; 16]),
            };
            let cosmos_msg = pq_verifier_contract.call(msg).unwrap();
            let result = app.execute(Addr::unchecked(ADMIN), cosmos_msg);
            assert!(result.is_err());
        }
    }
}
