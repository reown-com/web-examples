import SettingsStore from '@/store/SettingsStore'
import {
  createOrRestoreBiconomyV3SmartAccount,
  createOrRestoreKernelSmartAccount,
  createOrRestoreSafeSmartAccount,
  smartAccountWallets
} from '@/utils/SmartAccountUtil'

import { useSnapshot } from 'valtio'

export default function useSmartAccounts() {
  const { 
    smartAccountEnabled, 
    kernelSmartAccountEnabled, 
    safeSmartAccountEnabled,
    biconomyV3SmartAccountEnabled

   } = useSnapshot(
    SettingsStore.state
  )

  const initializeSmartAccounts = async (privateKey: string) => {
    if (smartAccountEnabled) {
      if (kernelSmartAccountEnabled) {
        const { kernelSmartAccountAddress } = await createOrRestoreKernelSmartAccount(privateKey)
        SettingsStore.setKernelSmartAccountAddress(kernelSmartAccountAddress)
      }
      if (safeSmartAccountEnabled) {
        const { safeSmartAccountAddress } = await createOrRestoreSafeSmartAccount(privateKey)
        SettingsStore.setSafeSmartAccountAddress(safeSmartAccountAddress)
      }
      if (biconomyV3SmartAccountEnabled) {
        const { biconomyV3SmartAccountAddress } = await createOrRestoreBiconomyV3SmartAccount(privateKey)
        SettingsStore.setBiconomyV3SmartAccountAddress(biconomyV3SmartAccountAddress)
      }
    }
  }

  const getAvailableSmartAccounts = () => {
    if (!smartAccountEnabled) {
      return []
    }
    const accounts = []
    for (const [key, lib] of Object.entries(smartAccountWallets)) {
      accounts.push({
        address: key.split(':')[1],
        type: lib.type,
        chain: lib.chain
      })
    }

    return accounts
  }

  return {
    initializeSmartAccounts,
    getAvailableSmartAccounts
  }
}
