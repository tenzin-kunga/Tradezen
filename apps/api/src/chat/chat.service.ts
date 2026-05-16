import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';

type OpenRouterStreamHandlers = {
  onToken: (token: string) => void;
  onDone: () => void;
};

@Injectable()
export class ChatService {
  private readonly baseUrl =
    process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
  private readonly defaultModel =
    process.env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-4o-mini';
  private readonly availableModels = this.parseAvailableModels();

  getModels() {
    return {
      defaultModel: this.defaultModel,
      models: this.availableModels,
    };
  }

  async streamChat(
    userId: string,
    dto: CreateChatDto,
    signal: AbortSignal | undefined,
    handlers: OpenRouterStreamHandlers,
  ) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OpenRouter API key is not configured',
      );
    }

    if (dto.messages.length === 0) {
      throw new BadRequestException('At least one chat message is required');
    }

    const requestedModel = (dto.model ?? this.defaultModel).trim();
    const modelCandidates = this.buildModelCandidates(requestedModel);
    const systemPrompt = dto.systemPrompt?.trim();
    const messages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...dto.messages]
      : dto.messages;
    let lastError: string | null = null;

    for (const model of modelCandidates) {
      if (signal?.aborted) {
        return;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:3000',
          'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'TradeZen',
        },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: dto.temperature ?? 0.4,
          messages,
        }),
      });

      if (response.ok && response.body) {
        await this.consumeOpenRouterStream(response.body, handlers, signal);
        return;
      }

      const errorBody = await response.text().catch(() => '');
      lastError = `OpenRouter request failed (${response.status}): ${errorBody || response.statusText}`;
      const isUnavailableModel = this.isMissingEndpointError(
        response.status,
        errorBody,
      );
      const hasFallback = model !== modelCandidates[modelCandidates.length - 1];

      if (isUnavailableModel && hasFallback) {
        continue;
      }

      throw new BadGatewayException(lastError);
    }

    throw new BadGatewayException(lastError ?? 'OpenRouter request failed');
  }

  private async consumeOpenRouterStream(
    body: ReadableStream<Uint8Array>,
    handlers: OpenRouterStreamHandlers,
    signal?: AbortSignal,
  ) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (signal?.aborted) {
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') {
            handlers.onDone();
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            const token = parsed?.choices?.[0]?.delta?.content;
            if (typeof token === 'string' && token.length > 0) {
              handlers.onToken(token);
            }
          } catch {
            // Skip malformed stream chunks and continue processing.
          }
        }
      }

      handlers.onDone();
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }

  private parseAvailableModels() {
    const configured = process.env.OPENROUTER_AVAILABLE_MODELS;
    if (!configured?.trim()) {
      return [this.defaultModel];
    }

    const parsed = configured
      .split(',')
      .map((model) => model.trim())
      .filter((model) => model.length > 0);

    if (parsed.length === 0) {
      return [this.defaultModel];
    }

    return parsed.includes(this.defaultModel)
      ? parsed
      : [this.defaultModel, ...parsed];
  }

  private buildModelCandidates(requestedModel: string) {
    const candidates = [
      requestedModel,
      this.defaultModel,
      ...this.availableModels,
    ];
    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const candidate of candidates) {
      if (!candidate || seen.has(candidate)) continue;
      seen.add(candidate);
      deduped.push(candidate);
    }

    return deduped;
  }

  private isMissingEndpointError(status: number, errorBody: string) {
    if (status !== 404) return false;
    return /No endpoints found for/i.test(errorBody);
  }
}
