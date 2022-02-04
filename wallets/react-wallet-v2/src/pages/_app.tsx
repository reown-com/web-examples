import GlobalLayout from '@/containers/GlobalLayout'
import { darkTheme, lightTheme } from '@/utils/ThemeUtil'
import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider } from 'next-themes'
import { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
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
        <GlobalLayout>
          <Component {...pageProps} />
        </GlobalLayout>
      </NextUIProvider>
    </ThemeProvider>
  )
}
