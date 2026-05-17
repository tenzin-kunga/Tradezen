import { router, protectedProcedure } from './index';
import { createTradeSchema } from '@tradezen/db';
import { z } from 'zod';
import { TradesService } from '../trades/trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { EventPublisherService } from '../common/services/event-publisher.service';
import type {
  CreateTradeDto,
  UpdateTradeDto,
  QueryTradesDto,
} from '../trades/dto';

const queryTradesSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sort: z.enum(['created_at', 'pnl', 'symbol']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  symbol: z.string().optional(),
  direction: z.enum(['buy', 'sell']).optional(),
  strategy: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const eventPublisher = new EventPublisherService();

export const tradesRouter = router({
  findAll: protectedProcedure
    .input(queryTradesSchema)
    .query(async ({ ctx, input }) => {
      const service = new TradesService(eventPublisher);
      return service.findAll(ctx.userId, input as QueryTradesDto);
    }),

  findOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = new TradesService(eventPublisher);
      return service.findOne(ctx.userId, input.id);
    }),

  create: protectedProcedure
    .input(createTradeSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new TradesService(eventPublisher);
      return service.create(ctx.userId, input as CreateTradeDto);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        symbol: z.string().min(2).max(20).optional(),
        direction: z.enum(['buy', 'sell']).optional(),
        entry: z.number().positive().optional(),
        exit: z.number().positive().optional(),
        lot: z.number().min(0.01).max(1000).optional(),
        stop_loss: z.number().positive().nullish(),
        take_profit: z.number().positive().nullish(),
        strategy: z.string().max(100).nullish(),
        notes: z.string().max(2000).nullish(),
        fomo_check: z.boolean().optional(),
        trend_alignment: z.boolean().optional(),
        vengeance_trade: z.boolean().optional(),
        contract_size: z.number().min(1).max(1000000).optional(),
        trade_date: z.string().nullish(),
        commission: z.number().min(0).max(10000).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new TradesService(eventPublisher);
      const { id, ...data } = input;
      return service.update(ctx.userId, id, data as UpdateTradeDto);
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = new TradesService(eventPublisher);
      return service.remove(ctx.userId, input.id);
    }),

  getAnalytics: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const service = new TradesService(eventPublisher);
    return service.getAnalytics(ctx.userId);
  }),

  getDailyPnl: protectedProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const service = new TradesService(eventPublisher);
      return service.getDailyPnl(ctx.userId, input.from, input.to);
    }),

  getAdvancedAnalytics: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      const service = new TradesService(eventPublisher);
      return service.getAdvancedAnalytics(ctx.userId);
    }),

  getBehavioralAnalytics: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const service = new BehavioralService();
      return service.analyzeBehavior(ctx.userId, input.days || 90);
    }),

  getStrategyAnalytics: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      const service = new TradesService(eventPublisher);
      return service.getStrategyAnalytics(ctx.userId);
    }),

  getTagAnalytics: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const service = new TradesService(eventPublisher);
    return service.getTagAnalytics(ctx.userId);
  }),

  compareStrategies: protectedProcedure
    .input(z.object({ strategyA: z.string(), strategyB: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new TradesService(eventPublisher);
      return service.compareStrategies(
        ctx.userId,
        input.strategyA,
        input.strategyB,
      );
    }),

  getCsvImportJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return { jobId: input.jobId, status: 'pending' };
    }),

  getCsvImportJobHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async () => {
      return [];
    }),
});
