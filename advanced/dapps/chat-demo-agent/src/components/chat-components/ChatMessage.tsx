import { IChatMessage } from '@/types/ui/types';
import React from 'react';

interface ChatMessageProps {
  message: IChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg ${
          message.sender === 'user'
            ? 'bg-[rgb(0,136,71)] text-white'
            : 'bg-zinc-800 text-zinc-100'
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}