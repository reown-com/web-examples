import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { InMemorySigner, transactions, utils, Connection } from 'near-api-js'

import { NEAR_SIGNING_METHODS, NEAR_TEST_CHAINS } from '@/data/NEARData'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { nearWallet } from '@/utils/NearWalletUtil'
import { decodeTransaction } from '@/lib/NearLib'

export async function approveNearRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id, topic } = requestEvent
  const { chainId, request } = params

  switch (request.method) {
    case NEAR_SIGNING_METHODS.NEAR_SIGN_IN: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const accounts = await nearWallet.signIn({
        chainId,
        topic,
        permission: request.params.permission,
        accounts: request.params.accounts
      })

      return formatJsonRpcResult(id, accounts)
    }
    case NEAR_SIGNING_METHODS.NEAR_SIGN_OUT: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const accounts = await nearWallet.signOut({
        chainId,
        topic,
        accounts: request.params.accounts
      })

      return formatJsonRpcResult(id, accounts)
    }
    case NEAR_SIGNING_METHODS.NEAR_GET_ACCOUNTS: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const accounts = await nearWallet.getAccounts()

      return formatJsonRpcResult(id, accounts)
    }
    case NEAR_SIGNING_METHODS.NEAR_SIGN_TRANSACTION: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const transactions = [decodeTransaction(params.request.params.transaction)]

      const [signedTx] = await nearWallet.signTransactions({
        chainId,
        topic,
        transactions
      })

      return formatJsonRpcResult(id, signedTx.encode())
    }
    case NEAR_SIGNING_METHODS.NEAR_SIGN_AND_SEND_TRANSACTION: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const transaction = decodeTransaction(params.request.params.transaction)

      console.log('transaction to sign and send', transaction)
      const result = await nearWallet.signAndSendTransaction({
        chainId,
        topic,
        transaction
      })
      console.log('result', result)
      return formatJsonRpcResult(id, result)
    }
    case NEAR_SIGNING_METHODS.NEAR_SIGN_TRANSACTIONS: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const transactions = params.request.params.transactions.map(decodeTransaction)

      const signedTxs = await nearWallet.signTransactions({
        chainId,
        topic,
        transactions
      })

      return formatJsonRpcResult(
        id,
        signedTxs.map(x => x.encode())
      )
    }
    case NEAR_SIGNING_METHODS.NEAR_VERIFY_OWNER: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const accounts = await nearWallet.getAllAccounts()
      const account = accounts.find(acc => acc.accountId === params.request.params.accountId)

      if (!account) {
        throw new Error(`Did not find account with id: ${params.request.params.accountId}`)
      }

      if (!NEAR_TEST_CHAINS[chainId]) {
        throw new Error('Invalid chain id')
      }

      const signer = new InMemorySigner(nearWallet.getKeyStore())
      const networkId = chainId.split(':')[1]
      const connection = Connection.fromConfig({
        networkId,
        provider: { type: 'JsonRpcProvider', args: { url: NEAR_TEST_CHAINS[chainId].rpc } },
        signer
      })

      const blockInfo = await connection.provider.block({ finality: 'final' })
      const publicKey = utils.PublicKey.from(account.publicKey)

      const data = {
        accountId: account.accountId,
        message: params.request.params.message,
        blockId: blockInfo.header.hash,
        publicKey: Buffer.from(publicKey.data).toString('base64'),
        keyType: publicKey.keyType
      }

      const encoded = new Uint8Array(Buffer.from(JSON.stringify(data)))
      const signed = await signer.signMessage(encoded, account.accountId, networkId)

      return formatJsonRpcResult(id, {
        ...data,
        signature: Buffer.from(signed.signature).toString('base64'),
        keyType: signed.publicKey.keyType
      })
    }
    case NEAR_SIGNING_METHODS.NEAR_SIGN_MESSAGE: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const { accountId, publicKey, signature } = await nearWallet.signMessage({
        chainId,
        messageParams: params.request.params
      })

      return formatJsonRpcResult(id, {
        accountId,
        publicKey,
        signature
      })
    }
    case NEAR_SIGNING_METHODS.NEAR_SIGN_AND_SEND_TRANSACTIONS: {
      console.log('approve', { id, params })

      if (!chainId) {
        throw new Error('Invalid chain id')
      }

      const transactions = params.request.params.transactions.map(decodeTransaction)

      const result = await nearWallet.signAndSendTransactions({
        chainId,
        topic,
        transactions
      })

      return formatJsonRpcResult(id, result)
    }
    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectNearRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
