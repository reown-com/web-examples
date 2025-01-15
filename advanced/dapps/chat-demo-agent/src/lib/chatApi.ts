import { MessageWithContext } from "@/types/chat/types";

export const sendMessageToApi = async (messageWithContext: MessageWithContext): Promise<{ message: string }> => {
  const response = await fetch('/api/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messageWithContext),
  });

  if (!response.ok) {
    throw new Error('Failed to get response from server');
  }

  return response.json();
};