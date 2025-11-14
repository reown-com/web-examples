/**
 * Cryptographic utilities for signing and verification
 * Consolidated from react-dapp-v2
 */

import * as encoding from "@walletconnect/encoding";
import { TypedDataUtils } from "eth-sig-util";
import * as ethUtil from "ethereumjs-util";
import { providers } from "ethers";
import { eip1271 } from "./eip1271";

/**
 * Encode a personal message for signing
 */
export function encodePersonalMessage(msg: string): string {
  const data = encoding.utf8ToBuffer(msg);
  const buf = Buffer.concat([
    new Uint8Array(
      Buffer.from(
        "\u0019Ethereum Signed Message:\n" + data.length.toString(),
        "utf8"
      )
    ),
    new Uint8Array(data),
  ]);
  return ethUtil.bufferToHex(buf);
}

/**
 * Hash a personal message
 */
export function hashPersonalMessage(msg: string): string {
  const data = encodePersonalMessage(msg);
  const buf = ethUtil.toBuffer(data);
  const hash = ethUtil.keccak256(buf);
  return ethUtil.bufferToHex(hash);
}

/**
 * Encode a typed data message (EIP-712)
 */
export function encodeTypedDataMessage(msg: string): string {
  const data = TypedDataUtils.sanitizeData(JSON.parse(msg));
  const buf = Buffer.concat([
    new Uint8Array(Buffer.from("1901", "hex")),
    new Uint8Array(
      TypedDataUtils.hashStruct("EIP712Domain", data.domain, data.types)
    ),
    new Uint8Array(
      TypedDataUtils.hashStruct(
        data.primaryType as string,
        data.message,
        data.types
      )
    ),
  ]);
  return ethUtil.bufferToHex(buf);
}

/**
 * Hash a typed data message (EIP-712)
 */
export function hashTypedDataMessage(msg: string): string {
  const data = encodeTypedDataMessage(msg);
  const buf = ethUtil.toBuffer(data);
  const hash = ethUtil.keccak256(buf);
  return ethUtil.bufferToHex(hash);
}

/**
 * Recover the address from a signature and hash
 */
export function recoverAddress(sig: string, hash: string): string {
  const params = ethUtil.fromRpcSig(sig);
  const result = ethUtil.ecrecover(
    ethUtil.toBuffer(hash),
    params.v,
    params.r,
    params.s
  );
  const signer = ethUtil.bufferToHex(ethUtil.publicToAddress(result));
  return signer;
}

/**
 * Recover the signer address from a personal signature
 */
export function recoverPersonalSignature(sig: string, msg: string): string {
  const hash = hashPersonalMessage(msg);
  const signer = recoverAddress(sig, hash);
  return signer;
}

/**
 * Recover the signer address from a typed data signature (EIP-712)
 */
export function recoverTypedMessage(sig: string, msg: string): string {
  const hash = hashTypedDataMessage(msg);
  const signer = recoverAddress(sig, hash);
  return signer;
}

/**
 * Verify a signature against an address
 * Handles both EOA (Externally Owned Accounts) and smart contract wallets (EIP-1271)
 */
export async function verifySignature(
  address: string,
  sig: string,
  hash: string,
  rpcUrl: string
): Promise<boolean> {
  const provider = new providers.JsonRpcProvider(rpcUrl);
  const bytecode = await provider.getCode(address);

  // Check if it's a smart contract
  if (
    !bytecode ||
    bytecode === "0x" ||
    bytecode === "0x0" ||
    bytecode === "0x00"
  ) {
    // EOA verification
    const signer = recoverAddress(sig, hash);
    return signer.toLowerCase() === address.toLowerCase();
  } else {
    // Smart contract verification (EIP-1271)
    return eip1271.isValidSignature(address, sig, hash, provider);
  }
}
