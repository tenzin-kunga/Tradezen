import { Module } from '@nestjs/common';
import { ContextBuilderService } from './context-builder.service';
import { TradesProvider } from './providers/trades.provider';
import { AnalyticsProvider } from './providers/analytics.provider';
import { ResearchProvider } from './providers/research.provider';
import { DocumentsProvider } from './providers/documents.provider';
import { PortfolioProvider } from './providers/portfolio.provider';
import { NewsProvider } from './providers/news.provider';
import { MemoryProvider } from './semantic/memory-provider';
import { SemanticModule } from './semantic/semantic.module';
import { QueryPlanner } from './query-planner';

@Module({
  imports: [SemanticModule],
  providers: [
    ContextBuilderService,
    QueryPlanner,
    TradesProvider,
    AnalyticsProvider,
    ResearchProvider,
    DocumentsProvider,
    PortfolioProvider,
    NewsProvider,
    MemoryProvider,
  ],
  exports: [ContextBuilderService, SemanticModule],
})
export class ContextModule {}
