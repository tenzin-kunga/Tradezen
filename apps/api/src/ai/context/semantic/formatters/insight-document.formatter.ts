import type { SemanticDocument, SemanticSourceType } from '../types';
import type { SemanticFormatter } from './types';
import { SemanticSourceType as ST } from '../types';

interface InsightEntity {
  id: string;
  insightType: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt?: Date | null;
}

export class InsightDocumentFormatter implements SemanticFormatter<InsightEntity> {
  supports(sourceType: SemanticSourceType): boolean {
    return sourceType === ST.AI_INSIGHT;
  }

  format(entity: InsightEntity, userId: string): SemanticDocument {
    return {
      id: entity.id,
      userId,
      sourceType: ST.AI_INSIGHT,
      title: `Insight ${entity.insightType}`,
      content: entity.content,
      metadata: {
        ...(entity.metadata ?? {}),
        insightType: entity.insightType,
      },
      provenance: {
        source: 'journal_intelligence',
        entity: 'ai_insight',
        operation: 'create',
      },
      createdAt: entity.createdAt?.toISOString(),
    };
  }
}
