'use client'
import React, { ReactNode } from 'react'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { State, WagmiProvider } from 'wagmi'
import { walletConnect } from '@wagmi/connectors'
import { OPTIONAL_METHODS } from '@walletconnect/ethereum-provider'
import { Theme } from '@radix-ui/themes'
import { getWagmiConfig } from '../utils/WagmiConstants'
import { ConstantsUtil } from '../utils/ConstantsUtil'
import { TicTacToeContextProvider } from './TicTacToeContextProvider'

// Get projectId from https://cloud.walletconnect.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined')
}

const queryClient = new QueryClient()

const connectors = [
  walletConnect({
    projectId: ConstantsUtil.ProjectId,
    metadata: ConstantsUtil.Metadata,
    showQrModal: false,
    // @ts-expect-error: Overridding optionalMethods
    optionalMethods: [...OPTIONAL_METHODS, 'wallet_grantPermissions']
  })
]
export const wagmiEmailConfig = getWagmiConfig('email', connectors)

createWeb3Modal({
  wagmiConfig: wagmiEmailConfig,
  projectId: ConstantsUtil.ProjectId,
  enableAnalytics: true,
  metadata: ConstantsUtil.Metadata,
  termsConditionsUrl: 'https://walletconnect.com/terms',
  privacyPolicyUrl: 'https://walletconnect.com/privacy'
})

export function AppKitProvider({
  children,
  initialState
}: {
  children: ReactNode
  initialState?: State
}) {
  return (
    <Theme appearance="dark">
      <WagmiProvider config={wagmiEmailConfig} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          <TicTacToeContextProvider>{children}</TicTacToeContextProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Theme>
  )
}
