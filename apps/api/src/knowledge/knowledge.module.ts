import { Module, forwardRef } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentEmbedder } from './indexing/embedder';
import { EmbeddingService } from '../ai/embedding.service';
import { RetrievalModule } from './retrieval/retrieval.module';

@Module({
  imports: [forwardRef(() => RetrievalModule)],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, DocumentEmbedder, EmbeddingService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
