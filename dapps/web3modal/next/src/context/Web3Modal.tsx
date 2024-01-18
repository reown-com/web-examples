'use client'

import { WagmiProvider, State } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { type Chain, mainnet, sepolia } from 'wagmi/chains'
import { walletConnect } from 'wagmi/connectors'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''

if (!projectId) throw new Error('WalletConnect Project ID is undefined')

// 2. Create wagmiConfig
const metadata = {
	name: 'Web3Modal',
	description: 'Web3Modal Example',
	url: 'https://web3modal.com',
	icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

const chains = [mainnet, sepolia] as [Chain, ...Chain[]]

export const wagmiConfig = createConfig({
	chains,
	transports: {
		[mainnet.id]: http(),
		[sepolia.id]: http(),
	},
	connectors: [walletConnect({ projectId, metadata, showQrModal: false })],
	ssr: true,
	storage: createStorage({
		storage: cookieStorage,
	}),
})

// 3. Create modal
createWeb3Modal({ wagmiConfig, projectId, chains })

export function Web3Modal({ children, initialState }: { children: ReactNode; initialState?: State }) {
	return (
		<WagmiProvider config={wagmiConfig} initialState={initialState}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</WagmiProvider>
	)
}
