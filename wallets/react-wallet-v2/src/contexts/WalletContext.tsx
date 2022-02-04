import { ethers } from 'ethers'
import { createContext, ReactNode, useState } from 'react'

/**
 * Types
 */
interface State {
  wallet: ethers.Wallet
}

interface Actions {
  createWallet: () => void
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
  const [state, setState] = useState<State>({ wallet: undefined })

  const actions = {
    createWallet() {
      const wallet = ethers.Wallet.createRandom()
      setState(s => ({ ...s, wallet }))
    }
  }

  return <WalletContext.Provider value={{ state, actions }}>{children}</WalletContext.Provider>
}
