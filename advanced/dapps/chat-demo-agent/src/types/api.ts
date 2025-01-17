export interface SwapResponse {
  message: string;
  status: 'success' | 'error';
  userOpHash?: string;
}

export interface ChatResponse {
  message: string;
  status: 'success' | 'error';
}

export interface ExpectedResponse {
  intent: "NOT_SWAP" | "SWAP" | "GET_SWAP_RECEIPT" ;
  responseText?: string;
  purchaseId?: string;
  amount?: string;
}

export type SwapReceipt = {
    message: string ,
    receiptLink: string,
    status:  'success' | 'error';
};