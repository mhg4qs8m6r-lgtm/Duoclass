/**
 * Service de synchronisation côté client
 * Gère la synchronisation bidirectionnelle entre IndexedDB (local) et le serveur (MySQL)
 */

// Clé de stockage pour le timestamp de dernière synchronisation (scopé par userId)
const LAST_SYNC_KEY_PREFIX = 'duoclass_last_sync_timestamp';
const SYNC_QUEUE_KEY = 'duoclass_sync_queue';

// UserId courant pour scoper le timestamp — mis à jour par setCurrentSyncUserId()
let currentSyncUserId: number | string | null = null;

/**
 * Définit le userId courant pour scoper les timestamps de sync.
 * Doit être appelé au login AVANT doInitialSync().
 */
export function setCurrentSyncUserId(userId: number | string | null): void {
  currentSyncUserId = userId;
}

function getSyncKey(): string {
  if (currentSyncUserId) {
    return `${LAST_SYNC_KEY_PREFIX}_${currentSyncUserId}`;
  }
  return `${LAST_SYNC_KEY_PREFIX}_default`;
}

// Types pour la synchronisation
export interface SyncQueueItem {
  id: string;
  entityType: 'category' | 'album' | 'photo' | 'settings' | 'project' | 'bibliotheque';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  error: string | null;
}

// État de la synchronisation
let syncStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncTime: null,
  pendingChanges: 0,
  error: null,
};

// Listeners pour les changements de statut
const statusListeners: Set<(status: SyncStatus) => void> = new Set();

/**
 * Récupère le timestamp de dernière synchronisation (scopé par userId)
 */
export function getLastSyncTimestamp(): number {
  if (typeof localStorage === 'undefined') return 0;
  const stored = localStorage.getItem(getSyncKey());
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Sauvegarde le timestamp de dernière synchronisation (scopé par userId)
 */
export function setLastSyncTimestamp(timestamp: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(getSyncKey(), timestamp.toString());
  syncStatus.lastSyncTime = timestamp;
  notifyStatusChange();
}

/**
 * Récupère la queue de synchronisation
 */
export function getSyncQueue(): SyncQueueItem[] {
  if (typeof localStorage === 'undefined') return [];
  const stored = localStorage.getItem(SYNC_QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Sauvegarde la queue de synchronisation
 */
function saveSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  syncStatus.pendingChanges = queue.length;
  notifyStatusChange();
}

/**
 * Ajoute un élément à la queue de synchronisation
 */
export function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
  const queue = getSyncQueue();
  
  // Vérifier si un élément similaire existe déjà
  const existingIndex = queue.findIndex(
    q => q.entityType === item.entityType && 
         q.data?.localId === item.data?.localId
  );
  
  const newItem: SyncQueueItem = {
    id: `${item.entityType}_${item.data?.localId || Date.now()}_${Date.now()}`,
    ...item,
    timestamp: Date.now(),
    retryCount: 0,
  };
  
  if (existingIndex >= 0) {
    // Remplacer l'élément existant
    queue[existingIndex] = newItem;
  } else {
    // Ajouter le nouvel élément
    queue.push(newItem);
  }
  
  saveSyncQueue(queue);
}

/**
 * Retire un élément de la queue
 */
function removeFromQueue(itemId: string): void {
  const queue = getSyncQueue();
  const newQueue = queue.filter(q => q.id !== itemId);
  saveSyncQueue(newQueue);
}

/**
 * Notifie les listeners d'un changement de statut
 */
function notifyStatusChange(): void {
  statusListeners.forEach(listener => listener({ ...syncStatus }));
}

/**
 * S'abonne aux changements de statut
 */
export function subscribeToSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  // Envoyer le statut actuel immédiatement
  listener({ ...syncStatus });
  
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Récupère le statut actuel de synchronisation
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * Traite la queue de synchronisation
 * Note: Cette fonction sera appelée avec le client tRPC passé en paramètre
 */
export async function processSyncQueue(): Promise<void> {
  if (!navigator.onLine || syncStatus.isSyncing) {
    return;
  }
  
  const queue = getSyncQueue();
  if (queue.length === 0) {
    return;
  }
  
  syncStatus.isSyncing = true;
  syncStatus.error = null;
  notifyStatusChange();
  
  // Note: La synchronisation réelle sera gérée par les hooks React
  // qui ont accès au client tRPC
  console.log('[Sync] Queue has', queue.length, 'items pending');
  
  syncStatus.isSyncing = false;
  notifyStatusChange();
}

/**
 * Marque un élément comme traité et le retire de la queue
 */
export function markItemProcessed(itemId: string): void {
  removeFromQueue(itemId);
}

/**
 * Marque un élément comme échoué et incrémente le compteur de retry
 */
export function markItemFailed(itemId: string): void {
  const queue = getSyncQueue();
  const item = queue.find(q => q.id === itemId);
  
  if (item) {
    item.retryCount++;
    
    // Supprimer après 5 tentatives
    if (item.retryCount >= 5) {
      removeFromQueue(itemId);
      console.error('[Sync] Item removed after 5 failed attempts:', itemId);
    } else {
      saveSyncQueue(queue);
    }
  }
}

/**
 * Vide la queue de synchronisation
 */
export function clearSyncQueue(): void {
  saveSyncQueue([]);
}

/**
 * Force une synchronisation complète
 */
export function forceFullSync(): void {
  setLastSyncTimestamp(0);
  console.log('[Sync] Full sync will be triggered on next sync');
}

// Écouter les changements de connexion
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncStatus.isOnline = true;
    notifyStatusChange();
    processSyncQueue();
  });
  
  window.addEventListener('offline', () => {
    syncStatus.isOnline = false;
    notifyStatusChange();
  });
  
  // Initialiser le statut
  syncStatus.lastSyncTime = getLastSyncTimestamp() || null;
  syncStatus.pendingChanges = getSyncQueue().length;
}
