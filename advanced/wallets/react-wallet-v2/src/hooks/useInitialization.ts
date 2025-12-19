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

const CHAIN_STORAGE_KEYS: Record<string, string[]> = {
  EIP155: ['EIP155_MNEMONIC_1', 'EIP155_MNEMONIC_2'],
  Cosmos: ['COSMOS_MNEMONIC_1', 'COSMOS_MNEMONIC_2'],
  Solana: ['SOLANA_SECRET_KEY_1', 'SOLANA_SECRET_KEY_2'],
  Polkadot: ['POLKADOT_MNEMONIC_1', 'POLKADOT_MNEMONIC_2'],
  Near: ['NEAR_SEED_PHRASE'],
  MultiversX: ['MULTIVERSX_MNEMONIC_1', 'MULTIVERSX_MNEMONIC_2'],
  Tron: ['TRON_PrivateKey_1', 'TRON_PrivateKey_2'],
  Tezos: ['TEZOS_MNEMONIC_1', 'TEZOS_MNEMONIC_2'],
  Kadena: ['KADENA_SECRET_KEY'],
  Bip122: ['BITCOIN_PRIVATE_KEY_1'],
  Sui: ['SUI_MNEMONIC_1'],
  Stacks: ['STACKS_MNEMONIC_1'],
  Ton: ['TON_SECRET_KEY_1', 'TON_SECRET_KEY_2']
}

function clearChainStorageKeys(chainName: string): void {
  const keys = CHAIN_STORAGE_KEYS[chainName]
  if (keys) {
    keys.forEach(key => localStorage.removeItem(key))
  }
}

function handleChainInitError(chainName: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`${chainName} wallet initialization failed:`, errorMessage)

  alert(
    `${chainName} wallet failed to initialize due to an invalid key.\n\n` +
      `The invalid key will be removed and the page will reload to create a fresh wallet.`
  )

  clearChainStorageKeys(chainName)
  window.location.reload()
}

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
      let eip155Addresses: string[]
      let eip155Wallets: ReturnType<typeof createOrRestoreEIP155Wallet>['eip155Wallets']
      try {
        const result = createOrRestoreEIP155Wallet()
        eip155Addresses = result.eip155Addresses
        eip155Wallets = result.eip155Wallets
        if (!eip155Addresses || !eip155Addresses[0]) {
          throw new Error('Failed to create EIP155 wallet')
        }
      } catch (eip155Error) {
        handleChainInitError('EIP155', eip155Error)
        return
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
        const chainInitializers: { name: string; init: () => Promise<void> }[] = [
          {
            name: 'Cosmos',
            init: async () => {
              const { cosmosAddresses } = await createOrRestoreCosmosWallet()
              SettingsStore.setCosmosAddress(cosmosAddresses[0])
            }
          },
          {
            name: 'Solana',
            init: async () => {
              const { solanaAddresses } = await createOrRestoreSolanaWallet()
              SettingsStore.setSolanaAddress(solanaAddresses[0])
            }
          },
          {
            name: 'Polkadot',
            init: async () => {
              const { polkadotAddresses } = await createOrRestorePolkadotWallet()
              SettingsStore.setPolkadotAddress(polkadotAddresses[0])
            }
          },
          {
            name: 'Near',
            init: async () => {
              const { nearAddresses } = await createOrRestoreNearWallet()
              SettingsStore.setNearAddress(nearAddresses[0])
            }
          },
          {
            name: 'MultiversX',
            init: async () => {
              const { multiversxAddresses } = await createOrRestoreMultiversxWallet()
              SettingsStore.setMultiversxAddress(multiversxAddresses[0])
            }
          },
          {
            name: 'Tron',
            init: async () => {
              const { tronAddresses } = await createOrRestoreTronWallet()
              SettingsStore.setTronAddress(tronAddresses[0])
            }
          },
          {
            name: 'Tezos',
            init: async () => {
              const { tezosAddresses } = await createOrRestoreTezosWallet()
              SettingsStore.setTezosAddress(tezosAddresses[0])
            }
          },
          {
            name: 'Kadena',
            init: async () => {
              const { kadenaAddresses } = await createOrRestoreKadenaWallet()
              SettingsStore.setKadenaAddress(kadenaAddresses[0])
            }
          },
          {
            name: 'Bip122',
            init: async () => {
              const { bip122Addresses } = await createOrRestoreBip122Wallet()
              SettingsStore.setbip122Address(bip122Addresses[0])
            }
          },
          {
            name: 'Sui',
            init: async () => {
              const { suiAddresses } = await createOrRestoreSuiWallet()
              SettingsStore.setSuiAddress(suiAddresses[0])
            }
          },
          {
            name: 'Stacks',
            init: async () => {
              const { stacksAddresses } = await createOrRestoreStacksWallet()
              SettingsStore.setStacksAddress('mainnet', stacksAddresses[0])
            }
          },
          {
            name: 'Ton',
            init: async () => {
              const { tonAddresses } = await createOrRestoreTonWallet()
              SettingsStore.setTonAddress(tonAddresses[0])
            }
          }
        ]

        const results = await Promise.allSettled(
          chainInitializers.map(async ({ name, init }) => {
            try {
              await init()
              console.log(`${name} wallet initialized`)
            } catch (error) {
              console.error(`${name} wallet initialization failed:`, error)
              throw { chainName: name, error }
            }
          })
        )

        const failedChains = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => result.reason as { chainName: string; error: unknown })

        if (failedChains.length > 0) {
          const chainNames = failedChains.map(f => f.chainName).join(', ')
          alert(
            `The following chain wallets failed to initialize due to invalid keys: ${chainNames}\n\n` +
              `The invalid keys will be removed and the page will reload to create fresh wallets.`
          )

          failedChains.forEach(({ chainName }) => {
            clearChainStorageKeys(chainName)
          })

          window.location.reload()
          return
        }

        console.log('All chain wallets initialized')
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
