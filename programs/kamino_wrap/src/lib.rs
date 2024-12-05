pub mod constants;
pub mod errors;
pub mod instructions;
pub mod ix_utils;
pub mod macros;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("4Rd33Yfzm6BVWeTRjBfKpni4eVJuFdbyupngTHCsVnyU");

#[program]
pub mod kamino_wrap {
    use super::*;

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
}
