import { initTRPC, TRPCError } from '@trpc/server';
import { TrpcContext, createContext } from './context';

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
});

export type AppRouter = typeof appRouter;
export { createContext };
