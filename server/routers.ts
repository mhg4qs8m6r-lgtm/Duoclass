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
    me: publicProcedure.query(opts => opts.ctx.user),
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

  // Routes de paiement (placeholder pour Stripe)
  payment: router({
    getPlans: publicProcedure.query(() => {
      return [
        {
          id: 'lifetime',
          name: 'Licence à vie',
          price: 4900, // 49€ en centimes
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
        turnstileToken: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // TODO: Intégrer Stripe ici
        // Pour l'instant, retourner une URL de test
        console.log('[Payment] Creating checkout session for user:', ctx.user.id, 'plan:', input.planId);
        return {
          url: null,
          sessionId: null,
          message: 'Stripe non configuré. Veuillez contacter le support.',
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
     * Crée une nouvelle licence après paiement
     */
    create: protectedProcedure
      .input(z.object({
        paymentId: z.string(),
        paymentProvider: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const license = await createLicense({
          userId: ctx.user.id,
          paymentId: input.paymentId,
          paymentProvider: input.paymentProvider || 'stripe',
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

  // Routes de détourage d'images
  detourage: router({
    /**
     * Détoure une image (supprime le fond) en utilisant @imgly/background-removal-node
     * Accepte soit une URL, soit des données base64
     */
    removeBackground: publicProcedure
      .input(z.object({
        imageData: z.string(), // URL ou data:image/...;base64,...
      }))
      .mutation(async ({ input }) => {
        const { removeBackground } = await import('@imgly/background-removal-node');
        const { storagePut } = await import('./storage');
        
        try {
          console.log('[Detourage] Starting background removal...');
          
          // Préparer l'image source
          let imageSource: string | Blob;
          
          if (input.imageData.startsWith('data:')) {
            // Convertir base64 en Blob
            // Regex amélioré pour accepter tous les formats: image/jpeg, image/png, image/gif, image/webp, image/svg+xml, etc.
            const matches = input.imageData.match(/^data:(image\/[\w+.-]+);base64,([\s\S]+)$/);
            if (!matches) {
              // Essayer un format alternatif sans le type MIME complet
              const simpleMatch = input.imageData.match(/^data:([^;]+);base64,([\s\S]+)$/);
              if (!simpleMatch) {
                console.error('[Detourage] Invalid base64 format, data starts with:', input.imageData.substring(0, 100));
                throw new Error('Format base64 invalide');
              }
              const mimeType = simpleMatch[1];
              const base64Data = simpleMatch[2];
              const binaryData = Buffer.from(base64Data, 'base64');
              imageSource = new Blob([binaryData], { type: mimeType });
              console.log('[Detourage] Processing base64 image with mime:', mimeType);
            } else {
              const mimeType = matches[1];
              const base64Data = matches[2];
              const binaryData = Buffer.from(base64Data, 'base64');
              imageSource = new Blob([binaryData], { type: mimeType });
              console.log('[Detourage] Processing base64 image with mime:', mimeType);
            }
          } else {
            // C'est une URL
            imageSource = input.imageData;
            console.log('[Detourage] Processing URL:', input.imageData);
          }
          
          // Supprimer le fond avec @imgly/background-removal-node
          const resultBlob = await removeBackground(imageSource, {
            progress: (key: string, current: number, total: number) => {
              console.log(`[Detourage] Progress: ${key} ${current}/${total}`);
            },
          });
          
          // Convertir le Blob en Buffer
          const arrayBuffer = await resultBlob.arrayBuffer();
          const resultBuffer = Buffer.from(arrayBuffer);
          
          // Uploader sur S3
          const timestamp = Date.now();
          const { url } = await storagePut(
            `detourage/${timestamp}.png`,
            resultBuffer,
            'image/png'
          );
          
          console.log('[Detourage] Success, result URL:', url);
          
          return {
            success: true,
            resultUrl: url,
          };
        } catch (error: any) {
          console.error('[Detourage] Error:', error);
          throw new Error(`Erreur lors du détourage: ${error.message || 'Erreur inconnue'}`);
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
