import { SmartAccountLib } from "@/lib/SmartAccountLib";
import { useCallback, useEffect, useState } from "react";

export default function useSmartAccount(signerPrivateKey: `0x${string}`) {
    const [loading, setLoading] = useState(false)
    const [client, setClient] = useState<SmartAccountLib>();
    const [isDeployed, setIsDeployed] = useState(false)
    const [address, setAddress] = useState<`0x${string}`>()

    const deploy = useCallback(async () => {
        setLoading(true)
        await client?.deploySmartAccount()
        setLoading(false)
    }, [client])

    const sendTestTransaction = useCallback(async () => {
        setLoading(true)
        await client?.sendTestTransaction()
        setLoading(false)
    }, [client])

    useEffect(() => {
        const smartAccountClient = new SmartAccountLib(signerPrivateKey, 'goerli')
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
    }
}