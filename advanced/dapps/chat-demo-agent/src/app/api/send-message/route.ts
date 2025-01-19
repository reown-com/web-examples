import { NextResponse } from 'next/server';
import { getOpenAIResponse } from '@/lib/services/openai';
import { SwapService } from '@/lib/services/swap';
import { ExpectedResponse } from '@/types/api';
import { ErrorCodes, ErrorDescriptions, AppError, ErrorCodeType } from '@/errors/api-errors';
import { SmartSessionGrantPermissionsResponse } from '@reown/appkit-experimental/smart-session';
import { parseRequest } from './request-validation';

export const runtime = 'edge';

// Type guard for parsed response
function isValidResponse(response: unknown): response is ExpectedResponse {
  return Boolean(
    response && 
    typeof response === 'object' && 
    'intent' in response &&
    typeof response.intent === 'string'
  );
}

// Separate intent handler functions
async function handleSwapIntent(permissions: SmartSessionGrantPermissionsResponse) {
  const swapResult = await SwapService.executeSwap(permissions);
  const userOpHash = swapResult.userOpHash;
  if(userOpHash){
    return handleReceiptIntent(userOpHash);
  }
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
    // Parse request
    const { currentMessage, messageHistory, permissions } = await parseRequest(request);

    // Format chat history
    const chatHistory = messageHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'system',
      content: msg.text
    } as const));

    // Get and process OpenAI response
    const parsedResponse = await processOpenAIResponse(currentMessage, chatHistory);

    // Handle intents
    switch (parsedResponse.intent) {
      case "SWAP":
        return handleSwapIntent(permissions);

      case "GET_SWAP_RECEIPT":
        return handleReceiptIntent(parsedResponse.purchaseId);

      case "NOT_SWAP":
        return handleNotSwapIntent(parsedResponse.responseText);

      default:
        throw new AppError(
          ErrorCodes.INVALID_INTENT,
          `Unhandled intent: ${parsedResponse.intent}`
        );
    }

  } catch (error: unknown) {
    const { errorCode, errorMessage } = error instanceof AppError
      ? { errorCode: error.code, errorMessage: error.message }
      : { errorCode: ErrorCodes.UNKNOWN_ERROR as ErrorCodeType, errorMessage: ErrorDescriptions[ErrorCodes.UNKNOWN_ERROR] };

    // Log the full error details for debugging
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