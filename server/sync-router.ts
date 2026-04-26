/**
 * Routes API de synchronisation
 * Permet la synchronisation bidirectionnelle entre le client et le serveur
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import {
  getUserCategories,
  getCategoriesSince,
  upsertCategory,
  deleteCategory,
  getUserAlbums,
  getAlbumsSince,
  upsertAlbum,
  deleteAlbum,
  getUserPhotosMetadata,
  getPhotosMetadataSince,
  getAlbumPhotosMetadata,
  upsertPhotoMetadata,
  syncPhotosMetadataBatch,
  deletePhotoMetadata,
  getUserSettings,
  upsertUserSettings,
  getUserProjects,
  getProjectsSince,
  upsertProject,
  deleteProject,
  getUserBibliothequeItems,
  getBibliothequeItemsSince,
  upsertBibliothequeItem,
  deleteBibliothequeItem,
  getSyncLogSince,
  logSyncAction,
  getAllSharedModeles,
  createSharedModele,
  deleteSharedModele,
  purgeAllSharedModeles,
  getAllUsefulLinks,
  createUsefulLink,
  updateUsefulLink,
  deleteUsefulLink,
  purgeAllUserData,
} from "./sync-db";
import { uploadThumbnail, uploadThumbnailsBatch } from "./thumbnails";

// Schémas de validation
const categorySchema = z.object({
  localId: z.string(),
  name: z.string(),
  contentType: z.enum(["photos", "documents"]).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  isSystem: z.boolean().optional(),
});

const albumSchema = z.object({
  localId: z.string(),
  categoryLocalId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  contentType: z.enum(["photos", "documents"]).optional(),
  coverPhotoLocalId: z.string().optional(),
  sortOrder: z.number().optional(),
  photoCount: z.number().optional(),
  isSystem: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  framesData: z.string().optional(),
});

const photoMetadataSchema = z.object({
  localId: z.string(),
  albumLocalId: z.string().optional(),
  fileName: z.string().optional(),
  mediaType: z.enum(["photo", "video", "document"]).optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fileHash: z.string().optional(),
  position: z.number().optional(),
  rotation: z.number().optional(),
  cropData: z.string().optional(),
  scale: z.number().optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
  tags: z.string().optional(),
  rating: z.number().optional(),
  isFavorite: z.boolean().optional(),
  dateTaken: z.string().optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  cameraModel: z.string().optional(),
});

const userSettingsSchema = z.object({
  displayMode: z.string().optional(),
  thumbnailSize: z.number().optional(),
  themeColor: z.string().optional(),
  backgroundTexture: z.string().optional(),
  language: z.string().optional(),
  defaultPhotoSort: z.string().optional(),
  defaultSortOrder: z.string().optional(),
  autoCreateThumbnails: z.boolean().optional(),
  detectDuplicates: z.boolean().optional(),
  readExifData: z.boolean().optional(),
  additionalSettings: z.string().optional(),
});

const projectSchema = z.object({
  localId: z.string(),
  name: z.string(),
  canvasElements: z.string().optional(),
  canvasData: z.string().optional(),
  photos: z.string().optional(),
  canvasFormat: z.string().optional(),
  canvasFormatWidth: z.number().optional(),
  canvasFormatHeight: z.number().optional(),
  thumbnail: z.string().optional(),
  projectType: z.string().optional(),
  projectCategory: z.string().optional(),
  collecteurData: z.string().optional(),
});

const bibliothequeItemSchema = z.object({
  localId: z.string(),
  category: z.string(),
  type: z.string().optional(),
  name: z.string(),
  url: z.string().optional(),
  thumbnail: z.string().optional(),
  fullImage: z.string().optional(),
  sourcePhotoId: z.string().optional(),
  addedAt: z.number().optional(),
});

export const syncRouter = router({
  // ==================== CATÉGORIES ====================
  
  categories: router({
    /**
     * Récupère toutes les catégories de l'utilisateur
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const categories = await getUserCategories(ctx.user.id);
      return { categories, timestamp: Date.now() };
    }),

    /**
     * Récupère les catégories modifiées depuis un timestamp
     */
    getSince: protectedProcedure
      .input(z.object({ since: z.number() }))
      .query(async ({ ctx, input }) => {
        const categories = await getCategoriesSince(ctx.user.id, input.since);
        return { categories, timestamp: Date.now() };
      }),

    /**
     * Crée ou met à jour une catégorie
     */
    upsert: protectedProcedure
      .input(categorySchema)
      .mutation(async ({ ctx, input }) => {
        const category = await upsertCategory({
          ...input,
          userId: ctx.user.id,
        });
        
        if (category) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "category",
            entityLocalId: input.localId,
            action: "update",
            newData: JSON.stringify(input),
          });
        }
        
        return { success: !!category, category };
      }),

    /**
     * Synchronise plusieurs catégories en batch
     */
    syncBatch: protectedProcedure
      .input(z.object({ categories: z.array(categorySchema) }))
      .mutation(async ({ ctx, input }) => {
        const results = await Promise.all(
          input.categories.map(cat => upsertCategory({ ...cat, userId: ctx.user.id }))
        );
        
        const success = results.filter(r => r !== null).length;
        const failed = results.filter(r => r === null).length;
        
        return { success, failed, timestamp: Date.now() };
      }),

    /**
     * Supprime une catégorie
     */
    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteCategory(ctx.user.id, input.localId);
        
        if (success) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "category",
            entityLocalId: input.localId,
            action: "delete",
          });
        }
        
        return { success };
      }),
  }),

  // ==================== ALBUMS ====================
  
  albums: router({
    /**
     * Récupère tous les albums de l'utilisateur
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const albums = await getUserAlbums(ctx.user.id);
      return { albums, timestamp: Date.now() };
    }),

    /**
     * Récupère les albums modifiés depuis un timestamp
     */
    getSince: protectedProcedure
      .input(z.object({ since: z.number() }))
      .query(async ({ ctx, input }) => {
        const albums = await getAlbumsSince(ctx.user.id, input.since);
        return { albums, timestamp: Date.now() };
      }),

    /**
     * Crée ou met à jour un album
     */
    upsert: protectedProcedure
      .input(albumSchema)
      .mutation(async ({ ctx, input }) => {
        const album = await upsertAlbum({
          ...input,
          userId: ctx.user.id,
        });
        
        if (album) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "album",
            entityLocalId: input.localId,
            action: "update",
            newData: JSON.stringify(input),
          });
        }
        
        return { success: !!album, album };
      }),

    /**
     * Synchronise plusieurs albums en batch
     */
    syncBatch: protectedProcedure
      .input(z.object({ albums: z.array(albumSchema) }))
      .mutation(async ({ ctx, input }) => {
        const results = await Promise.all(
          input.albums.map(album => upsertAlbum({ ...album, userId: ctx.user.id }))
        );
        
        const success = results.filter(r => r !== null).length;
        const failed = results.filter(r => r === null).length;
        
        return { success, failed, timestamp: Date.now() };
      }),

    /**
     * Supprime un album
     */
    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteAlbum(ctx.user.id, input.localId);
        
        if (success) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "album",
            entityLocalId: input.localId,
            action: "delete",
          });
        }
        
        return { success };
      }),
  }),

  // ==================== PHOTOS METADATA ====================
  
  photos: router({
    /**
     * Récupère toutes les métadonnées photos de l'utilisateur
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const photos = await getUserPhotosMetadata(ctx.user.id);
      return { photos, timestamp: Date.now() };
    }),

    /**
     * Récupère les métadonnées modifiées depuis un timestamp
     */
    getSince: protectedProcedure
      .input(z.object({ since: z.number() }))
      .query(async ({ ctx, input }) => {
        const photos = await getPhotosMetadataSince(ctx.user.id, input.since);
        return { photos, timestamp: Date.now() };
      }),

    /**
     * Récupère les métadonnées d'un album spécifique
     */
    getByAlbum: protectedProcedure
      .input(z.object({ albumLocalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const photos = await getAlbumPhotosMetadata(ctx.user.id, input.albumLocalId);
        return { photos, timestamp: Date.now() };
      }),

    /**
     * Crée ou met à jour une métadonnée photo
     */
    upsert: protectedProcedure
      .input(photoMetadataSchema)
      .mutation(async ({ ctx, input }) => {
        const photo = await upsertPhotoMetadata({
          ...input,
          userId: ctx.user.id,
          dateTaken: input.dateTaken ? new Date(input.dateTaken) : undefined,
        });
        
        if (photo) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "photo",
            entityLocalId: input.localId,
            action: "update",
            newData: JSON.stringify(input),
          });
        }
        
        return { success: !!photo, photo };
      }),

    /**
     * Synchronise plusieurs métadonnées photos en batch
     */
    syncBatch: protectedProcedure
      .input(z.object({ photos: z.array(photoMetadataSchema) }))
      .mutation(async ({ ctx, input }) => {
        const photos = input.photos.map(p => ({
          ...p,
          userId: ctx.user.id,
          dateTaken: p.dateTaken ? new Date(p.dateTaken) : undefined,
        }));
        
        const result = await syncPhotosMetadataBatch(ctx.user.id, photos);
        
        return { ...result, timestamp: Date.now() };
      }),

    /**
     * Supprime une métadonnée photo (soft delete)
     */
    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deletePhotoMetadata(ctx.user.id, input.localId);
        
        if (success) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "photo",
            entityLocalId: input.localId,
            action: "delete",
          });
        }
        
        return { success };
      }),
  }),

  // ==================== PROJETS ====================

  projects: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const items = await getUserProjects(ctx.user.id);
      return { projects: items, timestamp: Date.now() };
    }),

    upsert: protectedProcedure
      .input(projectSchema)
      .mutation(async ({ ctx, input }) => {
        const project = await upsertProject({ ...input, userId: ctx.user.id });
        if (project) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "project",
            entityLocalId: input.localId,
            action: "update",
            newData: JSON.stringify({ name: input.name }),
          });
        }
        return { success: !!project, project };
      }),

    syncBatch: protectedProcedure
      .input(z.object({ projects: z.array(projectSchema) }))
      .mutation(async ({ ctx, input }) => {
        const results = await Promise.all(
          input.projects.map(p => upsertProject({ ...p, userId: ctx.user.id }))
        );
        return {
          success: results.filter(r => r !== null).length,
          failed: results.filter(r => r === null).length,
          timestamp: Date.now(),
        };
      }),

    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteProject(ctx.user.id, input.localId);
        if (success) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "project",
            entityLocalId: input.localId,
            action: "delete",
          });
        }
        return { success };
      }),
  }),

  // ==================== BIBLIOTHÈQUE ====================

  bibliotheque: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const items = await getUserBibliothequeItems(ctx.user.id);
      return { items, timestamp: Date.now() };
    }),

    upsert: protectedProcedure
      .input(bibliothequeItemSchema)
      .mutation(async ({ ctx, input }) => {
        const item = await upsertBibliothequeItem({ ...input, userId: ctx.user.id });
        if (item) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "bibliotheque",
            entityLocalId: input.localId,
            action: "update",
            newData: JSON.stringify({ name: input.name, category: input.category }),
          });
        }
        return { success: !!item, item };
      }),

    syncBatch: protectedProcedure
      .input(z.object({ items: z.array(bibliothequeItemSchema) }))
      .mutation(async ({ ctx, input }) => {
        const results = await Promise.all(
          input.items.map(item => upsertBibliothequeItem({ ...item, userId: ctx.user.id }))
        );
        return {
          success: results.filter(r => r !== null).length,
          failed: results.filter(r => r === null).length,
          timestamp: Date.now(),
        };
      }),

    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteBibliothequeItem(ctx.user.id, input.localId);
        if (success) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "bibliotheque",
            entityLocalId: input.localId,
            action: "delete",
          });
        }
        return { success };
      }),
  }),

  // ==================== MINIATURES ====================
  
  thumbnails: router({
    /**
     * Upload une miniature
     */
    upload: protectedProcedure
      .input(z.object({
        photoLocalId: z.string(),
        data: z.string(), // Base64 encoded image
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await uploadThumbnail(
          ctx.user.id,
          input.photoLocalId,
          input.data
        );
        
        if (result) {
          // Mettre à jour la métadonnée photo avec l'URL de la miniature
          await upsertPhotoMetadata({
            userId: ctx.user.id,
            localId: input.photoLocalId,
            thumbnailUrl: result.url,
            thumbnailKey: result.key,
          });
        }
        
        return { success: !!result, url: result?.url, key: result?.key };
      }),

    /**
     * Upload plusieurs miniatures en batch
     */
    uploadBatch: protectedProcedure
      .input(z.object({
        thumbnails: z.array(z.object({
          photoLocalId: z.string(),
          data: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const thumbnails = input.thumbnails.map(t => ({
          photoLocalId: t.photoLocalId,
          data: t.data,
        }));
        
        const results = await uploadThumbnailsBatch(ctx.user.id, thumbnails);
        
        // Mettre à jour les métadonnées photos avec les URLs
        for (const result of results) {
          if (result.url) {
            await upsertPhotoMetadata({
              userId: ctx.user.id,
              localId: result.photoLocalId,
              thumbnailUrl: result.url,
              thumbnailKey: result.key || undefined,
            });
          }
        }
        
        const success = results.filter(r => r.url !== null).length;
        const failed = results.filter(r => r.url === null).length;
        
        return { success, failed, results };
      }),
  }),

  // ==================== PARAMÈTRES ====================
  
  settings: router({
    /**
     * Récupère les paramètres de l'utilisateur
     */
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      return { settings, timestamp: Date.now() };
    }),

    /**
     * Met à jour les paramètres de l'utilisateur
     */
    update: protectedProcedure
      .input(userSettingsSchema)
      .mutation(async ({ ctx, input }) => {
        const settings = await upsertUserSettings({
          ...input,
          userId: ctx.user.id,
        });
        
        if (settings) {
          await logSyncAction({
            userId: ctx.user.id,
            entityType: "settings",
            entityLocalId: "user_settings",
            action: "update",
            newData: JSON.stringify(input),
          });
        }
        
        return { success: !!settings, settings };
      }),
  }),

  // ==================== RÉINITIALISATION D'USINE ====================

  /**
   * Supprime toutes les données de l'utilisateur en base (factory reset serveur)
   */
  factoryReset: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await purgeAllUserData(ctx.user.id);
    if (result) {
      await logSyncAction({
        userId: ctx.user.id,
        entityType: "settings",
        entityLocalId: "factory_reset",
        action: "delete",
        newData: JSON.stringify({ reason: "factory_reset" }),
      });
    }
    return { success: result };
  }),

  // ==================== SYNCHRONISATION COMPLÈTE ====================

  /**
   * Récupère toutes les données pour une synchronisation initiale
   */
  getFullSync: protectedProcedure.query(async ({ ctx }) => {
    const [categories, albums, photos, settings, projects, bibliothequeItems] = await Promise.all([
      getUserCategories(ctx.user.id),
      getUserAlbums(ctx.user.id),
      getUserPhotosMetadata(ctx.user.id),
      getUserSettings(ctx.user.id),
      getUserProjects(ctx.user.id),
      getUserBibliothequeItems(ctx.user.id),
    ]);

    return {
      categories,
      albums,
      photos,
      settings,
      projects,
      bibliothequeItems,
      timestamp: Date.now(),
    };
  }),

  /**
   * Récupère les modifications depuis un timestamp (sync incrémentale)
   */
  getChangesSince: protectedProcedure
    .input(z.object({ since: z.number() }))
    .query(async ({ ctx, input }) => {
      const [categories, albums, photos, projectsList, biblioItems, syncLogEntries] = await Promise.all([
        getCategoriesSince(ctx.user.id, input.since),
        getAlbumsSince(ctx.user.id, input.since),
        getPhotosMetadataSince(ctx.user.id, input.since),
        getProjectsSince(ctx.user.id, input.since),
        getBibliothequeItemsSince(ctx.user.id, input.since),
        getSyncLogSince(ctx.user.id, input.since),
      ]);

      return {
        categories,
        albums,
        photos,
        projects: projectsList,
        bibliothequeItems: biblioItems,
        syncLog: syncLogEntries,
        timestamp: Date.now(),
      };
    }),

  /**
   * Synchronise toutes les données en une seule requête
   */
  pushFullSync: protectedProcedure
    .input(z.object({
      categories: z.array(categorySchema).optional(),
      albums: z.array(albumSchema).optional(),
      photos: z.array(photoMetadataSchema).optional(),
      settings: userSettingsSchema.optional(),
      projects: z.array(projectSchema).optional(),
      bibliothequeItems: z.array(bibliothequeItemSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = {
        categories: { success: 0, failed: 0 },
        albums: { success: 0, failed: 0 },
        photos: { success: 0, failed: 0 },
        projects: { success: 0, failed: 0 },
        bibliothequeItems: { success: 0, failed: 0 },
        settings: false,
      };

      // Synchroniser les catégories
      if (input.categories) {
        for (const cat of input.categories) {
          const result = await upsertCategory({ ...cat, userId: ctx.user.id });
          if (result) results.categories.success++;
          else results.categories.failed++;
        }
      }

      // Synchroniser les albums
      if (input.albums) {
        for (const album of input.albums) {
          const result = await upsertAlbum({ ...album, userId: ctx.user.id });
          if (result) results.albums.success++;
          else results.albums.failed++;
        }
      }

      // Synchroniser les photos
      if (input.photos) {
        const photos = input.photos.map(p => ({
          ...p,
          userId: ctx.user.id,
          dateTaken: p.dateTaken ? new Date(p.dateTaken) : undefined,
        }));
        const photoResult = await syncPhotosMetadataBatch(ctx.user.id, photos);
        results.photos = photoResult;
      }

      // Synchroniser les paramètres
      if (input.settings) {
        const settingsResult = await upsertUserSettings({
          ...input.settings,
          userId: ctx.user.id,
        });
        results.settings = !!settingsResult;
      }

      // Synchroniser les projets
      if (input.projects) {
        for (const p of input.projects) {
          const result = await upsertProject({ ...p, userId: ctx.user.id });
          if (result) results.projects.success++;
          else results.projects.failed++;
        }
      }

      // Synchroniser la bibliothèque
      if (input.bibliothequeItems) {
        for (const item of input.bibliothequeItems) {
          const result = await upsertBibliothequeItem({ ...item, userId: ctx.user.id });
          if (result) results.bibliothequeItems.success++;
          else results.bibliothequeItems.failed++;
        }
      }

      return { results, timestamp: Date.now() };
    }),

  // ==================== MODÈLES PARTAGÉS ====================

  sharedModeles: router({
    /** Tous les utilisateurs authentifiés peuvent lister les modèles */
    getAll: protectedProcedure.query(async () => {
      const items = await getAllSharedModeles();
      const grouped: Record<string, Array<{ id: number; filename: string; imageData: string }>> = {};
      for (const item of items) {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push({ id: item.id, filename: item.filename, imageData: item.imageData });
      }
      return grouped;
    }),

    /** Admin uniquement : uploader un nouveau modèle */
    upload: adminProcedure
      .input(z.object({
        category: z.enum(["passe-partout", "pele-mele", "cadres", "bordures"]),
        filename: z.string(),
        imageData: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const modele = await createSharedModele({
          category: input.category,
          filename: input.filename,
          imageData: input.imageData,
          uploadedBy: ctx.user.id,
        });
        return { success: !!modele, modele };
      }),

    /** Admin uniquement : supprimer un modèle */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await deleteSharedModele(input.id);
        return { success };
      }),

    /** Admin uniquement : vider toute la bibliothèque */
    clearAll: adminProcedure
      .mutation(async () => {
        const success = await purgeAllSharedModeles();
        return { success };
      }),
  }),

  // ==================== ADRESSES UTILES ====================

  usefulLinks: router({
    /** Tous les utilisateurs authentifiés peuvent lister les liens */
    getAll: protectedProcedure.query(async () => {
      return await getAllUsefulLinks();
    }),

    /** Admin uniquement : créer un lien */
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().default(""),
        url: z.string().url(),
        tags: z.array(z.string()).default([]),
        ordre: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const link = await createUsefulLink(input);
        return { success: !!link, link };
      }),

    /** Admin uniquement : modifier un lien */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        url: z.string().url().optional(),
        tags: z.array(z.string()).optional(),
        ordre: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const success = await updateUsefulLink(id, data);
        return { success };
      }),

    /** Admin uniquement : supprimer un lien */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await deleteUsefulLink(input.id);
        return { success };
      }),
  }),
});

export type SyncRouter = typeof syncRouter;
