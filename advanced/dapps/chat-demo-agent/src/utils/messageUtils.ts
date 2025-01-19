import { IChatMessage } from "@/types/chat/types";
import { MAX_CONTEXT_MESSAGES } from "./ChatContants";
import { v4 as uuidv4 } from 'uuid';

export const getRecentMessageHistory = (messages: IChatMessage[]) => {
  return messages.slice(-MAX_CONTEXT_MESSAGES);
};

export const getLastMessage = (messages: IChatMessage[]) => {
  return messages[messages.length - 1];
};

export const createMessage = (text: string, sender: 'user' | 'system', type: 'text'|'error'): IChatMessage => {
  return {
    id: uuidv4(),
    text,
    sender,
    timestamp: new Date(),
    type
  };
};