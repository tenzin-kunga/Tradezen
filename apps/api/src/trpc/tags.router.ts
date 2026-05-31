import { router, protectedProcedure } from './trpc';
import { createTagSchema, tagCategoryEnum } from '@tradezen/db';
import { z } from 'zod';
import { TagsService } from '../tags/tags.service';
import type { CreateTagDto, UpdateTagDto } from '../tags/dto';

const queryTagTradesSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

const createTagInput = createTagSchema.extend({
  category: tagCategoryEnum.optional(),
});

export const tagsRouter = router({
  findAll: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const service = new TagsService();
    return service.findAll(ctx.userId);
  }),

  findOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = new TagsService();
      return service.findOne(ctx.userId, input.id);
    }),

  create: protectedProcedure
    .input(createTagInput)
    .mutation(async ({ ctx, input }) => {
      const service = new TagsService();
      return service.create(ctx.userId, input as CreateTagDto);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(30).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        category: tagCategoryEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new TagsService();
      const { id, ...data } = input;
      return service.update(ctx.userId, id, data as UpdateTagDto);
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = new TagsService();
      return service.remove(ctx.userId, input.id);
    }),

  addTagToTrade: protectedProcedure
    .input(z.object({ tagId: z.string().uuid(), tradeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = new TagsService();
      return service.addTagToTrade(ctx.userId, input.tradeId, input.tagId);
    }),

  removeTagFromTrade: protectedProcedure
    .input(z.object({ tagId: z.string().uuid(), tradeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = new TagsService();
      return service.removeTagFromTrade(ctx.userId, input.tradeId, input.tagId);
    }),

  getTradesForTag: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(queryTagTradesSchema))
    .query(async ({ ctx, input }) => {
      const service = new TagsService();
      return service.getTradesForTag(
        ctx.userId,
        input.id,
        input.limit ?? 50,
        input.offset ?? 0,
      );
    }),
});
