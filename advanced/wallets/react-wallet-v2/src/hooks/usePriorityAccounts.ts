import SettingsStore from '@/store/SettingsStore'
import {
  kernelAllowedChains,
  safeAllowedChains,
  supportedAddressPriority
} from '@/utils/SmartAccountUtil'
import { SessionTypes } from '@walletconnect/types'
import { useSnapshot } from 'valtio'

interface IProps {
  namespaces?: SessionTypes.Namespaces
}

export default function usePriorityAccounts({ namespaces }: IProps) {
  const {
    smartAccountEnabled,
    kernelSmartAccountAddress,
    kernelSmartAccountEnabled,
    safeSmartAccountAddress,
    safeSmartAccountEnabled,
    biconomySmartAccountEnabled
  } = useSnapshot(SettingsStore.state)
  if (!namespaces) return []

  if (smartAccountEnabled) {
    if (safeSmartAccountEnabled) {
      return supportedAddressPriority(namespaces, safeSmartAccountAddress, safeAllowedChains)
    }
    if (kernelSmartAccountEnabled) {
      return supportedAddressPriority(namespaces, kernelSmartAccountAddress, kernelAllowedChains)
    }
    if (biconomySmartAccountEnabled) {
      return supportedAddressPriority(namespaces, kernelSmartAccountAddress, kernelAllowedChains)
    }
  }
  return []
}
