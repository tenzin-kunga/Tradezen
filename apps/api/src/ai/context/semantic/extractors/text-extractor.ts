export interface ExtractionResult {
  text: string;
  wordCount: number;
  language: string;
  warnings: string[];
}

export interface TextExtractor {
  supports(mimeType: string): boolean;
  extract(file: Buffer): Promise<ExtractionResult>;
}
