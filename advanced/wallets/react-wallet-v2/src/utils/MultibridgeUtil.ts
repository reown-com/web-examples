import { createPublicClient, decodeFunctionData, erc20Abi, getContract, Hex, http } from 'viem'
import { arbitrum, base, optimism} from 'viem/chains'
import { getChainById } from './ChainUtil'
import EIP155Lib from '@/lib/EIP155Lib'
import { SmartAccountLib } from '@/lib/smart-accounts/SmartAccountLib'
import { providers } from 'ethers'

const BASE_URL = 'https://api.socket.tech/v2'

export const supportedAssets: Record<string, Record<number, Hex>> = {
  USDC: {
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [optimism.id]: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  }
} as const

export const supportedChains = [base, optimism, arbitrum] as const

export function getCrossChainTokens(address: Hex): Record<number, Hex> | undefined {
  const otherTokens: Record<number, Hex> = {}

  for (const asset in supportedAssets) {
    for (const chainId in supportedAssets[asset]) {
      if (supportedAssets[asset][chainId] === address) {
        continue
      }
      otherTokens[chainId] = supportedAssets[asset][chainId]
    }
  }
  return Object.keys(otherTokens).length > 0 ? otherTokens : undefined
}

export function getAssetByContractAddress(address: Hex): string {
  for (const [asset, chains] of Object.entries(supportedAssets)) {
    for (const contractAddress of Object.values(chains)) {
      if (contractAddress.toLowerCase() === address.toLowerCase()) {
        return asset
      }
    }
  }
  throw new Error('Asset not found for the given contract address')
}

export async function getErc20TokenBalance(
  tokenAddress: Hex,
  chainId: number,
  account: Hex,
  convert: boolean = true
): Promise<number> {
  const publicClient = createPublicClient({
    chain: getChainById(chainId),
    transport: http()
  })
  const contract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: publicClient
  })
  const result = await contract.read.balanceOf([account])
  if (!convert) {
    return Number(result)
  }
  const decimals = await contract.read.decimals()
  const balance = BigInt(result) / BigInt(10 ** decimals)
  return Number(balance)
}

type Erc20Transfer = {
  from: Hex
  to: Hex
  contract: Hex
  amount: number
}

export function decodeErc20Transaction({
  data,
  from,
  to
}: {
  data: string
  from: string
  to: string
}): Erc20Transfer | null {
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

async function sendSocketRequest(method: "GET" | "POST", endpoint: string, body?: any): Promise<any> {
    const url = new URL(`${BASE_URL}/${endpoint}`);

    const API_KEY = process.env['NEXT_PUBLIC_SOCKET_KEY']
    if (!API_KEY) {
        throw new Error('Socket API key is not set up')
    }
    const headers: any = {
        'API-KEY': API_KEY,
        Accept: 'application/json'
      }
      if (method === 'POST') {
        headers['Content-Type'] = 'application/json'
      }
    const response = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });
    if (response.status >= 300) {
        throw new Error('Unable to send request to Socket')
    }
  
    const json = await response.json();
    return json;
  }
  

interface BridgingParams {
  fromChainId: number
  toChainId: number
  fromAssetAddress: string
  toAssetAddress: string
  amount: number
  userAddress: string
  uniqueRoutesPerBridge?: boolean
  sort?: 'output' | 'gas' | 'time'
  singleTxOnly?: boolean
}

async function getQuote(params: BridgingParams): Promise<any> {
  const urlParams = new URLSearchParams()
  urlParams.set('fromChainId', params.fromChainId.toString())
  urlParams.set('fromTokenAddress', params.fromAssetAddress)
  urlParams.set('toChainId', params.toChainId.toString())
  urlParams.set('toTokenAddress', params.toAssetAddress)
  urlParams.set('fromAmount', params.amount.toString())
  urlParams.set('userAddress', params.userAddress)
  if (params.uniqueRoutesPerBridge !== undefined) {
    urlParams.set('uniqueRoutesPerBridge', params.uniqueRoutesPerBridge.toString())
  }
  if (params.sort !== undefined) {
    urlParams.set('sort', params.sort)
  }
  if (params.singleTxOnly !== undefined) {
    urlParams.set('singleTxOnly', params.singleTxOnly.toString())
  }

  const json = await sendSocketRequest('GET', `quote?${urlParams.toString()}`)
  return json
}

async function getRouteTransactionData(route: any): Promise<any> {
  const json = await sendSocketRequest('POST', 'build-tx', {route})
  return json
}

interface AllowanceCheckParams {
  chainId: number
  owner: string
  allowanceTarget: number 
  tokenAddress: string
}

async function checkAllowance(params: AllowanceCheckParams): Promise<any> {
  const urlParams = new URLSearchParams()
  urlParams.set('chainID', params.chainId.toString())
  urlParams.set('owner', params.owner)
  urlParams.set('allowanceTarget', params.allowanceTarget.toString()) 
  urlParams.set('tokenAddress', params.tokenAddress)

  const json = await sendSocketRequest('GET', `approval/check-allowance?${urlParams.toString()}`)
  return json
}

interface ApprovalTransactionParams {
  chainId: number
  owner: string
  allowanceTarget: number 
  tokenAddress: string
  amount: number 
}

async function getApprovalTransactionData(params: ApprovalTransactionParams): Promise<any> {
  const urlParams = new URLSearchParams()
  urlParams.set('chainID', params.chainId.toString())
  urlParams.set('owner', params.owner)
  urlParams.set('allowanceTarget', params.allowanceTarget.toString())
  urlParams.set('tokenAddress', params.tokenAddress)
  urlParams.set('amount', params.amount.toString())

  const json = await sendSocketRequest('GET', `approval/build-tx?${urlParams.toString()}`)
  return json
}

interface BridgeStatusParams {
  transactionHash: string
  fromChainId: number
  toChainId: number
}

async function getBridgeStatus(params: BridgeStatusParams): Promise<any> {
  const urlParams = new URLSearchParams()
  urlParams.set('transactionHash', params.transactionHash)
  urlParams.set('fromChainId', params.fromChainId.toString())
  urlParams.set('toChainId', params.toChainId.toString())

  const json = await sendSocketRequest('GET', `bridge-status?${urlParams.toString()}`)
  return json
}


export async function bridgeFunds(bridgingParams: BridgingParams, wallet: EIP155Lib | SmartAccountLib, provider: providers.JsonRpcProvider): Promise<any> {
    console.log('Bridging funds');
    const quote = await getQuote(bridgingParams)
    console.log('Fetched quote', quote);

    const route = quote.result.routes[0];
    if (!route) {
        throw new Error("No routes found");
    }
    const apiReturnData = await getRouteTransactionData(route);
    const approvalData = apiReturnData.result.approvalData;
    const { allowanceTarget, minimumApprovalAmount } = approvalData;

    console.log({approvalData});
    // approvalData from apiReturnData is null for native tokens
    // Values are returned for ERC20 tokens but token allowance needs to be checked
    if (approvalData !== null) {
        // Fetches token allowance given to Bungee contracts
        const allowanceCheckStatus = await checkAllowance({
            chainId: bridgingParams.fromChainId,
            owner: bridgingParams.userAddress,
            allowanceTarget,
            tokenAddress: bridgingParams.fromAssetAddress 
        });
        const allowanceValue = allowanceCheckStatus.result?.value;
        console.log('Allowance value', allowanceValue);
        if (minimumApprovalAmount > allowanceValue) {
            console.log('Bungee contracts don\'t have sufficient allowance');
            const approvalTransactionData = await getApprovalTransactionData({
                chainId: bridgingParams.fromChainId,
                owner: bridgingParams.userAddress,
                allowanceTarget,
                tokenAddress: bridgingParams.fromAssetAddress,
                amount: bridgingParams.amount
            });
            console.log('Approval transaction fetched',approvalTransactionData);
        }
        

    }
    
    
}