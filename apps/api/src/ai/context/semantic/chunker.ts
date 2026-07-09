export interface Chunk {
  index: number;
  content: string;
  startOffset: number;
  endOffset: number;
}

export interface ChunkingStrategy {
  chunk(content: string): Chunk[];
}

const DEFAULT_CONFIG = {
  chunkSize: 512,
  overlap: 50,
  separatorPriority: ['\n\n', '\n', '. ', ' '],
  minimumChunk: 100,
  maximumChunk: 1024,
};

export class DefaultChunkingStrategy implements ChunkingStrategy {
  chunk(text: string): Chunk[] {
    const cfg = DEFAULT_CONFIG;

    if (text.length <= cfg.chunkSize) {
      return [
        { index: 0, content: text, startOffset: 0, endOffset: text.length },
      ];
    }

    const chunks: Chunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      let end = Math.min(start + cfg.chunkSize, text.length);

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

      start = end - cfg.overlap;
      if (start <= (chunks[chunks.length - 1]?.startOffset ?? 0)) {
        start = end;
      }
    }

    return chunks;
  }
}
