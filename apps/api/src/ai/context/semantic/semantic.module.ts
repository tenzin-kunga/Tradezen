import { Module } from '@nestjs/common';
import { PostgresEmbeddingRepository } from './embedding-repository';
import { ImmediateEmbeddingPipeline } from './embedding-pipeline';
import { ProfileRegistry } from './profile-registry';
import { SemanticRetrievalService } from './semantic-retrieval.service';
import { SemanticMetricsService } from './semantic-metrics.service';
import { MemoryProvider } from './memory-provider';
import { RetrievalClient } from '../../retrieval-client';
import { FormatterRegistry } from './formatters/registry';
import { ResearchProjectFormatter } from './formatters/research-project-formatter';
import { ResearchDocumentFormatter } from './formatters/research-document.formatter';
import { TradeDocumentFormatter } from './formatters/trade-document.formatter';
import { JournalDocumentFormatter } from './formatters/journal-document.formatter';
import { KnowledgeDocumentFormatter } from './formatters/knowledge-document.formatter';
import { CoachingDocumentFormatter } from './formatters/coaching-document.formatter';
import { InsightDocumentFormatter } from './formatters/insight-document.formatter';
import { ExtractorRegistry } from './extractors/registry';
import { PlainTextExtractor } from './extractors/plain-text.extractor';
import { PdfExtractor } from './extractors/pdf.extractor';
import { DocxExtractor } from './extractors/docx.extractor';
import { MarkdownExtractor } from './extractors/markdown.extractor';
import { QueuesModule } from '../../../queues/queues.module';

const formatterRegistry = new FormatterRegistry();
formatterRegistry.register(new ResearchProjectFormatter());
formatterRegistry.register(new ResearchDocumentFormatter());
formatterRegistry.register(new TradeDocumentFormatter());
formatterRegistry.register(new JournalDocumentFormatter());
formatterRegistry.register(new KnowledgeDocumentFormatter());
formatterRegistry.register(new CoachingDocumentFormatter());
formatterRegistry.register(new InsightDocumentFormatter());

const extractorRegistry = new ExtractorRegistry();
extractorRegistry.register(new PlainTextExtractor());
extractorRegistry.register(new PdfExtractor());
extractorRegistry.register(new DocxExtractor());
extractorRegistry.register(new MarkdownExtractor());

@Module({
  imports: [QueuesModule],
  providers: [
    { provide: 'EmbeddingRepository', useClass: PostgresEmbeddingRepository },
    { provide: 'EmbeddingPipeline', useClass: ImmediateEmbeddingPipeline },
    { provide: FormatterRegistry, useValue: formatterRegistry },
    { provide: ExtractorRegistry, useValue: extractorRegistry },
    ProfileRegistry,
    SemanticMetricsService,
    SemanticRetrievalService,
    MemoryProvider,
    RetrievalClient,
  ],
  exports: [
    'EmbeddingRepository',
    'EmbeddingPipeline',
    FormatterRegistry,
    ExtractorRegistry,
    SemanticMetricsService,
    SemanticRetrievalService,
    MemoryProvider,
    RetrievalClient,
  ],
})
export class SemanticModule {}
