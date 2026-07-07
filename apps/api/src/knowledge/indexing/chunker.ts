export interface ChunkingConfig {
  chunkSize: number;
  overlap: number;
  separatorPriority: string[];
  minimumChunk: number;
  maximumChunk: number;
}

export interface TextChunk {
  index: number;
  content: string;
  startOffset: number;
  endOffset: number;
}

const DEFAULT_CONFIG: ChunkingConfig = {
  chunkSize: 512,
  overlap: 50,
  separatorPriority: ["\n\n", "\n", ". ", " "],
  minimumChunk: 100,
  maximumChunk: 1024,
};

export function chunkText(
  text: string,
  config: Partial<ChunkingConfig> = {},
): TextChunk[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (text.length <= cfg.chunkSize) {
    return [
      {
        index: 0,
        content: text,
        startOffset: 0,
        endOffset: text.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = Math.min(start + cfg.chunkSize, text.length);

    // Try to break at a separator if not at the end
    if (end < text.length) {
      let bestBreak = -1;
      for (const sep of cfg.separatorPriority) {
        const searchStart = Math.max(start + cfg.minimumChunk, end - 100);
        const lastSep = text.lastIndexOf(sep, end);
        if (lastSep > searchStart) {
          bestBreak = lastSep + sep.length;
          break;
        }
      }
      if (bestBreak > start + cfg.minimumChunk) {
        end = bestBreak;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= cfg.minimumChunk || end >= text.length) {
      chunks.push({
        index,
        content: chunk,
        startOffset: start,
        endOffset: end,
      });
      index++;
    }

    // Move start forward, accounting for overlap
    start = end - cfg.overlap;
    if (start <= (chunks[chunks.length - 1]?.startOffset ?? 0)) {
      start = end;
    }
  }

  return chunks;
}

export function computeContentHash(content: string): string {
  // Simple hash for dedup — not cryptographic, just fast
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}
