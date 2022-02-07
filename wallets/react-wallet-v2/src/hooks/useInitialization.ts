import WalletConnectStore from '@/store/WalletConnectStore'
import WalletStore from '@/store/WalletStore'
import { useCallback, useEffect, useState } from 'react'

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false)

  const onInitialize = useCallback(async () => {
    WalletStore.createWallet()
    await WalletConnectStore.createWalletConnectClient()
    setInitialized(true)
  }, [])

  useEffect(() => {
    if (!initialized) {
      onInitialize()
    }
  }, [initialized, onInitialize])

  return initialized
}
