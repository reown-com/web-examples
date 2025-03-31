import { getChainData } from '@/data/chainsUtil'
import { type PaymentOption, type DetailedPaymentOption, Hex } from '@/types/wallet_checkout'
import { createPublicClient, erc20Abi, http, getContract, encodeFunctionData } from 'viem'
import TransactionSimulatorUtil from './TransactionSimulatorUtil'
import SettingsStore from '@/store/SettingsStore'
import { getSolanaTokenData, getTokenData } from '@/data/tokenUtil'
import { getChainById } from './ChainUtil'
import { EIP155_CHAINS } from '@/data/EIP155Data'
import { Connection, PublicKey } from '@solana/web3.js'
import { SOLANA_TEST_CHAINS } from '@/data/SolanaData'
import { SOLANA_MAINNET_CHAINS } from '@/data/SolanaData'
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
  private static readonly PLACEHOLDER_TOKEN_ICON = '/token-logos/token-placeholder.svg'
  private static readonly PLACEHOLDER_CHAIN_ICON = '/chain-logos/chain-placeholder.svg'

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

  /**
   * Gets details for a native blockchain asset (like ETH)
   *
   * @param chainId - Chain ID number
   * @param account - Account address
   * @returns Native asset details including balance and metadata
   */
  private static async getNativeAssetDetails(
    chainId: number,
    account: `0x${string}`
  ): Promise<TokenDetails> {
    const publicClient = createPublicClient({
      chain: getChainById(chainId),
      transport: http(EIP155_CHAINS[`eip155:${chainId}`].rpc)
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

  /**
   * Gets details for an ERC20 token
   *
   * @param tokenAddress - Token contract address
   * @param chainId - Chain ID number
   * @param account - Account address
   * @returns Token details including balance and metadata
   */
  private static async getErc20TokenDetails(
    tokenAddress: Hex,
    chainId: number,
    account: Hex
  ): Promise<TokenDetails> {
    const publicClient = createPublicClient({
      chain: getChainById(chainId),
      transport: http(EIP155_CHAINS[`eip155:${chainId}`].rpc)
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

  /**
   * Validates a contract interaction to ensure it can be executed successfully
   *
   * @param contractInteraction - The contract interaction data
   * @param chainId - Chain ID
   * @param account - User account address
   * @returns Whether the contract interaction can succeed
   */
  private static async simulateContractInteraction(
    contractInteraction: any,
    chainId: string,
    account: string
  ): Promise<boolean> {
    if (!contractInteraction?.data) {
      return false
    }

    try {
      if (Array.isArray(contractInteraction.data)) {
        const canTransactionSucceed = await TransactionSimulatorUtil.canTransactionSucceed(
          chainId,
          account as `0x${string}`,
          contractInteraction.data as { to: string; value: string; data: string }[]
        )
        return canTransactionSucceed
      } else {
        // If data is not an array, it's an invalid format
        return false
      }
    } catch (error) {
      console.error('Error validating contract interaction:', error)
      return false
    }
  }

  /**
   * Validates an ERC20 token payment and retrieves token details
   *
   * @param assetAddress - Token contract address
   * @param chainId - Chain ID
   * @param senderAccount - Sender's account address
   * @param recipientAddress - Recipient's address
   * @param amount - Payment amount in hex
   * @returns Object containing token details and validation status
   */
  private static async simulateAndGetErc20PaymentDetails(
    assetAddress: string,
    chainId: string,
    senderAccount: string,
    recipientAddress: string,
    amount: string
  ): Promise<{ tokenDetails: TokenDetails; isValid: boolean }> {
    // Get token details
    const tokenDetails = await PaymentValidationUtils.getErc20TokenDetails(
      assetAddress as `0x${string}`,
      Number(chainId),
      senderAccount as `0x${string}`
    )

    // Check if transaction can succeed
    const canTransactionSucceed = await TransactionSimulatorUtil.canTransactionSucceed(
      chainId,
      senderAccount as `0x${string}`,
      [
        {
          to: assetAddress as `0x${string}`,
          value: '0x0',
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipientAddress as `0x${string}`, BigInt(amount)]
          })
        }
      ]
    )

    return {
      tokenDetails,
      isValid: canTransactionSucceed
    }
  }

  /**
   * Validates a native token payment and retrieves token details
   *
   * @param chainId - Chain ID
   * @param senderAccount - Sender's account address
   * @param recipientAddress - Recipient's address
   * @param amount - Payment amount in hex
   * @returns Object containing token details and validation status
   */
  private static async simulateAndGetNativeTokenPaymentDetails(
    chainId: string,
    senderAccount: string,
    recipientAddress: string,
    amount: string
  ): Promise<{ tokenDetails: TokenDetails; isValid: boolean }> {
    // Check if transaction can succeed
    const canTransactionSucceed = await TransactionSimulatorUtil.canTransactionSucceed(
      chainId,
      senderAccount as `0x${string}`,
      [
        {
          to: recipientAddress as `0x${string}`,
          value: amount,
          data: '0x'
        }
      ]
    )

    // Get native token details
    const tokenDetails = canTransactionSucceed
      ? await PaymentValidationUtils.getNativeAssetDetails(
          Number(chainId),
          senderAccount as `0x${string}`
        )
      : { decimals: 18, symbol: 'ETH', name: 'Ethereum', balance: BigInt(0) }

    return {
      tokenDetails,
      isValid: canTransactionSucceed
    }
  }

  /**
   * Creates a detailed payment option with all necessary metadata
   *
   * @param payment - Original payment option
   * @param tokenDetails - Token details
   * @param assetNamespace - Asset namespace
   * @param chainId - Chain ID
   * @param chainNamespace - Chain namespace
   * @returns Detailed payment option
   */
  private static createDetailedPaymentOption(
    payment: PaymentOption,
    tokenDetails: TokenDetails,
    assetNamespace: string,
    chainId: string,
    chainNamespace: string
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
      }
    }
  }

  /**
   * Validates a single direct payment option and creates a detailed version if valid
   *
   * @param payment - Payment option to validate
   * @param account - User account address
   * @returns Object containing the validated payment (or null) and asset availability flag
   */
  private static async getDetailedDirectPaymentOptionEVM(
    payment: PaymentOption,
    account: string
  ): Promise<{
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

      let validationResult

      // Validate based on asset type
      if (assetNamespace === 'erc20') {
        validationResult = await PaymentValidationUtils.simulateAndGetErc20PaymentDetails(
          assetAddress,
          chainId,
          account,
          recipientAddress,
          payment.amount
        )
      } else {
        // slip44 - native token
        validationResult = await PaymentValidationUtils.simulateAndGetNativeTokenPaymentDetails(
          chainId,
          account,
          recipientAddress,
          payment.amount
        )
      }

      // Check if user has the asset (balance > 0)
      const hasMatchingAsset = validationResult.tokenDetails.balance > BigInt(0)

      if (!validationResult.isValid) {
        return { validatedPayment: null, hasMatchingAsset }
      }

      // Create detailed payment option with metadata
      const detailedPayment = PaymentValidationUtils.createDetailedPaymentOption(
        payment,
        validationResult.tokenDetails,
        assetNamespace,
        chainId,
        chainNamespace
      )

      return { validatedPayment: detailedPayment, hasMatchingAsset: true }
    } catch (error) {
      console.error('Error validating payment option:', error)
      return { validatedPayment: null, hasMatchingAsset: false }
    }
  }

  /**
   * Validates a single direct payment option for Solana and creates a detailed version if valid
   *
   * @param payment - Payment option to validate
   * @param account - Solana account address
   * @returns Object containing the validated payment (or null) and asset availability flag
   */
  private static async getDetailedDirectPaymentOptionSolana(
    payment: PaymentOption,
    account: string
  ): Promise<{
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

      // Get token details based on asset namespace
      let tokenDetails: TokenDetails

      if (assetNamespace === 'slip44' && assetAddress === '501') {
        // Native SOL
        tokenDetails = await this.getSolNativeAssetDetails(account, `${chainNamespace}:${chainId}`)
      } else if (assetNamespace === 'token') {
        // SPL token
        tokenDetails = await this.getSplTokenDetails(
          assetAddress,
          account,
          `${chainNamespace}:${chainId}`,
          payment.asset
        )
      } else {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      // Check if user has the asset (balance > 0)
      const hasMatchingAsset = tokenDetails.balance > BigInt(0)

      if (!hasMatchingAsset) {
        return { validatedPayment: null, hasMatchingAsset }
      }

      // Create detailed payment option with metadata
      const detailedPayment = PaymentValidationUtils.createDetailedPaymentOption(
        payment,
        tokenDetails,
        assetNamespace,
        chainId,
        chainNamespace
      )

      return { validatedPayment: detailedPayment, hasMatchingAsset: true }
    } catch (error) {
      console.error('Error validating Solana payment option:', error)
      return { validatedPayment: null, hasMatchingAsset: false }
    }
  }

  /**
   * Validates a single direct payment option and creates a detailed version if valid
   *
   * @param payment - Payment option to validate
   * @param evmAccount - EVM account address (if available)
   * @param solanaAccount - Solana account address (if available)
   * @returns Object containing the validated payment (or null) and asset availability flag
   */
  private static async getDetailedDirectPaymentOption(
    payment: PaymentOption,
    evmAccount?: string,
    solanaAccount?: string
  ): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    try {
      // Parse asset details to determine chain
      const { chainNamespace } = PaymentValidationUtils.getAssetDetails(payment.asset)

      // Delegate to chain-specific methods
      if (chainNamespace === 'eip155' && evmAccount) {
        return await this.getDetailedDirectPaymentOptionEVM(payment, evmAccount)
      } else if (chainNamespace === 'solana' && solanaAccount) {
        return await this.getDetailedDirectPaymentOptionSolana(payment, solanaAccount)
      }

      return { validatedPayment: null, hasMatchingAsset: false }
    } catch (error) {
      console.error('Error getting detailed payment option:', error)
      return { validatedPayment: null, hasMatchingAsset: false }
    }
  }

  /**
   * Validates a contract payment option for Solana and creates a detailed version if valid
   *
   * @param payment - Payment option to validate
   * @param account - Solana account address
   * @returns Object containing the validated payment (or null) and asset availability flag
   */
  private static async getDetailedContractPaymentOptionSolana(
    payment: PaymentOption,
    account: string
  ): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    try {
      const { asset, contractInteraction } = payment

      if (!contractInteraction || contractInteraction.type !== 'solana-instruction') {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      // Parse asset details
      const { chainId, assetAddress, chainNamespace, assetNamespace } =
        PaymentValidationUtils.getAssetDetails(asset)

      // Check if asset namespace is supported
      if (!PaymentValidationUtils.isSupportedAssetNamespace(assetNamespace)) {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      // Get token details based on asset namespace
      let tokenDetails: TokenDetails

      if (assetNamespace === 'slip44' && assetAddress === '501') {
        // Native SOL
        tokenDetails = await this.getSolNativeAssetDetails(account, `${chainNamespace}:${chainId}`)
      } else if (assetNamespace === 'token') {
        // SPL token
        tokenDetails = await this.getSplTokenDetails(
          assetAddress,
          account,
          `${chainNamespace}:${chainId}`,
          payment.asset
        )
      } else {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      // Check if user has the asset (balance > 0)
      const hasMatchingAsset = tokenDetails.balance > BigInt(0)

      // For demonstration, we'll assume all Solana contract interactions are feasible
      // In a production app, you would validate the instructions using simulation

      // Create detailed payment option with metadata
      const detailedPayment = PaymentValidationUtils.createDetailedPaymentOption(
        payment,
        tokenDetails,
        assetNamespace,
        chainId,
        chainNamespace
      )

      return { validatedPayment: detailedPayment, hasMatchingAsset }
    } catch (error) {
      console.error('Error validating Solana contract payment option:', error)
      return { validatedPayment: null, hasMatchingAsset: false }
    }
  }

  /**
   * Validates a contract payment option and creates a detailed version if valid
   *
   * @param payment - Payment option to validate
   * @param account - User account address
   * @returns Object containing the validated payment (or null) and asset availability flag
   */
  private static async getDetailedContractPaymentOptionEVM(
    payment: PaymentOption,
    account: string
  ): Promise<{
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

      // Validate contract interaction
      const isContractValid = await PaymentValidationUtils.simulateContractInteraction(
        contractInteraction,
        chainId,
        account
      )

      if (!isContractValid) {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      // Check if asset namespace is supported
      if (!PaymentValidationUtils.isSupportedAssetNamespace(assetNamespace)) {
        return { validatedPayment: null, hasMatchingAsset: false }
      }

      // Get asset details based on asset namespace
      let tokenDetails: TokenDetails
      if (assetNamespace === 'erc20') {
        tokenDetails = await PaymentValidationUtils.getErc20TokenDetails(
          assetAddress as `0x${string}`,
          Number(chainId),
          account as `0x${string}`
        )
      } else {
        // must be slip44 since we already checked supported namespaces
        tokenDetails = await PaymentValidationUtils.getNativeAssetDetails(
          Number(chainId),
          account as `0x${string}`
        )
      }

      // Check if user has the asset (balance > 0)
      const hasMatchingAsset = tokenDetails.balance > BigInt(0)

      // Create detailed payment option with metadata (reusing the common method)
      const detailedPayment = PaymentValidationUtils.createDetailedPaymentOption(
        payment,
        tokenDetails,
        assetNamespace,
        chainId,
        chainNamespace
      )

      return {
        validatedPayment: detailedPayment,
        hasMatchingAsset
      }
    } catch (error) {
      console.error('Error validating contract payment option:', error)
      return { validatedPayment: null, hasMatchingAsset: false }
    }
  }

  /**
   * Validates a contract payment option and creates a detailed version if valid
   *
   * @param payment - Payment option to validate
   * @param evmAccount - EVM account address (if available)
   * @param solanaAccount - Solana account address (if available)
   * @returns Object containing the validated payment (or null) and asset availability flag
   */
  private static async getDetailedContractPaymentOption(
    payment: PaymentOption,
    evmAccount?: string,
    solanaAccount?: string
  ): Promise<{
    validatedPayment: DetailedPaymentOption | null
    hasMatchingAsset: boolean
  }> {
    try {
      // Parse asset details to determine chain
      const { chainNamespace } = PaymentValidationUtils.getAssetDetails(payment.asset)

      // Delegate to chain-specific methods
      if (chainNamespace === 'eip155' && evmAccount) {
        return await this.getDetailedContractPaymentOptionEVM(payment, evmAccount)
      } else if (chainNamespace === 'solana' && solanaAccount) {
        return await this.getDetailedContractPaymentOptionSolana(payment, solanaAccount)
      }

      return { validatedPayment: null, hasMatchingAsset: false }
    } catch (error) {
      console.error('Error getting detailed contract payment option:', error)
      return { validatedPayment: null, hasMatchingAsset: false }
    }
  }

  /**
   * Gets details for a Solana native asset (SOL)
   *
   * @param account - Solana account address
   * @returns SOL asset details including metadata
   */
  private static async getSolNativeAssetDetails(
    account: string,
    chainId: string
  ): Promise<TokenDetails> {
    try {
      // Get the RPC URL for the chain
      const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

      if (!rpc) {
        throw new Error('There is no RPC URL for the provided chain')
      }

      // Connect to Solana
      const connection = new Connection(rpc, 'confirmed')
      const publicKey = new PublicKey(account)

      // Get SOL balance
      const balance = await connection.getBalance(publicKey)
      console.log('Solana balance', balance)
      return {
        balance: BigInt(balance),
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana'
      }
    } catch (error) {
      console.error('Error getting SOL balance:', error)

      // Return default values in case of error
      return {
        balance: BigInt(0),
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana'
      }
    }
  }

  /**
   * Gets details for a fungible SPL token with known token mapping
   *
   * @param tokenAddress - Token mint address
   * @param account - Account address
   * @returns Token details including balance and metadata
   */
  private static async getSplTokenDetails(
    tokenAddress: string,
    account: string,
    chainId: string,
    caip19AssetAddress: string
  ): Promise<TokenDetails> {
    try {
      // Get the RPC URL for the chain
      const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

      if (!rpc) {
        throw new Error('There is no RPC URL for the provided chain')
      }

      // Connect to Solana
      const connection = new Connection(rpc, 'confirmed')
      const publicKey = new PublicKey(account)
      const mintAddress = new PublicKey(tokenAddress)

      try {
        // Check if this is a known token
        const token = getSolanaTokenData(caip19AssetAddress)

        // Get token balance
        let balance = BigInt(0)
        let decimals = token?.decimals || 6 // Use known token decimals or default

        try {
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
        } catch (balanceError) {
          console.warn('Error getting token balance:', balanceError)
          // Continue with zero balance
        }

        // Return with known metadata or fallback to generic
        return {
          balance,
          decimals,
          symbol: token?.symbol || tokenAddress.slice(0, 4).toUpperCase(),
          name: token?.name || `SPL Token (${tokenAddress.slice(0, 8)}...)`
        }
      } catch (tokenError) {
        console.warn('Error getting token details:', tokenError)

        // Return default values
        return {
          balance: BigInt(0),
          decimals: 6,
          symbol: tokenAddress.slice(0, 4).toUpperCase(),
          name: 'SPL Token'
        }
      }
    } catch (error) {
      console.error('Error getting SPL token details:', error)

      // Return default values in case of error
      return {
        balance: BigInt(0),
        decimals: 6,
        symbol: tokenAddress.slice(0, 4).toUpperCase(),
        name: 'SPL Token'
      }
    }
  }

  /**
   * Finds and validates all feasible direct payment options
   *
   * @param directPayments - Array of direct payment options
   * @returns Object containing feasible payments and asset availability flag
   */
  static async findFeasibleDirectPayments(directPayments: PaymentOption[]): Promise<{
    feasibleDirectPayments: DetailedPaymentOption[]
    isUserHaveAtleastOneMatchingAssets: boolean
  }> {
    let isUserHaveAtleastOneMatchingAssets = false
    const evmAccount = SettingsStore.state.eip155Address as `0x${string}`
    const solanaAccount = SettingsStore.state.solanaAddress

    // Validate each payment option
    const results = await Promise.all(
      directPayments.map(payment =>
        PaymentValidationUtils.getDetailedDirectPaymentOption(payment, evmAccount, solanaAccount)
      )
    )

    // Collect results
    const feasibleDirectPayments: DetailedPaymentOption[] = []

    for (const result of results) {
      if (result.hasMatchingAsset) {
        isUserHaveAtleastOneMatchingAssets = true
      }

      if (result.validatedPayment) {
        feasibleDirectPayments.push(result.validatedPayment)
      }
    }

    return {
      feasibleDirectPayments,
      isUserHaveAtleastOneMatchingAssets
    }
  }

  /**
   * Finds and validates all feasible contract payment options
   *
   * @param contractPayments - Array of contract payment options
   * @returns Object containing feasible payments and asset availability flag
   */
  static async findFeasibleContractPayments(contractPayments: PaymentOption[]): Promise<{
    feasibleContractPayments: DetailedPaymentOption[]
    isUserHaveAtleastOneMatchingAssets: boolean
  }> {
    let isUserHaveAtleastOneMatchingAssets = false
    const evmAccount = SettingsStore.state.eip155Address as `0x${string}`
    const solanaAccount = SettingsStore.state.solanaAddress

    const results = await Promise.all(
      contractPayments.map(payment =>
        PaymentValidationUtils.getDetailedContractPaymentOption(payment, evmAccount, solanaAccount)
      )
    )

    // Collect results
    const feasibleContractPayments: DetailedPaymentOption[] = []

    for (const result of results) {
      if (result.hasMatchingAsset) {
        isUserHaveAtleastOneMatchingAssets = true
      }

      if (result.validatedPayment) {
        feasibleContractPayments.push(result.validatedPayment)
      }
    }

    return {
      feasibleContractPayments,
      isUserHaveAtleastOneMatchingAssets
    }
  }
}
