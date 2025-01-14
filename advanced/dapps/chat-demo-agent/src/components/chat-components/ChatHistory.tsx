import React from 'react';

interface ChatHistoryItemProps {
  title: string;
}

const ChatHistoryItem: React.FC<ChatHistoryItemProps> = ({ title }) => {
  return (
    <button className="w-full p-2 text-left text-zinc-300 hover:bg-zinc-800 rounded-lg">
      {title}
    </button>
  );
};

export default ChatHistoryItem;