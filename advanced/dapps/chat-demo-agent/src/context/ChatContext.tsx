import React, { createContext, useEffect, useReducer } from 'react';
import { toast } from '@/hooks/use-toast';
import { getRecentMessageHistory, createMessage } from '../utils/messageUtils';
import { getRequiredPermissions } from '@/utils/ChatSmartSessionsPermissionsUtil';
import { PERMISSIONS_STORAGE_KEY, STORAGE_KEY } from '@/utils/ChatContants';
import { chatReducer, initialState } from '@/reducers/chatReducer';
import { ChatContextType, MessageWithContext } from '@/types/chat/types';
import { sendMessageToApi } from '@/lib/chatApi';

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState, (key, value) => {
          if (key === 'timestamp') {
            return new Date(value);
          }
          return value;
        });
        dispatch({ type: 'LOAD_STATE', payload: parsedState });
      } catch (error) {
        console.error('Error loading chat state:', error);
        toast({
          title: "Error",
          description: "Failed to load chat history.",
          variant: "destructive",
        });
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const startChat = async (chainId: number, address: `0x${string}`) => {
    try {
      const storedPermissions = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      let grantedPermissions = storedPermissions ? JSON.parse(storedPermissions) : null;

      if (!grantedPermissions) {
        grantedPermissions = await getRequiredPermissions(chainId, address);
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(grantedPermissions));
      }

      dispatch({ type: 'START_CHAT', payload: grantedPermissions });
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (text: string) => {
    try {
      const grantedPermissions = state.grantedPermissions;
      if (!grantedPermissions) {
        throw new Error('Permissions not granted');
      }

      dispatch({ type: 'SET_LOADING', payload: true });
      
      const userMessage = createMessage(text, 'user');
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      const messageWithContext: MessageWithContext = {
        currentMessage: text,
        messageHistory: getRecentMessageHistory(state.messages),
        permissions: grantedPermissions,
      };

      const data = await sendMessageToApi(messageWithContext);
      
      const botResponse = createMessage(data.message, 'bot');
      dispatch({ type: 'ADD_MESSAGE', payload: botResponse });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      console.error('Error sending message:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearChat = () => {
    dispatch({ type: 'CLEAR_CHAT' });
    toast({
      title: "Success",
      description: "Chat history has been cleared.",
    });
  };

  const clearPermissions = () => {
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    dispatch({ type: 'CLEAR_PERMISSIONS' });
    dispatch({ type: 'CLEAR_CHAT' });
    toast({
      title: "Success",
      description: "Permissions have been cleared. Please restart the chat.",
    });
  };

  return (
    <ChatContext.Provider value={{ 
      state, 
      startChat, 
      sendMessage,
      clearChat,
      clearPermissions
    }}>
      {children}
    </ChatContext.Provider>
  );
};