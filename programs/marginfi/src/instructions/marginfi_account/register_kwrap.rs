use crate::{
    check,
    events::{AccountEventHeader, LendingAccountRegisterKwrapEvent},
    kwrap_utils::validate_user_kwrap_account,
    prelude::*,
    state::{
        marginfi_account::{BankAccountWrapper, MarginfiAccount, DISABLED_FLAG},
        marginfi_group::Bank,
    },
    utils::{self, validate_asset_tags},
};
use anchor_lang::prelude::*;
use fixed::types::I80F48;

/// 1. Create the user's bank account for the kwrapped asset deposited, if it does not exist yet
/// 2. Record asset increase in the bank account
/// 3. Flag the kwrap account to forbid withdrawals by the user without mrgn authorization
///
/// Note: we don't have to accrue interest, because kwrapped banks earn interest only on Kamino, and
/// cannot be borrowed against. We also don't need any of the bank's vaults, because no liquidity moves.
pub fn lending_account_register_kwrap<'info>(
    mut ctx: Context<'_, '_, 'info, 'info, LendingAccountRegisterKwrap<'info>>,
    amount: u64,
) -> MarginfiResult {
    let LendingAccountRegisterKwrap {
        marginfi_account: marginfi_account_loader,
        signer,
        bank: bank_loader,
        user_kwrap_account,
        obligation,
        kwrap_program,
        ..
    } = ctx.accounts;
    let mut bank = bank_loader.load_mut()?;
    let mut marginfi_account = marginfi_account_loader.load_mut()?;

    validate_asset_tags(&bank, &marginfi_account)?;

    validate_user_kwrap_account(
        &marginfi_account.authority,
        &marginfi_account_loader.key(),
        &user_kwrap_account.key(),
    )?;

    check!(
        !marginfi_account.get_flag(DISABLED_FLAG),
        MarginfiError::AccountDisabled
    );

    let mut bank_account = BankAccountWrapper::find_or_create(
        &bank_loader.key(),
        &mut bank,
        &mut marginfi_account.lending_account,
    )?;

    bank_account.deposit_no_repay(I80F48::from_num(amount))?;

    // TODO CPI into kwrap to register the obligation...

    emit!(LendingAccountRegisterKwrapEvent {
        header: AccountEventHeader {
            signer: Some(signer.key()),
            marginfi_account: marginfi_account_loader.key(),
            marginfi_account_authority: marginfi_account.authority,
            marginfi_group: marginfi_account.group,
        },
        bank: bank_loader.key(),
        mint: bank.mint, // TODO maybe something else makes more sense here
        amount,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct LendingAccountRegisterKwrap<'info> {
    pub marginfi_group: AccountLoader<'info, MarginfiGroup>,

    #[account(
        mut,
        constraint = marginfi_account.load()?.group == marginfi_group.key(),
    )]
    pub marginfi_account: AccountLoader<'info, MarginfiAccount>,

    #[account(
        address = marginfi_account.load()?.authority,
    )]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = bank.load()?.group == marginfi_group.key(),
    )]
    pub bank: AccountLoader<'info, Bank>,

    /// CHECK: validated in handler
    #[account(owner = kwrap::ID)]
    pub user_kwrap_account: UncheckedAccount<'info>,

    /// CHECK: validated in CPI
    pub obligation: UncheckedAccount<'info>,

    /// CHECK: Validated against known hard-coded key
    #[account(address = kwrap::ID)]
    pub kwrap_program: UncheckedAccount<'info>,
}
