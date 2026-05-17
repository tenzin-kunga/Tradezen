import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatThreadService } from './chat-thread.service';
import { JournalIntelligenceService } from '../ai/journal-intelligence.service';
import { QueuesModule } from '../queues/queues.module';
import { JournalAnalysisWorkflow } from '../ai/workflows/journal-analysis.workflow';
import { EmbeddingService } from '../ai/embedding.service';

@Module({
  imports: [QueuesModule],
  controllers: [ChatController],
  providers: [ChatService, ChatThreadService, JournalIntelligenceService, JournalAnalysisWorkflow, EmbeddingService],
  exports: [ChatService, ChatThreadService, JournalIntelligenceService],
})
export class ChatModule {}
