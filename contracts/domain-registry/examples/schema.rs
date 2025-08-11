use cosmwasm_schema::write_api;

use privachain_domain_registry::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, MigrateMsg};

fn main() {
    write_api! {
        instantiate: InstantiateMsg,
        execute: ExecuteMsg,
        query: QueryMsg,
        migrate: MigrateMsg,
    }
}