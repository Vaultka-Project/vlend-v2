use anchor_lang::prelude::*;

pub const USER_ACCOUNT_SEED: &str = "user_account";

cfg_if::cfg_if! {
    if #[cfg(feature = "devnet")] {
        pub const MRGN_ID: Pubkey = pubkey!("neetcne3Ctrrud7vLdt2ypMm21gZHGN2mCmqWaMVcBQ");
    } else if #[cfg(feature = "mainnet-beta")] {
        pub const MRGN_ID: Pubkey = pubkey!("MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA");
    } else if #[cfg(feature = "staging")] {
        pub const MRGN_ID: Pubkey = pubkey!("stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct");
    } else {
        // localnet
        pub const MRGN_ID: Pubkey = pubkey!("2jGhuVUuy3umdzByFx8sNWUAaf5vaeuDm78RDPEnhrMr");
    }
}

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
