import { SmartAccountLib } from "@/lib/SmartAccountLib";
import { styledToast } from "@/utils/HelperUtil";
import { useCallback, useEffect, useState } from "react";
import { TransactionExecutionError } from "viem";

export default function useSmartAccount(signerPrivateKey: `0x${string}`) {
    const [loading, setLoading] = useState(false)
    const [client, setClient] = useState<SmartAccountLib>();
    const [isDeployed, setIsDeployed] = useState(false)
    const [address, setAddress] = useState<`0x${string}`>()

    const execute = useCallback(async (callback: () => void) => {
      try {
        setLoading(true)
        await callback()
        setLoading(false)
      }
      catch (e) {
        if (e instanceof TransactionExecutionError) {
          // shorten the error message
          styledToast(e.cause.message, 'error')
        } else if (e instanceof Error) {
          styledToast(e.message, 'error')
        }
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
        const smartAccountClient = new SmartAccountLib(signerPrivateKey, 'goerli')
        setClient(smartAccountClient)
    }, [signerPrivateKey])

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