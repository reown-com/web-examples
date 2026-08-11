import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { createTheme, NextUIProvider } from '@nextui-org/react'

import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import useInitialization from '@/hooks/useInitialization'
import useWalletConnectEventsManager from '@/hooks/useWalletConnectEventsManager'
import { walletkit } from '@/utils/WalletConnectUtil'
import { RELAYER_EVENTS } from '@walletconnect/core'
import { AppProps } from 'next/app'
import '../../public/main.css'
import { styledToast } from '@/utils/HelperUtil'

// Institutional light theme — a clean custody-console look (à la enterprise
// vault dashboards) rather than the default dark mobile styling.
const institutionalTheme = createTheme({
  type: 'light',
  theme: {
    colors: {
      primary: '#2E5CFF',
      primaryLight: '#eaf0ff',
      primaryLightHover: '#dbe6ff',
      primaryLightActive: '#c7d8ff',
      primaryLightContrast: '#2E5CFF',
      primarySolidContrast: '#ffffff',
      primaryShadow: 'rgba(46,92,255,0.3)',
      secondary: '#7C3AED',
      secondaryLight: '#f1e9ff',
      link: '#2E5CFF'
    },
    fonts: {
      sans: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
    }
  }
})

export default function App({ Component, pageProps }: AppProps) {
  // Step 1 - Initialize wallets and wallet connect client
  const initialized = useInitialization()

  // Step 2 - Once initialized, set up wallet connect event manager
  useWalletConnectEventsManager(initialized)
  useEffect(() => {
    if (!initialized) return
    walletkit?.core.relayer.on(RELAYER_EVENTS.connect, () => {
      styledToast('Network connection is restored!', 'success')
    })

    walletkit?.core.relayer.on(RELAYER_EVENTS.disconnect, () => {
      styledToast('Network connection lost.', 'error')
    })
  }, [initialized])
  return (
    <NextUIProvider theme={institutionalTheme}>
      <Layout initialized={initialized}>
        <Toaster />
        <Component {...pageProps} />
      </Layout>

      <Modal />
    </NextUIProvider>
  )
}
