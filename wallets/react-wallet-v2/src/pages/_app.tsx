import Layout from '@/components/Layout'
import { theme } from '@/utils/ThemeUtil'
import { NextUIProvider } from '@nextui-org/react'
import { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextUIProvider theme={theme}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </NextUIProvider>
  )
}
