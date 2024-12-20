import { Hex } from "viem";

export const usdcTokenAddresses: Record<number, Hex> = {
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Optimism
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
};

export const tokenAddresses: Record<string, Record<string, Hex>> = {
  USDC: usdcTokenAddresses,
};
