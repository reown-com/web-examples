import { IChatMessage } from "@/types/chat/types";
import { ScrollArea } from "../ui/scroll-area";
import { ChatMessage } from "./ChatMessage";

// Messages Area Component
const MessagesArea: React.FC<{ messages: IChatMessage[]; isLoading: boolean }> = ({ messages, isLoading }) => (
  <ScrollArea className="flex-1 p-4 overflow-x-hidden bg-foreground/30">
    <div className="space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="text-zinc-400 italic">Agent is typing...</div>
      )}
    </div>
  </ScrollArea>
);

export default MessagesArea;
