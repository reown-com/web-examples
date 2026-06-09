import { WalletKit, IWalletKit, isPaymentLink } from '@reown/walletkit'
import { Core } from '@walletconnect/core'
import { SessionTypes } from '@walletconnect/types'
import SettingsStore from '@/store/SettingsStore'

export { isPaymentLink }
export let walletkit: IWalletKit

export async function createWalletKit(relayerRegionURL: string) {
  if (!process.env.NEXT_PUBLIC_PROJECT_ID) {
    throw new Error(
      'NEXT_PUBLIC_PROJECT_ID is not set. Please create a .env.local file with your WalletConnect project ID. ' +
        'Get one at https://cloud.walletconnect.com'
    )
  }

  const prodPayUrl = 'https://api.pay.walletconnect.com'
  const stagingPayUrl = 'https://staging.api.pay.walletconnect.com'
  const stagingPayAppId = '8b5ef48e106b239385bed130fa34a9a7'
  const payProjectId = process.env.NEXT_PUBLIC_PROJECT_ID
  const env = process.env.NEXT_PUBLIC_PAY_ENV || 'production'
  // Defaults to production. The settings toggle (or NEXT_PUBLIC_PAY_ENV=staging) opts into staging.
  const useStaging = SettingsStore.state.payStagingEnabled || env !== 'production'

  const core = new Core({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    relayUrl: relayerRegionURL || process.env.NEXT_PUBLIC_RELAY_URL,
    logger: 'error'
  })

  const apiKey = process.env.NEXT_PUBLIC_PAY_API_KEY

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

    payConfig: {
      ...(useStaging
        ? {
            appId: stagingPayAppId,
            baseUrl: stagingPayUrl
          }
        : {
            appId: payProjectId,
            apiKey,
            baseUrl: prodPayUrl
          })
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
  const sessions = walletkit.getActiveSessions()
  if (!sessions) return
  const namespace = chainId.split(':')[0]
  Object.values(sessions as unknown as Record<string, SessionTypes.Struct>).forEach(
    async (session: SessionTypes.Struct) => {
      await walletkit.updateSession({
        topic: session.topic,
        namespaces: {
          ...session.namespaces,
          [namespace]: {
            ...session.namespaces[namespace],
            chains: [
              ...new Set(
                [chainId].concat(Array.from(session?.namespaces?.[namespace]?.chains || []))
              )
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
    }
  )
}
