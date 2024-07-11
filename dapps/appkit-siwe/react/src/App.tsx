import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createSIWE  } from './utils/siweUtils'
import { WagmiProvider } from 'wagmi'
import { optimismSepolia } from 'wagmi/chains'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'

import './App.css'

function App() {
  // 0. Setup queryClient
  const queryClient = new QueryClient()

  // 1. Get projectId from https://cloud.walletconnect.com
  const projectId = import.meta.env.VITE_PROJECT_ID || ''

  // 2. Select the chains you want to approve
  const chains = [optimismSepolia] as const

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
  });

  // 4. Create a SIWE configuration object
  const siweConfig = createSIWE(chains.map(chain => chain.id) as [number]);

  createWeb3Modal({
    siweConfig,
    wagmiConfig,
    projectId,
  });

  return (
    <>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <div className="centered-div">
            <w3m-button />
          </div>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  )
}

export default App
