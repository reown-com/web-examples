import React from 'react';
import { IChatMessage } from '@/types/chat/types';
import DOMPurify from 'dompurify';

interface ChatMessageProps {
  message: IChatMessage;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  // Function to safely render HTML content
  const createMarkup = (content: string) => {
    return {
      __html: DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['a', 'br', 'p', 'span', 'strong', 'em'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class']
      })
    };
  };

  return (
    <div
      className={`flex w-full ${
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[80%] px-4 py-2 rounded-md break-words whitespace-pre-wrap overflow-hidden ${
          message.sender === 'user'
            ? 'bg-blue-400/10 text-blue-500'
            : 'bg-foreground text-secondary'
        }`}
      >
        {message.type === 'error' ? (
          <span className="text-red-500">{message.text}</span>
        ) : (
          <div
            dangerouslySetInnerHTML={createMarkup(message.text)}
            className="chat-message-content [&_a]:text-blue-400 [&_a]:hover:text-blue-300 [&_a]:underline"
          />
        )}
      </div>
    </div>
  );
};
