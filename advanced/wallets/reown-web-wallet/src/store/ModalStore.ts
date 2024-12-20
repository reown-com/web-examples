import { SessionTypes, SignClientTypes } from '@walletconnect/types'
import { WalletKitTypes } from '@reown/walletkit'
import { proxy } from 'valtio'

/**
 * Types
 */
interface ModalData {
  proposal?: SignClientTypes.EventArguments['session_proposal']
  requestEvent?: SignClientTypes.EventArguments['session_request']
  requestSession?: SessionTypes.Struct
  request?: WalletKitTypes.SessionAuthenticate
  loadingMessage?: string
  authRequest?: SignClientTypes.EventArguments['session_authenticate']
}

interface State {
  open: boolean
  view?:
    | 'SessionProposalModal'
    | 'SessionSignModal'
    | 'SessionSignTypedDataModal'
    | 'SessionSendTransactionModal'
    | 'SessionSendCallsModal'
    | 'SessionUnsuportedMethodModal'
    | 'SessionSignCosmosModal'
    | 'SessionSignSolanaModal'
    | 'SessionSignPolkadotModal'
    | 'SessionSignNearModal'
    | 'SessionSignMultiversxModal'
    | 'SessionSignTronModal'
    | 'SessionSignTezosModal'
    | 'SessionSignKadenaModal'
    | 'AuthRequestModal'
    | 'SessionAuthenticateModal'
    | 'LoadingModal'
    | 'AppKitConnectionModal',
  data?: ModalData
}

/**
 * State
 */
const state = proxy<State>({
  open: false
})

/**
 * Store / Actions
 */
const ModalStore = {
  state,

  open(view: State['view'], data: State['data']) {
    state.view = view
    state.data = data
    state.open = true
  },

  close() {
    state.open = false
  }
}

export default ModalStore
