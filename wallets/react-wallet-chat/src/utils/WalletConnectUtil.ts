import SignClient from '@walletconnect/sign-client'
import { ChatClient, IChatClient } from '@walletconnect/chat-client'
import { ISyncClient, SyncClient, SyncStore } from '@walletconnect/sync-client'
import { Core } from '@walletconnect/core'

export let signClient: SignClient
export let chatClient: IChatClient
export let syncClient: ISyncClient

export async function createSignClient() {
  signClient = await SignClient.init({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    relayUrl: process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://relay.walletconnect.com',
    metadata: {
      name: 'React Wallet',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
}

// FIXME: update relayUrl here to not hardcode local relay.
export async function createChatClient() {
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

  const core = new Core({ projectId })

  syncClient = await SyncClient.init({
    core,
    projectId,
    relayUrl: process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://relay.walletconnect.com'
  })

  chatClient = await ChatClient.init({
    logger: 'debug',
    keyserverUrl: 'https://keys.walletconnect.com',
    projectId: projectId ?? '',
    relayUrl: process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://relay.walletconnect.com',
    syncClient,
    SyncStoreController: SyncStore
  })
}
