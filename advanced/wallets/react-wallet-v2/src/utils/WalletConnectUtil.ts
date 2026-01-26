import { WalletKit, IWalletKit } from '@reown/walletkit'
import { Core } from '@walletconnect/core'
export let walletkit: IWalletKit

/**
 * Payment Link Detection Utilities
 */
export function isPaymentLink(uri: string): boolean {
  // Handle WC URI with pay= parameter
  if (uri.startsWith('wc:')) {
    const queryStart = uri.indexOf('?')
    if (queryStart === -1) return false
    const queryString = uri.substring(queryStart + 1)
    const params = new URLSearchParams(queryString)
    const payParam = params.get('pay')
    if (payParam) {
      return isPaymentUrl(decodeURIComponent(payParam))
    }
    return false
  }
  return isPaymentUrl(uri)
}

function isPaymentUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    const isPayHost =
      hostname === 'pay.walletconnect.com' || hostname === 'www.pay.walletconnect.com'
    return isPayHost && parsed.searchParams.has('pid')
  } catch {
    return false
  }
}

export function extractPaymentLink(uri: string): string {
  // If it's a WC URI with pay= parameter, extract the payment link
  if (uri.startsWith('wc:')) {
    const queryStart = uri.indexOf('?')
    if (queryStart !== -1) {
      const queryString = uri.substring(queryStart + 1)
      const params = new URLSearchParams(queryString)
      const payParam = params.get('pay')
      if (payParam) {
        return decodeURIComponent(payParam)
      }
    }
  }
  // Otherwise return as-is (it's already a direct payment URL)
  return uri
}

export async function createWalletKit(relayerRegionURL: string) {
  // Validate required environment variables
  if (!process.env.NEXT_PUBLIC_PROJECT_ID) {
    throw new Error(
      'NEXT_PUBLIC_PROJECT_ID is not set. Please create a .env.local file with your WalletConnect project ID. ' +
        'Get one at https://cloud.walletconnect.com'
    )
  }

  const core = new Core({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    relayUrl: relayerRegionURL || process.env.NEXT_PUBLIC_RELAY_URL,
    logger: 'error'
  })
  walletkit = await WalletKit.init({
    core,
    metadata: {
      name: 'React Wallet Example',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    },
    signConfig: {
      disableRequestQueue: true
    }
  })

  try {
    const clientId = await walletkit.engine.signClient.core.crypto.getClientId()
    console.log('WalletConnect ClientID: ', clientId)
    localStorage.setItem('WALLETCONNECT_CLIENT_ID', clientId)
  } catch (error) {
    console.error('Failed to set WalletConnect clientId in localStorage: ', error)
  }
}

export async function updateSignClientChainId(chainId: string, address: string) {
  console.log('chainId', chainId, address)
  // get most recent session
  const sessions = walletkit.getActiveSessions()
  if (!sessions) return
  const namespace = chainId.split(':')[0]
  Object.values(sessions).forEach(async session => {
    await walletkit.updateSession({
      topic: session.topic,
      namespaces: {
        ...session.namespaces,
        [namespace]: {
          ...session.namespaces[namespace],
          chains: [
            ...new Set([chainId].concat(Array.from(session?.namespaces?.[namespace]?.chains || [])))
          ],
          accounts: [
            ...new Set(
              [`${chainId}:${address}`].concat(
                Array.from(session?.namespaces?.[namespace]?.accounts || [])
              )
            )
          ]
        }
      }
    })
    await new Promise(resolve => setTimeout(resolve, 1000))

    const chainChanged = {
      topic: session.topic,
      event: {
        name: 'chainChanged',
        data: parseInt(chainId.split(':')[1])
      },
      chainId: chainId
    }

    const accountsChanged = {
      topic: session.topic,
      event: {
        name: 'accountsChanged',
        data: [`${chainId}:${address}`]
      },
      chainId
    }
    await walletkit.emitSessionEvent(chainChanged)
    await walletkit.emitSessionEvent(accountsChanged)
  })
}
