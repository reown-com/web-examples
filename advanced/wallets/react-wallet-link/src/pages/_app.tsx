import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { createTheme, NextUIProvider } from '@nextui-org/react'

import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import useInitialization from '@/hooks/useInitialization'
import useWalletConnectEventsManager from '@/hooks/useWalletConnectEventsManager'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { RELAYER_EVENTS } from '@walletconnect/core'
import { AppProps } from 'next/app'
import '../../public/main.css'
import { styledToast } from '@/utils/HelperUtil'
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'
import { EIP155_CHAINS } from '@/data/EIP155Data'

const chains = Object.values(EIP155_CHAINS).map((chain) => ({
  ...chain,
  rpcUrl: chain.rpc,
  chainId: chain.chainId,
  explorerUrl: 'https://etherscan.io',
  currency: 'ETH'
}))

const metadata = {
  name: 'Web3Modal',
  description: 'Web3Modal Laboratory',
  url: 'https://lab.web3modal.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

const modal = createWeb3Modal({
  ethersConfig: defaultConfig({
    metadata,
    defaultChainId: 1,
    rpcUrl: 'https://cloudflare-eth.com',
    chains,
    enableEmail: true,
  }),
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID as string,
  chains,
  enableAnalytics: true,
  metadata,
  termsConditionsUrl: 'https://walletconnect.com/terms',
  privacyPolicyUrl: 'https://walletconnect.com/privacy',
  enableOnramp: true,
  enableEmail: true,
})

console.log('created web3modal', modal)


export default function App({ Component, pageProps }: AppProps) {
  // Step 1 - Initialize wallets and wallet connect client
  const initialized = useInitialization()

  // Step 2 - Once initialized, set up wallet connect event manager
  useWalletConnectEventsManager(initialized)
  useEffect(() => {
    if (!initialized) return
    web3wallet?.core.relayer.on(RELAYER_EVENTS.connect, () => {
      styledToast('Network connection is restored!', 'success')
    })

    web3wallet?.core.relayer.on(RELAYER_EVENTS.disconnect, () => {
      styledToast('Network connection lost.', 'error')
    })
  }, [initialized])



  return (
    <NextUIProvider theme={createTheme({ type: 'dark' })}>
        <Layout initialized={initialized}>
          <Toaster />
          <Component {...pageProps} />
        </Layout>

        <Modal />
    </NextUIProvider>
  )
}
