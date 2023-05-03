import AuthClient from '@walletconnect/auth-client'
import pkg from '@walletconnect/auth-client/package.json'
import { Verify } from '@walletconnect/types'

console.log(`AuthClient@${pkg.version}`)

export let authClient: AuthClient

export async function createAuthClient() {
  authClient = await AuthClient.init({
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
