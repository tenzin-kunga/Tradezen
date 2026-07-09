import { Module } from '@nestjs/common';
import { PostgresEmbeddingRepository } from './embedding-repository';
import { ImmediateEmbeddingPipeline } from './embedding-pipeline';
import { ProfileRegistry } from './profile-registry';
import { SemanticRetrievalService } from './semantic-retrieval.service';
import { SemanticMetricsService } from './semantic-metrics.service';
import { MemoryProvider } from './memory-provider';
import { FormatterRegistry } from './formatters/registry';
import { ResearchProjectFormatter } from './formatters/research-project-formatter';
import { ExtractorRegistry } from './extractors/registry';
import { PlainTextExtractor } from './extractors/plain-text.extractor';
import { PdfExtractor } from './extractors/pdf.extractor';
import { DocxExtractor } from './extractors/docx.extractor';
import { MarkdownExtractor } from './extractors/markdown.extractor';

const formatterRegistry = new FormatterRegistry();
formatterRegistry.register(new ResearchProjectFormatter());

const extractorRegistry = new ExtractorRegistry();
extractorRegistry.register(new PlainTextExtractor());
extractorRegistry.register(new PdfExtractor());
extractorRegistry.register(new DocxExtractor());
extractorRegistry.register(new MarkdownExtractor());

@Module({
  providers: [
    { provide: 'EmbeddingRepository', useClass: PostgresEmbeddingRepository },
    { provide: 'EmbeddingPipeline', useClass: ImmediateEmbeddingPipeline },
    { provide: FormatterRegistry, useValue: formatterRegistry },
    { provide: ExtractorRegistry, useValue: extractorRegistry },
    ProfileRegistry,
    SemanticMetricsService,
    SemanticRetrievalService,
    MemoryProvider,
  ],
  exports: [
    'EmbeddingRepository',
    'EmbeddingPipeline',
    FormatterRegistry,
    ExtractorRegistry,
    SemanticMetricsService,
    SemanticRetrievalService,
    MemoryProvider,
  ],
})
export class SemanticModule {}
