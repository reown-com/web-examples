import { createAppKit } from '@reown/appkit/react'

import { WagmiProvider } from 'wagmi'
import { arbitrum, mainnet } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { WagmiHooks } from './components/hooks'

import "./App.css"

// add a Custom Chain
const chiliz = {
  id: 'eip155:88888',
  chainId: 88_888,
  name: 'Chiliz Chain',
  currency: 'CHZ',
  explorerUrl: 'https://scan.chiliz.com',
  rpcUrl: "https://rpc.ankr.com/chiliz",
  chainNamespace: 'eip155'
} as const


// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId from https://cloud.reown.com
const projectId = import.meta.env.VITE_PROJECT_ID
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

// 2. Create a metadata object - optional
const metadata = {
  name: 'AppKit',
  description: 'AppKit Example',
  url: 'https://reown.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

const generalConfig = {
  projectId,
  metadata,
  networks: [arbitrum, mainnet, chiliz],
}

// 3. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter(generalConfig)

// 4. Create modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  ...generalConfig,
})

export function App() {

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
          <w3m-button />
          <WagmiHooks />
          <button onClick={() => modal.adapter?.connectionControllerClient?.disconnect()}>Disconnect JS</button>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
