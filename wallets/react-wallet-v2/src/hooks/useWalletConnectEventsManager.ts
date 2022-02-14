import ModalStore from '@/store/ModalStore'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { CLIENT_EVENTS } from '@walletconnect/client'
import { SessionTypes } from '@walletconnect/types'
import { useCallback, useEffect } from 'react'

export default function useWalletConnectEventsManager(initialized: boolean) {
  const onSessionProposal = useCallback((proposal: SessionTypes.Proposal) => {
    ModalStore.open('SessionProposalModal', { proposal })
  }, [])

  const onSessionCreated = useCallback((created: SessionTypes.Created) => {
    // TODO show successful connection feedback here
  }, [])

  const onSessionRequest = useCallback(async (request: SessionTypes.RequestEvent) => {
    const requestSession = await walletConnectClient.session.get(request.topic)
    ModalStore.open('SessionRequestModal', { request, requestSession })
  }, [])

  useEffect(() => {
    if (initialized) {
      // 1. Open session proposal modal for confirmation / rejection
      walletConnectClient.on(CLIENT_EVENTS.session.proposal, onSessionProposal)

      // 2. Open session created modal to show success feedback
      walletConnectClient.on(CLIENT_EVENTS.session.created, onSessionCreated)

      // 3. Open rpc request handling modal
      walletConnectClient.on(CLIENT_EVENTS.session.request, onSessionRequest)
    }
  }, [initialized, onSessionProposal, onSessionCreated, onSessionRequest])
}
