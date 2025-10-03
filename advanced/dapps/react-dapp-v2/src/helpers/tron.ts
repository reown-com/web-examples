import { TronWeb } from "tronweb";
let tronWebMainnet: TronWeb;
let tronWebTestnet: TronWeb;
export const getTronWeb = (network: string) => {
  if (network === "tron:0xcd8690dc") {
    if (!tronWebTestnet) {
      tronWebTestnet = new TronWeb({
        fullHost: "https://nile.trongrid.io/",
      });
      return tronWebTestnet;
    }
  }
  if (network === "tron:0x2b6653dc") {
    if (!tronWebMainnet) {
      tronWebMainnet = new TronWeb({
        fullHost: "https://api.trongrid.io/",
      });
      return tronWebMainnet;
    }
  }
};
