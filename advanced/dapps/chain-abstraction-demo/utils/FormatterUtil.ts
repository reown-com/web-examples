export const formatBalance = (balance: bigint, decimals: number): string => {
  const value = Number(balance) / Math.pow(10, decimals);
  if (value >= 0.01) return value.toFixed(2);
  const significantDecimals = Math.min(6, decimals);
  return value.toFixed(significantDecimals).replace(/\.?0+$/, "");
};

export const convertChainIdToHex = (chainId: number): `0x${string}` => {
  return `0x${parseInt(chainId.toString()).toString(16)}` as `0x${string}`;
};
