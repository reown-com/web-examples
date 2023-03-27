import {
  Abi,
  Account,
  Call,
  Calldata,
  ec,
  hash,
  InvocationsSignerDetails,
  Provider,
  stark
} from 'starknet'

/**
 * Types
 */
type TNetwork = 'goerli-alpha' | 'mainnet-alpha'

interface IInitArgs {
  privateKey?: string
  network: TNetwork
}

/**
 * Library
 */
export default class StarkNetLib {
  wallet: Account
  provider: Provider
  OZaccountClassHash: string
  OZaccountConstructorCallData?: Calldata
  OZcontractAddress?: string
  starkKeyPub?: string
  starkKeyPair?: string

  constructor(wallet: Account, network: TNetwork) {
    this.wallet = wallet
    this.OZaccountClassHash = '0x2794ce20e5f2ff0d40e632cb53845b9f4e526ebd8471983f7dbd355b721d5a'
    this.provider = new Provider({ sequencer: { network } })
  }

  init({ privateKey, network }: IInitArgs) {
    // connect provider
    const starkKeyPair = privateKey
      ? ec.getKeyPair(privateKey)
      : ec.getKeyPair(stark.randomAddress())
    this.starkKeyPair = starkKeyPair
    const starkKeyPub = ec.getStarkKey(starkKeyPair)
    this.starkKeyPub = starkKeyPub
    // Calculate future address of the account
    const OZaccountClassHash = '0x2794ce20e5f2ff0d40e632cb53845b9f4e526ebd8471983f7dbd355b721d5a'
    const OZaccountConstructorCallData = stark.compileCalldata({ publicKey: starkKeyPub })
    this.OZaccountConstructorCallData = OZaccountConstructorCallData
    const OZcontractAddress = hash.calculateContractAddressFromHash(
      starkKeyPub,
      OZaccountClassHash,
      OZaccountConstructorCallData,
      0
    )
    this.OZcontractAddress = OZcontractAddress

    const OZaccount = new Account(this.provider, OZcontractAddress, starkKeyPair)

    return new StarkNetLib(OZaccount, network)
  }

  async deployAccount() {
    const { transaction_hash, contract_address } = await this.wallet.deployAccount({
      classHash: this.OZaccountClassHash,
      constructorCalldata: this.OZaccountConstructorCallData,
      addressSalt: this.starkKeyPub
    })
    this.OZcontractAddress = contract_address
    return await this.provider.waitForTransaction(transaction_hash)
  }

  getStarkName() {
    return this.wallet.getStarkName(this.getAddress())
  }

  getAddress() {
    return this.wallet.address
  }

  signMessage(domain: any, types: any, data: any) {
    return this.wallet.signMessage({
      domain,
      types,
      message: data,
      primaryType: 'string'
    })
  }

  connect(provider?: Provider, accountAddress?: string, starkKeyPair?: string) {
    const address = accountAddress ?? this.OZcontractAddress
    const keyPair = starkKeyPair ?? this.starkKeyPair
    if (!address) {
      throw new Error('Account address is undefined')
    }
    if (!keyPair) {
      throw new Error('StarkKeyPair is undefined')
    }
    return new Account(provider ?? this.provider, address, keyPair)
  }

  signTransaction(transaction: Call, transactionDetails: InvocationsSignerDetails, abis?: Abi[]) {
    return this.wallet.signer.signTransaction([transaction], transactionDetails, abis)
  }
}
