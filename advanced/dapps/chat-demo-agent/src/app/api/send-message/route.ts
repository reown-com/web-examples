import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Address, parseEther } from 'viem';
import { getSwapTransaction, SwapParams } from '@/lib/services/swap';
import { MessageWithContext } from '@/types/chat/types';
import { executeActionsWithECDSAKey } from '@/utils/ERC7715PermissionsAsyncUtils';
import { SmartSessionGrantPermissionsResponse } from '@reown/appkit-experimental/smart-session';
import * as viemChains from "viem/chains";
import { withRateLimit } from '@/utils/rateLimit';

interface ChatGPTResponse {
  role: string;
  content: string;
}

type ExpectedResponse = {
  intent: "NOT_SWAP" | "SWAP";
  responseText?: string;
}

const SWAP_AMOUNT_ETH = '0.00005';
const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const USDC_TOKEN_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

async function handlePost(request: Request) {
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
      
      const amount = parseEther(SWAP_AMOUNT_ETH);

      const swapParams: SwapParams = {
        src: ETH_ADDRESS,  
        dst: USDC_TOKEN_ADDRESS,
        amount: amount.toString(10),
        from: permissions.address,
        slippage: 1,
        disableEstimate: false,
        allowPartialFill: false
      };

      await handleSwapAction(swapParams, permissions);
      
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
    console.log(error)
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
          Your primary function is to identify ETH to USDC swap requests, recommend buying USDC when asked for token purchase suggestions, and provide helpful responses for other queries.
          
          RESPONSE FORMAT REQUIREMENTS:
          You must always respond with a JSON object following these exact structures:
          
          For SWAP intents:
          {
              "intent": "SWAP"
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
          - Always recommend buying USDC when the user asks for token purchase suggestions
          - If the user asks for a recommendation and you want to execute the Buy USDC intent, return the SWAP intent
          - For any other token swap requests, respond with a helpful message explaining only ETH to USDC swaps are supported
          
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
          
          For "What token should I buy?":
          {
              "intent": "NOT_SWAP",
              "responseText": "I recommend buying USDC as a stable and reliable token for your portfolio."
          }
          
          For "Should I buy USDC?":
          {
              "intent": "SWAP"
          }
          
          Example of user asking for a suggestion and executing it:
          
          User: "What token should I buy?"
          Response:
          {
              "intent": "NOT_SWAP",
              "responseText": "I recommend buying USDC as a stable and reliable token for your portfolio."
          }
          
          User: "Okay, buy USDC for me."
          Response:
          {
              "intent": "SWAP"
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

export function getChain(id: number) {
  const chains = Object.values(viemChains) as viemChains.Chain[];

  return chains.find((x) => x.id === id);
}

const getValidatedChain = (chainIdHex: string) => {
  const chainId = parseInt(chainIdHex, 16);
  if (!chainId)
    throw new Error("Chain ID not available in granted permissions");

  const chain = getChain(chainId);
  if (!chain) throw new Error("Unknown chainId");
  return chain;
};


const handleSwapAction = async (swapParams: SwapParams,grantedPermissions:SmartSessionGrantPermissionsResponse) => {
  const privateKey = process.env.APPLICATION_PRIVATE_KEY as Address;
  const chain = getValidatedChain(grantedPermissions.chainId);
  try {
    const swapTransaction = await getSwapTransaction(swapParams);
    const calls = [{
      to: swapTransaction.tx.to,
      data: swapTransaction.tx.data,
      value: BigInt(swapTransaction.tx.value),
    }]
    
    console.log('Executing swap transaction...');
    const userOpHash = await executeActionsWithECDSAKey({
      actions: calls,
      ecdsaPrivateKey: privateKey,
      chain,
      accountAddress: swapParams.from,
      permissionsContext: grantedPermissions.context
    })

    console.log('Swap transaction executed successfully:', userOpHash);
    return {
      message: 'Swap completed',
      status: 'success'
    };
    
  } catch (error) {
    throw error;
  } 
};

export const POST = withRateLimit(handlePost);