use std::{collections::HashMap, mem::size_of};

use anchor_client::Program;
use anchor_spl::associated_token;
use anyhow::Result;
use fixed::types::I80F48;
use log::{debug, info, warn};
use marginfi::state::{
    marginfi_group::Bank,
    price::{pyth_price_components_to_i80f48, swithcboard_decimal_to_i80f48},
};
use pyth_sdk_solana::state::load_price_account;
use solana_address_lookup_table_program::{
    instruction::{create_lookup_table, extend_lookup_table},
    state::AddressLookupTable,
};
use solana_client::{
    rpc_client::RpcClient,
    rpc_filter::{Memcmp, RpcFilterType},
};
use solana_sdk::{
    account::Account, pubkey, pubkey::Pubkey, signer::Signer, system_program, sysvar,
    transaction::Transaction,
};
use switchboard_v2::{AggregatorAccountData, SWITCHBOARD_PROGRAM_ID};

use crate::{
    config::{CliSigner, Config},
    profile::Profile,
    utils,
};

const CHUNK_SIZE: usize = 22;
const KEY_BATCH_SIZE: usize = 20;
const JUP_EVENT_AUTHORITY: Pubkey = pubkey!("D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf");
const PYTH_ID: Pubkey = pubkey!("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH");
const JUP_AUTHORITY_SEED: &[u8] = b"authority";
const JUP_PROGRAM_ID: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
const JUP_AUTHORITY_INDEX: u8 = 7;

fn get_missing_keys(
    marginfi_group: &Pubkey,
    rpc_client: &RpcClient,
    mfi_program: &Program<CliSigner>,
    existing_lookup_tables: &[(Pubkey, AddressLookupTable)],
) -> Result<Vec<Pubkey>> {
    let mut banks =
        mfi_program.accounts::<Bank>(vec![RpcFilterType::Memcmp(Memcmp::new_raw_bytes(
            8 + size_of::<Pubkey>() + size_of::<u8>(),
            marginfi_group.to_bytes().to_vec(),
        ))])?;

    let jup_authority = find_jupiter_program_authority(JUP_AUTHORITY_INDEX);

    let mut keys: Vec<Pubkey> = vec![
        mfi_program.id(),
        marginfi_group.clone(),
        spl_token::id(),
        system_program::id(),
        sysvar::instructions::id(),
        JUP_EVENT_AUTHORITY,
        jup_authority,
    ];

    let bank_oracle_pairs = banks
        .iter()
        .map(|(bank_address, bank)| {
            (
                bank_address.clone(),
                bank.config.oracle_keys.first().unwrap().clone(),
            )
        })
        .collect::<Vec<(Pubkey, Pubkey)>>();

    let price_map: HashMap<Pubkey, f64> = rpc_client
        .get_multiple_accounts(
            &bank_oracle_pairs
                .iter()
                .map(|(_, oracle)| oracle.clone())
                .collect::<Vec<_>>(),
        )?
        .iter()
        .zip(bank_oracle_pairs.iter())
        .map(|(account, (bank_pk, feed_pk))| {
            let account = account.clone().unwrap();
            match account.owner {
                PYTH_ID => {
                    let pa = load_price_account(&account.data).unwrap().clone();
                    let pf = pa.to_price_feed(feed_pk);
                    let price = pf.get_ema_price_unchecked();
                    let price =
                        pyth_price_components_to_i80f48(I80F48::from_num(price.price), price.expo)
                            .unwrap();
                    (*bank_pk, price.to_num())
                }
                SWITCHBOARD_PROGRAM_ID => {
                    let pa = AggregatorAccountData::new_from_bytes(&account.data)
                        .unwrap()
                        .clone();
                    let result = pa.latest_confirmed_round.result;

                    (
                        *bank_pk,
                        swithcboard_decimal_to_i80f48(result).unwrap().to_num(),
                    )
                }
                _ => {
                    panic!("Unknown oracle program: {}", account.owner);
                }
            }
        })
        .collect();

    banks.sort_by(|(a_address, a), (b_address, b)| {
        let b_deposits: f64 = b
            .get_asset_amount(b.total_asset_shares.into())
            .unwrap()
            .to_num();
        let b_deposits_ui = b_deposits / 10u64.pow(b.mint_decimals as u32) as f64;
        let a_deposits: f64 = a
            .get_asset_amount(a.total_asset_shares.into())
            .unwrap()
            .to_num();
        let a_deposits_ui = a_deposits / 10u64.pow(a.mint_decimals as u32) as f64;

        let a_price = price_map.get(&a_address).unwrap();
        let b_price = price_map.get(&b_address).unwrap();

        let a_value = a_deposits_ui * a_price;
        let b_value = b_deposits_ui * b_price;

        b_value.partial_cmp(&a_value).unwrap()
    });

    for (bank_pk, bank) in banks.iter() {
        keys.push(*bank_pk);
        keys.push(bank.liquidity_vault);
        let (vault_auth, _) = utils::find_bank_vault_authority_pda(
            bank_pk,
            marginfi::state::marginfi_group::BankVaultType::Liquidity,
            &marginfi::ID,
        );
        keys.push(vault_auth);
        keys.push(bank.mint);

        let jup_authority_ata =
            associated_token::get_associated_token_address(&jup_authority, &bank.mint);
        keys.push(jup_authority_ata);
        println!("Jup auth ATA for {:?}: {:?}", bank.mint, jup_authority_ata);

        keys.extend_from_slice(
            &bank
                .config
                .oracle_keys
                .iter()
                .filter(|pk| **pk != Pubkey::default())
                .cloned()
                .collect::<Vec<_>>(),
        );
    }

    keys.dedup();

    // Find missing keys in lookup tables
    let missing_keys = keys
        .iter()
        .filter(|pk| {
            let missing = !existing_lookup_tables.iter().any(|(_, lookup_table)| {
                lookup_table.addresses.iter().any(|address| &address == pk)
            });

            debug!("Key {} missing: {}", pk, missing);

            missing
        })
        .cloned()
        .collect::<Vec<Pubkey>>();

    Ok(missing_keys)
}

pub fn process_check_lookup_tables(
    config: &Config,
    profile: &Profile,
    existing_lookup_table_addresses: Vec<Pubkey>,
) -> Result<()> {
    let rpc_client = config.mfi_program.rpc();
    let marginfi_group = profile.marginfi_group.expect("group not set");

    let mut accounts: Vec<Account> = vec![];

    for chunk in existing_lookup_table_addresses.chunks(CHUNK_SIZE) {
        let accounts_2: Vec<Account> = rpc_client
            .get_multiple_accounts(chunk)?
            .into_iter()
            .flatten()
            .collect();

        accounts.extend(accounts_2);
    }

    let existing_lookup_tables: Vec<(Pubkey, AddressLookupTable)> = accounts
        .iter_mut()
        .zip(existing_lookup_table_addresses.iter())
        .map(|(account, address)| {
            let lookup_table = AddressLookupTable::deserialize(&account.data).unwrap();
            info!(
                "Loaded table {} with {} addresses",
                address,
                lookup_table.addresses.len()
            );

            (address.clone(), lookup_table)
        })
        .collect();

    let missing_keys = get_missing_keys(
        &marginfi_group,
        &rpc_client,
        &config.mfi_program,
        &existing_lookup_tables,
    )?;

    println!("Missing {} keys", missing_keys.len());
    if !missing_keys.is_empty() {
        println!("  - {:#?}", missing_keys);
    }

    Ok(())
}

pub fn process_update_lookup_tables(
    config: &Config,
    profile: &Profile,
    existing_lookup_table_addresses: Vec<Pubkey>,
) -> Result<()> {
    let rpc_client = config.mfi_program.rpc();
    let marginfi_group = profile.marginfi_group.expect("group not set");

    let mut accounts: Vec<Account> = vec![];

    for chunk in existing_lookup_table_addresses.chunks(CHUNK_SIZE) {
        let accounts_2: Vec<Account> = rpc_client
            .get_multiple_accounts(chunk)?
            .into_iter()
            .flatten()
            .collect();

        accounts.extend(accounts_2);
    }

    let existing_lookup_tables: Vec<(Pubkey, AddressLookupTable)> = accounts
        .iter_mut()
        .zip(existing_lookup_table_addresses.iter())
        .map(|(account, address)| {
            let lookup_table = AddressLookupTable::deserialize(&account.data).unwrap();
            info!(
                "Loaded table {} with {} addresses",
                address,
                lookup_table.addresses.len()
            );

            if lookup_table.meta.authority != Some(config.authority()) {
                warn!(
                    "Lookup table {} has wrong authority {:?}",
                    address, lookup_table.meta.authority,
                );
            }

            (address.clone(), lookup_table)
        })
        .collect();

    let mut missing_keys = get_missing_keys(
        &marginfi_group,
        &rpc_client,
        &config.mfi_program,
        &existing_lookup_tables,
    )?;

    info!("Missing {} keys", missing_keys.len());

    // Extend exsiting lookup tables if possible
    for (address, table) in existing_lookup_tables.iter() {
        add_to_lut(
            config,
            &rpc_client,
            &mut missing_keys,
            table.addresses.len(),
            *address,
        )?;
    }

    while !missing_keys.is_empty() {
        let lut_address = create_new_lut(config, &rpc_client)?;
        add_to_lut(config, &rpc_client, &mut missing_keys, 0, lut_address)?;
    }

    println!("Done");

    Ok(())
}

fn create_new_lut(config: &Config, rpc: &solana_client::rpc_client::RpcClient) -> Result<Pubkey> {
    let recent_slot = rpc.get_slot()?;
    // Create new lookup tables
    let (ix, address) = create_lookup_table(config.authority(), config.authority(), recent_slot);
    let recent_blockhash = rpc.get_latest_blockhash()?;
    let mut tx = Transaction::new_with_payer(&[ix], Some(&config.fee_payer.pubkey()));

    tx.sign(&[&config.fee_payer], recent_blockhash);

    let sig = rpc.send_and_confirm_transaction_with_spinner(&tx)?;

    info!("Created new lookup table {} {}", address, sig);
    println!("Created new lookup table {} {}", address, sig);

    Ok(address)
}

fn add_to_lut(
    config: &Config,
    rpc: &solana_client::rpc_client::RpcClient,
    missing_keys: &mut Vec<Pubkey>,
    table_current_size: usize,
    address: Pubkey,
) -> Result<()> {
    let remaining_room = 256 - table_current_size;
    let n_keys_to_add_to_table = missing_keys.len().min(remaining_room);

    let keys = missing_keys
        .drain(..n_keys_to_add_to_table)
        .collect::<Vec<_>>();

    for chunk in keys.chunks(KEY_BATCH_SIZE) {
        let ix = extend_lookup_table(
            address,
            config.authority(),
            Some(config.authority()),
            chunk.to_vec(),
        );

        let recent_blockhash = rpc.get_latest_blockhash()?;

        let mut tx = Transaction::new_with_payer(&[ix], Some(&config.fee_payer.pubkey()));
        tx.sign(&[&config.fee_payer], recent_blockhash);

        let sig = rpc.send_and_confirm_transaction_with_spinner(&tx)?;
        info!("Added {} keys to table {} {}", chunk.len(), address, sig);
    }

    Ok(())
}

pub fn find_jupiter_program_authority(id: u8) -> Pubkey {
    Pubkey::find_program_address(&[JUP_AUTHORITY_SEED, &[id]], &JUP_PROGRAM_ID).0
}
