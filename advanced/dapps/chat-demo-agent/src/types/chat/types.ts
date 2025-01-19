import { SmartSessionGrantPermissionsResponse } from "@reown/appkit-experimental/smart-session";

export interface IChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: Date;
  type: 'text' | 'error' 
}

export interface ChatState {
  messages: IChatMessage[];
  isChatStarted: boolean;
  isLoading: boolean;
  grantedPermissions?: SmartSessionGrantPermissionsResponse;
}

export interface MessageWithContext {
  currentMessage: string;
  messageHistory: IChatMessage[];
  permissions: SmartSessionGrantPermissionsResponse;
}

export type ChatContextType = {
  state: ChatState;
  startChat: (chainId: number, address: `0x${string}`) => Promise<void>;
  sendMessage: (text: string) => void;
  clearChat: () => void;
  clearPermissions: () => void;
};