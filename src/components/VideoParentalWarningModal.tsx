/**
 * VideoParentalWarningModal - Modale d'avertissement pour l'import de vidéos
 * 
 * S'affiche quand l'utilisateur essaie d'importer une vidéo avec le contrôle parental activé.
 * Propose de désactiver temporairement le contrôle parental avec option de rétablissement automatique.
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Shield, ShieldOff, Video, RefreshCw } from 'lucide-react';

interface VideoParentalWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisableAndContinue: (autoRestore: boolean) => void;
  onCancel: () => void;
  currentLevel: number;
}

export function VideoParentalWarningModal({
  isOpen,
  onClose,
  onDisableAndContinue,
  onCancel,
  currentLevel
}: VideoParentalWarningModalProps) {
  const { language } = useLanguage();
  const [autoRestoreEnabled, setAutoRestoreEnabled] = useState(true);
  
  const getLevelLabel = (level: number): string => {
    const labels: Record<number, string> = language === 'fr' ? {
      0: 'Désactivé',
      1: 'Très permissif',
      2: 'Modéré',
      3: 'Standard',
      4: 'Strict',
      5: 'Très strict'
    } : {
      0: 'Disabled',
      1: 'Very permissive',
      2: 'Moderate',
      3: 'Standard',
      4: 'Strict',
      5: 'Very strict'
    };
    return labels[level] || (language === 'fr' ? 'Inconnu' : 'Unknown');
  };

  const handleContinue = () => {
    onDisableAndContinue(autoRestoreEnabled);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-orange-600">
            <AlertTriangle className="h-6 w-6" />
            {language === 'fr' ? 'Import de vidéo' : 'Video import'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {language === 'fr' ? "Avertissement concernant le contrôle parental et l'import de vidéos" : 'Warning about parental control and video import'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Icône vidéo */}
          <div className="flex justify-center">
            <div className="p-4 bg-orange-100 rounded-full">
              <Video className="h-12 w-12 text-orange-600" />
            </div>
          </div>

          {/* Niveau actuel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800">
                {language === 'fr' ? 'Contrôle parental actif' : 'Parental control active'}
              </span>
            </div>
            <p className="text-sm text-blue-700">
              {language === 'fr' ? 'Niveau actuel' : 'Current level'} : <strong>{getLevelLabel(currentLevel)}</strong> ({language === 'fr' ? 'niveau' : 'level'} {currentLevel})
            </p>
          </div>

          {/* Message principal */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-orange-800 text-sm leading-relaxed">
              <strong>{language === 'fr' ? "L'import de vidéos nécessite de désactiver temporairement le contrôle parental." : 'Video import requires temporarily disabling parental control.'}</strong>
            </p>
            <p className="text-orange-700 text-sm mt-2 leading-relaxed">
              {language === 'fr' ? 'Le contrôle parental analyse uniquement la première image de la vidéo, ce qui peut bloquer des vidéos parfaitement appropriées.' : 'Parental control only analyzes the first frame of the video, which may block perfectly appropriate videos.'}
            </p>
          </div>

          {/* Option de rétablissement automatique */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="autoRestore" 
                checked={autoRestoreEnabled}
                onCheckedChange={(checked) => setAutoRestoreEnabled(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label 
                  htmlFor="autoRestore" 
                  className="text-sm font-semibold text-green-800 cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {language === 'fr' ? "Rétablir automatiquement après l'import" : 'Automatically restore after import'}
                </label>
                <p className="text-xs text-green-700 mt-1">
                  {language === 'fr' ? <>Le contrôle parental sera automatiquement remis au niveau <strong>{getLevelLabel(currentLevel)}</strong> une fois l'import terminé.</> : <>Parental control will be automatically restored to level <strong>{getLevelLabel(currentLevel)}</strong> once the import is complete.</>}
                </p>
              </div>
            </div>
          </div>

          {/* Rappel si pas de rétablissement automatique */}
          {!autoRestoreEnabled && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">{language === 'fr' ? "N'oubliez pas !" : "Don't forget!"}</p>
                  <p>
                    {language === 'fr' ? <>{"Pensez à "}<strong>réactiver votre contrôle parental</strong>{" après avoir placé la vidéo dans l'album."}</> : <>{"Remember to "}<strong>re-enable parental control</strong>{" after placing the video in the album."}</>}
                  </p>
                  <p className="mt-2 text-amber-700 italic">
                    {language === 'fr' ? 'Administration → Sécurité → Contrôle Parental' : 'Administration → Security → Parental Control'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            onClick={handleContinue} 
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <ShieldOff className="h-4 w-4 mr-2" />
            {autoRestoreEnabled 
              ? (language === 'fr' ? "Désactiver, importer et rétablir" : "Disable, import and restore")
              : (language === 'fr' ? "Désactiver temporairement et importer" : "Temporarily disable and import")
            }
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            {language === 'fr' ? "Annuler l'import" : 'Cancel import'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
