import PageHeader from "@/components/PageHeader";
import { walletKit } from "@/utils/WalletConnectUtil";
import { formatJsonRpcResult } from "@json-rpc-tools/utils";
import { W3mFrameProvider } from "@reown/appkit-wallet";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import ModalStore from '@/store/ModalStore'

export default function RequestPage() {
  const { walletProvider } = useAppKitProvider<W3mFrameProvider>('eip155')
  const { address, isConnected, caipAddress, status } = useAppKitAccount()

  const router = useRouter()

  useEffect(() => {
    if (!isConnected || !walletProvider || !walletKit) {
      return
    }

    (async () => {
      const pendingRequests = walletKit.getPendingSessionRequests()
      console.log('pendingRequests', pendingRequests)

      if (pendingRequests.length !== 0) {
        const { chainId: activeEthChainId } = await walletProvider.getChainId()
        const activeChainId = `eip155:${activeEthChainId}`
        
        pendingRequests.forEach(async request => {
          try {
            const requestedChainId = request.params.chainId
            if (requestedChainId !== activeChainId) {
              ModalStore.open('LoadingModal', {loadingMessage: 'Switching network...'})    
              await walletProvider.switchNetwork(requestedChainId)
              ModalStore.close()
            }

            const response = await walletProvider.request(request.params.request as any)
            console.log('response', response)
            await walletKit.respondSessionRequest({
              topic: request.topic,
              response: formatJsonRpcResult(request.id, response)
            })
          } catch (e) {
            console.error('error', e)
            const response = rejectEIP155Request(request)
            await walletKit.respondSessionRequest({
              topic: request.topic,
              response
            })
          }
        })

        const redirect = router.query.redirect as string
        if (redirect) {
          window.location.assign(redirect)
        }

      }
    })()

  }, [walletProvider, walletKit])

  
  return (
    <>
      <PageHeader title="Request" />
    </>
  )
}