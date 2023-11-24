import SettingsStore from '@/store/SettingsStore'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { createAuthClient, createPushClient } from '@/utils/WalletConnectUtil'
import { useCallback, useEffect, useState } from 'react'

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false)

  const onInitialize = useCallback(async () => {
    try {
      const { eip155Addresses } = createOrRestoreEIP155Wallet()
      SettingsStore.setEIP155Address(eip155Addresses[0])
      await createAuthClient()
      await createPushClient()
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
