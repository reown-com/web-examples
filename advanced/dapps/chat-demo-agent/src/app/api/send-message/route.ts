import { NextResponse } from 'next/server';
import OpenAI from 'openai'

interface ChatGPTResponse{
  role: string;
  content: string;
}

type ExpectedResponse = {
  intent: "NOT_SWAP"| "SWAP";
  responseText?: string;
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    const chatgptResponse = await getOpenAIResponse(text)
    const expectedResponse: ExpectedResponse = JSON.parse(chatgptResponse.content);
    console.log(expectedResponse);
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

 
const getOpenAIResponse = async (message:string):Promise<ChatGPTResponse> => {
  const openai = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY,
  });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
          { role: "system", content:  `You are an AI assistant specialized in processing chat messages for a Web3 application.
            Your primary functions are:
            1. Identify SWAP intents in user messages
            2. Provide helpful responses for non-SWAP queries
            3. Extract relevant transaction parameters when SWAP intent is detected
            
            RESPONSE FORMAT REQUIREMENTS:
            You must always respond with a JSON object following these exact structures:
            
            For SWAP intents:
            {
                "intent": "SWAP",
                "swapParameters": {
                    "tokenIn": string,    // Input token symbol (e.g., "ETH", "USDT")
                    "tokenOut": string,   // Output token symbol
                    "amount": string      // Amount to swap as string
                }
            }
            
            For non-SWAP intents:
            {
                "intent": "NOT_SWAP",
                "responseText": string    // Your helpful response as text
            }
            
            Examples of valid responses:
            
            SWAP Example:
            {
                "intent": "SWAP",
                "swapParameters": {
                    "tokenIn": "ETH",
                    "tokenOut": "USDT",
                    "amount": "1.5"
                }
            }
            
            Non-SWAP Example:
            {
                "intent": "NOT_SWAP",
                "responseText": "The current gas fees depend on network congestion. Would you like me to explain how gas fees work?"
            }
            
            IMPORTANT:
            - Always return valid JSON
            - Never include additional fields
            - Never include explanatory text outside the JSON structure
            - For SWAP intents, always include all required swapParameters fields
            - Amounts should always be strings to preserve precision
            - Token symbols should be standardized uppercase strings` },
          {
              role: "user",
              content: message,
          },
      ],
  });

  return completion.choices[0].message as ChatGPTResponse;
}