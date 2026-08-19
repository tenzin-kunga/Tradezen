import { Module, forwardRef } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeEnrichmentService } from './knowledge-enrichment.service';
import { AIClient } from '../ai/ai-client';
import { AiMetricsService } from '../ai/ai-metrics.service';
import { AssetsModule } from '../assets/assets.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { SemanticModule } from '../ai/context/semantic/semantic.module';

@Module({
  imports: [forwardRef(() => RetrievalModule), AssetsModule, SemanticModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeEnrichmentService,
    AIClient,
    AiMetricsService,
  ],
  exports: [KnowledgeService, KnowledgeEnrichmentService],
})
export class KnowledgeModule {}
