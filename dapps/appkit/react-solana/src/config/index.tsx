import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'


// Get projectId from https://cloud.reown.com
export const projectId = import.meta.env.VITE_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Create a metadata object - optional
export const metadata = {
  name: 'AppKit',
  description: 'AppKit Example',
  url: 'https://reown.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [solana, solanaTestnet, solanaDevnet]

// Set up Solana Adapter
export const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
})