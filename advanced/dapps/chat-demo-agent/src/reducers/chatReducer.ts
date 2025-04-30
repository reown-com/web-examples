import { v4 as uuidv4 } from 'uuid';
import { SmartSessionGrantPermissionsResponse } from "@reown/appkit-experimental/smart-session";
import { ChatState, IChatMessage } from '@/types/chat/types';
import { INITIAL_MESSAGE } from '@/utils/ChatContants';

export type ChatAction =
  | { type: 'START_CHAT'; payload: SmartSessionGrantPermissionsResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: IChatMessage }
  | { type: 'LOAD_STATE'; payload: ChatState }
  | { type: 'CLEAR_CHAT' }
  | { type: 'CLEAR_PERMISSIONS' };

export const initialState: ChatState = {
  messages: [{
    id: uuidv4(),
    text: INITIAL_MESSAGE,
    sender: "system",
    timestamp: new Date(),
    type: "text",
  }],
  isChatStarted: false,
  isLoading: false,
  grantedPermissions: undefined,
};

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'START_CHAT':
      return {
        ...state,
        isChatStarted: true,
        grantedPermissions: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'LOAD_STATE':
      return action.payload;
    case 'CLEAR_CHAT':
      return {
        ...initialState,
        grantedPermissions: state.grantedPermissions,
        isChatStarted: state.isChatStarted,
      };
      case 'CLEAR_PERMISSIONS':
      return {
        ...state,
        grantedPermissions: undefined,
        isChatStarted: false,
      };
    default:
      return state;
  }
};
