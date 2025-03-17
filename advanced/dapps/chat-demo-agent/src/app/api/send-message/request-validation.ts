import { MessageWithContext } from '@/types/chat/types';
import { ErrorCodes, AppError } from '@/errors/api-errors';
import { SmartSessionGrantPermissionsResponse } from '@reown/appkit-experimental/smart-session';

/**
 * Maximum allowed length for message text to prevent abuse
 */
const MAX_MESSAGE_LENGTH = 300;

/**
 * Maximum allowed number of messages in history to prevent memory issues
 */
const MAX_HISTORY_LENGTH = 20;

/**
 * Type guard to validate the structure and content of message history
 * @param history - The message history to validate
 * @returns Boolean indicating if the history is valid
 */
function isValidMessageHistory(
  history: unknown
): history is Array<{ sender: 'user' | 'system'; text: string }> {
  if (!Array.isArray(history)) {
    return false;
  }

  if (history.length > MAX_HISTORY_LENGTH) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      `Message history exceeds maximum length of ${MAX_HISTORY_LENGTH}`
    );
  }

  return history.every((msg, index) => {
    if (!msg || typeof msg !== 'object') {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST_BODY,
        `Invalid message object at index ${index}`
      );
    }

    if (!('sender' in msg) || !('text' in msg)) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST_BODY,
        `Missing required fields at message index ${index}`
      );
    }

    if (msg.sender !== 'user' && msg.sender !== 'system') {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST_BODY,
        `Invalid sender type at message index ${index}`
      );
    }

    if (typeof msg.text !== 'string') {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST_BODY,
        `Message text must be a string at index ${index}`
      );
    }

    if ( msg.sender !== 'system' && msg.text.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST_BODY,
        `Message text exceeds maximum length at index ${index}`
      );
    }

    return true;
  });
}

/**
 * Validates the structure and content of permissions object
 * @param permissions - The permissions object to validate
 * @returns Boolean indicating if the permissions are valid
 * @throws AppError if validation fails
 */
function isValidPermissions(
  permissions: unknown
): permissions is SmartSessionGrantPermissionsResponse {
  if (!permissions || typeof permissions !== 'object') {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Permissions must be a non-null object'
    );
  }

  const p = permissions as SmartSessionGrantPermissionsResponse;

  // Validate chainId
  if (!p.chainId || !/^0x[0-9a-fA-F]+$/.test(p.chainId)) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Invalid chainId format'
    );
  }

  // Validate address
  if (!p.address || !/^0x[0-9a-fA-F]{40}$/.test(p.address)) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Invalid address format'
    );
  }

  // Validate expiry
  if (!Number.isInteger(p.expiry) || p.expiry < Date.now()/1000) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Invalid or expired permissions'
    );
  }

  // Validate permissions array
  if (!Array.isArray(p.permissions)) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Permissions must be an array'
    );
  }

  // Validate context
  if (typeof p.context !== 'string') {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Context must be a string'
    );
  }

  return true;
}

/**
 * Type guard to validate the complete message with context
 * @param data - The data to validate
 * @returns Boolean indicating if the data is valid
 * @throws AppError if validation fails
 */
function isValidMessageWithContext(data: unknown): data is MessageWithContext {
  if (!data || typeof data !== 'object') {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Request body must be an object'
    );
  }

  const { currentMessage, messageHistory, permissions } = data as Partial<MessageWithContext>;

  // Validate currentMessage
  if (!currentMessage || typeof currentMessage !== 'string') {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'currentMessage must be a non-empty string'
    );
  }

  if (currentMessage.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      `currentMessage exceeds maximum length of ${MAX_MESSAGE_LENGTH}`
    );
  }

  // Validate messageHistory
  if (!messageHistory) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'messageHistory is required'
    );
  }
  isValidMessageHistory(messageHistory);

  // Validate permissions
  if (!permissions) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'permissions object is required'
    );
  }
  isValidPermissions(permissions);

  return true;
}

/**
 * Parses and validates an incoming request
 * @param request - The incoming HTTP request
 * @returns Promise resolving to validated MessageWithContext
 * @throws AppError for any validation or parsing errors
 */
async function parseRequest(request: Request): Promise<MessageWithContext> {
  // Validate content type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Content-Type must be application/json'
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    throw new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      'Failed to parse JSON body'
    );
  }

  isValidMessageWithContext(body);

  return body as MessageWithContext;
}

export { parseRequest };