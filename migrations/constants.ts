import { PublicKey } from "@solana/web3.js";

// Program and Group Constants
export const MARGINFI_PROGRAM_ID = new PublicKey("V1enDN8GY531jkFp3DWEQiRxwYYsnir8SADjHmkt4RG");
export const MARGINFI_GROUP_PK = new PublicKey("groUPysZbKCi8RbcziZFeP1WSFPa31kC9CsdUBggdkc");

export const ONE_YEAR_IN_SECONDS = 31536000;

// Bank Public Keys
export const BANK_PKS = {
  JLP: new PublicKey("J1pbTNqEnGGMScLjnELGj9z8Q4ZvLQJSdgzUA1hNNHM6"),
  USDC: new PublicKey("USDCa9ErM9mCiQKQDrLgsJmrAvd7HbDiwdkpiW72LXi"),
  SOL: new PublicKey("SoLj1p54q1vroW6BkCZhTBvHv3ckaE6vTV2pum8mpcg"),
  JITO_SOL: new PublicKey("JiToRhcwkhynAEGwshF6cJtfmrNizpH3PyG7WGdybsK"),
  USDS: new PublicKey("usDSVCCyZStFfVC55dKtqaWR4LfgK7txmc92VU3kaB8"),
  USDT: new PublicKey("usDtKQc4cLwXysoWMLSewi459DwRcZcKXFs48bhb98B"),
  PYUSD: new PublicKey("PYUsQv22izmRYsGT1HLRxF3DLhMHNA1VzNBcqDtjUoR"),
  JUP_SOL: new PublicKey("juPSSmsK7tai8uRQoUhNaVQi2dHSnUg6uAKkAYyq7id"),
  S_SOL: new PublicKey("sso1ujDVWMXjVEnBNBaWpPUFvf9Hvx5WjuVxw15S8yf")
} as const;

// Bank Names for UI/Display
export const BANK_NAMES = {
  [BANK_PKS.JLP.toString()]: "JLP",
  [BANK_PKS.USDC.toString()]: "USDC",
  [BANK_PKS.SOL.toString()]: "SOL",
  [BANK_PKS.JITO_SOL.toString()]: "JitoSOL",
  [BANK_PKS.USDS.toString()]: "USDS",
  [BANK_PKS.USDT.toString()]: "USDT",
  [BANK_PKS.PYUSD.toString()]: "PYUSD",
  [BANK_PKS.JUP_SOL.toString()]: "JupSOL",
  [BANK_PKS.S_SOL.toString()]: "sSOL"
} as const;

// Utility function to get bank name from public key
export const getBankName = (bankPk: PublicKey): string => {
  return BANK_NAMES[bankPk.toString()] || "Unknown Bank";
};

// Utility function to get bank public key from name
export const getBankPk = (bankName: keyof typeof BANK_PKS): PublicKey => {
  return BANK_PKS[bankName];
};
