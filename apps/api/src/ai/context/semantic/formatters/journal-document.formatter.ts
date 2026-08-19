import type { SemanticDocument, SemanticSourceType } from '../types';
import type { SemanticFormatter } from './types';
import { SemanticSourceType as ST } from '../types';

interface JournalEntity {
  id: string;
  date: string;
  preMarketNotes: string | null;
  postMarketNotes: string | null;
  mood: string | null;
  marketConditions: string | null;
  lessons: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class JournalDocumentFormatter implements SemanticFormatter<JournalEntity> {
  supports(sourceType: SemanticSourceType): boolean {
    return sourceType === ST.JOURNAL;
  }

  format(entity: JournalEntity, userId: string): SemanticDocument {
    const content = [
      entity.preMarketNotes,
      entity.postMarketNotes,
      entity.lessons,
      entity.mood,
      entity.marketConditions,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      id: entity.id,
      userId,
      sourceType: ST.JOURNAL,
      title: `Journal ${entity.date}`,
      content,
      metadata: {
        date: entity.date,
        mood: entity.mood,
        marketConditions: entity.marketConditions,
      },
      provenance: {
        source: 'journals',
        entity: 'journal',
        operation: 'create',
      },
      createdAt: entity.createdAt?.toISOString(),
      updatedAt: entity.updatedAt?.toISOString(),
    };
  }
}
