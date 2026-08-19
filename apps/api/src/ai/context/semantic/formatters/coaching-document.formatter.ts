import type { SemanticDocument, SemanticSourceType } from '../types';
import type { SemanticFormatter } from './types';
import { SemanticSourceType as ST } from '../types';

interface CoachingEntity {
  id: string;
  severity: string;
  triggers: string[];
  message: string;
  createdAt?: Date | null;
}

export class CoachingDocumentFormatter implements SemanticFormatter<CoachingEntity> {
  supports(sourceType: SemanticSourceType): boolean {
    return sourceType === ST.COACHING;
  }

  format(entity: CoachingEntity, userId: string): SemanticDocument {
    return {
      id: entity.id,
      userId,
      sourceType: ST.COACHING,
      title: `Coaching session ${entity.severity}`,
      content: entity.message,
      metadata: {
        severity: entity.severity,
        triggers: entity.triggers,
      },
      provenance: {
        source: 'coaching',
        entity: 'coaching_session',
        operation: 'create',
      },
      createdAt: entity.createdAt?.toISOString(),
    };
  }
}
