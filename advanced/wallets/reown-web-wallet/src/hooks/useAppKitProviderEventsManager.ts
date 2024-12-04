import { W3mFrameProvider } from "@reown/appkit-wallet"
import { Provider, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

import { useCallback, useEffect } from "react"
import { walletKit } from '@/utils/WalletConnectUtil'
import ModalStore from "@/store/ModalStore"

export default function useAppKitProviderEventsManager() {
    const { walletProvider } = useAppKitProvider<W3mFrameProvider>('eip155')
    const { address, isConnected, caipAddress, status } = useAppKitAccount()

    const onConnect = useCallback(async () => {
        console.log('onConnect')


        
        await new Promise(resolve => setTimeout(resolve, 1000))

        let pendingSessionProposals = Object.values(await walletKit.getPendingSessionProposals())
        let pendingSessionRequests = await walletKit.getPendingSessionRequests()

        console.log('pendingSessionProposals', pendingSessionProposals)
        console.log('pendingSessionRequests', pendingSessionRequests)

        // get pending session proposals from local storage
        const pendingSessionProposal = localStorage.getItem('pendingSessionProposal')
        console.log('pendingSessionProposal', pendingSessionProposal)



        if (pendingSessionProposal) {
            const proposal = JSON.parse(pendingSessionProposal)

            console.log('opening session proposal modal', proposal)
            ModalStore.open('SessionProposalModal', { proposal })
        } else {
            const latestProposal = pendingSessionProposals[pendingSessionProposals.length - 1]
                        ModalStore.open('SessionProposalModal', { 
                proposal: {
                    id: latestProposal.id,
                    params: latestProposal,
                    verifyContext: {
                        verified: {
                            isScam: false,
                            origin: '',
                            validation: 'VALID',
                            verifyUrl: ''
                        }
                    }
                }
            }) 
        }


        // await new Promise(resolve => setTimeout(resolve, 5000))

        // pendingSessionProposals = Object.values(await walletKit.getPendingSessionProposals())
        // pendingSessionRequests = await walletKit.getPendingSessionRequests()

        // console.log('pendingSessionProposals 2', pendingSessionProposals)
        // console.log('pendingSessionRequests 2', pendingSessionRequests)

        // if (pendingSessionProposals.length > 0) {
        //     const latestProposal = pendingSessionProposals[pendingSessionProposals.length - 1]
        //     console.log('latestProposal', latestProposal)

        //     // this is a hack to get the proposal to the modal
        //     // walletkit doesn't include the verifyContext in the pendinng proposal object
        //     // a better workaround is to manually store verifyContext in the local storage when session_proposal event is received
        //     ModalStore.open('SessionProposalModal', { 
        //         proposal: {
        //             id: latestProposal.id,
        //             params: latestProposal,
        //             verifyContext: {
        //                 verified: {
        //                     isScam: false,
        //                     origin: '',
        //                     validation: 'VALID',
        //                     verifyUrl: ''
        //                 }
        //             }
        //         }
        //     }) 
        // } else if (pendingSessionRequests.length > 0) {
        //     const latestRequest = pendingSessionRequests[pendingSessionRequests.length - 1]

        //     try {
        //         console.log('resolving request', latestRequest)
        //         const response = await walletProvider.request(latestRequest as any)
        //     } catch (e) {
        //         console.error('error', e)
        //     }
        // }
        
    }, [walletProvider])


    useEffect(() => {
        console.log('appkit hook', isConnected, walletProvider)
        if (!isConnected || !walletProvider) {
            return        
        }

        if (isConnected) {
            onConnect()
        }

        walletProvider.onConnect(onConnect)

    }, [isConnected, walletProvider])
}   