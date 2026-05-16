import { initTRPC, TRPCError } from '@trpc/server';
import { TrpcContext, createContext } from './context';
import { createTradeSchema } from '@tradezen/db';

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
  
  // Example: create trade with Zod validation
  createTrade: protectedProcedure
    .input(createTradeSchema)
    .mutation(async ({ input, ctx }) => {
      // Input is validated and typed
      // This is a placeholder — actual implementation in TZ-024
      return { success: true, input };
    }),
});

export type AppRouter = typeof appRouter;
export { createContext };
