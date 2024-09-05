import { createPublicClient, decodeFunctionData, erc20Abi, getContract, Hex, http } from "viem";
import { baseSepolia, optimismSepolia, sepolia } from "viem/chains";
import { getChainById } from "./ChainUtil";
import { useMemo, useState } from "react";
import { SignClientTypes } from '@walletconnect/types'


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

export function getCrossChainTokens(address: Hex): Record<number, Hex> | undefined {
    const otherTokens: Record<number, Hex> = {};

    for (const asset in supportedAssets) {
        for (const chainId in supportedAssets[asset]) {
        if (supportedAssets[asset][chainId] === address) {
            continue;
        }
        otherTokens[chainId] = supportedAssets[asset][chainId];
        }
    }
    return Object.keys(otherTokens).length > 0 ? otherTokens : undefined;
}


export function getAssetByContractAddress(address: Hex): string {
    for (const [asset, chains] of Object.entries(supportedAssets)) {
      for (const contractAddress of Object.values(chains)) {
        if (contractAddress.toLowerCase() === address.toLowerCase()) {
          return asset;
        }
      }
    }
    throw new Error('Asset not found for the given contract address');
  }
  

export async function getErc20TokenBalance(tokenAddress: Hex, chainId: number, account: Hex, convert: boolean = true): Promise<number> {
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
    if (!convert) {
        return Number(result)
    }
    const decimals = await contract.read.decimals()
    const balance = BigInt(result) / BigInt(10 ** decimals);
    return Number(balance)
}

type Erc20Transfer = {
    from: Hex
    to: Hex
    contract: Hex
    amount: number
}

export function decodeErc20Transaction({data, from, to}: {data: string, from: string, to:string}): Erc20Transfer | null{
    const { functionName, args } = decodeFunctionData({
        abi: erc20Abi,
        data: data as Hex
    })    
    if (functionName !== 'transfer') {
        return null
    }
    return {
        to: args[0],
        contract: to as Hex,
        amount: Number(args[1]),
        from: from as Hex
    }
}


export function useMultibridge() {
    const [request, setRequest] = useState<SignClientTypes.EventArguments['session_request']>()
    const shouldUseMultibridge = useMemo(async() => {
        if (!request) {
            return false
        }
        const transfer = decodeErc20Transaction(request.params.request.params[0])
          if (!transfer) {
            // request is not erc20 transfer, open regular view
            return false
          }
          const chainId = request.params.chainId.split(':')[1]
          const tokenBalance = await getErc20TokenBalance(transfer.contract,Number(chainId),transfer.from, false)
          if (transfer.amount <= tokenBalance) {
            return false
          }
          const otherTokens = getCrossChainTokens(transfer.contract)
            let otherBalance = 0
            for (const chain in otherTokens) {
              const balance = await getErc20TokenBalance(otherTokens[Number(chain)],Number(chain),transfer.from, false)
              otherBalance += balance
            }
            console.log({otherBalance});
            if (transfer.amount <= otherBalance) {
                return false
            }
            return true
    },[request])
    
    return {
        shouldUseMultibridge,
        setRequest
    }
}

export function useTokenBalance(tokenAddress: Hex, chainId: number, account: Hex, convert: boolean = true){
    const getBalance = useMemo(async () =>{
        const tokenBalance = await getErc20TokenBalance(tokenAddress,Number(chainId),account, convert)

    },[tokenAddress, chainId, account, convert])

    return {
        getBalance
    }
}