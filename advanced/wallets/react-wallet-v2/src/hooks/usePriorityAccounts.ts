import SettingsStore from '@/store/SettingsStore';
import { SessionTypes } from '@walletconnect/types';
import { useSnapshot } from 'valtio';
import { allowedChains, kernelAddressPriority } from '@/utils/KernelSmartAccountUtils'
interface IProps {
    namespaces: SessionTypes.Namespaces
}

export default function usePriorityAccounts({namespaces}: IProps){
    const { smartAccountEnabled, kernelSmartAccountAddress, kernelSmartAccountEnabled } = useSnapshot(
        SettingsStore.state
      )

    if (smartAccountEnabled) {
        /**
         * If our kernel account supports any of the requested chainIds, put it in the first spot
         */
        if (kernelSmartAccountEnabled) {
          return kernelAddressPriority(namespaces,kernelSmartAccountAddress)
        }
    }
    return []
}