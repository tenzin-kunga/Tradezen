import { Module, forwardRef } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeEnrichmentService } from './knowledge-enrichment.service';
import { DocumentEmbedder } from './indexing/embedder';
import { EmbeddingService } from '../ai/embedding.service';
import { AIClient } from '../ai/ai-client';
import { AiMetricsService } from '../ai/ai-metrics.service';
import { AssetsModule } from '../assets/assets.module';
import { RetrievalModule } from './retrieval/retrieval.module';

@Module({
  imports: [forwardRef(() => RetrievalModule), AssetsModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeEnrichmentService,
    DocumentEmbedder,
    EmbeddingService,
    AIClient,
    AiMetricsService,
  ],
  exports: [KnowledgeService, KnowledgeEnrichmentService],
})
export class KnowledgeModule {}
