import React from 'react';
import { Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChat } from '@/hooks/use-chat';

const Header: React.FC = () => {
  const { clearChat, clearPermissions } = useChat();

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      clearChat();
    }
  };

  const handleClearPermissions = () => {
    if (window.confirm('Are you sure you want to clear permissions? This will require you to restart the chat.')) {
      clearPermissions();
    }
  };

  return (
    <header className="border-b border-gray-700 p-4 flex items-center justify-between bg-black">
      <h1 className="text-xl font-semibold text-white">Chat Assistant</h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <Menu className="w-6 h-6 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleClearChat} className="text-red-500">
            Clear Chat History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleClearPermissions} className="text-red-500">
            Clear Permissions
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default Header;