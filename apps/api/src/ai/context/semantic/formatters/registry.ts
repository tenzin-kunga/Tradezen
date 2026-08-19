import type { SemanticFormatter } from './types';
import type { SemanticSourceType } from '../types';

export class FormatterRegistry {
  private formatters: SemanticFormatter[] = [];

  register(formatter: SemanticFormatter): void {
    this.formatters.push(formatter);
  }

  get(sourceType: SemanticSourceType): SemanticFormatter | undefined {
    return this.formatters.find((f) => f.supports(sourceType));
  }
}
