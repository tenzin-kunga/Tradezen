import type { SemanticDocument, SemanticSourceType } from '../types';

export interface SemanticFormatter<T = any> {
  supports(sourceType: SemanticSourceType): boolean;
  format(entity: T, userId: string): SemanticDocument;
}
