import { Module, forwardRef } from '@nestjs/common';
import { RetrievalController } from './retrieval.controller';
import { KnowledgeRetrievalService } from './retrieval.service';
import { EmbeddingService } from '../../ai/embedding.service';
import { KnowledgeModule } from '../knowledge.module';
import { SemanticModule } from '../../ai/context/semantic/semantic.module';

@Module({
  imports: [forwardRef(() => KnowledgeModule), SemanticModule],
  controllers: [RetrievalController],
  providers: [KnowledgeRetrievalService, EmbeddingService],
  exports: [KnowledgeRetrievalService],
})
export class RetrievalModule {}
