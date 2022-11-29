import SettingsStore from '@/store/SettingsStore'
import { createOrRestoreCosmosWallet } from '@/utils/CosmosWalletUtil'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { createOrRestoreSolanaWallet } from '@/utils/SolanaWalletUtil'
import { chatClient, createChatClient, createSignClient } from '@/utils/WalletConnectUtil'
import { useCallback, useEffect, useState } from 'react'

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false)

  const onInitialize = useCallback(async () => {
    try {
      const accountId = parseInt(
        new URLSearchParams(window.location.search).get('accountId') ?? '0'
      )
      const { eip155Addresses } = createOrRestoreEIP155Wallet()
      const { cosmosAddresses } = await createOrRestoreCosmosWallet()
      const { solanaAddresses } = await createOrRestoreSolanaWallet()

      SettingsStore.setAccount(accountId)
      SettingsStore.setEIP155Address(eip155Addresses[accountId])
      SettingsStore.setCosmosAddress(cosmosAddresses[accountId])
      SettingsStore.setSolanaAddress(solanaAddresses[accountId])

      await createSignClient()

      await createChatClient()
      await chatClient.register({ account: `eip155:1:${eip155Addresses[accountId]}` })
      console.log(
        '[Chat] registered address %s on keyserver',
        `eip155:1:${eip155Addresses[accountId]}`
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
