import type SignClient from '@/lib/sign-client-v3'
import type { SignClientTypes } from '@walletconnect/types'

import { DEFAULT_PROJECT_ID, RELAY_URL } from './common'

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
    if (k.startsWith(`demo-${app}:`) || k.startsWith(`demo-${app}@`)) localStorage.removeItem(k)
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

let started: Promise<Started> | undefined

/**
 * Starts the one client this page uses, from the vendored @walletconnect/sign-client/v3. It loads
 * in the browser only, and once, even with React strict mode running effects twice.
 */
export function startClient(app: App, metadata: SignClientTypes.Metadata): Promise<Started> {
  started ??= (async () => {
    const { SignClient } = await import('@/lib/sign-client-v3')
    const projectId = currentProject(app)
    const client = await SignClient.init({
      projectId,
      metadata,
      relayUrl: RELAY_URL,
      customStoragePrefix: prefixFor(app, projectId),
      storage: localStorageKV
    })
    return { client, projectId, clientId: await client.core.crypto.getClientId() }
  })()
  return started
}
