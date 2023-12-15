import { SmartAccountLib } from "@/lib/SmartAccountLib";
import { useCallback, useEffect, useState } from "react";

export default function useSmartAccount(signerPrivateKey: `0x${string}`) {
    const [loading, setLoading] = useState(false)
    const [client, setClient] = useState<SmartAccountLib>();
    const [isDeployed, setIsDeployed] = useState(false)
    const [address, setAddress] = useState<`0x${string}`>()

    const execute = useCallback(async (callback?: () => Promise<void>) => {
        try {
        setLoading(true)
        await callback?.()
        } catch (e) {
        console.error(e)
        } finally {
        setLoading(false)
        }
    }, [])

    const deploy = () => execute(client?.deploySmartAccount)

    const sendTestTransaction = () => execute(client?.sendTestTransaction)

    const sendSponsoredTransaction = () => execute(client?.sendUSDCSponsoredTransaction)
    
    useEffect(() => {
        const smartAccountClient = new SmartAccountLib({ privateKey: signerPrivateKey, chain: 'goerli', sponsored: true })
        setClient(smartAccountClient)
    }, [signerPrivateKey])

    useEffect(() => {
        client?.checkIfSmartAccountDeployed()
            .then((deployed) => {
                setIsDeployed(deployed)
                setAddress(client?.address)
            })
    }, [client])


    return {
        address,
        isDeployed,
        deploy,
        loading,
        sendTestTransaction,
        sendSponsoredTransaction
    }
}