/**
 * Hook React pour la synchronisation
 * Fournit un accès facile au service de synchronisation et à son statut
 */

import { useState, useEffect, useCallback } from 'react';
import {
  SyncStatus,
  getSyncStatus,
  subscribeToSyncStatus,
  processSyncQueue,
  addToSyncQueue,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
} from '../lib/syncService';
import { trpc } from '../lib/trpc';

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
  const changesSinceQuery = trpc.sync.getChangesSince.useQuery(
    { since: getLastSyncTimestamp() },
    { enabled: false }
  );

  /**
   * Effectue la synchronisation initiale au chargement
   */
  const doInitialSync = useCallback(async () => {
    // Vérifier si une synchronisation a déjà été faite
    const lastSync = getLastSyncTimestamp();
    
    try {
      if (lastSync === 0) {
        // Première synchronisation : pull complet
        console.log('[useSync] Performing initial full sync...');
        const result = await fullSyncQuery.refetch();
        if (result.data) {
          setLastSyncTimestamp(result.data.timestamp);
          setIsInitialSyncDone(true);
          return result.data;
        }
      } else {
        // Synchronisation incrémentale
        console.log('[useSync] Performing incremental sync since:', new Date(lastSync));
        const result = await changesSinceQuery.refetch();
        if (result.data) {
          setLastSyncTimestamp(result.data.timestamp);
          setIsInitialSyncDone(true);
          return result.data;
        }
      }
    } catch (error) {
      console.error('[useSync] Sync failed:', error);
    }
    
    // Traiter la queue locale
    await processSyncQueue();
    setIsInitialSyncDone(true);
    return null;
  }, [fullSyncQuery, changesSinceQuery]);

  /**
   * Synchronise une catégorie
   */
  const syncCategory = useCallback((data: any, action: 'create' | 'update' | 'delete' = 'update') => {
    addToSyncQueue({
      entityType: 'category',
      action,
      data,
    });
  }, []);

  /**
   * Synchronise un album
   */
  const syncAlbum = useCallback((data: any, action: 'create' | 'update' | 'delete' = 'update') => {
    addToSyncQueue({
      entityType: 'album',
      action,
      data,
    });
  }, []);

  /**
   * Synchronise une photo (métadonnées)
   */
  const syncPhoto = useCallback((data: any, action: 'create' | 'update' | 'delete' = 'update') => {
    addToSyncQueue({
      entityType: 'photo',
      action,
      data,
    });
  }, []);

  /**
   * Synchronise les paramètres
   */
  const syncSettings = useCallback((data: any) => {
    addToSyncQueue({
      entityType: 'settings',
      action: 'update',
      data,
    });
  }, []);

  /**
   * Force une synchronisation complète
   */
  const forceFullSync = useCallback(async () => {
    await processSyncQueue();
    const result = await fullSyncQuery.refetch();
    if (result.data) {
      setLastSyncTimestamp(result.data.timestamp);
    }
    return result.data;
  }, [fullSyncQuery]);

  /**
   * Force le traitement de la queue
   */
  const processQueue = useCallback(async () => {
    await processSyncQueue();
  }, []);

  return {
    status,
    isInitialSyncDone,
    doInitialSync,
    syncCategory,
    syncAlbum,
    syncPhoto,
    syncSettings,
    forceFullSync,
    processQueue,
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
