import { proxy } from 'valtio'
import { UserPosition, TransactionState, ProtocolConfig } from '@/types/earn'

/**
 * Types
 */
interface State {
  // Selected protocol and chain
  selectedProtocol: ProtocolConfig | null
  selectedChainId: number

  // User positions
  positions: UserPosition[]
  positionsLoading: boolean

  // Transaction states
  approvalState: TransactionState
  depositState: TransactionState
  withdrawState: TransactionState

  // Input amounts
  depositAmount: string
  withdrawAmount: string

  // Active tab
  activeTab: 'earn' | 'positions'
}

/**
 * State
 */
const state = proxy<State>({
  selectedProtocol: null,
  selectedChainId: 8453, // Base by default

  positions: [],
  positionsLoading: false,

  approvalState: {
    status: 'idle'
  },
  depositState: {
    status: 'idle'
  },
  withdrawState: {
    status: 'idle'
  },

  depositAmount: '',
  withdrawAmount: '',

  activeTab: 'earn'
})

/**
 * Store / Actions
 */
const EarnStore = {
  state,

  // Protocol selection
  setSelectedProtocol(protocol: ProtocolConfig | null) {
    state.selectedProtocol = protocol
  },

  setSelectedChainId(chainId: number) {
    state.selectedChainId = chainId
    // Reset selected protocol when chain changes
    state.selectedProtocol = null
  },

  // Tab management
  setActiveTab(tab: 'earn' | 'positions') {
    state.activeTab = tab
  },

  // Amount management
  setDepositAmount(amount: string) {
    state.depositAmount = amount
  },

  setWithdrawAmount(amount: string) {
    state.withdrawAmount = amount
  },

  // Position management
  setPositions(positions: UserPosition[]) {
    state.positions = positions
  },

  setPositionsLoading(loading: boolean) {
    state.positionsLoading = loading
  },

  addPosition(position: UserPosition) {
    state.positions.push(position)
  },

  removePosition(protocol: string, chainId: number) {
    state.positions = state.positions.filter(
      p => !(p.protocol === protocol && p.chainId === chainId)
    )
  },

  updatePosition(protocol: string, chainId: number, updates: Partial<UserPosition>) {
    const index = state.positions.findIndex(p => p.protocol === protocol && p.chainId === chainId)
    if (index !== -1) {
      state.positions[index] = { ...state.positions[index], ...updates }
    }
  },

  // Transaction state management
  setApprovalState(txState: Partial<TransactionState>) {
    state.approvalState = { ...state.approvalState, ...txState }
  },

  setDepositState(txState: Partial<TransactionState>) {
    state.depositState = { ...state.depositState, ...txState }
  },

  setWithdrawState(txState: Partial<TransactionState>) {
    state.withdrawState = { ...state.withdrawState, ...txState }
  },

  resetApprovalState() {
    state.approvalState = { status: 'idle' }
  },

  resetDepositState() {
    state.depositState = { status: 'idle' }
  },

  resetWithdrawState() {
    state.withdrawState = { status: 'idle' }
  },

  // Reset all transaction states
  resetAllTransactionStates() {
    this.resetApprovalState()
    this.resetDepositState()
    this.resetWithdrawState()
  },

  // Reset entire store
  reset() {
    state.selectedProtocol = null
    state.selectedChainId = 8453
    state.positions = []
    state.positionsLoading = false
    state.depositAmount = ''
    state.withdrawAmount = ''
    state.activeTab = 'earn'
    this.resetAllTransactionStates()
  }
}

export default EarnStore
