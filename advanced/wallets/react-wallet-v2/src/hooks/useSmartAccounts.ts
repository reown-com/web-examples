import SettingsStore from '@/store/SettingsStore'
import {
  createOrRestoreBiconomySmartAccount,
  createOrRestoreKernelSmartAccount,
  createOrRestoreSafeSmartAccount,
  smartAccountWallets
} from '@/utils/SmartAccountUtil'

import { useSnapshot } from 'valtio'
import { foundry, sepolia } from 'viem/chains'

export default function useSmartAccounts() {
  const {
    smartAccountEnabled,
    kernelSmartAccountEnabled,
    safeSmartAccountEnabled,
    biconomySmartAccountEnabled,
    localAAInfraEnabled
  } = useSnapshot(SettingsStore.state)

  const initializeSmartAccounts = async (privateKey: string) => {
    const chain = localAAInfraEnabled ? foundry : sepolia
    if (smartAccountEnabled) {
      if (kernelSmartAccountEnabled) {
        const { kernelSmartAccountAddress } = await createOrRestoreKernelSmartAccount(
          privateKey,
          chain
        )
        SettingsStore.setKernelSmartAccountAddress(kernelSmartAccountAddress)
      }
      if (safeSmartAccountEnabled) {
        const { safeSmartAccountAddress } = await createOrRestoreSafeSmartAccount(privateKey, chain)
        SettingsStore.setSafeSmartAccountAddress(safeSmartAccountAddress)
      }
      if (biconomySmartAccountEnabled) {
        const { biconomySmartAccountAddress } = await createOrRestoreBiconomySmartAccount(
          privateKey,
          chain
        )
        SettingsStore.setBiconomySmartAccountAddress(biconomySmartAccountAddress)
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
