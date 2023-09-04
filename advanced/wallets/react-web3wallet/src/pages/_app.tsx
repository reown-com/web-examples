import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import useInitialization from '@/hooks/useInitialization'
import useWalletConnectEventsManager from '@/hooks/useWalletConnectEventsManager'
import { createTheme, NextUIProvider } from '@nextui-org/react'
import { AppProps } from 'next/app'
import '../../public/main.css'

export default function App({ Component, pageProps }: AppProps) {
  // Step 1 - Initialize wallets and wallet connect client
  const initialized = useInitialization()

  // Step 2 - Once initialized, set up wallet connect event manager
  useWalletConnectEventsManager(initialized)

  // render app
  return (
    <NextUIProvider theme={createTheme({ type: 'dark' })}>
      <Layout initialized={initialized}>
        <Component {...pageProps} />
      </Layout>

      <Modal />
    </NextUIProvider>
  )
}
