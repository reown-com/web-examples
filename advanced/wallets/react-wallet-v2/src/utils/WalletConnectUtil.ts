import { WalletKit, IWalletKit, isPaymentLink } from '@reown/walletkit'
import { Core } from '@walletconnect/core'

export { isPaymentLink }
export let walletkit: IWalletKit

export async function createWalletKit(relayerRegionURL: string) {
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

  const apiKey = process.env.NEXT_PUBLIC_PAY_API_KEY
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/pay`
    : 'https://api.pay.walletconnect.com'

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
    },
    ...(apiKey ? {
      payConfig: {
        appId: process.env.NEXT_PUBLIC_PROJECT_ID,
        apiKey,
        baseUrl,
      }
    } : {})
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
