// import { cookieStorage, createStorage, http } from '@wagmi/core'
import { ConnectButton } from "@/components/ConnectButton";
import { InfoList } from "@/components/InfoList";
import { ActionButtonList } from "@/components/ActionButtonList";
export default function Home() {

  return (
    <div className={"pages"}>
      <h1>AppKit Wagmi Next.js App Router Example</h1>

      <div >
        <ConnectButton />
      </div>
      <div >
        <ActionButtonList />
      </div>
      <InfoList />
    </div>
  );
}