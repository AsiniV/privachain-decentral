#[cfg(test)]
mod tests {
    use super::*;
    use crate::{execute, query, instantiate, ExecuteMsg, QueryMsg, InstantiateMsg, error::ContractError};
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::from_json;

    #[test]
    fn test_did_registration() {
        let mut deps = mock_dependencies();
        
        // First instantiate to set up admin
        let admin_info = mock_info("admin", &[]);
        let instantiate_msg = InstantiateMsg { 
            admins: vec!["admin".to_string(), "admin2".to_string()] // Multi-sig requirement
        };
        instantiate(deps.as_mut(), mock_env(), admin_info.clone(), instantiate_msg).unwrap();
        
        // Admin can register DIDs
        let msg = ExecuteMsg::Register {
            did: "did:priva:alice".to_string(),
            pub_key: vec![1, 2, 3, 4],
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
            admins: vec!["admin".to_string(), "admin2".to_string()] // Multi-sig requirement
        };
        instantiate(deps.as_mut(), mock_env(), admin_info, instantiate_msg).unwrap();
        
        // Non-admin cannot register DIDs
        let non_admin_info = mock_info("user", &[]);
        let msg = ExecuteMsg::Register {
            did: "did:priva:alice".to_string(),
            pub_key: vec![1, 2, 3, 4],
        };
        let err = execute(deps.as_mut(), mock_env(), non_admin_info, msg).unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    #[test]
    fn test_did_resolve() {
        let mut deps = mock_dependencies();
        
        // First instantiate to set up admin
        let admin_info = mock_info("admin", &[]);
        let instantiate_msg = InstantiateMsg { 
            admins: vec!["admin".to_string(), "admin2".to_string()] // Multi-sig requirement
        };
        instantiate(deps.as_mut(), mock_env(), admin_info.clone(), instantiate_msg).unwrap();
        
        // Register a DID
        let did = "did:priva:alice".to_string();
        let pub_key = vec![1, 2, 3, 4];
        let msg = ExecuteMsg::Register {
            did: did.clone(),
            pub_key: pub_key.clone(),
        };
        execute(deps.as_mut(), mock_env(), admin_info, msg).unwrap();

        // Now resolve it
        let query_msg = QueryMsg::Resolve { did: did.clone() };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let resolved_key: Vec<u8> = from_json(&res).unwrap();
        assert_eq!(resolved_key, pub_key);
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let info = mock_info("creator", &[]);
        let msg = InstantiateMsg { 
            admins: vec!["creator".to_string(), "admin2".to_string()] // Multi-sig requirement
        };
        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert!(res.attributes.iter().any(|attr| attr.key == "action" && attr.value == "instantiate"));
        assert!(res.attributes.iter().any(|attr| attr.key == "admin_count"));
    }
}