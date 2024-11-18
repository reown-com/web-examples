import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { createTheme, NextUIProvider } from '@nextui-org/react'

import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import useInitialization from '@/hooks/useInitialization'
import useWalletConnectEventsManager from '@/hooks/useWalletConnectEventsManager'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { RELAYER_EVENTS } from '@walletconnect/core'
import  type { AppProps } from 'next/app'
import '../../public/main.css'
import { styledToast } from '@/utils/HelperUtil'
import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { EIP155_CHAINS } from '@/data/EIP155Data'
import { mainnet, polygon, arbitrum, base} from '@reown/appkit/networks'


const ethersAdapter = new EthersAdapter()

const metadata = {
  name: 'Reown Web Wallet',
  description: 'Reown Web Wallet',
  url: 'https://web-wallet.reown.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

const modal = createAppKit({
  adapters: [ethersAdapter],
  networks: [mainnet, polygon, arbitrum, base],
  defaultNetwork: mainnet,
  projectId:  process.env.NEXT_PUBLIC_PROJECT_ID as string,
  features: {
    analytics: true
  },
  metadata
})

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
