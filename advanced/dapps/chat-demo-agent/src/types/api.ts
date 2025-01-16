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
  intent: "NOT_SWAP" | "SWAP";
  responseText?: string;
}