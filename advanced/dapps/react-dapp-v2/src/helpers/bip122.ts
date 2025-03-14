import { schnorr } from "@noble/curves/secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import BitcoinMessage from "bitcoinjs-message";
import { convertHexToBase64 } from "./utilities";
import { IUTXO } from "./types";
import { BIP122_TESTNET } from "../chains/bip122";

export async function apiGetBip122AccountBalance(
  address: string,
  chainId: string
) {
  const utxo = await apiGetAddressUtxos(address, chainId);
  const balanceInSatoshis = getAvailableBalanceFromUtxos(utxo);
  const balanceInBtc = balanceInSatoshis * 0.00000001;
  return { balance: balanceInBtc.toString(), symbol: "BTC", name: "BTC" };
}

export async function apiGetAddressUtxos(address: string, chainId: string) {
  const isTestnet = chainId.includes(BIP122_TESTNET);
  return await (
    await fetch(
      `https://mempool.space${
        isTestnet ? "/testnet" : ""
      }/api/address/${address}/utxo`
    )
  ).json();
}

export function getAvailableBalanceFromUtxos(utxos: IUTXO[]) {
  if (!utxos || !utxos.length) {
    return 0;
  }
  return utxos.reduce((acc, { value }) => acc + value, 0);
}

export function calculateChange(
  utxos: IUTXO[],
  amount: number,
  feeRate: number
): number {
  const inputSum = utxos.reduce((sum, utxo) => sum + utxo.value, 0); // Sum of all UTXO values
  const estimatedSize = 10 + 148 * utxos.length + 34 * 2; // Rough estimate of transaction size
  const fee = estimatedSize * feeRate; // Transaction fee
  const change = inputSum - amount - fee; // Calculate change
  return change;
}

export async function isValidBip122Signature(
  address: string,
  signature: string,
  message: string
) {
  // if taproot address
  if (address.startsWith("bc1p") || address.startsWith("tb1p")) {
    // Convert the Ordinals address (Taproot) to the internal public key
    const decoded = bitcoin.address.fromBech32(address);
    if (decoded.version !== 1 || decoded.data.length !== 32) {
      throw new Error("Invalid Taproot address");
    }

    const publicKey = decoded.data; // The 32-byte internal public key (X coordinate of pubkey)

    // Hash the message using SHA256 (standard Bitcoin message hashing)
    const messageHash = bitcoin.crypto.sha256(Buffer.from(message));

    // Verify the Schnorr signature using tiny-secp256k1
    return schnorr.verify(
      new Uint8Array(Buffer.from(signature, "hex")),
      new Uint8Array(messageHash),
      new Uint8Array(publicKey)
    );
  }

  return BitcoinMessage.verify(
    message,
    address,
    convertHexToBase64(signature),
    undefined,
    true
  );
}

export function isOrdinalAddress(address: string) {
  return address.startsWith("tb1p");
}

export function isBip122Testnet(chainId: string) {
  return chainId.includes(BIP122_TESTNET);
}
