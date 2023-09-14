import SettingsStore from '@/store/SettingsStore'
import { createOrRestoreCosmosWallet } from '@/utils/CosmosWalletUtil'
import { createOrRestoreEIP155Wallet, eip155Wallets } from '@/utils/EIP155WalletUtil'
import { createOrRestoreSolanaWallet } from '@/utils/SolanaWalletUtil'
import { chatClient, createChatClient, createSignClient } from '@/utils/WalletConnectUtil'
import { useCallback, useEffect, useState } from 'react'

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false)

  const onInitialize = useCallback(async () => {
    try {
      const accountIndex = parseInt(
        new URLSearchParams(window.location.search).get('accountIndex') ?? '0'
      )
      const { eip155Addresses } = createOrRestoreEIP155Wallet()
      const { cosmosAddresses } = await createOrRestoreCosmosWallet()
      const { solanaAddresses } = await createOrRestoreSolanaWallet()

      SettingsStore.setAccount(accountIndex)
      SettingsStore.setEIP155Address(eip155Addresses[accountIndex])
      SettingsStore.setCosmosAddress(cosmosAddresses[accountIndex])
      SettingsStore.setSolanaAddress(solanaAddresses[accountIndex])

      await createSignClient()

      await createChatClient()
      await chatClient.register({
        account: `eip155:1:${eip155Addresses[accountIndex]}`,
        onSign: async message => {
          return eip155Wallets[eip155Addresses[accountIndex]].signMessage(message)
        }
      })
      console.log(
        '[Chat] registered address %s on keyserver',
        `eip155:1:${eip155Addresses[accountIndex]}`
      )

      setInitialized(true)
    } catch (err: unknown) {
      alert(err)
    }
  }, [])

  useEffect(() => {
    if (!initialized) {
      onInitialize()
    }
  }, [initialized, onInitialize])

  return initialized
}
