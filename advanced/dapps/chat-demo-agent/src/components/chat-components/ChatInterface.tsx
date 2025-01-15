import React from 'react';
import Header from '@/components/chat-components/Header';
import MessagesArea from '@/components/chat-components/MessageArea';
import MessageInput from '@/components/chat-components/MessageInput';
import Sidebar from '@/components/chat-components/Sidebar';
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useChat } from '@/hooks/use-chat';

const ChatInterface: React.FC = () => {
  const { state, startChat, sendMessage } = useChat();
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { messages, isChatStarted, isLoading } = state;
  
  if (!chainId || !address) {
    return (
      <div className="h-screen flex items-center justify-center text-white text-lg">
        Check your wallet connection
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div className={`${!isChatStarted ? 'opacity-70 blur-sm' : ''} transition-all duration-300`}>
        <div className="flex h-screen bg-black">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <MessagesArea messages={messages} isLoading={isLoading} />
            <MessageInput onSendMessage={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {!isChatStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent">
          <button 
            onClick={() => startChat(Number(chainId), address as `0x${string}`)}
            className="bg-[rgb(0,136,71)] hover:bg-[rgb(0,156,91)] text-white font-bold py-4 px-8 rounded-lg transition-colors duration-200"
          >
            Start Chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;