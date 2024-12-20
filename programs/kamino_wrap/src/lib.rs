pub mod constants;
pub mod errors;
pub mod instructions;
pub mod ix_utils;
pub mod macros;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

// TODO fill actual devnet/staging/mainnet keys
cfg_if::cfg_if! {
    if #[cfg(feature = "mainnet-beta")] {
        declare_id!("4Rd33Yfzm6BVWeTRjBfKpni4eVJuFdbyupngTHCsVnyU");
    } else if #[cfg(feature = "devnet")] {
        declare_id!("4Rd33Yfzm6BVWeTRjBfKpni4eVJuFdbyupngTHCsVnyU");
    } else if #[cfg(feature = "staging")] {
        declare_id!("4Rd33Yfzm6BVWeTRjBfKpni4eVJuFdbyupngTHCsVnyU");
    } else {
        declare_id!("4Rd33Yfzm6BVWeTRjBfKpni4eVJuFdbyupngTHCsVnyU");
    }
}
#[program]
pub mod kamino_wrap {
    use super::*;

    pub fn accrue_interest(ctx: Context<AccrueInterest>) -> Result<()> {
        instructions::accrue_interest(ctx)
    }

    pub fn fresh_deposit(ctx: Context<FreshDeposit>, amount: u64) -> Result<()> {
        instructions::fresh_deposit(ctx, amount)
    }

    pub fn existing_deposit(ctx: Context<ExistingDeposit>, amount: u64) -> Result<()> {
        instructions::existing_deposit(ctx, amount)
    }

    pub fn init_user(ctx: Context<InitUser>, bound_account: Pubkey) -> Result<()> {
        instructions::init_user_account(ctx, bound_account)
    }

    pub fn init_metadata(ctx: Context<InitMetaData>, recent_slot: u64) -> Result<()> {
        instructions::init_metadata(ctx, recent_slot)
    }

    pub fn init_obligation(ctx: Context<InitObligation>, tag: u8, id: u8) -> Result<()> {
        instructions::init_obligation(ctx, tag, id)
    }

    pub fn start_borrow(ctx: Context<StartBorrow>) -> Result<()> {
        instructions::start_borrow(ctx)
    }

    pub fn mrgn_withdraw(ctx: Context<MrgnWithdraw>, collateral_amount: u64) -> Result<()> {
        instructions::mrgn_withdraw(ctx, collateral_amount)
    }
}
