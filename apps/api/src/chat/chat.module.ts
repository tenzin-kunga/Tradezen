import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatThreadService } from './chat-thread.service';
import { JournalIntelligenceService } from '../ai/journal-intelligence.service';
import { CoachingEngineService } from '../ai/coaching-engine.service';
import { QueuesModule } from '../queues/queues.module';
import { TradesModule } from '../trades/trades.module';
import { JournalAnalysisWorkflow } from '../ai/workflows/journal-analysis.workflow';
import { CoachingWorkflow } from '../ai/workflows/coaching.workflow';
import { EmbeddingService } from '../ai/embedding.service';
import { NotificationService } from '../common/services/notification.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [QueuesModule, GatewayModule, TradesModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatThreadService,
    JournalIntelligenceService,
    CoachingEngineService,
    JournalAnalysisWorkflow,
    CoachingWorkflow,
    EmbeddingService,
    NotificationService,
  ],
  exports: [
    ChatService,
    ChatThreadService,
    JournalIntelligenceService,
    NotificationService,
  ],
})
export class ChatModule {}
