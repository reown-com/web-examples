import * as encoding from "@walletconnect/encoding";

import { apiGetAccountNonce, apiGetGasPrice } from "./api";

export async function getGasPrice(chainId: string): Promise<string> {
  const gasPrice = await apiGetGasPrice(chainId);
  return gasPrice;
}

export async function formatTestTransaction(account: string) {
  const [namespace, reference, address] = account.split(":");
  const chainId = `${namespace}:${reference}`;
  // nonce
  const _nonce = await apiGetAccountNonce(address, chainId);

  const nonce = encoding.sanitizeHex(encoding.numberToHex(_nonce));

  // gasPrice
  const _gasPrice = await getGasPrice(chainId);
  const gasPrice = encoding.sanitizeHex(_gasPrice);

  // gasLimit
  const _gasLimit = 21000;
  const gasLimit = encoding.sanitizeHex(encoding.numberToHex(_gasLimit));

  // value
  const _value = 0;
  const value = encoding.sanitizeHex(encoding.numberToHex(_value));

  const tx = { from: address, to: address, data: "0x", nonce, gasPrice, gasLimit, value };

  return tx;
}
