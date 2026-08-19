import { Injectable, Logger, Inject } from '@nestjs/common';
import { db } from '../db/drizzle';
import { sql } from 'drizzle-orm';
import {
  CorpusBaselineService,
  rowsOf,
  CORPUS_SOURCE_TYPES,
} from './corpus-baseline.service';
import { FormatterRegistry } from './context/semantic/formatters/registry';
import { SemanticSourceType } from './context/semantic/types';
import type { EmbeddingPipeline } from './context/semantic/embedding-pipeline';
import type { SemanticDocument } from './context/semantic/types';

interface ReconciliationOptions {
  userId?: string;
  /** Delete orphaned/duplicate corpus rows. Off by default (non-destructive unless authorized). */
  prune?: boolean;
}

export interface SourceReconciliation {
  sourceType: string;
  sourceCount: number;
  corpusCount: number;
  reenqueued: string[];
  staleReenqueued: string[];
  unrepairable: string[];
  orphaned: string[];
  orphanedPruned: string[];
  duplicateChunkRows: number;
  errors: string[];
}

export interface ReconciliationReport {
  userId: string;
  ranAt: string;
  perSource: SourceReconciliation[];
  totals: {
    sourceCount: number;
    corpusCount: number;
    reenqueued: number;
    staleReenqueued: number;
    unrepairable: number;
    orphaned: number;
    orphanedPruned: number;
    duplicateChunkRows: number;
    errors: number;
  };
}

/**
 * Permanent correctness backstop (plan §16/§18.11): runs the baseline, then
 * re-enqueues missing/stale docs through the canonical pipeline, and prunes
 * orphaned/duplicate corpus rows when explicitly authorized. Events remain the
 * fast path; reconciliation detects and repairs drift. Idempotent (store()
 * removes old rows first), user-scoped, observable via the returned report.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly baseline: CorpusBaselineService,
    private readonly formatterRegistry: FormatterRegistry,
    @Inject('EmbeddingPipeline') private readonly pipeline: EmbeddingPipeline,
  ) {}

  async run(
    options: ReconciliationOptions = {},
  ): Promise<ReconciliationReport[]> {
    const prune = options.prune ?? process.env.RECONCILE_PRUNE === 'true';
    const userIds = options.userId
      ? [options.userId]
      : await this.baseline.listUserIds();

    const reports: ReconciliationReport[] = [];
    for (const userId of userIds) {
      try {
        reports.push(await this.reconcileUser(userId, prune));
      } catch (error) {
        this.logger.error(
          `Reconciliation failed for user ${userId}: ${(error as Error).message}`,
        );
      }
    }

    const totals = reports.reduce(
      (acc, r) => ({
        sourceCount: acc.sourceCount + r.totals.sourceCount,
        corpusCount: acc.corpusCount + r.totals.corpusCount,
        reenqueued: acc.reenqueued + r.totals.reenqueued,
        staleReenqueued: acc.staleReenqueued + r.totals.staleReenqueued,
        unrepairable: acc.unrepairable + r.totals.unrepairable,
        orphaned: acc.orphaned + r.totals.orphaned,
        orphanedPruned: acc.orphanedPruned + r.totals.orphanedPruned,
        duplicateChunkRows:
          acc.duplicateChunkRows + r.totals.duplicateChunkRows,
        errors: acc.errors + r.totals.errors,
      }),
      {
        sourceCount: 0,
        corpusCount: 0,
        reenqueued: 0,
        staleReenqueued: 0,
        unrepairable: 0,
        orphaned: 0,
        orphanedPruned: 0,
        duplicateChunkRows: 0,
        errors: 0,
      },
    );
    this.logger.log(
      `Reconciliation completed: ${reports.length} users, ` +
        `reenqueued=${totals.reenqueued}, stale=${totals.staleReenqueued}, ` +
        `orphaned=${totals.orphaned}, pruned=${totals.orphanedPruned}, ` +
        `duplicates=${totals.duplicateChunkRows}, unrepairable=${totals.unrepairable}`,
    );
    return reports;
  }

  private async reconcileUser(
    userId: string,
    prune: boolean,
  ): Promise<ReconciliationReport> {
    const baseline = await this.baseline.validate(userId);
    const perSource: SourceReconciliation[] = [];

    for (const b of baseline.perSource) {
      const sourceType = b.sourceType as CorpusSourceType;
      const entry: SourceReconciliation = {
        sourceType,
        sourceCount: b.sourceCount,
        corpusCount: b.corpusCount,
        reenqueued: [],
        staleReenqueued: [],
        unrepairable: [],
        orphaned: b.orphaned,
        orphanedPruned: [],
        duplicateChunkRows: b.duplicateChunkRows,
        errors: [],
      };

      for (const id of b.missing) {
        try {
          const doc = await this.rebuild(userId, sourceType, id);
          if (doc) {
            await this.pipeline.enqueue(doc);
            entry.reenqueued.push(id);
          } else {
            entry.unrepairable.push(id);
          }
        } catch (error) {
          entry.errors.push(`${sourceType}:${id}: ${(error as Error).message}`);
        }
      }

      entry.staleReenqueued = await this.reenqueueStale(userId, sourceType);

      if (prune) {
        for (const id of b.orphaned) {
          await db.execute(sql`
            DELETE FROM embeddings
            WHERE user_id = ${userId} AND source_type = ${sourceType} AND source_id = ${id}
          `);
          entry.orphanedPruned.push(id);
        }
        if (b.duplicateChunkRows > 0) {
          await db.execute(sql`
            DELETE FROM embeddings e
            USING embeddings d
            WHERE e.user_id = ${userId}
              AND e.source_type = d.source_type
              AND e.source_id = d.source_id
              AND e.chunk_index = d.chunk_index
              AND e.id > d.id
          `);
        }
      }

      perSource.push(entry);
    }

    const totals = perSource.reduce(
      (acc, s) => ({
        sourceCount: acc.sourceCount + s.sourceCount,
        corpusCount: acc.corpusCount + s.corpusCount,
        reenqueued: acc.reenqueued + s.reenqueued.length,
        staleReenqueued: acc.staleReenqueued + s.staleReenqueued.length,
        unrepairable: acc.unrepairable + s.unrepairable.length,
        orphaned: acc.orphaned + s.orphaned.length,
        orphanedPruned: acc.orphanedPruned + s.orphanedPruned.length,
        duplicateChunkRows: acc.duplicateChunkRows + s.duplicateChunkRows,
        errors: acc.errors + s.errors.length,
      }),
      {
        sourceCount: 0,
        corpusCount: 0,
        reenqueued: 0,
        staleReenqueued: 0,
        unrepairable: 0,
        orphaned: 0,
        orphanedPruned: 0,
        duplicateChunkRows: 0,
        errors: 0,
      },
    );

    return { userId, ranAt: new Date().toISOString(), perSource, totals };
  }

  /** Rebuild a canonical doc for a missing source row; null when not repairable. */
  private async rebuild(
    userId: string,
    sourceType: CorpusSourceType,
    sourceId: string,
  ): Promise<SemanticDocument | null> {
    // research_document content is extracted file text, not stored in source
    // tables — cannot be rebuilt without the original upload.
    if (sourceType === 'research_document') return null;

    const row = await this.loadRow(userId, sourceType, sourceId);
    if (!row) return null;
    const formatter = this.formatterRegistry.get(
      sourceType as SemanticSourceType,
    );
    if (!formatter) return null;
    return formatter.format(row, userId);
  }

  private async reenqueueStale(
    userId: string,
    sourceType: CorpusSourceType,
  ): Promise<string[]> {
    if (sourceType === 'research_document') return [];
    const rows = await this.loadRows(userId, sourceType);
    if (rows.length === 0) return [];

    const corpusUp = new Map<string, number>();
    const res = await db.execute(sql`
      SELECT source_id::text AS source_id, MAX(metadata->>'updatedAt') AS updated_at
      FROM embeddings
      WHERE user_id = ${userId} AND source_type = ${sourceType}
      GROUP BY source_id
    `);
    for (const r of rowsOf(res)) {
      const v = r.updated_at ? new Date(String(r.updated_at)).getTime() : 0;
      corpusUp.set(String(r.source_id), v);
    }

    const stale: string[] = [];
    for (const row of rows as Row[]) {
      const updated = row.updatedAt
        ? new Date(String(row.updatedAt)).getTime()
        : null;
      if (updated !== null && updated > (corpusUp.get(String(row.id)) ?? 0)) {
        const formatter = this.formatterRegistry.get(
          sourceType as SemanticSourceType,
        );
        if (formatter) {
          try {
            await this.pipeline.enqueue(formatter.format(row, userId));
            stale.push(String(row.id));
          } catch (error) {
            this.logger.warn(
              `Reconciliation re-enqueue failed for ${sourceType}:${String(row.id)}: ${(error as Error).message}`,
            );
          }
        }
      }
    }
    return stale;
  }

  /** Fetch one source row shaped like the formatter entity (camelCase). */
  private async loadRow(
    userId: string,
    sourceType: CorpusSourceType,
    id: string,
  ): Promise<Row | null> {
    const rows = await this.loadRows(userId, sourceType);
    return rows.find((r) => String(r.id) === id) ?? null;
  }

  /** Fetch all source rows for a user, shaped like the formatter entity. */
  private async loadRows(
    userId: string,
    sourceType: CorpusSourceType,
  ): Promise<Row[]> {
    const res = await db.execute(this.loaderSql(userId, sourceType));
    const rows = rowsOf(res);
    if (sourceType === 'research_project') {
      return rows.map((r) => ({
        ...r,
        notes: r.note_content
          ? { content: r.note_content, version: r.note_version }
          : null,
        checklist:
          r.thesis_complete !== undefined && r.thesis_complete !== null
            ? {
                thesisComplete: r.thesis_complete,
                valuationComplete: r.valuation_complete,
                risksReviewed: r.risks_reviewed,
                earningsReviewed: r.earnings_reviewed,
              }
            : null,
      }));
    }
    return rows;
  }

  private loaderSql(
    userId: string,
    sourceType: CorpusSourceType,
  ): ReturnType<typeof sql> {
    switch (sourceType) {
      case 'trade':
        return sql`
          SELECT id::text AS id, symbol, direction,
            entry_price::text AS "entryPrice", exit_price::text AS "exitPrice",
            pnl::text AS pnl, strategy, notes,
            lot_size::text AS "lotSize", stop_loss::text AS "stopLoss",
            take_profit::text AS "takeProfit", commission::text AS commission,
            contract_size::text AS "contractSize",
            trade_date AS "tradeDate", created_at AS "createdAt", updated_at AS "updatedAt"
          FROM trades WHERE user_id = ${userId}`;
      case 'journal':
        return sql`
          SELECT id::text AS id, date, pre_market_notes AS "preMarketNotes",
            post_market_notes AS "postMarketNotes", mood,
            market_conditions AS "marketConditions", lessons,
            created_at AS "createdAt", updated_at AS "updatedAt"
          FROM journals WHERE user_id = ${userId}`;
      case 'knowledge_document':
        return sql`
          SELECT id::text AS id, title, content, doc_type AS "docType", status,
            current_version AS "currentVersion", ai_summary AS "aiSummary",
            frontmatter, created_at AS "createdAt", updated_at AS "updatedAt"
          FROM knowledge_documents WHERE user_id = ${userId}`;
      case 'research_project':
        return sql`
          SELECT p.id::text AS id, p.title, p.status, p.conviction,
            s.ticker,
            n.content AS note_content, n.version AS note_version,
            c.thesis_complete, c.valuation_complete, c.risks_reviewed, c.earnings_reviewed,
            p.created_at AS "createdAt", p.updated_at AS "updatedAt"
          FROM research_projects p
          LEFT JOIN symbols s ON s.id = p.symbol_id
          LEFT JOIN LATERAL (
            SELECT content, version FROM research_notes
            WHERE project_id = p.id ORDER BY version DESC LIMIT 1
          ) n ON true
          LEFT JOIN LATERAL (
            SELECT * FROM research_checklists WHERE project_id = p.id LIMIT 1
          ) c ON true
          WHERE p.user_id = ${userId}`;
      case 'ai_insight':
        return sql`
          SELECT id::text AS id, insight_type AS "insightType", content, metadata,
            created_at AS "createdAt"
          FROM ai_insights WHERE user_id = ${userId}`;
      case 'coaching':
        return sql`
          SELECT id::text AS id, severity, triggers, message, created_at AS "createdAt"
          FROM coaching_sessions WHERE user_id = ${userId}`;
      default:
        throw new Error(`No loader for source type ${sourceType}`);
    }
  }
}

type CorpusSourceType = (typeof CORPUS_SOURCE_TYPES)[number];

interface Row {
  [key: string]: unknown;
}
