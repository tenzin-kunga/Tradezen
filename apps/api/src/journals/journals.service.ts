import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { journals } from '@tradezen/db';
import { CreateJournalDto, UpdateJournalDto } from './dto';
import { MemoryService } from '../ai/memory.service';

@Injectable()
export class JournalsService {
  constructor(@Optional() private readonly memoryService?: MemoryService) {}

  async create(userId: string, dto: CreateJournalDto) {
    const result = await db
      .insert(journals)
      .values({
        userId,
        date: dto.date,
        preMarketNotes: dto.pre_market_notes,
        postMarketNotes: dto.post_market_notes,
        mood: dto.mood,
        marketConditions: dto.market_conditions,
        lessons: dto.lessons,
      })
      .onConflictDoUpdate({
        target: [journals.userId, journals.date],
        set: {
          preMarketNotes: sql`COALESCE(EXCLUDED.pre_market_notes, journals.pre_market_notes)`,
          postMarketNotes: sql`COALESCE(EXCLUDED.post_market_notes, journals.post_market_notes)`,
          mood: sql`COALESCE(EXCLUDED.mood, journals.mood)`,
          marketConditions: sql`COALESCE(EXCLUDED.market_conditions, journals.market_conditions)`,
          lessons: sql`COALESCE(EXCLUDED.lessons, journals.lessons)`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();
    const journal = result[0];

    // Embed journal for semantic retrieval (fire-and-forget)
    if (this.memoryService) {
      const content = [
        journal.preMarketNotes,
        journal.postMarketNotes,
        journal.lessons,
        journal.mood,
        journal.marketConditions,
      ]
        .filter(Boolean)
        .join('\n');
      if (content) {
        this.memoryService
          .embedNewJournal(userId, journal.id, content)
          .catch(() => {});
      }
    }

    return journal;
  }

  async findAll(userId: string, limit = 30, offset = 0) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const data = await db
      .select()
      .from(journals)
      .where(eq(journals.userId, userId))
      .orderBy(desc(journals.date))
      .limit(safeLimit)
      .offset(safeOffset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(journals)
      .where(eq(journals.userId, userId));

    return { data, total: Number(countResult[0]?.count ?? 0) };
  }

  async findByDate(userId: string, date: string) {
    const result = await db
      .select()
      .from(journals)
      .where(and(eq(journals.userId, userId), eq(journals.date, date)));
    return result[0] || null;
  }

  async findOne(userId: string, id: string) {
    const result = await db
      .select()
      .from(journals)
      .where(and(eq(journals.id, id), eq(journals.userId, userId)));
    if (!result[0]) throw new NotFoundException('Journal entry not found');
    return result[0];
  }

  async update(userId: string, id: string, dto: UpdateJournalDto) {
    const updateData: Partial<typeof journals.$inferInsert> = {};
    if (dto.pre_market_notes !== undefined)
      updateData.preMarketNotes = dto.pre_market_notes;
    if (dto.post_market_notes !== undefined)
      updateData.postMarketNotes = dto.post_market_notes;
    if (dto.mood !== undefined) updateData.mood = dto.mood;
    if (dto.market_conditions !== undefined)
      updateData.marketConditions = dto.market_conditions;
    if (dto.lessons !== undefined) updateData.lessons = dto.lessons;

    if (Object.keys(updateData).length === 0) {
      const result = await db
        .select()
        .from(journals)
        .where(and(eq(journals.id, id), eq(journals.userId, userId)));
      if (!result[0]) throw new NotFoundException('Journal entry not found');
      return result[0];
    }

    updateData.updatedAt = new Date();

    const result = await db
      .update(journals)
      .set(updateData)
      .where(and(eq(journals.id, id), eq(journals.userId, userId)))
      .returning();
    if (!result[0]) throw new NotFoundException('Journal entry not found');
    return result[0];
  }

  async remove(userId: string, id: string) {
    const result = await db
      .delete(journals)
      .where(and(eq(journals.id, id), eq(journals.userId, userId)))
      .returning();
    if (!result[0]) throw new NotFoundException('Journal entry not found');
    return { deleted: true };
  }

  async getStreak(userId: string) {
    const totalResult = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(journals)
      .where(eq(journals.userId, userId));
    const totalEntries = totalResult[0]?.c ?? 0;
    if (totalEntries === 0) {
      return { currentStreak: 0, longestStreak: 0, totalEntries: 0 };
    }

    const longestResult = await db.execute(sql`
      WITH distinct_days AS (
        SELECT date::date AS d FROM journals WHERE user_id = ${userId} GROUP BY 1
      ),
      sequenced AS (
        SELECT d, (d - (ROW_NUMBER() OVER (ORDER BY d))::integer)::date AS grp
        FROM distinct_days
      ),
      runs AS (
        SELECT grp, COUNT(*)::int AS len FROM sequenced GROUP BY grp
      )
      SELECT COALESCE(MAX(len), 0)::int AS longest FROM runs
    `);
    const longestStreak = (longestResult[0] as any)?.longest ?? 0;

    const currentResult = await db.execute(sql`
      WITH distinct_days AS (
        SELECT date::date AS d FROM journals WHERE user_id = ${userId} GROUP BY 1
      ),
      maxd AS (SELECT MAX(d) AS last FROM distinct_days),
      seq AS (
        SELECT d, (d - (ROW_NUMBER() OVER (ORDER BY d))::integer)::date AS grp
        FROM distinct_days
      ),
      last_grp AS (
        SELECT s.grp FROM seq s JOIN maxd m ON s.d = m.last
      ),
      run_lengths AS (
        SELECT grp, COUNT(*)::int AS len FROM seq GROUP BY grp
      )
      SELECT
        CASE
          WHEN (SELECT (CURRENT_DATE - last) FROM maxd) > 1 THEN 0
          ELSE COALESCE((SELECT len FROM run_lengths WHERE grp = (SELECT grp FROM last_grp)), 0)
        END::int AS current_streak
    `);
    const currentStreak = (currentResult[0] as any)?.current_streak ?? 0;

    return { currentStreak, longestStreak, totalEntries };
  }
}
