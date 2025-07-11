import {
  InMemorySigner,
  providers,
  keyStores as nearKeyStores,
  transactions as nearTransactions,
  utils,
  connect,
  keyStores,
  KeyPair
} from 'near-api-js'
import { parseSeedPhrase } from 'near-seed-phrase'
import { AccessKeyView } from 'near-api-js/lib/providers/provider'
import { Schema, serialize } from 'borsh'

import { walletkit } from '@/utils/WalletConnectUtil'
import { NEAR_TEST_CHAINS, TNearChain } from '@/data/NEARData'

const RPC_URL = 'https://rpc.testnet.near.org'

interface Account {
  accountId: string
  publicKey: string
}

interface Transaction {
  signerId: string
  receiverId: string
  actions: Array<nearTransactions.Action>
}

interface CreateTransactionsParams {
  chainId: string
  transactions: Array<Transaction>
}

interface GetAccountsParams {
  topic: string
}

interface SignInParams {
  chainId: string
  topic: string
  permission: nearTransactions.FunctionCallPermission
  accounts: Array<Account>
}

interface SignOutParams {
  chainId: string
  topic: string
  accounts: Array<Account>
}

interface SignTransactionsParams {
  chainId: string
  topic: string
  transactions: Array<nearTransactions.Transaction>
}

interface SignAndSendTransactionParams {
  chainId: string
  topic: string
  transaction: nearTransactions.Transaction
}

interface SignAndSendTransactionsParams {
  chainId: string
  topic: string
  transactions: Array<nearTransactions.Transaction>
}

export interface SignMessageParamsNEP {
  message: string
  recipient: string
  nonce: Buffer
  callbackUrl?: string
  state?: string
}

interface SignMessageParams {
  chainId: string
  messageParams: SignMessageParamsNEP & {
    accountId?: string
  }
}

interface SignedMessage {
  accountId: string
  publicKey: string
  signature: string
  state?: string
}

export class MessagePayload {
  tag: number
  message: string
  nonce: Buffer
  recipient: string
  callbackUrl?: string

  constructor(data: SignMessageParamsNEP) {
    // The tag's value is a hardcoded value as per
    // defined in the NEP [NEP413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md)
    this.tag = 2147484061
    this.message = data.message
    this.nonce = data.nonce
    this.recipient = data.recipient
    if (data.callbackUrl) {
      this.callbackUrl = data.callbackUrl
    }
  }
}

export const payloadSchema: Schema = {
  struct: {
    tag: 'u32',
    message: 'string',
    nonce: { array: { type: 'u8', len: 32 } },
    recipient: 'string',
    callbackUrl: { option: 'string' }
  }
}

export class NearWallet {
  private networkId: string
  private keyStore: nearKeyStores.KeyStore

  static async init(networkId: string, seedPhrase: string) {
    // Derive keypair from seed phrase
    const { secretKey, publicKey } = parseSeedPhrase(seedPhrase)

    const keyPair = KeyPair.fromString(secretKey)

    const keyStore = new keyStores.BrowserLocalStorageKeyStore()

    await keyStore.setKey(networkId, '0xgancho.testnet', keyPair)

    return new NearWallet(networkId, keyStore)
  }

  private constructor(networkId: string, keyStore: nearKeyStores.KeyStore) {
    this.networkId = networkId
    this.keyStore = keyStore
  }

  getKeyStore() {
    return this.keyStore
  }

  // Retrieve all imported accounts from wallet.
  async getAllAccounts(): Promise<Array<Account>> {
    const accountIds = await this.keyStore.getAccounts(this.networkId)

    return Promise.all(
      accountIds.map(async accountId => {
        const keyPair = await this.keyStore.getKey(this.networkId, accountId)

        return {
          accountId,
          publicKey: keyPair.getPublicKey().toString()
        }
      })
    )
  }

  private isAccountsValid(topic: string, accounts: Array<{ accountId: string }>) {
    const session = walletkit.engine.signClient.session.get(topic)
    const validAccountIds = session.namespaces.near.accounts.map(accountId => {
      return accountId.split(':')[2]
    })

    return accounts.every(({ accountId }) => {
      return validAccountIds.includes(accountId)
    })
  }

  private isTransactionsValid(topic: string, transactions: Array<nearTransactions.Transaction>) {
    const accounts = transactions.map(({ signerId }) => ({ accountId: signerId }))

    return this.isAccountsValid(topic, accounts)
  }

  async createTransactions({
    chainId,
    transactions
  }: CreateTransactionsParams): Promise<Array<nearTransactions.Transaction>> {
    const provider = new providers.JsonRpcProvider(NEAR_TEST_CHAINS[chainId as TNearChain].rpc)
    const txs: Array<nearTransactions.Transaction> = []

    const [block, accounts] = await Promise.all([
      provider.block({ finality: 'final' }),
      this.getAllAccounts()
    ])
    console.log('block', block)
    for (let i = 0; i < transactions.length; i += 1) {
      const transaction = transactions[i]
      const account = accounts.find(x => x.accountId === transaction.signerId)
      console.log('account', account)
      if (!account) {
        throw new Error('Invalid signer id')
      }

      const accessKey = await provider.query<AccessKeyView>({
        request_type: 'view_access_key',
        finality: 'final',
        account_id: transaction.signerId,
        public_key: account.publicKey
      })
      console.log('accessKey', accessKey)
      txs.push(
        nearTransactions.createTransaction(
          transaction.signerId,
          utils.PublicKey.from(account.publicKey),
          transaction.receiverId,
          accessKey.nonce + i + 1,
          transaction.actions,
          new Uint8Array(utils.serialize.base_decode(block.header.hash))
        )
      )
    }

    return txs
  }

  async getAccounts(): Promise<Array<Account>> {
    return this.getAllAccounts()
  }

  async signIn({ chainId, topic, permission, accounts }: SignInParams): Promise<Array<Account>> {
    if (!this.isAccountsValid(topic, accounts)) {
      throw new Error('Invalid accounts')
    }

    const result: Array<Account> = []

    for (let i = 0; i < accounts.length; i += 1) {
      const account = accounts[i]

      try {
        const [transaction] = await this.createTransactions({
          chainId,
          transactions: [
            {
              signerId: account.accountId,
              receiverId: account.accountId,
              actions: [
                nearTransactions.addKey(
                  utils.PublicKey.from(account.publicKey),
                  nearTransactions.functionCallAccessKey(
                    permission.receiverId,
                    permission.methodNames,
                    permission.allowance
                  )
                )
              ]
            }
          ]
        })

        await this.signAndSendTransaction({ chainId, topic, transaction })

        result.push(account)
      } catch (err) {
        console.log(`Failed to create FunctionCall access key for ${account.accountId}`)
        console.error(err)
      }
    }

    return result
  }

  async signOut({ chainId, topic, accounts }: SignOutParams): Promise<Array<Account>> {
    if (!this.isAccountsValid(topic, accounts)) {
      throw new Error('Invalid accounts')
    }

    const result: Array<Account> = []

    for (let i = 0; i < accounts.length; i += 1) {
      const account = accounts[i]

      try {
        const [transaction] = await this.createTransactions({
          chainId,
          transactions: [
            {
              signerId: account.accountId,
              receiverId: account.accountId,
              actions: [nearTransactions.deleteKey(utils.PublicKey.from(account.publicKey))]
            }
          ]
        })

        await this.signAndSendTransaction({ chainId, topic, transaction })
      } catch (err) {
        console.log(`Failed to remove FunctionCall access key for ${account.accountId}`)
        console.error(err)

        result.push(account)
      }
    }

    return result
  }

  async signTransactions({
    chainId,
    topic,
    transactions
  }: SignTransactionsParams): Promise<Array<nearTransactions.SignedTransaction>> {
    const networkId = chainId.split(':')[1]
    const signer = new InMemorySigner(this.keyStore)
    const signedTxs: Array<nearTransactions.SignedTransaction> = []

    if (!this.isTransactionsValid(topic, transactions)) {
      throw new Error('Invalid transactions')
    }

    for (let i = 0; i < transactions.length; i += 1) {
      const transaction = transactions[i]

      const [, signedTx] = await nearTransactions.signTransaction(
        transaction,
        signer,
        transaction.signerId,
        networkId
      )

      signedTxs.push(signedTx)
    }

    return signedTxs
  }

  async signAndSendTransaction({
    chainId,
    topic,
    transaction
  }: SignAndSendTransactionParams): Promise<providers.FinalExecutionOutcome> {
    const provider = new providers.JsonRpcProvider(NEAR_TEST_CHAINS[chainId as TNearChain].rpc)
    const [signedTx] = await this.signTransactions({
      chainId,
      topic,
      transactions: [transaction]
    })
    return provider.sendTransaction(signedTx)
  }

  async signAndSendTransactions({
    chainId,
    topic,
    transactions
  }: SignAndSendTransactionsParams): Promise<Array<providers.FinalExecutionOutcome>> {
    const provider = new providers.JsonRpcProvider(NEAR_TEST_CHAINS[chainId as TNearChain].rpc)
    const signedTxs = await this.signTransactions({ chainId, topic, transactions })
    const results: Array<providers.FinalExecutionOutcome> = []

    for (let i = 0; i < signedTxs.length; i += 1) {
      const signedTx = signedTxs[i]

      results.push(await provider.sendTransaction(signedTx))
    }

    return results
  }

  async signMessage({ chainId, messageParams }: SignMessageParams): Promise<SignedMessage> {
    const { message, nonce, recipient, callbackUrl, state, accountId } = messageParams
    const nonceArray = Buffer.from(nonce)

    if (nonceArray.length !== 32) {
      throw Error('Expected nonce to be a 32 bytes buffer')
    }

    const accounts = await this.getAllAccounts()
    const account = accounts.find(acc => acc.accountId === accountId)

    // If no accountId is provided in params default to the first accountId in accounts.
    // in a real wallet it would default to the `active/selected` account
    // this is because we should be able to use `signMessage` without `signIn`.
    const accId = account ? account.accountId : accounts[0].accountId

    const signer = new InMemorySigner(this.getKeyStore())
    const networkId = chainId.split(':')[1]

    // Create the message payload and sign it
    const payload = new MessagePayload({ message, nonce: nonceArray, recipient, callbackUrl })
    const encodedPayload = serialize(payloadSchema, payload)
    const signed = await signer.signMessage(encodedPayload, accId, networkId)

    return {
      accountId: accId,
      publicKey: signed.publicKey.toString(),
      signature: Buffer.from(signed.signature).toString('base64')
    }
  }
}

// by spec, transactions are encoded as a buffer array
// but JSON.stringify converts it to an object
// so we need to account for both cases
export function decodeTransaction(transaction: Uint8Array | Object) {
  try {
    return nearTransactions.Transaction.decode(Buffer.from(transaction as Uint8Array))
  } catch (error) {
    return nearTransactions.Transaction.decode(Buffer.from(Object.values(transaction as Object)))
  }
}
