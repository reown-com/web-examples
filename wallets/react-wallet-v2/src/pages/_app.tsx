import GlobalLayout from '@/containers/GlobalLayout'
import { NextUIProvider } from '@nextui-org/react'
import { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextUIProvider>
      <GlobalLayout>
        <Component {...pageProps} />
      </GlobalLayout>
    </NextUIProvider>
  )
}
