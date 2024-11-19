// Wraps creation of Kamino obligation owned by the user's account
use crate::state::UserAccount;
use anchor_lang::prelude::*;

#[allow(unused_variables)]
pub fn init_obligation(ctx: Context<InitObligation>) -> Result<()> {
    let mut user_account = ctx.accounts.user_account.load_mut()?;

    // TODO init obligation

    user_account.last_activity = Clock::get().unwrap().unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct InitObligation<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        has_one = user
    )]
    pub user_account: AccountLoader<'info, UserAccount>,

    /// CHECK: checked by CPI.
    pub obligation: UncheckedAccount<'info>,
    /// CHECK: checked by CPI.
    pub lending_market: UncheckedAccount<'info>,
    /// CHECK: checked by CPI. Generally, use Pubkey default.
    pub seed1_account: UncheckedAccount<'info>,
    /// CHECK: checked by CPI. Generally, use Pubkey default.
    pub seed2_account: UncheckedAccount<'info>,
    /// CHECK: checked by CPI. Run init_metadata first to generate.
    pub owner_user_metadata: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}