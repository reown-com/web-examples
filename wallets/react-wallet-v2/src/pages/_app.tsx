import Layout from '@/components/Layout'
import WalletConnectManager from '@/components/WalletConnectManager'
import useInitialization from '@/hooks/useInitialization'
import { darkTheme, lightTheme } from '@/utils/ThemeUtil'
import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider } from 'next-themes'
import { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  const initialized = useInitialization()

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

        {initialized && <WalletConnectManager />}
      </NextUIProvider>
    </ThemeProvider>
  )
}
