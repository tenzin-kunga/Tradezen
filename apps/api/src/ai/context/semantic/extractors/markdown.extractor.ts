import type { TextExtractor, ExtractionResult } from './text-extractor';
import { normalize } from '../normalizer';

export class MarkdownExtractor implements TextExtractor {
  supports(mimeType: string): boolean {
    return mimeType === 'text/markdown' || mimeType === 'text/x-markdown';
  }

  extract(file: Buffer): Promise<ExtractionResult> {
    const raw = file.toString('utf-8');
    // Strip markdown syntax: headers, links, emphasis, code blocks, images
    const text = normalize(
      raw
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/^>\s+/gm, '')
        .replace(/^---+$/gm, ''),
    );
    return Promise.resolve({
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      language: 'en',
      warnings: [],
    });
  }
}
