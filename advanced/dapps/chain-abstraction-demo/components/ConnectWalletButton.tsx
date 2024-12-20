import React from "react";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "./ui/button";

export function ConnectWalletButton() {
  const { open } = useAppKit();

  return (
    <Button
      type="button"
      style={{background: "var(--foreground-foreground-secondary, hsla(0, 0%, 16%, 1))" }}
      className="w-full text-primary rounded-full"
      size="lg"
      onClick={() => open({ view: "Connect" })}
    >
      Connect Wallet
    </Button>
  );
}
