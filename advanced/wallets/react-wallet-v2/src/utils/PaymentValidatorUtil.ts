import { getChainData } from '@/data/chainsUtil'
import {
  type PaymentOption,
  type DetailedPaymentOption,
  Hex,
  SolanaContractInteraction
} from '@/types/wallet_checkout'
import { createPublicClient, erc20Abi, http, getContract, encodeFunctionData } from 'viem'
import TransactionSimulatorUtil from './TransactionSimulatorUtil'
import SettingsStore from '@/store/SettingsStore'
import { getSolanaTokenData, getTokenData } from '@/data/tokenUtil'
import { getChainById } from './ChainUtil'
import { blockchainApiRpc } from '@/data/EIP155Data'
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'
import { SOLANA_TEST_CHAINS } from '@/data/SolanaData'
import { SOLANA_MAINNET_CHAINS } from '@/data/SolanaData'
import { createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { createAssociatedTokenAccountInstruction } from '@solana/spl-token'
import { getAssociatedTokenAddress } from '@solana/spl-token'
/**
 * Interface for token details
 */
interface TokenDetails {
  balance: bigint
  decimals: number
  symbol: string
  name: string
}

/**
 * Utility class for validating and preparing payment options
 */
export class PaymentValidationUtils {
  // Constants for fallback asset paths
  private static readonly PLACEHOLDER_TOKEN_ICON = '/token-logos/token-placeholder.png'
  private static readonly PLACEHOLDER_CHAIN_ICON = '/chain-logos/chain-placeholder.png'

  /**
   * Parses and validates a CAIP-19 asset ID
   *
   * @param asset - CAIP-19 asset ID string
   * @returns Object containing parsed asset details
   * @throws Error if asset is not in CAIP-19 format
   */
  private static getAssetDetails(asset: string) {
    if (typeof asset !== 'string') throw new Error('Invalid asset value, must be a string')

    // Format: namespace:chainId/assetNamespace:assetReference
    const chainAssetParts = asset.split('/')
    if (chainAssetParts.length !== 2)
      throw new Error('Invalid asset value, must be in CAIP-19 format')

    const chainParts = chainAssetParts[0]?.split(':')
    const assetParts = chainAssetParts[1]?.split(':')

    if (chainParts.length !== 2) throw new Error('Invalid asset value, must be in CAIP-19 format')
    if (assetParts.length !== 2) throw new Error('Invalid asset value, must be in CAIP-19 format')
    const chainNamespace = chainParts[0]
    const chainId = chainParts[1]
    const assetNamespace = assetParts[0]
    const assetAddress = assetParts[1]

    return {
      chainNamespace,
      chainId,
      assetNamespace,
      assetAddress
    }
  }

  /**
   * Extracts the blockchain address from a CAIP-10 formatted string
   *
   * @param recipient - CAIP-10 recipient address
   * @returns The extracted address or null if invalid
   */
  private static extractAddressFromCAIP10(recipient?: string): string | null {
    if (!recipient) return null
    const parts = recipient.split(':')
    return parts.length === 3 ? parts[2] : null
  }

  /**
   * Checks if an asset namespace is supported for payments
   *
   * @param assetNamespace - The asset namespace to check
   * @returns Whether the namespace is supported
   */
  private static isSupportedAssetNamespace(assetNamespace: string): boolean {
    // Support ERC20 tokens, native tokens, and solana token
    return ['erc20', 'slip44', 'token'].includes(assetNamespace)
  }

  // methods to get token details

  private static async getNativeAssetDetails(
    chainId: number,
    account: `0x${string}`
  ): Promise<TokenDetails> {
    const publicClient = createPublicClient({
      chain: getChainById(chainId),
      transport: http(blockchainApiRpc(Number(chainId)))
    })

    const balance = await publicClient.getBalance({
      address: account
    })

    return {
      balance: balance,
      decimals: 18,
      symbol: 'ETH',
      name: 'Ethereum'
    }
  }

  private static async getErc20TokenDetails(
    tokenAddress: Hex,
    chainId: number,
    account: Hex
  ): Promise<TokenDetails> {
    const publicClient = createPublicClient({
      chain: getChainById(chainId),
      transport: http(blockchainApiRpc(Number(chainId)))
    })

    const contract = getContract({
      address: tokenAddress,
      abi: erc20Abi,
      client: publicClient
    })

    const [decimals, symbol, name, balance] = await Promise.all([
      contract.read.decimals(),
      contract.read.symbol(),
      contract.read.name(),
      contract.read.balanceOf([account])
    ])

    return {
      balance: balance,
      decimals: decimals,
      symbol: symbol,
      name: name
    }
  }

  private static async getSolNativeAssetDetails(
    account: string,
    chainId: string
  ): Promise<TokenDetails> {
    const defaultTokenDetails: TokenDetails = {
      balance: BigInt(0),
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana'
    }

    try {
      // Get the RPC URL for the chain
      const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

      if (!rpc) {
        return defaultTokenDetails
      }

      // Connect to Solana
      const connection = new Connection(rpc, 'confirmed')
      const publicKey = new PublicKey(account)

      const balance = await connection.getBalance(publicKey)
      return {
        ...defaultTokenDetails,
        balance: BigInt(balance)
      }
    } catch (error) {
      console.error('Error getting SOL balance:', error)
      return defaultTokenDetails
    }
  }

  private static async getSplTokenDetails(
    tokenAddress: string,
    account: string,
    chainId: string,
    caip19AssetAddress: string
  ): Promise<TokenDetails> {
    const defaultTokenDetails: TokenDetails = {
      balance: BigInt(0),
      decimals: 6,
      symbol: 'UNK',
      name: 'Unknown Token'
    }

    try {
      const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

      if (!rpc) {
        return defaultTokenDetails
      }

      // Connect to Solana
      const connection = new Connection(rpc, 'confirmed')
      const publicKey = new PublicKey(account)
      const mintAddress = new PublicKey(tokenAddress)

      const token = getSolanaTokenData(caip19AssetAddress)

      // Get token balance
      let balance = BigInt(0)
      let decimals = token?.decimals || 0 // Use known token decimals or default

      // Find the associated token account(s)
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: mintAddress
      })

      // If token account exists, get balance
      if (tokenAccounts.value.length > 0) {
        const tokenAccountPubkey = tokenAccounts.value[0].pubkey
        const tokenBalance = await connection.getTokenAccountBalance(tokenAccountPubkey)
        balance = BigInt(tokenBalance.value.amount)

        // Update decimals from on-chain data if not a known token
        if (!token) {
          decimals = tokenBalance.value.decimals
        }
      } else if (!token) {
        // If no token accounts and not a known token, try to get decimals from mint
        const mintInfo = await connection.getParsedAccountInfo(mintAddress)
        if (mintInfo.value) {
          const parsedMintInfo = (mintInfo.value.data as any).parsed?.info
          decimals = parsedMintInfo?.decimals || decimals
        }
      }

      // Return with known metadata or fallback to generic
      return {
        balance,
        decimals,
        symbol: token?.symbol || tokenAddress.slice(0, 4).toUpperCase(),
        name: token?.name || `SPL Token (${tokenAddress.slice(0, 8)}...)`
      }
    } catch (error) {
      // Return default values in case of error
      return defaultTokenDetails
    }
  }

  // methods to simulate payments
  private static async simulateEvmContractInteraction(
    contractInteraction: any,
    chainId: string,
    account: string
  ): Promise<number | null> {
    if (!contractInteraction?.data) {
      return null
    }

    if (Array.isArray(contractInteraction.data)) {
      const simulateEvmTransaction = await TransactionSimulatorUtil.simulateEvmTransaction(
        chainId,
        account as `0x${string}`,
        contractInteraction.data as { to: string; value: string; data: string }[]
      )
      return simulateEvmTransaction
    }
    // If data is not an array, it's an invalid format
    return null
  }
  private static async simulateSolanaContractInteraction(params: {
    contractInteraction: SolanaContractInteraction
    account: string
    chainId: string
  }) {
    try {
      const { contractInteraction, account, chainId } = params
      const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc
      if (!rpc) {
        return null
      }

      const connection = new Connection(rpc, 'confirmed')
      const publicKey = new PublicKey(account)
      // Create a new transaction
      const transaction = new Transaction()

      const instruction = contractInteraction.data
      const accountMetas = instruction.accounts.map(acc => ({
        pubkey: new PublicKey(acc.pubkey),
        isSigner: acc.isSigner,
        isWritable: acc.isWritable
      }))

      // Create the instruction
      const txInstruction = new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: accountMetas,
        data: Buffer.from(instruction.data, 'base64')
      })

      // Add to transaction
      transaction.add(txInstruction)

      const simulationResult = await TransactionSimulatorUtil.simulateSolanaTransaction({
        connection,
        transaction,
        feePayer: publicKey
      })
      console.log({ simulationResult })
      return simulationResult
    } catch (e) {
      return null
    }
  }
  private static async simulateSolanaNativeTransfer(params: {
    account: string
    recipientAddress: string
    amount: string
    chainId: string
  }) {
    try {
      const { account, recipientAddress, amount, chainId } = params
      const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc
      if (!rpc) {
        return null
      }

      const connection = new Connection(rpc, 'confirmed')
      const publicKey = new PublicKey(account)

      const transaction = new Transaction()
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(recipientAddress),
          lamports: BigInt(amount)
        })
      )
      const simulationResult = await TransactionSimulatorUtil.simulateSolanaTransaction({
        connection,
        transaction,
        feePayer: publicKey
      })
      console.log({ simulationResult })
      return simulationResult
    } catch (e) {
      return null
    }
  }
  private static async simulateSolanaTokenTransfer(params: {
    account: string
    recipientAddress: string
    amount: bigint
    tokenAddress: string
    chainId: string
  }) {
    try {
      const { account, recipientAddress, amount, tokenAddress, chainId } = params
      const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc
      if (!rpc) {
        return null
      }

      const connection = new Connection(rpc, 'confirmed')
      const fromPubkey = new PublicKey(account)
      const mintAddress = new PublicKey(tokenAddress)
      const toPubkey = new PublicKey(recipientAddress)

      const fromTokenAccountAddress = await getAssociatedTokenAddress(mintAddress, fromPubkey)

      const fromTokenAccount = await connection.getAccountInfo(fromTokenAccountAddress)
      if (!fromTokenAccount) {
        return null
      }

      const toTokenAccountAddress = await getAssociatedTokenAddress(mintAddress, toPubkey)
      const recipientTokenAccount = await connection.getAccountInfo(toTokenAccountAddress)

      // Create transaction
      const transaction = new Transaction()

      // Add instruction to create recipient token account if needed
      if (!recipientTokenAccount) {
        const createAccountInstruction = createAssociatedTokenAccountInstruction(
          fromPubkey,
          toTokenAccountAddress,
          toPubkey,
          mintAddress
        )
        transaction.add(createAccountInstruction)
      }

      // Add transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccountAddress,
        toTokenAccountAddress,
        fromPubkey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
      transaction.add(transferInstruction)

      const simulationResult = await TransactionSimulatorUtil.simulateSolanaTransaction({
        connection,
        transaction,
        feePayer: fromPubkey
      })
      console.log({ simulationResult })
      return simulationResult
    } catch (e) {
      return null
    }
  }

  private static createDetailedPaymentOption(
    payment: PaymentOption,
    tokenDetails: TokenDetails,
    assetNamespace: string,
    chainId: string,
    chainNamespace: string,
    gasDetails: {
      gasFee: number
      decimals: number
      feeSymbol: string
    }
  ): DetailedPaymentOption {
    const chainData = getChainData(`${chainNamespace}:${chainId}`)
    const tokenMetadata = getTokenData(tokenDetails.symbol)

    return {
      ...payment,
      assetMetadata: {
        assetIcon: tokenMetadata?.icon || PaymentValidationUtils.PLACEHOLDER_TOKEN_ICON,
        assetName: tokenDetails.name,
        assetSymbol: tokenDetails.symbol,
        assetNamespace: assetNamespace,
        assetDecimals: tokenDetails.decimals,
        assetBalance: tokenDetails.balance
      },
      chainMetadata: {
        chainId: chainId,
        chainName: chainData?.name || '',
        chainNamespace: chainNamespace,
        chainIcon: chainData?.logo || PaymentValidationUtils.PLACEHOLDER_CHAIN_ICON
      },
      fee: {
        gasFee: gasDetails.gasFee,
        decimals: gasDetails.decimals,
        feeSymbol: gasDetails.feeSymbol
      }
    }
  }

  private static async getDetailedDirectPaymentOption(payment: PaymentOption): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    try {
      // Extract recipient address
      const recipientAddress = PaymentValidationUtils.extractAddressFromCAIP10(payment.recipient)
      if (!recipientAddress) {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      // Parse asset details
      const { chainId, assetAddress, chainNamespace, assetNamespace } =
        PaymentValidationUtils.getAssetDetails(payment.asset)

      // Check if asset namespace is supported
      if (!PaymentValidationUtils.isSupportedAssetNamespace(assetNamespace)) {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      let result

      switch (chainNamespace) {
        case 'solana':
          result = await this.processSolanaDirectPayment(
            payment,
            recipientAddress,
            chainId,
            assetAddress,
            assetNamespace
          )
          break

        case 'eip155':
          result = await this.processEvmDirectPayment(
            payment,
            recipientAddress,
            chainId,
            assetAddress,
            assetNamespace
          )
          break

        default:
          return { validatedPayment: null, hasMatchingAsset: false }
      }

      return result
    } catch (error) {
      console.error('Error validating payment option:', error)
      return { validatedPayment: null, hasMatchingAsset: false }
    }
  }

  private static async processSolanaDirectPayment(
    payment: PaymentOption,
    recipientAddress: string,
    chainId: string,
    assetAddress: string,
    assetNamespace: string
  ): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    const account = SettingsStore.state.solanaAddress
    let tokenDetails: TokenDetails | undefined
    let simulationResult: number | null

    if (assetNamespace === 'slip44' && assetAddress === '501') {
      simulationResult = await this.simulateSolanaNativeTransfer({
        account,
        recipientAddress: recipientAddress,
        amount: payment.amount,
        chainId: `solana:${chainId}`
      })
      tokenDetails = simulationResult
        ? await this.getSolNativeAssetDetails(account, `solana:${chainId}`)
        : undefined
    } else if (assetNamespace === 'token') {
      simulationResult = await this.simulateSolanaTokenTransfer({
        account,
        recipientAddress: recipientAddress,
        amount: BigInt(payment.amount),
        tokenAddress: assetAddress,
        chainId: `solana:${chainId}`
      })
      tokenDetails = simulationResult
        ? await this.getSplTokenDetails(assetAddress, account, `solana:${chainId}`, payment.asset)
        : undefined
    } else {
      return { validatedPayment: null, hasMatchingAsset: false }
    }
    console.log({ simulationResult })
    // Check if token details were assigned
    if (!tokenDetails) {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    // Check if user has the asset (balance > 0)
    const hasMatchingAsset = tokenDetails.balance > BigInt(0)
    console.log({ tokenDetails })
    if (!hasMatchingAsset) {
      return { validatedPayment: null, hasMatchingAsset }
    }

    // Create detailed payment option with metadata
    const detailedPayment = simulationResult
      ? PaymentValidationUtils.createDetailedPaymentOption(
          payment,
          tokenDetails,
          assetNamespace,
          chainId,
          'solana',
          {
            gasFee: simulationResult,
            decimals: 9,
            feeSymbol: 'SOL'
          }
        )
      : null

    return { validatedPayment: detailedPayment, hasMatchingAsset: true }
  }

  private static async processEvmDirectPayment(
    payment: PaymentOption,
    recipientAddress: string,
    chainId: string,
    assetAddress: string,
    assetNamespace: string
  ): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    const account = SettingsStore.state.eip155Address as `0x${string}`
    let tokenDetails: TokenDetails | undefined
    let simulationResult: number | null

    if (assetNamespace === 'erc20') {
      simulationResult = await PaymentValidationUtils.simulateEvmContractInteraction(
        {
          data: [
            {
              to: assetAddress as `0x${string}`,
              value: '0x0',
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: 'transfer',
                args: [recipientAddress as `0x${string}`, BigInt(payment.amount)]
              })
            }
          ]
        },
        chainId,
        account
      )
      tokenDetails = await PaymentValidationUtils.getErc20TokenDetails(
        assetAddress as `0x${string}`,
        Number(chainId),
        account as `0x${string}`
      )
    } else if (assetNamespace === 'slip44' && assetAddress === '60') {
      // slip44:60 - native ETH token
      simulationResult = await TransactionSimulatorUtil.simulateEvmTransaction(
        chainId,
        account as `0x${string}`,
        [
          {
            to: recipientAddress as `0x${string}`,
            value: payment.amount,
            data: '0x'
          }
        ]
      )
      tokenDetails = await PaymentValidationUtils.getNativeAssetDetails(
        Number(chainId),
        account as `0x${string}`
      )
    } else {
      return { validatedPayment: null, hasMatchingAsset: false }
    }
    console.log({ simulationResult })
    // Check if token details were assigned
    if (!tokenDetails || simulationResult === undefined) {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    // Check if user has the asset (balance > 0)
    const hasMatchingAsset = tokenDetails.balance > BigInt(0)
    console.log({ tokenDetails })
    if (!hasMatchingAsset) {
      return { validatedPayment: null, hasMatchingAsset }
    }

    // Create detailed payment option with metadata
    const detailedPayment = simulationResult
      ? PaymentValidationUtils.createDetailedPaymentOption(
          payment,
          tokenDetails,
          assetNamespace,
          chainId,
          'eip155',
          {
            gasFee: simulationResult,
            decimals: 18,
            feeSymbol: 'ETH'
          }
        )
      : null

    return { validatedPayment: detailedPayment, hasMatchingAsset: true }
  }

  private static async getDetailedContractPaymentOption(payment: PaymentOption): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    try {
      const { asset, contractInteraction } = payment

      if (!contractInteraction) {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      // Parse asset details
      const { chainId, assetAddress, chainNamespace, assetNamespace } =
        PaymentValidationUtils.getAssetDetails(asset)

      // Check if asset namespace is supported
      if (!PaymentValidationUtils.isSupportedAssetNamespace(assetNamespace)) {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      let result

      switch (chainNamespace) {
        case 'solana':
          result = await this.processSolanaContractPayment(
            payment,
            chainId,
            assetAddress,
            assetNamespace,
            contractInteraction
          )
          break

        case 'eip155':
          result = await this.processEvmContractPayment(
            payment,
            chainId,
            assetAddress,
            assetNamespace,
            contractInteraction
          )
          break

        default:
          return { validatedPayment: null, hasMatchingAsset: false }
      }

      return result
    } catch (error) {
      console.error('Error validating contract payment option:', error)
      return { validatedPayment: null, hasMatchingAsset: false }
    }
  }

  private static async processSolanaContractPayment(
    payment: PaymentOption,
    chainId: string,
    assetAddress: string,
    assetNamespace: string,
    contractInteraction: any
  ): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    const account = SettingsStore.state.solanaAddress
    let tokenDetails: TokenDetails | undefined
    let simulationResult = null

    if (contractInteraction.type !== 'solana-instruction') {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    simulationResult = await this.simulateSolanaContractInteraction({
      contractInteraction: contractInteraction as SolanaContractInteraction,
      account,
      chainId: `solana:${chainId}`
    })
    if (!simulationResult) {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    if (assetNamespace === 'slip44' && assetAddress === '501') {
      // Native SOL
      tokenDetails = await this.getSolNativeAssetDetails(account, `solana:${chainId}`)
    } else if (assetNamespace === 'token') {
      // SPL token
      tokenDetails = await this.getSplTokenDetails(
        assetAddress,
        account,
        `solana:${chainId}`,
        payment.asset
      )
    } else {
      return { validatedPayment: null, hasMatchingAsset: false }
    }
    console.log({ simulationResult })
    // Check if token details were assigned
    if (!tokenDetails) {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    // Check if user has the asset (balance > 0)
    const hasMatchingAsset = tokenDetails.balance > BigInt(0)

    // Create detailed payment option with metadata
    const detailedPayment = simulationResult
      ? PaymentValidationUtils.createDetailedPaymentOption(
          payment,
          tokenDetails,
          assetNamespace,
          chainId,
          'solana',
          {
            gasFee: simulationResult,
            decimals: 9,
            feeSymbol: 'SOL'
          }
        )
      : null
    return { validatedPayment: detailedPayment, hasMatchingAsset }
  }

  private static async processEvmContractPayment(
    payment: PaymentOption,
    chainId: string,
    assetAddress: string,
    assetNamespace: string,
    contractInteraction: any
  ): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    const account = SettingsStore.state.eip155Address as `0x${string}`
    let tokenDetails: TokenDetails | undefined
    let simulationResult = null

    if (contractInteraction.type !== 'evm-calls') {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    simulationResult = await PaymentValidationUtils.simulateEvmContractInteraction(
      contractInteraction,
      chainId,
      account
    )
    console.log({ simulationResult })
    if (!simulationResult) {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    if (assetNamespace === 'erc20') {
      tokenDetails = await PaymentValidationUtils.getErc20TokenDetails(
        assetAddress as `0x${string}`,
        Number(chainId),
        account as `0x${string}`
      )
    } else if (assetNamespace === 'slip44') {
      // must be slip44 since we already checked supported namespaces
      tokenDetails = await PaymentValidationUtils.getNativeAssetDetails(
        Number(chainId),
        account as `0x${string}`
      )
    } else {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    // Check if token details were assigned
    if (!tokenDetails) {
      return { validatedPayment: null, hasMatchingAsset: false }
    }

    // Check if user has the asset (balance > 0)
    const hasMatchingAsset = tokenDetails.balance > BigInt(0)

    // Create detailed payment option with metadata
    const detailedPayment = simulationResult
      ? PaymentValidationUtils.createDetailedPaymentOption(
          payment,
          tokenDetails,
          assetNamespace,
          chainId,
          'eip155',
          {
            gasFee: simulationResult,
            decimals: 18,
            feeSymbol: 'ETH'
          }
        )
      : null
    return { validatedPayment: detailedPayment, hasMatchingAsset }
  }

  static async findFeasiblePayments(payments: PaymentOption[]): Promise<{
    feasiblePayments: DetailedPaymentOption[]
    isUserHaveAtleastOneMatchingAssets: boolean
  }> {
    let isUserHaveAtleastOneMatchingAssets = false

    const results = await Promise.all(
      payments.map(async payment => {
        if (payment.recipient && !payment.contractInteraction) {
          // Direct payment
          return await this.getDetailedDirectPaymentOption(payment)
        } else if (payment.contractInteraction) {
          return await this.getDetailedContractPaymentOption(payment)
        } else {
          console.warn('Invalid payment: missing both recipient and contractInteraction')
          return { validatedPayment: null, hasMatchingAsset: false }
        }
      })
    )

    // Collect results
    const feasiblePayments: DetailedPaymentOption[] = []

    for (const result of results) {
      if (result.hasMatchingAsset) {
        isUserHaveAtleastOneMatchingAssets = true
      }

      if (result.validatedPayment) {
        feasiblePayments.push(result.validatedPayment)
      }
    }

    return {
      feasiblePayments,
      isUserHaveAtleastOneMatchingAssets
    }
  }
}
