import { Web3WalletTypes } from '@walletconnect/web3wallet'
import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { SignClientTypes } from '@walletconnect/types'
import { useCallback, useEffect } from 'react'
import { useAppKitProvider } from '@reown/appkit/react'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'

export default function useWalletConnectEventsManager(initialized: boolean) {
  const { walletProvider } = useAppKitProvider('eip155')


  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      console.log('session_proposal', proposal)
      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(proposal.verifyContext)
      console.log('Session Proposal - Opening modal', proposal)
      ModalStore.open('SessionProposalModal', { proposal })
    },
    []
  )
  /******************************************************************************
   * 2. Open Auth modal for confirmation / rejection
   *****************************************************************************/
  const onAuthRequest = useCallback((request: Web3WalletTypes.AuthRequest) => {
    ModalStore.open('AuthRequestModal', { request })
  }, [])

  /******************************************************************************
   * 3. Open request handling modal based on method that was used
   *****************************************************************************/
  const onSessionRequest = useCallback(
    async (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      const { topic, params, verifyContext, id } = requestEvent
      const { request } = params
      const requestSession = web3wallet.engine.signClient.session.get(topic)
      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(verifyContext)
      console.log('requestEvent', requestEvent, walletProvider)
      if (!walletProvider) return
      try {
        console.log('resolving request', requestEvent)
        const response = walletProvider.request(request)
        console.log('response', response)
        await web3wallet.respondSessionRequest({
          topic,
          response: formatJsonRpcResult(id, response)
        })
      } catch (e) {
        console.error('error', e)
        const response = rejectEIP155Request(requestEvent)
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      }
    },
    []
  )

  const onSessionAuthenticate = useCallback(
    (authRequest: SignClientTypes.EventArguments['session_authenticate']) => {
      ModalStore.open('SessionAuthenticateModal', { authRequest })
    },
    []
  )

  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (initialized && web3wallet) {
      //sign
      web3wallet.on('session_proposal', onSessionProposal)
      web3wallet.on('session_request', onSessionRequest)
      // auth
      web3wallet.on('auth_request', onAuthRequest)
      // TODOs
      web3wallet.engine.signClient.events.on('session_ping', data => console.log('ping', data))
      web3wallet.on('session_delete', data => {
        console.log('session_delete event received', data)
        SettingsStore.setSessions(Object.values(web3wallet.getActiveSessions()))
      })
      web3wallet.on('session_authenticate', onSessionAuthenticate)
      // load sessions on init
      SettingsStore.setSessions(Object.values(web3wallet.getActiveSessions()))
    }
  }, [initialized, onAuthRequest, onSessionProposal, onSessionRequest, onSessionAuthenticate])
}
