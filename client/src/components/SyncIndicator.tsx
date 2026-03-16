/**
 * Composant indicateur de synchronisation
 * Affiche le statut de synchronisation dans l'interface
 */

import React from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSync';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

interface SyncIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncIndicator({ className, showDetails = false }: SyncIndicatorProps) {
  const { language } = useLanguage();
  const status = useSyncStatus();

  // Déterminer l'icône et la couleur
  let Icon = Cloud;
  let color = 'text-green-500';
  let label = language === 'fr' ? 'Synchronisé' : 'Synced';

  if (!status.isOnline) {
    Icon = CloudOff;
    color = 'text-gray-400';
    label = language === 'fr' ? 'Hors ligne' : 'Offline';
  } else if (status.isSyncing) {
    Icon = RefreshCw;
    color = 'text-blue-500';
    label = language === 'fr' ? 'Synchronisation...' : 'Syncing...';
  } else if (status.error) {
    Icon = AlertCircle;
    color = 'text-red-500';
    label = language === 'fr' ? 'Erreur de sync' : 'Sync error';
  } else if (status.pendingChanges > 0) {
    Icon = RefreshCw;
    color = 'text-yellow-500';
    label = language === 'fr' ? `${status.pendingChanges} en attente` : `${status.pendingChanges} pending`;
  } else {
    Icon = Check;
    color = 'text-green-500';
    label = language === 'fr' ? 'Synchronisé' : 'Synced';
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon 
        className={cn(
          'w-4 h-4',
          color,
          status.isSyncing && 'animate-spin'
        )} 
      />
      {showDetails && (
        <span className={cn('text-sm', color)}>
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Composant de statut de synchronisation détaillé
 */
export function SyncStatusPanel({ className }: { className?: string }) {
  const { language } = useLanguage();
  const status = useSyncStatus();

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return language === 'fr' ? 'Jamais' : 'Never';
    return new Date(timestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className={cn('p-4 bg-gray-50 rounded-lg', className)}>
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <Cloud className="w-5 h-5" />
        Synchronisation
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">{language === 'fr' ? 'Statut' : 'Status'}</span>
          <span className={cn(
            'font-medium',
            status.isOnline ? 'text-green-600' : 'text-gray-500'
          )}>
            {status.isOnline ? (language === 'fr' ? 'En ligne' : 'Online') : (language === 'fr' ? 'Hors ligne' : 'Offline')}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">{language === 'fr' ? 'Dernière sync' : 'Last sync'}</span>
          <span className="font-medium">
            {formatDate(status.lastSyncTime)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">{language === 'fr' ? 'En attente' : 'Pending'}</span>
          <span className={cn(
            'font-medium',
            status.pendingChanges > 0 ? 'text-yellow-600' : 'text-green-600'
          )}>
            {status.pendingChanges} {language === 'fr' ? 'modification(s)' : 'change(s)'}
          </span>
        </div>
        
        {status.error && (
          <div className="mt-2 p-2 bg-red-50 text-red-600 rounded text-xs">
            {status.error}
          </div>
        )}
        
        {status.isSyncing && (
          <div className="mt-2 flex items-center gap-2 text-blue-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{language === 'fr' ? 'Synchronisation en cours...' : 'Synchronizing...'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncIndicator;
