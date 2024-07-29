
import React, {useEffect, useState} from 'react'
import type { AppProps } from 'next/app';
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mainnet, sepolia } from 'wagmi/chains'
import { WagmiProvider,  } from 'wagmi'
import { cookieToInitialState, State } from 'wagmi';
import { SessionProvider, useSession } from 'next-auth/react';
import Cookies from 'js-cookie';

import type { SIWESession } from '@web3modal/siwe'


import { cookieStorage, createStorage } from 'wagmi'

import { createSIWE } from '../utils/siweUtils'

import styles from './styles/centeredDiv.module.css'



export default function Home({ Component, pageProps }: AppProps) {
  const [cookies, setCookies] = useState("");
  const [initialState, setInitialState] = useState<State | undefined>(undefined);

  const { data, status } = useSession();
  const session = data as unknown as SIWESession

  useEffect(() => {
    const cookiesValues = Cookies.get();
    console.log('cookiesValues', cookiesValues);
    console.log("wagoniConfig", wagmiConfig);
    setInitialState(cookieToInitialState(wagmiConfig, cookiesValues+""));
  }, []);

  /* useEffect(() => {
    console.log("isConnected", isConnected);
  },  [isConnected]);

 */  // 0. Setup queryClient
  const queryClient = new QueryClient()

  // 1. Get projectId from https://cloud.walletconnect.com
  const projectId = process.env.NEXT_PUBLIC_APPKIT_PROJECT_ID || ''

  // 2. Select the chains you want to approve
  const chains = [mainnet, sepolia] as const

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
  const siweConfig = createSIWE(chains.map(chain => chain.id) as [number])

  // 5. Create modal with basic configuration
  createWeb3Modal({
    siweConfig,
    wagmiConfig,
    projectId,
  })

  return (
    
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
          <QueryClientProvider client={queryClient}>
            <div className={styles.centeredDiv}>
              <w3m-button />
              {`eip155:${session?.chainId}`} - {status} -  {session?.address}
            </div>
          </QueryClientProvider>
    </WagmiProvider>
  );
}
