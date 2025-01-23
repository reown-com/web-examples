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

// Generic function to fetch API with type-safe body
const fetchApi = async <T extends object>(
  url: string, 
  body: T
): Promise<Response> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response;
};

const parseErrorResponse = async (response: Response): Promise<string> => {
  const errorMessage = `Failed to get response from server: ${response.status}`;
  
  try {
    const errorData = await response.json();
    return errorData.message || errorMessage;
  } catch {
    const errorText = await response.text();
    return errorText || errorMessage;
  }
};

const formatLink = (text: string, url: string) => 
  `<a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline;">${text}</a>`;

// Helper function to truncate hash
const truncateUserOpHash = (hash: string) => `<span onclick="navigator.clipboard.writeText('${hash}')" class="underline cursor-pointer" title="Click to copy full hash"> ${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}</span>`;

// Helper function to truncate hash
const hiddenTruncateUserOpHash = (hash: string) => `<span class="hidden" title="PurchaseId" >${hash}</span>`;

const formatApiResponse = (data: SendMessageApiResponse): { message: string } => {
  let statusMessage = '';

  if ('txLink' in data) {
    statusMessage = data.txLink && data.userOpHash
      ? `\n${hiddenTruncateUserOpHash(data.userOpHash)}View details: ${formatLink('Transaction Link', data.txLink)}`
      : data.status === 'pending' && data.userOpHash
        ? `\nYou can check the status later using the purchase id: ${truncateUserOpHash(data.userOpHash)}`
        :  '';
  }

  return { message: `${data.message}${statusMessage}` };
};


// Main function to send chat message to the API
export const sendChatMessageToApi = async (
  messageWithContext: MessageWithContext
): Promise<{ message: string }> => {
  const API_URL = '/api/send-message';

  try {
    const response = await fetchApi(API_URL, messageWithContext);
    const data: SendMessageApiResponse = await response.json();
    return formatApiResponse(data);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to send message: Unknown error'
    );
  }
};