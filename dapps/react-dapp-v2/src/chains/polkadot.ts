import { BLOCKCHAIN_LOGO_BASE_URL } from "../constants";
import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";
import {
  NamespaceMetadata,
  ChainMetadata,
  ChainRequestRender,
  ChainsMap,
} from "../helpers";

export const PolkadotChainData: ChainsMap = {
  ["91b171bb158e2d3848fa23a9f1c25182"]: {
    id: "polkadot:91b171bb158e2d3848fa23a9f1c25182",
    name: "Polkadot Mainnet",
    rpc: ["wss://rpc.polkadot.io"],
    slip44: 0,
    testnet: false,
  },
  ["e143f23803ac50e8f6f8e62695d1ce9e"]: {
    id: "polkadot:e143f23803ac50e8f6f8e62695d1ce9e",
    name: "Polkadot Testnet (Westend)",
    rpc: ["wss://westend-rpc.polkadot.io"],
    slip44: 0,
    testnet: false,
  },
};

export const PolkadotMetadata: NamespaceMetadata = {
  // eslint-disable-next-line no-useless-computed-key
  ["91b171bb158e2d3848fa23a9f1c25182"]: {
    logo:
      BLOCKCHAIN_LOGO_BASE_URL +
      "polkadot:91b171bb158e2d3848fa23a9f1c25182.png",
    rgb: "230, 1, 122",
  },
  ["e143f23803ac50e8f6f8e62695d1ce9e"]: {
    logo: "/assets/westend-logo.svg",
    rgb: "218, 104, 167",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = PolkadotMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}

export function getChainRequestRender(
  request: JsonRpcRequest
): ChainRequestRender[] {
  let params = [{ label: "Method", value: request.method }];

  switch (request.method) {
    default:
      params = [
        ...params,
        {
          label: "params",
          value: JSON.stringify(request.params, null, "\t"),
        },
      ];
      break;
  }
  return params;
}
