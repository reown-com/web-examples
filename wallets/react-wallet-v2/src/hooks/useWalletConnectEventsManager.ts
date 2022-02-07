import { client } from '@/utils/WalletConnectUtil'
import { CLIENT_EVENTS } from '@walletconnect/client'
import { SessionTypes } from '@walletconnect/types'
import { useCallback, useEffect } from 'react'

export default function useWalletConnectEventsManager(initialized: boolean) {
  const onSessionProposal = useCallback((proposal: SessionTypes.Proposal) => {
    console.log(proposal)
  }, [])

  useEffect(() => {
    if (initialized) {
      client?.on(CLIENT_EVENTS.session.proposal, onSessionProposal)
    }
  }, [initialized, onSessionProposal])
}
