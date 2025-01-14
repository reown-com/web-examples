import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Send } from "lucide-react";

const MessageInput: React.FC<{ onSendMessage: (text: string) => void; isLoading: boolean }> = ({ onSendMessage, isLoading }) => {
  const [messageText, setMessageText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && !isLoading) {
      onSendMessage(messageText);
      setMessageText('');
    }
  };

  return (
    <div className="p-4 border-t border-zinc-800">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
          disabled={isLoading}
        />
        <Button
          type="submit"
          className={`bg-[rgb(0,136,71)] hover:bg-[rgb(0,116,61)] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? '...' : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};

export default MessageInput;
