import React from "react";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "./ui/button";

export function ConnectWalletButton() {
  const { open } = useAppKit();

  return (
    <Button
      type="button"
      className="w-full bg-blue-500 hover:bg-blue-700"
      size="lg"
      onClick={() => open({ view: "Connect" })}
    >
      Connect Wallet
    </Button>
  );
}
