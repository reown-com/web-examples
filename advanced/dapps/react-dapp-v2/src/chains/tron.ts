import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

/**
 * TRON Chains & Metadata (CAIP-2 Specification)
 *
 * Aligned with the CASA CAIP-2 specification for the TRON namespace:
 * https://github.com/ChainAgnostic/namespaces
 *
 * Canonical TRON chain references use decimal representation:
 * - Mainnet: tron:728126428 (legacy: tron:0x2b6653dc)
 * - Nile:    tron:3448148188 (legacy: tron:0xcd8690dc)
 * - Shasta:  tron:2494104990 (legacy: tron:0x94a9059e)
 *
 * Matches TRON's ethereum-lists/chains registration and TRON ecosystem conventions.
 */
export const TronChainData: ChainsMap = {
  "728126428": {
    id: "tron:728126428",
    name: "Tron Mainnet",
    rpc: [],
    slip44: 195,
    testnet: false,
  },
  "3448148188": {
    id: "tron:3448148188",
    name: "Tron Testnet (Nile)",
    rpc: [],
    slip44: 195,
    testnet: true,
  },
  "2494104990": {
    id: "tron:2494104990",
    name: "Tron Testnet (Shasta)",
    rpc: [],
    slip44: 195,
    testnet: true,
  },
};

export const TronMetadata: NamespaceMetadata = {
  // Tron Mainnet
  "728126428": {
    logo: "/assets/tron.png",
    rgb: "183, 62, 49",
  },
  // Tron Testnet (Nile)
  "3448148188": {
    logo: "/assets/tron.png",
    rgb: "183, 62, 49",
  },
  // Tron Shasta Testnet
  "2494104990": {
    logo: "/assets/tron.png",
    rgb: "183, 62, 49",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = TronMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
