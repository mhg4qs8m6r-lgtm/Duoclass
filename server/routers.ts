import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { syncRouter } from "./sync-router";
import { sendPhotosEmail } from "./email";
import { z } from "zod";

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

  // Route d'envoi d'email avec photos
  email: router({
    sendPhotos: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        message: z.string(),
        photos: z.array(z.object({
          filename: z.string(),
          dataUrl: z.string(),
        })).min(1).max(20),
      }))
      .mutation(async ({ input }) => {
        await sendPhotosEmail(input);
        return { success: true };
      }),
  }),

  // Routes de synchronisation (inchangées)
  sync: syncRouter,
});

export type AppRouter = typeof appRouter;
