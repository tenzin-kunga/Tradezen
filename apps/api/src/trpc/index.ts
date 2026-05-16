import { initTRPC, TRPCError } from '@trpc/server';
import { TrpcContext, createContext } from './context';
import { tradesRouter } from './trades.router';
import { journalsRouter } from './journals.router';
import { tagsRouter } from './tags.router';

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const userId = (ctx.req as any).user?.id;
  if (!userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId } });
});

export const appRouter = router({
  health: publicProcedure.query(() => 'ok'),
  trades: tradesRouter,
  journals: journalsRouter,
  tags: tagsRouter,
});

export type AppRouter = typeof appRouter;
export { createContext };
