import * as viemChains from "viem/chains";

if (!process.env["NEXT_PUBLIC_PROJECT_ID"]) {
  throw new Error("NEXT_PUBLIC_PROJECT_ID is required");
}

function getBlockchainApiRpcUrl(chainId: number) {
  return `https://rpc.walletconnect.org/v1/?chainId=eip155:${chainId}&projectId=${process.env["NEXT_PUBLIC_PROJECT_ID"]}`;
}

export const baseSepolia = {
  chainId: 84532,
  name: "Base Sepolia",
  currency: "BASE",
  explorerUrl: "https://sepolia.basescan.org",
  rpcUrl: getBlockchainApiRpcUrl(84532),
};

export function getChain(id: number) {
  const chains = Object.values(viemChains) as viemChains.Chain[];

  return chains.find((x) => x.id === id);
}
