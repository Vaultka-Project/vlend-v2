// Wraps an simple deposit to Kamino of new assets into the program-owner user account. Use this
// instruction when depositing new assets into Kamino
use crate::{constants::KAMINO_ID, state::UserAccount, user_account_signer_seeds};
use anchor_lang::{prelude::*, solana_program::sysvar};
use anchor_spl::{token::Token, token_interface::TokenInterface};
use solana_program::{instruction::Instruction, program::invoke_signed};

use super::deposit_ix_data;

pub fn fresh_deposit(ctx: Context<FreshDeposit>, liquidity_amount: u64) -> Result<()> {
    {
        // Note: clone() is required here to avoid re-borrowing as mut of `AccountMeta::new`
        let user_account = ctx.accounts.user_account.load()?.clone();

        let ix: Instruction = deposit_cpi_ix(&ctx, KAMINO_ID, liquidity_amount)?;

        let accs = &ctx.accounts;
        invoke_signed(
            &ix,
            &[
                accs.user_account.to_account_info(), // obligation owner (signer/fee payer)
                accs.obligation.to_account_info(),   // obligation
                accs.lending_market.to_account_info(), // market
                accs.lending_market_authority.to_account_info(), // market auth
                // **** reserve accounts *****
                accs.reserve.to_account_info(),
                accs.reserve_liquidity_mint.to_account_info(),
                accs.reserve_liquidity_supply.to_account_info(),
                accs.reserve_collateral_mint.to_account_info(),
                accs.reserve_destination_deposit_collateral
                    .to_account_info(),
                // ***** end reserve accounts *****
                accs.user_source_liquidity.to_account_info(), // user source ATA
                accs.kamino_program.to_account_info(),        // placeholder
                // Program accounts
                accs.collateral_token_program.to_account_info(),
                accs.liquidity_token_program.to_account_info(),
                accs.instruction_sysvar_account.to_account_info(),
            ],
            &[user_account_signer_seeds!(user_account)],
        )?;
    }

    let mut user_account = ctx.accounts.user_account.load_mut()?;
    user_account.last_activity = Clock::get().unwrap().unix_timestamp;

    Ok(())
}

fn deposit_cpi_ix(
    ctx: &Context<FreshDeposit>,
    program_id: Pubkey,
    liquidity_amount: u64,
) -> Result<Instruction> {
    let accs = &ctx.accounts;
    let instruction = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(accs.user_account.key(), true), // obligation owner (signer)
            AccountMeta::new(accs.obligation.key(), false),  // obligation
            AccountMeta::new_readonly(accs.lending_market.key(), false), // lending market
            AccountMeta::new_readonly(accs.lending_market_authority.key(), false), // market auth
            // **** reserve accounts *****
            AccountMeta::new(accs.reserve.key(), false),
            AccountMeta::new(accs.reserve_liquidity_mint.key(), false),
            AccountMeta::new(accs.reserve_liquidity_supply.key(), false),
            AccountMeta::new(accs.reserve_collateral_mint.key(), false),
            AccountMeta::new(accs.reserve_destination_deposit_collateral.key(), false),
            // ***** end reserve accounts *****
            AccountMeta::new(accs.user_source_liquidity.key(), false), // users's source ATA
            // Note: using program's id as a placeholder
            AccountMeta::new_readonly(accs.kamino_program.key(), false), // (placeholder)
            // Program accounts
            AccountMeta::new_readonly(accs.collateral_token_program.key(), false),
            AccountMeta::new_readonly(accs.liquidity_token_program.key(), false),
            AccountMeta::new_readonly(accs.instruction_sysvar_account.key(), false),
        ],
        data: deposit_ix_data(liquidity_amount),
    };
    Ok(instruction)
}

#[derive(Accounts)]
pub struct FreshDeposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// User kwrap account
    #[account(
        mut,
        has_one = user,
        // If has_one is ever improved, we might infer these accounts.
        constraint = {
            let acc = user_account.load()?;
            let info = acc.find_info_by_market(lending_market.key);
            info.is_some() && info.unwrap().obligation == *obligation.key
        }
    )]
    pub user_account: AccountLoader<'info, UserAccount>,

    /// Obligation to deposit into, must be under the given market, and owned by `user_account`, the
    /// user's kwrap account
    /// CHECK: validated in CPI
    #[account(mut)]
    pub obligation: UncheckedAccount<'info>,
    /// Kamino lending market overseeing the reserve
    /// CHECK: validated in CPI
    pub lending_market: UncheckedAccount<'info>,
    /// Read from market
    /// CHECK: validated in CPI
    pub lending_market_authority: UncheckedAccount<'info>,
    /// Reserve to deposit into, must be under the given market
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve: UncheckedAccount<'info>,
    /// Read from the reserve
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve_liquidity_mint: UncheckedAccount<'info>,
    /// Read from the reserve
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve_liquidity_supply: UncheckedAccount<'info>,
    /// Read from the reserve
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve_collateral_mint: UncheckedAccount<'info>,
    /// Read from the reserve
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve_destination_deposit_collateral: UncheckedAccount<'info>,
    /// An ATA for `reserve_liquidity_mint` owned by `user_account`
    /// CHECK: validated in CPI
    #[account(mut)]
    pub user_source_liquidity: UncheckedAccount<'info>,
    /// CHECK: unused, placeholder in case Kamino adds a usage for
    /// `placeholder_user_destination_collateral`
    #[account(mut)]
    pub placeholder: Option<UncheckedAccount<'info>>,

    /// CHECK: Validated against known hard-coded key
    #[account(address = KAMINO_ID)]
    pub kamino_program: UncheckedAccount<'info>,
    pub collateral_token_program: Program<'info, Token>,
    pub liquidity_token_program: Interface<'info, TokenInterface>,
    /// CHECK: checked against hardcoded sysvar program
    #[account(address = sysvar::instructions::ID)]
    pub instruction_sysvar_account: UncheckedAccount<'info>,
}
