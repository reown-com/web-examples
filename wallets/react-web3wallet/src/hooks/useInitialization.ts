import SettingsStore from '@/store/SettingsStore'
import { createOrRestoreCosmosWallet } from '@/utils/CosmosWalletUtil'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { createOrRestoreSolanaWallet } from '@/utils/SolanaWalletUtil'
import { createOrRestorePolkadotWallet } from '@/utils/PolkadotWalletUtil'
import { createOrRestoreElrondWallet } from '@/utils/ElrondWalletUtil'
import { createWeb3Wallet } from '@/utils/WalletConnectUtil'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { createOrRestoreNearWallet } from '@/utils/NearWalletUtil'

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false)
  const prevRelayerURLValue = useRef<string>('')

  const { relayerRegionURL } = useSnapshot(SettingsStore.state)

  const onInitialize = useCallback(async () => {
    try {
      const { eip155Addresses } = createOrRestoreEIP155Wallet()
      const { cosmosAddresses } = await createOrRestoreCosmosWallet()
      const { solanaAddresses } = await createOrRestoreSolanaWallet()
      const { polkadotAddresses } = await createOrRestorePolkadotWallet()
      const { nearAddresses } = await createOrRestoreNearWallet()
      const { elrondAddresses } = await createOrRestoreElrondWallet()

      SettingsStore.setEIP155Address(eip155Addresses[0])
      SettingsStore.setCosmosAddress(cosmosAddresses[0])
      SettingsStore.setSolanaAddress(solanaAddresses[0])
      SettingsStore.setPolkadotAddress(polkadotAddresses[0])
      SettingsStore.setNearAddress(nearAddresses[0])
      SettingsStore.setElrondAddress(elrondAddresses[0])
      prevRelayerURLValue.current = relayerRegionURL

      await createWeb3Wallet(relayerRegionURL)

      setInitialized(true)
    } catch (err: unknown) {
      alert(err)
    }
  }, [relayerRegionURL])

  useEffect(() => {
    if (!initialized) {
      onInitialize()
    }
    if (prevRelayerURLValue.current !== relayerRegionURL) {
      setInitialized(false)
      onInitialize()
    }
  }, [initialized, onInitialize, relayerRegionURL])

  return initialized
}
