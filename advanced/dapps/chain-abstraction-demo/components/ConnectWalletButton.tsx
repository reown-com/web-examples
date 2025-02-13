import React from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Button } from "./ui/button";

export function ConnectWalletButton() {
  const { open } = useAppKit();
  const { status } = useAppKitAccount();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        style={{
          background:
            "var(--foreground-foreground-secondary, hsla(0, 0%, 16%, 1))",
        }}
        className="w-full text-primary rounded-full"
        size="lg"
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <Button
      type="button"
      style={{
        background:
          "var(--foreground-foreground-secondary, hsla(0, 0%, 16%, 1))",
      }}
      className="w-full text-primary rounded-full"
      size="lg"
      onClick={() => open({ view: "Connect" })}
      disabled={status === "connecting" || status === "reconnecting"}
    >
      {status === "connecting" || status === "reconnecting"
        ? "Connecting..."
        : "Connect Wallet"}
    </Button>
  );
}
