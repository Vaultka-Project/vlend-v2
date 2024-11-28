// After having been written by Jet circa 2019, this Mock of Pyth was significantly outdated for
// some time (all modern changes are backwards compatible, so new versions of Pyth on-chain would
// still deserialize the price data).
//
// Updated in 2021 by Psy and in 2024 by Mrgn (via ChatGPT) to the newest layout, but many of the
// fields are likely straight up incorrect
//
// AT LEAST price, twap, and timestamp will likely serialize correctly! load_price_account and
// get_price_unchecked should work!

// Adapated from PsyLend, Jet labs, etc
import { Program, Wallet, workspace } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Oracles, createMockAccount, storeMockAccount } from "./mocks";
import { Mocks } from "../../target/types/mocks";
/** Copied from `@pythnetwork/client": "^2.19.0"`, used as a discriminator */
const Magic = 2712847316;

const PYTH_ACCOUNT_SIZE = 3312;

const mockProgram: Program<Mocks> = workspace.Mocks;

export interface Price {
  version?: number;
  atype?: number;
  size?: number;
  ptype?: number; // PriceType: 0 for Unknown, 1 for Price
  expo?: number;
  num?: number;
  numQt?: number;
  lastSlot?: bigint;
  validSlot?: bigint;
  emaPrice?: Rational;
  emaConf?: Rational;
  timestamp?: bigint;
  minPub?: number;
  prod?: PublicKey;
  next?: PublicKey;
  prevSlot?: bigint;
  prevPrice?: bigint;
  prevConf?: bigint;
  prevTimestamp?: bigint;
  agg?: PriceInfo;
  comp?: PriceComponent[];
}

export interface PriceInfo {
  price?: bigint;
  conf?: bigint;
  status?: number;
  corpAct?: number;
  pubSlot?: bigint;
}

export interface PriceComponent {
  publisher?: PublicKey;
  agg?: PriceInfo;
  latest?: PriceInfo;
}

export interface Rational {
  val?: bigint;
  numer?: bigint;
  denom?: bigint;
}

/**
 * Creates a Pyth price account
 * @param wallet - pays the TX fee
 * @returns
 */
export const createPriceAccount = async (wallet: Wallet) => {
  return createMockAccount(mockProgram, PYTH_ACCOUNT_SIZE, wallet);
};

/**
 * Update a Pyth price account with new data
 * @param account The account to update
 * @param data The new data to place in the account
 * @param wallet - pays tx fee
 */
export const updatePriceAccount = async (
  account: Keypair,
  data: Price,
  wallet: Wallet
) => {
  const buf = Buffer.alloc(512);
  const d = getPythPriceDataWithDefaults(data);
  d.agg = getPythPriceInfoWithDefaults(d.agg);
  d.emaPrice = getRationalWithDefaults(d.emaPrice);
  d.emaConf = getRationalWithDefaults(d.emaConf);

  writePriceBuffer(buf, 0, d);
  await storeMockAccount(mockProgram, wallet, account, 0, buf);
};

export const getPythPriceDataWithDefaults = ({
  version = 2,
  atype = 3, // AccountType::Price
  size = PYTH_ACCOUNT_SIZE,
  ptype = 1, // PriceType::Price
  expo = 0,
  num = 0,
  numQt = 0,
  lastSlot = BigInt(0),
  validSlot = BigInt(0),
  emaPrice = {},
  emaConf = {},
  timestamp = BigInt(Math.round(Date.now() / 1000)),
  minPub = 1,
  prod = PublicKey.default,
  next = PublicKey.default,
  prevSlot = BigInt(0),
  prevPrice = BigInt(0),
  prevConf = BigInt(0),
  prevTimestamp = BigInt(0),
  agg = {},
  comp = [],
}: Price) => {
  return {
    version,
    atype,
    size,
    ptype,
    expo,
    num,
    numQt,
    lastSlot,
    validSlot,
    emaPrice,
    emaConf,
    timestamp,
    minPub,
    prod,
    next,
    prevSlot,
    prevPrice,
    prevConf,
    prevTimestamp,
    agg,
    comp,
  };
};

export const getPythPriceInfoWithDefaults = ({
  price = BigInt(0),
  conf = BigInt(0),
  status = 1, // PriceStatus::Trading
  corpAct = 0, // CorpAction::NoCorpAct
  pubSlot = BigInt(0),
}: PriceInfo) => {
  return {
    price,
    conf,
    status,
    corpAct,
    pubSlot,
  };
};

export const getRationalWithDefaults = ({
  val = BigInt(0),
  numer = BigInt(0),
  denom = BigInt(1),
}: Rational) => {
  return {
    val,
    numer,
    denom,
  };
};

export const writePriceBuffer = (buf: Buffer, offset: number, data: Price) => {
  buf.writeUInt32LE(Magic, offset + 0); // magic
  buf.writeUInt32LE(data.version, offset + 4); // ver
  buf.writeUInt32LE(data.atype, offset + 8); // type
  buf.writeUInt32LE(data.size, offset + 12); // size
  buf.writeUInt32LE(data.ptype, offset + 16); // price type
  buf.writeInt32LE(data.expo, offset + 20); // expo
  buf.writeUInt32LE(data.num, offset + 24); // num components
  buf.writeUInt32LE(data.numQt, offset + 28); // num quoters
  buf.writeBigUInt64LE(data.lastSlot, offset + 32); // last valid slot
  buf.writeBigUInt64LE(data.validSlot, offset + 40); // valid slot
  buf.writeBigInt64LE(data.emaPrice.val, offset + 48); // ema price val
  buf.writeBigInt64LE(data.emaPrice.numer, offset + 56); // ema price numerator
  buf.writeBigInt64LE(data.emaPrice.denom, offset + 64); // ema price denominator
  buf.writeBigInt64LE(data.emaConf.val, offset + 72); // ema conf val
  buf.writeBigInt64LE(data.emaConf.numer, offset + 80); // ema conf numerator
  buf.writeBigInt64LE(data.emaConf.denom, offset + 88); // ema conf denominator
  buf.writeBigInt64LE(data.timestamp, offset + 96); // timestamp
  buf.writeUInt8(data.minPub, offset + 104); // min publishers
  writePublicKeyBuffer(buf, offset + 112, data.prod);
  writePublicKeyBuffer(buf, offset + 144, data.next);
  buf.writeBigUInt64LE(data.prevSlot, offset + 176); // previous valid slot
  buf.writeBigInt64LE(data.prevPrice, offset + 184); // previous price
  buf.writeBigUInt64LE(data.prevConf, offset + 192); // previous confidence
  buf.writeBigInt64LE(data.prevTimestamp, offset + 200); // previous timestamp

  writePriceInfoBuffer(buf, offset + 208, data.agg);
  let pos = offset + 240;

  for (const component of data.comp) {
    writePriceComponentBuffer(buf, pos, component);
    pos += 96;
  }
};

export const writePublicKeyBuffer = (
  buf: Buffer,
  offset: number,
  key: PublicKey
) => {
  buf.write(key.toBuffer().toString("binary"), offset, "binary");
};

export const writePriceInfoBuffer = (
  buf: Buffer,
  offset: number,
  info: PriceInfo
) => {
  buf.writeBigInt64LE(info.price, offset + 0);
  buf.writeBigUInt64LE(info.conf, offset + 8);
  buf.writeUInt32LE(info.status, offset + 16);
  buf.writeUInt32LE(info.corpAct, offset + 20);
  buf.writeBigUInt64LE(info.pubSlot, offset + 24);
};

export const writePriceComponentBuffer = (
  buf: Buffer,
  offset: number,
  component: PriceComponent
) => {
  component.publisher.toBuffer().copy(buf, offset);
  writePriceInfoBuffer(buf, offset + 32, component.agg);
};

/**
 * Set up mock usdc and wsol oracles
 * @param wallet
 * @param wsolPrice
 * @param wsolDecimals
 * @param usdcPrice
 * @param usdcDecimals
 * @param tokenAPrice
 * @param tokenADecimals
 * @param tokenBPrice
 * @param tokenBDecimals
 * @param verbose
 * @param skips - set to true to skip sending txes, which makes tests run faster if you don't need
 * those oracles.
 * @returns Price oracles for all currencies
 */
export const setupPythOracles = async (
  wallet: Wallet,
  wsolPrice: number,
  wsolDecimals: number,
  usdcPrice: number,
  usdcDecimals: number,
  tokenAPrice: number,
  tokenADecimals: number,
  tokenBPrice: number,
  tokenBDecimals: number,
  verbose: boolean,
  skips?: {
    wsol: boolean;
    usdc: boolean;
    a: boolean;
    b: boolean;
  }
) => {
  const now = Math.round(Date.now() / 1000);

  let wsolPythOracle = await createPriceAccount(wallet);
  let price = BigInt(wsolPrice * 10 ** wsolDecimals);
  if (skips && skips.wsol) {
    // do nothing
  } else {
    await updatePriceAccount(
      wsolPythOracle,
      {
        expo: -wsolDecimals,
        timestamp: BigInt(now),
        agg: {
          price: price,
          conf: price / BigInt(100), // 1% of the price
        },
        emaPrice: {
          val: price,
          numer: price,
          denom: BigInt(1),
        },
      },
      wallet
    );
  }

  let usdcPythOracle = await createPriceAccount(wallet);
  price = BigInt(usdcPrice * 10 ** usdcDecimals);
  if (skips && skips.usdc) {
    // do nothing
  } else {
    await updatePriceAccount(
      usdcPythOracle,
      {
        expo: -usdcDecimals,
        timestamp: BigInt(now),
        agg: {
          price: price,
          conf: price / BigInt(100), // 1% of the price
        },
        emaPrice: {
          val: price,
          numer: price,
          denom: BigInt(1),
        },
      },
      wallet
    );
  }

  let tokenAPythOracle = await createPriceAccount(wallet);
  price = BigInt(tokenAPrice * 10 ** tokenADecimals);
  if (skips && skips.a) {
    // do nothing
  } else {
    await updatePriceAccount(
      tokenAPythOracle,
      {
        expo: -tokenADecimals,
        timestamp: BigInt(now),
        agg: {
          price: price,
          conf: price / BigInt(100), // 1% of the price
        },
        emaPrice: {
          val: price,
          numer: price,
          denom: BigInt(1),
        },
      },
      wallet
    );
  }

  let tokenBPythOracle = await createPriceAccount(wallet);
  price = BigInt(tokenBPrice * 10 ** tokenBDecimals);
  if (skips && skips.b) {
    // do nothing
  } else {
    await updatePriceAccount(
      tokenBPythOracle,
      {
        expo: -tokenBDecimals,
        timestamp: BigInt(now),
        agg: {
          price: price,
          conf: price / BigInt(100), // 1% of the price
        },
        emaPrice: {
          val: price,
          numer: price,
          denom: BigInt(1),
        },
      },
      wallet
    );
  }

  if (verbose) {
    console.log("Mock Pyth price oracles:");
    console.log("wsol price:    \t" + wsolPythOracle.publicKey);
    console.log("usdc price:    \t" + usdcPythOracle.publicKey);
    console.log("token a price: \t" + tokenAPythOracle.publicKey);
    console.log("token b price: \t" + tokenBPythOracle.publicKey);
    console.log(
      "Price 1 wsol.......$" +
        wsolPrice +
        "\t  1 token in native decimals: " +
        (1 * 10 ** wsolDecimals).toLocaleString()
    );
    console.log(
      "Price 1 usdc.......$" +
        usdcPrice +
        "\t  1 token in native decimals: " +
        (1 * 10 ** usdcDecimals).toLocaleString()
    );
    console.log(
      "Price 1 token A....$" +
        tokenAPrice +
        "\t  1 token in native decimals: " +
        (1 * 10 ** tokenADecimals).toLocaleString()
    );
    console.log(
      "Price 1 token B....$" +
        tokenBPrice +
        "\t  1 token in native decimals: " +
        (1 * 10 ** tokenBDecimals).toLocaleString()
    );
    console.log("");
  }
  let oracles: Oracles = {
    wsolOracle: wsolPythOracle,
    wsolDecimals: wsolDecimals,
    usdcOracle: usdcPythOracle,
    usdcDecimals: usdcDecimals,
    tokenAOracle: tokenAPythOracle,
    tokenADecimals: tokenADecimals,
    tokenBOracle: tokenBPythOracle,
    tokenBDecimals: tokenBDecimals,
    wsolPrice: wsolPrice,
    usdcPrice: usdcPrice,
    tokenAPrice: tokenAPrice,
    tokenBPrice: tokenBPrice,
  };
  return oracles;
};
