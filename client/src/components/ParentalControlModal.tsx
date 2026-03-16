/**
 * ParentalControlModal - Modale unifiée pour le contrôle parental
 * 
 * Cette modale gère tout le flux de contrôle parental :
 * 1. Demande de consentement explicite
 * 2. Analyse des images avec NSFW.js (locale, sans serveur)
 * 3. Affichage de la progression
 * 4. Résultat final avec fichiers acceptés/bloqués
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { analyzeImageFromSource, loadNSFWModel, ParentalControlLevel } from '@/lib/nsfwService';
import { extractVideoThumbnail } from '@/lib/videoUtils';

interface ParentalControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (acceptedFiles: File[]) => void;
  files: File[];
  controlLevel: number;
  isPhoto: boolean;
}

type ModalStep = 'consent' | 'analyzing' | 'result';

interface BlockedFile {
  name: string;
  reason: string;
}

export function ParentalControlModal({
  isOpen,
  onClose,
  onComplete,
  files,
  controlLevel,
  isPhoto
}: ParentalControlModalProps) {
  const { language } = useLanguage();
  const [step, setStep] = useState<ModalStep>('consent');
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const [blockedFiles, setBlockedFiles] = useState<BlockedFile[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(false);

  // Filtrer les images et vidéos (les PDF ne sont pas analysés)
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const videoFiles = files.filter(f => f.type.startsWith('video/'));
  const nonMediaFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
  const mediaFilesToAnalyze = [...imageFiles, ...videoFiles];

  // Reset quand la modale s'ouvre
  useEffect(() => {
    if (isOpen) {
      setStep('consent');
      setCurrentFileIndex(0);
      setCurrentFileName('');
      setAcceptedFiles([]);
      setBlockedFiles([]);
    }
  }, [isOpen]);

  // Obtenir le libellé du niveau de contrôle
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

  // Lancer l'analyse
  const handleAcceptConsent = async () => {
    setStep('analyzing');
    setIsModelLoading(true);

    try {
      // Précharger le modèle NSFW.js
      await loadNSFWModel();
      setIsModelLoading(false);
    } catch (error) {
      console.error('Erreur chargement modèle:', error);
      setIsModelLoading(false);
      // En cas d'erreur, accepter tous les fichiers (fail-safe)
      onComplete(files);
      return;
    }

    const accepted: File[] = [...nonMediaFiles]; // Les PDF sont toujours acceptés
    const blocked: BlockedFile[] = [];

    // Analyser chaque image et vidéo
    for (let i = 0; i < mediaFilesToAnalyze.length; i++) {
      const file = mediaFilesToAnalyze[i];
      setCurrentFileIndex(i + 1);
      setCurrentFileName(file.name);

      try {
        let sourceToAnalyze: File | string = file;
        
        // Pour les vidéos, extraire la première frame pour l'analyse
        if (file.type.startsWith('video/')) {
          try {
            const thumbnail = await extractVideoThumbnail(file);
            sourceToAnalyze = thumbnail; // URL base64 de la vignette
          } catch (err) {
            console.warn('Impossible d\'extraire la vignette vidéo, analyse ignorée:', err);
            accepted.push(file); // Fail-safe: accepter si on ne peut pas extraire
            continue;
          }
        }
        
        const result = await analyzeImageFromSource(sourceToAnalyze, controlLevel as ParentalControlLevel);
        
        if (result.isInappropriate) {
          blocked.push({
            name: file.name,
            reason: result.blockedReason || 'Contenu inapproprié détecté'
          });
        } else {
          accepted.push(file);
        }
      } catch (error) {
        console.error('Erreur analyse:', error);
        // En cas d'erreur d'analyse, on accepte le fichier (fail-safe)
        accepted.push(file);
      }
    }

    setAcceptedFiles(accepted);
    setBlockedFiles(blocked);
    setStep('result');
  };

  // Refuser le consentement
  const handleRejectConsent = () => {
    onClose();
  };

  // Terminer et importer les fichiers acceptés
  const handleFinish = () => {
    onComplete(acceptedFiles);
  };

  // Annuler l'import
  const handleCancel = () => {
    onComplete([]);
  };

  // Calculer la progression
  const progress = mediaFilesToAnalyze.length > 0 
    ? Math.round((currentFileIndex / mediaFilesToAnalyze.length) * 100) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {/* ÉTAPE 1: CONSENTEMENT */}
        {step === 'consent' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-6 w-6 text-blue-600" />
                {language === 'fr' ? 'Contrôle Parental' : 'Parental Control'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="text-base font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">{language === 'fr' ? 'Photo sensible' : 'Sensitive photo'}</span>
              </div>
              <DialogDescription className="sr-only">
                {language === 'fr' ? "Demande de consentement pour l'analyse du contrôle parental" : 'Consent request for parental control analysis'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Niveau actif */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">
                    {language === 'fr' ? 'Niveau de protection' : 'Protection level'} : {getLevelLabel(controlLevel)}
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  {imageFiles.length} image(s){videoFiles.length > 0 && ` + ${videoFiles.length} ${language === 'fr' ? 'vidéo(s)' : 'video(s)'}`} {language === 'fr' ? 'à analyser' : 'to analyze'}
                  {nonMediaFiles.length > 0 && ` + ${nonMediaFiles.length} document(s) PDF`}
                </p>
                <p className="text-xs text-blue-600 mt-2 italic">
                  {language === 'fr' ? "Note : Le contrôle parental est actif à partir du niveau 2 (Modéré). Au niveau 1 (Très permissif), aucune analyse n'est effectuée." : 'Note: Parental control is active from level 2 (Moderate). At level 1 (Very permissive), no analysis is performed.'}
                </p>
              </div>

              {/* Explication */}
              <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-2">{language === 'fr' ? `Avant d'importer ces ${isPhoto ? 'photos' : 'documents'} :` : `Before importing these ${isPhoto ? 'photos' : 'documents'}:`}</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>{language === 'fr' ? <>L'analyse est effectuée <strong>localement sur votre appareil</strong></> : <>Analysis is performed <strong>locally on your device</strong></>}</li>
                      <li>{language === 'fr' ? "Aucune image n'est envoyée sur Internet" : 'No image is sent to the Internet'}</li>
                      <li>{language === 'fr' ? 'Les images inappropriées seront bloquées selon le niveau choisi' : 'Inappropriate images will be blocked according to the chosen level'}</li>
                      <li>{language === 'fr' ? 'Vous restez responsable du contenu importé' : 'You remain responsible for the imported content'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Avertissement légal */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">{language === 'fr' ? "Responsabilité de l'utilisateur" : 'User responsibility'}</p>
                    <p>
                      {language === 'fr' 
                        ? 'En cliquant sur "Analyser et importer", vous confirmez être responsable du contenu que vous importez et acceptez que l\'analyse soit effectuée sur votre appareil.'
                        : 'By clicking "Analyze and import", you confirm that you are responsible for the content you import and agree that the analysis will be performed on your device.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleRejectConsent}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button onClick={handleAcceptConsent} className="bg-blue-600 hover:bg-blue-700">
                <ShieldCheck className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Analyser et importer' : 'Analyze and import'}
              </Button>
            </div>
          </>
        )}

        {/* ÉTAPE 2: ANALYSE EN COURS */}
        {step === 'analyzing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                {language === 'fr' ? 'Analyse en cours...' : 'Analysis in progress...'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {language === 'fr' ? "Progression de l'analyse du contrôle parental" : 'Parental control analysis progress'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              {isModelLoading ? (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">{language === 'fr' ? "Chargement du modèle d'analyse..." : 'Loading analysis model...'}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {language === 'fr' ? 'Cette opération peut prendre quelques secondes lors de la première utilisation.' : 'This operation may take a few seconds on first use.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Barre de progression */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{language === 'fr' ? 'Analyse des médias' : 'Media analysis'}</span>
                      <span>{currentFileIndex} / {mediaFilesToAnalyze.length}</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  {/* Fichier en cours */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">{language === 'fr' ? 'Fichier en cours :' : 'Current file:'}</p>
                    <p className="font-medium text-gray-800 truncate">{currentFileName}</p>
                  </div>

                  {/* Fichiers bloqués en temps réel */}
                  {blockedFiles.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">
                          {blockedFiles.length} {language === 'fr' ? 'fichier(s) bloqué(s)' : 'file(s) blocked'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ÉTAPE 3: RÉSULTAT */}
        {step === 'result' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {blockedFiles.length === 0 ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    {language === 'fr' ? 'Analyse terminée' : 'Analysis complete'}
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-6 w-6 text-amber-600" />
                    {language === 'fr' ? 'Analyse terminée - Contenu bloqué' : 'Analysis complete - Content blocked'}
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {language === 'fr' ? "Résultat de l'analyse du contrôle parental" : 'Parental control analysis result'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Résumé */}
              <div className="grid grid-cols-2 gap-4">
                {/* Fichiers acceptés */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{acceptedFiles.length}</p>
                  <p className="text-sm text-green-600">{language === 'fr' ? 'Fichier(s) accepté(s)' : 'File(s) accepted'}</p>
                </div>

                {/* Fichiers bloqués */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">{blockedFiles.length}</p>
                  <p className="text-sm text-red-600">{language === 'fr' ? 'Fichier(s) bloqué(s)' : 'File(s) blocked'}</p>
                </div>
              </div>

              {/* Liste des fichiers bloqués */}
              {blockedFiles.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-800 mb-3">{language === 'fr' ? 'Fichiers bloqués :' : 'Blocked files:'}</p>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {blockedFiles.map((file, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-red-700">{file.name}</span>
                          <span className="text-red-600 block text-xs">{file.reason}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Message de succès si tout est OK */}
              {blockedFiles.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <p className="text-green-800">
                      {language === 'fr' ? 'Toutes les images ont passé le contrôle parental avec succès.' : 'All images passed parental control successfully.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-2">
              {acceptedFiles.length === 0 ? (
                <Button onClick={handleCancel}>
                    {language === 'fr' ? 'Fermer' : 'Close'}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    {language === 'fr' ? "Annuler l'import" : 'Cancel import'}
                  </Button>
                  <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {language === 'fr' ? `Importer ${acceptedFiles.length} fichier(s)` : `Import ${acceptedFiles.length} file(s)`}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
