import SignClient from '@walletconnect/sign-client'
import { ChatClient, IChatClient } from '@walletconnect/chat-client'

export let signClient: SignClient
export let chatClient: IChatClient

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
  chatClient = await ChatClient.init({
    logger: 'debug',
    keyseverUrl: 'https://keys.walletconnect.com',
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    relayUrl: process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://relay.walletconnect.com'
  })
}
