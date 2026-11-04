import { clearTokens, getAccessToken, MCP_API_BASE, McpAuthError } from '@/utils/McpAuthUtil'

/**
 * Typed client for the WalletConnect MCP HTTP API (v0.3.0).
 * Shapes mirror https://mcp.walletconnect.com/api/v1/openapi.json
 */

/**
 * Types
 */
export interface McpWalletLinks {
  native?: string
  universal?: string
}

export interface McpSession {
  /** WalletConnect session topic */
  topic: string
  /** CAIP-10 accounts */
  accounts: string[]
  /** CAIP-2 chains */
  chains: string[]
  /** Seconds since the epoch */
  expiry: number
  walletName?: string
  walletIcon?: string
  walletLinks: McpWalletLinks
  walletLink?: string
}

export type McpPairingState = 'awaiting_approval' | 'approved' | 'rejected' | 'expired' | 'failed'

export interface McpPairing {
  id: string
  uri: string
  status: McpPairingState
  created_at: number
  expires_at: number
  topic?: string | null
  error?: string | null
}

export interface McpWalletStatus {
  connected: boolean
  /** Live sessions, newest first */
  sessions: McpSession[]
  latestPairing?: McpPairing
  relayConnected: boolean
  openActions: McpAction[]
}

export type McpPairingStart =
  | ({ connected: true } & McpSession)
  | {
      connected: false
      pairingId: string
      /** Bearer secret: whoever pairs with it binds their wallet to this user */
      uri: string
      connectUrl: string
      deepLinks: Record<string, string>
      expiresInSeconds: number
      next: string
    }

export interface McpPairingStatus {
  pairingId: string
  status: McpPairingState
  expiresAt: string
  accounts?: string[]
  session?: Partial<McpSession>
  error?: string
}

export interface McpDisconnect {
  disconnected: number
}

export interface McpAsset {
  symbol: string
  name: string
  /** Decimal string in whole units */
  amount: string
  decimals: number
  priceUsd?: number
  valueUsd?: number
  address?: string
}

export interface McpPortfolio {
  chain: string
  address: string
  totalUsd?: number
  assets: McpAsset[]
  source: 'blockchain-api' | 'rpc'
}

export type McpSwapAsset = 'USDC' | 'ETH'

export interface McpQuote {
  chain: string
  from: McpSwapAsset
  to: McpSwapAsset
  amountIn: string
  amountOut: string
  pool: string
}

export type McpActionStatus =
  | 'prepared'
  | 'awaiting_wallet'
  | 'submitted'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'failed'
  | 'cancelled'

export type McpStepStatus = 'queued' | 'skipped' | Exclude<McpActionStatus, 'prepared'>

export interface McpStepTx {
  to: string
  /** Hex calldata */
  data: string
  /** Wei, decimal string */
  value: string
}

export interface McpStep {
  /** 1-based position in the action */
  n: number
  summary: string
  chain: string
  status: McpStepStatus
  txHash?: string
  explorerUrl?: string
  error?: string
  expiresInSeconds?: number
  /** The step in words and whole units */
  decoded?: Record<string, string | number | boolean>
  /** The exact transaction, present while the action is prepared */
  tx?: McpStepTx
  approveLinks?: McpWalletLinks
}

export interface McpPlan {
  /** SHA-256 over the exact bytes of every step; pass it to confirm */
  hash: string
  expiresAt: string
  expiresInSeconds: number
  /** The facts to restate in confirm's `expect` */
  expectKeys: string[]
}

export interface McpAction {
  actionId: string
  status: McpActionStatus
  summary: string
  steps: McpStep[]
  /** Present while the action is prepared */
  plan?: McpPlan
  expiresAt?: string
  expiresInSeconds?: number
  walletLinks?: McpWalletLinks
  walletLink?: string
  approveLinks?: McpWalletLinks
  next: string
}

export interface McpActionList {
  actions: McpAction[]
}

export interface McpServerInfo {
  name: string
  version: string
  instructions: string
  chains: { id: string; name: string }[]
  caps: { eth: string; usdc: string }
  tools: string[]
  openapi: string
  docs: string
  oauth: { resource: string; metadata: string }
}

export interface McpToolResult<T> {
  text: string
  data: T
  images?: { mimeType: 'image/png'; data: string }[]
}

export type McpApiErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'not_found'
  | 'conflict'
  | 'blocked'
  | 'internal'
  | 'unknown'

export class McpApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: McpApiErrorCode,
    message: string,
    public readonly issues?: { path?: string; message?: string }[]
  ) {
    super(message)
    this.name = 'McpApiError'
  }
}

export const TERMINAL_ACTION_STATUSES: ReadonlySet<McpActionStatus> = new Set<McpActionStatus>([
  'confirmed',
  'rejected',
  'expired',
  'failed',
  'cancelled'
])

export function isTerminalAction(status: McpActionStatus): boolean {
  return TERMINAL_ACTION_STATUSES.has(status)
}

/** Longest server-side wait the API allows on a poll */
export const MAX_WAIT_SECONDS = 55

/**
 * Transport
 */
type Query = Record<string, string | number | boolean | undefined>

interface RequestOptions {
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  options: RequestOptions = {}
): Promise<McpToolResult<T>> {
  const url = new URL(`${MCP_API_BASE}${path}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  const hasBody = options.body !== undefined

  const send = async (token: string) =>
    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {})
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal
    })

  let response = await send(await getAccessToken())
  if (response.status === 401) {
    response = await send(await getAccessToken({ forceRefresh: true }))
    if (response.status === 401) {
      // A fresh token was refused: the grant is gone.
      clearTokens()
      throw new McpAuthError(
        'not_authorized',
        'WalletConnect MCP rejected the session; connect again'
      )
    }
  }

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    const error = json?.error
    throw new McpApiError(
      response.status,
      error?.code ?? 'unknown',
      error?.message ?? `${method} ${path || '/'} failed with ${response.status}`,
      error?.issues
    )
  }
  return unwrap<T>(json)
}

/**
 * Tool routes answer `{ text, data, images? }`; the meta routes (`GET /`, `GET /tools`)
 * answer with the object itself. Normalize to the envelope.
 */
function unwrap<T>(json: unknown): McpToolResult<T> {
  if (json && typeof json === 'object' && 'data' in json && 'text' in json) {
    return json as McpToolResult<T>
  }
  return { text: '', data: json as T }
}

/**
 * Routes
 */
export const McpApi = {
  /** Server info: version, enabled chains, policy caps, tool names */
  info(signal?: AbortSignal) {
    return request<McpServerInfo>('GET', '', { signal })
  },

  /** Waits server-side (up to 55 s) while a pairing awaits approval */
  walletStatus(waitSeconds = MAX_WAIT_SECONDS, signal?: AbortSignal) {
    return request<McpWalletStatus>('GET', '/wallet', {
      query: { wait_seconds: waitSeconds },
      signal
    })
  },

  startPairing(options: { newSession?: boolean; qr?: boolean } = {}, signal?: AbortSignal) {
    return request<McpPairingStart>('POST', '/wallet/pairings', {
      body: { new_session: options.newSession ?? false, qr: options.qr ?? false },
      signal
    })
  },

  pairingStatus(pairingId: string, signal?: AbortSignal) {
    return request<McpPairingStatus>('GET', `/wallet/pairings/${encodeURIComponent(pairingId)}`, {
      signal
    })
  },

  /** Ends the WalletConnect session the server holds with this wallet */
  disconnect(signal?: AbortSignal) {
    return request<McpDisconnect>('DELETE', '/wallet/session', { signal })
  },

  portfolio(chain?: string, signal?: AbortSignal) {
    return request<McpPortfolio>('GET', '/portfolio', { query: { chain }, signal })
  },

  openActions(signal?: AbortSignal) {
    return request<McpActionList>('GET', '/actions', { signal })
  },

  swapQuote(params: { from: McpSwapAsset; amount: string; chain?: string }, signal?: AbortSignal) {
    return request<McpQuote>('GET', '/swaps/quote', { query: params, signal })
  },

  /** Prepares only; nothing reaches the wallet until confirmAction */
  prepareTransfer(
    body: { to: string; amount: string; token?: string; chain?: string },
    signal?: AbortSignal
  ) {
    return request<McpAction>('POST', '/actions/transfers', { body, signal })
  },

  /** Prepares only; nothing reaches the wallet until confirmAction */
  prepareSwap(
    body: { from: McpSwapAsset; amount: string; max_slippage_pct?: number; chain?: string },
    signal?: AbortSignal
  ) {
    return request<McpAction>('POST', '/actions/swaps', { body, signal })
  },

  /** Sends the first step to the wallet if the hash and every expect field match the plan */
  confirmAction(
    actionId: string,
    body: { plan_hash: string; expect: Record<string, string> },
    signal?: AbortSignal
  ) {
    return request<McpAction>('POST', `/actions/${encodeURIComponent(actionId)}/confirm`, {
      body,
      signal
    })
  },

  /** Waits server-side (up to 55 s) for a change; a prepared action returns at once */
  actionStatus(actionId: string, waitSeconds = MAX_WAIT_SECONDS, signal?: AbortSignal) {
    return request<McpAction>('GET', `/actions/${encodeURIComponent(actionId)}`, {
      query: { wait_seconds: waitSeconds },
      signal
    })
  },

  cancelAction(actionId: string, reason?: string, signal?: AbortSignal) {
    return request<McpAction>('POST', `/actions/${encodeURIComponent(actionId)}/cancel`, {
      body: { reason },
      signal
    })
  }
}

export default McpApi
