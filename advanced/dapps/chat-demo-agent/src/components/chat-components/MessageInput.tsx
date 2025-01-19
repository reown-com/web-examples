import { FormEvent, useState } from "react";
import { Button } from "../ui/button";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

const MessageInput = ({ onSubmit, isLoading }: MessageInputProps) => {
  const [inputMessage, setInputMessage] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSubmit(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 sm:p-4 border-t border-zinc-700 bg-zinc-900 w-full overflow-x-hidden"
    >
      <div className="flex gap-2 items-center w-full">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-zinc-800 text-white rounded-lg px-3 py-2 sm:px-4 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[rgb(0,136,71)] text-sm sm:text-base w-full"
          disabled={isLoading}
        />
        <Button
          type="submit"
          className={`bg-[rgb(0,136,71)] hover:bg-[rgb(0,116,61)] ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
        >
          {isLoading ? '...' : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;
