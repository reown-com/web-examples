import { TronWeb } from "tronweb";
let tronWebMainnet: TronWeb;
let tronWebNile: TronWeb;
let tronWebShasta: TronWeb;

export const TRON_TEST_CONTRACTS: Record<string, string> = {
  "tron:0xcd8690dc": "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf",
  "tron:0x94a9059e": "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs",
};

export const TRON_MAINNET_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export const getTronWeb = (network: string) => {
  if (network === "tron:0xcd8690dc") {
    if (!tronWebNile) {
      tronWebNile = new TronWeb({
        fullHost: "https://nile.trongrid.io/",
      });
    }
    return tronWebNile;
  }
  if (network === "tron:0x94a9059e") {
    if (!tronWebShasta) {
      tronWebShasta = new TronWeb({
        fullHost: "https://api.shasta.trongrid.io",
      });
    }
    return tronWebShasta;
  }
  if (network === "tron:0x2b6653dc") {
    if (!tronWebMainnet) {
      tronWebMainnet = new TronWeb({
        fullHost: "https://api.trongrid.io/",
      });
    }
    return tronWebMainnet;
  }
  return undefined;
};
