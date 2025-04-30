// error-codes.ts

export const ErrorCodes = {
  INVALID_REQUEST_BODY: 'ERR001',
  OPENAI_RESPONSE_ERROR: 'ERR002',
  INVALID_OPENAI_RESPONSE: 'ERR003',
  INVALID_INTENT: 'ERR004',
  SWAP_EXECUTION_ERROR: 'ERR005',
  RECEIPT_FETCH_ERROR: 'ERR006',
  TIMEOUT_ERROR: 'ERR007',
  CONFIGURATION_ERROR: 'ERR008',
  UNAUTHORIZED: 'ERR009',
  UNKNOWN_ERROR: 'ERR999',
} as const;

// Create a type from the ErrorCodes values
export type ErrorCodeType = typeof ErrorCodes[keyof typeof ErrorCodes];

// Private error descriptions - only for logging, not for client response
export const ErrorDescriptions: Record<ErrorCodeType, string> = {
  [ErrorCodes.UNAUTHORIZED]: 'Unauthorized',
  [ErrorCodes.CONFIGURATION_ERROR]: 'Configuration error',
  [ErrorCodes.INVALID_REQUEST_BODY]: 'Failed to parse request body',
  [ErrorCodes.OPENAI_RESPONSE_ERROR]: 'Error getting response from OpenAI',
  [ErrorCodes.INVALID_OPENAI_RESPONSE]: 'Invalid or empty response from OpenAI',
  [ErrorCodes.INVALID_INTENT]: 'Unhandled or invalid intent received',
  [ErrorCodes.SWAP_EXECUTION_ERROR]: 'Error executing swap operation',
  [ErrorCodes.RECEIPT_FETCH_ERROR]: 'Error fetching swap receipt',
  [ErrorCodes.TIMEOUT_ERROR]: 'Operation timed out',
  [ErrorCodes.UNKNOWN_ERROR]: 'An unknown error occurred',
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCodeType,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}