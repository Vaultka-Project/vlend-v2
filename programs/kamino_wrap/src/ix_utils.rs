use anchor_lang::{prelude::Pubkey, AnchorDeserialize, AnchorSerialize};

/// Structs that implement this trait have a `get_hash` tool that returns the function discriminator
pub trait Hashable {
    fn get_hash() -> [u8; 8];
}

/// The function discrminator is constructed from these 8 bytes. Typically, the namespace is
/// "global" or "state"
pub fn get_function_hash(namespace: &str, name: &str) -> [u8; 8] {
    let preimage = format!("{}:{}", namespace, name);
    let mut sighash = [0u8; 8];
    sighash.copy_from_slice(
        &anchor_lang::solana_program::hash::hash(preimage.as_bytes()).to_bytes()[..8],
    );
    sighash
}

/// Args for the reduce_flight_fees CPI in the CLP Vault program
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitMetaDataArgs {
    user_lookup_table_key: Pubkey,
}

/// Ix data for init_user_metadata
pub fn init_metadata_ix_data(user_lookup_table_key: Pubkey) -> Vec<u8> {
    let hash = get_function_hash("global", "init_user_metadata");
    // Bytes: [117, 169, 176, 69, 197, 23, 15, 162]
    // Hex: 75a9b045c5170fa2
    let mut buf: Vec<u8> = vec![];
    buf.extend_from_slice(&hash);
    let args = InitMetaDataArgs {
        user_lookup_table_key,
    };
    args.serialize(&mut buf).unwrap();
    buf
}
