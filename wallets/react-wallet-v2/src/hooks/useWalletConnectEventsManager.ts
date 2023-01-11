import { COSMOS_SIGNING_METHODS } from '@/data/COSMOSData'
import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import { SOLANA_SIGNING_METHODS } from '@/data/SolanaData'
import { POLKADOT_SIGNING_METHODS } from '@/data/PolkadotData'
import { ELROND_SIGNING_METHODS } from '@/data/ElrondData'
import ModalStore from '@/store/ModalStore'
import { pushClient, signClient } from '@/utils/WalletConnectUtil'
import { SignClientTypes } from '@walletconnect/types'
import { useCallback, useEffect } from 'react'
import { NEAR_SIGNING_METHODS } from '@/data/NEARData'
import { approveNearRequest } from '@/utils/NearRequestHandlerUtil'
import { PushClientTypes } from '@walletconnect/push-client/dist/types/types'

export default function useWalletConnectEventsManager(initialized: boolean) {
  /******************************************************************************
   * Sign SDK Event Handlers
   *****************************************************************************/
  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      ModalStore.open('SessionProposalModal', { proposal })
    },
    []
  )

  const onSessionRequest = useCallback(
    async (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      console.log('session_request', requestEvent)
      const { topic, params } = requestEvent
      const { request } = params
      const requestSession = signClient.session.get(topic)

      switch (request.method) {
        case EIP155_SIGNING_METHODS.ETH_SIGN:
        case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
          return ModalStore.open('SessionSignModal', { requestEvent, requestSession })

        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
          return ModalStore.open('SessionSignTypedDataModal', { requestEvent, requestSession })

        case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
          return ModalStore.open('SessionSendTransactionModal', { requestEvent, requestSession })

        case COSMOS_SIGNING_METHODS.COSMOS_SIGN_DIRECT:
        case COSMOS_SIGNING_METHODS.COSMOS_SIGN_AMINO:
          return ModalStore.open('SessionSignCosmosModal', { requestEvent, requestSession })

        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE:
        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_TRANSACTION:
          return ModalStore.open('SessionSignSolanaModal', { requestEvent, requestSession })

        case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_MESSAGE:
        case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_TRANSACTION:
          return ModalStore.open('SessionSignPolkadotModal', { requestEvent, requestSession })

        case NEAR_SIGNING_METHODS.NEAR_SIGN_IN:
        case NEAR_SIGNING_METHODS.NEAR_SIGN_OUT:
        case NEAR_SIGNING_METHODS.NEAR_SIGN_TRANSACTION:
        case NEAR_SIGNING_METHODS.NEAR_SIGN_AND_SEND_TRANSACTION:
        case NEAR_SIGNING_METHODS.NEAR_SIGN_TRANSACTIONS:
        case NEAR_SIGNING_METHODS.NEAR_SIGN_AND_SEND_TRANSACTIONS:
        case NEAR_SIGNING_METHODS.NEAR_VERIFY_OWNER:
          return ModalStore.open('SessionSignNearModal', { requestEvent, requestSession })

        case ELROND_SIGNING_METHODS.ELROND_SIGN_MESSAGE:
        case ELROND_SIGNING_METHODS.ELROND_SIGN_TRANSACTION:
        case ELROND_SIGNING_METHODS.ELROND_SIGN_TRANSACTIONS:
        case ELROND_SIGNING_METHODS.ELROND_SIGN_LOGIN_TOKEN:
          return ModalStore.open('SessionSignElrondModal', { requestEvent, requestSession })

        case NEAR_SIGNING_METHODS.NEAR_GET_ACCOUNTS:
          return signClient.respond({
            topic,
            response: await approveNearRequest(requestEvent)
          })
        default:
          return ModalStore.open('SessionUnsuportedMethodModal', { requestEvent, requestSession })
      }
    },
    []
  )

  /******************************************************************************
   * Push SDK Event Handlers
   *****************************************************************************/

  const onPushRequest = useCallback(
    (pushRequestEvent: PushClientTypes.EventArguments['push_request']) => {
      ModalStore.open('PushSubscriptionRequestModal', { pushRequestEvent })
    },
    []
  )

  /******************************************************************************
   * Set up event listeners
   *****************************************************************************/
  useEffect(() => {
    if (initialized) {
      signClient.on('session_proposal', onSessionProposal)
      signClient.on('session_request', onSessionRequest)
      // TODOs
      signClient.on('session_ping', data => console.log('ping', data))
      signClient.on('session_event', data => console.log('event', data))
      signClient.on('session_update', data => console.log('update', data))
      signClient.on('session_delete', data => console.log('delete', data))
    }
  }, [initialized, onSessionProposal, onSessionRequest])

  useEffect(() => {
    if (initialized) {
      // Listen for relevant push events
      pushClient.on('push_request', event => {
        console.log('[PUSH DEMO] Got push subscription request with id: ' + event.id, event)
        onPushRequest(event)
      })
      pushClient.on('push_message', async event => {
        console.log('[PUSH DEMO] Received push message event: ', event)
        const {
          params: { message }
        } = event
        new Notification(message.title, { body: message.body, icon: message.icon })
      })
    }
  }, [initialized, onPushRequest])
}
