import { SmartAccountLib } from "@/lib/SmartAccountLib";
import SettingsStore from "@/store/SettingsStore";
import { Chain } from "@/utils/SmartAccountUtils";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { Hex } from "viem";
import { SmartAccount } from "permissionless/accounts";

export default function useSmartAccount(signerPrivateKey: Hex, chain: Chain) {
    const [client, setClient] = useState<SmartAccountLib>();
    const [address, setAddress] = useState<Hex>()
    const { smartAccountSponsorshipEnabled } = useSnapshot(SettingsStore.state);

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
    }
}