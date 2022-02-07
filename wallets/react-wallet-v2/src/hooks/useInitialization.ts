import WalletStore from '@/store/WalletStore'
import { createClient } from '@/utils/WalletConnectUtil'
import { useCallback, useEffect, useState } from 'react'

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false)

  const onInitialize = useCallback(async () => {
    try {
      WalletStore.createWallet()
      await createClient()
      setInitialized(true)
    } catch (err: unknown) {
      alert(err)
    }
  }, [])

  useEffect(() => {
    if (!initialized) {
      onInitialize()
    }
  }, [initialized, onInitialize])

  return initialized
}
