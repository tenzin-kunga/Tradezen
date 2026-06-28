import { router, protectedProcedure } from './trpc';
import {
  createChecklistSchema,
  createChecklistRunSchema,
  updateChecklistRunItemSchema,
  getDb,
  checklists,
  checklistItems,
  checklistRuns,
  checklistRunItems,
} from '@tradezen/db';
import { z } from 'zod';
import { and, eq, desc, sql } from 'drizzle-orm';

const updateChecklistInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullish(),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        isCritical: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(50)
    .optional(),
});

export const checklistsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({
        id: checklists.id,
        name: checklists.name,
        description: checklists.description,
        createdAt: checklists.createdAt,
        updatedAt: checklists.updatedAt,
        itemCount: sql<number>`count(distinct ${checklistItems.id})`.as(
          'item_count',
        ),
        criticalCount:
          sql<number>`count(distinct case when ${checklistItems.isCritical} then ${checklistItems.id} end)`.as(
            'critical_count',
          ),
        lastRunAt: sql<string | null>`max(${checklistRuns.createdAt})`.as(
          'last_run_at',
        ),
      })
      .from(checklists)
      .leftJoin(checklistItems, eq(checklistItems.checklistId, checklists.id))
      .leftJoin(checklistRuns, eq(checklistRuns.checklistId, checklists.id))
      .where(eq(checklists.userId, ctx.userId))
      .groupBy(checklists.id)
      .orderBy(desc(checklists.createdAt));
    return rows;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [template] = await db
        .select()
        .from(checklists)
        .where(
          and(eq(checklists.id, input.id), eq(checklists.userId, ctx.userId)),
        )
        .limit(1);
      if (!template) throw new Error('Checklist not found');
      const items = await db
        .select()
        .from(checklistItems)
        .where(eq(checklistItems.checklistId, input.id))
        .orderBy(checklistItems.sortOrder);
      return { ...template, items };
    }),

  create: protectedProcedure
    .input(createChecklistSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [template] = await db
        .insert(checklists)
        .values({
          userId: ctx.userId,
          name: input.name,
          description: input.description ?? null,
        })
        .returning();
      if (input.items.length > 0) {
        await db.insert(checklistItems).values(
          input.items.map((item, i) => ({
            checklistId: template.id,
            title: item.title,
            isCritical: item.isCritical ?? false,
            sortOrder: i,
          })),
        );
      }
      const items = await db
        .select()
        .from(checklistItems)
        .where(eq(checklistItems.checklistId, template.id))
        .orderBy(checklistItems.sortOrder);
      return { ...template, items };
    }),

  update: protectedProcedure
    .input(updateChecklistInput)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, items, ...data } = input;
      const [existing] = await db
        .select()
        .from(checklists)
        .where(and(eq(checklists.id, id), eq(checklists.userId, ctx.userId)))
        .limit(1);
      if (!existing) throw new Error('Checklist not found');

      if (Object.keys(data).length > 0) {
        await db
          .update(checklists)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(checklists.id, id));
      }

      if (items) {
        await db
          .delete(checklistItems)
          .where(eq(checklistItems.checklistId, id));
        if (items.length > 0) {
          await db.insert(checklistItems).values(
            items.map((item, i) => ({
              checklistId: id,
              title: item.title,
              isCritical: item.isCritical ?? false,
              sortOrder: i,
            })),
          );
        }
      }

      const [updated] = await db
        .select()
        .from(checklists)
        .where(eq(checklists.id, id))
        .limit(1);
      const updatedItems = await db
        .select()
        .from(checklistItems)
        .where(eq(checklistItems.checklistId, id))
        .orderBy(checklistItems.sortOrder);
      return { ...updated, items: updatedItems };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(checklists)
        .where(
          and(eq(checklists.id, input.id), eq(checklists.userId, ctx.userId)),
        );
      return { deleted: true };
    }),

  clone: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [source] = await db
        .select()
        .from(checklists)
        .where(
          and(eq(checklists.id, input.id), eq(checklists.userId, ctx.userId)),
        )
        .limit(1);
      if (!source) throw new Error('Checklist not found');
      const sourceItems = await db
        .select()
        .from(checklistItems)
        .where(eq(checklistItems.checklistId, input.id))
        .orderBy(checklistItems.sortOrder);

      const [clone] = await db
        .insert(checklists)
        .values({
          userId: ctx.userId,
          name: `${source.name} (copy)`,
          description: source.description,
        })
        .returning();

      if (sourceItems.length > 0) {
        await db.insert(checklistItems).values(
          sourceItems.map((item) => ({
            checklistId: clone.id,
            title: item.title,
            isCritical: item.isCritical,
            sortOrder: item.sortOrder,
          })),
        );
      }

      const items = await db
        .select()
        .from(checklistItems)
        .where(eq(checklistItems.checklistId, clone.id))
        .orderBy(checklistItems.sortOrder);
      return { ...clone, items };
    }),

  runs: {
    list: protectedProcedure
      .input(z.object({ checklistId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const db = getDb();
        const rows = await db
          .select({
            id: checklistRuns.id,
            checklistId: checklistRuns.checklistId,
            tradeId: checklistRuns.tradeId,
            note: checklistRuns.note,
            createdAt: checklistRuns.createdAt,
            checkedCount:
              sql<number>`count(case when ${checklistRunItems.checked} then 1 end)`.as(
                'checked_count',
              ),
            totalCount: sql<number>`count(${checklistRunItems.id})`.as(
              'total_count',
            ),
          })
          .from(checklistRuns)
          .leftJoin(
            checklistRunItems,
            eq(checklistRunItems.runId, checklistRuns.id),
          )
          .where(
            and(
              eq(checklistRuns.checklistId, input.checklistId),
              eq(checklistRuns.userId, ctx.userId),
            ),
          )
          .groupBy(checklistRuns.id)
          .orderBy(desc(checklistRuns.createdAt));
        return rows;
      }),

    create: protectedProcedure
      .input(createChecklistRunSchema)
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        const items = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.checklistId, input.checklistId))
          .orderBy(checklistItems.sortOrder);
        if (items.length === 0) throw new Error('Checklist has no items');

        const [run] = await db
          .insert(checklistRuns)
          .values({
            userId: ctx.userId,
            checklistId: input.checklistId,
            tradeId: input.tradeId ?? null,
            note: input.note ?? null,
          })
          .returning();

        await db.insert(checklistRunItems).values(
          items.map((item) => ({
            runId: run.id,
            itemId: item.id,
          })),
        );

        const runItems = await db
          .select()
          .from(checklistRunItems)
          .where(eq(checklistRunItems.runId, run.id));
        return { ...run, runItems };
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const db = getDb();
        const [run] = await db
          .select()
          .from(checklistRuns)
          .where(
            and(
              eq(checklistRuns.id, input.id),
              eq(checklistRuns.userId, ctx.userId),
            ),
          )
          .limit(1);
        if (!run) throw new Error('Run not found');
        const runItems = await db
          .select({
            id: checklistRunItems.id,
            runId: checklistRunItems.runId,
            itemId: checklistRunItems.itemId,
            checked: checklistRunItems.checked,
            checkedAt: checklistRunItems.checkedAt,
            title: checklistItems.title,
            isCritical: checklistItems.isCritical,
            sortOrder: checklistItems.sortOrder,
          })
          .from(checklistRunItems)
          .innerJoin(
            checklistItems,
            eq(checklistRunItems.itemId, checklistItems.id),
          )
          .where(eq(checklistRunItems.runId, input.id))
          .orderBy(checklistItems.sortOrder);
        return { ...run, runItems };
      }),

    updateItem: protectedProcedure
      .input(updateChecklistRunItemSchema)
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        const [runItem] = await db
          .update(checklistRunItems)
          .set({
            checked: input.checked,
            checkedAt: input.checked ? new Date() : null,
          })
          .where(
            and(
              eq(checklistRunItems.runId, input.runId),
              eq(checklistRunItems.itemId, input.itemId),
            ),
          )
          .returning();
        return runItem;
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        await db
          .delete(checklistRuns)
          .where(
            and(
              eq(checklistRuns.id, input.id),
              eq(checklistRuns.userId, ctx.userId),
            ),
          );
        return { deleted: true };
      }),
  },
});
