import { proxy } from 'valtio'
import { SignClientTypes } from '@walletconnect/types'
import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { pairWithUri, walletkit } from '@/utils/WalletConnectUtil'
import {
  isTerminalAction,
  McpAction,
  McpApi,
  McpApiError,
  McpPortfolio,
  McpServerInfo,
  McpSession,
  McpStep,
  McpStepTx,
  McpSwapAssets,
  McpToolResult,
  McpWalletStatus
} from '@/utils/McpApiUtil'
import {
  completeAuthorization,
  hasTokens,
  McpAuthError,
  revokeTokens,
  startAuthorization
} from '@/utils/McpAuthUtil'

/**
 * Types
 */
export type McpPhase = 'idle' | 'pairing' | 'loading' | 'ready'

/** What the user asked for in the wallet's own form, kept to restate in confirm's `expect` */
export type McpPendingRequest =
  | { kind: 'transfer'; chain: string; token: string; amount: string; to: string }
  | { kind: 'swap'; chain: string; from: string; to: string; amount: string }

export interface McpMismatch {
  key: string
  requested: string
  planned: string
}

/** Result of checking an incoming wallet request against the plan the user sent from here */
export interface McpPlanMatch {
  match: boolean
  /** The plan step the request corresponds to, when it matches */
  step?: McpStep
  total: number
}

interface State {
  /** Tokens are present */
  authorized: boolean
  phase: McpPhase
  /** A prepare / confirm / cancel call is running */
  busy: boolean
  /** An action status long-poll loop is running */
  polling: boolean
  error: string | null
  portfolioError: string | null
  serverInfo: McpServerInfo | null
  walletStatus: McpWalletStatus | null
  /** The server-side session whose topic this wallet holds */
  session: McpSession | null
  portfolio: McpPortfolio | null
  portfolioChain: string
  /** What the server can swap, per chain */
  swapAssets: McpSwapAssets | null
  swapAssetsError: string | null
  openActions: McpAction[]
  currentAction: McpAction | null
  pendingRequest: McpPendingRequest | null
  /** Raw transactions of the prepared plan by step, kept for the cross-check in the send modal */
  planTxs: { n: number; tx: McpStepTx }[]
}

/**
 * State
 */
const initialState = (): State => ({
  authorized: false,
  phase: 'idle',
  busy: false,
  polling: false,
  error: null,
  portfolioError: null,
  serverInfo: null,
  walletStatus: null,
  session: null,
  portfolio: null,
  portfolioChain: '',
  swapAssets: null,
  swapAssetsError: null,
  openActions: [],
  currentAction: null,
  pendingRequest: null,
  planTxs: []
})

const state = proxy<State>(initialState())

/**
 * Helpers
 */
let controller: AbortController | null = null

function signal(): AbortSignal {
  if (!controller) controller = new AbortController()
  return controller.signal
}

function abortInFlight() {
  controller?.abort()
  controller = null
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function describe(error: unknown): string {
  if (error instanceof McpApiError && error.issues?.length) {
    const issues = error.issues
      .map(issue => [issue.path, issue.message].filter(Boolean).join(': '))
      .join('; ')
    return `${error.message} (${issues})`
  }
  return error instanceof Error ? error.message : String(error)
}

function resetState() {
  Object.assign(state, initialState())
}

function fail(error: unknown) {
  if (isAbort(error)) return
  // Expected failures (auth state, server refusals) are surfaced in the UI; only log the rest loudly.
  if (error instanceof McpAuthError || error instanceof McpApiError) {
    console.warn('[MCP]', error.message)
  } else {
    console.error('[MCP]', error)
  }
  if (error instanceof McpAuthError && error.code === 'not_authorized') {
    const message = error.message
    abortInFlight()
    resetState()
    state.error = message
    return
  }
  state.error = describe(error)
}

/** A server session is ours only if WalletKit holds the same topic */
function findOwnSession(status: Pick<McpWalletStatus, 'sessions'>): McpSession | null {
  const active = walletkit?.getActiveSessions?.() ?? {}
  return status.sessions.find(session => Boolean(active[session.topic])) ?? null
}

function ownAddress(): string {
  return SettingsStore.state.eip155Address
}

function normalizeKey(key: string): string {
  return key.replace(/[_\s-]/g, '').toLowerCase()
}

/** Looks a fact up in the decoded steps, tolerant to snake/camel case; `min_out` also matches `minimumOut` */
function findDecoded(action: McpAction, key: string): string | undefined {
  const wanted = normalizeKey(key)
  for (const step of action.steps) {
    for (const [name, value] of Object.entries(step.decoded ?? {})) {
      if (normalizeKey(name) === wanted) return String(value)
    }
  }
  if (wanted === 'minout') {
    for (const step of action.steps) {
      for (const [name, value] of Object.entries(step.decoded ?? {})) {
        const normalized = normalizeKey(name)
        if (normalized.includes('min') && normalized.includes('out')) return String(value)
      }
    }
  }
  return undefined
}

function requestedValues(request: McpPendingRequest): Record<string, string> {
  if (request.kind === 'transfer') {
    return {
      kind: 'transfer',
      chain: request.chain,
      asset: request.token,
      amount: request.amount,
      to: request.to
    }
  }
  return {
    kind: 'swap',
    chain: request.chain,
    from_asset: request.from,
    to_asset: request.to,
    amount_in: request.amount,
    recipient: ownAddress()
  }
}

/**
 * confirm's `expect`: the wallet's own restatement of the request for every key in
 * plan.expectKeys. Values come from the form; what the form cannot know (min_out)
 * comes from the plan, as the docs prescribe. Without a pending request (an action
 * resumed from the open list) everything comes from the plan.
 */
export function buildExpect(
  action: McpAction,
  request: McpPendingRequest | null
): Record<string, string> {
  const requested = request ? requestedValues(request) : {}
  const keys = action.plan?.expectKeys?.length ? action.plan.expectKeys : Object.keys(requested)
  const expect: Record<string, string> = {}
  for (const key of keys) {
    expect[key] = requested[key] ?? findDecoded(action, key) ?? ''
  }
  return expect
}

function sameValue(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  if (x.toLowerCase() === y.toLowerCase()) return true
  const nx = Number(x)
  const ny = Number(y)
  return x !== '' && y !== '' && Number.isFinite(nx) && Number.isFinite(ny) && nx === ny
}

/** Where the server's decoded plan differs from what the wallet asked for */
export function comparePlan(action: McpAction, request: McpPendingRequest | null): McpMismatch[] {
  if (!request) return []
  const mismatches: McpMismatch[] = []
  for (const [key, requested] of Object.entries(requestedValues(request))) {
    if (key === 'kind') continue
    const planned = findDecoded(action, key)
    if (planned !== undefined && !sameValue(requested, planned)) {
      mismatches.push({ key, requested, planned })
    }
  }
  return mismatches
}

function sameAddress(a?: string, b?: string): boolean {
  return (a ?? '').toLowerCase() === (b ?? '').toLowerCase()
}

function sameData(a?: string, b?: string): boolean {
  const normalize = (value?: string) => (value && value !== '0x' ? value.toLowerCase() : '0x')
  return normalize(a) === normalize(b)
}

function sameWei(a?: string, b?: string): boolean {
  try {
    return BigInt(a || '0') === BigInt(b || '0')
  } catch {
    return false
  }
}

function adoptAction(action: McpAction, request: McpPendingRequest | null) {
  state.currentAction = action
  state.pendingRequest = request
  state.planTxs = action.steps.flatMap(step => (step.tx ? [{ n: step.n, tx: step.tx }] : []))
}

/**
 * Confirms the prepared current action with an `expect` restated from the form.
 * The server then pushes the first transaction to this wallet, whose own modal is the approval.
 */
async function sendToWallet() {
  const action = state.currentAction
  if (!action?.plan) return
  const confirmed = (
    await McpApi.confirmAction(
      action.actionId,
      { plan_hash: action.plan.hash, expect: buildExpect(action, state.pendingRequest) },
      signal()
    )
  ).data
  state.currentAction = confirmed
  void actions.pollCurrent()
}

/**
 * Prepare, check the decoded plan against what was typed, and send it to the wallet in one go.
 * A plan that differs from the request is cancelled with the reason and nothing is sent.
 */
async function prepareAndSend(
  prepare: () => Promise<McpToolResult<McpAction>>,
  request: McpPendingRequest
) {
  state.busy = true
  state.error = null
  try {
    const prepared = (await prepare()).data
    adoptAction(prepared, request)
    const mismatches = comparePlan(prepared, request)
    if (mismatches.length) {
      const reason = `The plan differs from the request: ${mismatches
        .map(item => `${item.key} requested ${item.requested}, planned ${item.planned}`)
        .join('; ')}`
      state.currentAction = (await McpApi.cancelAction(prepared.actionId, reason, signal())).data
      state.error = `${reason}. Nothing was sent to the wallet.`
      return
    }
    await sendToWallet()
  } catch (error) {
    fail(error)
  } finally {
    state.busy = false
  }
}

/**
 * Pairs this wallet to the MCP server's session for the authorized user.
 * The pairing URI goes straight into WalletKit; the user approves the proposal in the normal modal.
 */
async function ensurePaired(abort: AbortSignal): Promise<McpSession> {
  const status = (await McpApi.walletStatus(0, abort)).data
  state.walletStatus = status
  const own = findOwnSession(status)
  if (own) return own

  // Connected to a wallet we do not hold (another wallet, or cleared storage): start over.
  const start = (await McpApi.startPairing({ newSession: status.connected }, abort)).data
  if (start.connected) {
    const existing = findOwnSession({ sessions: [start] })
    if (existing) return existing
    throw new Error('WalletConnect MCP is paired with a different wallet; disconnect it and retry')
  }

  await pairWithUri(start.uri)

  const deadline = Date.now() + start.expiresInSeconds * 1000
  while (Date.now() < deadline) {
    if (abort.aborted) throw new DOMException('Aborted', 'AbortError')
    const next = (await McpApi.walletStatus(undefined, abort)).data
    state.walletStatus = next
    const mine = findOwnSession(next)
    if (mine) return mine
    const pairing = (await McpApi.pairingStatus(start.pairingId, abort)).data
    if (
      pairing.status === 'rejected' ||
      pairing.status === 'expired' ||
      pairing.status === 'failed'
    ) {
      throw new Error(pairing.error || `Pairing ${pairing.status}`)
    }
  }
  throw new Error('Pairing expired before the session proposal was approved')
}

async function loadPortfolio(abort: AbortSignal) {
  try {
    state.portfolio = (await McpApi.portfolio(state.portfolioChain || undefined, abort)).data
    state.portfolioError = null
  } catch (error) {
    if (isAbort(error)) return
    if (error instanceof McpAuthError) throw error
    state.portfolio = null
    state.portfolioError = describe(error)
  }
}

async function loadSwapAssets(abort: AbortSignal) {
  try {
    state.swapAssets = (await McpApi.swapAssets(undefined, abort)).data
    state.swapAssetsError = null
  } catch (error) {
    if (isAbort(error)) return
    if (error instanceof McpAuthError) throw error
    state.swapAssets = null
    state.swapAssetsError = describe(error)
  }
}

async function loadOpenActions(abort: AbortSignal) {
  state.openActions = (await McpApi.openActions(abort)).data.actions
}

async function loadAll(abort: AbortSignal) {
  const info = (await McpApi.info(abort)).data
  state.serverInfo = info
  if (!state.portfolioChain) state.portfolioChain = info.chains[0]?.name ?? ''
  await Promise.all([loadPortfolio(abort), loadOpenActions(abort), loadSwapAssets(abort)])
}

/**
 * Store / Actions
 */
const actions = {
  /** Called when the page mounts: pick up stored tokens and connect, or refresh if already there */
  async initialize() {
    if (typeof window === 'undefined') return
    state.authorized = hasTokens()
    state.error = null
    if (!state.authorized) {
      state.phase = 'idle'
      return
    }
    if (state.phase === 'ready' && state.session) {
      await actions.refresh()
      return
    }
    await actions.connect()
  },

  /** Leaves for the consent page */
  async authorize() {
    state.error = null
    try {
      await startAuthorization()
    } catch (error) {
      fail(error)
    }
  },

  /** Back from the consent page with `?code=&state=` */
  async completeCallback(params: URLSearchParams) {
    state.error = null
    try {
      await completeAuthorization(params)
      state.authorized = true
      await actions.connect()
    } catch (error) {
      fail(error)
    }
  },

  async connect() {
    if (state.phase === 'pairing' || state.phase === 'loading') return
    abortInFlight()
    const abort = signal()
    state.error = null
    state.phase = 'pairing'
    try {
      state.session = await ensurePaired(abort)
      state.phase = 'loading'
      await loadAll(abort)
      state.phase = 'ready'
    } catch (error) {
      if (!isAbort(error)) state.phase = 'idle'
      fail(error)
    }
  },

  async refresh() {
    if (state.phase !== 'ready') return
    const abort = signal()
    try {
      const status = (await McpApi.walletStatus(0, abort)).data
      state.walletStatus = status
      const own = findOwnSession(status)
      if (!own) {
        // The server lost the session, or the wallet did: pair again.
        state.session = null
        state.phase = 'idle'
        await actions.connect()
        return
      }
      state.session = own
      await Promise.all([loadPortfolio(abort), loadOpenActions(abort), loadSwapAssets(abort)])
    } catch (error) {
      fail(error)
    }
  },

  async setPortfolioChain(chain: string) {
    state.portfolioChain = chain
    await loadPortfolio(signal()).catch(fail)
  },

  async reloadPortfolio() {
    await loadPortfolio(signal()).catch(fail)
  },

  async reloadSwapAssets() {
    await loadSwapAssets(signal()).catch(fail)
  },

  async prepareTransfer(input: { chain: string; token: string; amount: string; to: string }) {
    await prepareAndSend(
      () =>
        McpApi.prepareTransfer(
          { to: input.to, amount: input.amount, token: input.token, chain: input.chain },
          signal()
        ),
      { kind: 'transfer', ...input }
    )
  },

  async prepareSwap(input: { chain: string; from: string; to: string; amount: string }) {
    await prepareAndSend(
      () =>
        McpApi.prepareSwap(
          { from: input.from, to: input.to, amount: input.amount, chain: input.chain },
          signal()
        ),
      { kind: 'swap', ...input }
    )
  },

  /** Runs the same request again after an action ended without confirming */
  async retryCurrent() {
    const request = state.pendingRequest
    const action = state.currentAction
    if (!request || !action || !isTerminalAction(action.status) || action.status === 'confirmed') {
      return
    }
    if (request.kind === 'transfer') {
      const { kind, ...input } = request
      await actions.prepareTransfer(input)
    } else {
      const { kind, ...input } = request
      await actions.prepareSwap(input)
    }
  },

  /** Sends a prepared action that is still waiting (e.g. after a failed confirm) */
  async sendCurrent() {
    state.busy = true
    state.error = null
    try {
      await sendToWallet()
    } catch (error) {
      fail(error)
    } finally {
      state.busy = false
    }
  },

  /** Long-polls the current action until it is terminal; each call waits server-side */
  async pollCurrent() {
    if (state.polling) return
    const abort = signal()
    state.polling = true
    try {
      while (state.currentAction && !isTerminalAction(state.currentAction.status)) {
        const actionId = state.currentAction.actionId
        const next = (await McpApi.actionStatus(actionId, undefined, abort)).data
        if (state.currentAction?.actionId !== actionId) break
        state.currentAction = next
      }
    } catch (error) {
      fail(error)
    } finally {
      state.polling = false
      if (!abort.aborted && state.phase === 'ready') {
        void loadOpenActions(abort).catch(fail)
        if (state.currentAction?.status === 'confirmed') void loadPortfolio(abort).catch(fail)
      }
    }
  },

  async cancelCurrent(reason = 'Cancelled from the wallet') {
    const action = state.currentAction
    if (!action) return
    await actions.cancelAction(action.actionId, reason)
  },

  async cancelAction(actionId: string, reason = 'Cancelled from the wallet') {
    state.busy = true
    state.error = null
    try {
      const cancelled = (await McpApi.cancelAction(actionId, reason, signal())).data
      if (state.currentAction?.actionId === actionId) state.currentAction = cancelled
      await loadOpenActions(signal())
    } catch (error) {
      fail(error)
    } finally {
      state.busy = false
    }
  },

  /** Follows an action that is already running (e.g. one an agent started) on the page */
  watchAction(actionId: string) {
    const action = state.openActions.find(candidate => candidate.actionId === actionId)
    if (!action || action.status === 'prepared' || isTerminalAction(action.status)) return
    adoptAction(action, null)
    void actions.pollCurrent()
  },

  /**
   * Re-opens the wallet's own request modal for the step awaiting approval, for example
   * after the modal was dismissed. Returns false when nothing is pending.
   */
  openPendingRequest(): boolean {
    const topic = state.session?.topic
    if (!topic || !walletkit) return false
    const pending = walletkit.getPendingSessionRequests().find(request => request.topic === topic)
    if (!pending) return false
    const requestEvent = pending as unknown as SignClientTypes.EventArguments['session_request']
    const requestSession = walletkit.engine.signClient.session.get(topic)
    SettingsStore.setCurrentRequestVerifyContext(pending.verifyContext)
    const method = pending.params.request.method
    const view =
      method === EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION ||
      method === EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION
        ? 'SessionSendTransactionModal'
        : method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA ||
          method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3 ||
          method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4
        ? 'SessionSignTypedDataModal'
        : method === EIP155_SIGNING_METHODS.PERSONAL_SIGN ||
          method === EIP155_SIGNING_METHODS.ETH_SIGN
        ? 'SessionSignModal'
        : 'SessionUnsuportedMethodModal'
    ModalStore.open(view, { requestEvent, requestSession })
    return true
  },

  clearCurrent() {
    state.currentAction = null
    state.pendingRequest = null
    state.planTxs = []
  },

  /** Ends the server session, revokes the grant, forgets everything locally */
  async disconnect() {
    abortInFlight()
    state.busy = true
    try {
      if (state.session) await McpApi.disconnect()
    } catch (error) {
      console.warn('[MCP] disconnect failed', error)
    }
    try {
      await revokeTokens()
    } catch (error) {
      console.warn('[MCP] revoke failed', error)
    }
    resetState()
  },

  dismissError() {
    state.error = null
  },

  /**
   * For the send-transaction modal: is this incoming request from the MCP session, and if so,
   * which step of the plan sent from here does it correspond to? null when it is unrelated.
   */
  matchPlanTx(
    topic: string | undefined,
    tx: { to?: string; data?: string; value?: string } | undefined
  ): McpPlanMatch | null {
    if (!topic || !tx || !state.session || state.session.topic !== topic) return null
    const action = state.currentAction
    if (!action || isTerminalAction(action.status) || !state.planTxs.length) return null
    const planned = state.planTxs.find(
      entry =>
        sameAddress(entry.tx.to, tx.to) &&
        sameData(entry.tx.data, tx.data) &&
        sameWei(entry.tx.value, tx.value)
    )
    if (!planned) return { match: false, total: action.steps.length }
    return {
      match: true,
      step: action.steps.find(step => step.n === planned.n),
      total: action.steps.length
    }
  }
}

const McpStore = { state, actions }

export default McpStore
