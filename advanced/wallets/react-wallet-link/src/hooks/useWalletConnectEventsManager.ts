import { Web3WalletTypes } from '@walletconnect/web3wallet'
import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import { EIP5792_METHODS } from '@/data/EIP5792Data'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { SignClientTypes } from '@walletconnect/types'
import { useCallback, useEffect } from 'react'
import { formatJsonRpcError } from '@json-rpc-tools/utils'
import { approveEIP5792Request } from '@/utils/EIP5792RequestHandlerUtils'
import EIP155Lib from '@/lib/EIP155Lib'
import { getWallet } from '@/utils/EIP155WalletUtil'

export default function useWalletConnectEventsManager(initialized: boolean) {
  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      console.log('session_proposal', proposal)
      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(proposal.verifyContext)
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

        case EIP5792_METHODS.WALLET_GET_CAPABILITIES:
        case EIP5792_METHODS.WALLET_GET_CALLS_STATUS:
          return await web3wallet.respondSessionRequest({
            topic,
            response: await approveEIP5792Request(requestEvent)
          })

        case EIP5792_METHODS.WALLET_SHOW_CALLS_STATUS:
          return await web3wallet.respondSessionRequest({
            topic,
            response: formatJsonRpcError(id, "Wallet currently don't show call status.")
          })

        case EIP5792_METHODS.WALLET_SEND_CALLS: {
          const wallet = await getWallet(params)
          if (wallet instanceof EIP155Lib) {
            /**
             * Not Supporting for batch calls on EOA for now.
             * if EOA, we can submit call one by one, but need to have a data structure
             * to return bundle id, for all the calls,
             */
            return await web3wallet.respondSessionRequest({
              topic,
              response: formatJsonRpcError(id, "Wallet currently don't support batch call for EOA")
            })
          }
          return ModalStore.open('SessionSendCallsModal', { requestEvent, requestSession })
        }
        default:
          return ModalStore.open('SessionUnsuportedMethodModal', { requestEvent, requestSession })
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
  }, [initialized, onAuthRequest, onSessionProposal, onSessionRequest])
}
