use solana_sdk::{account::Account, pubkey::Pubkey};
use std::str::FromStr;

pub mod migrator;

pub mod connection;

pub mod update_listener;

pub mod snapshot;

pub mod metrics;

pub mod marginfi_account_dup;

pub fn convert_account(
    account_update: yellowstone_grpc_proto::geyser::SubscribeUpdateAccountInfo,
) -> Result<Account, String> {
    Ok(Account {
        lamports: account_update.lamports,
        data: account_update.data,
        owner: Pubkey::try_from(account_update.owner).unwrap(),
        executable: account_update.executable,
        rent_epoch: account_update.rent_epoch,
    })
}

#[derive(Debug, Clone)]
pub struct PubkeyVec(pub Vec<Pubkey>); // Ugh

impl FromStr for PubkeyVec {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let targets_raw = json::parse(s).unwrap();
        if !targets_raw.is_array() {
            return Err(anyhow::Error::msg(format!(
                "Invalid base58 pubkey array: {}",
                s
            )));
        }

        let mut targets: Vec<Pubkey> = vec![];
        for i in 0..targets_raw.len() {
            targets.push(Pubkey::from_str(targets_raw[i].as_str().unwrap()).unwrap());
        }
        Ok(Self(targets))
    }
}
