import { MessageWithContext } from "@/types/chat/types";

export const sendChatMessageToApi = async (messageWithContext: MessageWithContext): Promise<{ message: string }> => {
  try {
    const API_URL = '/api/send-message';
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageWithContext),
    });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || `Failed to get response from server: ${response.status}`;
        throw new Error(errorMessage);
      }
  
      const data = await response.json();
      if (data.receiptLink) {
        return {
          message:`${data.message}
            <a href="${data.receiptLink}" target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>
              Receipt
            </a>})`,
        };
      }
      return { message: data.message };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send message:Unknown error');
    }
  }