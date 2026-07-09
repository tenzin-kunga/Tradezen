import type { TextExtractor, ExtractionResult } from './text-extractor';
import { normalize } from '../normalizer';

export class DocxExtractor implements TextExtractor {
  supports(mimeType: string): boolean {
    return (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  async extract(file: Buffer): Promise<ExtractionResult> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: file });
      const text = normalize(result.value);
      return {
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        language: 'en',
        warnings: result.messages.map((m) => m.message),
      };
    } catch (e) {
      return {
        text: '',
        wordCount: 0,
        language: 'en',
        warnings: [
          `DOCX extraction failed: ${e instanceof Error ? e.message : String(e)}`,
        ],
      };
    }
  }
}
