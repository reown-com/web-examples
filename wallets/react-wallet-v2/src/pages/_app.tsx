import Layout from '@/containers/GlobalLayout'
import { WalletContextProvider } from '@/contexts/WalletContext'
import { theme } from '@/utils/ThemeUtil'
import { NextUIProvider } from '@nextui-org/react'
import { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextUIProvider theme={theme}>
      <WalletContextProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </WalletContextProvider>
    </NextUIProvider>
  )
}
