import React from "react";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "./ui/button";

export function ConnectWalletButton() {
  const { open } = useAppKit();

  return (
    <Button
      type="button"
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded transition-colors"
      size="lg"
      onClick={() => open({ view: "Connect" })}
    >
      Connect Wallet
    </Button>
  );
}
