import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { syncRouter } from "./sync-router";
import { z } from "zod";
import { 
  getUserLicense, 
  createLicense, 
  validateLicense, 
  getAllLicenses,
  updateLicenseStatus 
} from "./license-db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...user } = opts.ctx.user;
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Routes de synchronisation
  sync: syncRouter,

  // Routes de paiement (licences gérées par l'admin)
  payment: router({
    getPlans: publicProcedure.query(() => {
      return [
        {
          id: 'lifetime',
          name: 'Licence à vie',
          price: 4900,
          currency: 'EUR',
          features: [
            'Accès à vie',
            'Mises à jour gratuites',
            'Support prioritaire',
          ],
        },
      ];
    }),

    createCheckoutSession: protectedProcedure
      .input(z.object({
        planId: z.string(),
      }))
      .mutation(async () => {
        return {
          url: null,
          sessionId: null,
          message: 'Contactez l\'administrateur pour obtenir une licence.',
        };
      }),
  }),

  // Routes d'abonnement (publicProcedure : accessible sans connexion pour le mode essai gratuit)
  subscription: router({
    getStatus: publicProcedure.query(async ({ ctx }) => {
      // Si l'utilisateur n'est pas connecté (mode essai gratuit), retourner 'trial' par défaut
      if (!ctx.user) {
        return {
          status: 'trial' as const,
          plan: null,
          expiresAt: null,
        };
      }
      const license = await getUserLicense(ctx.user.id);
      return {
        status: license?.status || 'trial',
        plan: license?.licenseType || null,
        expiresAt: license?.expiresAt || null,
      };
    }),
  }),

  // Routes de gestion des licences
  license: router({
    /**
     * Vérifie si l'utilisateur a une licence valide
     */
    check: protectedProcedure.query(async ({ ctx }) => {
      const license = await getUserLicense(ctx.user.id);
      return {
        hasLicense: !!license && license.status === 'active',
        license: license,
      };
    }),

    /**
     * Génère une nouvelle licence (admin uniquement)
     */
    create: protectedProcedure
      .input(z.object({
        email: z.string().optional(),
        licenseType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        const license = await createLicense({
          email: input.email,
          licenseType: input.licenseType,
        });
        return { success: !!license, license };
      }),

    /**
     * Valide une licence par clé
     */
    validate: protectedProcedure
      .input(z.object({ licenseKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const isValid = await validateLicense(ctx.user.id, input.licenseKey);
        return { valid: isValid };
      }),

    /**
     * Liste toutes les licences (admin uniquement)
     */
    getAllLicenses: protectedProcedure.query(async ({ ctx }) => {
      // Vérifier si l'utilisateur est admin
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }
      const licenses = await getAllLicenses();
      return licenses;
    }),

    /**
     * Récupère les licences de l'utilisateur connecté
     */
    getMyLicenses: protectedProcedure.query(async ({ ctx }) => {
      const license = await getUserLicense(ctx.user.id);
      return license ? [license] : [];
    }),

    /**
     * Récupère l'historique d'une licence
     */
    getLicenseHistory: protectedProcedure
      .input(z.object({ licenseId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getLicenseHistory } = await import('./license-db');
        return getLicenseHistory(input.licenseId);
      }),

    /**
     * Révoque une licence (admin)
     */
    revokeLicense: protectedProcedure
      .input(z.object({ licenseId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        const success = await updateLicenseStatus(input.licenseId, 'revoked', input.reason);
        return { success };
      }),

    /**
     * Réactive une licence (admin)
     */
    reactivateLicense: protectedProcedure
      .input(z.object({ licenseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        const success = await updateLicenseStatus(input.licenseId, 'active');
        return { success };
      }),

    /**
     * Active une licence sur l'appareil actuel
     */
    activate: protectedProcedure
      .input(z.object({ licenseCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { activateLicense } = await import('./license-db');
        const success = await activateLicense(ctx.user.id, input.licenseCode);
        return { success };
      }),

    /**
     * Désactive une licence
     */
    deactivate: protectedProcedure
      .input(z.object({ licenseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await updateLicenseStatus(input.licenseId, 'pending');
        return { success };
      }),

    /**
     * Met à jour le statut d'une licence (admin uniquement)
     */
    updateStatus: protectedProcedure
      .input(z.object({
        licenseId: z.number(),
        status: z.enum(['active', 'pending', 'expired', 'revoked', 'transferred']),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        const success = await updateLicenseStatus(
          input.licenseId, 
          input.status, 
          input.reason
        );
        return { success };
      }),
  }),

});

export type AppRouter = typeof appRouter;
