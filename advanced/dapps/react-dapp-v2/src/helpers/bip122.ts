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
  return await (
    await fetch(`https://mempool.space/testnet/api/address/${address}/utxo`)
  ).json();
}

export function getAvailableBalanceFromUtxos(utxos: any[]) {
  if (!utxos || !utxos.length) {
    return 0;
  }
  return utxos.reduce((acc, { value }) => acc + value, 0);
}

export function calculateChange(
  utxos: any[],
  amount: number,
  feeRate: number
): number {
  const inputSum = utxos.reduce((sum, utxo) => sum + utxo.value, 0); // Sum of all UTXO values
  const estimatedSize = 10 + 148 * utxos.length + 34 * 2; // Rough estimate of transaction size
  const fee = estimatedSize * feeRate; // Transaction fee
  const change = inputSum - amount - fee; // Calculate change
  return change;
}
