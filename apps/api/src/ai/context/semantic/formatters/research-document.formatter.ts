import type { SemanticDocument, SemanticSourceType } from '../types';
import type { SemanticFormatter } from './types';
import { SemanticSourceType as ST } from '../types';

export interface ResearchDocumentEntity {
  id: string;
  fileName: string | null;
  text: string;
  wordCount: number;
  category: string;
  projectId: string;
  createdAt?: Date | null;
}

export class ResearchDocumentFormatter implements SemanticFormatter<ResearchDocumentEntity> {
  supports(sourceType: SemanticSourceType): boolean {
    return sourceType === ST.RESEARCH_DOCUMENT;
  }

  format(entity: ResearchDocumentEntity, userId: string): SemanticDocument {
    return {
      id: entity.id,
      userId,
      sourceType: ST.RESEARCH_DOCUMENT,
      title: entity.fileName ?? 'Untitled',
      content: entity.text,
      metadata: {
        category: entity.category,
        projectId: entity.projectId,
        wordCount: entity.wordCount,
      },
      provenance: {
        source: 'research',
        entity: 'research_document',
        operation: 'create',
      },
      createdAt: entity.createdAt?.toISOString(),
    };
  }
}
