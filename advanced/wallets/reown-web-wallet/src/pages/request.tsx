import { W3mFrameProvider } from "@reown/appkit-wallet";
import { useAppKitProvider } from "@reown/appkit/react";
import { useRouter } from "next/router";

export default function RequestPage() {
    const { walletProvider } = useAppKitProvider<W3mFrameProvider>('eip155')
    const {query} = useRouter()

    return <div>RequestPage</div>
}