import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { db } from '../db/drizzle';
import {
  researchProjects,
  researchNotes,
  researchChecklists,
  researchTags,
  researchActivity,
  researchAssets,
  assets,
  symbols,
} from '@tradezen/db';
import { eq, and, desc, asc, ilike, or, count } from 'drizzle-orm';
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateNotesDto,
  UpdateChecklistDto,
  CreateTagDto,
} from './dto';
import { AssetsService, type StoredAsset } from '../assets/assets.service';
import { FormatterRegistry } from '../ai/context/semantic/formatters/registry';
import { SemanticSourceType } from '../ai/context/semantic/types';
import type { EmbeddingPipeline } from '../ai/context/semantic/embedding-pipeline';
import { ExtractorRegistry } from '../ai/context/semantic/extractors/registry';

type ProjectRow = typeof researchProjects.$inferSelect;

export interface ResearchProjectWithRelations extends ProjectRow {
  ticker: string | null;
  exchange: string | null;
  symbolName: string | null;
  notes: { content: string; version: number } | null;
  checklist: {
    thesisComplete: boolean;
    valuationComplete: boolean;
    risksReviewed: boolean;
    earningsReviewed: boolean;
  } | null;
  tags: { id: string; label: string; color: string }[];
}

export interface ResearchDocument {
  id: string;
  name: string;
  mimeType: string;
  category: string;
  size: number;
  uploadedAt: string;
  downloadUrl: string;
  thumbnailUrl: string;
  status: string;
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly assetsService: AssetsService,
    private readonly formatterRegistry: FormatterRegistry,
    @Inject('EmbeddingPipeline') private readonly pipeline: EmbeddingPipeline,
    private readonly extractorRegistry: ExtractorRegistry,
  ) {}

  private async logActivity(
    projectId: string,
    type: string,
    detail: Record<string, unknown> = {},
  ) {
    await db.insert(researchActivity).values({ projectId, type, detail });
  }

  private async embedProject(projectId: string, userId: string) {
    try {
      const full = await this.getProject(userId, projectId);
      const formatter = this.formatterRegistry.get(
        SemanticSourceType.RESEARCH_PROJECT,
      );
      if (formatter) {
        await this.pipeline.enqueue(formatter.format(full, userId));
      }
    } catch (e) {
      this.logger.error(`Failed to embed research project ${projectId}: ${e}`);
    }
  }

  private async embedAsset(
    stored: { id: string; fileName: string | null; mimeType: string | null },
    buffer: Buffer,
    extractor: {
      extract(
        file: Buffer,
      ): Promise<{ text: string; wordCount: number; warnings: string[] }>;
    },
    userId: string,
    category: string,
    projectId: string,
  ) {
    try {
      const result = await extractor.extract(buffer);
      if (result.text) {
        const formatter = this.formatterRegistry.get(
          SemanticSourceType.RESEARCH_DOCUMENT,
        );
        if (formatter) {
          await this.pipeline.enqueue(
            formatter.format(
              {
                id: stored.id,
                fileName: stored.fileName,
                text: result.text,
                wordCount: result.wordCount,
                category,
                projectId,
              },
              userId,
            ),
          );
        }
      }
    } catch (e) {
      this.logger.error(`Failed to embed asset ${stored.id}: ${e}`);
    }
  }

  private async attachRelations(
    project: ProjectRow,
  ): Promise<ResearchProjectWithRelations> {
    const [note] = await db
      .select({
        content: researchNotes.content,
        version: researchNotes.version,
      })
      .from(researchNotes)
      .where(eq(researchNotes.projectId, project.id))
      .limit(1);

    const [checklist] = await db
      .select()
      .from(researchChecklists)
      .where(eq(researchChecklists.projectId, project.id))
      .limit(1);

    const tags = await db
      .select({
        id: researchTags.id,
        label: researchTags.label,
        color: researchTags.color,
      })
      .from(researchTags)
      .where(eq(researchTags.projectId, project.id))
      .orderBy(asc(researchTags.createdAt));

    const symbol = project.symbolId
      ? await db
          .select({
            ticker: symbols.ticker,
            exchange: symbols.exchange,
            name: symbols.name,
          })
          .from(symbols)
          .where(eq(symbols.id, project.symbolId))
          .limit(1)
      : [];

    return {
      ...project,
      ticker: symbol[0]?.ticker ?? null,
      exchange: symbol[0]?.exchange ?? null,
      symbolName: symbol[0]?.name ?? null,
      notes: note ? { content: note.content, version: note.version } : null,
      checklist: checklist
        ? {
            thesisComplete: checklist.thesisComplete,
            valuationComplete: checklist.valuationComplete,
            risksReviewed: checklist.risksReviewed,
            earningsReviewed: checklist.earningsReviewed,
          }
        : null,
      tags,
    };
  }

  async listProjects(
    userId: string,
    opts: {
      status?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, opts.pageSize ?? 50);
    const conditions = [eq(researchProjects.userId, userId)];
    if (opts.status) conditions.push(eq(researchProjects.status, opts.status));
    if (opts.q) conditions.push(ilike(researchProjects.title, `%${opts.q}%`));

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(researchProjects)
        .where(and(...conditions))
        .orderBy(desc(researchProjects.updatedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ total: count() })
        .from(researchProjects)
        .where(and(...conditions)),
    ]);

    const data = await Promise.all(rows.map((r) => this.attachRelations(r)));
    return { data, total, page, pageSize };
  }

  async getProject(userId: string, projectId: string) {
    const [project] = await db
      .select()
      .from(researchProjects)
      .where(
        and(
          eq(researchProjects.id, projectId),
          eq(researchProjects.userId, userId),
        ),
      )
      .limit(1);
    if (!project) throw new NotFoundException('Research project not found');
    return this.attachRelations(project);
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    const [project] = await db
      .insert(researchProjects)
      .values({
        userId,
        title: dto.title,
        symbolId: dto.symbol_id || null,
        status: dto.status || 'idea',
        conviction: dto.conviction || 'medium',
      })
      .returning();

    await db
      .insert(researchNotes)
      .values({ projectId: project.id, content: '' });
    await db.insert(researchChecklists).values({ projectId: project.id });
    await this.logActivity(project.id, 'created', { title: project.title });

    // Embed for semantic retrieval (fire-and-forget)
    this.embedProject(project.id, userId).catch(() => {});

    return this.attachRelations(project);
  }

  async updateProject(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    await this.getProject(userId, projectId);
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) update.title = dto.title;
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.conviction !== undefined) update.conviction = dto.conviction;
    if (dto.symbol_id !== undefined) update.symbolId = dto.symbol_id || null;

    const [updated] = await db
      .update(researchProjects)
      .set(update)
      .where(eq(researchProjects.id, projectId))
      .returning();

    if (dto.status !== undefined) {
      await this.logActivity(projectId, 'status_changed', {
        status: dto.status,
      });
    }

    // Re-embed if content-relevant fields changed
    if (
      dto.title !== undefined ||
      dto.status !== undefined ||
      dto.conviction !== undefined
    ) {
      this.embedProject(projectId, userId).catch(() => {});
    }

    return this.attachRelations(updated);
  }

  async deleteProject(userId: string, projectId: string) {
    await this.getProject(userId, projectId);
    const links = await db
      .select({ assetId: researchAssets.assetId })
      .from(researchAssets)
      .where(eq(researchAssets.projectId, projectId));
    await db.delete(researchProjects).where(eq(researchProjects.id, projectId));

    // Remove embeddings (fire-and-forget)
    this.pipeline
      .handleEvent({
        sourceType: SemanticSourceType.RESEARCH_PROJECT,
        sourceId: projectId,
        userId,
        operation: 'DELETE',
      })
      .catch(() => {});

    for (const link of links) {
      await this.enqueueAssetDeletion(link.assetId);
    }
  }

  // ─── Assets (documents) ─────────────────────

  async uploadAsset(
    userId: string,
    projectId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      size: number;
      originalname?: string;
    },
    category: string,
  ): Promise<ResearchDocument> {
    await this.getProject(userId, projectId);
    const stored = await this.assetsService.upload(file, userId, 'manual');
    const [link] = await db
      .insert(researchAssets)
      .values({ projectId, assetId: stored.id, category: category as any })
      .returning();
    await this.logActivity(projectId, 'asset_added', {
      category,
      name: stored.fileName,
    });

    // Extract and embed if extractable (fire-and-forget)
    const extractor = this.extractorRegistry.get(file.mimetype);
    if (extractor) {
      this.embedAsset(
        stored,
        file.buffer,
        extractor,
        userId,
        category,
        projectId,
      ).catch(() => {});
    }

    return this.toDocument(stored, category, link.createdAt);
  }

  async listAssets(projectId: string): Promise<ResearchDocument[]> {
    const rows = await db
      .select({
        asset: assets,
        category: researchAssets.category,
        createdAt: researchAssets.createdAt,
      })
      .from(researchAssets)
      .innerJoin(assets, eq(researchAssets.assetId, assets.id))
      .where(eq(researchAssets.projectId, projectId))
      .orderBy(desc(researchAssets.createdAt));

    return rows.map((r) =>
      this.toDocument(this.toStored(r.asset), r.category, r.createdAt),
    );
  }

  async deleteAsset(
    userId: string,
    projectId: string,
    assetId: string,
  ): Promise<void> {
    await this.getProject(userId, projectId);
    const [link] = await db
      .select()
      .from(researchAssets)
      .where(
        and(
          eq(researchAssets.projectId, projectId),
          eq(researchAssets.assetId, assetId),
        ),
      )
      .limit(1);
    if (!link) return;
    await db.delete(researchAssets).where(eq(researchAssets.assetId, assetId));
    await this.enqueueAssetDeletion(assetId);
  }

  /** Async deletion: mark DELETING and let the cleanup worker delete from storage. */
  private async enqueueAssetDeletion(assetId: string): Promise<void> {
    await db
      .update(assets)
      .set({ status: 'deleting' })
      .where(and(eq(assets.id, assetId), eq(assets.status, 'active')));
  }

  private toStored(row: typeof assets.$inferSelect): StoredAsset {
    return {
      id: row.id,
      provider: row.provider,
      providerKey: row.providerKey,
      version: 0,
      mimeType: row.mimeType,
      fileName: row.fileName,
      fileSize: row.fileSize,
      sha256Hash: row.sha256Hash,
      status: row.status,
      processingStatus: row.processingStatus,
      createdAt: row.createdAt,
    };
  }

  private toDocument(
    stored: StoredAsset,
    category: string,
    createdAt: Date,
  ): ResearchDocument {
    return {
      id: stored.id,
      name: stored.fileName ?? stored.providerKey,
      mimeType: stored.mimeType ?? 'application/octet-stream',
      category,
      size: stored.fileSize ?? 0,
      uploadedAt: createdAt.toISOString(),
      downloadUrl: this.assetsService.getUrl(stored, 'original'),
      thumbnailUrl: this.assetsService.getUrl(stored, 'thumbnail'),
      status: stored.status,
    };
  }

  async updateNotes(userId: string, projectId: string, dto: UpdateNotesDto) {
    await this.getProject(userId, projectId);

    const [existing] = await db
      .select()
      .from(researchNotes)
      .where(eq(researchNotes.projectId, projectId))
      .limit(1);

    const baseVersion = existing?.version ?? 0;
    if (dto.base_version !== undefined && dto.base_version !== baseVersion) {
      throw new ConflictException({
        message: 'Note was modified by another session',
        currentVersion: baseVersion,
      });
    }

    const nextVersion = baseVersion + 1;
    if (existing) {
      await db
        .update(researchNotes)
        .set({
          content: dto.content,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(eq(researchNotes.projectId, projectId));
    } else {
      await db
        .insert(researchNotes)
        .values({ projectId, content: dto.content, version: nextVersion });
    }

    await db
      .update(researchProjects)
      .set({ updatedAt: new Date() })
      .where(eq(researchProjects.id, projectId));
    await this.logActivity(projectId, 'note_updated', { version: nextVersion });

    // Re-embed on note change (fire-and-forget)
    this.embedProject(projectId, userId).catch(() => {});

    return { content: dto.content, version: nextVersion };
  }

  async updateChecklist(
    userId: string,
    projectId: string,
    dto: UpdateChecklistDto,
  ) {
    await this.getProject(userId, projectId);

    const [existing] = await db
      .select()
      .from(researchChecklists)
      .where(eq(researchChecklists.projectId, projectId))
      .limit(1);

    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of [
      'thesisComplete',
      'valuationComplete',
      'risksReviewed',
      'earningsReviewed',
    ] as const) {
      const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      if (dto[key] !== undefined) update[snake] = dto[key];
    }

    if (existing) {
      await db
        .update(researchChecklists)
        .set(update)
        .where(eq(researchChecklists.projectId, projectId));
    } else {
      await db.insert(researchChecklists).values({ projectId, ...update });
    }

    await this.logActivity(
      projectId,
      'checklist_updated',
      dto as Record<string, unknown>,
    );

    // Re-embed on checklist change (fire-and-forget)
    this.embedProject(projectId, userId).catch(() => {});

    const [checklist] = await db
      .select()
      .from(researchChecklists)
      .where(eq(researchChecklists.projectId, projectId))
      .limit(1);

    return {
      thesisComplete: checklist.thesisComplete,
      valuationComplete: checklist.valuationComplete,
      risksReviewed: checklist.risksReviewed,
      earningsReviewed: checklist.earningsReviewed,
    };
  }

  async addTag(userId: string, projectId: string, dto: CreateTagDto) {
    await this.getProject(userId, projectId);
    const [tag] = await db
      .insert(researchTags)
      .values({ projectId, label: dto.label, color: dto.color || '#888888' })
      .returning();
    await this.logActivity(projectId, 'tag_added', { label: dto.label });
    return tag;
  }

  async removeTag(userId: string, projectId: string, tagId: string) {
    await this.getProject(userId, projectId);
    await db
      .delete(researchTags)
      .where(
        and(eq(researchTags.id, tagId), eq(researchTags.projectId, projectId)),
      );
  }

  async getActivity(userId: string, projectId: string) {
    await this.getProject(userId, projectId);
    return db
      .select()
      .from(researchActivity)
      .where(eq(researchActivity.projectId, projectId))
      .orderBy(desc(researchActivity.createdAt))
      .limit(50);
  }

  async logAiQuery(userId: string, projectId: string, prompt: string) {
    await this.getProject(userId, projectId);
    await this.logActivity(projectId, 'ai_query', {
      prompt: prompt.slice(0, 200),
    });
  }

  async search(userId: string, query: string) {
    const q = query.trim();
    if (q.length < 1) return [];
    const rows = await db
      .select()
      .from(researchProjects)
      .where(
        and(
          eq(researchProjects.userId, userId),
          or(
            ilike(researchProjects.title, `%${q}%`),
            eq(researchProjects.status, q),
          ),
        ),
      )
      .orderBy(desc(researchProjects.updatedAt))
      .limit(20);
    return Promise.all(rows.map((r) => this.attachRelations(r)));
  }
}
