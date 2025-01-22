import React from 'react';
import { Button } from "@/components/ui/button";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useChat } from '@/hooks/use-chat';
import MessagesArea from './MessageArea';
import Header from './Header';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import ConnectionScreen from './ConnectionScreen';

const ChatInterface = () => {
  const { state, startChat, sendMessage } = useChat();
  const { address, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { open } = useAppKit();
  const { messages, isLoading } = state;
  const { grantedPermissions } = state;
  const permissionAddress = grantedPermissions?.address;

  // First check if there's a granted permissions address
  // If yes, show chat screen regardless of other conditions
  if (permissionAddress) {
    return (
      <div className="h-screen flex flex-col ">
        <Header />
        <div className="flex-1 flex flex-col overflow-hidden sm:mx-40 sm:my-16 sm:rounded-3xl">
          <ChatHeader />
          <MessagesArea messages={messages} isLoading={isLoading} />
          <MessageInput onSubmit={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  // If no permissions granted, check wallet connection
  if (!address || !isConnected) {
    return <ConnectionScreen onConnect={() => open({ view: "Connect" })} isConnected={isConnected} status={status} />;
  }

  // Wallet is connected but no permissions granted yet
  return (
    <div className="h-screen flex bg-background">
      <div className="flex-1 flex flex-col">
        <Header />
        <div className="h-full flex items-center justify-center px-4 sm:px-6 md:px-8">
          <div className="flex flex-col gap-6 text-center max-w-xs sm:max-w-md">
            
            {/* Main Description */}
            <div className="bg-zinc-800/50 p-4 rounded-lg">
              <h2 className="text-sm sm:text-base md:text-lg text-white mb-4">
                Setup Your AI Agent Account
              </h2>
              
              <div className="flex flex-col gap-4 text-left">
                <div className="flex gap-3">
                  <span className="text-blue-400">1.</span>
                  <p className="text-sm sm:text-base text-zinc-400">
                    AppKit Embedded Wallet provides you with a secure Safe ERC-7579 compatible account with Smart Sessions module enabled
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="text-blue-400">2.</span>
                  <p className="text-sm sm:text-base text-zinc-400">
                    Agent will request permission to spend <span className="text-white">0.001 ETH</span> on Base mainnet
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="text-blue-400">3.</span>
                  <p className="text-sm sm:text-base text-zinc-400">
                    Permissions will be valid for <span className="text-white">1 hour</span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="text-blue-400">4.</span>
                  <p className="text-sm sm:text-base text-zinc-400">
                    Please ensure you have sufficient ETH in your wallet for account deployment
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              onClick={() => startChat(Number(chainId), address as `0x${string}`)}
              className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base text-white bg-blue-400 hover:bg-blue-400/50"
            >
              Start New Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  
};

export default ChatInterface;
