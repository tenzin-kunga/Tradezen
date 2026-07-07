import { Module } from "@nestjs/common";
import { RetrievalController } from "./retrieval.controller";
import { KnowledgeRetrievalService } from "./retrieval.service";
import { DocumentEmbedder } from "../indexing/embedder";
import { KnowledgeIndexingWorker } from "../indexing/worker";
import { EmbeddingService } from "../../ai/embedding.service";
import { KnowledgeModule } from "../knowledge.module";

@Module({
  imports: [KnowledgeModule],
  controllers: [RetrievalController],
  providers: [
    KnowledgeRetrievalService,
    DocumentEmbedder,
    KnowledgeIndexingWorker,
    EmbeddingService,
  ],
  exports: [KnowledgeRetrievalService, DocumentEmbedder, KnowledgeIndexingWorker],
})
export class RetrievalModule {}
