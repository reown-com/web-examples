import { SmartAccountLib } from "@/lib/SmartAccountLib";
import SettingsStore from "@/store/SettingsStore";
import { Chain, VITALIK_ADDRESS } from "@/utils/SmartAccountUtils";
import { useCallback, useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { Hex } from "viem";
import { styledToast } from "@/utils/HelperUtil";
import { TransactionExecutionError } from "viem";
import { SmartAccount } from "permissionless/accounts";

export default function useSmartAccount(signerPrivateKey: Hex, chain: Chain) {
    const [loading, setLoading] = useState(false)
    const [client, setClient] = useState<SmartAccountLib>();
    const [isDeployed, setIsDeployed] = useState(false)
    const [address, setAddress] = useState<Hex>()
    const { smartAccountSponsorshipEnabled } = useSnapshot(SettingsStore.state);

    const execute = useCallback(async (callback: () => void) => {
      try {
        setLoading(true)
        const res = await callback()
        console.log('result:', res)
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

    const sendTestTransaction = useCallback(async () => {
      if (!client) return
      execute(() => client?.sendTransaction({
        to: VITALIK_ADDRESS,
        value: 0n,
        data: '0x',
      }))
    }, [client, execute])

    const deploy = useCallback(async () => {
      if (!client) return
      execute(client?.deploySmartAccount)
    }, [client, execute])

    useEffect(() => {
      if (!signerPrivateKey || !chain) return
      const smartAccountClient = new SmartAccountLib({
        chain,
        privateKey: signerPrivateKey,
        sponsored: smartAccountSponsorshipEnabled,
      })
      setClient(smartAccountClient)
    }, [signerPrivateKey, smartAccountSponsorshipEnabled, chain])

    useEffect(() => {
        client?.getAccount()
            .then((account: SmartAccount) => {
                setAddress(account.address)
            })
    }, [client, chain])

    return {
        address,
        isDeployed,
        loading,
        sendTestTransaction,
        deploy
    }
}