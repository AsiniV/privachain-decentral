#[cfg(test)]
mod tests {
    use crate::{execute, query, instantiate, ExecuteMsg, QueryMsg, InstantiateMsg, error::ContractError};
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{from_json, Env, Timestamp, Binary};

    fn mock_env_with_time(time: Timestamp) -> Env {
        let mut env = mock_env();
        env.block.time = time;
        env
    }

    #[test]
    fn test_did_registration() {
        let mut deps = mock_dependencies();
        
        // First instantiate to set up admin
        let admin_info = mock_info("admin", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin_info.clone(), instantiate_msg).unwrap();
        
        // Admin can register DIDs
        let msg = ExecuteMsg::Register {
            did: "did:priva:alice".to_string(),
            pub_key: vec![1, 2, 3, 4],
            proof_data: None,
            public_inputs: vec![],
        };
        let res = execute(deps.as_mut(), mock_env(), admin_info, msg).unwrap();
        assert!(res.attributes.iter().any(|attr| attr.key == "action"));
        assert!(res.attributes.iter().any(|attr| attr.key == "did"));
    }

    #[test]
    fn test_unauthorized_registration() {
        let mut deps = mock_dependencies();
        
        // First instantiate to set up admin
        let admin_info = mock_info("admin", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin_info, instantiate_msg).unwrap();
        
        // Non-admin cannot register DIDs
        let non_admin_info = mock_info("user", &[]);
        let msg = ExecuteMsg::Register {
            did: "did:priva:alice".to_string(),
            pub_key: vec![1, 2, 3, 4],
            proof_data: None,
            public_inputs: vec![],
        };
        let err = execute(deps.as_mut(), mock_env(), non_admin_info, msg).unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    #[test]
    fn test_did_already_exists() {
        let mut deps = mock_dependencies();
        
        // Instantiate
        let admin_info = mock_info("admin", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin_info.clone(), instantiate_msg).unwrap();
        
        // Register first time
        let did = "did:priva:alice".to_string();
        let pub_key = vec![1, 2, 3, 4];
        let msg = ExecuteMsg::Register { 
            did: did.clone(), 
            pub_key: pub_key.clone(), 
            proof_data: None, 
            public_inputs: vec![] 
        };
        execute(deps.as_mut(), mock_env(), admin_info.clone(), msg).unwrap();
        
        // Try to register again
        let msg2 = ExecuteMsg::Register { 
            did: did.clone(), 
            pub_key: vec![5, 6, 7, 8], 
            proof_data: None, 
            public_inputs: vec![] 
        };
        let err = execute(deps.as_mut(), mock_env(), admin_info, msg2).unwrap_err();
        assert!(matches!(err, ContractError::DIDAlreadyExists {}));
    }

    #[test]
    fn test_did_resolve() {
        let mut deps = mock_dependencies();
        
        // First instantiate to set up admin
        let admin_info = mock_info("admin", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin_info.clone(), instantiate_msg).unwrap();
        
        // Register a DID
        let did = "did:priva:alice".to_string();
        let pub_key = vec![1, 2, 3, 4];
        let msg = ExecuteMsg::Register {
            did: did.clone(),
            pub_key: pub_key.clone(),
            proof_data: None,
            public_inputs: vec![],
        };
        execute(deps.as_mut(), mock_env(), admin_info, msg).unwrap();

        // Now resolve it
        let query_msg = QueryMsg::Resolve { did: did.clone() };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let resolved_key: Vec<u8> = from_json(&res).unwrap();
        assert_eq!(resolved_key, pub_key);
    }

    #[test]
    fn test_did_not_found() {
        let mut deps = mock_dependencies();
        
        // Instantiate
        let admin_info = mock_info("admin", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin_info, instantiate_msg).unwrap();
        
        // Query non-existing DID
        let query_msg = QueryMsg::Resolve { did: "did:priva:nonexistent".to_string() };
        let err = query(deps.as_ref(), mock_env(), query_msg).unwrap_err();
        assert_eq!(err.to_string(), "Generic error: DID not found");
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let info = mock_info("creator", &[]);
        let msg = InstantiateMsg {
            admins: vec!["creator".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert!(res.attributes.iter().any(|attr| attr.key == "action" && attr.value == "instantiate"));
        assert!(res.attributes.iter().any(|attr| attr.key == "admin_count"));
    }

    #[test]
    fn test_admin_rotation() {
        let mut deps = mock_dependencies();
        
        // Instantiate with 2 admins, threshold 2
        let admin1_info = mock_info("admin1", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin1".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin1_info.clone(), instantiate_msg).unwrap();
        
        // Admin1 proposes rotation
        let new_admins = vec!["new1".to_string(), "new2".to_string()];
        let msg = ExecuteMsg::RotateAdmin { new_admins: new_admins.clone() };
        execute(deps.as_mut(), mock_env(), admin1_info.clone(), msg).unwrap();
        
        // Admin2 approves
        let admin2_info = mock_info("admin2", &[]);
        let approve_msg = ExecuteMsg::ApproveRotation {};
        execute(deps.as_mut(), mock_env(), admin2_info.clone(), approve_msg).unwrap();
        
        // Try to execute before timelock
        let execute_msg = ExecuteMsg::ExecuteAdminRotation {};
        let err = execute(deps.as_mut(), mock_env(), admin1_info.clone(), execute_msg.clone()).unwrap_err();
        assert_eq!(err.to_string(), "Generic error: Timelock not yet expired");
        
        // Advance time by 7 days
        let unlock_time = mock_env().block.time.plus_seconds(7 * 24 * 60 * 60 + 1);
        let advanced_env = mock_env_with_time(unlock_time);
        
        // Execute rotation
        execute(deps.as_mut(), advanced_env.clone(), admin1_info, execute_msg).unwrap();
        
        // Check new admins
        let query_msg = QueryMsg::GetAdmins {};
        let res = query(deps.as_ref(), advanced_env, query_msg).unwrap();
        let admins: Vec<cosmwasm_std::Addr> = from_json(&res).unwrap();
        assert_eq!(admins.len(), 2);
        assert!(admins.iter().any(|a| a.as_str() == "new1"));
        assert!(admins.iter().any(|a| a.as_str() == "new2"));
    }

    #[test]
    fn test_insufficient_approvals() {
        let mut deps = mock_dependencies();
        
        // Instantiate
        let admin1_info = mock_info("admin1", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin1".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin1_info.clone(), instantiate_msg).unwrap();
        
        // Admin1 proposes (auto-approves)
        let new_admins = vec!["new1".to_string(), "new2".to_string()];
        let msg = ExecuteMsg::RotateAdmin { new_admins };
        execute(deps.as_mut(), mock_env(), admin1_info.clone(), msg).unwrap();
        
        // Advance time
        let unlock_time = mock_env().block.time.plus_seconds(7 * 24 * 60 * 60 + 1);
        let advanced_env = mock_env_with_time(unlock_time);
        
        // Try to execute with only 1 approval
        let execute_msg = ExecuteMsg::ExecuteAdminRotation {};
        let err = execute(deps.as_mut(), advanced_env, admin1_info, execute_msg).unwrap_err();
        assert!(matches!(err, ContractError::InsufficientApprovals {}));
    }

    #[test]
    fn test_already_approved() {
        let mut deps = mock_dependencies();
        
        // Instantiate
        let admin1_info = mock_info("admin1", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin1".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin1_info.clone(), instantiate_msg).unwrap();
        
        // Admin1 proposes
        let new_admins = vec!["new1".to_string(), "new2".to_string()];
        let msg = ExecuteMsg::RotateAdmin { new_admins };
        execute(deps.as_mut(), mock_env(), admin1_info.clone(), msg).unwrap();
        
        // Admin1 tries to approve again
        let approve_msg = ExecuteMsg::ApproveRotation {};
        let err = execute(deps.as_mut(), mock_env(), admin1_info, approve_msg).unwrap_err();
        assert!(matches!(err, ContractError::AlreadyApproved {}));
    }

    // Additional test for ZK proof verification (dummy, will fail but checks logic)
    #[test]
    fn test_registration_with_zk_proof() {
        let mut deps = mock_dependencies();
        let admin_info = mock_info("admin", &[]);
        let instantiate_msg = InstantiateMsg {
            admins: vec!["admin".to_string(), "admin2".to_string()],
            threshold: 2,
            vk: Binary::default(),
        };
        instantiate(deps.as_mut(), mock_env(), admin_info.clone(), instantiate_msg).unwrap();
        
        // Register with dummy proof (will fail verification)
        let msg = ExecuteMsg::Register {
            did: "did:priva:bob".to_string(),
            pub_key: vec![5, 6, 7],
            proof_data: Some(Binary::default()),
            public_inputs: vec![Binary::default()],
        };
        let err = execute(deps.as_mut(), mock_env(), admin_info, msg).unwrap_err();
        // Expect StdError due to invalid deserialize, but in real use InvalidProof
        assert!(err.to_string().contains("Generic error"));
    }
}