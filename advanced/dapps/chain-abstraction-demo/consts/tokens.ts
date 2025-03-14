import { Hex } from "viem";

export const usdcTokenAddresses: Record<number, Hex> = {
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Optimism
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
};
export const usdtTokenAddresses: Record<number, Hex> = {
  42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // Arbitrum
  10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // Optimism
  // 8453: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // Base - No liqiduty
};

export const usdsTokenAddresses: Record<number, Hex> = {
  // 42161: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // Arbitrum - Not supported
  // 10: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // Optimism - Not supported
  8453: "0x820c137fa70c8691f0e44dc420a5e53c168921dc", // Base
};

export const tokenAddresses: Record<string, Record<string, Hex>> = {
  USDC: usdcTokenAddresses,
  USDT: usdtTokenAddresses,
  USDS: usdsTokenAddresses,
};

export const getSupportedNetworks = (token: string): number[] => {
  const tokenNetworks = tokenAddresses[token];
  if (!tokenNetworks) {
    throw new Error(`Token ${token} not found`);
  }

  return Object.keys(tokenNetworks).map(Number);
};
