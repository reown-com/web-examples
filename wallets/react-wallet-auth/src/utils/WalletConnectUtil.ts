import AuthClient from '@walletconnect/auth-client'
import pkg from '@walletconnect/auth-client/package.json'
import { Core } from '@walletconnect/core'
import { WalletClient } from '@walletconnect/push-client'

const core = new Core({
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID!
})

console.log(`AuthClient@${pkg.version}`)

export let authClient: AuthClient
export let pushClient: WalletClient

export async function createAuthClient() {
  authClient = await AuthClient.init({
    core,
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
    relayUrl: process.env.NEXT_PUBLIC_RELAY_URL || 'wss://relay.walletconnect.com',
    metadata: {
      name: 'React Wallet',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
}

export async function createPushClient() {
  pushClient = await WalletClient.init({
    core,
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
    relayUrl: process.env.NEXT_PUBLIC_RELAY_URL || 'wss://relay.walletconnect.com'
  })
}
