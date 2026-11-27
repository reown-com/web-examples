import type SignClient from '@walletconnect/sign-client'
import type { SignClientTypes } from '@walletconnect/types'

import { DEFAULT_PROJECT_ID, PROJECTS, RELAY_URL } from './common'

export type App = 'dapp' | 'wallet'
export interface Started {
  client: SignClient
  projectId: string
  clientId: string
}

const projectKey = (app: App) => `demo-${app}-project`
/**
 * The project picked in the header, or the default one from NEXT_PUBLIC_PROJECT_ID. A saved pick
 * counts only while the picker still offers it, so a default saved under an earlier
 * NEXT_PUBLIC_PROJECT_ID doesn't outlive it.
 */
export const currentProject = (app: App) => {
  const picked = localStorage.getItem(projectKey(app))
  return picked && PROJECTS.some(p => p.id === picked) ? picked : DEFAULT_PROJECT_ID
}

export function setProject(app: App, id: string) {
  // The default isn't saved, so it follows NEXT_PUBLIC_PROJECT_ID.
  if (id === DEFAULT_PROJECT_ID) localStorage.removeItem(projectKey(app))
  else localStorage.setItem(projectKey(app), id)
  location.reload()
}

// One identity per project: the Relay keeps the project a client first registered with, so an
// identity switched to another project would still count as its first one. The default project is
// keyed by its id too, so changing NEXT_PUBLIC_PROJECT_ID starts a new identity.
const prefixFor = (app: App, projectId: string) => `demo-${app}@${projectId}:`

/** Forgets this app's identities and sessions in every project. */
export function resetApp(app: App, extraKeys: string[] = []) {
  for (const k of Object.keys(localStorage)) {
    // The SDK puts its own prefixes in front of ours. `demo-${app}:` was the default project's
    // prefix before it was keyed by id.
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

let started: Promise<Started> | undefined

/**
 * Starts the one client this page uses. It speaks Sign v3, with Sign v2 as the fallback. It loads
 * in the browser only, and once, even with React strict mode running effects twice.
 */
export function startClient(app: App, metadata: SignClientTypes.Metadata): Promise<Started> {
  started ??= (async () => {
    const projectId = currentProject(app)
    if (!projectId) {
      throw new Error(
        'NEXT_PUBLIC_PROJECT_ID is not set. Set it in .env.local, or in the Vercel project, then rebuild.'
      )
    }
    const { SignClient } = await import('@walletconnect/sign-client')
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
