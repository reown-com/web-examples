import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import {
  NamespaceMetadata,
  ChainMetadata,
  ChainRequestRender,
  convertHexToNumber,
  convertHexToUtf8,
} from "../helpers";
import { BLOCKCHAIN_LOGO_BASE_URL } from "../constants";

export const EIP155Colors = {
  ethereum: "99, 125, 234",
  optimism: "233, 1, 1",
  goerli: "189, 174, 155",
  xdai: "73, 169, 166",
  polygon: "130, 71, 229",
  celo: "60, 203, 132",
  arbitrum: "44, 55, 75",
};

export const EIP155Metadata: NamespaceMetadata = {
  "1": {
    name: "Ethereum",
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:1.png",
    rgb: EIP155Colors.ethereum,
  },
  "5": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:5.png",
    rgb: EIP155Colors.goerli,
  },
  "10": {
    name: "Optimism",
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:10.png",
    rgb: EIP155Colors.optimism,
  },
  "42": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:42.png",
    rgb: EIP155Colors.ethereum,
  },
  "69": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:69.png",
    rgb: EIP155Colors.optimism,
  },
  "100": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:100.png",
    rgb: EIP155Colors.xdai,
  },
  "137": {
    name: "Polygon",
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:137.png",
    rgb: EIP155Colors.polygon,
  },
  "80001": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:80001.png",
    rgb: EIP155Colors.polygon,
  },
  "42161": {
    name: "Arbitrum",
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:42161.png",
    rgb: EIP155Colors.arbitrum,
  },
  "42220": {
    name: "Celo",
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:42220.png",
    rgb: EIP155Colors.celo,
  },
  "44787": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:44787.png",
    rgb: EIP155Colors.celo,
  },
  "421611": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:421611.png",
    rgb: EIP155Colors.arbitrum,
  },
};
export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = EIP155Metadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}

export function getChainRequestRender(request: JsonRpcRequest): ChainRequestRender[] {
  let params = [{ label: "Method", value: request.method }];

  switch (request.method) {
    case "eth_sendTransaction":
    case "eth_signTransaction":
      params = [
        ...params,
        { label: "From", value: request.params[0].from },
        { label: "To", value: request.params[0].to },
        {
          label: "Gas Limit",
          value: request.params[0].gas
            ? convertHexToNumber(request.params[0].gas)
            : request.params[0].gasLimit
            ? convertHexToNumber(request.params[0].gasLimit)
            : "",
        },
        {
          label: "Gas Price",
          value: convertHexToNumber(request.params[0].gasPrice),
        },
        {
          label: "Nonce",
          value: convertHexToNumber(request.params[0].nonce),
        },
        {
          label: "Value",
          value: request.params[0].value ? convertHexToNumber(request.params[0].value) : "",
        },
        { label: "Data", value: request.params[0].data },
      ];
      break;

    case "eth_sign":
      params = [
        ...params,
        { label: "Address", value: request.params[0] },
        { label: "Message", value: request.params[1] },
      ];
      break;
    case "personal_sign":
      params = [
        ...params,
        { label: "Address", value: request.params[1] },
        {
          label: "Message",
          value: convertHexToUtf8(request.params[0]),
        },
      ];
      break;
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
