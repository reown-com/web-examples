import ReactDOM from "react-dom/client";

import { createWeb3Modal, defaultSolanaConfig } from '@web3modal/solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@web3modal/solana/chains'

import {
  PhantomWalletAdapter,
  HuobiWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter
} from '@solana/wallet-adapter-wallets'

import "./styles.css"

// 0. Setup chains
const chains = [solana, solanaTestnet, solanaDevnet]

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");

// 2. Create solanaConfig
const metadata = {
  name: 'Web3Modal',
  description: 'Web3Modal Solana Example',
  url: 'https://web3modal.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const solanaConfig = defaultSolanaConfig({
  metadata,
  chains,
  projectId,
  
})

// 3. Create modal
createWeb3Modal({
  solanaConfig,
  chains,
  projectId,
  wallets: [  
    new PhantomWalletAdapter(),
    new HuobiWalletAdapter(),
    new SolflareWalletAdapter(),
    new TrustWalletAdapter()
  ],

})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <div className="centered-div">
    <w3m-button />
  </div>
);
