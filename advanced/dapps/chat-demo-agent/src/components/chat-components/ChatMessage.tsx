import { IChatMessage } from '@/types/chat/types';
import React from 'react';

interface ChatMessageProps {
  message: IChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
        width: '100%',
      }}
    >
      <div
        style={{
          maxWidth: '80%', // Limit width for better readability on mobile
          padding: '0.5rem 1rem', // Padding for the message box
          borderRadius: '0.375rem', // Rounded corners
          wordBreak: 'break-word', // Word break handling
          whiteSpace: 'pre-wrap', // Preserve whitespace
          overflow: 'hidden', // Hide overflow
          backgroundColor: message.sender === 'user' ? 'rgb(0,136,71)' : '#374151', // Background color based on sender
          color: message.sender === 'user' ? '#FFFFFF' : '#D1D5DB', // Text color based on sender
        }}
      >
        {message.type === 'error' && (
          <span style={{ color: '#EF4444' }}> {/* Error text color */}
            {message.text}
          </span>
        )}
        {message.type !== 'error' && message.text}
      </div>
    </div>
  );
}
