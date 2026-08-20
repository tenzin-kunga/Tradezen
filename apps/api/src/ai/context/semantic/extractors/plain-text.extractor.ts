import type { TextExtractor, ExtractionResult } from './text-extractor';
import { normalize } from '../normalizer';

export class PlainTextExtractor implements TextExtractor {
  supports(mimeType: string): boolean {
    return (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      mimeType === 'text/x-markdown'
    );
  }

  extract(file: Buffer): Promise<ExtractionResult> {
    const text = normalize(file.toString('utf-8'));
    return Promise.resolve({
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      language: 'en',
      warnings: [],
    });
  }
}
