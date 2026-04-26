/**
 * Fonctions de base de données pour la synchronisation
 * Gère les opérations CRUD sur les catégories, albums et métadonnées photos
 */

import { eq, and, gt, sql, desc, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  categories,
  albums,
  photoMetadata,
  userSettings,
  syncLog,
  projects,
  projectVersions,
  bibliothequeItems,
  sharedModeles,
  usefulLinks,
  InsertCategory,
  InsertAlbum,
  InsertPhotoMetadata,
  InsertUserSettings,
  InsertProject,
  InsertBibliothequeItem,
  Category,
  Album,
  PhotoMetadata,
  UserSettings,
  Project,
  BibliothequeItem,
  SharedModele,
  UsefulLink,
} from "../drizzle/schema";

// ==================== CATÉGORIES ====================

/**
 * Récupère toutes les catégories d'un utilisateur
 */
export async function getUserCategories(userId: number): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.sortOrder);
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get categories:", error);
    return [];
  }
}

/**
 * Récupère les catégories modifiées depuis un timestamp
 */
export async function getCategoriesSince(userId: number, since: number): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.userId, userId),
        gt(categories.syncTimestamp, since)
      ));
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get categories since:", error);
    return [];
  }
}

/**
 * Crée ou met à jour une catégorie
 */
export async function upsertCategory(data: InsertCategory): Promise<Category | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };

    // Vérifier si la catégorie existe déjà
    const existing = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.userId, data.userId),
        eq(categories.localId, data.localId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Mise à jour
      await db
        .update(categories)
        .set(values)
        .where(eq(categories.id, existing[0].id));
      
      return { ...existing[0], ...values };
    } else {
      // Création
      const result = await db.insert(categories).values(values);
      const insertId = Number(result[0].insertId);
      
      const created = await db
        .select()
        .from(categories)
        .where(eq(categories.id, insertId))
        .limit(1);
      
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert category:", error);
    return null;
  }
}

/**
 * Supprime une catégorie
 */
export async function deleteCategory(userId: number, localId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .delete(categories)
      .where(and(
        eq(categories.userId, userId),
        eq(categories.localId, localId)
      ));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete category:", error);
    return false;
  }
}

// ==================== ALBUMS ====================

/**
 * Récupère tous les albums d'un utilisateur
 */
export async function getUserAlbums(userId: number): Promise<Album[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(albums)
      .where(eq(albums.userId, userId))
      .orderBy(albums.sortOrder);
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get albums:", error);
    return [];
  }
}

/**
 * Récupère les albums modifiés depuis un timestamp
 */
export async function getAlbumsSince(userId: number, since: number): Promise<Album[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(albums)
      .where(and(
        eq(albums.userId, userId),
        gt(albums.syncTimestamp, since)
      ));
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get albums since:", error);
    return [];
  }
}

/**
 * Crée ou met à jour un album
 */
export async function upsertAlbum(data: InsertAlbum): Promise<Album | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };

    // Vérifier si l'album existe déjà
    const existing = await db
      .select()
      .from(albums)
      .where(and(
        eq(albums.userId, data.userId),
        eq(albums.localId, data.localId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Mise à jour
      await db
        .update(albums)
        .set(values)
        .where(eq(albums.id, existing[0].id));
      
      return { ...existing[0], ...values };
    } else {
      // Création
      const result = await db.insert(albums).values(values);
      const insertId = Number(result[0].insertId);
      
      const created = await db
        .select()
        .from(albums)
        .where(eq(albums.id, insertId))
        .limit(1);
      
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert album:", error);
    return null;
  }
}

/**
 * Supprime un album
 */
export async function deleteAlbum(userId: number, localId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .delete(albums)
      .where(and(
        eq(albums.userId, userId),
        eq(albums.localId, localId)
      ));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete album:", error);
    return false;
  }
}

// ==================== PHOTOS METADATA ====================

/**
 * Récupère toutes les métadonnées photos d'un utilisateur
 */
export async function getUserPhotosMetadata(userId: number): Promise<PhotoMetadata[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(photoMetadata)
      .where(and(
        eq(photoMetadata.userId, userId),
        eq(photoMetadata.isDeleted, false)
      ));
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get photos metadata:", error);
    return [];
  }
}

/**
 * Récupère les métadonnées photos modifiées depuis un timestamp
 */
export async function getPhotosMetadataSince(userId: number, since: number): Promise<PhotoMetadata[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(photoMetadata)
      .where(and(
        eq(photoMetadata.userId, userId),
        gt(photoMetadata.syncTimestamp, since)
      ));
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get photos metadata since:", error);
    return [];
  }
}

/**
 * Récupère les métadonnées photos d'un album
 */
export async function getAlbumPhotosMetadata(userId: number, albumLocalId: string): Promise<PhotoMetadata[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(photoMetadata)
      .where(and(
        eq(photoMetadata.userId, userId),
        eq(photoMetadata.albumLocalId, albumLocalId),
        eq(photoMetadata.isDeleted, false)
      ))
      .orderBy(photoMetadata.position);
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get album photos metadata:", error);
    return [];
  }
}

/**
 * Crée ou met à jour une métadonnée photo
 */
export async function upsertPhotoMetadata(data: InsertPhotoMetadata): Promise<PhotoMetadata | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };

    // Vérifier si la métadonnée existe déjà
    const existing = await db
      .select()
      .from(photoMetadata)
      .where(and(
        eq(photoMetadata.userId, data.userId),
        eq(photoMetadata.localId, data.localId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Mise à jour
      await db
        .update(photoMetadata)
        .set(values)
        .where(eq(photoMetadata.id, existing[0].id));
      
      return { ...existing[0], ...values } as PhotoMetadata;
    } else {
      // Création
      const result = await db.insert(photoMetadata).values(values);
      const insertId = Number(result[0].insertId);
      
      const created = await db
        .select()
        .from(photoMetadata)
        .where(eq(photoMetadata.id, insertId))
        .limit(1);
      
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert photo metadata:", error);
    return null;
  }
}

/**
 * Synchronise un lot de métadonnées photos
 */
export async function syncPhotosMetadataBatch(
  userId: number,
  photos: InsertPhotoMetadata[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const photo of photos) {
    const result = await upsertPhotoMetadata({ ...photo, userId });
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Supprime (soft delete) une métadonnée photo
 */
export async function deletePhotoMetadata(userId: number, localId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const now = Date.now();
    await db
      .update(photoMetadata)
      .set({ 
        isDeleted: true, 
        deletedAt: new Date(),
        syncTimestamp: now 
      })
      .where(and(
        eq(photoMetadata.userId, userId),
        eq(photoMetadata.localId, localId)
      ));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete photo metadata:", error);
    return false;
  }
}

// ==================== PARAMÈTRES UTILISATEUR ====================

/**
 * Récupère les paramètres d'un utilisateur
 */
export async function getUserSettings(userId: number): Promise<UserSettings | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Sync] Failed to get user settings:", error);
    return null;
  }
}

/**
 * Crée ou met à jour les paramètres utilisateur
 */
export async function upsertUserSettings(data: InsertUserSettings): Promise<UserSettings | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };

    // Vérifier si les paramètres existent déjà
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, data.userId))
      .limit(1);

    if (existing.length > 0) {
      // Mise à jour
      await db
        .update(userSettings)
        .set(values)
        .where(eq(userSettings.id, existing[0].id));
      
      return { ...existing[0], ...values } as UserSettings;
    } else {
      // Création
      const result = await db.insert(userSettings).values(values);
      const insertId = Number(result[0].insertId);
      
      const created = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.id, insertId))
        .limit(1);
      
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert user settings:", error);
    return null;
  }
}

// ==================== PROJETS ====================

export async function getUserProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  } catch (error) {
    console.error("[Sync] Failed to get projects:", error);
    return [];
  }
}

export async function getProjectsSince(userId: number, since: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(projects).where(and(
      eq(projects.userId, userId),
      gt(projects.syncTimestamp, since)
    ));
  } catch (error) {
    console.error("[Sync] Failed to get projects since:", error);
    return [];
  }
}

export async function upsertProject(data: InsertProject): Promise<Project | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };
    const existing = await db.select().from(projects)
      .where(and(eq(projects.userId, data.userId), eq(projects.localId, data.localId)))
      .limit(1);

    if (existing.length > 0) {
      const old = existing[0];

      // Sauvegarder la version actuelle avant écrasement (backup)
      try {
        await db.insert(projectVersions).values({
          projectId: old.id,
          userId: old.userId,
          localId: old.localId,
          name: old.name,
          canvasElements: old.canvasElements,
          canvasData: old.canvasData,
          photos: old.photos,
          canvasFormat: old.canvasFormat,
          canvasFormatWidth: old.canvasFormatWidth,
          canvasFormatHeight: old.canvasFormatHeight,
          thumbnail: old.thumbnail,
          projectType: old.projectType,
          projectCategory: old.projectCategory,
          collecteurData: old.collecteurData,
        });

        // Ne garder que les 5 dernières versions
        const allVersions = await db
          .select({ id: projectVersions.id })
          .from(projectVersions)
          .where(and(
            eq(projectVersions.userId, old.userId),
            eq(projectVersions.localId, old.localId)
          ))
          .orderBy(desc(projectVersions.savedAt));

        if (allVersions.length > 5) {
          const idsToDelete = allVersions.slice(5).map(v => v.id);
          await db.delete(projectVersions).where(inArray(projectVersions.id, idsToDelete));
        }
      } catch (versionError) {
        console.warn("[Sync] Failed to save project version (non-blocking):", versionError);
      }

      await db.update(projects).set(values).where(eq(projects.id, old.id));
      return { ...old, ...values } as Project;
    } else {
      await db.insert(projects).values(values);
      const created = await db.select().from(projects)
        .where(and(eq(projects.userId, data.userId), eq(projects.localId, data.localId)))
        .limit(1);
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert project:", error);
    return null;
  }
}

export async function deleteProject(userId: number, localId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(projectVersions).where(and(eq(projectVersions.userId, userId), eq(projectVersions.localId, localId)));
    await db.delete(projects).where(and(eq(projects.userId, userId), eq(projects.localId, localId)));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete project:", error);
    return false;
  }
}

// ==================== BIBLIOTHÈQUE ====================

export async function getUserBibliothequeItems(userId: number): Promise<BibliothequeItem[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(bibliothequeItems).where(eq(bibliothequeItems.userId, userId));
  } catch (error) {
    console.error("[Sync] Failed to get bibliotheque items:", error);
    return [];
  }
}

export async function getBibliothequeItemsSince(userId: number, since: number): Promise<BibliothequeItem[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(bibliothequeItems).where(and(
      eq(bibliothequeItems.userId, userId),
      gt(bibliothequeItems.syncTimestamp, since)
    ));
  } catch (error) {
    console.error("[Sync] Failed to get bibliotheque items since:", error);
    return [];
  }
}

export async function upsertBibliothequeItem(data: InsertBibliothequeItem): Promise<BibliothequeItem | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };
    const existing = await db.select().from(bibliothequeItems)
      .where(and(eq(bibliothequeItems.userId, data.userId), eq(bibliothequeItems.localId, data.localId)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(bibliothequeItems).set(values).where(eq(bibliothequeItems.id, existing[0].id));
      return { ...existing[0], ...values } as BibliothequeItem;
    } else {
      await db.insert(bibliothequeItems).values(values);
      const created = await db.select().from(bibliothequeItems)
        .where(and(eq(bibliothequeItems.userId, data.userId), eq(bibliothequeItems.localId, data.localId)))
        .limit(1);
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert bibliotheque item:", error);
    return null;
  }
}

export async function deleteBibliothequeItem(userId: number, localId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(bibliothequeItems).where(and(
      eq(bibliothequeItems.userId, userId),
      eq(bibliothequeItems.localId, localId)
    ));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete bibliotheque item:", error);
    return false;
  }
}

// ==================== JOURNAL DE SYNCHRONISATION ====================

/**
 * Enregistre une action de synchronisation
 */
export async function logSyncAction(data: {
  userId: number;
  entityType: "category" | "album" | "photo" | "settings" | "project" | "bibliotheque";
  entityLocalId: string;
  action: "create" | "update" | "delete";
  previousData?: string;
  newData?: string;
  deviceFingerprint?: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(syncLog).values({
      ...data,
      timestamp: Date.now(),
    });
    return true;
  } catch (error) {
    console.error("[Sync] Failed to log sync action:", error);
    return false;
  }
}

/**
 * Récupère l'historique de synchronisation depuis un timestamp
 */
export async function getSyncLogSince(userId: number, since: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(syncLog)
      .where(and(
        eq(syncLog.userId, userId),
        gt(syncLog.timestamp, since)
      ))
      .orderBy(syncLog.timestamp);
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get sync log:", error);
    return [];
  }
}

// ==================== RÉINITIALISATION D'USINE ====================

/**
 * Supprime TOUTES les données d'un utilisateur (factory reset côté serveur).
 * Ne touche pas au compte utilisateur lui-même ni aux modèles partagés.
 */
export async function purgeAllUserData(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await Promise.all([
      db.delete(categories).where(eq(categories.userId, userId)),
      db.delete(albums).where(eq(albums.userId, userId)),
      db.delete(photoMetadata).where(eq(photoMetadata.userId, userId)),
      db.delete(projectVersions).where(eq(projectVersions.userId, userId)),
      db.delete(projects).where(eq(projects.userId, userId)),
      db.delete(bibliothequeItems).where(eq(bibliothequeItems.userId, userId)),
      db.delete(userSettings).where(eq(userSettings.userId, userId)),
      db.delete(syncLog).where(eq(syncLog.userId, userId)),
    ]);
    console.log(`[Sync] Factory reset: purged all data for userId=${userId}`);
    return true;
  } catch (error) {
    console.error("[Sync] Failed to purge user data:", error);
    return false;
  }
}

// ==================== MODÈLES PARTAGÉS ====================

export async function getAllSharedModeles(): Promise<SharedModele[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(sharedModeles).orderBy(sharedModeles.createdAt);
  } catch (error) {
    console.error("[Sync] Failed to get shared modeles:", error);
    return [];
  }
}

export async function createSharedModele(data: {
  category: string;
  filename: string;
  imageData: string;
  uploadedBy: number;
}): Promise<SharedModele | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(sharedModeles).values(data).returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Sync] Failed to create shared modele:", error);
    return null;
  }
}

export async function deleteSharedModele(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(sharedModeles).where(eq(sharedModeles.id, id));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete shared modele:", error);
    return false;
  }
}

export async function purgeAllSharedModeles(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(sharedModeles);
    console.log("[Sync] All shared modeles purged");
    return true;
  } catch (error) {
    console.error("[Sync] Failed to purge shared modeles:", error);
    return false;
  }
}

// ==================== ADRESSES UTILES ====================

export async function getAllUsefulLinks(): Promise<UsefulLink[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(usefulLinks).orderBy(usefulLinks.ordre, usefulLinks.createdAt);
  } catch (error) {
    console.error("[Sync] Failed to get useful links:", error);
    return [];
  }
}

export async function createUsefulLink(data: {
  title: string;
  description: string;
  url: string;
  tags: string[];
  ordre?: number;
}): Promise<UsefulLink | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(usefulLinks).values(data).returning();
    return result[0] || null;
  } catch (error) {
    console.error("[Sync] Failed to create useful link:", error);
    return null;
  }
}

export async function updateUsefulLink(id: number, data: {
  title?: string;
  description?: string;
  url?: string;
  tags?: string[];
  ordre?: number;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(usefulLinks).set(data).where(eq(usefulLinks.id, id));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to update useful link:", error);
    return false;
  }
}

export async function deleteUsefulLink(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(usefulLinks).where(eq(usefulLinks.id, id));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete useful link:", error);
    return false;
  }
}
