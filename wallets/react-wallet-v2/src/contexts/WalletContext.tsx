import WalletConnectClient from '@walletconnect/client'
import { Wallet } from 'ethers'
import KeyValueStorage from 'keyvaluestorage'
import { createContext, ReactNode, useMemo, useState } from 'react'

/**
 * Types
 */
interface State {
  initialized: boolean
  wallet: Wallet
  walletConnectClient: WalletConnectClient
}

interface Actions {
  setInitialized: () => void
  createWallet: () => void
  createWalletConnectClient: () => Promise<void>
}

interface Context {
  state: State
  actions: Actions
}

interface Props {
  children: ReactNode | ReactNode[]
}

/**
 * Context / Provider
 */
export const WalletContext = createContext<Context>({} as Context)

export function WalletContextProvider({ children }: Props) {
  const [state, setState] = useState<State>({
    initialized: false,
    wallet: undefined,
    walletConnectClient: undefined
  })

  const actions = useMemo(
    () => ({
      setInitialized() {
        setState(s => ({ ...s, initialized: true }))
      },

      createWallet() {
        const wallet = Wallet.createRandom()
        setState(s => ({ ...s, wallet }))
      },

      async createWalletConnectClient() {
        const walletConnectClient = await WalletConnectClient.init({
          controller: true,
          logger: 'debug',
          projectId: '8f331b9812e0e5b8f2da2c7203624869',
          relayUrl: 'wss://relay.walletconnect.com',
          metadata: {
            name: 'React Wallet',
            description: 'React Wallet for WalletConnect',
            url: 'https://walletconnect.com/',
            icons: ['https://avatars.githubusercontent.com/u/37784886']
          },
          storage: new KeyValueStorage()
        })
        setState(s => ({ ...s, walletConnectClient }))
      }
    }),
    []
  )

  return <WalletContext.Provider value={{ state, actions }}>{children}</WalletContext.Provider>
}
