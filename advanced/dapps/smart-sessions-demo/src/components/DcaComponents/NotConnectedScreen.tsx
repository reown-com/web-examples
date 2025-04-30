import React from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";

export default function NotConnectedScreen() {
  const { open } = useAppKit();
  const { status } = useAppKitAccount();
  const isWalletConnecting =
    status === "connecting" || status === "reconnecting";
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          Dollar Cost Average
        </h1>

        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
            Please connect your wallet in order to create a DCA strategy.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            When connecting, be sure to use Email Wallet with:
          </p>
          <p className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
            youremail
            <span className="text-blue-500 dark:text-blue-400">
              +smart-sessions
            </span>
            @domain.com
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Example: john
            <span className="text-blue-500 dark:text-blue-400">
              +smart-sessions
            </span>
            @doe.com
          </p>
        </div>
        {hasMounted && !isWalletConnecting ? (
          <Button
            onClick={() => open({ view: "Connect" })}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Connect Wallet
          </Button>
        ) : (
          <Button className="bg-blue-500 hover:bg-blue-600 text-white" disabled>
            Connecting...
          </Button>
        )}
      </div>
    </main>
  );
}
