import React from "react";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "./ui/button";

export function ConnectWalletButton() {
  const { open } = useAppKit();

  return (
    <Button
      type="button"
      className="w-full bg-gray-700 hover:bg-gray-600 text-white"
      size="lg"
      onClick={() => open({ view: "Connect" })}
    >
      Connect Wallet
    </Button>
  );
}
