import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import useWalletConnectEventsManager from '@/hooks/useWalletConnectEventsManager'
import SettingsStore from '@/store/SettingsStore'
import { createLegacySignClient } from '@/utils/LegacyWalletConnectUtil'
import { createTheme, NextUIProvider } from '@nextui-org/react'
import { AppProps } from 'next/app'
import { useSnapshot } from 'valtio'
import '../../public/main.css'
import useAccounts from '../hooks/useAccounts'
import { createWeb3Wallet } from '../utils/WalletConnectUtil'

// Step 1 - Initialize web3wallet with default region
createWeb3Wallet()

export default function App({ Component, pageProps }: AppProps) {
  const { web3WalletReady } = useSnapshot(SettingsStore.state)

  // Step 2 - Initialize wallets
  useAccounts()

  // Step 3 - Once initialized, set up wallet connect event manager
  useWalletConnectEventsManager()

  // Backwards compatibility only - create a legacy v1 SignClient instance.
  createLegacySignClient()

  return (
    <NextUIProvider theme={createTheme({ type: 'dark' })}>
      <Layout initialized={web3WalletReady}>
        <Component {...pageProps} />
      </Layout>

      <Modal />
    </NextUIProvider>
  )
}
