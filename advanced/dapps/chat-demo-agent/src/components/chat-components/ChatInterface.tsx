import React from 'react';
import { Button } from "@/components/ui/button";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useChat } from '@/hooks/use-chat';
import MessagesArea from './MessageArea';
import Header from './Header';
import MessageInput from './MessageInput';

// Connection Screen Component
const ConnectionScreen = ({ onConnect }: { onConnect: () => void }) => (
  <div className="h-screen flex flex-col items-center justify-center bg-zinc-900 gap-4 px-4 sm:px-6 md:px-8">
    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 text-center">
      Welcome to Smart-Session x AI Agent
    </h1>
    <p className="text-sm sm:text-base md:text-lg text-white mb-4 text-center max-w-xs sm:max-w-md">
      Please connect your wallet in order to grant agent permissions to spend ETH on your behalf. 
      When connecting, be sure to use Email Wallet with +smart-sessions in the email. 
      Example: john+smart-sessions@doe.com
    </p>
    <Button 
      onClick={onConnect}
      className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,136,71)]/90"
    >
      Connect Wallet
    </Button>
  </div>
);

const ChatInterface = () => {
  const { state, startChat, sendMessage } = useChat();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { open } = useAppKit();
  const { messages, isLoading } = state;
  const { grantedPermissions } = state;
  const permissionAddress = grantedPermissions?.address;

  // First check if there's a granted permissions address
  // If yes, show chat screen regardless of other conditions
  if (permissionAddress) {
    return (
      <div className="h-screen flex bg-zinc-900">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <MessagesArea messages={messages} isLoading={isLoading} />
          <MessageInput onSubmit={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  // If no permissions granted, check wallet connection
  if (!address || !isConnected) {
    return <ConnectionScreen onConnect={() => open({ view: "Connect" })} />;
  }

  // Wallet is connected but no permissions granted yet
  return (
    <div className="h-screen flex bg-zinc-900">
      <div className="flex-1 flex flex-col">
        <Header />
        <div className="h-full flex items-center justify-center px-4 sm:px-6 md:px-8">
          <Button 
            onClick={() => startChat(Number(chainId), address as `0x${string}`)}
            className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,136,71)]/90"
          >
            Start New Chat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
