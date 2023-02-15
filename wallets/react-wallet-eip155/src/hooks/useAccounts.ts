import SettingsStore from '@/store/SettingsStore'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { useEffect } from 'react'

export default function useAccounts() {
  useEffect(() => {
    const { eip155Addresses } = createOrRestoreEIP155Wallet()
    SettingsStore.setEIP155Address(eip155Addresses[0])
  }, [])
}
