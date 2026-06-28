import { router, protectedProcedure } from './trpc';
import { createJournalSchema, journalMoodEnum } from '@tradezen/db';
import { z } from 'zod';
import { JournalsService } from '../journals/journals.service';
import type { CreateJournalDto, UpdateJournalDto } from '../journals/dto';

const queryJournalsSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

const journalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const createJournalInput = createJournalSchema.extend({
  mood: journalMoodEnum.optional(),
});

export const journalsRouter = router({
  findAll: protectedProcedure
    .input(queryJournalsSchema)
    .query(async ({ ctx, input }) => {
      const service = new JournalsService();
      return service.findAll(ctx.userId, input.limit ?? 30, input.offset ?? 0);
    }),

  findOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = new JournalsService();
      return service.findOne(ctx.userId, input.id);
    }),

  findByDate: protectedProcedure
    .input(z.object({ date: journalDateSchema }))
    .query(async ({ ctx, input }) => {
      const service = new JournalsService();
      return service.findByDate(ctx.userId, input.date);
    }),

  create: protectedProcedure
    .input(createJournalInput)
    .mutation(async ({ ctx, input }) => {
      const service = new JournalsService();
      return service.create(ctx.userId, input as CreateJournalDto);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        date: journalDateSchema.optional(),
        pre_market_notes: z.string().max(5000).optional(),
        post_market_notes: z.string().max(5000).optional(),
        mood: journalMoodEnum.optional(),
        market_conditions: z.string().max(2000).optional(),
        lessons: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new JournalsService();
      const { id, ...data } = input;
      return service.update(ctx.userId, id, data as UpdateJournalDto);
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = new JournalsService();
      return service.remove(ctx.userId, input.id);
    }),

  getStreak: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const service = new JournalsService();
    return service.getStreak(ctx.userId);
  }),
});
