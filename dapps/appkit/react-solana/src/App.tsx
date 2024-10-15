import { createAppKit } from '@reown/appkit/react'
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

import { SolanaHooks } from './components/hooks'


import "./App.css"

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



// 3. Create Wagmi Adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
})

// 4. Create modal
const modal = createAppKit({
  projectId,
  metadata,
  networks: [solana, solanaTestnet, solanaDevnet],
  adapters: [solanaWeb3JsAdapter],
})

export function App() {


  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2>Reown AppKit + Solana</h2>
      <w3m-button />
      <SolanaHooks />
      <p>
        <button onClick={() => modal.adapter?.connectionControllerClient?.disconnect()}>Disconnect</button>
      </p>
    </div>
  )
}

export default App
