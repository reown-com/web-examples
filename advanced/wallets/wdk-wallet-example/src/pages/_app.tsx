import type { AppProps } from 'next/app'
import { Buffer } from 'buffer'
import '@/styles/globals.css'

// Some crypto libs (TON, Solana) expect a global Buffer at runtime.
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  ;(window as any).Buffer = Buffer
}

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
