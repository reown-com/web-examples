import { useCallback, useEffect, useRef } from 'react'
import { SignClientTypes } from '@walletconnect/types'
import { walletkit } from '@/utils/walletConnect'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'

/**
 * Wires up the WalletKit events we care about for this demo:
 * - session_proposal → open the approve/reject proposal modal
 * - session_request  → open the approve/reject request modal
 * - session_delete   → refresh the active sessions list
 */
export default function useWalletConnectEventsManager(initialized: boolean) {
  const registered = useRef(false)

  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      ModalStore.open('SessionProposal', { proposal })
    },
    []
  )

  const onSessionRequest = useCallback(
    (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      const requestSession = walletkit.engine.signClient.session.get(requestEvent.topic)
      ModalStore.open('SessionRequest', { requestEvent, requestSession })
    },
    []
  )

  const refreshSessions = useCallback(() => {
    SettingsStore.setSessions(Object.values(walletkit.getActiveSessions()))
  }, [])

  useEffect(() => {
    if (!initialized || !walletkit || registered.current) return
    registered.current = true

    walletkit.on('session_proposal', onSessionProposal)
    walletkit.on('session_request', onSessionRequest)
    walletkit.on('session_delete', refreshSessions)
  }, [initialized, onSessionProposal, onSessionRequest, refreshSessions])
}
