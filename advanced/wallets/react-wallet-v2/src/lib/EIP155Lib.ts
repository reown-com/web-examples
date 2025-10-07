import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { EngineTypes } from '@walletconnect/types'
import { parseChainId } from '@walletconnect/utils'
import { ethers, providers, Wallet } from 'ethers'
import { encodeFunctionData } from 'viem'

/**
 * Types
 */
interface IInitArgs {
  mnemonic?: string
}

const ERC20_ABI = ['function transfer(address to, uint256 amount) public returns (bool)']

export interface EIP155Wallet {
  getMnemonic(): string
  getPrivateKey(): string
  getAddress(): string
  signMessage(message: string): Promise<string>
  _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string>
  connect(provider: providers.JsonRpcProvider): Wallet
  signTransaction(transaction: providers.TransactionRequest): Promise<string>
}

/**
 * Library
 */
export default class EIP155Lib implements EIP155Wallet {
  wallet: Wallet

  constructor(wallet: Wallet) {
    this.wallet = wallet
  }

  static init({ mnemonic }: IInitArgs) {
    const wallet = mnemonic ? Wallet.fromMnemonic(mnemonic) : Wallet.createRandom()

    return new EIP155Lib(wallet)
  }

  getMnemonic() {
    return this.wallet.mnemonic.phrase
  }

  getPrivateKey() {
    return this.wallet.privateKey
  }

  getAddress() {
    return this.wallet.address
  }

  signMessage(message: string) {
    return this.wallet.signMessage(message)
  }

  _signTypedData(domain: any, types: any, data: any, _primaryType?: string) {
    return this.wallet._signTypedData(domain, types, data)
  }

  connect(provider: providers.JsonRpcProvider) {
    return this.wallet.connect(provider)
  }

  signTransaction(transaction: providers.TransactionRequest) {
    return this.wallet.signTransaction(transaction)
  }

  async walletPay(walletPay: EngineTypes.WalletPayParams) {
    // {
    //   "asset": "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    //   "amount": "0x186a0",
    //   "recipient": "eip155:8453:0x13A2Ff792037AA2cd77fE1f4B522921ac59a9C52"
    // }

    const address = this.getAddress()
    const chainId = parseChainId(walletPay.acceptedPayments[0].recipient)
    const asset = walletPay.acceptedPayments[0].asset
    const assetAddress = asset.split(':')[2]
    const assetAmount = walletPay.acceptedPayments[0].amount
    const assetRecipient = walletPay.acceptedPayments[0].recipient
    const recepientAddress = assetRecipient.split(':')[2]
    console.log({ address, asset, assetAddress, assetAmount, assetRecipient, recepientAddress })

    const newWallet = new ethers.Wallet(
      this.getPrivateKey(),
      new ethers.providers.JsonRpcProvider(
        EIP155_CHAINS[`${chainId.namespace}:${chainId.reference}` as TEIP155Chain].rpc
      )
    )
    const token = new ethers.Contract(assetAddress, ERC20_ABI, newWallet)
    const tx = await token.transfer(recepientAddress, assetAmount, {
      gasLimit: 100_000n // manually override
    })
    const receipt = await tx.wait()
    console.log({ receipt })
    return {
      version: walletPay.version,
      orderId: walletPay.orderId,
      txid: receipt.transactionHash,
      recipient: walletPay.acceptedPayments[0].recipient,
      asset: asset,
      amount: assetAmount
    }
  }
}
