import { CHATGPT_MODEL, SYSTEM_PROMPT } from '@/config/constants';
import { AppError, ErrorCodes } from '@/errors/api-errors';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export async function getOpenAIResponse(
  currentMessage: string,
  chatHistory: Array<{ role: 'system' | 'user'; content: string }>
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      ErrorCodes.INVALID_OPENAI_RESPONSE,
      'OPENAI_API_KEY is not set'
    );
  }

  const messages: Message[] = [
    { 
      role: "system", 
      content: SYSTEM_PROMPT
    },
    ...chatHistory,
    {
      role: "user",
      content: currentMessage,
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CHATGPT_MODEL,
      messages,
      store: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new AppError(
      ErrorCodes.INVALID_OPENAI_RESPONSE,
      `OpenAI API error: ${error?.error?.message || response.statusText}`
    );
  }

  const data = await response.json() as ChatResponse;
  return data;
}