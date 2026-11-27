/**
 * OAuth 2.1 + PKCE client for the WalletConnect MCP HTTP API.
 * Docs: https://mcp.walletconnect.com/api/docs
 *
 * A token is bound to the resource `${MCP_ORIGIN}/api`; MCP-transport tokens do
 * not work here and vice versa. There is no API key: a person approves on the
 * consent page, so authorization always goes through a browser redirect.
 */

export const MCP_ORIGIN = 'https://mcp.walletconnect.com'
export const MCP_RESOURCE = `${MCP_ORIGIN}/api`
export const MCP_API_BASE = `${MCP_ORIGIN}/api/v1`
export const MCP_SCOPES = 'wallet:read wallet:write'
export const MCP_CLIENT_NAME = 'React Wallet Example'
/** The page that receives `?code=&state=` */
export const MCP_CALLBACK_PATH = '/mcp'
/** Client ID metadata document served by src/pages/api/mcp/client.ts on hosted deployments */
export const MCP_CLIENT_METADATA_PATH = '/api/mcp/client'

const TOKENS_KEY = 'MCP_OAUTH_TOKENS'
const CLIENT_KEY = 'MCP_OAUTH_CLIENT'
const PENDING_KEY = 'MCP_OAUTH_PENDING'
/** Refresh this long before the access token actually expires */
const REFRESH_SKEW_MS = 60_000

/**
 * Types
 */
interface ProtectedResourceMetadata {
  resource: string
  authorization_servers: string[]
}

interface AuthServerMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  registration_endpoint?: string
  revocation_endpoint?: string
  code_challenge_methods_supported?: string[]
  client_id_metadata_document_supported?: boolean
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  resource?: string
}

interface ClientIdentity {
  origin: string
  redirectUri: string
  clientId: string
  clientSecret?: string
}

interface PendingAuthorization extends ClientIdentity {
  state: string
  verifier: string
}

export interface StoredTokens {
  accessToken: string
  refreshToken?: string
  /** Milliseconds since the epoch */
  expiresAt: number
  scope?: string
  clientId: string
  clientSecret?: string
}

export type McpAuthErrorCode =
  | 'not_authorized'
  | 'discovery_failed'
  | 'registration_failed'
  | 'invalid_callback'
  | 'token_request_failed'

export class McpAuthError extends Error {
  constructor(
    public readonly code: McpAuthErrorCode,
    message: string,
    /** The OAuth `error` value when the server sent one, e.g. `invalid_grant` */
    public readonly oauthError?: string
  ) {
    super(message)
    this.name = 'McpAuthError'
  }
}

/**
 * Storage helpers
 */
function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(storage: Storage, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value))
}

/**
 * PKCE helpers
 */
function base64url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

function normalizeIssuer(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * Discovery: resource metadata names the authorization server, which lists its endpoints.
 */
let metadataPromise: Promise<AuthServerMetadata> | null = null

async function fetchJson<T>(url: string, code: McpAuthErrorCode, what: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new McpAuthError(code, `${what} failed (${response.status})`)
  }
  return (await response.json()) as T
}

export function discoverAuthServer(): Promise<AuthServerMetadata> {
  if (!metadataPromise) {
    metadataPromise = (async () => {
      const resource = await fetchJson<ProtectedResourceMetadata>(
        `${MCP_ORIGIN}/.well-known/oauth-protected-resource/api`,
        'discovery_failed',
        'Resource metadata discovery'
      )
      if (normalizeIssuer(resource.resource) !== MCP_RESOURCE) {
        throw new McpAuthError('discovery_failed', `Unexpected resource ${resource.resource}`)
      }
      const issuer = resource.authorization_servers?.[0]
      if (!issuer) {
        throw new McpAuthError('discovery_failed', 'No authorization server advertised')
      }
      const metadata = await fetchJson<AuthServerMetadata>(
        `${normalizeIssuer(issuer)}/.well-known/oauth-authorization-server`,
        'discovery_failed',
        'Authorization server discovery'
      )
      if (normalizeIssuer(metadata.issuer) !== normalizeIssuer(issuer)) {
        throw new McpAuthError('discovery_failed', `Issuer mismatch: ${metadata.issuer}`)
      }
      if (!metadata.code_challenge_methods_supported?.includes('S256')) {
        throw new McpAuthError(
          'discovery_failed',
          'Authorization server does not support PKCE S256'
        )
      }
      return metadata
    })().catch(error => {
      metadataPromise = null
      throw error
    })
  }
  return metadataPromise
}

/**
 * Client identity.
 * - Loopback host (local dev): dynamic registration with a loopback redirect, cached per origin.
 * - Any other host: a client ID metadata document on our own origin; nothing to register.
 */
function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  )
}

export function getRedirectUri(): string {
  return `${window.location.origin}${MCP_CALLBACK_PATH}`
}

async function registerLoopbackClient(
  origin: string,
  redirectUri: string
): Promise<ClientIdentity> {
  const metadata = await discoverAuthServer()
  if (!metadata.registration_endpoint) {
    throw new McpAuthError(
      'registration_failed',
      'The authorization server does not offer dynamic client registration'
    )
  }
  const response = await fetch(metadata.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: MCP_CLIENT_NAME,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    })
  })
  const json = await response.json().catch(() => null)
  if (!response.ok || !json?.client_id) {
    throw new McpAuthError(
      'registration_failed',
      json?.error_description || json?.error || `Client registration failed (${response.status})`,
      json?.error
    )
  }
  return { origin, redirectUri, clientId: json.client_id, clientSecret: json.client_secret }
}

export async function getClientIdentity(): Promise<ClientIdentity> {
  const origin = window.location.origin
  const redirectUri = getRedirectUri()
  if (!isLoopbackHost(window.location.hostname)) {
    return { origin, redirectUri, clientId: `${origin}${MCP_CLIENT_METADATA_PATH}` }
  }
  const cached = readJson<ClientIdentity>(localStorage, CLIENT_KEY)
  if (cached?.origin === origin && cached.redirectUri === redirectUri && cached.clientId) {
    return cached
  }
  const client = await registerLoopbackClient(origin, redirectUri)
  writeJson(localStorage, CLIENT_KEY, client)
  return client
}

export function forgetClientRegistration() {
  localStorage.removeItem(CLIENT_KEY)
}

/**
 * Authorization request: keep the PKCE verifier for the callback and leave for the consent page.
 */
export async function startAuthorization(): Promise<void> {
  const metadata = await discoverAuthServer()
  const client = await getClientIdentity()
  const verifier = randomToken(32)
  const state = randomToken(16)
  const pending: PendingAuthorization = { ...client, state, verifier }
  writeJson(sessionStorage, PENDING_KEY, pending)

  const url = new URL(metadata.authorization_endpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', client.clientId)
  url.searchParams.set('redirect_uri', client.redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', await pkceChallenge(verifier))
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('scope', MCP_SCOPES)
  url.searchParams.set('resource', MCP_RESOURCE)
  // This client is a wallet and pairs itself through POST /wallet/pairings afterwards,
  // so the consent page shows the decision alone (MCP server >= 0.3.1).
  url.searchParams.set('connect', 'skip')
  window.location.assign(url.toString())
}

export function isAuthorizationCallback(params: URLSearchParams): boolean {
  return params.has('code') || params.has('error')
}

/**
 * Code exchange on the callback page.
 */
export async function completeAuthorization(params: URLSearchParams): Promise<StoredTokens> {
  const pending = readJson<PendingAuthorization>(sessionStorage, PENDING_KEY)
  sessionStorage.removeItem(PENDING_KEY)
  if (!pending) {
    throw new McpAuthError('invalid_callback', 'No authorization in progress; start again')
  }

  const error = params.get('error')
  if (error) {
    // A stale dynamic registration is the usual cause; re-register on the next attempt.
    if (error === 'invalid_client' || error === 'unauthorized_client') forgetClientRegistration()
    throw new McpAuthError(
      'invalid_callback',
      params.get('error_description') || `Authorization failed: ${error}`,
      error
    )
  }
  if (params.get('state') !== pending.state) {
    throw new McpAuthError('invalid_callback', 'State mismatch in the authorization response')
  }
  const metadata = await discoverAuthServer()
  const iss = params.get('iss')
  if (iss && normalizeIssuer(iss) !== normalizeIssuer(metadata.issuer)) {
    throw new McpAuthError(
      'invalid_callback',
      `Authorization response from unexpected issuer ${iss}`
    )
  }
  const code = params.get('code')
  if (!code) {
    throw new McpAuthError('invalid_callback', 'Authorization response carries no code')
  }

  const response = await tokenRequest(
    {
      grant_type: 'authorization_code',
      code,
      redirect_uri: pending.redirectUri,
      code_verifier: pending.verifier
    },
    pending
  )
  return saveTokens(response, pending)
}

/**
 * Tokens: an access token lives an hour; the refresh token rotates on every refresh.
 */
async function tokenRequest(
  params: Record<string, string>,
  client: { clientId: string; clientSecret?: string }
): Promise<TokenResponse> {
  const metadata = await discoverAuthServer()
  const body = new URLSearchParams({
    ...params,
    client_id: client.clientId,
    resource: MCP_RESOURCE
  })
  if (client.clientSecret) body.set('client_secret', client.clientSecret)
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body
  })
  const json = await response.json().catch(() => null)
  if (!response.ok || !json?.access_token) {
    throw new McpAuthError(
      'token_request_failed',
      json?.error_description || json?.error || `Token request failed (${response.status})`,
      json?.error
    )
  }
  return json as TokenResponse
}

function saveTokens(
  response: TokenResponse,
  client: { clientId: string; clientSecret?: string },
  previous?: StoredTokens
): StoredTokens {
  const tokens: StoredTokens = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? previous?.refreshToken,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
    scope: response.scope ?? previous?.scope,
    clientId: client.clientId,
    clientSecret: client.clientSecret
  }
  writeJson(localStorage, TOKENS_KEY, tokens)
  return tokens
}

export function loadTokens(): StoredTokens | null {
  if (typeof localStorage === 'undefined') return null
  const tokens = readJson<StoredTokens>(localStorage, TOKENS_KEY)
  return tokens?.accessToken && tokens.clientId ? tokens : null
}

export function hasTokens(): boolean {
  return loadTokens() !== null
}

export function clearTokens() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(TOKENS_KEY)
}

let refreshInFlight: Promise<string> | null = null

/**
 * Returns a usable access token, refreshing (single-flight) when it is about to expire
 * or when `forceRefresh` is set after a 401.
 */
export async function getAccessToken(options: { forceRefresh?: boolean } = {}): Promise<string> {
  const tokens = loadTokens()
  if (!tokens) {
    throw new McpAuthError('not_authorized', 'Not connected to WalletConnect MCP')
  }
  if (!options.forceRefresh && tokens.expiresAt - Date.now() > REFRESH_SKEW_MS) {
    return tokens.accessToken
  }
  if (!refreshInFlight) {
    refreshInFlight = refreshTokens(tokens).finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function refreshTokens(tokens: StoredTokens): Promise<string> {
  if (!tokens.refreshToken) {
    clearTokens()
    throw new McpAuthError('not_authorized', 'Session expired; connect again')
  }
  try {
    const response = await tokenRequest(
      { grant_type: 'refresh_token', refresh_token: tokens.refreshToken },
      tokens
    )
    return saveTokens(response, tokens, tokens).accessToken
  } catch (error) {
    if (error instanceof McpAuthError && error.oauthError === 'invalid_grant') {
      clearTokens()
      throw new McpAuthError('not_authorized', 'Session expired; connect again', error.oauthError)
    }
    throw error
  }
}

/**
 * RFC 7009 revocation, best effort; local tokens are dropped regardless.
 */
export async function revokeTokens(): Promise<void> {
  const tokens = loadTokens()
  clearTokens()
  if (!tokens) return

  let endpoint: string | undefined
  try {
    endpoint = (await discoverAuthServer()).revocation_endpoint
  } catch {
    return
  }
  if (!endpoint) return

  const candidates: Array<[string | undefined, string]> = [
    [tokens.refreshToken, 'refresh_token'],
    [tokens.accessToken, 'access_token']
  ]
  for (const [token, hint] of candidates) {
    if (!token) continue
    const body = new URLSearchParams({ token, token_type_hint: hint, client_id: tokens.clientId })
    if (tokens.clientSecret) body.set('client_secret', tokens.clientSecret)
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      })
    } catch (error) {
      console.warn('[MCP] token revocation failed', error)
    }
  }
}
