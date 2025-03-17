import React from "react";
import { Trash2 } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "../ui/button";
import Image from "next/image";


const ChatHeader: React.FC = () => {
  const { clearChat } = useChat();

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      clearChat();
    }
  };


  return (
    <header className="sticky top-0 z-50 bg-foreground">
      <div className="h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-2">
              <Image src="/bot-avatar.svg" alt="Bot Avatar" width={32} />
              <h1 className="text-lg font-bold text-secondary m-0">Agent</h1>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-red-500 bg-red-400/20 hover:text-red-400 hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" /> Clear Chat
          </Button>
        </div>
        
      </div>
    </header>
  );
};

export default ChatHeader;