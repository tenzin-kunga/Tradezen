import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AIClient, ChatMessage } from '../ai/ai-client';
import { AIServiceUnavailableError, AITimeoutError } from '../ai/ai-errors';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatRole } from './dto/chat-message.dto';

type StreamHandlers = {
  onToken: (token: string) => void;
  onDone: () => void;
};

@Injectable()
export class ChatService {
  private readonly defaultModel =
    process.env.AI_MODEL ?? 'qwen3:latest';

  constructor(private readonly aiClient: AIClient) {}

  getModels() {
    return {
      defaultModel: this.defaultModel,
      models: [this.defaultModel],
    };
  }

  async streamChat(
    userId: string,
    dto: CreateChatDto,
    signal: AbortSignal | undefined,
    handlers: StreamHandlers,
  ) {
    if (dto.messages.length === 0) {
      throw new BadRequestException('At least one chat message is required');
    }

    const systemPrompt = dto.systemPrompt?.trim();
    const messages: ChatMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...dto.messages as ChatMessage[]]
      : (dto.messages as ChatMessage[]);

    try {
      const stream = this.aiClient.stream(messages, {
        model: dto.model?.trim() || this.defaultModel,
        temperature: dto.temperature ?? 0.4,
        signal,
      });

      for await (const token of stream) {
        if (signal?.aborted) return;
        handlers.onToken(token);
      }
      handlers.onDone();
    } catch (error) {
      if (error instanceof AIServiceUnavailableError) {
        throw new ServiceUnavailableException('AI service is unavailable');
      }
      if (error instanceof AITimeoutError) {
        throw new RequestTimeoutException('AI service request timed out');
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`AI service error: ${msg}`);
    }
  }
}
