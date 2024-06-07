/* eslint-disable react-hooks/rules-of-hooks */
import { transactions } from 'near-api-js'
import { Divider, Text } from '@nextui-org/react'

import RequestDataCard from '@/components/RequestDataCard'
import RequestDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { approveNearRequest, rejectNearRequest } from '@/utils/NearRequestHandlerUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { NEAR_SIGNING_METHODS } from '@/data/NEARData'
import { styledToast } from '@/utils/HelperUtil'
import RequestModal from './RequestModal'
import { useCallback, useState } from 'react'

export default function SessionSignNearModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { topic, params } = requestEvent
  const { request, chainId } = params

  const formatTransaction = (transaction: Uint8Array) => {
    const tx = transactions.Transaction.decode(Buffer.from(transaction))

    return {
      signerId: tx.signerId,
      receiverId: tx.receiverId,
      publicKey: tx.publicKey.toString(),
      actions: tx.actions.map(action => {
        switch (action.enum) {
          case 'createAccount': {
            return {
              type: 'CreateAccount',
              params: action.createAccount
            }
          }
          case 'deployContract': {
            return {
              type: 'DeployContract',
              params: {
                ...action.deployContract,
                args: Buffer.from(action.deployContract.code).toString()
              }
            }
          }
          case 'functionCall': {
            return {
              type: 'FunctionCall',
              params: {
                ...action.functionCall,
                args: JSON.parse(Buffer.from(action.functionCall.args).toString())
              }
            }
          }
          case 'transfer': {
            return {
              type: 'Transfer',
              params: action.transfer
            }
          }
          case 'stake': {
            return {
              type: 'Stake',
              params: {
                ...action.stake,
                publicKey: action.stake.publicKey.toString()
              }
            }
          }
          case 'addKey': {
            return {
              type: 'AddKey',
              params: {
                ...action.addKey,
                publicKey: action.addKey.publicKey.toString()
              }
            }
          }
          case 'deleteKey': {
            return {
              type: 'DeleteKey',
              params: {
                ...action.deleteKey,
                publicKey: action.deleteKey.publicKey.toString()
              }
            }
          }
          case 'deleteAccount': {
            return {
              type: 'DeleteAccount',
              params: action.deleteAccount
            }
          }
          default:
            return {
              type: action.enum,
              params: {}
            }
        }
      })
    }
  }

  const formatParams = () => {
    switch (params.request.method) {
      case NEAR_SIGNING_METHODS.NEAR_SIGN_TRANSACTION:
        return {
          ...params,
          request: {
            ...params.request,
            params: {
              ...params.request.params,
              transaction: formatTransaction(params.request.params.transaction)
            }
          }
        }
      case NEAR_SIGNING_METHODS.NEAR_SIGN_TRANSACTIONS:
        return {
          ...params,
          request: {
            ...params.request,
            params: {
              ...params.request.params,
              transactions: params.request.params.transactions.map(formatTransaction)
            }
          }
        }
      default:
        return params
    }
  }

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    if (requestEvent) {
      setIsLoadingApprove(true)
      const response = await approveNearRequest(requestEvent)
      try {
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        setIsLoadingApprove(false)
        styledToast((e as Error).message, 'error')
        return
      }
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent) {
      setIsLoadingReject(true)
      const response = rejectNearRequest(requestEvent)
      try {
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        setIsLoadingReject(false)
        styledToast((e as Error).message, 'error')
        return
      }
      setIsLoadingReject(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  return (
    <RequestModal
      intention="sign NEAR message"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <RequestDetailsCard chains={[chainId ?? '']} protocol={requestSession.relay.protocol} />
      <Divider y={1} />
      <RequestDataCard data={formatParams()} />
      <Divider y={1} />
      <RequestMethodCard methods={[request.method]} />
    </RequestModal>
  )
}
