import { NamespaceMetadata, ChainMetadata } from "../helpers";

export const SolanaMetadata: NamespaceMetadata = {
  // Solana Mainnet
  "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ": {
    logo: "/solana_logo.png",
    rgb: "0, 0, 0",
  },
  // Solana Devnet
  "8E9rvCKLFQia2Y35HXjjpWzj8weVo44K": {
    logo: "/solana_logo.png",
    rgb: "0, 0, 0",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = SolanaMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
