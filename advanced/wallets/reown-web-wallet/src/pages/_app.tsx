import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { createTheme, NextUIProvider } from '@nextui-org/react'

import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import useInitialization from '@/hooks/useInitialization'
import useWalletConnectEventsManager from '@/hooks/useWalletConnectEventsManager'
import { walletKit } from '@/utils/WalletConnectUtil'
import { RELAYER_EVENTS } from '@walletconnect/core'
import  type { AppProps } from 'next/app'
import '../../public/main.css'
import { styledToast } from '@/utils/HelperUtil'
import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, polygon, optimism, avalanche} from '@reown/appkit/networks'
import useAppKitProviderEventsManager from '@/hooks/useAppKitProviderEventsManager'

const ethersAdapter = new EthersAdapter()

const metadata = {
  name: 'Reown Web Wallet',
  description: 'Reown Web Wallet',
  url: 'reown-web-wallet.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
  redirect: {
    native: typeof window !== 'undefined' ? window.location.origin : undefined
  }
}

const modal = createAppKit({
  adapters: [ethersAdapter],
  networks: [mainnet, polygon, optimism, avalanche],
  defaultNetwork: mainnet,
  projectId:  process.env.NEXT_PUBLIC_PROJECT_ID as string, 
  features: {
    analytics: true,
    emailShowWallets: false,
  },
  allWallets: 'HIDE',
  metadata
})


export default function App({ Component, pageProps }: AppProps) {
  // Step 1 - Initialize wallets and wallet connect client
  const initialized = useInitialization()

  // Step 2 - Once initialized, set up wallet connect event manager
  useWalletConnectEventsManager(initialized)
  useAppKitProviderEventsManager()
  useEffect(() => {
    if (!initialized) return
    walletKit?.core.relayer.on(RELAYER_EVENTS.connect, () => {
      styledToast('Network connection is restored!', 'success')
    })

    walletKit?.core.relayer.on(RELAYER_EVENTS.disconnect, () => {
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
