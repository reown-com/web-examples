import { SmartAccountLib } from "@/lib/SmartAccountLib";
import SettingsStore from "@/store/SettingsStore";
import { useCallback, useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { Hex } from "viem";

export default function useSmartAccount(signerPrivateKey?: Hex) {
    const [loading, setLoading] = useState(false)
    const [client, setClient] = useState<SmartAccountLib>();
    const [isDeployed, setIsDeployed] = useState(false)
    const [address, setAddress] = useState<Hex>()
    const { smartAccountSponsorshipEnabled } = useSnapshot(SettingsStore.state);

    const execute = useCallback(async (callback: () => void) => {
      try {
        setLoading(true)
        await callback()
        setLoading(false)
      }
      catch (e) {
        console.error(e)
        setLoading(false)
      }  
    }, [setLoading])

    const deploy = useCallback(async () => {
      if (!client) return
      execute(client?.deploySmartAccount)
    }, [client, execute])

    const sendTestTransaction = useCallback(async () => {
      if (!client) return
      execute(client?.sendTestTransaction)
    }, [client, execute])

    useEffect(() => {
      if (!signerPrivateKey) return
      const smartAccountClient = new SmartAccountLib({
        privateKey: signerPrivateKey,
        chain: 'goerli',
        sponsored: smartAccountSponsorshipEnabled,
      })
      setClient(smartAccountClient)
    }, [signerPrivateKey, smartAccountSponsorshipEnabled])

    useEffect(() => {
        client?.checkIfSmartAccountDeployed()
            .then((deployed: boolean) => {
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