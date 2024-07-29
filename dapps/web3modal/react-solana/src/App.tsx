import { createWeb3Modal, defaultSolanaConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@web3modal/solana/chains'
import { useEffect, useState } from "react";
import {
    PhantomWalletAdapter,
    HuobiWalletAdapter,
    SolflareWalletAdapter,
    TrustWalletAdapter
  } from '@solana/wallet-adapter-wallets'

const events: string[] = [];

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
const App = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);

    const { address, chainId } = useWeb3ModalAccount()
    const { walletProvider, connection } = useWeb3ModalProvider() 

    useEffect(() => {
        console.log('connection', connection);
    },[connection]);

    useEffect(() => {
        console.log('walletProvider', walletProvider);
        if (walletProvider) {
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
    },[walletProvider]);

    const handleGetBalance = async () => {}
    const handleSign = async () => {}
    const handleSendTransaction = async () => {}
    

return (
    <div className="App center-content">
      <h2>WalletConnect AppKit + Solana</h2>
      <w3m-button  />
      {isConnected && (
        <>
          <div className="btn-container">
          <button onClick={handleGetBalance}>get Balance</button>
            <button onClick={handleSign}>Sign MSG</button>
            <button onClick={handleSendTransaction}>Send Transaction</button>
          </div>
          <br />
          <div>
            <textarea className="console" readOnly is>
                
            </textarea>
          </div>
        </>
      )
    }
      
      <div className="circle">
        <a href="https://github.com/WalletConnect/web-examples/tree/main/dapps/universal-provider-tron" target="_blank"><img src="/github.png" alt="GitHub" width="50" /></a>
      </div>
    </div>
  );
}

export default App;