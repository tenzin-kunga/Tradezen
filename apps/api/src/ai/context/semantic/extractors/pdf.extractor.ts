import type { TextExtractor, ExtractionResult } from './text-extractor';
import { normalize } from '../normalizer';

export class PdfExtractor implements TextExtractor {
  supports(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async extract(file: Buffer): Promise<ExtractionResult> {
    try {
      // Dynamic import to avoid hard dependency at module load time
      const pdfParse = (
        (await import('pdf-parse')) as unknown as {
          default: (
            buffer: Buffer,
          ) => Promise<{ text: string; numpages: number }>;
        }
      ).default;
      const result = await pdfParse(file);
      const text = normalize(result.text);
      return {
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        language: 'en',
        warnings: result.numpages > 0 ? [] : ['PDF had no parseable pages'],
      };
    } catch (e) {
      return {
        text: '',
        wordCount: 0,
        language: 'en',
        warnings: [
          `PDF extraction failed: ${e instanceof Error ? e.message : String(e)}`,
        ],
      };
    }
  }
}
