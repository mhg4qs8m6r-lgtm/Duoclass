import { usePrivateAlbumsStorage } from '@/hooks/useLocalStorage';
import { HardDrive, AlertTriangle, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface StorageGaugeProps {
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

export default function StorageGauge({ 
  showLabel = true, 
  compact = false,
  className = '' 
}: StorageGaugeProps) {
  const { t } = useLanguage();
  const storage = usePrivateAlbumsStorage();

  // Couleur de la barre selon le niveau
  const getBarColor = () => {
    if (storage.isAtLimit) return 'bg-red-500';
    if (storage.isNearLimit) return 'bg-orange-500';
    if (storage.usedPercentage > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Couleur du texte selon le niveau
  const getTextColor = () => {
    if (storage.isAtLimit) return 'text-red-600';
    if (storage.isNearLimit) return 'text-orange-600';
    return 'text-gray-600';
  };

  // Icône selon le niveau
  const getIcon = () => {
    if (storage.isAtLimit) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (storage.isNearLimit) {
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
    return <HardDrive className="w-4 h-4 text-gray-500" />;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getIcon()}
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
          <div 
            className={`h-full ${getBarColor()} transition-all duration-300`}
            style={{ width: `${Math.min(100, storage.usedPercentage)}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${getTextColor()}`}>
          {storage.formattedUsed}
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-lg border shadow-sm ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2 mb-2">
          {getIcon()}
          <span className="font-medium text-gray-700">
            {t('storage.localStorage')}
          </span>
        </div>
      )}
      
      {/* Barre de progression */}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${Math.min(100, storage.usedPercentage)}%` }}
        />
      </div>
      
      {/* Statistiques */}
      <div className="flex justify-between text-sm">
        <span className={getTextColor()}>
          {storage.formattedUsed} / {storage.formattedLimit}
        </span>
        <span className={`font-medium ${getTextColor()}`}>
          {storage.usedPercentage.toFixed(1)}%
        </span>
      </div>
      
      {/* Message d'alerte si proche de la limite */}
      {storage.isNearLimit && !storage.isAtLimit && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-xs text-orange-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {t('storage.nearLimit')}
          </p>
        </div>
      )}
      
      {/* Message si limite atteinte */}
      {storage.isAtLimit && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-700 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {t('storage.atLimit')}
          </p>
        </div>
      )}
      
      {/* Espace restant */}
      <p className="mt-2 text-xs text-gray-500">
        {t('storage.remaining')} : {storage.formattedRemaining}
      </p>
    </div>
  );
}
