import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

/**
 * Load local wallet keypair at given path
 * @param filePath 
 * @returns 
 */
export function loadKeypairFromFile(filePath: string): Keypair {
    const keyData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Keypair.fromSecretKey(new Uint8Array(keyData));
  }