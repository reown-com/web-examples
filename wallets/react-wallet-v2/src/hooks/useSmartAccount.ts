import { checkIfSmartAccountDeployed, deploySmartAccount, getSmartAccountClient } from "@/lib/SmartAccountLib";
import { SmartAccountClient } from "permissionless";
import { useCallback, useEffect, useState } from "react";

export default function useSmartAccount(signerPrivateKey: `0x${string}`) {
    const [loading, setLoading] = useState(false)
    const [client, setClient] = useState<SmartAccountClient>();
    const [isDeployed, setIsDeployed] = useState(false);


    const updateIsDeployed = useCallback(async () => {
        if (client?.account?.address) {
            const deployed = await checkIfSmartAccountDeployed(client.account.address, 'goerli');
            setIsDeployed(deployed);
        }
    }, [client])

    const deploy = useCallback(async () => {
        setLoading(true)
        await deploySmartAccount(signerPrivateKey, 'goerli')
        setLoading(false)
    }, [signerPrivateKey])


    const initialize = useCallback(async () => {
        setLoading(true)
        const client = await getSmartAccountClient(signerPrivateKey, 'goerli');
        setClient(client);

        const deployed = await checkIfSmartAccountDeployed(client.account.address, 'goerli');
        setIsDeployed(deployed);
        setLoading(false)
    }, [signerPrivateKey]);

    useEffect(() => {
        updateIsDeployed()
    }, [updateIsDeployed])

    useEffect(() => {
        initialize()
    }, [initialize])


    return {
        client,
        isDeployed,
        deploy,
        loading,
    }
}