/**
 * Hook React pour la synchronisation
 * Fournit un accès facile au service de synchronisation et à son statut
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SyncStatus,
  getSyncStatus,
  subscribeToSyncStatus,
  getSyncQueue,
  addToSyncQueue,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  setCurrentSyncUserId,
  markItemProcessed,
  markItemFailed,
} from '../lib/syncService';
import { trpc } from '../lib/trpc';
import { db } from '../lib/db';

/**
 * Peuple IndexedDB avec les projets et éléments bibliothèque du serveur
 */
async function populateLocalFromServer(data: any) {
  // Catégories
  if (data.categories?.length) {
    for (const cat of data.categories) {
      await db.categories.put({
        id: cat.localId,
        label: cat.name,
        color: cat.color || '#6366f1',
        isDefault: cat.isSystem ?? false,
        accessType: cat.localId?.includes('sec_') ? 'secure' : 'standard',
        series: cat.contentType === 'documents' ? 'classpapiers' : 'photoclass',
      });
    }
    console.log(`[useSync] Populated ${data.categories.length} categories from server`);
  }

  // Albums (métadonnées + frames si présentes)
  if (data.albums?.length) {
    for (const album of data.albums) {
      await db.album_metas.put({
        id: album.localId,
        title: album.name,
        type: album.isPrivate ? 'secure' : 'standard',
        series: album.contentType === 'documents' ? 'classpapiers' : 'photoclass',
        createdAt: new Date(album.createdAt).getTime(),
        categoryId: album.categoryLocalId ?? undefined,
      });
      // Restaurer les frames (images) si le serveur en possède
      if (album.framesData) {
        try {
          const frames = JSON.parse(album.framesData);
          if (Array.isArray(frames) && frames.length > 0) {
            const existingAlbum = await db.albums.get(album.localId);
            if (existingAlbum) {
              // Fusionner : garder les frames locales non présentes sur le serveur
              const serverFrameIds = new Set(frames.map((f: any) => f.id));
              const localOnly = (existingAlbum.frames ?? []).filter((f: any) => !serverFrameIds.has(f.id));
              await db.albums.put({
                ...existingAlbum,
                frames: [...frames, ...localOnly],
                updatedAt: Date.now(),
              });
            } else {
              await db.albums.put({
                id: album.localId,
                title: album.name,
                type: album.isPrivate ? 'secure' : 'standard',
                series: album.contentType === 'documents' ? 'classpapiers' : 'photoclass',
                createdAt: new Date(album.createdAt).getTime(),
                frames,
                updatedAt: Date.now(),
              } as any);
            }
          }
        } catch (e) {
          console.warn(`[useSync] Failed to parse framesData for album ${album.localId}:`, e);
        }
      }
    }
    console.log(`[useSync] Populated ${data.albums.length} albums from server`);
  }

  // Projets — fusionner avec les données locales pour ne pas écraser projectType/canvasData
  if (data.projects?.length) {
    for (const p of data.projects) {
      const existing = await db.creations_projects.get(p.localId);
      const serverData = {
        id: p.localId,
        name: p.name,
        canvasElements: p.canvasElements ? JSON.parse(p.canvasElements) : [],
        canvasData: p.canvasData ? JSON.parse(p.canvasData) : undefined,
        photos: p.photos ? JSON.parse(p.photos) : undefined,
        canvasFormat: p.canvasFormat ?? undefined,
        canvasFormatWidth: p.canvasFormatWidth ?? undefined,
        canvasFormatHeight: p.canvasFormatHeight ?? undefined,
        thumbnail: p.thumbnail ?? undefined,
        projectType: p.projectType ?? undefined,
        projectCategory: p.projectCategory ?? undefined,
        createdAt: new Date(p.createdAt).getTime(),
        updatedAt: new Date(p.updatedAt).getTime(),
      };
      if (existing) {
        // Conserver les valeurs locales si le serveur n'en a pas
        await db.creations_projects.put({
          ...existing,
          ...serverData,
          projectType: serverData.projectType || existing.projectType,
          projectCategory: serverData.projectCategory || existing.projectCategory,
          canvasData: serverData.canvasData || existing.canvasData,
        });
      } else {
        await db.creations_projects.put(serverData);
      }

      // Restaurer les items collecteur associés au projet
      if (p.collecteurData) {
        try {
          const items = JSON.parse(p.collecteurData);
          if (Array.isArray(items)) {
            for (const item of items) {
              // Ne pas écraser un item local déjà présent
              const existingItem = await db.collecteur.get(item.id);
              if (!existingItem) {
                await db.collecteur.put(item);
              }
            }
          }
        } catch (e) {
          console.warn(`[useSync] Failed to parse collecteurData for project ${p.localId}:`, e);
        }
      }
    }
    console.log(`[useSync] Populated ${data.projects.length} projects from server`);
  }

  // Bibliothèque
  if (data.bibliothequeItems?.length) {
    for (const item of data.bibliothequeItems) {
      await db.bibliotheque_items.put({
        id: item.localId,
        category: item.category as any,
        type: item.type ?? undefined,
        name: item.name,
        url: item.url ?? '',
        thumbnail: item.thumbnail ?? undefined,
        fullImage: item.fullImage ?? undefined,
        sourcePhotoId: item.sourcePhotoId ?? undefined,
        addedAt: item.addedAt ?? undefined,
        createdAt: item.createdAt ? new Date(item.createdAt).getTime() : undefined,
      });
    }
    console.log(`[useSync] Populated ${data.bibliothequeItems.length} bibliotheque items from server`);
  }
}

/**
 * Hook pour accéder au statut de synchronisation
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

/**
 * Hook pour les opérations de synchronisation
 */
export function useSync() {
  const status = useSyncStatus();
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

  // tRPC queries et mutations
  const fullSyncQuery = trpc.sync.getFullSync.useQuery(undefined, { enabled: false });
  // Note: on n'utilise plus changesSinceQuery avec un timestamp figé.
  // On appelle directement le client tRPC dans doInitialSync pour passer le timestamp frais.
  const trpcCtx = trpc.useUtils();

  // tRPC mutations pour le traitement de la queue
  const upsertProject = trpc.sync.projects.upsert.useMutation();
  const deleteProjectMut = trpc.sync.projects.delete.useMutation();
  const upsertBiblio = trpc.sync.bibliotheque.upsert.useMutation();
  const deleteBiblioMut = trpc.sync.bibliotheque.delete.useMutation();
  const upsertCategory = trpc.sync.categories.upsert.useMutation();
  const deleteCategoryMut = trpc.sync.categories.delete.useMutation();
  const upsertAlbum = trpc.sync.albums.upsert.useMutation();
  const deleteAlbumMut = trpc.sync.albums.delete.useMutation();
  const upsertPhoto = trpc.sync.photos.upsert.useMutation();
  const deletePhotoMut = trpc.sync.photos.delete.useMutation();
  const updateSettings = trpc.sync.settings.update.useMutation();

  /**
   * Traite réellement la queue de synchronisation via tRPC
   */
  const processQueueReal = useCallback(async () => {
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    console.log('[useSync] Processing sync queue:', queue.length, 'items');

    for (const item of queue) {
      try {
        const { entityType, action, data } = item;

        if (entityType === 'project') {
          if (action === 'delete') {
            await deleteProjectMut.mutateAsync({ localId: data.localId });
          } else {
            await upsertProject.mutateAsync(data);
          }
        } else if (entityType === 'bibliotheque') {
          if (action === 'delete') {
            await deleteBiblioMut.mutateAsync({ localId: data.localId });
          } else {
            await upsertBiblio.mutateAsync(data);
          }
        } else if (entityType === 'category') {
          if (action === 'delete') {
            await deleteCategoryMut.mutateAsync({ localId: data.localId });
          } else {
            await upsertCategory.mutateAsync(data);
          }
        } else if (entityType === 'album') {
          if (action === 'delete') {
            await deleteAlbumMut.mutateAsync({ localId: data.localId });
          } else {
            await upsertAlbum.mutateAsync(data);
          }
        } else if (entityType === 'photo') {
          if (action === 'delete') {
            await deletePhotoMut.mutateAsync({ localId: data.localId });
          } else {
            await upsertPhoto.mutateAsync(data);
          }
        } else if (entityType === 'settings') {
          await updateSettings.mutateAsync(data);
        }

        markItemProcessed(item.id);
      } catch (error) {
        console.error('[useSync] Failed to sync item:', item.id, error);
        markItemFailed(item.id);
      }
    }
  }, [
    upsertProject, deleteProjectMut,
    upsertBiblio, deleteBiblioMut,
    upsertCategory, deleteCategoryMut,
    upsertAlbum, deleteAlbumMut,
    upsertPhoto, deletePhotoMut,
    updateSettings,
  ]);

  /**
   * Effectue la synchronisation initiale au chargement.
   * Accepte un userId optionnel pour scoper le timestamp.
   */
  const doInitialSync = useCallback(async (userId?: number | string) => {
    // Scoper le timestamp par userId
    if (userId) {
      setCurrentSyncUserId(userId);
    }

    const lastSync = getLastSyncTimestamp();

    try {
      if (lastSync === 0) {
        // Première sync : téléchargement complet
        console.log('[useSync] Performing initial full sync...');
        const result = await fullSyncQuery.refetch();
        if (result.data) {
          await populateLocalFromServer(result.data);
          setLastSyncTimestamp(result.data.timestamp);
          setIsInitialSyncDone(true);
          return result.data;
        }
      } else {
        // Sync incrémentale : utiliser fetch() avec le timestamp FRAIS (pas celui du render)
        console.log('[useSync] Performing incremental sync since:', new Date(lastSync));
        const data = await trpcCtx.sync.getChangesSince.fetch({ since: lastSync });
        if (data) {
          await populateLocalFromServer(data);
          setLastSyncTimestamp(data.timestamp);
          setIsInitialSyncDone(true);
          return data;
        }
      }
    } catch (error) {
      console.error('[useSync] Sync failed, falling back to full sync:', error);
      // Fallback : en cas d'échec de la sync incrémentale, tenter une sync complète
      try {
        const result = await fullSyncQuery.refetch();
        if (result.data) {
          await populateLocalFromServer(result.data);
          setLastSyncTimestamp(result.data.timestamp);
          setIsInitialSyncDone(true);
          return result.data;
        }
      } catch (fallbackError) {
        console.error('[useSync] Full sync fallback also failed:', fallbackError);
      }
    }

    setIsInitialSyncDone(true);
    return null;
  }, [fullSyncQuery, trpcCtx]);

  /**
   * Synchronise une catégorie
   */
  const syncCategory = useCallback((data: any, action: 'create' | 'update' | 'delete' = 'update') => {
    addToSyncQueue({ entityType: 'category', action, data });
  }, []);

  /**
   * Synchronise un album
   */
  const syncAlbum = useCallback((data: any, action: 'create' | 'update' | 'delete' = 'update') => {
    addToSyncQueue({ entityType: 'album', action, data });
  }, []);

  /**
   * Synchronise une photo (métadonnées)
   */
  const syncPhoto = useCallback((data: any, action: 'create' | 'update' | 'delete' = 'update') => {
    addToSyncQueue({ entityType: 'photo', action, data });
  }, []);

  /**
   * Synchronise les paramètres
   */
  const syncSettings = useCallback((data: any) => {
    addToSyncQueue({ entityType: 'settings', action: 'update', data });
  }, []);

  /**
   * Synchronise un projet
   */
  const syncProject = useCallback((data: any, action: 'create' | 'update' | 'delete' = 'update') => {
    addToSyncQueue({ entityType: 'project', action, data });
  }, []);

  /**
   * Synchronise un élément bibliothèque
   */
  const syncBibliothequeItem = useCallback((data: any, action: 'create' | 'update' | 'delete' = 'update') => {
    addToSyncQueue({ entityType: 'bibliotheque', action, data });
  }, []);

  /**
   * Force une synchronisation complète
   */
  const forceFullSync = useCallback(async () => {
    await processQueueReal();
    const result = await fullSyncQuery.refetch();
    if (result.data) {
      await populateLocalFromServer(result.data);
      setLastSyncTimestamp(result.data.timestamp);
    }
    return result.data;
  }, [fullSyncQuery, processQueueReal]);

  return {
    status,
    isInitialSyncDone,
    doInitialSync,
    syncCategory,
    syncAlbum,
    syncPhoto,
    syncSettings,
    syncProject,
    syncBibliothequeItem,
    forceFullSync,
    processQueue: processQueueReal,
  };
}

/**
 * Hook pour synchroniser automatiquement les changements
 * À utiliser dans les composants qui modifient les données
 */
export function useAutoSync() {
  const { syncCategory, syncAlbum, syncPhoto, syncSettings } = useSync();

  return {
    onCategoryChange: syncCategory,
    onAlbumChange: syncAlbum,
    onPhotoChange: syncPhoto,
    onSettingsChange: syncSettings,
  };
}
