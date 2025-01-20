import { FormEvent, useState } from "react";
import { Button } from "../ui/button";
import { Send, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MessageInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

const MAX_LENGTH = 300;

const MessageInput = ({ onSubmit, isLoading }: MessageInputProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showError, setShowError] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputMessage.trim() && inputMessage.length <= MAX_LENGTH) {
      onSubmit(inputMessage);
      setInputMessage('');
      setShowError(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputMessage(value);
    setShowError(value.length > MAX_LENGTH);
  };

  const remainingChars = MAX_LENGTH - inputMessage.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="w-full">
      {showError && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Message exceeds maximum length of {MAX_LENGTH} characters. Please shorten your message by {Math.abs(remainingChars)} characters.
          </AlertDescription>
        </Alert>
      )}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border-zinc-700 bg-zinc-900 w-full overflow-x-hidden"
      >
        <div className="flex flex-col gap-1 w-full">
          <div className="flex gap-2 items-center w-full">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type your message..."
              className={`flex-1 bg-zinc-800 text-white rounded-lg px-3 py-2 sm:px-4 sm:py-3 focus:outline-none focus:ring-2 ${
                isOverLimit ? 'focus:ring-red-500 border-red-500' : 'focus:ring-[rgb(0,136,71)]'
              } text-sm sm:text-base w-full`}
              disabled={isLoading}
            />
            <Button
              type="submit"
              className={`bg-[rgb(0,136,71)] hover:bg-[rgb(0,116,61)] ${
                (isLoading || isOverLimit) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isLoading || isOverLimit}
            >
              {isLoading ? '...' : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </div>
          <div className={`text-xs text-right ${isOverLimit ? 'text-red-500' : 'text-zinc-400'}`}>
            {remainingChars} characters remaining
          </div>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;