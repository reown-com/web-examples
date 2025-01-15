"use client";
import React from "react";
import ChatInterface from "@/components/chat-components/ChatInterface";
import AppkitProvider from "./provider";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAppKitAccount } from "@reown/appkit/react";

export default function Home() {
  const {isConnected} = useAppKitAccount()
  if(isConnected){
    return (
      <AppkitProvider>
          <ChatInterface />
      </AppkitProvider>
    );
  }

  return (
    <AppkitProvider>
      <div className="flex flex-col items-center justify-center h-screen">
        <ConnectWalletButton />
      </div>
    </AppkitProvider>
  );
  
}
