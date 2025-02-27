import { W3mFrameProvider } from "@reown/appkit-wallet"
import { Provider, useAppKit, useAppKitAccount, useAppKitProvider, useAppKitState } from '@reown/appkit/react'

import { useCallback, useEffect } from "react"
import { walletKit } from '@/utils/WalletConnectUtil'
import ModalStore from "@/store/ModalStore"
import { useRouter } from "next/router"

export default function useAppKitProviderEventsManager() {
  const router = useRouter()
  const { open } = useAppKitState()
  const { walletProvider } = useAppKitProvider<W3mFrameProvider>('eip155')
  const { address, isConnected, caipAddress, status } = useAppKitAccount()
  const appkit= useAppKit()

  useEffect(() => {
      if (open) {
          console.log('closing modal because open is true')
          ModalStore.close()
      }
    }, [open])


  const onConnect = useCallback(async () => {
      console.log('onConnect')

      const uri = router.query.uri as string

      if (uri) {
          console.log('pairing with uri', uri)
          try {
              await walletKit.pair({ uri })
          } catch (error) {
              console.error('pairing error', error)
          }
      }
  }, [walletKit])

  const handleSetPreferredAccount = async (account: any) => {
    console.log('onSetPreferredAccount', account.address)

    const {chainId} = await walletProvider.getChainId();

    const caip10Address = `eip155:${chainId}:${account.address}`

    const sessions = Object.values(walletKit.getActiveSessions())
    console.log('sessions', sessions)

    sessions.forEach(async session => {
      const currentAccounts = session.namespaces.eip155.accounts;
      const updatedAccounts = [
        caip10Address,
        ...currentAccounts.filter(acc => acc !== caip10Address)
      ];

      console.log('accounts', currentAccounts, updatedAccounts)
      
      await walletKit.updateSession({
        topic: session.topic,
        namespaces: {
          ...session.namespaces,
          eip155: { 
            ...session.namespaces.eip155,
            accounts: updatedAccounts
          }
        }
      })
    })
  }


  useEffect(() => {
      if (status === 'reconnecting' || status === 'connecting' || status === undefined) {
          ModalStore.open('AppKitConnectionModal', undefined)
          return
      }
          
      if (status === 'disconnected') {
        appkit.open()
        return
      }

      if (walletProvider) {
          ModalStore.close()
          appkit.close()

          onConnect()
          // walletProvider.onConnect(onConnect)

          walletProvider.onSetPreferredAccount(handleSetPreferredAccount)
      }

  }, [isConnected, walletProvider, status])
}   