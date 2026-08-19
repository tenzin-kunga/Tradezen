import type { SemanticResult } from './types';
import type { ContextBlock } from '../context-provider';

export interface MemoryFormatter {
  format(results: SemanticResult[]): ContextBlock;
}

export class DefaultMemoryFormatter implements MemoryFormatter {
  format(results: SemanticResult[]): ContextBlock {
    if (results.length === 0) {
      return {
        source: 'memory',
        title: 'Semantic Memory (0 results)',
        priority: 15,
        freshness: new Date(),
        tokens: 10,
        content: 'No relevant memories found.',
      };
    }

    const lines = results.map(
      (r) =>
        `- [${r.sourceType}] ${r.title} (similarity: ${r.similarity.toFixed(2)})\n  ${r.content.slice(0, 200)}`,
    );

    const content = `Semantic Memory (${results.length} results)\n${lines.join('\n')}`;

    return {
      source: 'memory',
      title: `Semantic Memory (${results.length} results)`,
      priority: 15,
      freshness: new Date(),
      tokens: Math.ceil(content.split(/\s+/).length * 1.3),
      content,
    };
  }
}
