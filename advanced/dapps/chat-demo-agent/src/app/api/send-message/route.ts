import { NextResponse } from 'next/server';
import { getOpenAIResponse } from '@/lib/services/openai';
import { SwapService } from '@/lib/services/swap';
import { ExpectedResponse } from '@/types/api';
import { ErrorCodes, ErrorDescriptions, AppError, ErrorCodeType } from '@/errors/api-errors';
import { SmartSessionGrantPermissionsResponse } from '@reown/appkit-experimental/smart-session';
import { parseRequest } from './request-validation';

export const runtime = 'edge';

// Updated type guard for new response format
function isValidResponse(response: unknown): response is ExpectedResponse {
  if (!response || typeof response !== 'object' || !('intent' in response)) {
    return false;
  }

  const typedResponse = response as Record<string, unknown>;

  if (typedResponse.intent === 'SWAP') {
    return typeof typedResponse.amount === 'string';
  }

  if (typedResponse.intent === 'GET_SWAP_RECEIPT') {
    return typeof typedResponse.purchaseId === 'string';
  }

  if (typedResponse.intent === 'NOT_SWAP') {
    return typeof typedResponse.responseText === 'string';
  }

  return false;
}

// Separate intent handler functions
async function handleSwapIntent(permissions: SmartSessionGrantPermissionsResponse, amount:string) {
  const swapResult = await SwapService.executeSwap(permissions, amount);
  return NextResponse.json(swapResult);
}

async function handleReceiptIntent(purchaseId: string | undefined) {
  if (!purchaseId) {
    throw new AppError(
      ErrorCodes.RECEIPT_FETCH_ERROR,
      'Missing required fields for receipt'
    );
  }
  
  const receipt = await SwapService.getSwapReceipt(purchaseId);
  return NextResponse.json(receipt);
}

function handleNotSwapIntent(responseText: string | undefined) {
  return NextResponse.json({
    message: responseText || "I'm sorry, I didn't understand that.",
    status: 'success'
  });
}

// Process OpenAI response
async function processOpenAIResponse(
  currentMessage: string,
  chatHistory: Array<{ role: 'system' | 'user'; content: string }>
) {
  try {
    const completion = await getOpenAIResponse(currentMessage, chatHistory);
    const response = completion.choices[0].message;

    if (!response?.content) {
      throw new AppError(
        ErrorCodes.INVALID_OPENAI_RESPONSE,
        'Empty response from OpenAI'
      );
    }

    const parsedResponse = JSON.parse(response.content);
    
    if (!isValidResponse(parsedResponse)) {
      throw new AppError(
        ErrorCodes.INVALID_OPENAI_RESPONSE,
        'Invalid response structure from OpenAI'
      );
    }

    return parsedResponse;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      ErrorCodes.OPENAI_RESPONSE_ERROR,
      'Failed to process OpenAI response'
    );
  }
}

// Main handler
async function handlePost(request: Request) {
  try {
    const { currentMessage, messageHistory, permissions } = await parseRequest(request);

    const chatHistory = messageHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'system',
      content: msg.text
    } as const));

    const parsedResponse = await processOpenAIResponse(currentMessage, chatHistory);

    switch (parsedResponse.intent) {
      case "SWAP":
        return handleSwapIntent(permissions, parsedResponse.amount);

      case "GET_SWAP_RECEIPT":
        return handleReceiptIntent(parsedResponse.purchaseId);

      case "NOT_SWAP":
        return handleNotSwapIntent(parsedResponse.responseText);

      default:
        throw new AppError(
          ErrorCodes.INVALID_INTENT,
          `Unhandled intent: ${parsedResponse}`
        );
    }

  } catch (error: unknown) {
    const { errorCode, errorMessage } = error instanceof AppError
      ? { errorCode: error.code, errorMessage: error.message }
      : { errorCode: ErrorCodes.UNKNOWN_ERROR as ErrorCodeType, errorMessage: ErrorDescriptions[ErrorCodes.UNKNOWN_ERROR] };

    console.error('API Error:', {
      code: errorCode,
      message: errorMessage,
      error
    });
    
    return NextResponse.json(
      { 
        status: 'error',
        message: `Internal error occurred [${errorCode}]`
      },
      { status: 500 }
    );
  }
}

export const POST = handlePost;