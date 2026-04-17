/**
 * Composant invisible qui déclenche la synchronisation initiale au login
 * et traite la queue de sync périodiquement.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { getSyncQueue, setCurrentSyncUserId } from '@/lib/syncService';

const QUEUE_POLL_INTERVAL = 5000; // 5 secondes

export default function SyncInitializer() {
  const { user, isAuthenticated } = useAuth();
  const { doInitialSync, processQueue } = useSync();
  const hasSynced = useRef(false);

  // Déclencher la sync initiale quand l'utilisateur est authentifié
  useEffect(() => {
    if (isAuthenticated && user && !hasSynced.current) {
      hasSynced.current = true;
      // Scoper le timestamp de sync par userId AVANT la sync
      setCurrentSyncUserId(user.id);
      console.log('[SyncInitializer] User authenticated (id=%s), starting initial sync...', user.id);
      doInitialSync(user.id);
    }
    if (!isAuthenticated) {
      hasSynced.current = false;
      setCurrentSyncUserId(null);
    }
  }, [isAuthenticated, user, doInitialSync]);

  // Traiter la queue de sync périodiquement
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const queue = getSyncQueue();
      if (queue.length > 0) {
        processQueue();
      }
    }, QUEUE_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated, processQueue]);

  return null;
}
