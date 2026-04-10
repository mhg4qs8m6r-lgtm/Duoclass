/**
 * Composant invisible qui déclenche la synchronisation initiale au login
 * et traite la queue de sync périodiquement.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { getSyncQueue } from '@/lib/syncService';

const QUEUE_POLL_INTERVAL = 5000; // 5 secondes

export default function SyncInitializer() {
  const { user, isAuthenticated } = useAuth();
  const { doInitialSync, processQueue } = useSync();
  const hasSynced = useRef(false);

  // Déclencher la sync initiale quand l'utilisateur est authentifié
  useEffect(() => {
    if (isAuthenticated && user && !hasSynced.current) {
      hasSynced.current = true;
      console.log('[SyncInitializer] User authenticated, starting initial sync...');
      doInitialSync();
    }
    if (!isAuthenticated) {
      hasSynced.current = false;
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
