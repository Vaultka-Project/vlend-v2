// Wraps creation of Kamino metadata owned by the user's account. Typically follows init_user
use crate::constants::LUT_PROGRAM_ID;
use crate::errors::ErrorCode;
use crate::ix_utils::get_function_hash;
use crate::{constants::KAMINO_ID, state::UserAccount, user_account_signer_seeds};
use anchor_lang::prelude::*;
use solana_program::address_lookup_table::instruction as lut_ix;
use solana_program::{instruction::Instruction, program::invoke_signed};

// We could compute the slot using the system clock instead of passing it in args, but the caller
// has to derive the LUT key anyways, and this ensures they are using the same slot to do so.
pub fn init_metadata(ctx: Context<InitMetaData>, recent_slot: u64) -> Result<()> {
    {
        // Create the user's LUT
        let user_account = ctx.accounts.user_account.load()?;
        let (lut_ix, lut_key) = lut_ix::create_lookup_table(
            ctx.accounts.user_account.key(),
            ctx.accounts.user.key(),
            recent_slot,
        );
        if lut_key != ctx.accounts.user_lookup_table.key() {
            return err!(ErrorCode::LutKeyInvalid);
        }

        invoke_signed(
            &lut_ix,
            &[
                ctx.accounts.user_lookup_table.to_account_info(),
                ctx.accounts.user_account.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[user_account_signer_seeds!(user_account)],
        )?;
    }

    {
        // Create user metadata
        let user_account = ctx.accounts.user_account.load()?;
        let user_lookup_table_key = ctx.accounts.user_lookup_table.key();
        let ix: Instruction = init_meta_cpi_ix(&ctx, KAMINO_ID, user_lookup_table_key)?;

        invoke_signed(
            &ix,
            &[
                ctx.accounts.user_account.to_account_info(), // user account (signer) -> 'owner'
                ctx.accounts.user.to_account_info(),         // fee_payer -> mutable signer
                ctx.accounts.user_metadata.to_account_info(), // user_metadata (the PDA being init)
                ctx.accounts.kamino_program.to_account_info(), // referrer (placeholder)
                ctx.accounts.rent.to_account_info(),         // rent
                ctx.accounts.system_program.to_account_info(), // system program
            ],
            &[user_account_signer_seeds!(user_account)],
        )?;
    }

    {
        // Record the information on the user's account
        let mut user_account = ctx.accounts.user_account.load_mut()?;
        user_account.user_metadata = ctx.accounts.user_metadata.key();
        user_account.lut = ctx.accounts.user_lookup_table.key();
        user_account.last_activity = Clock::get().unwrap().unix_timestamp;
    }

    Ok(())
}

fn init_meta_cpi_ix(
    ctx: &Context<InitMetaData>,
    program_id: Pubkey,
    user_lookup_table_key: Pubkey,
) -> Result<Instruction> {
    let instruction = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new_readonly(ctx.accounts.user_account.key(), true), // owner (signer)
            AccountMeta::new(ctx.accounts.user.key(), true), // fee_payer (mutable signer)
            AccountMeta::new(ctx.accounts.user_metadata.key(), false), // user_metadata (the PDA being init)
            // Note: using program's id as a placeholder
            AccountMeta::new_readonly(ctx.accounts.kamino_program.key(), false), // (placeholder)
            AccountMeta::new_readonly(ctx.accounts.rent.key(), false),           // rent
            AccountMeta::new_readonly(ctx.accounts.system_program.key(), false), // system program
        ],
        data: init_metadata_ix_data(user_lookup_table_key),
    };
    Ok(instruction)
}

/// Args for the init_user_metadata CPI
#[derive(AnchorSerialize, AnchorDeserialize)]
struct InitMetaDataArgs {
    user_lookup_table_key: Pubkey,
}

/// Ix data for init_user_metadata
fn init_metadata_ix_data(user_lookup_table_key: Pubkey) -> Vec<u8> {
    let hash = get_function_hash("global", "init_user_metadata");
    // Bytes: [117, 169, 176, 69, 197, 23, 15, 162]
    // Hex: 75a9b045c5170fa2
    let mut buf: Vec<u8> = vec![];
    buf.extend_from_slice(&hash);
    let args = InitMetaDataArgs {
        user_lookup_table_key,
    };
    args.serialize(&mut buf).unwrap();
    buf
}

#[derive(Accounts)]
pub struct InitMetaData<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        has_one = user
    )]
    pub user_account: AccountLoader<'info, UserAccount>,

    /// CHECK: checked by CPI. Inited by this ix
    #[account(mut)]
    pub user_metadata: UncheckedAccount<'info>,
    /// CHECK: Reserved for future use, currently ignored.
    ///
    /// ??? if the user has an existing Kamino account, should we make it the referrer?
    pub referrer_user_metadata: Option<UncheckedAccount<'info>>,
    /// CHECK: checked by CPI.
    #[account(mut)]
    pub user_lookup_table: UncheckedAccount<'info>,

    /// CHECK: Validated against known hard-coded key
    #[account(address = KAMINO_ID)]
    pub kamino_program: UncheckedAccount<'info>,

    /// CHECK: Validated against known hard-coded key
    #[account(address = LUT_PROGRAM_ID)]
    pub lut_program: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}
