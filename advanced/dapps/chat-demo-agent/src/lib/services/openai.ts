import { CHATGPT_MODEL, SYSTEM_PROMPT } from '@/config/constants';
import { OpenAI } from 'openai';

export class OpenAIService {
  private client: OpenAI;
  private static instance: OpenAIService;

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.client = new OpenAI({ apiKey });
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async getResponse(
    currentMessage: string,
    chatHistory: Array<{ role: 'system' | 'user'; content: string }>
  ) {
    return this.client.chat.completions.create({
      model: CHATGPT_MODEL,
      messages: [
        { 
          role: "system", 
          content: SYSTEM_PROMPT
        },
        ...chatHistory,
        {
          role: "user",
          content: currentMessage,
        },
      ],
    });
  }
}