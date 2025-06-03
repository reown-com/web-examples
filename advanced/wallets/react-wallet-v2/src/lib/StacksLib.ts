import { generateWallet, generateSecretKey, Wallet } from '@stacks/wallet-sdk'
import {
  broadcastTransaction,
  getAddressFromPrivateKey,
  getAddressFromPublicKey,
  makeSTXTokenTransfer,
  privateKeyToPublic,
  signMessageHashRsv,
  verifySignature,
  signWithKey,
  hash160,
  publicKeyFromSignatureVrs,
  publicKeyFromSignatureRsv
} from '@stacks/transactions'
import { networkFromName, StacksNetworks } from '@stacks/network'
import { STACKS_MAINNET, STACKS_TESTNET, STACKS_TESTNET_CAIP2 } from '@/data/StacksData'
import { STACKS_MAINNET_CAIP2 } from '@/data/StacksData'
import { sha256 } from '@noble/hashes/sha2'

/**
 * Types
 */
interface IInitArgs {
  mnemonic?: string
}
export interface StacksWallet {
  // getMnemonic(): string
  // getPrivateKey(): string
  // getAddress(): string
  // signMessage(message: string): Promise<string>
  // _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string>
  // connect(provider: providers.JsonRpcProvider): Wallet
  // signTransaction(transaction: providers.TransactionRequest): Promise<string>
}

/**
 * Library
 */
export default class StacksLib implements StacksWallet {
  wallet: Wallet
  addresses: {
    mainnet: string
    testnet: string
  }
  mnemonic: string

  constructor(wallet: Wallet, mnemonic: string) {
    this.wallet = wallet
    this.addresses = {
      mainnet: getAddressFromPrivateKey(
        wallet.accounts[0].stxPrivateKey,
        networkFromName('mainnet')
      ),
      testnet: getAddressFromPrivateKey(
        wallet.accounts[0].stxPrivateKey,
        networkFromName('testnet')
      )
    }
    this.mnemonic = mnemonic
  }

  static async init({ mnemonic }: IInitArgs) {
    const password = 'password'
    const secretKey = mnemonic ? mnemonic : generateSecretKey()

    const wallet = await generateWallet({
      secretKey,
      password
    })
    console.log('stackswallet', wallet)
    return new StacksLib(wallet, secretKey)
  }

  getMnemonic() {
    return this.mnemonic
  }

  getPrivateKey() {
    return this.wallet.configPrivateKey
  }

  getAddress(chainId: string) {
    if (chainId === STACKS_MAINNET_CAIP2) {
      return this.addresses.mainnet
    } else if (chainId === STACKS_TESTNET_CAIP2) {
      return this.addresses.testnet
    }
    console.error(
      `No stacks address found for chainId: ${chainId}, supported chains: ${STACKS_MAINNET_CAIP2}, ${STACKS_TESTNET_CAIP2}`
    )
    return ''
  }

  getAddresses() {
    return this.addresses
  }

  async sendTransfer(request: {
    pubkey: string
    recipient: string
    amount: number
    chainId: string
  }) {
    const address = this.getAddress(request.chainId)
    if (address !== request.pubkey) {
      throw new Error(`Invalid sender pubkey/address: ${request.pubkey}, expected: ${address}`)
    }
    const network = request.chainId === STACKS_MAINNET_CAIP2 ? 'mainnet' : 'testnet'

    const tx = await makeSTXTokenTransfer({
      recipient: request.recipient,
      amount: request.amount,
      senderKey: this.wallet.accounts[0].stxPrivateKey,
      network
    })
    console.log('tx', tx)
    const result = (await broadcastTransaction({
      transaction: tx,
      network
    })) as { error?: string; reason?: string; txid?: string }
    console.log('result', result)
    if (result.error) {
      throw new Error(
        `Transaction broadcast failed: ${(result as any)?.error}: ${(result as any)?.reason}`
      )
    }

    console.log('Transaction broadcasted! TXID:', tx.txid())

    return {
      txId: result.txid
    }
  }

  signMessage(request: { message: string; pubkey: string; chainId: string }) {
    const address = this.getAddress(request.chainId)
    if (address !== request.pubkey) {
      throw new Error(`Invalid sender pubkey/address: ${request.pubkey}, expected: ${address}`)
    }

    const network = this.getNetworkFromAddress(address)
    console.log('signMessage', request.message, network, address)

    /** two separate ways to sign & validate signatures, choose the better one */
    // const hash = Buffer.from(sha256(request.message)).toString('hex')
    // const sig1 = signWithKey(this.wallet.accounts[0].stxPrivateKey, hash)
    // const pubKey = publicKeyFromSignatureVrs(hash, sig1)
    // // Skip the recovery params bytes from signature and then verify
    // const isValid = verifySignature(sig1.slice(2), hash, pubKey)

    const hash = Buffer.from(sha256(request.message)).toString('hex')
    const signature = signMessageHashRsv({
      messageHash: hash,
      privateKey: this.wallet.accounts[0].stxPrivateKey
    })

    console.log('signature', signature)
    const pubKey = publicKeyFromSignatureRsv(hash, signature)

    console.log('isValid', getAddressFromPublicKey(pubKey, network), address)

    if (getAddressFromPublicKey(pubKey, network) !== address) {
      throw new Error(
        `Signing failed, expected address: ${address}, got: ${getAddressFromPublicKey(
          pubKey,
          network
        )}`
      )
    }

    return {
      signature
    }
  }

  private getNetworkFromAddress(address: string) {
    switch (address) {
      case this.addresses.mainnet:
        return 'mainnet'
      case this.addresses.testnet:
        return 'testnet'
      default:
        throw new Error(`Invalid address: ${address}`)
    }
  }
}
