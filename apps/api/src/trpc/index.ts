import { router, publicProcedure } from './trpc';
import { createContext } from './context';
import { tradesRouter } from './trades.router';
import { journalsRouter } from './journals.router';
import { tagsRouter } from './tags.router';

export type AppRouter = typeof appRouter;

export const appRouter = router({
  health: publicProcedure.query(() => 'ok'),
  trades: tradesRouter,
  journals: journalsRouter,
  tags: tagsRouter,
});

export { createContext };
