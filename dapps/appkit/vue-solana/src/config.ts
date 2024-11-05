import { SolanaAdapter } from '@reown/appkit-adapter-solana/vue'
import {solana, solanaTestnet, solanaDevnet, type AppKitNetwork} from '@reown/appkit/networks'
import {PhantomWalletAdapter,SolflareWalletAdapter} from '@solana/wallet-adapter-wallets'


export const projectId = import.meta.env.VITE_PROJECT_ID || ""
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [solana, solanaTestnet, solanaDevnet]

export const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
})