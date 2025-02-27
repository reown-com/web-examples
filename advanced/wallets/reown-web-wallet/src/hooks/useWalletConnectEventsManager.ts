import { WalletKitTypes } from '@reown/walletkit'
import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { walletKit } from '@/utils/WalletConnectUtil'
import { SignClientTypes } from '@walletconnect/types'
import { useCallback, useEffect } from 'react'
import { Provider, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { W3mFrameProvider, W3mFrameTypes } from '@reown/appkit-wallet';


export default function useWalletConnectEventsManager(initialized: boolean) {
  const { walletProvider } = useAppKitProvider<W3mFrameProvider>('eip155')

  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback(
    async (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      console.log('useWalletConnectEventsManager: session_proposal', proposal)

      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(proposal.verifyContext)
      console.log('Session Proposal - Opening modal', proposal)
      ModalStore.open('SessionProposalModal', { proposal })
    },
    [walletKit]
  )
  /******************************************************************************
   * 2. Open Auth modal for confirmation / rejection
   *****************************************************************************/
  const onAuthRequest = useCallback((request: WalletKitTypes.SessionAuthenticate) => {
    console.log('onAuthRequest', request)
    ModalStore.open('AuthRequestModal', { request })
  }, [])

  /******************************************************************************
   * 3. Open request handling modal based on method that was used
   *****************************************************************************/
  const onSessionRequest = useCallback(
    async (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      console.log('onSessionRequest', requestEvent)
      const { topic, params, verifyContext, id } = requestEvent
      const { request, chainId: requestChainId } = params
      const requestSession = walletKit.engine.signClient.session.get(topic)

      if (!walletProvider) {
        console.log('AppKit wallet provider is not ready. Rejecting request.')
        return;
      }

      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(verifyContext)
      console.log('requestEvent', requestEvent, walletProvider)

      const { chainId: activeEthChainId } = await walletProvider.getChainId()
      
      const activeChainId = `eip155:${activeEthChainId}`

      if (requestChainId !== activeChainId) {
        ModalStore.open('LoadingModal', {loadingMessage: 'Switching network...'})    
        await walletProvider.switchNetwork(requestChainId)
        ModalStore.close()
      }
      
      try {
        // request.params.chainId = requestChainId.split(':')[1]
        console.log('resolving request', request)
        const response = await walletProvider.request(request as any)
        console.log('response', response)
        await walletKit.respondSessionRequest({
          topic,
          response: formatJsonRpcResult(id, response)
        })
      } catch (e) {
        console.error('error', e)
        const response = rejectEIP155Request(requestEvent)
        await walletKit.respondSessionRequest({
          topic,
          response
        })
      }
    },
    [walletKit, walletProvider]
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
    if (initialized && walletKit) {

      //window['walletKit'] = walletKit   
      console.log('setting up walletconnect event listeners')
      //sign
      walletKit.on('session_proposal', onSessionProposal)
      walletKit.on('session_request', onSessionRequest)
      // auth
      // walletKit.on('session_authenticate', onAuthRequest)
      // TODOs
      walletKit.engine.signClient.events.on('session_ping', data => console.log('ping', data))
      walletKit.on('session_delete', data => {
        console.log('session_delete event received', data)
        SettingsStore.setSessions(Object.values(walletKit.getActiveSessions()))
      })
      // walletKit.on('session_authenticate', onSessionAuthenticate)
      // load sessions on init
      SettingsStore.setSessions(Object.values(walletKit.getActiveSessions()))
    }
  }, [initialized, walletKit, onAuthRequest, onSessionProposal, onSessionRequest, onSessionAuthenticate])
}
