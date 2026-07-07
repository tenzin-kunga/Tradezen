import { ChatOpenAI } from '@langchain/openai';

export function normalizeAiBaseUrl(url: string): string {
  const stripped = url.replace(/\/+$/, '');
  return stripped.endsWith('/v1') ? stripped : `${stripped}/v1`;
}

export function createLLM(model?: string, temperature = 0.7) {
  const raw = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
  return new ChatOpenAI({
    model: model ?? process.env.AI_MODEL ?? 'qwen3:4b',
    temperature,
    configuration: {
      baseURL: normalizeAiBaseUrl(raw),
      defaultHeaders: {},
    },
    apiKey: process.env.AI_SERVICE_API_KEY ?? 'not-needed',
  });
}
