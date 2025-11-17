use cw_storage_plus::Item;

/// Storage for the dynamic code ID
pub const CODE_ID: Item<u64> = Item::new("code_id");
