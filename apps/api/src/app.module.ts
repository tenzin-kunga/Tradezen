import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { Request } from 'express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TradesModule } from './trades/trades.module';
import { AuthModule } from './auth/auth.module';
import { JournalsModule } from './journals/journals.module';
import { TagsModule } from './tags/tags.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { SeedModule } from './seed/seed.module';
import { GatewayModule } from './gateway/gateway.module';
import { QueuesModule } from './queues/queues.module';
import { ReportModule } from './reports/report.module';
import { NewsModule } from './news/news.module';
import { SymbolsModule } from './symbols/symbols.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { ThrottlerEventsGuard } from './common/guards/throttler.guard';
import { SnapshotService } from './analytics/snapshot.service';
import { BehavioralService } from './analytics/behavioral.service';
import { EventPublisherService } from './common/services/event-publisher.service';
import { EventSubscriberService } from './common/services/event-subscriber.service';
import { EmbeddingService } from './ai/embedding.service';
import { MemoryService } from './ai/memory.service';
import { JournalAnalysisWorkflow } from './ai/workflows/journal-analysis.workflow';
import { CoachingWorkflow } from './ai/workflows/coaching.workflow';
import { CoachingEngineService } from './ai/coaching-engine.service';
import { AiInsightsService } from './ai/ai-insights.service';
import { AiController } from './ai/ai.controller';
import { NotificationService } from './common/services/notification.service';
import { NotificationTriggersService } from './common/services/notification-triggers.service';
import { JournalsService } from './journals/journals.service';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              },
        customProps: (req: Request) => ({
          requestId: req.id,
        }),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers.set-cookie',
          ],
          censor: '**REDACTED**',
        },
      },
    }),
    AuthModule,
    TradesModule,
    JournalsModule,
    TagsModule,
    ChatModule,
    GatewayModule,
    QueuesModule,
    ReportModule,
    SearchModule,
    SeedModule,
    NewsModule,
    SymbolsModule,
    WatchlistModule,
    KnowledgeModule,
  ],
  controllers: [AppController, AiController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerEventsGuard },
    SnapshotService,
    BehavioralService,
    EventPublisherService,
    EventSubscriberService,
    EmbeddingService,
    MemoryService,
    JournalAnalysisWorkflow,
    CoachingWorkflow,
    CoachingEngineService,
    AiInsightsService,
    NotificationService,
    NotificationTriggersService,
    JournalsService,
  ],
  exports: [
    SnapshotService,
    BehavioralService,
    EventPublisherService,
    EventSubscriberService,
    EmbeddingService,
    MemoryService,
    JournalAnalysisWorkflow,
    CoachingWorkflow,
    CoachingEngineService,
    AiInsightsService,
    NotificationService,
    NotificationTriggersService,
    JournalsService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
