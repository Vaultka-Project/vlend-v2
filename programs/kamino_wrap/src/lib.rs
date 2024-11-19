pub mod constants;
pub mod errors;
pub mod instructions;
pub mod macros;
pub mod state;
pub mod ix_utils;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("4Rd33Yfzm6BVWeTRjBfKpni4eVJuFdbyupngTHCsVnyU");

#[program]
pub mod kamino_wrap {
    use super::*;

    pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
        instructions::init_user_account(ctx)
    }

    pub fn init_metadata(
        ctx: Context<InitMetaData>,
        recent_slot: u64,
        meta_bump: u8,
    ) -> Result<()> {
        instructions::init_metadata(ctx, recent_slot, meta_bump)
    }
}
