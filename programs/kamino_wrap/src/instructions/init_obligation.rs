// Wraps creation of Kamino obligation owned by the user's account. Typically follows init_user and
// init_meta_data
use crate::{
    constants::KAMINO_ID, ix_utils::get_function_hash, state::UserAccount,
    user_account_signer_seeds,
};
use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke_signed};

pub fn init_obligation(ctx: Context<InitObligation>, tag: u8, id: u8) -> Result<()> {
    {
        // Create user obligation
        let user_account = ctx.accounts.user_account.load()?;
        let ix: Instruction = init_obligation_cpi_ix(&ctx, KAMINO_ID, tag, id)?;

        invoke_signed(
            &ix,
            &[
                ctx.accounts.user_account.to_account_info(), // obligation owner (signer)
                ctx.accounts.user.to_account_info(),         // fee_payer (mutable signer)
                ctx.accounts.obligation.to_account_info(),   // obligation
                ctx.accounts.lending_market.to_account_info(), // lending market
                ctx.accounts.seed1_account.to_account_info(), // (typically pubkey default)
                ctx.accounts.seed2_account.to_account_info(), // (typically pubkey default)
                ctx.accounts.owner_user_metadata.to_account_info(), // user metadata
                ctx.accounts.rent.to_account_info(),         // rent
                ctx.accounts.system_program.to_account_info(), // system program
            ],
            &[user_account_signer_seeds!(user_account)],
        )?;
    }

    let mut user_account = ctx.accounts.user_account.load_mut()?;
    user_account.last_activity = Clock::get().unwrap().unix_timestamp;
    user_account.add_market_info(
        &ctx.accounts.lending_market.key(),
        &ctx.accounts.obligation.key(),
    );

    Ok(())
}

fn init_obligation_cpi_ix(
    ctx: &Context<InitObligation>,
    program_id: Pubkey,
    tag: u8,
    id: u8,
) -> Result<Instruction> {
    let instruction = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new_readonly(ctx.accounts.user_account.key(), true), // obligation owner (signer)
            AccountMeta::new(ctx.accounts.user.key(), true), // fee_payer (mutable signer)
            AccountMeta::new(ctx.accounts.obligation.key(), false), // obligation
            AccountMeta::new_readonly(ctx.accounts.lending_market.key(), false), // lending market
            AccountMeta::new_readonly(ctx.accounts.seed1_account.key(), false), // (typically pubkey default)
            AccountMeta::new_readonly(ctx.accounts.seed2_account.key(), false), // (typically pubkey default)
            AccountMeta::new_readonly(ctx.accounts.owner_user_metadata.key(), false), // user metadata
            AccountMeta::new_readonly(ctx.accounts.rent.key(), false),                // rent
            AccountMeta::new_readonly(ctx.accounts.system_program.key(), false), // system program
        ],
        data: init_obligation_ix_data(tag, id),
    };
    Ok(instruction)
}

/// Args for the init_obligation CPI
#[derive(AnchorSerialize, AnchorDeserialize)]
struct InitObligationArgs {
    pub tag: u8,
    pub id: u8,
}

/// Ix data for init_obligation
fn init_obligation_ix_data(tag: u8, id: u8) -> Vec<u8> {
    let hash = get_function_hash("global", "init_obligation");
    let mut buf: Vec<u8> = vec![];
    buf.extend_from_slice(&hash);
    let args = InitObligationArgs { tag, id };
    args.serialize(&mut buf).unwrap();
    buf
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

    /// CHECK: checked by CPI. Inited by this ix
    #[account(mut)]
    pub obligation: UncheckedAccount<'info>,
    /// CHECK: checked by CPI.
    pub lending_market: UncheckedAccount<'info>,
    /// CHECK: checked by CPI. Generally, use Pubkey default.
    pub seed1_account: UncheckedAccount<'info>,
    /// CHECK: checked by CPI. Generally, use Pubkey default.
    pub seed2_account: UncheckedAccount<'info>,
    /// CHECK: checked by CPI. Run init_metadata first to generate.
    pub owner_user_metadata: UncheckedAccount<'info>,

    /// CHECK: Validated against known hard-coded key
    #[account(address = KAMINO_ID)]
    pub kamino_program: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}
