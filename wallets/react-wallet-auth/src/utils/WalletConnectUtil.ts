import AuthClient from '@walletconnect/auth-client'
import pkg from '@walletconnect/auth-client/package.json'
import { Verify } from '@walletconnect/types'
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
  const authClientId = await authClient.core.crypto.getClientId()
  console.log({ authClientId })
}

export async function createPushClient() {
  pushClient = await WalletClient.init({
    logger: 'debug',
    core,
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
    relayUrl: process.env.NEXT_PUBLIC_RELAY_URL || 'wss://relay.walletconnect.com'
  })
  const pushClientId = await pushClient.core.crypto.getClientId()
  console.log({ pushClientId })
}

export const getAndFormatNotifications = () => {
  if (!pushClient) {
    return []
  }
  const activeSubscriptions = pushClient.getActiveSubscriptions()
  const allMessagesWithSubscription = Object.entries(activeSubscriptions)
    .map(([topic, subscription]) => ({
      subscription,
      messages: Object.values(
        pushClient.getMessageHistory({
          topic
        })
      )
    }))
    .reverse()

  return allMessagesWithSubscription
}

export function getVerifyStatus(context?: Verify.Context) {
  if (!context) return ''
  switch (context.verified.validation) {
    case 'VALID':
      return '✅'
    case 'INVALID':
      return '❌'
    case 'UNKNOWN':
      return '❓'
    default:
      return ''
  }
}
