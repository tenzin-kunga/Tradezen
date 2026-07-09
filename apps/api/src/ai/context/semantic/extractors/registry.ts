import type { TextExtractor } from './text-extractor';

export class ExtractorRegistry {
  private extractors: TextExtractor[] = [];

  register(extractor: TextExtractor): void {
    this.extractors.push(extractor);
  }

  get(mimeType: string): TextExtractor | undefined {
    return this.extractors.find((e) => e.supports(mimeType));
  }
}
