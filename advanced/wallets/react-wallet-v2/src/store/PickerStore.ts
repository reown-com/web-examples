import { proxy } from 'valtio'
import { ExploreDapp, ExploreOpenMode } from '@/data/ExploreDapps'

/**
 * Dapp Picker POC — session-scoped state for the Explore embedded browser.
 *
 * Not persisted: it tracks the currently-open dapp, the connection status pill,
 * and (critically) which pairing topics the wallet itself initiated from a
 * picker tile. `onSessionProposal` consults `pickerPairings` to decide whether
 * a proposal may be auto-approved, and against which origin.
 */

export type PickerConnectionStatus = 'idle' | 'connecting' | 'settled' | 'error'

interface PickerPairing {
  /** Origin the offer arrived from — cross-checked against verifyContext. */
  origin: string
  dappId: string
}

interface State {
  activeDapp: ExploreDapp | null
  /** Fully-built picker URL contract for the active dapp. */
  activeUrl: string | null
  /** How the active dapp was opened (iframe / popup / new tab). */
  activeMode: ExploreOpenMode
  status: PickerConnectionStatus
  statusDetail?: string
  /** pairingTopic -> metadata, for picker-initiated pairings only. */
  pickerPairings: Record<string, PickerPairing>
}

const state = proxy<State>({
  activeDapp: null,
  activeUrl: null,
  activeMode: 'iframe',
  status: 'idle',
  pickerPairings: {}
})

/**
 * Popup handle for popup-embed tiles. Kept OUTSIDE the valtio proxy on purpose:
 * a Window is not a plain value and must not be proxied. Opened synchronously in
 * the click gesture (so the popup blocker allows it), read here for the
 * message-source check and the close-poll.
 */
let popupWindow: Window | null = null
export function setPickerPopup(w: Window | null) {
  popupWindow = w
}
export function getPickerPopup(): Window | null {
  return popupWindow
}

const PickerStore = {
  state,

  openDapp(dapp: ExploreDapp, url: string, mode: ExploreOpenMode) {
    state.activeDapp = dapp
    state.activeUrl = url
    state.activeMode = mode
    state.status = 'connecting'
    state.statusDetail = undefined
  },

  closeDapp() {
    try {
      popupWindow?.close()
    } catch {
      /* ignore */
    }
    popupWindow = null
    state.activeDapp = null
    state.activeUrl = null
    state.activeMode = 'iframe'
    state.status = 'idle'
    state.statusDetail = undefined
  },

  setStatus(status: PickerConnectionStatus, detail?: string) {
    state.status = status
    state.statusDetail = detail
  },

  /** Mark a pairing topic as picker-initiated (records the expected origin). */
  registerPickerPairing(pairingTopic: string, origin: string, dappId: string) {
    state.pickerPairings[pairingTopic] = { origin, dappId }
  },

  isPickerPairing(pairingTopic?: string): boolean {
    return !!pairingTopic && !!state.pickerPairings[pairingTopic]
  },

  getPickerPairing(pairingTopic?: string): PickerPairing | undefined {
    return pairingTopic ? state.pickerPairings[pairingTopic] : undefined
  }
}

export default PickerStore
