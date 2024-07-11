
import React from 'react'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mainnet } from 'wagmi/chains'
import { WagmiProvider,  } from 'wagmi'

import { createSIWE } from '../utils/siweUtils'

import styles from './styles/centeredDiv.module.css'


export default function Home() {

  // 0. Setup queryClient
  const queryClient = new QueryClient()

  // 1. Get projectId from https://cloud.walletconnect.com
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

  // 2. Select the chains you want to approve
  const chains = [mainnet] as const

  // 3. Create wagmiConfig
  const metadata = {
    name: 'Web3Modal',
    description: 'Web3Modal SIWE Example',
    url: 'https://web3modal.com', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  }
  const wagmiConfig = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
  })

  // 4. Create a SIWE configuration object
  const siweConfig = createSIWE(chains.map(chain => chain.id) as [number])

  // 5. Create modal with basic configuration
  createWeb3Modal({
    siweConfig,
    wagmiConfig,
    projectId,
  })

  return (
    <WagmiProvider config={wagmiConfig} initialState={undefined}>
          <QueryClientProvider client={queryClient}>
            <div className={styles.centeredDiv}>
              <w3m-button />
            </div>
          </QueryClientProvider>
    </WagmiProvider>
  );
}
