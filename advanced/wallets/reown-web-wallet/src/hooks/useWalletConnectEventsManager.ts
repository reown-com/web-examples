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
  const { address, isConnected, caipAddress, status } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<W3mFrameProvider>('eip155')

  useEffect(() => {
    if (!walletProvider) return

    console.log('walletProvider', walletProvider)

    walletProvider.onSetPreferredAccount(async (account) => {
      console.log('onSetPreferredAccount', account.address)

      const {chainId} = await walletProvider.getChainId();
      const chainIdString = chainId.toString()
      console

      const sessions = walletKit.getActiveSessions()
      console.log('sessions', sessions)

      Object.values(sessions).forEach(async session => {
        await walletKit.updateSession({
          topic: session.topic,
          namespaces: {
            ...session.namespaces,
            eip155: {
              ...session.namespaces.eip155,
              accounts: [`eip155:1:${account.address}`]
            }
          }
        })
      })
    })

  }, [walletProvider])


  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback(
    async (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      console.log('session_proposal', proposal)


      if (!isConnected || !walletProvider) {


        await new Promise(resolve => setTimeout(resolve, 1000))

        // save proposal in local storage
        // localStorage.setItem('pendingSessionProposal', JSON.stringify(proposal))
        let pendingSessionProposals = Object.values(await walletKit.getPendingSessionProposals())

        console.log('pendingSessionProposals before appkit', pendingSessionProposals)



        console.log('onSessionProposal - opening connection modal', isConnected, walletProvider)
        ModalStore.open('AppKitConnectionModal', undefined)
        return;
      }

      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(proposal.verifyContext)
      console.log('Session Proposal - Opening modal', proposal)
      ModalStore.open('SessionProposalModal', { proposal })
    },
    [walletKit, walletProvider]
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
      const { topic, params, verifyContext, id } = requestEvent
      const { request } = params
      const requestSession = walletKit.engine.signClient.session.get(topic)
      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(verifyContext)
      console.log('requestEvent', requestEvent, walletProvider)

      if (!walletProvider) 
        return;
      // if (!walletProvider) {
      //   console.log('AppKit wallet provider is not ready. Rejecting request.')
      //   const response = {
      //     id,
      //     jsonrpc: '2.0',
      //     error: {
      //       code: 5000,
      //       message: 'User rejected. AppKit wallet provider is not ready.'
      //     }
      //   }
      //   await walletKit.respondSessionRequest({
      //     topic,
      //     response
      //   })
      //   console.log('rejected')
      //   return
      // }
      try {
        console.log('resolving request', requestEvent)
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

      window['walletkit'] = walletKit

      
      //sign
      walletKit.on('session_proposal', onSessionProposal)
      walletKit.on('session_request', onSessionRequest)
      walletKit.on('session_request', () => console.log('session_request!'))
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
  }, [initialized, onAuthRequest, onSessionProposal, onSessionRequest, onSessionAuthenticate])
}
