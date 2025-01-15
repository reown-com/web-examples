import { IChatMessage } from "@/types/chat/types";
import { ScrollArea } from "../ui/scroll-area";
import { ChatMessage } from "./ChatMessage";

// Messages Area Component
const MessagesArea: React.FC<{ messages: IChatMessage[]; isLoading: boolean }> = ({ messages, isLoading }) => (
  <ScrollArea className="flex-1 p-4">
    <div className="space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="text-zinc-400 italic">Bot is typing...</div>
      )}
    </div>
  </ScrollArea>
);

export default MessagesArea;
