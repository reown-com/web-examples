import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { mainnet, polygon, base, solana, solanaTestnet, solanaDevnet, type AppKitNetwork } from '@reown/appkit/networks'
import { PhantomWalletAdapter,SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
export const projectId = import.meta.env.VITE_PROJECT_ID || ""
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, polygon, base, solana, solanaTestnet, solanaDevnet]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId
})

export const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
})