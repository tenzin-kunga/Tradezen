import type { SemanticDocument, SemanticSourceType } from '../types';
import type { SemanticFormatter } from './types';
import { SemanticSourceType as ST } from '../types';

interface KnowledgeDocumentEntity {
  id: string;
  title: string;
  content: string | null;
  docType: string;
  status: string;
  currentVersion: number;
  aiSummary: string | null;
  frontmatter: Record<string, unknown>;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class KnowledgeDocumentFormatter implements SemanticFormatter<KnowledgeDocumentEntity> {
  supports(sourceType: SemanticSourceType): boolean {
    return sourceType === ST.KNOWLEDGE_DOCUMENT;
  }

  format(entity: KnowledgeDocumentEntity, userId: string): SemanticDocument {
    const parts: Array<string | null> = [entity.content];
    if (entity.aiSummary) {
      parts.push(`\nAI Summary:\n${entity.aiSummary}`);
    }
    if (entity.docType && entity.docType !== 'note') {
      parts.push(`\nType: ${entity.docType}`);
    }

    return {
      id: entity.id,
      userId,
      sourceType: ST.KNOWLEDGE_DOCUMENT,
      title: entity.title,
      content: parts.filter(Boolean).join('\n'),
      metadata: {
        docType: entity.docType,
        status: entity.status,
        currentVersion: entity.currentVersion,
        frontmatter: entity.frontmatter,
      },
      provenance: {
        source: 'knowledge',
        entity: 'knowledge_document',
        operation: 'create',
        version: entity.currentVersion,
      },
      createdAt: entity.createdAt?.toISOString(),
      updatedAt: entity.updatedAt?.toISOString(),
    };
  }
}
