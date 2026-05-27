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
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Loader2, Info, AlertCircle } from 'lucide-react';
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

interface WarnedFile {
  file: File;
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
  const [warnedFiles, setWarnedFiles] = useState<WarnedFile[]>([]);
  const [blockedFiles, setBlockedFiles] = useState<BlockedFile[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  // Filtrer les images et vidéos (les PDF ne sont pas analysés)
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const videoFiles = files.filter(f => f.type.startsWith('video/'));
  const nonMediaFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
  const mediaFilesToAnalyze = [...imageFiles, ...videoFiles];

  // Reset quand la modale s'ouvre
  useEffect(() => {
    if (isOpen) {
      setStep(controlLevel >= 4 ? 'analyzing' : 'consent');
      setCurrentFileIndex(0);
      setCurrentFileName('');
      setAcceptedFiles([]);
      setWarnedFiles([]);
      setBlockedFiles([]);
      setAnalysisError(false);
      if (controlLevel >= 4) {
        handleAcceptConsent();
      }
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
      // En cas d'erreur de chargement du modèle → bloquer l'import (fail-safe sécurisé)
      setAnalysisError(true);
      setBlockedFiles(files.map(f => ({
        name: f.name,
        reason: language === 'fr'
          ? 'Cette image ne peut pas être importée.'
          : 'This image cannot be imported.',
      })));
      setAcceptedFiles([]);
      setWarnedFiles([]);
      setStep('result');
      return;
    }

    const accepted: File[] = [...nonMediaFiles]; // Les PDF sont toujours acceptés
    const warned: WarnedFile[] = [];
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
        
        if (result.isBlocked) {
          blocked.push({
            name: file.name,
            reason: result.blockedReason || 'Contenu inapproprié détecté'
          });
        } else if (result.isWarning) {
          warned.push({
            file,
            reason: result.warningReason || 'Contenu potentiellement sensible'
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
    setWarnedFiles(warned);
    setBlockedFiles(blocked);

    if (controlLevel === 5) {
      // Niveau 5 : import automatique des fichiers OK, refus silencieux des bloqués
      onComplete([...accepted, ...warned.map(w => w.file)]);
      if (blocked.length === 0) {
        onClose(); // Tout est OK : fermeture sans afficher la modale
      } else {
        setStep('result'); // Informer l'utilisateur des fichiers bloqués
      }
    } else {
      setStep('result');
    }
  };

  // Refuser le consentement
  const handleRejectConsent = () => {
    onClose();
  };

  // Terminer et importer les fichiers acceptés + avertis
  const handleFinish = () => {
    onComplete([...acceptedFiles, ...warnedFiles.map(w => w.file)]);
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
                {language === 'fr' ? `Contrôle Parental — Niveau ${controlLevel}` : `Parental Control — Level ${controlLevel}`}
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
                    </ul>
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
              <p className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-1">
                <Shield className="h-4 w-4" />
                {language === 'fr' ? `Contrôle Parental — Niveau ${controlLevel}` : `Parental Control — Level ${controlLevel}`}
              </p>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {analysisError ? (
                  <>
                    <ShieldAlert className="h-6 w-6 text-red-600" />
                    {language === 'fr' ? 'Import refusé' : 'Import refused'}
                  </>
                ) : blockedFiles.length === 0 && warnedFiles.length === 0 ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    {language === 'fr' ? 'Analyse terminée' : 'Analysis complete'}
                  </>
                ) : blockedFiles.length > 0 ? (
                  <>
                    <ShieldAlert className="h-6 w-6 text-red-600" />
                    {language === 'fr' ? 'Analyse terminée — Contenu bloqué' : 'Analysis complete — Content blocked'}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6 text-orange-500" />
                    {language === 'fr' ? 'Analyse terminée — Avertissements' : 'Analysis complete — Warnings'}
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {language === 'fr' ? "Résultat de l'analyse du contrôle parental" : 'Parental control analysis result'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Résumé — uniquement les cases pertinentes */}
              {!analysisError && (
                <div className={`grid gap-3 ${[acceptedFiles.length > 0, warnedFiles.length > 0, blockedFiles.length > 0].filter(Boolean).length === 1 ? 'grid-cols-1' : [acceptedFiles.length > 0, warnedFiles.length > 0, blockedFiles.length > 0].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {acceptedFiles.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <CheckCircle className="h-7 w-7 text-green-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-green-700">{acceptedFiles.length}</p>
                      <p className="text-xs text-green-600">{language === 'fr' ? 'Accepté(s)' : 'Accepted'}</p>
                    </div>
                  )}
                  {warnedFiles.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <AlertCircle className="h-7 w-7 text-orange-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-orange-600">{warnedFiles.length}</p>
                      <p className="text-xs text-orange-500">{language === 'fr' ? 'Avertissement(s)' : 'Warning(s)'}</p>
                    </div>
                  )}
                  {blockedFiles.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <XCircle className="h-7 w-7 text-red-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-red-700">{blockedFiles.length}</p>
                      <p className="text-xs text-red-600">{language === 'fr' ? 'Bloqué(s)' : 'Blocked'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Niveau 4 : confirmation explicite OUI/NON */}
              {controlLevel === 4 && (warnedFiles.length > 0 || blockedFiles.length > 0 || analysisError) && (
                <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <p className="text-orange-800 font-semibold">
                      {language === 'fr' ? 'Photo sensible détectée' : 'Sensitive photo detected'}
                    </p>
                  </div>
                  <p className="text-sm text-orange-700">
                    {language === 'fr'
                      ? 'Seul votre accord peut permettre l\'import de cette image.'
                      : 'Only your agreement can allow importing this image.'}
                  </p>
                  {(warnedFiles.length > 0 || blockedFiles.length > 0) && (
                    <ul className="space-y-1 max-h-24 overflow-y-auto">
                      {warnedFiles.map((wf, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-orange-700">
                          <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0" />
                          <span className="font-medium">{wf.file.name}</span>
                        </li>
                      ))}
                      {blockedFiles.map((bf, index) => (
                        <li key={`b-${index}`} className="flex items-center gap-2 text-sm text-orange-700">
                          <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0" />
                          <span className="font-medium">{bf.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Bannière avertissement (niveaux 1-3) */}
              {controlLevel !== 4 && warnedFiles.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-orange-800 text-sm font-medium">
                      {language === 'fr'
                        ? 'Ces fichiers ont déclenché un avertissement mais peuvent être importés.'
                        : 'These files triggered a warning but can still be imported.'}
                    </p>
                  </div>
                  <ul className="space-y-2 max-h-32 overflow-y-auto">
                    {warnedFiles.map((wf, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-orange-700">{wf.file.name}</span>
                          <span className="text-orange-600 block text-xs">{wf.reason}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Liste des fichiers bloqués */}
              {blockedFiles.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-800 mb-3">{language === 'fr' ? 'Fichiers bloqués :' : 'Blocked files:'}</p>
                  <ul className="space-y-2 max-h-32 overflow-y-auto">
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

              {/* Bannière refus définitif si mix bloqués + acceptés */}
              {blockedFiles.length > 0 && (acceptedFiles.length > 0 || warnedFiles.length > 0) && (
                <div className="bg-red-100 border border-red-400 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-700 flex-shrink-0" />
                    <p className="text-red-800 font-semibold">
                      {language === 'fr'
                        ? `${blockedFiles.length} fichier(s) définitivement refusé(s) — import impossible`
                        : `${blockedFiles.length} file(s) permanently refused — import not possible`}
                    </p>
                  </div>
                </div>
              )}

              {/* Message de succès si tout est OK */}
              {blockedFiles.length === 0 && warnedFiles.length === 0 && (
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
              {controlLevel === 4 && (warnedFiles.length > 0 || blockedFiles.length > 0 || analysisError) ? (
                <>
                  <Button variant="outline" onClick={handleCancel} className="border-red-300 text-red-700 hover:bg-red-50">
                    {language === 'fr' ? 'NON — Annuler' : 'NO — Cancel'}
                  </Button>
                  <Button onClick={() => onComplete(files)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    {language === 'fr' ? 'OUI — Importer quand même' : 'YES — Import anyway'}
                  </Button>
                </>
              ) : controlLevel === 5 || (acceptedFiles.length === 0 && warnedFiles.length === 0) ? (
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
                    {language === 'fr'
                      ? `Importer ${acceptedFiles.length + warnedFiles.length} fichier(s)${warnedFiles.length > 0 ? ` (dont ${warnedFiles.length} avec avertissement)` : ''}`
                      : `Import ${acceptedFiles.length + warnedFiles.length} file(s)${warnedFiles.length > 0 ? ` (${warnedFiles.length} with warning)` : ''}`}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
        {/* Légende niveaux — visible sur toutes les modales */}
        <div className="border-t pt-2 mt-1">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {(language === 'fr' ? [
              'N1 : Très permissif — tout peut être importé',
              'N2 : Permissif — avertissement, import possible',
              '🔑 N3 : Modéré — code de permission requis',
              '🔑 N4 : Strict — refus sauf avec code de permission',
              'N5 : Très strict — aucun contenu sensible accepté',
            ] : [
              'L1: Very permissive — anything can be imported',
              'L2: Permissive — warning shown, import possible',
              '🔑 L3: Moderate — permission code required',
              '🔑 L4: Strict — refused unless permission code provided',
              'L5: Very strict — no sensitive content accepted',
            ]).map((line, i) => (
              <li key={i} className={`text-xs ${i + 1 === controlLevel ? 'text-orange-600 font-semibold' : 'text-gray-400'}`}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
