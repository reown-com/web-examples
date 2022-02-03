import { createContext, ReactNode, useState } from 'react'

/**
 * Types
 */
interface State {}

interface Props {
  children: ReactNode | ReactNode[]
}

/**
 * Context
 */
export const WalletContext = createContext<State>({})

/**
 * Provider
 */
export function WalletContextProvider({ children }: Props) {
  const [state, setState] = useState<State>({})

  const actions = {
    async initialise() {}
  }

  return <WalletContext.Provider value={{ state, actions }}>{children}</WalletContext.Provider>
}
