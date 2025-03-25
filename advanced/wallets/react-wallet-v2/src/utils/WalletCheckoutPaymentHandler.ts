import { encodeFunctionData } from 'viem'
import { erc20Abi } from 'viem'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import bs58 from 'bs58'
import { Buffer } from 'buffer'

import { DetailedPaymentOption, CheckoutErrorCode, CheckoutError, SolanaContractInteraction } from '@/types/wallet_checkout'
import { Wallet } from 'ethers'
import { SOLANA_MAINNET_CHAINS } from '@/data/SolanaData'
import { SOLANA_TEST_CHAINS } from '@/data/SolanaData'

// Assume SolanaLib interface based on similar patterns in the codebase
interface SolanaLib {
  getAddress(): string;
  getChainId(): string;
  signAndSendTransaction(transaction: Transaction): Promise<string>;
  sendSol(recipientAddress: string, chainId: string, amount: bigint): Promise<string>;
  sendSplToken(tokenAddress: string, recipientAddress: string, chainId: string, amount: bigint): Promise<string>;
}

export interface PaymentResult {
  txHash: string
}

const WalletCheckoutPaymentHandler = {
  /**
   * Validates if a checkout request has expired
   */
  validateCheckoutExpiry(checkoutRequest: any): void {
    if (checkoutRequest.expiry) {
      const currentTime = Math.floor(Date.now() / 1000)
      if (currentTime > checkoutRequest.expiry) {
        throw new CheckoutError(CheckoutErrorCode.CHECKOUT_EXPIRED, 'Checkout request has expired')
      }
    }
  },

  /**
   * Simulates a Solana transaction before sending
   */
  async simulateSolanaTransaction(
    connection: Connection, 
    transaction: Transaction, 
    feePayer: PublicKey
  ): Promise<void> {
    try {
      // Set recent blockhash for the transaction
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = feePayer
      
      // Simulate the transaction
      const simulation = await connection.simulateTransaction(transaction)
      
      // Check simulation results
      if (simulation.value.err) {
        console.error('Simulation error:', simulation.value.err)
        throw new CheckoutError(
          CheckoutErrorCode.CONTRACT_INTERACTION_FAILED,
          `Simulation failed: ${JSON.stringify(simulation.value.err)}`
        )
      }
      
      console.log('Simulation successful:', simulation.value.logs)
    } catch (error) {
      if (error instanceof CheckoutError) {
        throw error
      }
      throw new CheckoutError(
        CheckoutErrorCode.CONTRACT_INTERACTION_FAILED,
        `Simulation error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  },

  /**
   * Handles a Solana direct payment
   */
  async processSolanaDirectPayment(
    wallet: SolanaLib,
    recipientAddress: string,
    amount: string,
    chainId: string
  ): Promise<PaymentResult> {
    try {
      // Send SOL to recipient
      const txHash = await wallet.sendSol(recipientAddress, chainId, BigInt(amount))
      return { txHash }
    } catch (error) {
      console.error('Solana direct payment error:', error)
      throw new CheckoutError(
        CheckoutErrorCode.DIRECT_PAYMENT_ERROR,
        `Failed to send SOL: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  },

  /**
   * Handles a Solana SPL token payment
   */
  async processSolanaSplTokenPayment(
    wallet: SolanaLib,
    recipientAddress: string,
    amount: string,
    tokenAddress: string,
    chainId: string
  ): Promise<PaymentResult> {
    try {
      // Send SPL token to recipient
      const txHash = await wallet.sendSplToken(tokenAddress, recipientAddress, chainId, BigInt(amount))
      return { txHash }
    } catch (error) {
      console.error('Solana SPL token payment error:', error)
      
      // Check if this is a token account error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("doesn't have a token account")) {
        throw new CheckoutError(
          CheckoutErrorCode.DIRECT_PAYMENT_ERROR,
          `Recipient doesn't have a token account for this SPL token. The recipient must create a token account before they can receive this token.`
        )
      }
      
      throw new CheckoutError(
        CheckoutErrorCode.DIRECT_PAYMENT_ERROR,
        `Failed to send SPL token: ${errorMessage}`
      )
    }
  },

  /**
   * Process a Solana contract interaction
   */
  async processSolanaContractInteraction(
    wallet: any,
    contractInteraction: SolanaContractInteraction,
    chainId: string
  ): Promise<PaymentResult> {
    try {
      const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc;

      if (!rpc) {
        throw new Error(`There is no RPC URL for the provided chain ${chainId}`)
      }
      const connection = new Connection(rpc)
      
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
      
      // Set the wallet's public key as feePayer
      const walletAddress = await wallet.getAddress()
      const publicKey = new PublicKey(walletAddress)
      transaction.feePayer = publicKey
      
      // Get recent blockhash from the connection
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      
      // Simulate transaction to check for errors
      await this.simulateSolanaTransaction(
        connection,
        transaction,
        publicKey
      )
      
      // Determine which method to use for signing and sending
      let txHash: string
      
      // Use sendRawTransaction if the wallet supports it (our implementation)
      if (typeof wallet.sendRawTransaction === 'function') {
        txHash = await wallet.sendRawTransaction(transaction, chainId)
      } 
      // Otherwise use standard signAndSendTransaction
      else if (typeof wallet.signAndSendTransaction === 'function') {
        // Serialize the transaction to bs58 format
        const serializedBytes = transaction.serialize();
        // Convert Buffer to Uint8Array to avoid type issues
        const serializedTx = bs58.encode(new Uint8Array(serializedBytes));
        
        // Use the wallet's signAndSendTransaction method
        const result = await wallet.signAndSendTransaction({
          transaction: serializedTx,
          chainId: chainId
        })
        
        // Handle different response formats from various wallet implementations
        if (typeof result === 'string') {
          txHash = result;
        } else if (result && typeof result === 'object') {
          if ('signature' in result && typeof result.signature === 'string') {
            txHash = result.signature;
          } else if ('txHash' in result && typeof result.txHash === 'string') {
            txHash = result.txHash;
          } else if ('transactionHash' in result && typeof result.transactionHash === 'string') {
            txHash = result.transactionHash;
          } else {
            // Try to stringify the result if it's not in a recognized format
            const stringResult = String(result);
            if (stringResult && stringResult !== '[object Object]') {
              txHash = stringResult;
            } else {
              throw new Error('Wallet returned an invalid transaction signature format');
            }
          }
        } else {
          throw new Error('Wallet returned an invalid response format');
        }
        
        // Wait for transaction confirmation
        try {
          await connection.confirmTransaction(txHash, 'confirmed')
          console.log('Transaction confirmed:', txHash)
        } catch (confirmError) {
          console.error('Error confirming transaction:', confirmError)
          throw new CheckoutError(
            CheckoutErrorCode.CONTRACT_INTERACTION_FAILED,
            `Transaction was sent but confirmation failed: ${confirmError instanceof Error ? confirmError.message : String(confirmError)}`
          )
        }
      }
      // No compatible method found
      else {
        throw new CheckoutError(
          CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
          'Wallet does not support Solana transaction sending'
        )
      }
      
      return { txHash }
    } catch (error) {
      console.error('Solana contract interaction error:', error)
      if (error instanceof CheckoutError) {
        throw error
      }
      throw new CheckoutError(
        CheckoutErrorCode.CONTRACT_INTERACTION_FAILED,
        `Failed to execute Solana transaction: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  },

  /**
   * Process any payment type and handle errors
   */
  async processPayment(wallet: any, payment: DetailedPaymentOption): Promise<PaymentResult> {
    try {
      const { contractInteraction, recipient, asset, chainMetadata } = payment
      const { chainNamespace,chainId } = chainMetadata

      // ------ Process Solana payments ------
      if (chainNamespace === 'solana') {
        // Check if wallet supports Solana operations
        if (!wallet.getAddress || !wallet.signAndSendTransaction) {
          throw new CheckoutError(
            CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
            'Solana payment requires a compatible wallet'
          )
        }

        // Contract interaction payment
        if (contractInteraction && !recipient) {
          if (contractInteraction.type === 'solana-instruction') {
            return await this.processSolanaContractInteraction(
              wallet,
              contractInteraction as SolanaContractInteraction,
              `${chainNamespace}:${chainId}`
            )
          }
          throw new CheckoutError(CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION)
        }
        
        // Direct payment (with recipient)
        if (recipient && !contractInteraction) {
          const recipientAddress = recipient.split(':')[2]
          const assetParts = asset.split('/')
          const assetNamespace = assetParts[1]?.split(':')[0]
          const assetReference = assetParts[1]?.split(':')[1]
          
          // Handle SOL transfers (slip44:501)
          if (assetNamespace === 'slip44' && assetReference === '501') {
            return await this.processSolanaDirectPayment(
              wallet,
              recipientAddress,
              payment.amount,
              `${chainNamespace}:${chainId}`
            )
          }
          
          // Handle SPL token transfers (token:<mint-address>)
          if (assetNamespace === 'token') {
            return await this.processSolanaSplTokenPayment(
              wallet,
              recipientAddress,
              payment.amount,
              assetReference,
              `${chainNamespace}:${chainId}`
            )
          }
          
          throw new CheckoutError(
            CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION,
            `Unsupported Solana asset type: ${assetNamespace}:${assetReference}`
          )
        }

        // Neither or both are present
        throw new CheckoutError(
          CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
          'Payment must have either recipient or contractInteraction, not both or neither'
        )
      }
      
      // ------ Process EVM payments (existing code) ------
      // Ensure wallet is an EVM wallet
      if (!wallet.sendTransaction) {
        throw new CheckoutError(
          CheckoutErrorCode.INVALID_CHECKOUT_REQUEST, 
          'EVM payment requires an EVM wallet'
        )
      }

      // Direct payment (with recipient)
      if (recipient && !contractInteraction) {
        const { asset, amount, assetMetadata } = payment
        const { assetNamespace } = assetMetadata
        const assetAddress = asset.split(':')[2]
        const recipientAddress = recipient.split(':')[2] as `0x${string}`

        // Handle ETH transfers
        if (assetNamespace === 'slip44' && assetAddress === '60') {
          const tx = await wallet.sendTransaction({
            to: recipientAddress,
            value: BigInt(amount)
          })
          return { txHash: tx.hash }
        }

        // Handle ERC20 transfers
        if (assetNamespace === 'erc20') {
          const calldata = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipientAddress, BigInt(amount)]
          })
          const tx = await wallet.sendTransaction({
            to: assetAddress,
            value: '0x0',
            data: calldata
          })
          return { txHash: tx.hash }
        }

        throw new CheckoutError(CheckoutErrorCode.INVALID_CHECKOUT_REQUEST)
      }
      // Contract interaction payment
      else if (contractInteraction && !recipient) {
        // Handle array of calls
        if (Array.isArray(contractInteraction.data) && contractInteraction.type === 'evm-calls') {
          let lastTxHash = '0x'

          for (const call of contractInteraction.data) {
            console.log('Processing contract call:', call)
            const tx = await wallet.sendTransaction({
              to: call.to,
              value: call.value,
              data: call.data
            })
            console.log('Transaction sent:', tx)
            lastTxHash = tx.hash
          }

          return { txHash: lastTxHash }
        }

        throw new CheckoutError(CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION)
      }

      // Neither or both are present
      throw new CheckoutError(
        CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
        'Payment must have either recipient or contractInteraction, not both or neither'
      )
    } catch (error) {
      console.error('Payment processing error:', error)

      // If it's already a CheckoutError, pass it through
      if (error instanceof CheckoutError) {
        throw error
      }

      // Otherwise create an appropriate error based on payment type
      const { contractInteraction } = payment
      const errorCode = contractInteraction
        ? CheckoutErrorCode.CONTRACT_INTERACTION_FAILED
        : CheckoutErrorCode.DIRECT_PAYMENT_ERROR

      throw new CheckoutError(errorCode)
    }
  }
}

export default WalletCheckoutPaymentHandler
