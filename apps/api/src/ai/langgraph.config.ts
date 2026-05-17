import { ChatOpenAI } from '@langchain/openai';

export function createLLM(model?: string, temperature = 0.7) {
  return new ChatOpenAI({
    model:
      model ??
      process.env.OPENROUTER_DEFAULT_MODEL ??
      'openai/gpt-oss-120b:free',
    temperature,
    configuration: {
      baseURL:
        process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer':
          process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'TradeZen',
      },
    },
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}
