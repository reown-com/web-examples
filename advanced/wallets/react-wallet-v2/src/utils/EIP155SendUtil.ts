import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import SettingsStore from '@/store/SettingsStore'
import { TOKEN_CONFIGS } from '@/utils/BalanceUtil'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import { providers } from 'ethers'
import { encodeFunctionData, erc20Abi, isAddress, parseUnits } from 'viem'

export interface Erc20TokenOption {
  address: string
  symbol: string
  decimals: number
}

export interface SendErc20Args {
  /** CAIP-2 chain id, e.g. `eip155:8453` */
  chainId: string
  /** ERC-20 contract address */
  token: string
  /** Recipient address */
  to: string
  /** Amount in human units, e.g. `1.5` */
  amount: string
}

export interface SendErc20Result {
  hash: string
}

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/

/**
 * ERC-20 tokens this wallet knows how to send on a given chain. Derived from the
 * balance overview config so the send screen can never offer a token the wallet
 * cannot display.
 */
export function getErc20TokensForChain(chainId: string): Erc20TokenOption[] {
  const numericChainId = Number(chainId.split(':')[1])
  if (!Number.isFinite(numericChainId)) {
    return []
  }

  return TOKEN_CONFIGS.filter(token => Boolean(token.addresses[numericChainId])).map(token => ({
    address: token.addresses[numericChainId],
    symbol: token.symbol,
    decimals: token.decimals
  }))
}

function findToken(chainId: string, token: string): Erc20TokenOption | undefined {
  return getErc20TokensForChain(chainId).find(
    option => option.address.toLowerCase() === token.toLowerCase()
  )
}

/**
 * Transfer an ERC-20 token from the active EOA to an arbitrary address.
 * Resolves as soon as the transaction is broadcast - callers that need
 * confirmation should poll the hash themselves.
 */
export async function sendErc20({
  chainId,
  token,
  to,
  amount
}: SendErc20Args): Promise<SendErc20Result> {
  const chain = EIP155_CHAINS[chainId as TEIP155Chain]
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }

  const tokenOption = findToken(chainId, token)
  if (!tokenOption) {
    throw new Error(`Unsupported token ${token} on ${chainId}`)
  }

  if (!isAddress(to)) {
    throw new Error(`Invalid recipient address: ${to}`)
  }

  if (!AMOUNT_PATTERN.test(amount)) {
    throw new Error(`Invalid amount: ${amount}`)
  }

  const value = parseUnits(amount, tokenOption.decimals)
  if (value <= BigInt(0)) {
    throw new Error('Amount must be greater than zero')
  }

  const { eip155Address } = SettingsStore.state
  const wallet = eip155Wallets[eip155Address]
  if (!wallet) {
    throw new Error('Wallet is not initialized')
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to as `0x${string}`, value]
  })

  const provider = new providers.JsonRpcProvider(chain.rpc)
  const connectedWallet = wallet.connect(provider)
  const txResponse = await connectedWallet.sendTransaction({
    to: tokenOption.address,
    value: '0x0',
    data
  })

  return { hash: txResponse.hash }
}
