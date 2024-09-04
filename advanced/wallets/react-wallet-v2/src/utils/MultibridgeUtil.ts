import { arbitrumSepolia, baseSepolia, optimismSepolia, polygonMumbai, sepolia } from "viem/chains";

export const supportedChains = [
    sepolia,
    baseSepolia,
    optimismSepolia,
    polygonMumbai,
] as const