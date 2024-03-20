import SettingsStore from '@/store/SettingsStore'
import {
  biconomyAllowedChains,
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
    biconomySmartAccountEnabled,
    biconomySmartAccountAddress
  } = useSnapshot(SettingsStore.state)
  if (!namespaces) return []

  if (smartAccountEnabled) {
    if (biconomySmartAccountEnabled) {
      return supportedAddressPriority(namespaces, biconomySmartAccountAddress, biconomyAllowedChains)
    }
    if (safeSmartAccountEnabled) {
      return supportedAddressPriority(namespaces, safeSmartAccountAddress, safeAllowedChains)
    }
    if (kernelSmartAccountEnabled) {
      return supportedAddressPriority(namespaces, kernelSmartAccountAddress, kernelAllowedChains)
    }
  }
  return []
}
