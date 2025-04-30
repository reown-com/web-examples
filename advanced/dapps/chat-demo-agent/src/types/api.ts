
export interface SwapResponse {
  message: string;
  status: 'success' | 'error' | 'pending';
  userOpHash: string;
  amount: string;
  txLink: string;
}
export interface ChatResponse {
  message: string;
  status: 'success' | 'error';
}

export type ExpectedResponse = {
  intent: 'SWAP';
  amount: string;
} | {
  intent: 'GET_SWAP_RECEIPT';
  purchaseId: string;
} | {
  intent: 'NOT_SWAP';
  responseText: string;
}

export interface SwapReceipt {
  message: string;
  txLink: string;
  userOpHash: string;
  status: 'success' | 'error' | 'pending';
}