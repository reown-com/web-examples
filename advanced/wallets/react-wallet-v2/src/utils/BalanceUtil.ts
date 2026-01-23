import { blockchainApiRpc } from '@/data/EIP155Data'
import { getChainData } from '@/data/chainsUtil'
import { getChainById } from '@/utils/ChainUtil'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'

export interface BalanceResult {
  balance: string
  balanceFormatted: string
  symbol: string
  icon?: string
  error?: string
}

export interface AllBalancesResult {
  native: BalanceResult
  tokens: BalanceResult[]
}

interface ChainDataWithRpc {
  rpc?: string
  fullNode?: string
  symbol?: string
}

interface TokenConfig {
  symbol: string
  decimals: number
  icon: string
  addresses: Record<number, string>
}

const TOKEN_CONFIGS: TokenConfig[] = [
  {
    symbol: 'USDC',
    decimals: 6,
    icon: '/token-logos/USDC.png',
    addresses: {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    }
  },
  {
    symbol: 'USDT',
    decimals: 6,
    icon: '/token-logos/USDT.png',
    addresses: {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    }
  }
]

interface CacheEntry {
  result: BalanceResult
  timestamp: number
}

interface AllBalancesCacheEntry {
  result: AllBalancesResult
  timestamp: number
}

const CACHE_DURATION_MS = 10000
const MAX_CACHE_SIZE = 100

class LRUCache<T> {
  private cache = new Map<string, T & { timestamp: number }>()
  private maxSize: number
  private ttl: number

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): (T & { timestamp: number }) | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const isExpired = Date.now() - entry.timestamp > this.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry
  }

  set(key: string, value: T): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, { ...value, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}

const balanceCache = new LRUCache<{ result: BalanceResult }>(MAX_CACHE_SIZE, CACHE_DURATION_MS)
const allBalancesCache = new LRUCache<{ result: AllBalancesResult }>(MAX_CACHE_SIZE, CACHE_DURATION_MS)

function getCacheKey(address: string, chainId: string): string {
  return `${chainId}:${address.toLowerCase()}`
}

function getNamespace(chainId: string): string {
  return chainId.split(':')[0]
}

function getChainIdNumber(chainId: string): number {
  return parseInt(chainId.split(':')[1], 10)
}

function getCachedBalance(address: string, chainId: string): BalanceResult | null {
  const key = getCacheKey(address, chainId)
  const entry = balanceCache.get(key)
  return entry?.result ?? null
}

function setCachedBalance(address: string, chainId: string, result: BalanceResult): void {
  const key = getCacheKey(address, chainId)
  balanceCache.set(key, { result })
}

function getRpcUrl(chainId: string): string | undefined {
  const chainData = getChainData(chainId) as ChainDataWithRpc | undefined
  if (!chainData) return undefined
  return chainData.rpc || chainData.fullNode
}

function getSymbol(chainId: string): string {
  const chainData = getChainData(chainId) as ChainDataWithRpc | undefined
  return chainData?.symbol || 'NATIVE'
}

function extractAddressFromCaip10(address: string): string {
  const parts = address.split(':')
  return parts.length >= 3 ? parts.slice(2).join(':') : address
}

async function fetchEIP155Balance(address: string, chainId: string): Promise<BalanceResult> {
  const numericChainId = getChainIdNumber(chainId)
  const chain = getChainById(numericChainId)
  const rpcUrl = getRpcUrl(chainId) || blockchainApiRpc(numericChainId)
  const symbol = getSymbol(chainId)
  
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl)
  })

  const balanceWei = await publicClient.getBalance({
    address: address as `0x${string}`
  })

  const balance = formatUnits(balanceWei, 18)
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchSolanaBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [actualAddress]
    })
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error.message)
  }

  const lamports = data.result?.value || 0
  const balance = (lamports / 1e9).toString()
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchSuiBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_getBalance',
      params: [actualAddress, '0x2::sui::SUI']
    })
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error.message)
  }

  const totalBalance = data.result?.totalBalance || '0'
  const balance = (BigInt(totalBalance) / BigInt(1e9)).toString()
  const preciseBalance = Number(totalBalance) / 1e9
  return { balance, balanceFormatted: formatBalanceValue(preciseBalance.toString()), symbol }
}

async function fetchBitcoinBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(`${rpc}/address/${actualAddress}`)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json()
  const satoshis = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0)
  const balance = (satoshis / 1e8).toString()
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchStacksBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(`${rpc}/extended/v1/address/${actualAddress}/balances`)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json()
  const microStx = data.stx?.balance || '0'
  const balance = (Number(microStx) / 1e6).toString()
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchCosmosBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(`${rpc}/cosmos/bank/v1beta1/balances/${actualAddress}`)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json()
  const atomBalance = data.balances?.find((b: { denom: string }) => b.denom === 'uatom')
  const microAtom = atomBalance?.amount || '0'
  const balance = (Number(microAtom) / 1e6).toString()
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchPolkadotBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'system_account',
      params: [actualAddress]
    })
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error.message)
  }

  const freeBalance = data.result?.data?.free || '0'
  // Handle both hex (0x...) and decimal string formats
  const planck = typeof freeBalance === 'string' && freeBalance.startsWith('0x')
    ? BigInt(freeBalance)
    : BigInt(freeBalance)
  const balance = formatUnits(planck, 10)
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchMultiversxBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(`${rpc}/accounts/${actualAddress}`)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json()
  const rawBalance = data.balance || '0'
  const balance = (Number(rawBalance) / 1e18).toString()
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchTonBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAddressBalance',
      params: { address: actualAddress }
    })
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error.message)
  }

  const nanoton = data.result || '0'
  const balance = (Number(nanoton) / 1e9).toString()
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchTezosBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(`${rpc}/chains/main/blocks/head/context/contracts/${actualAddress}/balance`)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const mutez = await response.json()
  const balance = (Number(mutez) / 1e6).toString()
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

async function fetchNearBalance(address: string, rpc: string, chainId: string): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  const actualAddress = extractAddressFromCaip10(address)
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'query',
      params: {
        request_type: 'view_account',
        finality: 'final',
        account_id: actualAddress
      }
    })
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error.message || data.error.data)
  }

  const yoctoNear = data.result?.amount || '0'
  // NEAR uses 24 decimals (yoctoNEAR)
  const balance = formatUnits(BigInt(yoctoNear), 24)
  return { balance, balanceFormatted: formatBalanceValue(balance), symbol }
}

function formatBalanceValue(balance: string): string {
  const balanceNum = parseFloat(balance)
  if (balanceNum === 0) return '0'
  if (balanceNum < 0.0001) return '<0.0001'
  return balanceNum.toFixed(4)
}

export async function fetchNativeBalance(
  address: string,
  chainId: string
): Promise<BalanceResult> {
  const symbol = getSymbol(chainId)
  
  if (!address) {
    return { balance: '0', balanceFormatted: '0', symbol, error: 'Invalid address' }
  }

  const cached = getCachedBalance(address, chainId)
  if (cached) {
    return cached
  }

  try {
    const namespace = getNamespace(chainId)
    const rpcUrl = getRpcUrl(chainId)
    let result: BalanceResult

    if (!rpcUrl && namespace !== 'eip155') {
      result = { balance: '0', balanceFormatted: 'N/A', symbol, error: 'No RPC configured' }
    } else if (namespace === 'eip155') {
      result = await fetchEIP155Balance(address, chainId)
    } else if (namespace === 'solana') {
      result = await fetchSolanaBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'sui') {
      result = await fetchSuiBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'bip122') {
      result = await fetchBitcoinBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'stacks') {
      result = await fetchStacksBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'cosmos') {
      result = await fetchCosmosBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'polkadot') {
      result = await fetchPolkadotBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'mvx') {
      result = await fetchMultiversxBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'ton') {
      result = await fetchTonBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'tezos') {
      result = await fetchTezosBalance(address, rpcUrl!, chainId)
    } else if (namespace === 'near') {
      result = await fetchNearBalance(address, rpcUrl!, chainId)
    } else {
      result = { balance: '0', balanceFormatted: 'N/A', symbol, error: 'Unsupported chain type' }
    }

    if (!result.error) {
      setCachedBalance(address, chainId, result)
    }

    return result
  } catch (error) {
    console.error(`[BalanceUtil] Failed to fetch balance for ${chainId}:`, error)
    return { balance: '0', balanceFormatted: 'Error', symbol, error: String(error) }
  }
}

export function formatBalance(balance: string, decimals: number = 4): string {
  const balanceNum = parseFloat(balance)
  if (balanceNum === 0) return '0'
  if (balanceNum < 0.0001) return '<0.0001'
  return balanceNum.toFixed(decimals)
}

async function fetchERC20Balance(
  address: string,
  chainId: number,
  tokenAddress: string,
  tokenSymbol: string,
  tokenDecimals: number,
  tokenIcon: string,
  rpcUrl: string
): Promise<BalanceResult> {
  try {
    const chain = getChainById(chainId)
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    })

    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`]
    })

    const formattedBalance = formatUnits(balance, tokenDecimals)
    return {
      balance: formattedBalance,
      balanceFormatted: formatBalanceValue(formattedBalance),
      symbol: tokenSymbol,
      icon: tokenIcon
    }
  } catch (error) {
    return {
      balance: '0',
      balanceFormatted: '0',
      symbol: tokenSymbol,
      icon: tokenIcon,
      error: String(error)
    }
  }
}

function getCachedAllBalances(address: string, chainId: string): AllBalancesResult | null {
  const key = getCacheKey(address, chainId) + ':all'
  const entry = allBalancesCache.get(key)
  return entry?.result ?? null
}

function setCachedAllBalances(address: string, chainId: string, result: AllBalancesResult): void {
  const key = getCacheKey(address, chainId) + ':all'
  allBalancesCache.set(key, { result })
}

export async function fetchAllBalances(
  address: string,
  chainId: string
): Promise<AllBalancesResult> {
  const symbol = getSymbol(chainId)
  const emptyResult: AllBalancesResult = {
    native: { balance: '0', balanceFormatted: '0', symbol, error: 'Invalid address' },
    tokens: []
  }
  
  if (!address) {
    return emptyResult
  }

  const cached = getCachedAllBalances(address, chainId)
  if (cached) {
    return cached
  }

  const namespace = getNamespace(chainId)

  if (namespace !== 'eip155') {
    const nativeBalance = await fetchNativeBalance(address, chainId)
    return { native: nativeBalance, tokens: [] }
  }

  const numericChainId = getChainIdNumber(chainId)
  const rpcUrl = getRpcUrl(chainId) || blockchainApiRpc(numericChainId)

  const nativeBalance = await fetchNativeBalance(address, chainId)

  const tokenPromises = TOKEN_CONFIGS
    .filter(token => token.addresses[numericChainId])
    .map(token =>
      fetchERC20Balance(
        address,
        numericChainId,
        token.addresses[numericChainId],
        token.symbol,
        token.decimals,
        token.icon,
        rpcUrl
      )
    )

  const tokenBalances = await Promise.all(tokenPromises)

  const result: AllBalancesResult = {
    native: nativeBalance,
    tokens: tokenBalances.filter(t => !t.error)
  }

  setCachedAllBalances(address, chainId, result)

  return result
}
