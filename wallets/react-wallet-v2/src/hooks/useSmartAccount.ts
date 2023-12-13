import { SmartAccountLib } from "@/lib/SmartAccountLib";
import { useCallback, useEffect, useState } from "react";

export default function useSmartAccount(signerPrivateKey: `0x${string}`) {
    const [loading, setLoading] = useState(false)
    const [client, setClient] = useState<SmartAccountLib>();

    const deploy = useCallback(async () => {
        setLoading(true)
        await client?.deploySmartAccount()
        setLoading(false)
    }, [client])

    useEffect(() => {
        const client = new SmartAccountLib(signerPrivateKey, 'goerli')
        setClient(client)
    }, [signerPrivateKey])


    return {
        client,
        isDeployed: client?.isDeployed,
        deploy,
        loading,
    }
}