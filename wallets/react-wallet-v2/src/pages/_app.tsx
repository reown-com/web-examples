import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import useInitialization from '@/hooks/useInitialization'
import useWalletConnectEventsManager from '@/hooks/useWalletConnectEventsManager'
import '@/styles/main.css'
import { darkTheme, lightTheme } from '@/utils/ThemeUtil'
import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider } from 'next-themes'
import { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  // Step 1 - Initialize wallets and wallet connect client
  const initialized = useInitialization()

  // Step 2 - Once initialized, set up wallet connect event manager
  useWalletConnectEventsManager(initialized)

  return (
    <ThemeProvider
      defaultTheme="system"
      attribute="class"
      value={{
        light: lightTheme.className,
        dark: darkTheme.className
      }}
    >
      <NextUIProvider>
        <Layout initialized={initialized}>
          <Component {...pageProps} />
        </Layout>

        <Modal />
      </NextUIProvider>
    </ThemeProvider>
  )
}
