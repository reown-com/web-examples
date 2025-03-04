"use client";
import React, { useEffect, useState } from "react";
import DCAForm from "@/components/DcaComponents/DCAForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Dashboard from "@/components/DcaComponents/Dashboard";
import { useAppKitAccount } from "@reown/appkit/react";
import { isSmartSessionSupported } from "@reown/appkit-experimental/smart-session";
import { useDcaApplicationContext } from "@/context/DcaApplicationContextProvider";
import NotConnectedScreen from "./NotConnectedScreen";
import { useBalance } from "wagmi";
import { parseUnits } from "viem";

export default function DCA() {
  // Account and session state
  const { status, address, embeddedWalletInfo } = useAppKitAccount();
  const { smartSession } = useDcaApplicationContext();
  const grantedPermissions = smartSession?.grantedPermissions;
  const { accountType, user } = embeddedWalletInfo ?? {};

  // Derived state checks
  const isWalletConnected = status === "connected" || address !== undefined;
  const isSmartAccount = accountType === "smartAccount";
  const isEmailAllowed = Boolean(user?.email?.includes("+smart-sessions@"));
  const isPermissionExpired = grantedPermissions?.expiry
    ? grantedPermissions.expiry < Date.now() / 1000
    : true;
  const hasValidPermissions = grantedPermissions && !isPermissionExpired;

  // Feature support check
  const isSupported =
    hasValidPermissions ||
    (isSmartSessionSupported() &&
      isWalletConnected &&
      isSmartAccount &&
      isEmailAllowed);

  // Use effective address from either wallet or permissions
  const effectiveAddress =
    address ||
    (hasValidPermissions
      ? (grantedPermissions.address as `0x${string}`)
      : undefined);

  // Balance check
  const balance = useBalance({
    address: effectiveAddress as `0x${string}`,
  });
  const hasInsufficientEth =
    !balance.data || balance.data.value < parseUnits("0.0005", 18);

  // Client-side rendering guard
  const [readyToRender, setReadyToRender] = useState(false);
  useEffect(() => {
    setReadyToRender(true);
  }, []);

  // Generate status messages as an array
  const getStatusMessages = () => {
    const messages = [];

    if (!isEmailAllowed && !hasValidPermissions && isWalletConnected) {
      messages.push({
        id: "email-format",
        content: (
          <>
            Account not connected with required email format:{" "}
            <span className="font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
              youremail+smart-sessions@domain.com
            </span>
          </>
        ),
      });
    }

    if (isEmailAllowed && !isSmartAccount && isWalletConnected) {
      messages.push({
        id: "smart-account",
        content: (
          <>
            Switch to a <span className="font-bold">Smart Account</span> to use
            this feature.
          </>
        ),
      });
    }

    if (isEmailAllowed && isSmartAccount && hasInsufficientEth) {
      messages.push({
        id: "eth-balance",
        content: (
          <>
            Insufficient ETH, need at least{" "}
            <span className="font-bold">0.0005 ETH</span>
          </>
        ),
      });
    }

    return messages;
  };

  const statusMessages = getStatusMessages();

  // Main content for connected users or valid permissions
  const mainContent = (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-sm text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          Dollar Cost Average
        </h1>

        {/* Wallet connection button for connected users */}
        {isWalletConnected && (
          <div className="flex w-full items-center justify-center mb-4">
            <w3m-button />
          </div>
        )}

        {/* Status messages as a list */}
        {statusMessages.length > 0 && (
          <div className="flex w-full items-center mb-4">
            <ul className="text-sm text-red-700 dark:text-gray-300 list-disc list-inside text-left">
              {statusMessages.map((message) => (
                <li key={message.id}>{message.content}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs for DCA and Dashboard */}
        <Tabs defaultValue="dca" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dca">DCA</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>
          <TabsContent value="dca">
            <DCAForm
              isSupported={isSupported}
              hasInsufficientEth={hasInsufficientEth}
            />
          </TabsContent>
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );

  // Rendering logic
  if (!readyToRender) {
    return null; // Wait until client-side rendering is ready
  }

  // Show if wallet is connected OR has valid permissions
  if (isWalletConnected || hasValidPermissions) {
    return mainContent;
  }

  // If no wallet connection and no permissions, show the connection screen
  return <NotConnectedScreen />;
}
