import { createPublicClient, decodeFunctionData, erc20Abi, getContract, Hex, http } from 'viem'
import { arbitrum, base, optimism} from 'viem/chains'
import { getChainById } from './ChainUtil'
import EIP155Lib from '@/lib/EIP155Lib'
import { SmartAccountLib } from '@/lib/smart-accounts/SmartAccountLib'
import { providers } from 'ethers'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'

const BASE_URL = 'https://api.socket.tech/v2'
const WHITELIST_BRIDGES = 'across'
const AMOUNT_MULTIPLIER = 1.05

export const supportedAssets: Record<string, Record<number, Hex>> = {
  USDC: {
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [optimism.id]: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  }
} as const

const assetDecimals: Record<string, number> = {
    'USDC': 6
}

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

export function convertTokenBalance(asset: string, amount: number): number {
    const decimals = assetDecimals[asset]
    if (!decimals) {
        throw new Error('Asset not supported')
    }
    const balance = amount / (10**decimals)
    return balance
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

export type BridgingRequest = {
    transfer: Erc20Transfer,
    sourceChain: number,
    targetChain: number,
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
  urlParams.set('includeBridges',WHITELIST_BRIDGES)
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


export async function bridgeFunds(bridgingParams: BridgingParams, wallet: EIP155Lib | SmartAccountLib): Promise<void> {
    performance.mark('startGetQuote')
    console.log('Bridging funds', bridgingParams);
    const originalAmount = bridgingParams.amount
    bridgingParams.amount = Math.round(originalAmount*AMOUNT_MULTIPLIER)
    const quote = await getQuote(bridgingParams)
    performance.mark('endGetQuote')
    console.log('Fetched quote', quote);

    const route = quote.result.routes[0];
    if (!route) {
        throw new Error("No routes found");
    }
    performance.mark('startGetRouteTransactionData')
    const apiReturnData = await getRouteTransactionData(route);
    performance.mark('endGetRouteTransactionData')
    const approvalData = apiReturnData.result.approvalData;
    const { allowanceTarget, minimumApprovalAmount } = approvalData;
    performance.mark('startGetWalletAddress')
    const sourceChainProvider = new providers.JsonRpcProvider(EIP155_CHAINS[`eip155:${bridgingParams.fromChainId}` as TEIP155Chain].rpc)
    const sourceChainConnectedWallet = await wallet.connect(sourceChainProvider)
    const walletAddress = wallet.getAddress()
    performance.mark('endGetWalletAddress')
    console.log({approvalData});
    let currentNonce = await sourceChainProvider.getTransactionCount(walletAddress)
    // approvalData from apiReturnData is null for native tokens
    // Values are returned for ERC20 tokens but token allowance needs to be checked
    if (approvalData !== null) {
        // Fetches token allowance given to Bungee contracts
        performance.mark('startCheckAllowance')
        const allowanceCheckStatus = await checkAllowance({
            chainId: bridgingParams.fromChainId,
            owner: bridgingParams.userAddress,
            allowanceTarget,
            tokenAddress: bridgingParams.fromAssetAddress 
        });
        performance.mark('endCheckAllowance')
        const allowanceValue = allowanceCheckStatus.result?.value;
        console.log('Allowance value', allowanceValue);
        if (minimumApprovalAmount > allowanceValue) {
            console.log('Bungee contracts don\'t have sufficient allowance');
            performance.mark('startGetApprovalTransactionData')
            const approvalTransactionData = await getApprovalTransactionData({
                chainId: bridgingParams.fromChainId,
                owner: bridgingParams.userAddress,
                allowanceTarget,
                tokenAddress: bridgingParams.fromAssetAddress,
                amount: bridgingParams.amount
            });
            performance.mark('endGetApprovalTransactionData')
            performance.mark('startApprovalTransactionGasEstimate')
            const gasPrice = sourceChainProvider.getGasPrice()
            const gasEstimate = await sourceChainProvider.estimateGas({
                from: walletAddress,
                to: approvalTransactionData.result?.to,
                value: "0x00",
                data: approvalTransactionData.result?.data,
                gasPrice: gasPrice,
            });
            performance.mark('endApprovalTransactionGasEstimate')

            performance.mark('startApprovalTransactionSend')
            const hash = await sourceChainConnectedWallet.sendTransaction({
                from: approvalTransactionData.result?.from,
                to: approvalTransactionData.result?.to,
                value: "0x00",
                data: approvalTransactionData.result?.data,
                gasPrice: gasPrice,
                gasLimit: gasEstimate,
                nonce: currentNonce,
            })
            const receipt = typeof hash === 'string' ? hash : hash?.hash
            performance.mark('endApprovalTransactionSend')
            console.log("Approval Transaction", {receipt});
            currentNonce++
        }
    }
   
    performance.mark('startBridgingTransactionGasEstimate')
    const gasPrice = await sourceChainProvider.getGasPrice();
    let gasEstimate = BigInt('0x029a6b')*BigInt(4)
    try {
        const res = await sourceChainProvider.estimateGas({
            from: walletAddress,
            to: apiReturnData.result.txTarget,
            value: apiReturnData.result.value,
            data: apiReturnData.result.txData,
            gasPrice: gasPrice,
        });
        gasEstimate = BigInt(res.toNumber())
        console.log('Gas Estimate', gasEstimate);
    } catch{
        console.log('Failed gas estimate. Using default with 4x increase');
    }
    performance.mark('endBridgingTransactionGasEstimate')

    performance.mark('startBridgingTransactionSend')
    const hash = await sourceChainConnectedWallet.sendTransaction({
        from: walletAddress,
        to: apiReturnData.result.txTarget,
        data: apiReturnData.result.txData,
        value: apiReturnData.result.value,
        gasPrice: gasPrice,
        gasLimit: gasEstimate,
        nonce: currentNonce
    });
    const receipt = typeof hash === 'string' ? hash : hash?.hash
    console.log("Bridging Transaction : ", {receipt});
    performance.mark('endBridgingTransactionSend')

    performance.mark('startBridgingTransactionCheck')
    let interations = 0
    while (interations < 20) {
        const balance = await getErc20TokenBalance(bridgingParams.toAssetAddress as Hex,bridgingParams.toChainId, walletAddress as Hex, false)
        console.log('Checking destination address',{balance, originalAmount});
        
        if (balance >= originalAmount) {
          console.log('Bridging completed');
          performance.mark('endBridgingTransactionCheck')
          printMeasurements()
          return
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        interations++
    }
}

function printMeasurements(){
  console.log(`Total duration: ${performance.measure('total-duration','startGetQuote','endBridgingTransactionCheck').duration} ms`);
  console.log(`Get quote: ${performance.measure('get-quote','startGetQuote','endGetQuote').duration} ms`);
  console.log(`Get Route Transaction Data: ${performance.measure('get-route-transaction','startGetRouteTransactionData','endGetRouteTransactionData').duration} ms`);
  console.log(`Get Wallet Address: ${performance.measure('get-wallet-address','startGetWalletAddress','endGetWalletAddress').duration} ms`);
  console.log(`Check Allowance: ${performance.measure('check-allowance','startCheckAllowance','endCheckAllowance').duration} ms`);
  console.log(`Get Approval Transaction Data: ${performance.measure('get-approval-tx-data','startGetApprovalTransactionData','endGetApprovalTransactionData').duration} ms`);
  console.log(`Get Approval Transaction Gas Estimate: ${performance.measure('get-approval-tx-gas-estimate','startApprovalTransactionGasEstimate','endApprovalTransactionGasEstimate').duration} ms`);
  console.log(`Approval transaction send: ${performance.measure('approval-transaction-send','startApprovalTransactionSend','endApprovalTransactionSend').duration} ms`);
  console.log(`Bridging transaction gas estimate: ${performance.measure('bridging-tx-gas-estimate','startBridgingTransactionGasEstimate','endBridgingTransactionGasEstimate').duration} ms`);
  console.log(`Bridging transaction send: ${performance.measure('bridging-tx-send','startBridgingTransactionSend','endBridgingTransactionSend').duration} ms`);
  console.log(`Bridging transaction check: ${performance.measure('bridging-tx-check','startBridgingTransactionCheck','endBridgingTransactionCheck').duration} ms`);
}