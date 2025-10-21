import SettingsStore from '@/store/SettingsStore'
import { createOrRestoreCosmosWallet } from '@/utils/CosmosWalletUtil'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { createOrRestoreSolanaWallet } from '@/utils/SolanaWalletUtil'
import { createOrRestorePolkadotWallet } from '@/utils/PolkadotWalletUtil'
import { createOrRestoreNearWallet } from '@/utils/NearWalletUtil'
import { createOrRestoreMultiversxWallet } from '@/utils/MultiversxWalletUtil'
import { createOrRestoreTronWallet } from '@/utils/TronWalletUtil'
import { createOrRestoreTezosWallet } from '@/utils/TezosWalletUtil'
import { createWalletKit, walletkit } from '@/utils/WalletConnectUtil'
import { createOrRestoreKadenaWallet } from '@/utils/KadenaWalletUtil'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import useSmartAccounts from './useSmartAccounts'
import { createOrRestoreBip122Wallet } from '@/utils/Bip122WalletUtil'
import { createOrRestoreSuiWallet } from '@/utils/SuiWalletUtil'
import { createOrRestoreStacksWallet } from '@/utils/StacksWalletUtil'
import { createOrRestoreTonWallet } from '@/utils/TonWalletUtil'

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false)
  const [initializationError, setInitializationError] = useState<string | null>(null)
  const prevRelayerURLValue = useRef<string>('')
  const initializationAttempted = useRef(false)

  const { relayerRegionURL } = useSnapshot(SettingsStore.state)
  const { initializeSmartAccounts } = useSmartAccounts()

  const onInitialize = useCallback(async () => {
    // Guard against multiple initialization attempts
    if (initializationAttempted.current) {
      console.log('Initialization already attempted, skipping...')
      return
    }

    initializationAttempted.current = true
    setInitializationError(null)

    try {
      console.log('Starting wallet initialization...')

      // Initialize EIP155 wallet first (required)
      const { eip155Addresses, eip155Wallets } = createOrRestoreEIP155Wallet()
      if (!eip155Addresses || !eip155Addresses[0]) {
        throw new Error('Failed to create EIP155 wallet')
      }

      console.log('EIP155 wallet created:', eip155Addresses[0])
      SettingsStore.setEIP155Address(eip155Addresses[0])

      // Initialize smart accounts if enabled (with error handling)
      try {
        await initializeSmartAccounts(eip155Wallets[eip155Addresses[0]].getPrivateKey())
        console.log('Smart accounts initialized')
      } catch (smartAccountError) {
        console.warn('Smart account initialization failed (non-critical):', smartAccountError)
        // Don't fail the entire initialization if smart accounts fail
      }

      // Initialize other chain wallets in background with error handling
      ;(async () => {
        try {
          await Promise.allSettled([
            createOrRestoreCosmosWallet().then(({ cosmosAddresses }) => {
              SettingsStore.setCosmosAddress(cosmosAddresses[0])
            }),
            createOrRestoreSolanaWallet().then(({ solanaAddresses }) => {
              SettingsStore.setSolanaAddress(solanaAddresses[0])
            }),
            createOrRestorePolkadotWallet().then(({ polkadotAddresses }) => {
              SettingsStore.setPolkadotAddress(polkadotAddresses[0])
            }),
            createOrRestoreNearWallet().then(({ nearAddresses }) => {
              SettingsStore.setNearAddress(nearAddresses[0])
            }),
            createOrRestoreMultiversxWallet().then(({ multiversxAddresses }) => {
              SettingsStore.setMultiversxAddress(multiversxAddresses[0])
            }),
            createOrRestoreTronWallet().then(({ tronAddresses }) => {
              SettingsStore.setTronAddress(tronAddresses[0])
            }),
            createOrRestoreTezosWallet().then(({ tezosAddresses }) => {
              SettingsStore.setTezosAddress(tezosAddresses[0])
            }),
            createOrRestoreKadenaWallet().then(({ kadenaAddresses }) => {
              SettingsStore.setKadenaAddress(kadenaAddresses[0])
            }),
            createOrRestoreBip122Wallet().then(({ bip122Addresses }) => {
              SettingsStore.setbip122Address(bip122Addresses[0])
            }),
            createOrRestoreSuiWallet().then(({ suiAddresses }) => {
              SettingsStore.setSuiAddress(suiAddresses[0])
            }),
            createOrRestoreStacksWallet().then(({ stacksAddresses }) => {
              SettingsStore.setStacksAddress('mainnet', stacksAddresses[0])
            }),
            createOrRestoreTonWallet().then(({ tonAddresses }) => {
              SettingsStore.setTonAddress(tonAddresses[0])
            })
          ])
          console.log('All chain wallets initialized')
        } catch (walletError) {
          console.error('Error initializing some chain wallets:', walletError)
          // Non-critical - wallet can still function with EIP155
        }
      })()

      // Create WalletConnect client (critical)
      console.log('Creating WalletConnect client...')
      await createWalletKit(relayerRegionURL)
      console.log('WalletConnect client created successfully')

      setInitialized(true)
      console.log('Wallet initialization complete')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Initialization failed:', errorMessage)
      setInitializationError(errorMessage)

      // Show user-friendly error message
      alert(
        `Failed to initialize wallet:\n\n${errorMessage}\n\n` +
          'Please check:\n' +
          '1. You have created a .env.local file\n' +
          '2. NEXT_PUBLIC_PROJECT_ID is set in .env.local\n' +
          '3. Your internet connection is working'
      )

      // Allow retry by resetting the flag after a delay
      setTimeout(() => {
        initializationAttempted.current = false
      }, 3000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayerRegionURL])

  // restart transport if relayer region changes
  const onRelayerRegionChange = useCallback(() => {
    try {
      walletkit?.core?.relayer.restartTransport(relayerRegionURL)
      prevRelayerURLValue.current = relayerRegionURL
    } catch (err: unknown) {
      console.error('Failed to restart transport:', err)
      alert(`Failed to change relay region: ${err}`)
    }
  }, [relayerRegionURL])

  useEffect(() => {
    if (!initialized && !initializationError) {
      onInitialize()
    }
    if (prevRelayerURLValue.current !== relayerRegionURL && initialized) {
      onRelayerRegionChange()
    }
  }, [initialized, initializationError, onInitialize, relayerRegionURL, onRelayerRegionChange])

  return initialized
}
