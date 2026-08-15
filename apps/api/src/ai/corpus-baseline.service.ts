import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { sql } from 'drizzle-orm';

export const CORPUS_SOURCE_TYPES = [
  'trade',
  'journal',
  'knowledge_document',
  'research_project',
  'research_document',
  'ai_insight',
  'coaching',
] as const;

export type CorpusSourceType = (typeof CORPUS_SOURCE_TYPES)[number];

export interface SourceBaseline {
  sourceType: string;
  sourceCount: number;
  corpusCount: number;
  distinctSources: number;
  missing: string[];
  orphaned: string[];
  duplicateChunkRows: number;
}

export interface CorpusBaseline {
  userId: string;
  generatedAt: string;
  perSource: SourceBaseline[];
  totals: {
    sourceCount: number;
    corpusCount: number;
    missing: number;
    orphaned: number;
    duplicateChunkRows: number;
  };
}

interface Row {
  [key: string]: unknown;
}

/** db.execute returns a postgres.js Result (array-like rows), not { rows }. */
export const rowsOf = (result: unknown): Row[] => Array.from(result as Row[]);

/**
 * Reconciliation baseline (plan §16/§18.10): compares source rows against the
 * `embeddings` corpus per user, reporting missing / orphaned / duplicate chunks.
 * Slice 11 turns this into a permanent, scheduled, observable mechanism.
 */
@Injectable()
export class CorpusBaselineService {
  private readonly logger = new Logger(CorpusBaselineService.name);

  async listUserIds(): Promise<string[]> {
    const result = await db.execute(sql`
      SELECT DISTINCT user_id::text FROM embeddings
      UNION
      SELECT DISTINCT user_id FROM ai_documents
    `);
    return rowsOf(result).map((r) => String(r.user_id));
  }

  async validate(userId: string): Promise<CorpusBaseline> {
    const [corpusStats, duplicates, corpusSources] = await Promise.all([
      db.execute(sql`
        SELECT source_type, COUNT(*)::int AS corpus_count,
               COUNT(DISTINCT source_id)::int AS distinct_sources
        FROM embeddings WHERE user_id = ${userId}
        GROUP BY source_type
      `),
      db.execute(sql`
        SELECT source_type, source_id, chunk_index, COUNT(*)::int AS n
        FROM embeddings WHERE user_id = ${userId}
        GROUP BY source_type, source_id, chunk_index
        HAVING COUNT(*) > 1
      `),
      db.execute(sql`
        SELECT DISTINCT source_type, source_id FROM embeddings
        WHERE user_id = ${userId}
      `),
    ]);

    const corpusByType = new Map<string, Row[]>();
    for (const row of rowsOf(corpusSources)) {
      const type = String(row.source_type);
      const list = corpusByType.get(type) ?? [];
      list.push(row);
      corpusByType.set(type, list);
    }

    const perSource: SourceBaseline[] = [];
    for (const sourceType of CORPUS_SOURCE_TYPES) {
      const sourceIds = await this.listSourceIds(userId, sourceType);
      const sourceIdSet = new Set(sourceIds);
      const corpusRows = corpusByType.get(sourceType) ?? [];
      const corpusIdSet = new Set(corpusRows.map((r) => String(r.source_id)));

      const missing = sourceIds.filter((id) => !corpusIdSet.has(id));
      const orphaned = corpusRows
        .map((r) => String(r.source_id))
        .filter((id) => !sourceIdSet.has(id));

      const stat = rowsOf(corpusStats).find(
        (r) => r.source_type === sourceType,
      );

      perSource.push({
        sourceType,
        sourceCount: sourceIds.length,
        corpusCount: stat ? Number(stat.corpus_count) : 0,
        distinctSources: stat ? Number(stat.distinct_sources) : 0,
        missing,
        orphaned,
        duplicateChunkRows: rowsOf(duplicates).filter(
          (r) => r.source_type === sourceType,
        ).length,
      });
    }

    const totals = perSource.reduce(
      (acc, s) => ({
        sourceCount: acc.sourceCount + s.sourceCount,
        corpusCount: acc.corpusCount + s.corpusCount,
        missing: acc.missing + s.missing.length,
        orphaned: acc.orphaned + s.orphaned.length,
        duplicateChunkRows: acc.duplicateChunkRows + s.duplicateChunkRows,
      }),
      {
        sourceCount: 0,
        corpusCount: 0,
        missing: 0,
        orphaned: 0,
        duplicateChunkRows: 0,
      },
    );

    return {
      userId,
      generatedAt: new Date().toISOString(),
      perSource,
      totals,
    };
  }

  /** Source-of-truth rows for a given corpus source type (plan §16 source identity). */
  private async listSourceIds(
    userId: string,
    sourceType: CorpusSourceType,
  ): Promise<string[]> {
    const queries: Record<CorpusSourceType, ReturnType<typeof sql>> = {
      trade: sql`SELECT id FROM trades WHERE user_id = ${userId}`,
      journal: sql`SELECT id FROM journals WHERE user_id = ${userId}`,
      knowledge_document: sql`SELECT id FROM knowledge_documents WHERE user_id = ${userId}`,
      research_project: sql`SELECT id FROM research_projects WHERE user_id = ${userId}`,
      research_document: sql`SELECT id FROM assets WHERE uploaded_by = ${userId}`,
      ai_insight: sql`SELECT id FROM ai_insights WHERE user_id = ${userId}`,
      coaching: sql`SELECT id FROM coaching_sessions WHERE user_id = ${userId}`,
    };
    const result = await db.execute(queries[sourceType]);
    return rowsOf(result).map((r) => String(r.id));
  }
}
