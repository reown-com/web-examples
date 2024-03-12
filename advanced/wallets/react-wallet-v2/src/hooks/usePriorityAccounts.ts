import SettingsStore from '@/store/SettingsStore';
import { SessionTypes } from '@walletconnect/types';
import { useSnapshot } from 'valtio';
import { allowedChains } from '@/utils/KernelSmartAccountUtils'
interface IProps {
    namespaces: SessionTypes.Namespaces
}

export default function usePriorityAccounts({namespaces}: IProps){
    const { smartAccountEnabled, kernelSmartAccountAddress, kernelSmartAccountEnabled } = useSnapshot(
        SettingsStore.state
      )
    const namespaceKeys = Object.keys(namespaces)
    const [nameSpaceKey] = namespaceKeys
     // get chain ids from namespaces
    const [chainIds] = namespaceKeys.map(key => namespaces[key].chains)

    if (smartAccountEnabled && chainIds) {
        /**
         * If our kernel account supports any of the requested chainIds, put it in the first spot
         */
        if (kernelSmartAccountEnabled) {
          const allowedChainIds = chainIds.filter(id => {
            const chainId = id.replace(`${nameSpaceKey}:`, '')
            return allowedChains.map(chain => chain.id.toString()).includes(chainId)
          })
          const chainIdParsed = allowedChainIds[0].replace(`${nameSpaceKey}:`, '')
          const chain = allowedChains.find(chain => chain.id.toString() === chainIdParsed)!
          if (allowedChainIds.length > 0 && kernelSmartAccountAddress) {
            const allowedAccounts = allowedChainIds.map(id => {
              // check if id is a part of any of these array elements namespaces.eip155.accounts
              const accountIsAllowed = namespaces.eip155.accounts.findIndex(account =>
                account.includes(id)
              )
              return namespaces.eip155.accounts[accountIsAllowed]
            })
            return [
              `${nameSpaceKey}:${chain.id}:${kernelSmartAccountAddress}`,
              ...allowedAccounts
            ]
          }
        }
    }
    return []
}