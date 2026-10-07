import * as encoding from "@walletconnect/encoding";

import { apiGetAccountNonce, apiGetGasPrice } from "./api";
import { parseEther, toQuantity } from "ethers";
import { SendCallsParams } from "../constants";
import type { WalletFee } from "@walletconnect/universal-provider";

// Demo amount the wallet fee is computed on, e.g. 50 bps of 0.001 ETH
export const WALLET_FEE_DEMO_AMOUNT = parseEther("0.001");

// The wallet fee in wei for the demo amount, or 0 when there is no fee to pay
export function getWalletFeeValue(fee?: WalletFee): bigint {
  if (!fee?.recipient || !fee.feeBps) return BigInt(0);
  return (WALLET_FEE_DEMO_AMOUNT * BigInt(fee.feeBps)) / BigInt(10000);
}

// With a wallet fee (H2b), the demo transaction pays that fee to the wallet's recipient
export async function formatTestTransaction(account: string, walletFee?: WalletFee) {
  const [namespace, reference, address] = account.split(":");
  const chainId = `${namespace}:${reference}`;

  let _nonce;
  try {
    _nonce = await apiGetAccountNonce(address, chainId);
  } catch (error) {
    throw new Error(
      `Failed to fetch nonce for address ${address} on chain ${chainId}`
    );
  }

  const nonce = encoding.sanitizeHex(encoding.numberToHex(_nonce));

  // gasPrice
  const _gasPrice = await apiGetGasPrice(chainId);
  const gasPrice = encoding.sanitizeHex(_gasPrice);

  // gasLimit
  const _gasLimit = 21000;
  const gasLimit = encoding.sanitizeHex(encoding.numberToHex(_gasLimit));

  // value
  const feeValue = getWalletFeeValue(walletFee);
  const value = feeValue > BigInt(0) ? toQuantity(feeValue) : encoding.sanitizeHex(encoding.numberToHex(0));

  const tx = {
    from: address,
    to: feeValue > BigInt(0) ? walletFee!.recipient! : address,
    data: "0x",
    nonce,
    gasPrice,
    gasLimit,
    value,
  };

  return tx;
}

export async function formatTestBatchCall(account: string) {
  const [namespace, reference, address] = account.split(":");
  // preparing calldata for batch send
  //sepolia pow faucet address
  const receiverAddress = "0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455";
  const amountToSend = toQuantity(parseEther("0.0001"));
  const calls = [
    {
      to: receiverAddress as `0x${string}`,
      data: "0x" as `0x${string}`,
      value: amountToSend as `0x${string}`,
    },
    {
      to: receiverAddress as `0x${string}`,
      data: "0x" as `0x${string}`,
      value: amountToSend as `0x${string}`,
    },
  ];
  const sendCallsRequestParams: SendCallsParams = {
    version: "1.0",
    chainId: `0x${BigInt(reference).toString(16)}`,
    from: address as `0x${string}`,
    calls: calls,
  };

  return sendCallsRequestParams;
}
