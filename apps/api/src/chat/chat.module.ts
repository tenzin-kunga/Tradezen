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
import { AIClient } from '../ai/ai-client';
import { AiMetricsService } from '../ai/ai-metrics.service';
import { NotificationService } from '../common/services/notification.service';
import { GatewayModule } from '../gateway/gateway.module';
import { ContextModule } from '../ai/context/context.module';
import { ToolsModule } from '../ai/tools/tools.module';
import { UserSettingsModule } from '../user-settings/user-settings.module';
import {
  ConversationStore,
  ChatThreadStore,
} from './conversation/conversation-store';
// ponytail: ChatThreadStore referenced by useClass below; keep import.
import { ConversationRepository } from './conversation/conversation-repository';
import { ConversationPersistenceService } from './conversation/conversation-persistence.service';
import { ConversationHistoryPolicy } from './conversation/conversation-history';

@Module({
  imports: [
    QueuesModule,
    GatewayModule,
    TradesModule,
    ContextModule,
    ToolsModule,
    UserSettingsModule,
  ],
  controllers: [ChatController],
  providers: [
    AiMetricsService,
    AIClient,
    ChatService,
    ChatThreadService,
    { provide: ConversationStore, useClass: ChatThreadStore },
    ConversationRepository,
    ConversationPersistenceService,
    ConversationHistoryPolicy,
    JournalIntelligenceService,
    CoachingEngineService,
    JournalAnalysisWorkflow,
    CoachingWorkflow,
    NotificationService,
  ],
  exports: [
    AiMetricsService,
    AIClient,
    ChatService,
    ChatThreadService,
    JournalIntelligenceService,
    NotificationService,
  ],
})
export class ChatModule {}
