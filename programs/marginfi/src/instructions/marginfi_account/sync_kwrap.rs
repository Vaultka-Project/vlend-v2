// Syncs a kwrapped account with the corresponding bank's book-booking (i.e. deposits aka shares).
// The bank owner may crank this for users at a rare interval (once or twice a week), or on demand,
// to show a more accurate summary of the bank's net deposits as they change due to interest. The
// bank's books are NEVER authoritative for a kwrapped asset.

// In fact, there is NO WAY to get the authoritative net oustanding actual deposits in a kwrapped
// bank, because there is no way to get to see the net deposits of all kwrap-owned obligations
// without REFRESHING ALL OF THEM FOR EVERY KWRAP USER ON THIS BANK, and this is prohibitive.

// The user does not HAVE to sync with the bank after deposit, as any unsynced amounts will always
// sync during a liquidation attempt. But the user SHOULD sync with the bank after deposit to
// simplify the front end display of their actual positions.

// Typically, the front end should put this ix in the same tx as any deposit.

// Note: there is no need to sync users regularly, unless a more authoritative balance on the bank
// is desired. Users are always synced before liquidation.
use crate::{
    kwrap_utils::validate_user_kwrap_account,
    state::{
        marginfi_account::{BankAccountWrapper, MarginfiAccount},
        marginfi_group::Bank,
    },
};
use anchor_lang::{prelude::*, solana_program::sysvar};
use fixed::types::I80F48;
use kwrap::{
    cpi::{accounts::SyncBorrow, sync_borrow},
    state::UserAccount,
};

pub fn sync_kwrap(ctx: Context<SyncKwrap>) -> Result<()> {
    {
        let mut bank = ctx.accounts.bank.load_mut()?;
        let user_account = ctx.accounts.user_account.load()?;
        let mut marginfi_account = ctx.accounts.marginfi_account.load_mut()?;

        validate_user_kwrap_account(
            &marginfi_account.authority,
            &ctx.accounts.marginfi_account.key(),
            &ctx.accounts.user_account.key(),
        )?;

        let delta = user_account.sum_unsynced_for_bank(&ctx.accounts.bank.key());

        let mut bank_account = BankAccountWrapper::find(
            &ctx.accounts.bank.key(),
            &mut bank,
            &mut marginfi_account.lending_account,
        )?;
        bank_account.deposit_no_repay(I80F48::from_num(delta))?;
    } // release mutable borrow of bank, immutable borrow of user_account

    let cpi_program = ctx.accounts.kwrap_program.to_account_info();
    let cpi_accounts = SyncBorrow {
        user_account: ctx.accounts.user_account.to_account_info(),
        bank: ctx.accounts.bank.to_account_info(),
        instruction_sysvar_account: ctx.accounts.instruction_sysvar_account.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    sync_borrow(cpi_ctx)?;

    Ok(())
}

#[derive(Accounts)]
pub struct SyncKwrap<'info> {
    #[account(mut)]
    pub marginfi_account: AccountLoader<'info, MarginfiAccount>,

    #[account(mut)]
    pub user_account: AccountLoader<'info, UserAccount>,

    /// CHECK: this ix does nothing if a bad bank is passed
    #[account(mut)]
    pub bank: AccountLoader<'info, Bank>,

    /// CHECK: Validated against known hard-coded key
    #[account(address = kwrap::ID)]
    pub kwrap_program: UncheckedAccount<'info>,
    /// CHECK: checked against hardcoded sysvar program
    #[account(address = sysvar::instructions::ID)]
    pub instruction_sysvar_account: UncheckedAccount<'info>,
}
