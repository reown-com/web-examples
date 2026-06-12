import { useCallback, useEffect, useRef, useState } from 'react'
import SettingsStore from '@/store/SettingsStore'
import { loadOrCreateAccounts } from '@/lib/WDKWallet'
import { createWalletKit, walletkit } from '@/utils/walletConnect'

/**
 * Loads the WDK accounts and initializes WalletKit exactly once.
 */
export default function useInitialization() {
  const [initialized, setInitialized] = useState(false)
  const started = useRef(false)

  const onInitialize = useCallback(async () => {
    if (started.current) return
    started.current = true
    SettingsStore.setError(undefined)

    try {
      const accounts = await loadOrCreateAccounts()
      SettingsStore.setAccounts(accounts)

      await createWalletKit()
      SettingsStore.setSessions(Object.values(walletkit.getActiveSessions()))

      SettingsStore.setInitialized(true)
      setInitialized(true)
    } catch (error) {
      console.error('Initialization failed:', error)
      SettingsStore.setError((error as Error).message)
      // Allow a retry on next render.
      started.current = false
    }
  }, [])

  useEffect(() => {
    if (!initialized) onInitialize()
  }, [initialized, onInitialize])

  return initialized
}
