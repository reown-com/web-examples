import React from "react";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { Button } from "./ui/button";

export function ConnectWalletButton() {
  const { open } = useWeb3Modal();

  return (
    <Button
      className="w-full bg-blue-500 hover:bg-blue-700"
      size="lg"
      onClick={() => open({ view: "Connect" })}
    >
      Connect Wallet
    </Button>
  );
}
