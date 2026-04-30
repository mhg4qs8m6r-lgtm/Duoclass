import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { syncRouter } from "./sync-router";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...user } = opts.ctx.user;
      return user;
    }),
    // Electron : pas de cookie à effacer, mais on garde la mutation pour compatibilité client.
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),

  // Routes de synchronisation (inchangées)
  sync: syncRouter,
});

export type AppRouter = typeof appRouter;
