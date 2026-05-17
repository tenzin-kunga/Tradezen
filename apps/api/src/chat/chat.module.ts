import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatThreadService } from './chat-thread.service';
import { JournalIntelligenceService } from '../ai/journal-intelligence.service';
import { CoachingEngineService } from '../ai/coaching-engine.service';
import { QueuesModule } from '../queues/queues.module';
import { JournalAnalysisWorkflow } from '../ai/workflows/journal-analysis.workflow';
import { EmbeddingService } from '../ai/embedding.service';
import { NotificationService } from '../common/services/notification.service';

@Module({
  imports: [QueuesModule],
  controllers: [ChatController],
  providers: [ChatService, ChatThreadService, JournalIntelligenceService, CoachingEngineService, JournalAnalysisWorkflow, EmbeddingService, NotificationService],
  exports: [ChatService, ChatThreadService, JournalIntelligenceService, NotificationService],
})
export class ChatModule {}
