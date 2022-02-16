import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { CLIENT_EVENTS } from '@walletconnect/client'
import { SessionTypes } from '@walletconnect/types'
import { useCallback, useEffect } from 'react'

export default function useWalletConnectEventsManager(initialized: boolean) {
  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback((proposal: SessionTypes.Proposal) => {
    ModalStore.open('SessionProposalModal', { proposal })
  }, [])

  /******************************************************************************
   * 2. Open session created modal to show success feedback
   *****************************************************************************/
  const onSessionCreated = useCallback((created: SessionTypes.Created) => {}, [])

  /******************************************************************************
   * 3. Open request handling modal based on method that was used
   *****************************************************************************/
  const onSessionRequest = useCallback(async (requestEvent: SessionTypes.RequestEvent) => {
    const { topic, request } = requestEvent
    const { method } = request
    const requestSession = await walletConnectClient.session.get(topic)

    if ([EIP155_SIGNING_METHODS.ETH_SIGN, EIP155_SIGNING_METHODS.PERSONAL_SIGN].includes(method)) {
      ModalStore.open('SessionSignModal', { requestEvent, requestSession })
    }

    if (
      [
        EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA,
        EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3,
        EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4
      ].includes(method)
    ) {
      ModalStore.open('SessionSignTypedDataModal', { requestEvent, requestSession })
    }

    if (EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION) {
      ModalStore.open('SessionSendTransactionModal', { requestEvent, requestSession })
    }
  }, [])

  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (initialized) {
      walletConnectClient.on(CLIENT_EVENTS.session.proposal, onSessionProposal)

      walletConnectClient.on(CLIENT_EVENTS.session.created, onSessionCreated)

      walletConnectClient.on(CLIENT_EVENTS.session.request, onSessionRequest)
    }
  }, [initialized, onSessionProposal, onSessionCreated, onSessionRequest])
}
