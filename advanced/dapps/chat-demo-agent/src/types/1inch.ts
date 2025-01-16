export interface SwapParams {
  src: `0x${string}`;
  dst: `0x${string}`;
  amount: string;
  from: `0x${string}`;
  slippage: number;
  disableEstimate?: boolean;
  allowPartialFill?: boolean;
}

export interface AllowanceResponse {
  allowance: string;
}

export interface ApprovalTransaction {
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  gas: bigint;
}

export interface SwapTransactionResponse {
  tx: {
    from: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
    gas: number;
    gasPrice: string;
  };
}