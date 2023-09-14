import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { createTheme, NextUIProvider } from '@nextui-org/react'

import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import useInitialization from '@/hooks/useInitialization'
import useWalletConnectEventsManager from '@/hooks/useWalletConnectEventsManager'
import { signClient } from '@/utils/WalletConnectUtil'
import { RELAYER_EVENTS } from '@walletconnect/core'
import { AppProps } from 'next/app'
import '../../public/main.css'
import { styledToast } from '@/utils/HelperUtil'

export default function App({ Component, pageProps }: AppProps) {
  // Step 1 - Initialize wallets and wallet connect client
  const initialized = useInitialization()

  // Step 2 - Once initialized, set up wallet connect event manager
  useWalletConnectEventsManager(initialized)
  useEffect(() => {
    if (!initialized) return
    signClient.core.relayer.on(RELAYER_EVENTS.connect, () => {
      styledToast('Network connection is restored!', 'success')
    })

    signClient.core.relayer.on(RELAYER_EVENTS.disconnect, () => {
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
