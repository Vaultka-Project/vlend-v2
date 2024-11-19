use anchor_lang::prelude::*;


pub const USER_ACCOUNT_SEED: &str = "user_account";

cfg_if::cfg_if! {
    // Note: not deployed to devnet, deploy if needed...
    if #[cfg(feature = "devnet")] {
        pub const KAMINO_ID: Pubkey = pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
    } else if #[cfg(any(feature = "mainnet-beta", feature = "staging"))] {
        pub const KAMINO_ID: Pubkey = pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
    } else {
        // The key of the kamino program on localnet (see its declared id)
        pub const KAMINO_ID: Pubkey = pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
    }
}

pub const LUT_PROGRAM_ID: Pubkey = pubkey!("AddressLookupTab1e1111111111111111111111111");
