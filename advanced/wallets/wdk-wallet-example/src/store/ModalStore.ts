import { proxy } from 'valtio'
import { SignClientTypes } from '@walletconnect/types'

export type ModalView = 'SessionProposal' | 'SessionRequest' | 'Payment'

interface ModalData {
  proposal?: SignClientTypes.EventArguments['session_proposal']
  requestEvent?: SignClientTypes.EventArguments['session_request']
  requestSession?: SignClientTypes.EventArguments['session_request'] extends never ? never : any
}

interface State {
  open: boolean
  view?: ModalView
  data: ModalData
}

const state = proxy<State>({
  open: false,
  data: {}
})

const ModalStore = {
  state,
  open(view: ModalView, data: ModalData) {
    state.view = view
    state.data = data
    state.open = true
  },
  close() {
    state.open = false
    state.data = {}
  }
}

export default ModalStore
