import { createPublicClient, erc20Abi, getContract, Hex, http } from "viem";
import { baseSepolia, optimismSepolia, sepolia } from "viem/chains";
import { getChainById } from "./ChainUtil";


// FAKE USDC 0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8
// REAL USDC 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
export const supportedAssets: Record<string,Record<number,Hex>> = {
    'USDC': {
        [sepolia.id] : '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
        [optimismSepolia.id] : '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
        [baseSepolia.id] : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
    }
} as const

export const supportedChains = [
    sepolia,
    baseSepolia,
    optimismSepolia,
] as const


export async function getErc20TokenBalance(tokenAddress: Hex, chainId: number, account: Hex): Promise<number> {
    const publicClient = createPublicClient({
        chain: getChainById(chainId),
        transport: http(),
    })
    const contract = getContract({
        address: tokenAddress,
        abi: erc20Abi,
        client: publicClient,
    })
    const result = await contract.read.balanceOf([
        account
    ])
    const decimals = await contract.read.decimals()
    const balance = BigInt(result) / BigInt(10 ** decimals);
    return Number(balance)
}


