import { NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/services/openai';
import { SwapService } from '@/lib/services/swap';
import { MessageWithContext } from '@/types/chat/types';
import { ExpectedResponse } from '@/types/api';

async function handlePost(request: Request) {
  try {
    const body: MessageWithContext = await request.json();
    const { currentMessage, messageHistory, permissions } = body;

    // Format chat history
    const chatHistory = messageHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'system',
      content: msg.text
    } as const));

    // Get OpenAI response
    const openAIService = OpenAIService.getInstance();
    const completion = await openAIService.getResponse(currentMessage, chatHistory);
    const response = completion.choices[0].message;

    if (!response?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const parsedResponse = JSON.parse(response.content) as ExpectedResponse;
    console.log(parsedResponse);

    // Handle different intents
    switch (parsedResponse.intent) {
      case "SWAP":
        const swapResult = await SwapService.executeSwap(permissions);
        return NextResponse.json(swapResult);

      case "GET_SWAP_RECEIPT":
        if(!parsedResponse.purchaseId || !parsedResponse.amount) {
          throw new Error('Error occurred getting swap receipt');
        }
        const receipt = await SwapService.getSwapReceipt(parsedResponse.purchaseId);
        return NextResponse.json(receipt);

      case "NOT_SWAP":
        return NextResponse.json({
          message: parsedResponse.responseText || "I'm sorry, I didn't understand that.",
          status: 'success'
        });

      default:
        throw new Error(`Unhandled intent: ${parsedResponse.intent}`);
    }

  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal error occurred';
    
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to process message',
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

export const POST = handlePost;