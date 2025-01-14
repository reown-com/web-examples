'use client'
import Header from '@/components/chat-components/Header';
import MessagesArea from '@/components/chat-components/MessageArea';
import MessageInput from '@/components/chat-components/MessageInput';
import Sidebar from '@/components/chat-components/Sidebar';
import { toast } from '@/hooks/use-toast';
import { IChatMessage } from '@/types/ui/types';
import { v4 as uuidv4 } from 'uuid';
import React, { useState } from 'react';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<IChatMessage[]>([
    { id: uuidv4(), text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date() },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    try {
      setIsLoading(true);
      
      // Add user message immediately
      const userMessage: IChatMessage = {
        id: uuidv4(),
        text,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Make API call to backend
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();

      // Add bot response
      const botResponse: IChatMessage = {
        id: uuidv4(),
        text: data.message,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <MessagesArea messages={messages} isLoading={isLoading} />
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatInterface;