import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Address, parseEther } from 'viem';
import { performTokenSwap, SwapParams } from '@/lib/services/swap';
import { MessageWithContext } from '@/types/chat/types';

interface ChatGPTResponse {
  role: string;
  content: string;
}

type ExpectedResponse = {
  intent: "NOT_SWAP" | "SWAP";
  responseText?: string;
}

export async function POST(request: Request) {
  try {
    const body: MessageWithContext = await request.json();
    const { currentMessage, messageHistory, permissions } = body;

    // Format chat history for OpenAI context
    const chatHistory: {
      role: 'system'|'user';
      content: string;
    }[] = messageHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'system',
      content: msg.text
    }));

    const chatgptResponse = await getOpenAIResponse(currentMessage, chatHistory);
    const expectedResponse: ExpectedResponse = JSON.parse(chatgptResponse.content);

    if (expectedResponse.intent === "SWAP") {
      console.log('SWAP detected');
      
      const amount = parseEther('0.00005')

      const swapParams: SwapParams = {
        src: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',  // ETH
        dst: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',  // USDC
        amount: amount.toString(10),
        from: permissions.address,
        slippage: 1,
        disableEstimate: false,
        allowPartialFill: false
      };

      await handleSwapAction(swapParams);
      
      return NextResponse.json({
        message: `Executing swap of '0.00005' ETH to USDC...`,
        status: 'success'
      });
    }

    return NextResponse.json({
      message: expectedResponse.responseText || "I'm sorry, I didn't understand that.",
      status: 'success'
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

const getOpenAIResponse = async (
  currentMessage: string, 
  chatHistory: { role: 'system'|'user'; content: string; }[]
): Promise<ChatGPTResponse> => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { 
        role: "system", 
        content: `You are an AI assistant specialized in processing chat messages for a Web3 application.
          Your primary function is to identify ETH to USDC swap requests and provide helpful responses for other queries.
          
          RESPONSE FORMAT REQUIREMENTS:
          You must always respond with a JSON object following these exact structures:
          
          For SWAP intents:
          {
              "intent": "SWAP",
          }
          
          For non-SWAP intents:
          {
              "intent": "NOT_SWAP",
              "responseText": string    // Your helpful response as text
          }
          
          IMPORTANT:
          - Always return valid JSON
          - Never include additional fields
          - Never include explanatory text outside the JSON structure
          - Only process ETH to USDC swap requests
          - For any other token swap requests, respond with helpful message explaining only ETH to USDC swaps are supported
          
          Example valid responses:
          
          For "I want to swap ETH to USDC":
          {
              "intent": "SWAP"
          }
          
          For "What's the gas fee?":
          {
              "intent": "NOT_SWAP",
              "responseText": "Gas fees vary depending on network congestion. Would you like me to explain how gas fees work?"
          }
          
          For "I want to swap USDT to DAI":
          {
              "intent": "NOT_SWAP",
              "responseText": "I apologize, but currently I can only help with swapping ETH to USDC. Would you like to swap ETH to USDC instead?"
          }
          
          Consider the chat history provided for context in your responses.`
      },
      ...chatHistory,
      {
        role: "user",
        content: currentMessage,
      },
    ],
  });

  return completion.choices[0].message as ChatGPTResponse;
}

const handleSwapAction = async (swapParams: SwapParams) => {
  console.info('>> Starting Swap');
  console.log({ swapParams });

  const privateKey = process.env.FUNDER_PRIVATE_KEY as Address;

  try {
    const result = await performTokenSwap(swapParams, privateKey);
    console.log('Swap completed:', result);
    return result;
  } catch (error) {
    console.error('Swap failed:', error);
    throw error;
  } finally {
    console.info('>> Done');
  }
};