import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const BtcChainData: ChainsMap = {
  "000000000933ea01ad0ee984209779ba": {
    id: "bip122:000000000933ea01ad0ee984209779ba",
    name: "BTC Testnet",
    rpc: [],
    slip44: 501,
    testnet: true,
  },
};

export const BtcMetadata: NamespaceMetadata = {
  "000000000933ea01ad0ee984209779ba": {
    logo: "/assets/btc-testnet.png",
    rgb: "247, 147, 25",
  },
};

// "Non conforming namespaces. approve() namespaces chains don't satisfy required namespaces.
//       Required: bip122:000000000019d6689c085ae165831e93
//       Approved: xrpl:1,eip155:114,eip155:16,eip155:11155111,eip155:97,eip155:80002,eip155:4002,eip155:421614,eip155:11155420,eip155:51,eip155:84532,bip122:000000000933ea01ad0ee984209779ba,bip122:4966625a4b2851d9fdee139e56211a0d,bip122:bb0a78264637406b6360aad926284d54"

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = BtcMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
