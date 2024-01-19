'use client'

import { WagmiProvider, State } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { wagmiConfig } from './wagmiConfig'

// 0. Setup queryClient
const queryClient = new QueryClient()

export function Web3Modal({ children, initialState }: { children: ReactNode; initialState?: State }) {
	return (
		<WagmiProvider config={wagmiConfig} initialState={initialState}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</WagmiProvider>
	)
}
