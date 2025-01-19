import { MessageWithContext } from "@/types/chat/types";

interface BaseResponse {
  message: string;
  status: 'success' | 'error' | 'pending';
  userOpHash?: string;
  txHash?: string;
  txLink?: string;
}

interface SwapResponse extends BaseResponse {
  amount: string;
}

interface BasicResponse {
  message: string;
  status: string;
}

type SendMessageApiResponse = SwapResponse | BasicResponse;

export const sendChatMessageToApi = async (
  messageWithContext: MessageWithContext
): Promise<{ message: string }> => {
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

    const data: SendMessageApiResponse = await response.json();

    // Handle response with a transaction link
    if ('txLink' in data) {
      const statusMessage = data.txLink && data.userOpHash
        ? `\n${hiddenTruncateUserOpHash(data.userOpHash)}View details: ${formatLink('Transaction Link', data.txLink)}`
        : data.status === 'pending' && data.userOpHash
          ? `\nYou can check the status later using the purchase id: ${truncateUserOpHash(data.userOpHash)}`
          :  '';

      return {
        message: `${data.message}${statusMessage}`
      };
    }

    // Handle basic response
    return {
      message: data.message
    };

  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to send message: Unknown error'
    );
  }
};

const formatLink = (text: string, url: string) => 
  `<a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline;">${text}</a>`;

// Helper function to truncate hash
const truncateUserOpHash = (hash: string) => `<span onclick="navigator.clipboard.writeText('${hash}')" class="underline cursor-pointer" title="Click to copy full hash"> ${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}</span>`;

// Helper function to truncate hash
const hiddenTruncateUserOpHash = (hash: string) => `<span class="hidden" title="PurchaseId" >${hash}</span>`;
