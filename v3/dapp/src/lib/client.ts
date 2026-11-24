import type SignClient from '@walletconnect/sign-client'
import type { SignClientTypes } from '@walletconnect/types'

import { APP_SIGNATURE, DEFAULT_PROJECT_ID, RELAY_URL, signsFor } from './common'

export type App = 'dapp' | 'wallet'
export interface Started {
  client: SignClient
  projectId: string
  clientId: string
}

const projectKey = (app: App) => `demo-${app}-project`
export const currentProject = (app: App) =>
  localStorage.getItem(projectKey(app)) || DEFAULT_PROJECT_ID

export function setProject(app: App, id: string) {
  localStorage.setItem(projectKey(app), id)
  location.reload()
}

// One identity per project: the Relay keeps the project a client first registered with, so an
// identity switched to another project would still count as its first one.
const prefixFor = (app: App, projectId: string) =>
  projectId === DEFAULT_PROJECT_ID ? `demo-${app}:` : `demo-${app}@${projectId}:`

/** Forgets this app's identities and sessions in every project. */
export function resetApp(app: App, extraKeys: string[] = []) {
  for (const k of Object.keys(localStorage)) {
    // the SDK puts its own prefixes in front of ours
    if (k.includes(`demo-${app}:`) || k.includes(`demo-${app}@`)) localStorage.removeItem(k)
  }
  for (const k of extraKeys) localStorage.removeItem(k)
  location.reload()
}

// v2's IKeyValueStorage over localStorage, so Reset and per-project identities stay simple.
const localStorageKV = {
  getKeys: async () => Object.keys(localStorage),
  getEntries: async <T>() =>
    Object.keys(localStorage).map(
      k => [k, JSON.parse(localStorage.getItem(k) ?? 'null')] as [string, T]
    ),
  getItem: async <T>(k: string): Promise<T | undefined> => {
    const v = localStorage.getItem(k)
    if (v === null) return undefined
    try {
      return JSON.parse(v) as T
    } catch {
      return undefined
    }
  },
  setItem: async <T>(k: string, v: T) => localStorage.setItem(k, JSON.stringify(v)),
  removeItem: async (k: string) => localStorage.removeItem(k)
}

/** What the SDK passes to the App Signature callback (Verify v4, Sign v2 and v3). */
interface AppSignatureParams {
  request: Record<string, unknown>
  /** `request` exactly as sent: the JWT's `sub` is the SHA-256 of these bytes. */
  requestJson: string
}

/**
 * Verify v4: the SDK calls this before it creates a connection and before every message, and
 * sends the JWT with it. The backend holds the key and decides what it signs; if it refuses,
 * this throws and the request fails, rather than going out unsigned.
 */
const appSignature = {
  callback: async ({ requestJson }: AppSignatureParams) => {
    const res = await fetch('/api/wc-attestation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestJson })
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`App Signature refused: ${body.error ?? res.status}`)
    return { appSignature: body.appSignature as string }
  }
}

const APP_SIGNATURE_KEY = 'demo-app-signature'

/**
 * Whether Nimbus signs on this page: `?appSignature=on|off` sets it for this host (remembered),
 * else the last setting, else on where NEXT_PUBLIC_APP_SIGNATURE_DOMAINS lists the host. It stands
 * in for deploying, or not, the signing backend: a new domain sends unsigned until it is verified,
 * and a domain requiring signatures can be tried unsigned.
 */
export function appSignatureOn(): boolean {
  if (!APP_SIGNATURE) return false
  const fromUrl = new URLSearchParams(location.search).get('appSignature')
  if (fromUrl === 'on' || fromUrl === 'off') localStorage.setItem(APP_SIGNATURE_KEY, fromUrl)
  const saved = localStorage.getItem(APP_SIGNATURE_KEY)
  return saved ? saved === 'on' : signsFor(location.hostname)
}

export function setAppSignature(on: boolean) {
  localStorage.setItem(APP_SIGNATURE_KEY, on ? 'on' : 'off')
  const url = new URL(location.href)
  url.searchParams.delete('appSignature')
  location.replace(url)
}

let started: Promise<Started> | undefined

/**
 * Starts the one client this page uses. It speaks Sign v3, with Sign v2 as the fallback. It loads
 * in the browser only, and once, even with React strict mode running effects twice.
 */
export function startClient(app: App, metadata: SignClientTypes.Metadata): Promise<Started> {
  started ??= (async () => {
    const { SignClient } = await import('@walletconnect/sign-client')
    const projectId = currentProject(app)
    // `appSignature` is newer than the SDK's published types.
    const options: Parameters<typeof SignClient.init>[0] & { appSignature?: typeof appSignature } =
      {
        projectId,
        metadata,
        relayUrl: RELAY_URL,
        customStoragePrefix: prefixFor(app, projectId),
        storage: localStorageKV,
        ...(app === 'dapp' && appSignatureOn() ? { appSignature } : {})
      }
    const client = await SignClient.init(options)
    // For the Verify v4 POC's end-to-end tests and walkthrough, which drive the client the way a
    // script injected into the page could (a compromised frontend has this access anyway).
    ;(window as unknown as { nimbus?: { client: SignClient } }).nimbus = { client }
    return { client, projectId, clientId: await client.core.crypto.getClientId() }
  })()
  return started
}
