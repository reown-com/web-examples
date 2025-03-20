import { EIP155Chain } from '@/data/EIP155Data'
import SettingsStore from '@/store/SettingsStore'
import {
  createOrRestoreBiconomySmartAccount,
  createOrRestoreKernelSmartAccount,
  createOrRestoreSafeSmartAccount,
  smartAccountWallets
} from '@/utils/SmartAccountUtil'
import { styledToast } from '@/utils/HelperUtil'

import { useSnapshot } from 'valtio'

// Constants from SettingsStore for consistency
const ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY = 'ZERO_DEV_SMART_ACCOUNTS'
const SAFE_SMART_ACCOUNTS_ENABLED_KEY = 'SAFE_SMART_ACCOUNTS'
const BICONOMY_SMART_ACCOUNTS_ENABLED_KEY = 'BICONOMY_SMART_ACCOUNTS'
const MODULE_MANAGEMENT_ENABLED_KEY = 'MODULE_MANAGEMENT'

export default function useSmartAccounts() {
  const {
    smartAccountEnabled,
    kernelSmartAccountEnabled,
    safeSmartAccountEnabled,
    biconomySmartAccountEnabled
  } = useSnapshot(SettingsStore.state)

  const initializeSmartAccounts = async (privateKey: string) => {
    if (smartAccountEnabled) {
      try {
        const promises = [];
        
        if (kernelSmartAccountEnabled) {
          promises.push(
            (async () => {
              try {
                const address = await createOrRestoreKernelSmartAccount(privateKey);
                SettingsStore.setKernelSmartAccountAddress(address);
              } catch (error) {
                SettingsStore.state.kernelSmartAccountEnabled = false;
                localStorage.removeItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY);
                styledToast('Kernel smart account initialization failed', 'warning');
              }
            })()
          );
        }
        
        if (safeSmartAccountEnabled) {
          promises.push(
            (async () => {
              try {
                const address = await createOrRestoreSafeSmartAccount(privateKey);
                SettingsStore.setSafeSmartAccountAddress(address);
              } catch (error) {
                SettingsStore.state.safeSmartAccountEnabled = false;
                localStorage.removeItem(SAFE_SMART_ACCOUNTS_ENABLED_KEY);
                styledToast('Safe smart account initialization failed', 'warning');
              }
            })()
          );
        }
        
        if (biconomySmartAccountEnabled) {
          promises.push(
            (async () => {
              try {
                const address = await createOrRestoreBiconomySmartAccount(privateKey);
                SettingsStore.setBiconomySmartAccountAddress(address);
              } catch (error) {
                SettingsStore.state.biconomySmartAccountEnabled = false;
                localStorage.removeItem(BICONOMY_SMART_ACCOUNTS_ENABLED_KEY);
                styledToast('Biconomy smart account initialization failed', 'warning');
              }
            })()
          );
        }
        
        await Promise.all(promises);
      } catch (error) {
        console.error('Error initializing smart accounts:', error);
        styledToast('Error initializing smart accounts', 'error');
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

  const getAvailableSmartAccountsOnNamespaceChains = (chains: string[] | undefined) => {
    if (!smartAccountEnabled || chains === undefined) {
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

    const filteredAccounts = accounts.filter(account =>
      chains.some(chain => chain && parseInt(chain.split(':')[1]) === account.chain.id)
    )
    return filteredAccounts
  }

  return {
    initializeSmartAccounts,
    getAvailableSmartAccounts,
    getAvailableSmartAccountsOnNamespaceChains
  }
}
