import { GrantPermissionsParameters } from "viem/experimental";
import {
  abi as donutContractAbi,
  address as donutContractAddress,
} from "./DonutContract";
import { parseEther } from "viem";

export const assetsToAllocate = [
  { value: "eth", label: "ETH", supported: true },
  { value: "usdc", label: "USDC", supported: false },
  { value: "arb", label: "ARB", supported: false },
  { value: "op", label: "OP", supported: false },
];
export const assetsToBuy = [
  { value: "donut", label: "DONUT", supported: true },
  { value: "usdc", label: "USDC", supported: false },
];

export const intervalOptions = [
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
];

export function getSampleAsyncDCAPermissions(
  keys: string[],
): GrantPermissionsParameters {
  return {
    expiry: Date.now() + 24 * 60 * 60,
    permissions: [
      {
        type: {
          custom: "donut-purchase",
        },
        data: {
          target: donutContractAddress,
          abi: donutContractAbi,
          valueLimit: parseEther("10").toString(),
          functionName: "purchase(uint256)",
        },
        policies: [],
      },
    ],
    signer: {
      type: "keys",
      data: {
        ids: keys,
      },
    },
  };
}

// Helper function to calculate interval in milliseconds
export function calculateInterval(
  investmentInterval: number,
  intervalUnit: string,
): number {
  const unitToMilliseconds: Record<string, number> = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
  };

  return investmentInterval * (unitToMilliseconds[intervalUnit] || 0);
}
