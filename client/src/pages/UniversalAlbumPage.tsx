import { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PhotoClassProps, PhotoFrame } from '@/types/photo';
import PhotoFrameNew from '@/components/PhotoFrameNew';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Trash2, Pencil, Eye, Send, Printer, FileText, CheckCircle, ImageIcon, Camera, ChevronUp, ChevronDown, Play, FolderInput, Lock, FolderOpen, CheckSquare, Square, RotateCcw, X } from 'lucide-react';
import { toast } from "sonner";
import { db, addToCollecteur, getAllCreationsProjects, createCreationsProject, CreationsProject, MODELES_STICKERS_ALBUM_ID } from '../db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
// DuplicateValidationModal retiré - sera implémenté dans la version Electron
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from '@/lib/imageUtils';
import { isVideoFile, processVideoFile, formatDuration, isVideoSizeAcceptable, formatFileSize } from '@/lib/videoUtils';
import { useLiveQuery } from "dexie-react-hooks";
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { DroppableFrame } from '@/components/DroppableFrame';
import { DisplayMode, calculateFrameSize } from '@/lib/frameUtils';
import { DraggablePhoto } from '@/components/DraggablePhoto';
import { DraggableDocument } from '@/components/DraggableDocument';
import Diaporama from '@/components/Diaporama';
import PhotoRetouchModal from '@/components/PhotoRetouchModal';
import RetouchePhoto from '@/pages/RetouchePhoto';
import ImportPreviewModal from '@/components/ImportPreviewModal';
import { ParentalControlModal } from '@/components/ParentalControlModal';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { VideoParentalWarningModal } from '@/components/VideoParentalWarningModal';
import VideoPlaylistModal from '@/components/VideoPlaylistModal';
import SendModal from '@/components/SendModal';
import QuitConfirmModal from '@/components/QuitConfirmModal';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import CustomScrollbar from '@/components/CustomScrollbar';

// --- COMPOSANT INTERNE : VISIONNEUSE SIMPLE (AVEC ROTATION) ---
const UniversalViewer = ({ url, title, rotation = 0, onClose }: { url: string; title: string; rotation?: number; onClose: () => void }) => {
  const { language } = useLanguage();
  const isPdf = url.startsWith('data:application/pdf') || url.endsWith('.pdf');
  // Détecter si c'est une vidéo
  const isVideo = url.startsWith('data:video/') || 
                  url.includes('.mp4') || 
                  url.includes('.mov') || 
                  url.includes('.webm') || 
                  url.includes('.avi') ||
                  url.includes('video/mp4') ||
                  url.includes('video/quicktime') ||
                  url.includes('video/webm');
  
  // Normaliser la rotation à 0-360
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  
  // Déterminer si la rotation est 90° ou 270° (image tournée sur le côté)
  const isSideways = normalizedRotation === 90 || normalizedRotation === 270;
  
  // Message explicatif pour les images de faible résolution
  const showResolutionWarning = !isPdf && !isVideo;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full flex flex-col p-0 bg-black/90 border-none">
        <DialogHeader className="p-4 shrink-0 bg-black/50 text-white absolute top-0 left-0 right-0 z-10 flex flex-row justify-between items-center">
          <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            {normalizedRotation !== 0 && (
              <span className="text-xs bg-white/20 px-2 py-1 rounded">{normalizedRotation}°</span>
            )}
            <Button variant="ghost" className="text-white hover:bg-white/20" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 pt-16">
          {isPdf ? (
            <iframe src={url} className="w-full h-full bg-white rounded shadow-lg" title={title} />
          ) : isVideo ? (
            <video 
              src={url} 
              controls 
              autoPlay
              className="max-w-full max-h-full shadow-2xl rounded-lg" 
              style={{ transform: `rotate(${normalizedRotation}deg)` }}
              onClick={(e) => e.stopPropagation()}
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          ) : (
            <img 
              src={url} 
              alt={title} 
              className="object-contain shadow-2xl" 
              style={{ 
                transform: `rotate(${normalizedRotation}deg)`,
                maxWidth: isSideways ? '80vh' : '90vw',
                maxHeight: isSideways ? '90vw' : '70vh'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
        {/* Message de résolution fixe en bas */}
        {showResolutionWarning && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-amber-400 text-sm bg-black/80 px-4 py-2 rounded-lg flex items-center gap-2 z-20">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>{language === "fr" ? "La grandeur de l'image est limitée en raison de la faible résolution de l'image" : "Image size is limited due to low image resolution"}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface UniversalAlbumPageProps extends PhotoClassProps {
  mode: 'photo' | 'document';
}

export default function UniversalAlbumPage({ 
  zoomLevel: propZoomLevel, 
  setZoomLevel: propSetZoomLevel, 
  toolbarAction: propToolbarAction, 
  resetToolbarAction,
  mode,
  displayMode = "normal"
}: UniversalAlbumPageProps) {
  
  // --- CONFIGURATION SELON LE MODE ---
  const isPhoto = mode === 'photo';
  const itemLabel = isPhoto ? "Photo" : "Document";
  const defaultTitle = isPhoto ? "Cadre" : "Document";
  const acceptTypes = isPhoto ? "image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo" : "image/*,application/pdf";
  const rootAlbumId = isPhoto ? "root_photos" : "root_docs"; // ID pour la racine si pas d'album
  const routePrefix = isPhoto ? "/photoclass/" : "/classpapiers/";
  const pageTitle = isPhoto ? "PhotoClass" : "Documents";

  // --- ÉTATS GLOBAUX ---
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [currentAlbumId, setCurrentAlbumId] = useState<string | null>(null);
  const [albumName, setAlbumName] = useState<string>(isPhoto ? "Album" : "Documents");

  // Fonction pour traduire les labels de catégories et albums par défaut
  const translateLabel = (label: string): string => {
    if (language === 'en') {
      const upper = label.toUpperCase();
      if (upper === 'NON CLASSEE' || upper === 'NON CLASSÉE' || upper === 'NON CLASSÉES') return 'UNCATEGORIZED';
      if (upper.includes('MES PROJETS')) return upper.replace('MES PROJETS CRÉATIONS', 'MY CREATION PROJECTS').replace('MES PROJETS', 'MY PROJECTS');
      return label;
    }
    return label;
  };
  const translateAlbumTitle = (title: string): string => {
    if (language === 'en') {
      const lower = title.toLowerCase();
      if (lower === 'non classées' || lower === 'non classees' || lower === 'non classée') return 'Uncategorized';
      return title;
    }
    return title;
  };
  const [albumType, setAlbumType] = useState<"standard" | "secure">("standard");
  const [albumSeries, setAlbumSeries] = useState<"photoclass" | "classpapiers">("photoclass");

  // Gestion du Zoom et Toolbar (Props ou Local)
  const [localZoomLevel, setLocalZoomLevel] = useState(0);
  const [localToolbarAction, setLocalToolbarAction] = useState<string | null>(null);

  const zoomLevel = propZoomLevel !== undefined ? propZoomLevel : localZoomLevel;
  const setZoomLevel = propSetZoomLevel || setLocalZoomLevel;
  const toolbarAction = propToolbarAction !== undefined ? propToolbarAction : localToolbarAction;
  
  // --- ÉTAT DE CHARGEMENT ---
  const [isLoading, setIsLoading] = useState(true);

  // --- ÉTATS DES DONNÉES ---
  const [frames, setFrames] = useState<PhotoFrame[]>([]);

  // --- ÉTATS UI ---
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, frameId: number | null } | null>(null);
  // Modale choix de projet pour le Collecteur
  const [collecteurModal, setCollecteurModal] = useState<{ photoUrl: string; name: string; thumbnail: string } | null>(null);
  const [collecteurProjects, setCollecteurProjects] = useState<CreationsProject[]>([]);
  const [collecteurSelectedProjectId, setCollecteurSelectedProjectId] = useState<string>('');
  const [collecteurNewProjectName, setCollecteurNewProjectName] = useState('');
  const [collecteurMode, setCollecteurMode] = useState<'existing' | 'new'>('existing');
  const [showFrameManagementModal, setShowFrameManagementModal] = useState(false);
  const [selectedFrameForManagement, setSelectedFrameForManagement] = useState<number | null>(null);
  const [framesToAdd, setFramesToAdd] = useState<number>(1);
  const [showDeleteFrameConfirmModal, setShowDeleteFrameConfirmModal] = useState(false);
  const [showEmptyFrameConfirmModal, setShowEmptyFrameConfirmModal] = useState(false);
  const [frameToEmpty, setFrameToEmpty] = useState<number | null>(null);
  const [lastEmptiedFrame, setLastEmptiedFrame] = useState<{ frameId: number, data: PhotoFrame } | null>(null);
  
  // --- HISTORIQUE DES ACTIONS (UNDO/REDO) ---
  const [undoHistory, setUndoHistory] = useState<PhotoFrame[][]>([]);
  const [redoHistory, setRedoHistory] = useState<PhotoFrame[][]>([]);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFrameForDetails, setSelectedFrameForDetails] = useState<PhotoFrame | null>(null);
  
  const [viewedDoc, setViewedDoc] = useState<{ url: string, title: string, rotation: number } | null>(null);
  const [videoToPlay, setVideoToPlay] = useState<{ url: string, title: string, rotation: number, frameId: number } | null>(null);
  
  const [showSendModal, setShowSendModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sendMode, setSendMode] = useState<'pdf' | 'images'>('pdf');
  const [convertMode, setConvertMode] = useState<'pdf' | 'images'>('pdf');
  const [imageFormat, setImageFormat] = useState<'jpg' | 'png' | 'bmp' | 'svg'>('jpg');
  const [emailData, setEmailData] = useState({ to: '', subject: `Envoi ${pageTitle}`, message: 'Veuillez trouver ci-joint les éléments sélectionnés.' });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // --- IMPORT & CAMERA ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  
  // --- DÉTECTION DES DOUBLONS ---
  const [showDuplicateConfirmModal, setShowDuplicateConfirmModal] = useState(false);
  const [duplicatesToHandle, setDuplicatesToHandle] = useState<any[]>([]);
  const [nonDuplicatesToAdd, setNonDuplicatesToAdd] = useState<any[]>([]);
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);
  const [duplicateDecisions, setDuplicateDecisions] = useState<{[key: number]: 'replace' | 'skip'}>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // --- PRÉVISUALISATION IMPORT ---
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);

  // --- CONTRÔLE PARENTAL ---
  const [showParentalControl, setShowParentalControl] = useState(false);
  const [pendingFilesForParentalControl, setPendingFilesForParentalControl] = useState<File[]>([]);
  const [parentalControlLevel, setParentalControlLevel] = useState(0);

  // --- AVERTISSEMENT VIDÉO / CONTRÔLE PARENTAL ---
  const [showVideoParentalWarning, setShowVideoParentalWarning] = useState(false);
  const [pendingVideoFiles, setPendingVideoFiles] = useState<File[]>([]);
  const [videoWarningCallback, setVideoWarningCallback] = useState<(() => void) | null>(null);

  // --- DRAG & DROP ---
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFrame, setActiveFrame] = useState<PhotoFrame | null>(null);
  const [isDraggingExternal, setIsDraggingExternal] = useState(false); // Pour le drag depuis le bureau

  // --- DIAPORAMA ---
  const [showDiaporama, setShowDiaporama] = useState(false);
  const [diaporamaStartIndex, setDiaporamaStartIndex] = useState(0);
  const [diaporamaSelectedOnly, setDiaporamaSelectedOnly] = useState(false); // true = seulement les photos sélectionnées
  
  // --- LECTURE CONTINUE VIDÉOS ---
  const [showVideoPlaylist, setShowVideoPlaylist] = useState(false);
  const [videoPlaylistStartIndex, setVideoPlaylistStartIndex] = useState(0);

  // --- RETOUCHE PHOTO ---
  const [showRetouchModal, setShowRetouchModal] = useState(false); // Modale de choix IA/Manuel/Avancé
  const [showRetouchPage, setShowRetouchPage] = useState(false); // Page avancée avec 12 fonctions
  const [retouchImageSrc, setRetouchImageSrc] = useState<string>('');
  const [retouchFrameId, setRetouchFrameId] = useState<number | null>(null);
  const [retouchImageTitle, setRetouchImageTitle] = useState<string>('');
  const [retouchImageComments, setRetouchImageComments] = useState<string>('');

  // --- DÉPLACEMENT VERS UN AUTRE ALBUM (Admin uniquement) ---
  const [showMoveToAlbumModal, setShowMoveToAlbumModal] = useState(false);
  const [framesToMove, setFramesToMove] = useState<PhotoFrame[]>([]);
  const [availableAlbums, setAvailableAlbums] = useState<Array<{id: string, title: string, type: string, series: string, hasEmptyFrame: boolean}>>([])

  // --- MODE D'AFFICHAGE ----
  // displayMode est maintenant passé en prop depuis App.tsx

  // Configuration des sensors pour souris et tactile
  // - MouseSensor: démarre le drag après 8px de mouvement
  // - TouchSensor: délai réduit à 150ms pour une meilleure réactivité tactile
  const sensors = useSensors(
    useSensor(MouseSensor, { 
      activationConstraint: { distance: 8 } 
    }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 150,      // Délai avant activation (ms) - réduit pour meilleure réactivité
        tolerance: 8     // Tolérance de mouvement pendant le délai (px)
      } 
    })
  );

  // --- FONCTIONS D'HISTORIQUE (UNDO/REDO) ---
  const saveToHistory = useCallback((currentFrames: PhotoFrame[]) => {
    setUndoHistory(prev => [...prev.slice(-19), currentFrames]); // Garder max 20 états
    setRedoHistory([]); // Vider le redo quand on fait une nouvelle action
  }, []);

  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0) {
      toast.info(language === "fr" ? "Rien à annuler" : "Nothing to undo");
      return;
    }
    const previousState = undoHistory[undoHistory.length - 1];
    setRedoHistory(prev => [...prev, frames]);
    setUndoHistory(prev => prev.slice(0, -1));
    setFrames(previousState);
    toast.success(language === "fr" ? "Action annulée (Ctrl+Z)" : "Action undone (Ctrl+Z)");
  }, [undoHistory, frames]);

  const handleRedo = useCallback(() => {
    if (redoHistory.length === 0) {
      toast.info(language === "fr" ? "Rien à rétablir" : "Nothing to redo");
      return;
    }
    const nextState = redoHistory[redoHistory.length - 1];
    setUndoHistory(prev => [...prev, frames]);
    setRedoHistory(prev => prev.slice(0, -1));
    setFrames(nextState);
    toast.success(language === "fr" ? "Action rétablie (Ctrl+Shift+Z)" : "Action redone (Ctrl+Shift+Z)");
  }, [redoHistory, frames]);

  // --- RACCOURCIS CLAVIER ---
  const handleSelectAll = useCallback(() => {
    const hasPhotos = frames.some(f => f.photoUrl);
    if (!hasPhotos) {
      toast.info(language === "fr" ? "Aucun élément à sélectionner" : "No item to select");
      return;
    }
    setFrames(frames.map(f => f.photoUrl ? { ...f, isSelected: true } : f));
    toast.success(language === "fr" ? "Tous les éléments sélectionnés (Ctrl+A)" : "All items selected (Ctrl+A)");
  }, [frames]);

  const handleDeselectAll = useCallback(() => {
    const hasSelected = frames.some(f => f.isSelected);
    if (!hasSelected) {
      toast.info(language === "fr" ? "Aucune sélection active" : "No active selection");
      return;
    }
    setFrames(frames.map(f => ({ ...f, isSelected: false })));
    toast.success(language === "fr" ? "Sélection annulée (Ctrl+D)" : "Selection cleared (Ctrl+D)");
  }, [frames]);

  const handleEscape = useCallback(() => {
    // Fermer les modales ouvertes
    if (showDiaporama) {
      setShowDiaporama(false);
      return;
    }
    if (viewedDoc) {
      setViewedDoc(null);
      return;
    }
    if (videoToPlay) {
      setVideoToPlay(null);
      return;
    }
    if (showDetailsModal) {
      setShowDetailsModal(false);
      return;
    }
    if (showFrameManagementModal) {
      setShowFrameManagementModal(false);
      return;
    }
    // Si rien n'est ouvert, désélectionner
    const hasSelected = frames.some(f => f.isSelected);
    if (hasSelected) {
      setFrames(frames.map(f => ({ ...f, isSelected: false })));
      toast.info(language === "fr" ? "Échap : Sélection annulée" : "Esc: Selection cleared");
    }
  }, [showDiaporama, viewedDoc, videoToPlay, showDetailsModal, showFrameManagementModal, frames]);

  const handleDeleteSelectedByKeyboard = useCallback(() => {
    const selectedFrames = frames.filter(f => f.isSelected && f.photoUrl);
    if (selectedFrames.length === 0) {
      toast.info(language === "fr" ? "Aucun élément sélectionné à supprimer" : "No item selected to delete");
      return;
    }
    if (window.confirm(language === 'fr' ? `Supprimer ${selectedFrames.length} élément${selectedFrames.length > 1 ? 's' : ''} ?` : `Delete ${selectedFrames.length} item${selectedFrames.length > 1 ? 's' : ''}?`)) {
      saveToHistory(frames);
      setFrames(frames.map(f => f.isSelected ? { ...f, photoUrl: null, title: `${defaultTitle} ${f.id}`, isSelected: false } : f));
      toast.success(language === 'fr' ? `${selectedFrames.length} élément${selectedFrames.length > 1 ? 's' : ''} supprimé${selectedFrames.length > 1 ? 's' : ''}` : `${selectedFrames.length} item${selectedFrames.length > 1 ? 's' : ''} deleted`);
    }
  }, [frames, defaultTitle, saveToHistory]);

  const handleZoomIn = useCallback(() => {
    if (setZoomLevel && zoomLevel < 100) {
      setZoomLevel(Math.min(100, zoomLevel + 10));
    }
  }, [zoomLevel, setZoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (setZoomLevel && zoomLevel > 0) {
      setZoomLevel(Math.max(0, zoomLevel - 10));
    }
  }, [zoomLevel, setZoomLevel]);

  const handlePrint = useCallback(() => {
    // Déclencher l'impression
    window.print();
  }, []);

  const handleExport = useCallback(() => {
    setShowConvertModal(true);
  }, []);

  const handleImport = useCallback(() => {
    setShowImportModal(true);
  }, []);

  // Référence pour le raccourci diaporama (défini plus bas)
  const handleDiaporamaRef = useRef<(() => void) | null>(null);
  const handleDiaporamaShortcut = useCallback(() => {
    handleDiaporamaRef.current?.();
  }, []);

  // Activer les raccourcis clavier (désactivés quand une modale est ouverte)
  const isModalOpen = showDiaporama || showVideoPlaylist || !!viewedDoc || !!videoToPlay;
  
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSelectAll: handleSelectAll,
    onDeselectAll: handleDeselectAll,
    onEscape: handleEscape,
    onDelete: handleDeleteSelectedByKeyboard,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onPrint: handlePrint,
    onExport: handleExport,
    onImport: handleImport,
    onDiaporama: handleDiaporamaShortcut,
    // Navigation et lecture gérées dans les composants modaux
  }, { enabled: !isModalOpen });

  // --- CATÉGORIES ---
  const allCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [currentAlbumCategory, setCurrentAlbumCategory] = useState<any | null>(null);
  
  // Filter categories to show only current album's category
  const categories = currentAlbumCategory ? [currentAlbumCategory] : [];

  // --- INITIALISATION ---
  useEffect(() => {
    // Force le zoom à 0 au montage si c'est géré localement ou via le parent
    if (setZoomLevel) setZoomLevel(0);
  }, []);

  useEffect(() => {
    const match = location.match(new RegExp(`^${routePrefix}([^/]+)$`));
    
    if (match) {
      // CHARGEMENT ALBUM
      const albumId = match[1];
      
      // Éviter de recharger si c'est le même album
      if (currentAlbumId === albumId && frames.length > 0) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setCurrentAlbumId(albumId);
      
      // Charger les métadonnées et les frames en parallèle
      Promise.all([
        db.album_metas.get(albumId),
        db.albums.get(albumId)
      ]).then(async ([album, albumData]) => {
        if (album) {
          setAlbumName(album.title);
          setAlbumType(album.type as "standard" | "secure");
          setAlbumSeries(album.series as "photoclass" | "classpapiers");
          
          // Get the album's category
          if (album.categoryId) {
            const cat = await db.categories.get(album.categoryId);
            setCurrentAlbumCategory(cat || null);
          } else {
            setCurrentAlbumCategory(null);
          }
          
          // Vérifier l'accès : soit admin authentifié, soit accès albums privés via code maître
          const hasPrivateAccess = sessionStorage.getItem('private_albums_access') === 'true';
          if (album.type === "secure" && !isAuthenticated && !hasPrivateAccess) {
            toast.error(language === "fr" ? "Accès refusé. Veuillez vous identifier." : "Access denied. Please log in.");
            setLocation("/albums-prives");
            return;
          }
        } else {
          setAlbumName(decodeURIComponent(albumId));
        }
        
        // Charger les frames
        if (albumData && albumData.frames) {
          // Nettoyage des blobs expirés
          let validFrames = albumData.frames.filter((f: PhotoFrame) => !f.photoUrl || !f.photoUrl.startsWith('blob:'));
          // Pour l'album Modèles Stickers : ne jamais créer de frame vide par défaut
          if (albumId === MODELES_STICKERS_ALBUM_ID) {
            setFrames(validFrames.filter((f: PhotoFrame) => !!f.photoUrl));
          } else {
            setFrames(validFrames.length > 0 ? validFrames : createDefaultFrames(1));
          }
        } else {
          if (albumId === MODELES_STICKERS_ALBUM_ID) {
            setFrames([]);
          } else {
            setFrames(createDefaultFrames(1));
          }
        }
        
        // Fin du chargement
        setIsLoading(false);
      }).catch(err => {
        console.error("Erreur chargement album:", err);
        setFrames(createDefaultFrames(1));
        setIsLoading(false);
      });
    } else {
      // Pas d'album spécifié - rediriger vers l'accueil pour sélectionner un album
      setLocation('/');
    }
  }, [location, isAuthenticated]);

  const createDefaultFrames = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      photoUrl: null,
      title: `${defaultTitle} ${i + 1}`,
      isSelected: false,
      format: isPhoto ? "JPG" : "PDF"
    }));
  };

  // --- SAUVEGARDE AUTO ---
  useEffect(() => {
    // Ne pas sauvegarder pendant le chargement initial ou si pas d'album
    if (isLoading || !currentAlbumId || frames.length === 0) return;
    
    const saveTimeout = setTimeout(() => {
      db.albums.put({
        id: currentAlbumId,
        frames: frames,
        updatedAt: Date.now()
      }).catch(err => console.error("Erreur sauvegarde:", err));
    }, 500);
    return () => clearTimeout(saveTimeout);
  }, [frames, currentAlbumId, isLoading]);

  // --- GESTION TOOLBAR ---
  useEffect(() => {
    if (!toolbarAction) return;
    console.log(`Action Toolbar (${mode}):`, toolbarAction);

    switch (toolbarAction) {
      case 'importer':
      case 'import':
        setShowImportModal(true);
        break;
      case 'ajouter':
        document.getElementById('universal-file-input')?.click();
        break;
      case 'supprimer':
        handleDeleteSelectedFromToolbar();
        break;
      case 'exporter':
        handleExportClick();
        break;
      case 'convertir':
        handleConvertClick();
        break;
      case 'imprimer':
        const selectedFrames = frames.filter(f => f.isSelected && f.photoUrl);
        if (selectedFrames.length === 0) {
          toast.error(language === 'fr' ? 'Veuillez sélectionner au moins une photo avant d\'imprimer' : 'Please select at least one photo before printing');
        } else {
          handlePrintSelected(selectedFrames);
        }
        break;
      case 'classer':
        toast.info(language === "fr" ? "Mode classement activé" : "Sorting mode enabled");
        break;
      case 'diaporama':
        handleDiaporamaClick();
        break;
      case 'retouches':
        handleRetouchesClick();
        break;


      default:
        console.log("Action non gérée:", toolbarAction);
    }
    
    if (resetToolbarAction) resetToolbarAction();
  }, [toolbarAction, resetToolbarAction, mode, frames]);

  // --- LOGIQUE MÉTIER ---

  // --- DÉPLACEMENT VERS UN AUTRE ALBUM ---
  // Supporte le déplacement d'une seule photo ou de plusieurs photos sélectionnées
  const handleOpenMoveToAlbum = async (frameId?: number) => {
    // Déterminer les frames à déplacer
    let framesToMoveList: PhotoFrame[] = [];
    
    // Si un frameId est fourni, déplacer ce frame spécifique
    if (frameId) {
      const frame = frames.find(f => f.id === frameId);
      if (frame && frame.photoUrl) {
        framesToMoveList = [frame];
      }
    }
    
    // Ajouter aussi les frames sélectionnés (s'ils ne sont pas déjà inclus)
    const selectedFrames = frames.filter(f => f.isSelected && f.photoUrl);
    selectedFrames.forEach(sf => {
      if (!framesToMoveList.find(f => f.id === sf.id)) {
        framesToMoveList.push(sf);
      }
    });
    
    if (framesToMoveList.length === 0) {
      toast.error(language === "fr" ? "Aucun contenu à déplacer" : "No content to move");
      return;
    }
    
    setFramesToMove(framesToMoveList);
    
    // Récupérer TOUS les albums (toutes séries : photoclass ET classpapiers, tous types : libre ET sécurisé)
    const allAlbumsMeta = await db.album_metas.toArray();
    
    // Filtrer pour exclure l'album actuel
    const otherAlbums = allAlbumsMeta.filter(a => a.id !== currentAlbumId);
    
    // Pour chaque album, vérifier s'il a un cadre vide
    const albumsWithInfo = await Promise.all(otherAlbums.map(async (albumMeta) => {
      const albumData = await db.albums.get(albumMeta.id);
      const hasEmptyFrame = albumData?.frames?.some((f: PhotoFrame) => !f.photoUrl) || false;
      return {
        id: albumMeta.id,
        title: albumMeta.title,
        type: albumMeta.type,
        series: albumMeta.series,
        hasEmptyFrame
      };
    }));
    
    setAvailableAlbums(albumsWithInfo);
    setShowMoveToAlbumModal(true);
  };

  const handleMoveToAlbum = async (targetAlbumId: string) => {
    if (framesToMove.length === 0) {
      toast.error(language === 'fr' ? "Erreur: aucun contenu à déplacer" : "Error: no content to move");
      return;
    }
    
    try {
      // Récupérer l'album cible
      const targetAlbumData = await db.albums.get(targetAlbumId);
      const targetAlbumMeta = await db.album_metas.get(targetAlbumId);
      
      if (!targetAlbumData || !targetAlbumMeta) {
        toast.error(language === "fr" ? "Album cible introuvable" : "Target album not found");
        return;
      }
      
      let targetFrames = targetAlbumData.frames || [];
      const movedFrameIds: number[] = [];
      
      // Déplacer chaque frame sélectionné
      for (const frameToMove of framesToMove) {
        if (!frameToMove.photoUrl) continue;
        
        // Chercher un cadre vide dans l'album cible
        let emptyFrameIndex = targetFrames.findIndex((f: PhotoFrame) => !f.photoUrl);
        
        if (emptyFrameIndex === -1) {
          // Pas de cadre vide, créer un nouveau cadre
          const newFrameId = targetFrames.length > 0 
            ? Math.max(...targetFrames.map((f: PhotoFrame) => f.id)) + 1 
            : 1;
          const newFrame: PhotoFrame = {
            id: newFrameId,
            title: `${isPhoto ? 'Cadre' : 'Document'} ${newFrameId}`,
            isSelected: false,
            format: frameToMove.format || (isPhoto ? 'JPG' : 'PDF'),
            photoUrl: null
          };
          targetFrames.push(newFrame);
          emptyFrameIndex = targetFrames.length - 1;
        }
        
        // Copier toutes les données du frame source vers le frame cible
        targetFrames[emptyFrameIndex] = {
          ...targetFrames[emptyFrameIndex],
          photoUrl: frameToMove.photoUrl,
          title: frameToMove.title,
          format: frameToMove.format,
          date: frameToMove.date,
          location: frameToMove.location,
          comments: frameToMove.comments,
          rotation: frameToMove.rotation,
          mediaType: frameToMove.mediaType,
          videoUrl: frameToMove.videoUrl,
          thumbnailUrl: frameToMove.thumbnailUrl
        };
        
        movedFrameIds.push(frameToMove.id);
      }
      
      // Sauvegarder l'album cible
      await db.albums.put({
        id: targetAlbumId,
        frames: targetFrames,
        updatedAt: Date.now()
      });
      
      // Vider les cadres sources dans l'album actuel
      setFrames(frames.map(f => 
        movedFrameIds.includes(f.id)
          ? { 
              ...f, 
              photoUrl: null, 
              title: `${isPhoto ? 'Cadre' : 'Document'} ${f.id}`,
              format: isPhoto ? 'JPG' : 'PDF',
              date: '',
              location: '',
              comments: '',
              rotation: 0,
              mediaType: undefined,
              videoUrl: undefined,
              thumbnailUrl: undefined,
              isSelected: false
            } 
          : f
      ));
      
      const count = movedFrameIds.length;
      toast.success(language === 'fr' ? `${count} élément${count > 1 ? 's' : ''} déplacé${count > 1 ? 's' : ''} vers "${targetAlbumMeta.title}"` : `${count} item${count > 1 ? 's' : ''} moved to "${targetAlbumMeta.title}"`);
      setShowMoveToAlbumModal(false);
      setFramesToMove([]);
      setAvailableAlbums([]);
      
    } catch (error) {
      console.error("Erreur lors du déplacement:", error);
      toast.error(language === 'fr' ? "Erreur lors du déplacement" : "Error during move");
    }
  };





  // --- CAMERA LOGIC ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erreur caméra:", err);
      toast.error(language === "fr" ? "Impossible d'accéder à la caméra" : "Unable to access camera");
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const photoDataUrl = canvas.toDataURL('image/jpeg');
        
        // Ajouter la photo capturée
        const newFrame: PhotoFrame = {
          id: Date.now(),
          title: `Photo ${new Date().toLocaleTimeString()}`,
          isSelected: false,
          format: "JPG",
          photoUrl: photoDataUrl,
          comments: "",
          date: new Date().toLocaleDateString('fr-FR'),
          location: language === "fr" ? "Caméra" : "Camera"
        };

        // Logique d'ajout (similaire à handleAddFiles)
        let updatedFrames = [...frames];
        const emptyFrameIndex = updatedFrames.findIndex(f => !f.photoUrl);

        if (emptyFrameIndex !== -1) {
          updatedFrames[emptyFrameIndex] = { ...updatedFrames[emptyFrameIndex], ...newFrame, id: updatedFrames[emptyFrameIndex].id };
        } else {
          updatedFrames.push(newFrame);
        }

        setFrames(updatedFrames);
        toast.success(language === "fr" ? "Photo capturée et ajoutée !" : "Photo captured and added!");
        setShowCameraModal(false);
      }
    }
  };

  useEffect(() => {
    if (showCameraModal) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCameraModal]);

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = ''; // Reset input

    console.log('=== handleAddFiles - FLUX SIMPLIFIE ===');
    console.log('Fichiers reçus:', files.length);

    // Filtrer les fichiers valides selon la série de l'album (pas le mode de la route)
    const isDocumentAlbum = albumSeries === 'classpapiers';
    const isMixedCategory = currentAlbumCategory?.mediaType === 'mixed';
    const validFiles = files.filter(file => {
      if (isDocumentAlbum) {
        // Albums Documents: accepter images, PDF, et vidéos si catégorie mixte
        if (isMixedCategory) {
          return file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('video/');
        }
        return file.type.startsWith('image/') || file.type === 'application/pdf';
      } else {
        // Albums Photos: images et vidéos uniquement
        return file.type.startsWith('image/') || file.type.startsWith('video/');
      }
    });

    if (validFiles.length === 0) {
      const acceptedTypes = isDocumentAlbum 
        ? (isMixedCategory 
          ? (language === 'fr' ? "Images, PDF et vidéos sont acceptés" : "Images, PDFs and videos are accepted")
          : (language === 'fr' ? "Seules les images et PDF sont acceptés" : "Only images and PDFs are accepted"))
        : (language === 'fr' ? "Seules les images et vidéos sont acceptées" : "Only images and videos are accepted");
      toast.error(acceptedTypes);
      return;
    }

    // Vérifier le contrôle parental
    const parentalLevel = parseInt(localStorage.getItem('parental_control_level') || '0');
    console.log('Niveau contrôle parental:', parentalLevel);

    // Vérifier s'il y a des vidéos dans les fichiers
    const videoFiles = validFiles.filter(f => f.type.startsWith('video/'));
    const hasVideos = videoFiles.length > 0;

    // Si contrôle parental actif ET vidéos présentes, afficher l'avertissement
    if (parentalLevel >= 2 && hasVideos && isPhoto) {
      console.log('Vidéos détectées avec contrôle parental actif - affichage avertissement');
      setPendingVideoFiles(validFiles);
      setParentalControlLevel(parentalLevel);
      setPendingExternalDrop(false); // Ce n'est pas un drag & drop
      setPendingDropFrameId(null); // Ce n'est pas un drop sur cadre
      setShowVideoParentalWarning(true);
      return;
    }

    if (parentalLevel >= 2) {
      // Pour le contrôle parental (sans vidéos), on analyse les images
      const mediaFiles = validFiles.filter(f => f.type.startsWith('image/'));
      console.log('Images à analyser:', mediaFiles.length);
      
      if (mediaFiles.length > 0) {
        console.log('Ouverture modale contrôle parental');
        setPendingFilesForParentalControl(validFiles);
        setParentalControlLevel(parentalLevel);
        setShowParentalControl(true);
        return; // Attendre le consentement et l'analyse
      }
    }

    // Si pas de contrôle parental ou pas de médias, importer directement
    console.log('Import direct sans contrôle parental');
    await performImport(validFiles);
  };

  // Fonction d'import après prévisualisation
  // VERSION: ab28ee1a-fix - Contrôle parental pour Importer/Ajouter
  const handleImportFromPreview = async (selectedFiles: File[]) => {
    console.log('=== handleImportFromPreview appelé [VERSION ab28ee1a-fix] ===');
    console.log('Nombre de fichiers:', selectedFiles.length);
    console.log('Version du code: cc9b3a47 - Contrôle parental activé');
    
    if (selectedFiles.length === 0) return;

    // Vérifier la limite de photos pour la période d'essai
    try {
      const response = await fetch('/api/trpc/subscription.canAddPhotos?input=' + encodeURIComponent(JSON.stringify({ count: selectedFiles.length })));
      const data = await response.json();
      const canAddResult = data.result?.data;
      
      if (canAddResult && !canAddResult.canAdd) {
        if (canAddResult.reason === 'trial_expired') {
          toast.error(t('trial.expired') || (language === 'fr' ? 'Votre période d\'essai a expiré. Veuillez vous abonner pour continuer.' : 'Your trial has expired. Please subscribe to continue.'));
        } else if (canAddResult.reason === 'photo_limit_reached') {
          toast.error(t('trial.photoLimitReached') || (language === 'fr' ? `Limite de 200 photos atteinte. Veuillez vous abonner pour ajouter plus de photos.` : `200 photo limit reached. Please subscribe to add more photos.`));
        } else if (canAddResult.reason === 'would_exceed_limit') {
          toast.error(t('trial.wouldExceedLimit') || (language === 'fr' ? `Vous ne pouvez ajouter que ${canAddResult.photosRemaining || 0} photo(s) supplémentaire(s) pendant la période d'essai.` : `You can only add ${canAddResult.photosRemaining || 0} more photo(s) during the trial period.`));
        }
        setShowImportPreview(false);
        setPreviewFiles([]);
        return;
      }
    } catch (error) {
      console.warn('Impossible de vérifier la limite de photos:', error);
      // Continuer l'import si la vérification échoue (mode hors ligne par exemple)
    }

    // Fermer la modale de prévisualisation
    setShowImportPreview(false);
    setPreviewFiles([]);

    // Vérifier le niveau de contrôle parental
    const parentalLevel = parseInt(localStorage.getItem('parental_control_level') || '0');
    console.log('Niveau contrôle parental:', parentalLevel);
    
    // Si le contrôle parental est actif (niveau >= 2 = Modéré ou plus), demander le consentement
    // Niveau 0 = Désactivé, Niveau 1 = Très permissif (pas d'analyse)
    if (parentalLevel >= 2) {
      // Filtrer seulement les images (pas les PDF)
      const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'));
      console.log('Images trouvées:', imageFiles.length);
      
      if (imageFiles.length > 0) {
        console.log('Ouverture de la modale de contrôle parental...');
        setPendingFilesForParentalControl(selectedFiles);
        setParentalControlLevel(parentalLevel);
        // Petit délai pour laisser la prévisualisation se fermer
        setTimeout(() => {
          setShowParentalControl(true);
        }, 150);
        return; // Attendre le consentement et l'analyse
      }
    }
    
    console.log('Import direct sans contrôle parental');
    // Si pas de contrôle ou pas d'images, importer directement
    await performImport(selectedFiles);
  };

  // État pour distinguer si le contrôle parental vient d'un drag & drop général
  const [pendingExternalDrop, setPendingExternalDrop] = useState(false);

  // Handler quand le contrôle parental est terminé
  // Gère à la fois l'import classique, le drag & drop général et le drop sur cadre
  const handleParentalControlComplete = async (acceptedFiles: File[]) => {
    setShowParentalControl(false);
    
    if (acceptedFiles.length > 0) {
      // Vérifier si c'est un drop sur un cadre spécifique
      if (pendingDropFrameId !== null) {
        // Drop sur un cadre spécifique - utiliser processDropOnFrame
        await processDropOnFrame(pendingDropFrameId, acceptedFiles[0]);
        setPendingDropFrameId(null);
      } else if (pendingExternalDrop) {
        // Drag & drop général - utiliser processExternalDropFiles
        await processExternalDropFiles(acceptedFiles);
        setPendingExternalDrop(false);
      } else {
        // Import classique (bouton Ajouter/Importer)
        await performImport(acceptedFiles);
      }
    } else {
      // Aucun fichier accepté, réinitialiser les états
      setPendingDropFrameId(null);
      setPendingExternalDrop(false);
    }
    
    // Réinitialiser les fichiers en attente
    setPendingFilesForParentalControl([]);
  };

  // Handler pour l'avertissement vidéo / contrôle parental
  const handleVideoParentalWarningContinue = async (autoRestore: boolean) => {
    const previousLevel = parentalControlLevel;
    
    // Désactiver temporairement le contrôle parental
    localStorage.setItem('parental_control_level', '0');
    
    setShowVideoParentalWarning(false);
    
    // Exécuter l'import
    if (pendingVideoFiles.length > 0) {
      toast.info(language === 'fr' ? 'Contrôle parental désactivé temporairement pour l\'import' : 'Parental control temporarily disabled for import');
      
      // Vérifier si c'est un drop sur un cadre spécifique
      if (pendingDropFrameId !== null) {
        await processDropOnFrame(pendingDropFrameId, pendingVideoFiles[0]);
        setPendingDropFrameId(null);
      } else if (pendingExternalDrop) {
        await processExternalDropFiles(pendingVideoFiles);
        setPendingExternalDrop(false);
      } else {
        await performImport(pendingVideoFiles);
      }
      
      // Rétablir le contrôle parental si demandé
      if (autoRestore) {
        localStorage.setItem('parental_control_level', previousLevel.toString());
        toast.success(language === 'fr' ? `Contrôle parental rétabli au niveau ${previousLevel}` : `Parental control restored to level ${previousLevel}`);
      } else {
        toast.warning(language === 'fr' ? 'N\'oubliez pas de réactiver le contrôle parental dans Administration' : 'Don\'t forget to re-enable parental control in Settings');
      }
    }
    
    // Réinitialiser les états
    setPendingVideoFiles([]);
    setVideoWarningCallback(null);
  };

  // Fonction d'import réelle (après consentement NSFW si nécessaire)
  const performImport = async (selectedFiles: File[]) => {
    const toastId = toast.loading(language === 'fr' ? `Traitement des ${selectedFiles.length} élément(s)...` : `Processing ${selectedFiles.length} item(s)...`);

    try {
      // Traitement direct de tous les fichiers (sans détection de doublons)
      // La détection de doublons sera implémentée dans la version Electron
      
      const newFramesPromises = selectedFiles.map(async (file: File, index: number) => {
        let base64 = "";
        let format = "JPG";
        let mediaType: 'photo' | 'video' = 'photo';
        let videoUrl: string | null = null;
        let thumbnailUrl: string | null = null;
        let duration: number | undefined = undefined;
        let imageHash: string = "";

        if (file.type.startsWith('video/')) {
          // Traitement des vidéos
          mediaType = 'video';
          
          // Vérifier la taille (max 100MB pour le stockage local)
          if (!isVideoSizeAcceptable(file, 100)) {
            toast.warning(language === 'fr' ? `Vidéo "${file.name}" trop volumineuse (${formatFileSize(file.size)}). Max: 100MB` : `Video "${file.name}" too large (${formatFileSize(file.size)}). Max: 100MB`);
            return null; // Ignorer ce fichier
          }
          
          try {
            // Extraire la vignette et la durée
            const videoData = await processVideoFile(file);
            thumbnailUrl = videoData.thumbnailUrl;
            duration = videoData.duration;
            format = videoData.format;
            
            // Stocker la vidéo en base64 (attention: peut être lourd)
            videoUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            
            // Utiliser la vignette comme photoUrl pour l'affichage
            base64 = thumbnailUrl;
          } catch (err) {
            console.error('Erreur traitement vidéo:', err);
            toast.error(language === 'fr' ? `Erreur lors du traitement de "${file.name}"` : `Error processing "${file.name}"`);
            return null;
          }
        } else if (file.type.startsWith('image/')) {
          // Traitement des images
          base64 = await compressImage(file);
          format = file.type.split('/')[1].toUpperCase();
          // Générer le hash APRÈS compression pour une détection fiable
          // imageHash retiré - sera implémenté dans la version Electron
        } else if (file.type === 'application/pdf') {
          // Traitement des PDF
          base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          format = "PDF";
          // imageHash retiré - sera implémenté dans la version Electron
        }

        return {
          id: Date.now() + index,
          title: file.name.split('.')[0],
          isSelected: false,
          format: format,
          photoUrl: base64,
          mediaType: mediaType,
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          duration: duration,
          comments: "",
          date: new Date(file.lastModified).toLocaleDateString('fr-FR'),
          location: language === "fr" ? "Non localisé" : "Not located",
          originalName: file.name,
          size: file.size,
          imageHash: imageHash, // Hash pour détection de doublons
          src: base64,
          name: file.name
        };
      });

      const newItemsRaw = await Promise.all(newFramesPromises);
      const newItems = newItemsRaw.filter(item => item !== null);
      
      if (newItems.length === 0) {
        toast.dismiss(toastId);
        toast.error(language === "fr" ? "Aucun fichier valide à importer" : "No valid file to import");
        return;
      }
      
      toast.dismiss(toastId);
      
      // Détection des doublons
      console.log('[DOUBLON DEBUG] Démarrage détection doublons');
      console.log('[DOUBLON DEBUG] Nombre de nouvelles photos:', newItems.length);
      console.log('[DOUBLON DEBUG] Nombre de frames existants:', frames.length);
      console.log('[DOUBLON DEBUG] Frames existants:', frames.map(f => ({ id: f.id, title: f.title, hasPhoto: !!f.photoUrl })));
      
      const duplicates: any[] = [];
      const nonDuplicates: any[] = [];
      
      for (const newItem of newItems) {
        console.log('[DOUBLON DEBUG] Vérification photo:', newItem.title);
        // Vérifier si une photo avec le même titre existe déjà
        const existingFrame = frames.find(f => {
          const match = f.title === newItem.title && f.photoUrl;
          console.log(`[DOUBLON DEBUG] Comparaison: "${f.title}" === "${newItem.title}" && hasPhoto=${!!f.photoUrl} => ${match}`);
          return match;
        });
        if (existingFrame) {
          console.log('[DOUBLON DEBUG] DOUBLON DÉTECTÉ !', newItem.title);
          duplicates.push({ newItem, existingFrame });
        } else {
          console.log('[DOUBLON DEBUG] Pas de doublon pour', newItem.title);
          nonDuplicates.push(newItem);
        }
      }
      
      console.log('[DOUBLON DEBUG] Nombre de doublons détectés:', duplicates.length);
      console.log('[DOUBLON DEBUG] Nombre de non-doublons:', nonDuplicates.length);
      
      // Si des doublons sont détectés, afficher la fenêtre de confirmation
      if (duplicates.length > 0) {
        setDuplicatesToHandle(duplicates);
        setNonDuplicatesToAdd(nonDuplicates);
        setShowDuplicateConfirmModal(true);
      } else {
        // Pas de doublons, ajouter directement
        processNewItems(newItems);
        toast.success(language === 'fr' ? `${newItems.length} élément(s) ajouté(s)` : `${newItems.length} item(s) added`);
      }
    } catch (error) {
      console.error("Erreur ajout:", error);
      toast.dismiss(toastId);
      toast.error(language === 'fr' ? "Erreur lors de l'ajout" : "Error adding item");
    }
  };

  const processNewItems = (itemsToProcess: any[]) => {
      // Remplissage intelligent des cadres vides ou ajout à la fin
      let updatedFrames = [...frames];
      let itemIndex = 0;

      // 1. Remplir les cadres vides existants
      updatedFrames = updatedFrames.map(frame => {
        if (!frame.photoUrl && itemIndex < itemsToProcess.length) {
          const item = itemsToProcess[itemIndex];
          itemIndex++;
          return { ...frame, ...item, id: frame.id }; // Garder l'ID du cadre mais mettre à jour le contenu
        }
        return frame;
      });

      // 2. Ajouter les restants à la fin
      if (itemIndex < itemsToProcess.length) {
        const remaining = itemsToProcess.slice(itemIndex);
        const maxId = Math.max(...updatedFrames.map(f => f.id), 0);
        const newFramesToAdd = remaining.map((item, i) => ({
          ...item,
          id: maxId + i + 1
        }));
        updatedFrames = [...updatedFrames, ...newFramesToAdd];
      }

      // 3. Toujours garder un cadre vide à la fin
      const lastFrame = updatedFrames[updatedFrames.length - 1];
      if (lastFrame && lastFrame.photoUrl) {
        const nextId = Math.max(...updatedFrames.map(f => f.id), 0) + 1;
        updatedFrames.push({
          id: nextId,
          photoUrl: null,
          title: `${defaultTitle} ${nextId}`,
          isSelected: false,
          format: isPhoto ? "JPG" : "PDF"
        });
      }

      setFrames(updatedFrames);
  };

  // Fonction pour finaliser le traitement des doublons
  const finalizeDuplicateHandling = (decisions: {[key: number]: 'replace' | 'skip'}) => {
    const itemsToAdd: any[] = [...nonDuplicatesToAdd];
    let updatedFrames = [...frames];
    
    // Traiter chaque doublon selon la décision
    duplicatesToHandle.forEach((duplicate, index) => {
      const decision = decisions[index];
      if (decision === 'replace') {
        // Remplacer la photo existante
        const frameIndex = updatedFrames.findIndex(f => f.id === duplicate.existingFrame.id);
        if (frameIndex !== -1) {
          updatedFrames[frameIndex] = {
            ...updatedFrames[frameIndex],
            ...duplicate.newItem,
            id: updatedFrames[frameIndex].id // Garder l'ID du cadre
          };
        }
      } else if (decision === 'skip') {
        // Si c'est un drop sur un cadre spécifique (pendingDropFrameId), ajouter quand même dans ce cadre
        if (pendingDropFrameId !== null) {
          const frameIndex = updatedFrames.findIndex(f => f.id === pendingDropFrameId);
          if (frameIndex !== -1) {
            updatedFrames[frameIndex] = {
              ...updatedFrames[frameIndex],
              ...duplicate.newItem,
              id: updatedFrames[frameIndex].id
            };
          }
        }
        // Sinon ne rien faire (ignorer complètement)
      }
    });
    
    // Ajouter les photos non-doublons
    if (itemsToAdd.length > 0) {
      processNewItems(itemsToAdd);
    } else {
      // Si seulement des remplacements, mettre à jour directement
      setFrames(updatedFrames);
    }
    
    // Réinitialiser les états
    setShowDuplicateConfirmModal(false);
    setDuplicatesToHandle([]);
    setNonDuplicatesToAdd([]);
    setCurrentDuplicateIndex(0);
    setDuplicateDecisions({});
    setPendingDropFrameId(null); // Réinitialiser aussi le frameId en attente
    
    // Message de confirmation
    const replacedCount = Object.values(decisions).filter(d => d === 'replace').length;
    const skippedCount = Object.values(decisions).filter(d => d === 'skip').length;
    const addedCount = itemsToAdd.length;
    
    if (replacedCount > 0 || skippedCount > 0 || addedCount > 0) {
      toast.success(language === 'fr' ? `${replacedCount} remplacé(s), ${skippedCount} ignoré(s), ${addedCount} ajouté(s)` : `${replacedCount} replaced, ${skippedCount} skipped, ${addedCount} added`);
    }
  };

  // --- DRAG & DROP EXTERNE (depuis le bureau) ---
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleExternalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingExternal(true);
    }
  };

  const handleExternalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleExternalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Vérifier si on quitte vraiment la zone de drop (pas juste un élément enfant)
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !dropZoneRef.current?.contains(relatedTarget)) {
      setIsDraggingExternal(false);
    }
  };

  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExternal(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filtrer selon la série de l'album (pas le mode de la route)
    const isDocumentAlbum = albumSeries === 'classpapiers';
    const isMixedCategory = currentAlbumCategory?.mediaType === 'mixed';
    const validFiles = files.filter(file => {
      if (isDocumentAlbum) {
        // Albums Documents: accepter images, PDF, et vidéos si catégorie mixte
        if (isMixedCategory) {
          return file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('video/');
        }
        return file.type.startsWith('image/') || file.type === 'application/pdf';
      } else {
        // Albums Photos: images et vidéos uniquement
        return file.type.startsWith('image/') || file.type.startsWith('video/');
      }
    });

    if (validFiles.length === 0) {
      const acceptedTypes = isDocumentAlbum 
        ? (isMixedCategory 
          ? (language === 'fr' ? "Images, PDF et vidéos sont acceptés" : "Images, PDFs and videos are accepted")
          : (language === 'fr' ? "Seules les images et PDF sont acceptés" : "Only images and PDFs are accepted"))
        : (language === 'fr' ? "Seules les images et vidéos sont acceptées" : "Only images and videos are accepted");
      toast.error(acceptedTypes);
      return;
    }

    // Vérifier le contrôle parental pour le drag & drop aussi
    const parentalLevel = parseInt(localStorage.getItem('parental_control_level') || '0');
    console.log('=== handleExternalDrop - Contrôle parental ===');
    console.log('Niveau:', parentalLevel);
    console.log('Fichiers valides:', validFiles.length);
    
    // Vérifier s'il y a des vidéos
    const videoFiles = validFiles.filter(f => f.type.startsWith('video/'));
    const hasVideos = videoFiles.length > 0;
    
    // Si contrôle parental actif ET vidéos présentes, afficher l'avertissement
    if (parentalLevel >= 2 && hasVideos && isPhoto) {
      console.log('Vidéos détectées avec contrôle parental actif - affichage avertissement');
      setPendingVideoFiles(validFiles);
      setParentalControlLevel(parentalLevel);
      setPendingExternalDrop(true); // C'est un drag & drop général
      setPendingDropFrameId(null);
      setShowVideoParentalWarning(true);
      return;
    }
    
    if (parentalLevel >= 2) {
      // Analyser les images uniquement (sans vidéos)
      const mediaFiles = validFiles.filter(f => f.type.startsWith('image/'));
      console.log('Images à analyser:', mediaFiles.length);
      
      if (mediaFiles.length > 0) {
        console.log('Ouverture modale contrôle parental pour drag & drop');
        setPendingFilesForParentalControl(validFiles);
        setParentalControlLevel(parentalLevel);
        setPendingExternalDrop(true); // Marquer que c'est un drag & drop général
        setShowParentalControl(true);
        return; // Attendre le consentement et l'analyse
      }
    }

    // Si pas de contrôle parental, procéder directement
    await processExternalDropFiles(validFiles);
  };

  // Fonction pour traiter les fichiers du drag & drop (après contrôle parental si nécessaire)
  const processExternalDropFiles = async (validFiles: File[]) => {
    const toastId = toast.loading(`Traitement de ${validFiles.length} fichier(s)...`);

    try {
      const newFramesPromises = validFiles.map(async (file, index) => {
        let base64 = "";
        let format = "JPG";
        let mediaType: 'photo' | 'video' = 'photo';
        let videoUrl: string | null = null;
        let thumbnailUrl: string | null = null;
        let duration: number | undefined = undefined;

        if (file.type.startsWith('video/')) {
          // Traitement des vidéos
          mediaType = 'video';
          
          // Vérifier la taille (max 100MB)
          if (!isVideoSizeAcceptable(file, 100)) {
            toast.warning(language === 'fr' ? `Vidéo "${file.name}" trop volumineuse (${formatFileSize(file.size)}). Max: 100MB` : `Video "${file.name}" too large (${formatFileSize(file.size)}). Max: 100MB`);
            return null; // Ignorer ce fichier
          }
          
          try {
            const videoData = await processVideoFile(file);
            thumbnailUrl = videoData.thumbnailUrl;
            duration = videoData.duration;
            format = videoData.format;
            
            // Stocker la vidéo en base64
            videoUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            
            base64 = thumbnailUrl;
          } catch (err) {
            console.error('Erreur traitement vidéo:', err);
            toast.error(language === 'fr' ? `Erreur lors du traitement de "${file.name}"` : `Error processing "${file.name}"`);
            return null;
          }
        } else if (file.type.startsWith('image/')) {
          base64 = await compressImage(file);
          format = file.type.split('/')[1].toUpperCase();
        } else if (file.type === 'application/pdf') {
          base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          format = "PDF";
        }

        return {
          id: Date.now() + index,
          title: file.name.split('.')[0],
          isSelected: false,
          format: format,
          photoUrl: base64,
          mediaType: mediaType,
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          duration: duration,
          comments: "",
          date: new Date(file.lastModified).toLocaleDateString('fr-FR'),
          location: language === "fr" ? "Importé par glisser-déposer" : "Imported by drag and drop",
          originalName: file.name,
          size: file.size,
          src: base64,
          name: file.name
        };
      });

      const newItemsRaw = await Promise.all(newFramesPromises);
      // Filtrer les éléments null (vidéos trop volumineuses ou erreurs)
      const newItems = newItemsRaw.filter(item => item !== null);
      
      if (newItems.length === 0) {
        toast.dismiss(toastId);
        toast.error(language === "fr" ? "Aucun fichier valide à importer" : "No valid file to import");
        return;
      }
      
      toast.dismiss(toastId);
      
      // Détection des doublons (même logique que performImport)
      console.log('[DOUBLON DEBUG DRAG&DROP] Démarrage détection doublons');
      console.log('[DOUBLON DEBUG DRAG&DROP] Nombre de nouvelles photos:', newItems.length);
      console.log('[DOUBLON DEBUG DRAG&DROP] Nombre de frames existants:', frames.length);
      
      const duplicates: any[] = [];
      const nonDuplicates: any[] = [];
      
      for (const newItem of newItems) {
        console.log('[DOUBLON DEBUG DRAG&DROP] Vérification photo:', newItem.title);
        // Vérifier si une photo avec le même titre existe déjà
        const existingFrame = frames.find(f => {
          const match = f.title === newItem.title && f.photoUrl;
          console.log(`[DOUBLON DEBUG DRAG&DROP] Comparaison: "${f.title}" === "${newItem.title}" && hasPhoto=${!!f.photoUrl} => ${match}`);
          return match;
        });
        if (existingFrame) {
          console.log('[DOUBLON DEBUG DRAG&DROP] DOUBLON DÉTECTÉ !', newItem.title);
          duplicates.push({ newItem, existingFrame });
        } else {
          console.log('[DOUBLON DEBUG DRAG&DROP] Pas de doublon pour', newItem.title);
          nonDuplicates.push(newItem);
        }
      }
      
      console.log('[DOUBLON DEBUG DRAG&DROP] Nombre de doublons détectés:', duplicates.length);
      console.log('[DOUBLON DEBUG DRAG&DROP] Nombre de non-doublons:', nonDuplicates.length);
      
      // Si des doublons sont détectés, afficher la fenêtre de confirmation
      if (duplicates.length > 0) {
        setDuplicatesToHandle(duplicates);
        setNonDuplicatesToAdd(nonDuplicates);
        setShowDuplicateConfirmModal(true);
      } else {
        // Pas de doublons, ajouter directement
        processNewItems(newItems);
        toast.success(language === 'fr' ? `${newItems.length} fichier(s) ajouté(s) par glisser-déposer` : `${newItems.length} file(s) added by drag and drop`);
        
        // Scroll automatique vers le bas pour voir les nouvelles photos
        setTimeout(() => {
          if (dropZoneRef.current) {
            dropZoneRef.current.scrollTo({ top: dropZoneRef.current.scrollHeight, behavior: 'smooth' });
          }
        }, 300);
      }
    } catch (error) {
      console.error("Erreur drag & drop:", error);
      toast.dismiss(toastId);
      toast.error(language === 'fr' ? "Erreur lors de l'ajout des fichiers" : "Error adding files");
    }
  };

  // --- DROP EXTERNE SUR UN CADRE SPÉCIFIQUE ---
  // État pour stocker le frameId cible lors d'un drop sur un cadre spécifique
  const [pendingDropFrameId, setPendingDropFrameId] = useState<number | null>(null);

  const handleExternalDropOnFrame = async (frameId: number, files: File[]) => {
    if (files.length === 0) return;

    // Prendre seulement le premier fichier pour ce cadre
    const file = files[0];

    // Vérifier le type de fichier selon la série de l'album
    const isDocumentAlbum = albumSeries === 'classpapiers';
    const isMixedCategory = currentAlbumCategory?.mediaType === 'mixed';
    const isValidFile = isDocumentAlbum 
      ? (isMixedCategory 
          ? file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('video/')
          : file.type.startsWith('image/') || file.type === 'application/pdf')
      : file.type.startsWith('image/') || file.type.startsWith('video/');

    if (!isValidFile) {
      const acceptedTypes = isDocumentAlbum 
        ? (isMixedCategory 
          ? (language === 'fr' ? "Images, PDF et vidéos sont acceptés" : "Images, PDFs and videos are accepted")
          : (language === 'fr' ? "Seules les images et PDF sont acceptés" : "Only images and PDFs are accepted"))
        : (language === 'fr' ? "Seules les images et vidéos sont acceptées" : "Only images and videos are accepted");
      toast.error(acceptedTypes);
      return;
    }

    // Vérifier le contrôle parental pour le drop sur cadre aussi
    const parentalLevel = parseInt(localStorage.getItem('parental_control_level') || '0');
    console.log('=== handleExternalDropOnFrame - Contrôle parental ===');
    console.log('Niveau:', parentalLevel);
    console.log('Frame ID:', frameId);
    
    // Si c'est une vidéo avec contrôle parental actif, afficher l'avertissement
    if (parentalLevel >= 2 && file.type.startsWith('video/') && isPhoto) {
      console.log('Vidéo détectée avec contrôle parental actif - affichage avertissement');
      setPendingDropFrameId(frameId);
      setPendingVideoFiles([file]);
      setParentalControlLevel(parentalLevel);
      setPendingExternalDrop(false);
      setShowVideoParentalWarning(true);
      return;
    }
    
    // Analyser les images uniquement (pas les vidéos)
    if (parentalLevel >= 2 && file.type.startsWith('image/')) {
      console.log('Ouverture modale contrôle parental pour drop sur cadre');
      setPendingDropFrameId(frameId);
      setPendingFilesForParentalControl([file]);
      setParentalControlLevel(parentalLevel);
      setShowParentalControl(true);
      return; // Attendre le consentement et l'analyse
    }

    // Si pas de contrôle parental, procéder directement
    await processDropOnFrame(frameId, file);
  };

  // Fonction pour traiter le drop sur un cadre (après contrôle parental si nécessaire)
  const processDropOnFrame = async (frameId: number, file: File) => {
    const toastId = toast.loading("Traitement du fichier...");

    try {
      let base64 = "";
      let format = "JPG";
      let mediaType: 'photo' | 'video' = 'photo';
      let videoUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      let duration: number | undefined = undefined;

      if (file.type.startsWith('video/')) {
        // Traitement des vidéos
        mediaType = 'video';
        
        // Vérifier la taille (max 100MB)
        if (!isVideoSizeAcceptable(file, 100)) {
          toast.dismiss(toastId);
          toast.warning(language === 'fr' ? `Vidéo trop volumineuse (${formatFileSize(file.size)}). Max: 100MB` : `Video too large (${formatFileSize(file.size)}). Max: 100MB`);
          return;
        }
        
        try {
          const videoData = await processVideoFile(file);
          thumbnailUrl = videoData.thumbnailUrl;
          duration = videoData.duration;
          format = videoData.format;
          
          // Stocker la vidéo en base64
          videoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          
          base64 = thumbnailUrl;
        } catch (err) {
          console.error('Erreur traitement vidéo:', err);
          toast.dismiss(toastId);
          toast.error(language === 'fr' ? `Erreur lors du traitement de la vidéo` : `Error processing video`);
          return;
        }
      } else if (file.type.startsWith('image/')) {
        base64 = await compressImage(file);
        format = file.type.split('/')[1].toUpperCase();
      } else if (file.type === 'application/pdf') {
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        format = "PDF";
      }

      const newTitle = file.name.split('.')[0];
      
      // Détection des doublons (même logique que les autres fonctions)
      console.log('[DOUBLON DEBUG FRAME] Démarrage détection doublons');
      console.log('[DOUBLON DEBUG FRAME] Titre de la nouvelle photo:', newTitle);
      console.log('[DOUBLON DEBUG FRAME] Frame cible:', frameId);
      
      // Vérifier si une photo avec le même titre existe déjà (hors du cadre cible)
      const existingFrame = frames.find(f => {
        const match = f.title === newTitle && f.photoUrl && f.id !== frameId;
        console.log(`[DOUBLON DEBUG FRAME] Comparaison: "${f.title}" === "${newTitle}" && hasPhoto=${!!f.photoUrl} && differentFrame=${f.id !== frameId} => ${match}`);
        return match;
      });
      
      if (existingFrame) {
        console.log('[DOUBLON DEBUG FRAME] DOUBLON DÉTECTÉ !', newTitle);
        toast.dismiss(toastId);
        
        // Créer l'objet newItem pour la fenêtre de confirmation
        const newItem = {
          photoUrl: base64,
          title: newTitle,
          format: format,
          mediaType: mediaType,
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          duration: duration,
          date: new Date(file.lastModified).toLocaleDateString('fr-FR'),
          location: language === 'fr' ? "Importé par glisser-déposer" : "Imported by drag and drop",
          originalName: file.name,
          size: file.size
        };
        
        // Stocker le frameId cible pour l'utiliser après la décision
        setPendingDropFrameId(frameId);
        setDuplicatesToHandle([{ newItem, existingFrame }]);
        setNonDuplicatesToAdd([]);
        setShowDuplicateConfirmModal(true);
        return;
      }
      
      console.log('[DOUBLON DEBUG FRAME] Pas de doublon, ajout direct');
      
      // Mettre à jour le cadre spécifique
      let updatedFrames = frames.map(f => 
        f.id === frameId 
          ? {
              ...f,
              photoUrl: base64,
              title: newTitle,
              format: format,
              mediaType: mediaType,
              videoUrl: videoUrl,
              thumbnailUrl: thumbnailUrl,
              duration: duration,
              date: new Date(file.lastModified).toLocaleDateString('fr-FR'),
              location: language === 'fr' ? "Importé par glisser-déposer" : "Imported by drag and drop",
              originalName: file.name,
              size: file.size
            }
          : f
      );

      // Toujours garder un cadre vide à la fin
      const lastFrame = updatedFrames[updatedFrames.length - 1];
      if (lastFrame && lastFrame.photoUrl) {
        const nextId = Math.max(...updatedFrames.map(f => f.id), 0) + 1;
        updatedFrames.push({
          id: nextId,
          photoUrl: null,
          title: `${defaultTitle} ${nextId}`,
          isSelected: false,
          format: isPhoto ? "JPG" : "PDF"
        });
      }

      setFrames(updatedFrames);

      toast.dismiss(toastId);
      toast.success(language === 'fr' ? `Fichier déposé dans le cadre` : `File dropped in frame`);
    } catch (error) {
      console.error("Erreur drop sur cadre:", error);
      toast.dismiss(toastId);
      toast.error(language === 'fr' ? "Erreur lors de l'ajout du fichier" : "Error adding file");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const frameId = active.data.current?.frameId;
    const frame = frames.find(f => f.id === frameId);
    if (frame) setActiveFrame(frame);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveFrame(null);

    if (!over) return;

    const activeFrameId = active.data.current?.frameId;
    const overFrameId = over.data.current?.frameId;

    if (activeFrameId !== overFrameId) {
      setFrames((prevFrames) => {
        const newFrames = [...prevFrames];
        const activeIndex = newFrames.findIndex(f => f.id === activeFrameId);
        const overIndex = newFrames.findIndex(f => f.id === overFrameId);

        if (activeIndex !== -1 && overIndex !== -1) {
          const activeFrame = newFrames[activeIndex];
          const overFrame = newFrames[overIndex];

          // Swap content only, keep IDs (slots) if possible, or swap objects.
          // Here we swap content to simulate moving photos between frames.
          const newActiveFrame = { 
            ...activeFrame, 
            photoUrl: overFrame.photoUrl, 
            title: overFrame.title, 
            format: overFrame.format, 
            date: overFrame.date, 
            location: overFrame.location, 
            comments: overFrame.comments,
            isSelected: overFrame.isSelected,
            rotation: overFrame.rotation || 0,
            mediaType: overFrame.mediaType,
            videoUrl: overFrame.videoUrl,
            videoDuration: overFrame.videoDuration
          };
          
          const newOverFrame = { 
            ...overFrame, 
            photoUrl: activeFrame.photoUrl, 
            title: activeFrame.title, 
            format: activeFrame.format, 
            date: activeFrame.date, 
            location: activeFrame.location, 
            comments: activeFrame.comments,
            isSelected: activeFrame.isSelected,
            rotation: activeFrame.rotation || 0,
            mediaType: activeFrame.mediaType,
            videoUrl: activeFrame.videoUrl,
            videoDuration: activeFrame.videoDuration
          };

          newFrames[activeIndex] = newActiveFrame;
          newFrames[overIndex] = newOverFrame;
        }
        return newFrames;
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, frameId: id });
  };

  const handleSelect = (id: number, isSelected: boolean) => {
    setFrames(frames.map(f => f.id === id ? { ...f, isSelected } : f));
  };

  const handleDoubleClick = (id: number) => {
    const frame = frames.find(f => f.id === id);
    if (frame) {
      if (frame.mediaType === 'video' && frame.videoUrl) {
        // Ouvrir le lecteur vidéo
        setVideoToPlay({ url: frame.videoUrl, title: frame.title, rotation: frame.rotation || 0, frameId: frame.id });
      } else if (frame.photoUrl) {
        // Ouvrir la visionneuse d'image/PDF
        setViewedDoc({ url: frame.photoUrl, title: frame.title, rotation: frame.rotation || 0 });
      }
    }
  };

  const handleEdit = (id: number) => {
    const frame = frames.find(f => f.id === id);
    if (frame) {
      setSelectedFrameForDetails(frame);
      setShowDetailsModal(true);
    }
  };

  // Rotation de la vignette (continue indéfiniment: 0 -> 90 -> 180 -> 270 -> 360 -> 450 -> ...)
  const handleRotateFrame = (id: number) => {
    setFrames(prevFrames => 
      prevFrames.map(f => {
        if (f.id === id) {
          const currentRotation = f.rotation || 0;
          const newRotation = currentRotation + 90; // Continue sans revenir à 0
          return { ...f, rotation: newRotation };
        }
        return f;
      })
    );
  };

  const handleDeleteSelectedFromToolbar = () => {
    const selectedIds = frames.filter(f => f.isSelected).map(f => f.id);
    if (selectedIds.length === 0) {
      toast.info(language === "fr" ? "Aucun élément sélectionné" : "No element selected");
      return;
    }

    if (window.confirm(language === 'fr' ? `Supprimer ${selectedIds.length} élément(s) ?` : `Delete ${selectedIds.length} item(s)?`)) {
      saveToHistory(frames);
      const updatedFrames = frames.map(f => 
        selectedIds.includes(f.id) 
          ? { ...f, photoUrl: null, title: `${defaultTitle} ${f.id}`, format: isPhoto ? "JPG" : "PDF", date: "", location: "", comments: "", isSelected: false } 
          : f
      );
      setFrames(updatedFrames);
      toast.success(language === "fr" ? "Suppression effectuée" : "Deletion complete");
    }
  };

  const handleDeleteAlbum = async () => {
    if (currentAlbumId) {
      // Vérifier si c'est l'album "Non classées" (album système)
      if (albumName === "Non classées" || currentAlbumId.includes('_nc') || currentAlbumId === MODELES_STICKERS_ALBUM_ID) {
        toast.error(language === "fr" ? "L'album language === 'fr' ? 'Non classées' : 'Uncategorized' est un album système et ne peut pas être supprimé." : "The 'Not classified' album is a system album and cannot be deleted.");
        setShowDeleteConfirm(false);
        return;
      }
      await db.albums.delete(currentAlbumId);
      await db.album_metas.delete(currentAlbumId);
      toast.success(language === "fr" ? "Album supprimé" : "Album deleted");
      setLocation("/");
    }
  };

  // --- GESTION CADRES ---
  const handleAddFrames = (position: 'before' | 'after') => {
    if (selectedFrameForManagement === null) return;
    
    const currentIndex = frames.findIndex(f => f.id === selectedFrameForManagement);
    if (currentIndex === -1) return;

    const maxId = Math.max(...frames.map(f => f.id), 0);
    const newFrames: PhotoFrame[] = Array.from({ length: framesToAdd }, (_, i) => ({
      id: maxId + i + 1,
      title: `${defaultTitle} ${maxId + i + 1}`,
      isSelected: false,
      format: isPhoto ? "JPG" : "PDF",
      photoUrl: null
    }));

    const updatedFrames = [...frames];
    if (position === 'before') {
      updatedFrames.splice(currentIndex, 0, ...newFrames);
    } else {
      updatedFrames.splice(currentIndex + 1, 0, ...newFrames);
    }

    setFrames(updatedFrames);
    setShowFrameManagementModal(false);
    toast.success(language === 'fr' ? `${framesToAdd} cadre(s) ajouté(s)` : `${framesToAdd} frame(s) added`);
  };

  const handleDeleteEmptyFrames = () => {
    // Filtrer pour ne garder que les cadres qui ont une URL (donc une photo/doc)
    const nonEmptyFrames = frames.filter(f => f.photoUrl && f.photoUrl.trim() !== "");
    
    if (nonEmptyFrames.length === 0) {
      // Si tout est vide, on garde quand même un cadre vide par défaut
      setFrames(createDefaultFrames(1));
      toast.info(language === "fr" ? "Tous les cadres étaient vides, un cadre par défaut a été conservé." : "All frames were empty, one default frame was kept.");
    } else {
      setFrames(nonEmptyFrames);
      toast.success(language === "fr" ? "Tous les cadres vides ont été supprimés" : "All empty frames deleted");
    }
    setShowFrameManagementModal(false);
  };

  const handleDeleteSelectedFrame = () => {
    if (selectedFrameForManagement === null) {
      toast.error(language === "fr" ? "Aucun cadre sélectionné pour la suppression" : "No frame selected for deletion");
      return;
    }
    
    // Vérifier que le cadre existe
    const frameToDelete = frames.find(f => f.id === selectedFrameForManagement);
    if (!frameToDelete) {
      toast.error(language === "fr" ? "Cadre introuvable" : "Frame not found");
      return;
    }
    
    // Si le cadre contient une photo/vidéo, demander confirmation
    if (frameToDelete.imageUrl) {
      setShowDeleteFrameConfirmModal(true);
      return;
    }
    
    // Cadre vide : supprimer directement
    executeDeleteSelectedFrame();
  };
  
  const executeDeleteSelectedFrame = () => {
    if (selectedFrameForManagement === null) return;
    
    const updatedFrames = frames.filter(f => f.id !== selectedFrameForManagement);
    if (updatedFrames.length === 0) {
      setFrames(createDefaultFrames(1));
    } else {
      setFrames(updatedFrames);
    }
    setSelectedFrameForManagement(null); // Réinitialiser la sélection
    setShowFrameManagementModal(false);
    setShowDeleteFrameConfirmModal(false);
    toast.success(language === "fr" ? "Cadre supprimé" : "Frame deleted");
  };

  // --- EXPORTER ---
  const [showExportInfoModal, setShowExportInfoModal] = useState(false);
  const [hasSeenExportInfo, setHasSeenExportInfo] = useState(() => {
    return localStorage.getItem('duoclass_export_info_v2') === 'true';
  });

  const handleExportClick = () => {
    const selectedDocs = frames.filter(f => f.isSelected && f.photoUrl);
    if (selectedDocs.length === 0) {
      toast.info(language === "fr" ? "Sélectionnez des éléments à envoyer par email" : "Select items to send by email");
      return;
    }

    setShowSendModal(true);
  };

  const executeExport = async (docs: PhotoFrame[]) => {
    const toastId = toast.loading("Export en cours...");
    let count = 0;

    for (let i = 0; i < docs.length; i++) {
      const frame = docs[i];
      if (frame.photoUrl) {
        try {
          // Déterminer l'extension depuis le format ou le dataURL
          let extension = 'jpg';
          let mimeType = 'image/jpeg';
          if (frame.format) {
            extension = frame.format.toLowerCase();
            if (extension === 'png') mimeType = 'image/png';
            else if (extension === 'gif') mimeType = 'image/gif';
            else if (extension === 'webp') mimeType = 'image/webp';
            else if (extension === 'bmp') mimeType = 'image/bmp';
          } else if (frame.photoUrl.includes('image/png')) {
            extension = 'png';
            mimeType = 'image/png';
          } else if (frame.photoUrl.includes('image/gif')) {
            extension = 'gif';
            mimeType = 'image/gif';
          } else if (frame.photoUrl.includes('image/webp')) {
            extension = 'webp';
            mimeType = 'image/webp';
          }
          
          const fileName = `${frame.title || `${itemLabel}_${i + 1}`}.${extension}`;
          
          // Convertir dataURL en Blob pour Safari
          if (frame.photoUrl.startsWith('data:')) {
            const response = await fetch(frame.photoUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // Nettoyer après un court délai
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(blobUrl);
            }, 100);
          } else {
            // URL normale
            const link = document.createElement('a');
            link.href = frame.photoUrl;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 100);
          }
          
          count++;
          
          // Petit délai entre les téléchargements pour éviter les problèmes
          if (i < docs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (e) {
          console.error("Erreur export:", e);
          toast.error(language === 'fr' ? `Erreur lors de l'export de ${frame.title || 'fichier'}` : `Error exporting ${frame.title || 'file'}`);
        }
      }
    }

    toast.dismiss(toastId);
    if (count > 0) {
      toast.success(language === 'fr' ? `${count} fichier(s) exporté(s) vers votre dossier Téléchargements` : `${count} file(s) exported to your Downloads folder`);
    }
  };

  const handleExportWithInfo = () => {
    const selectedDocs = frames.filter(f => f.isSelected && f.photoUrl);
    setHasSeenExportInfo(true);
    localStorage.setItem('duoclass_export_info_v2', 'true');
    setShowExportInfoModal(false);
    executeExport(selectedDocs);
  };


  // --- IMPRESSION DIRECTE ---
  const handlePrintSelected = (selectedDocs: PhotoFrame[]) => {
    // Utiliser window.open avec fermeture automatique après impression
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error(language === 'fr' ? 'Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloquées.' : 'Unable to open print window. Check that popups are not blocked.');
      return;
    }

    let htmlContent = `<!DOCTYPE html>
    <html>
    <head>
      <title>Impression ${pageTitle}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: white; }
        @page { margin: 10mm; size: A4 portrait; }
        h1 { text-align: center; margin-bottom: 20px; font-size: 18px; }
        .print-container { display: block; }
        .print-item { 
          page-break-inside: avoid;
          page-break-after: always;
          text-align: center;
          padding: 10px;
          padding-top: 100px;
          margin-bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .print-item img { 
          max-width: 90%;
          max-height: 240mm;
          display: block;
          margin: 0 auto 10px;
          border: 1px solid #ddd;
        }
        .print-item-info { 
          font-size: 11px;
          color: #666;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <h1>${pageTitle} - Impression</h1>
      <div class="print-container">
    `;

    selectedDocs.forEach((doc, index) => {
      if (doc.photoUrl) {
        htmlContent += `
          <div class="print-item">
            <img src="${doc.photoUrl}" alt="${doc.title}" />
            <div class="print-item-info">
              <strong>${doc.title || `${itemLabel} ${index + 1}`}</strong>
            </div>
          </div>
        `;
      }
    });

    htmlContent += `
      </div>
      <script>
        // Lancer l'impression automatiquement et fermer la fenêtre après
        window.onload = function() {
          setTimeout(function() {
            window.print();
            // Fermer la fenêtre après l'impression (ou annulation)
            window.onafterprint = function() { window.close(); };
            // Fallback pour Safari qui ne supporte pas toujours onafterprint
            setTimeout(function() { window.close(); }, 1000);
          }, 300);
        };
      </script>
    </body>
    </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  // --- DIAPORAMA / LECTURE CONTINUE ---
  const handleDiaporamaClick = () => {
    // Vérifier si l'album est sécurisé - diaporama désactivé pour les albums sécurisés
    if (albumType === 'secure') {
      toast.info(language === "fr" ? "Le diaporama n'est pas disponible pour les albums sécurisés" : "Slideshow is not available for secured albums");
      return;
    }
    
    // Vérifier si la catégorie est de type vidéos - lancer le mode lecture continue
    if (currentAlbumCategory?.mediaType === 'videos') {
      // Récupérer toutes les vidéos
      const videosInAlbum = frames.filter(f => f.isVideo && f.imageData);
      
      if (videosInAlbum.length === 0) {
        toast.info(language === "fr" ? "Aucune vidéo à lire dans cet album" : "No video to play in this album");
        return;
      }
      
      // Si des vidéos sont sélectionnées, lire uniquement la sélection
      const selectedVideos = videosInAlbum.filter(f => f.isSelected);
      
      if (selectedVideos.length > 0) {
        // Stocker les vidéos sélectionnées pour le diaporama
        setDiaporamaSelectedOnly(true);
        setVideoPlaylistStartIndex(0);
        setShowVideoPlaylist(true);
      } else {
        // Pas de sélection : lire toutes les vidéos
        setDiaporamaSelectedOnly(false);
        setVideoPlaylistStartIndex(0);
        setShowVideoPlaylist(true);
      }
      return;
    }
    
    // Récupérer toutes les photos avec une URL (images uniquement, pas les PDF ni vidéos)
    const photosWithUrl = frames.filter(f => {
      if (!f.photoUrl) return false;
      // Exclure les PDF
      if (f.photoUrl.startsWith('data:application/pdf') || f.photoUrl.endsWith('.pdf')) return false;
      // Exclure les vidéos
      if (f.isVideo) return false;
      // Accepter les images (data:image ou autres formats d'image)
      return f.photoUrl.startsWith('data:image') || 
             f.photoUrl.includes('.jpg') || 
             f.photoUrl.includes('.jpeg') || 
             f.photoUrl.includes('.png') || 
             f.photoUrl.includes('.gif') || 
             f.photoUrl.includes('.webp');
    });
    
    if (photosWithUrl.length === 0) {
      toast.info(language === "fr" ? "Aucune photo à afficher dans le diaporama" : "No photo to display in slideshow");
      return;
    }

    // Si des photos sont sélectionnées, afficher uniquement la sélection
    const selectedPhotos = photosWithUrl.filter(f => f.isSelected);
    
    if (selectedPhotos.length > 0) {
      // Diaporama sur la sélection uniquement
      setDiaporamaSelectedOnly(true);
      setDiaporamaStartIndex(0);
      toast.info(language === 'fr' ? `Diaporama : ${selectedPhotos.length} photo(s) sélectionnée(s)` : `Slideshow: ${selectedPhotos.length} photo(s) selected`);
    } else {
      // Pas de sélection : afficher toutes les photos
      setDiaporamaSelectedOnly(false);
      setDiaporamaStartIndex(0);
    }

    setShowDiaporama(true);
  };



  // Mettre à jour la référence pour le raccourci clavier D
  useEffect(() => {
    handleDiaporamaRef.current = handleDiaporamaClick;
  }, [albumType, currentAlbumCategory, frames]);

  // Préparer les photos pour le diaporama (toutes ou sélection)
  const diaporamaPhotos = frames
    .filter(f => {
      // Doit avoir une URL
      if (!f.photoUrl) return false;
      // Exclure les PDF
      if (f.photoUrl.startsWith('data:application/pdf') || f.photoUrl.endsWith('.pdf')) return false;
      // Exclure les vidéos
      if (f.isVideo) return false;
      // Vérifier que c'est une image
      const isImage = f.photoUrl.startsWith('data:image') || 
                      f.photoUrl.includes('.jpg') || 
                      f.photoUrl.includes('.jpeg') || 
                      f.photoUrl.includes('.png') || 
                      f.photoUrl.includes('.gif') || 
                      f.photoUrl.includes('.webp');
      if (!isImage) return false;
      // Si mode sélection, ne garder que les photos sélectionnées
      if (diaporamaSelectedOnly) return f.isSelected;
      return true;
    })
    .map(f => ({
      url: f.photoUrl!,
      title: f.title || `Photo ${f.id}`
    }));

  // --- RETOUCHE PHOTO ---
  const handleRetouchesClick = () => {
    // Récupérer les photos sélectionnées (uniquement les images, pas les PDF)
    const selectedPhotos = frames.filter(f => f.isSelected && f.photoUrl && f.photoUrl.startsWith('data:image'));
    
    if (selectedPhotos.length === 0) {
      toast.info(language === "fr" ? "Sélectionnez une photo à retoucher" : "Select a photo to edit");
      return;
    }
    
    if (selectedPhotos.length > 1) {
      toast.info(language === "fr" ? "Veuillez sélectionner une seule photo à retoucher" : "Please select only one photo to edit");
      return;
    }
    
    // Ouvrir la modale de choix (IA / Manuel / Avancé)
    const photo = selectedPhotos[0];
    setRetouchImageSrc(photo.photoUrl!);
    setRetouchFrameId(photo.id);
    setRetouchImageTitle(photo.title || '');
    setRetouchImageComments(photo.comments || '');
    setShowRetouchModal(true);
  };

  // Ouvrir la page de retouche avancée (12 fonctions)
  const handleOpenAdvancedRetouch = () => {
    // Fermer la modal et ouvrir la page en même temps
    setShowRetouchModal(false);
    setShowRetouchPage(true);
  };

  // Sauvegarder depuis la modale (IA ou Manuel) - crée une copie avec suffixe numéroté _ret1, _ret2, etc.
  const handleRetouchModalSave = (newImageUrl: string) => {
    if (retouchFrameId !== null) {
      // Trouver le prochain ID disponible
      const maxId = Math.max(...frames.map(f => f.id), 0);
      const newId = maxId + 1;
      
      // Créer un nouveau cadre avec la photo retouchée et suffixe numéroté
      const originalFrame = frames.find(f => f.id === retouchFrameId);
      const originalTitle = originalFrame?.title || 'Photo';
      
      // Extraire le nom de base (sans suffixe _retX existant)
      const baseTitle = originalTitle.replace(/_ret\d*$/, '');
      
      // Compter combien de versions _ret existent déjà pour ce nom de base
      const existingRetouches = frames.filter(f => {
        const title = f.title || '';
        return title.startsWith(baseTitle + '_ret') || title === baseTitle + '_ret';
      }).length;
      
      // Générer le nouveau numéro (commence à 1)
      const retouchNumber = existingRetouches + 1;
      const newTitle = `${baseTitle}_ret${retouchNumber}`;
      
      const newFrame: PhotoFrame = {
        id: newId,
        title: newTitle,
        isSelected: false,
        format: isPhoto ? "JPG" : "PDF",
        photoUrl: newImageUrl,
        date: new Date().toLocaleDateString('fr-FR'),
        location: originalFrame?.location || "",
        comments: `Retouchée depuis ${originalTitle}`
      };
      
      // Insérer la nouvelle photo juste après l'originale
      const originalIndex = frames.findIndex(f => f.id === retouchFrameId);
      const newFrames = [...frames];
      newFrames.splice(originalIndex + 1, 0, newFrame);
      setFrames(newFrames);
      
      toast.success(language === 'fr' ? `Photo retouchée enregistrée comme "${newTitle}"` : `Edited photo saved as "${newTitle}"`);
    }
    setShowRetouchModal(false);
    setRetouchImageSrc('');
    setRetouchFrameId(null);
  };

  // Fonction pour sauvegarder la photo retouchée comme copie avec suffixe _ret
  const handleRetouchSaveAsCopy = (newImageUrl: string, newTitle: string) => {
    // Trouver le prochain ID disponible
    const maxId = Math.max(...frames.map(f => f.id), 0);
    const newId = maxId + 1;
    
    // Créer un nouveau cadre avec la photo retouchée
    const newFrame: PhotoFrame = {
      id: newId,
      title: newTitle,
      isSelected: false,
      format: isPhoto ? "JPG" : "PDF",
      photoUrl: newImageUrl,
      date: new Date().toLocaleDateString('fr-FR'),
      location: "",
      comments: `Retouchée depuis ${retouchImageTitle}`
    };
    
    setFrames([...frames, newFrame]);
    toast.success(language === 'fr' ? `Photo retouchée enregistrée comme "${newTitle}"` : `Edited photo saved as "${newTitle}"`);
    
    setShowRetouchPage(false);
    setRetouchImageSrc('');
    setRetouchFrameId(null);
    setRetouchImageTitle('');
    setRetouchImageComments('');
  };

  // Fonction pour fermer la page de retouche sans sauvegarder
  const handleRetouchClose = () => {
    setShowRetouchPage(false);
    setRetouchImageSrc('');
    setRetouchFrameId(null);
    setRetouchImageTitle('');
    setRetouchImageComments('');
  };

  // --- CONVERSION ---
  const handleConvertClick = () => {
    const selectedDocs = frames.filter(f => f.isSelected && f.photoUrl);
    if (selectedDocs.length === 0) {
      toast.info(language === "fr" ? "Sélectionnez des éléments à convertir" : "Select items to convert");
      return;
    }
    setShowConvertModal(true);
  };

  const handleConvert = async () => {
    const selectedDocs = frames.filter(f => f.isSelected && f.photoUrl);
    
    if (convertMode === 'pdf') {
      generatePDF(selectedDocs);
    } else {
      // Placer les images converties dans l'album (pas de téléchargement)
      await addConvertedImagesToAlbum(selectedDocs);
    }
    
    setShowConvertModal(false);
  };

  // Fonction pour ajouter les images converties directement dans l'album
  const addConvertedImagesToAlbum = async (docs: PhotoFrame[]) => {
    const toastId = toast.loading("Conversion en cours...");
    let count = 0;
    const newFrames = [...frames];
    const maxId = Math.max(...frames.map(f => f.id), 0);
    
    // Garder une trace des insertions pour ajuster les index
    let insertionOffset = 0;
    
    // Trier les docs par leur position dans l'album pour insérer dans l'ordre
    const sortedDocs = [...docs].sort((a, b) => {
      const indexA = frames.findIndex(f => f.id === a.id);
      const indexB = frames.findIndex(f => f.id === b.id);
      return indexA - indexB;
    });

    for (const frame of sortedDocs) {
      if (frame.photoUrl) {
        try {
          // Si c'est une URL externe, la convertir d'abord en data:image
          let imageData = frame.photoUrl;
          
          if (!frame.photoUrl.startsWith('data:')) {
            // Charger l'image depuis l'URL et la convertir en base64
            try {
              const response = await fetch(frame.photoUrl);
              const blob = await response.blob();
              imageData = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            } catch (fetchError) {
              console.error("Impossible de charger l'image:", fetchError);
              continue; // Passer à l'image suivante
            }
          }
          
          // Vérifier que c'est bien une image
          if (!imageData.startsWith('data:image')) {
            console.warn("Format non supporté:", frame.title);
            continue;
          }
          
          // Convertir l'image au nouveau format
          const convertedData = await convertImageFormat(imageData, imageFormat);
          
          // Créer le nom avec suffixe
          const baseName = frame.title || `Image_${frame.id}`;
          const newTitle = `${baseName}_conv`;
          
          // Déterminer le type MIME
          let mimeType = 'image/jpeg';
          if (imageFormat === 'png') mimeType = 'image/png';
          if (imageFormat === 'bmp') mimeType = 'image/bmp';
          if (imageFormat === 'svg') mimeType = 'image/svg+xml';
          
          // Créer le nouveau dataURL
          const newPhotoUrl = `data:${mimeType};base64,${convertedData}`;
          
          // Créer un nouveau cadre avec l'image convertie
          const newFrame: PhotoFrame = {
            id: maxId + count + 1,
            title: newTitle,
            isSelected: false,
            format: imageFormat.toUpperCase(),
            photoUrl: newPhotoUrl,
            date: frame.date,
            location: frame.location,
            comments: frame.comments ? `Converti depuis ${frame.title}. ${frame.comments}` : `Converti depuis ${frame.title}`
          };
          
          // Trouver l'index du cadre original dans le tableau ORIGINAL (frames)
          const originalIndexInSource = frames.findIndex(f => f.id === frame.id);
          
          if (originalIndexInSource !== -1) {
            // Calculer la position d'insertion en tenant compte des insertions précédentes
            const insertPosition = originalIndexInSource + insertionOffset + 1;
            newFrames.splice(insertPosition, 0, newFrame);
            insertionOffset++; // Incrémenter le décalage pour les prochaines insertions
          } else {
            newFrames.push(newFrame);
          }
          
          count++;
        } catch (e) {
          console.error("Erreur conversion image", e);
        }
      }
    }
    
    toast.dismiss(toastId);

    if (count > 0) {
      setFrames(newFrames);
      toast.success(language === 'fr' ? `${count} image(s) convertie(s) en ${imageFormat.toUpperCase()} et ajoutée(s) à l'album` : `${count} image(s) converted to ${imageFormat.toUpperCase()} and added to album`);
    } else {
      toast.warning(language === "fr" ? "Aucune image compatible trouvée pour la conversion" : "No compatible image found for conversion");
    }
  };

  const convertImageFormat = (base64: string, format: 'jpg' | 'png' | 'bmp' | 'svg'): Promise<string> => {
    return new Promise((resolve) => {
      if (format === 'svg') {
        // Encapsulation simple dans un SVG
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <image href="${base64}" width="100%" height="100%" />
        </svg>`;
        resolve(btoa(svg));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          let mimeType = 'image/jpeg';
          if (format === 'png') mimeType = 'image/png';
          if (format === 'bmp') mimeType = 'image/bmp'; // Note: standard browsers might fallback to png for bmp
          
          const newDataUrl = canvas.toDataURL(mimeType);
          resolve(newDataUrl.split(',')[1]);
        } else {
          resolve(base64.split(',')[1]);
        }
      };
      img.src = base64;
    });
  };

  const generateImagesZip = async (docs: PhotoFrame[]) => {
    const zip = new JSZip();
    const folder = zip.folder(`DuoClass_${isPhoto ? 'Photos' : 'Documents'}`);
    
    if (!folder) return;

    let count = 0;
    const toastId = toast.loading("Conversion en cours...");

    for (const frame of docs) {
      if (frame.photoUrl) {
        try {
          if (frame.photoUrl.startsWith('data:image')) {
            // Conversion du format si nécessaire
            const convertedData = await convertImageFormat(frame.photoUrl, imageFormat);
            const fileName = `${frame.title || `Image_${count + 1}`}.${imageFormat}`;
            
            // Pour SVG, on doit décoder le base64 pour écrire du texte, ou laisser JSZip gérer le base64
            // Ici on passe tout en base64 à JSZip
            folder.file(fileName, convertedData, { base64: true });
            count++;
          } 
        } catch (e) {
          console.error("Erreur ajout image ZIP", e);
        }
      }
    }
    
    toast.dismiss(toastId);

    if (count > 0) {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `DuoClass_Export_${imageFormat.toUpperCase()}_${Date.now()}.zip`);
      toast.success(language === 'fr' ? `${count} image(s) exportée(s) en ZIP (${imageFormat.toUpperCase()})` : `${count} image(s) exported as ZIP (${imageFormat.toUpperCase()})`);
    } else {
      toast.warning(language === "fr" ? "Aucune image compatible trouvée pour l'export ZIP" : "No compatible image found for ZIP export");
    }
  };

  const generatePDF = (docs: PhotoFrame[]) => {
    const doc = new jsPDF();
    
    docs.forEach((frame, i) => {
      if (frame.photoUrl) {
        if (i > 0) doc.addPage();
        
        // Titre
        doc.setFontSize(16);
        doc.text(frame.title || `${itemLabel} ${i+1}`, 10, 15);
        
        // Date et Lieu
        doc.setFontSize(10);
        doc.text(`${frame.date || ''} ${frame.location ? '- ' + frame.location : ''}`, 10, 22);
        
        // Image
        try {
          if (frame.photoUrl.startsWith('data:image')) {
            const imgProps = doc.getImageProperties(frame.photoUrl);
            const pdfWidth = doc.internal.pageSize.getWidth() - 20;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            // Limiter la hauteur pour ne pas dépasser la page
            const maxPageHeight = 250;
            const finalHeight = Math.min(pdfHeight, maxPageHeight);
            
            doc.addImage(frame.photoUrl, 'JPEG', 10, 30, pdfWidth, finalHeight);
          } else {
             doc.text(language === "fr" ? "(Format non supporté pour la conversion directe)" : "(Format not supported for direct conversion)", 10, 50);
          }
          
          // Commentaires
          if (frame.comments) {
             doc.text("Commentaires:", 10, 280);
             doc.setFontSize(9);
             const splitText = doc.splitTextToSize(frame.comments, 190);
             doc.text(splitText, 10, 285);
          }
        } catch (e) {
          console.error("Erreur ajout image PDF", e);
          doc.text("(Erreur lors du chargement de l'image)", 10, 50);
        }
      }
    });
    
    // Générer le PDF en base64 pour l'ajouter à l'album
    const pdfBase64 = doc.output('datauristring');
    
    // Ajouter le PDF comme nouveau cadre dans l'album
    const newFrames = [...frames];
    const maxId = Math.max(...frames.map(f => f.id), 0);
    
    // Créer un nom basé sur les images converties
    const baseName = docs.length === 1 
      ? (docs[0].title || 'Image') + '_PDF'
      : `Conversion_${docs.length}_images`;
    
    const newFrame: PhotoFrame = {
      id: maxId + 1,
      title: baseName,
      isSelected: false,
      format: 'PDF',
      photoUrl: pdfBase64,
      date: new Date().toLocaleDateString('fr-FR'),
      location: '',
      comments: `PDF généré à partir de ${docs.length} image(s): ${docs.map(d => d.title).join(', ')}`
    };
    
    // Trouver l'index du dernier cadre sélectionné et insérer après
    const lastSelectedIndex = newFrames.findIndex(f => f.id === docs[docs.length - 1].id);
    if (lastSelectedIndex !== -1) {
      newFrames.splice(lastSelectedIndex + 1, 0, newFrame);
    } else {
      newFrames.push(newFrame);
    }
    
    setFrames(newFrames);
    
    toast.success(language === 'fr' ? `PDF créé et ajouté à l'album !` : `PDF created and added to album!`);
  };

  // Fermer le menu contextuel au clic ailleurs
  useEffect(() => {
    // Utiliser mousedown pour fermer le menu AVANT que le clic ne soit traité
    // (évite le conflit avec e.stopPropagation() du menu lui-même)
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Fermer uniquement si le clic est en dehors du menu contextuel
      if (!target.closest('[data-context-menu]')) {
        setContextMenu(null);
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Gestionnaire de clic droit global sur la page
  const handleGlobalContextMenu = (e: React.MouseEvent) => {
    // Vérifier si le clic n'est pas sur une vignette (qui a son propre gestionnaire)
    const target = e.target as HTMLElement;
    const isOnFrame = target.closest('[data-frame-id]');
    
    if (!isOnFrame) {
      e.preventDefault();
      // Ouvrir le menu contextuel sans frameId (options générales uniquement)
      setContextMenu({ x: e.clientX, y: e.clientY, frameId: null });
    }
  };

  // Afficher un écran de chargement pendant le chargement initial
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement de l'album...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative" onContextMenu={handleGlobalContextMenu}>

      {/* BOUTON FERMER fixe — retour Atelier (visible uniquement pour albums "Images projets") */}
      {currentAlbumCategory?.id === 'cat_mes_projets' && (
        <button
          onClick={() => setLocation('/atelier')}
          className="fixed top-3 right-16 z-[60] bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
          title={language === 'fr' ? 'Fermer — retour Atelier' : 'Close — back to Workshop'}
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* BOUTONS DE NAVIGATION RAPIDE + ASCENSEUR PERSONNALISÉ (permanents à droite) */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-50" style={{ height: '60vh' }}>
        {/* Bouton HAUT - Aller tout en haut */}
        <button
          onClick={() => {
            if (dropZoneRef.current) {
              dropZoneRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="bg-blue-500/90 hover:bg-blue-600 text-white w-7 h-7 rounded shadow-md transition-all hover:scale-105 flex items-center justify-center text-[9px] font-bold"
          title={t('common.goToTop')}
        >
          HAUT
        </button>
        {/* Bouton Haut -25 */}
        <button
          onClick={() => {
            if (dropZoneRef.current) {
              dropZoneRef.current.scrollBy({ top: -3500, behavior: 'smooth' });
            }
          }}
          className="bg-blue-400/80 hover:bg-blue-500 text-white w-7 h-7 rounded shadow-md transition-all hover:scale-105 flex items-center justify-center"
          title={t('common.goUp25')}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        
        {/* ASCENSEUR PERSONNALISÉ TOUJOURS VISIBLE */}
        <CustomScrollbar containerRef={dropZoneRef} className="flex-1 my-1" />
        
        {/* Bouton Bas +25 */}
        <button
          onClick={() => {
            if (dropZoneRef.current) {
              dropZoneRef.current.scrollBy({ top: 3500, behavior: 'smooth' });
            }
          }}
          className="bg-blue-400/80 hover:bg-blue-500 text-white w-7 h-7 rounded shadow-md transition-all hover:scale-105 flex items-center justify-center"
          title={t('common.goDown25')}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        {/* Bouton Fin */}
        <button
          onClick={() => {
            if (dropZoneRef.current) {
              dropZoneRef.current.scrollTo({ top: dropZoneRef.current.scrollHeight, behavior: 'smooth' });
            }
          }}
          className="bg-orange-500/90 hover:bg-orange-600 text-white w-7 h-7 rounded shadow-md transition-all hover:scale-105 flex items-center justify-center text-[9px] font-bold"
          title={t('common.goToEnd')}
        >
          FIN
        </button>
      </div>
      
      {/* Input caché pour l'ajout de fichiers */}
      <input 
        type="file" 
        id="universal-file-input" 
        multiple 
        accept={acceptTypes} 
        className="hidden" 
        onChange={handleAddFiles} 
      />

      {/* FIL D'ARIANE (BREADCRUMB) */}
      <div className="bg-gradient-to-r from-gray-50 to-white border-b px-4 py-2 shrink-0">
        <nav className="flex items-center gap-2 text-sm">
          {/* Lien vers Atelier, Albums ou Albums Privés */}
          <button
            onClick={() => setLocation(albumType === 'secure' ? '/albums-prives' : currentAlbumCategory?.id === 'cat_mes_projets' ? '/atelier' : '/albums')}
            className={`font-medium hover:underline transition-colors ${
              albumType === 'secure'
                ? 'text-purple-600 hover:text-purple-800'
                : 'text-blue-600 hover:text-blue-800'
            }`}
          >
            {albumType === 'secure' ? (language === 'fr' ? 'Albums Privés' : 'Private Albums') : currentAlbumCategory?.id === 'cat_mes_projets' ? (language === 'fr' ? 'Projets' : 'Projects') : 'Albums'}
          </button>
          
          {/* Séparateur */}
          <span className="text-gray-400">›</span>
          
          {/* Catégorie */}
          {currentAlbumCategory ? (
            <span 
              className="font-medium px-2 py-0.5 rounded text-xs flex items-center gap-1.5"
              style={{ 
                backgroundColor: `${currentAlbumCategory.color}15`
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentAlbumCategory.color }} />
              <span className="text-gray-900">{translateLabel(currentAlbumCategory.label)}</span>
            </span>
          ) : (
            <span className="text-gray-500">{language === "fr" ? "Non classée" : "Not classified"}</span>
          )}
          
          {/* Séparateur */}
          <span className="text-gray-400">›</span>
          
          {/* Nom de l'album (actuel) */}
          <span className="font-semibold text-gray-900">{translateAlbumTitle(albumName)}</span>
        </nav>
      </div>

      {/* INFORMATIONS DE LOCALISATION - a), b), c), d) */}
      <div className="border-b px-4 py-3 shadow-sm shrink-0 bg-white/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* b) Type d'accès */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">{language === "fr" ? "b) Type d'accès :" : "b) Access type:"}</span>
            <span className={`font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide ${
              albumType === 'secure' 
                ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}>
              {albumType === 'secure' ? language === 'fr' ? 'Sécurisé' : 'Secure' : (albumSeries === 'classpapiers' ? 'Documents' : 'Photos')}
            </span>
          </div>
          
          {/* c) Catégorie */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">{language === "fr" ? "c) Catégorie :" : "c) Category:"}</span>
            {(() => {
              const albumCategory = currentAlbumCategory;
              return albumCategory ? (
                <span 
                  className="font-bold px-3 py-1 rounded-full text-xs border flex items-center gap-1.5"
                  style={{ 
                    backgroundColor: `${albumCategory.color}15`,
                    borderColor: albumCategory.color
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: albumCategory.color }} />
                  <span className="text-gray-900">{translateLabel(albumCategory.label)}</span>
                </span>
              ) : (
                <span className="font-bold text-gray-700">-</span>
              );
            })()}
          </div>
          
          {/* d) Nom de l'album */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">d) Album :</span>
            <span className="font-bold text-gray-900 text-base">{albumName}</span>
          </div>
        </div>
      </div>

      {/* ACTIONS ALBUM */}
      <div className="px-6 py-2 flex items-center justify-end bg-white/40 backdrop-blur-sm border-b shrink-0">
        <div className="flex gap-2">
          {/* Bouton Retour vers Albums Privés pour les albums sécurisés */}
          {currentAlbumId && albumType === 'secure' && (
            <Button 
              variant="ghost" 
              className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={() => setLocation('/albums-prives')}
            >
              ← Retour Albums Privés
            </Button>
          )}
          {/* Bouton Retour : vers Atelier si album "Images projets", sinon vers Albums */}
          {currentAlbumId && albumType !== 'secure' && currentAlbumCategory?.id === 'cat_mes_projets' && (
            <Button
              variant="ghost"
              className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => setLocation('/atelier')}
            >
              ← {language === 'fr' ? 'Retour Projets' : 'Back to Projects'}
            </Button>
          )}
          {currentAlbumId && albumType !== 'secure' && currentAlbumCategory?.id !== 'cat_mes_projets' && (
            <Button
              variant="ghost"
              className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => setLocation('/albums')}
            >
              ← Retour Albums
            </Button>
          )}
          {currentAlbumId && albumName !== "Non classées" && !currentAlbumId.includes('_nc') && currentAlbumId !== MODELES_STICKERS_ALBUM_ID && (
            <Button 
              variant="ghost" 
              className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              Supprimer l'album
            </Button>
          )}
        </div>
      </div>

      {/* GRILLE DE CADRES - Zone de drop externe */}
      <div 
        ref={dropZoneRef}
        className={`flex-1 overflow-y-auto scrollbar-always-visible p-4 relative transition-colors duration-200 ${
          isDraggingExternal ? 'bg-blue-50 ring-4 ring-inset ring-blue-400 ring-opacity-50' : ''
        }`}
        onDragEnter={handleExternalDragEnter}
        onDragOver={handleExternalDragOver}
        onDragLeave={handleExternalDragLeave}
        onDrop={handleExternalDrop}
      >
        {/* Indicateur visuel de drop */}
        {isDraggingExternal && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-100/80 z-50 pointer-events-none">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl border-4 border-dashed border-blue-400">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-xl font-bold text-blue-600">Déposez vos {isPhoto ? 'photos' : 'documents'} ici</p>
              <p className="text-sm text-gray-500 mt-2">{language === "fr" ? "Les cadres seront créés automatiquement" : "Frames will be created automatically"}</p>
            </div>
          </div>
        )}

        <DndContext 
          sensors={sensors} 
          onDragStart={handleDragStart} 
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-wrap gap-4 content-start">
            {frames.length === 0 && currentAlbumId === MODELES_STICKERS_ALBUM_ID && (
              <div className="w-full flex flex-col items-center justify-center py-12 text-gray-400">
                <p className="text-sm font-medium mb-1">
                  {language === "fr" ? "L'album Modèles Stickers est vide" : "The Sticker Models album is empty"}
                </p>
                <p className="text-xs text-gray-300">
                  {language === "fr"
                    ? "Importez des images depuis l'Atelier Créations → Cliparts & Stickers → Planche de stickers"
                    : "Import images from Atelier Créations → Cliparts & Stickers → Sticker Sheet"}
                </p>
              </div>
            )}
            {frames.filter(f => selectedCategoryFilter === null || f.categoryId === selectedCategoryFilter).map((frame, index) => (
              <DroppableFrame 
                key={frame.id} 
                frame={frame} 
                index={index} 
                zoomLevel={zoomLevel}
                displayMode={displayMode}
                onContextMenu={handleContextMenu}
                onExternalDrop={handleExternalDropOnFrame}
              >
                {isPhoto ? (
                  <DraggablePhoto
                    frame={frame}
                    zoomLevel={zoomLevel}
                    displayMode={displayMode}
                    onSelect={handleSelect}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    onEdit={handleEdit}
                    onDelete={(id) => {
                      if (window.confirm(language === 'fr' ? "Supprimer cette photo ?" : "Delete this photo?")) {
                        saveToHistory(frames);
                        setFrames(frames.map(f => f.id === id ? { ...f, photoUrl: null, title: `${defaultTitle} ${f.id}`, format: "JPG", date: "", location: "", comments: "" } : f));
                        toast.success(language === 'fr' ? "Photo supprimée" : "Photo deleted");
                      }
                    }}
                    onRotate={handleRotateFrame}
                  />
                ) : (
                  <DraggableDocument
                    frame={frame}
                    zoomLevel={zoomLevel}
                    displayMode={displayMode}
                    onSelect={handleSelect}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    onEdit={handleEdit}
                    onDelete={(id) => {
                      if (window.confirm(language === 'fr' ? "Supprimer ce document ?" : "Delete this document?")) {
                        saveToHistory(frames);
                        setFrames(frames.map(f => f.id === id ? { ...f, photoUrl: null, title: `${defaultTitle} ${f.id}`, format: "PDF", date: "", location: "", comments: "" } : f));
                        toast.success(language === 'fr' ? "Document supprimé" : "Document deleted");
                      }
                    }}
                    onRotate={handleRotateFrame}
                  />
                )}
              </DroppableFrame>
            ))}
          </div>

          <DragOverlay>
            {activeFrame ? (
              <div style={{ width: 200 + (zoomLevel * 3), height: (200 + (zoomLevel * 3)) + 40 }}>
                <PhotoFrameNew
                  frame={activeFrame}
                  isSelected={activeFrame.isSelected || false}
                  onSelect={() => {}}
                  onDoubleClick={() => {}}
                  onContextMenu={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  zoomLevel={zoomLevel}
                  isOverlay={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

      </div>

      {/* VISIONNEUSE */}
      {viewedDoc && (
        <UniversalViewer 
          url={viewedDoc.url} 
          title={viewedDoc.title}
          rotation={viewedDoc.rotation}
          onClose={() => setViewedDoc(null)}
        />
      )}

      {/* LECTEUR VIDEO */}
      {videoToPlay && (
        <VideoPlayerModal
          isOpen={true}
          videoUrl={videoToPlay.url}
          title={videoToPlay.title}
          initialRotation={videoToPlay.rotation}
          onRotationChange={(newRotation) => {
            // Sauvegarder la rotation dans le frame
            setFrames(prev => prev.map(f => 
              f.id === videoToPlay.frameId ? { ...f, rotation: newRotation } : f
            ));
            // Mettre à jour l'état local aussi
            setVideoToPlay(prev => prev ? { ...prev, rotation: newRotation } : null);
          }}
          onClose={() => setVideoToPlay(null)}
        />
      )}

      {/* MENU CONTEXTUEL */}
      {contextMenu && (
        <div 
          data-context-menu
          className="fixed bg-white border border-gray-200 shadow-lg rounded-md py-1 z-[9999] min-w-[200px] max-h-[80vh] overflow-y-auto"
          style={{ 
            // Ajuster la position pour éviter que le menu soit coupé en bas ou à droite
            // Hauteur estimée du menu : ~450px (toutes les options)
            // Si le menu dépasse en bas, le positionner au-dessus du clic
            top: contextMenu.y + 450 > window.innerHeight 
              ? Math.max(10, contextMenu.y - 450) 
              : contextMenu.y,
            left: contextMenu.x + 220 > window.innerWidth 
              ? Math.max(10, contextMenu.x - 220) 
              : contextMenu.x
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
            onClick={() => {
              document.getElementById('universal-file-input')?.click();
              setContextMenu(null);
            }}
          >
            <div className="w-4 h-4 flex items-center justify-center border border-current rounded-sm text-[10px] font-bold">+</div>
            Ajouter {isPhoto ? "une photo" : "un document"}
          </button>

          {/* Toutes les options sont toujours visibles - grisées si non applicables */}
          {(() => {
            const currentFrame = contextMenu.frameId ? frames.find(f => f.id === contextMenu.frameId) : null;
            const hasPhoto = currentFrame?.photoUrl;
            const isVideoByType = currentFrame?.mediaType === 'video';
            const isVideoByFormat = currentFrame?.format && ['MOV', 'MP4', 'WEBM', 'AVI', 'MPEG4'].includes(currentFrame.format.toUpperCase());
            const hasVideoContent = (isVideoByType || isVideoByFormat) && (currentFrame?.videoUrl || currentFrame?.photoUrl);
            
            return (
              <>
                {/* Option Lire la vidéo */}
                <button 
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${hasVideoContent ? 'hover:bg-green-50 hover:text-green-600' : 'text-gray-300 cursor-not-allowed'}`}
                  onClick={() => {
                    if (hasVideoContent && currentFrame) {
                      const videoSource = currentFrame.videoUrl || currentFrame.photoUrl;
                      if (videoSource) {
                        setVideoToPlay({ url: videoSource, title: currentFrame.title, rotation: currentFrame.rotation || 0, frameId: currentFrame.id });
                      }
                    } else {
                      toast.info(language === "fr" ? "Sélectionnez une vidéo pour la lire" : "Select a video to play");
                    }
                    setContextMenu(null);
                  }}
                >
                  <Play className="w-4 h-4" />
                  Lire la vidéo
                </button>

                <div className="h-px bg-gray-100 my-1" />
                
                {/* Modifier / Détails */}
                <button 
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${hasPhoto ? 'hover:bg-blue-50 hover:text-blue-600' : 'text-gray-300 cursor-not-allowed'}`}
                  onClick={() => {
                    if (hasPhoto && contextMenu.frameId) {
                      handleEdit(contextMenu.frameId);
                    } else {
                      toast.info(language === "fr" ? "Sélectionnez un élément pour le modifier" : "Select an item to edit");
                    }
                    setContextMenu(null);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  Modifier / Détails
                </button>
                
                {/* Voir la photo/document */}
                <button 
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${hasPhoto ? 'hover:bg-blue-50 hover:text-blue-600' : 'text-gray-300 cursor-not-allowed'}`}
                  onClick={() => {
                    if (hasPhoto && contextMenu.frameId) {
                      handleDoubleClick(contextMenu.frameId);
                    } else {
                      toast.info(language === "fr" ? "Sélectionnez un élément pour le voir" : "Select an item to view");
                    }
                    setContextMenu(null);
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Voir {isPhoto ? "la photo" : "le document"}
                </button>


                {/* Option Envoyer vers le Collecteur */}
                {isPhoto && (() => {
                  const clickedFrame = contextMenu.frameId ? frames.find(f => f.id === contextMenu.frameId) : null;
                  const canSend = !!clickedFrame?.photoUrl;
                  return (
                    <button
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${canSend ? 'hover:bg-purple-50 hover:text-purple-600' : 'text-gray-300 cursor-not-allowed'}`}
                      onClick={async () => {
                        if (canSend && clickedFrame) {
                          const projects = await getAllCreationsProjects();
                          setCollecteurProjects(projects);
                          setCollecteurSelectedProjectId(projects.length > 0 ? (projects[0].id ?? '') : '');
                          setCollecteurNewProjectName('');
                          setCollecteurMode(projects.length > 0 ? 'existing' : 'new');
                          setCollecteurModal({
                            photoUrl: clickedFrame.photoUrl!,
                            name: clickedFrame.title || 'Photo',
                            thumbnail: clickedFrame.photoUrl!,
                          });
                        }
                        setContextMenu(null);
                      }}
                    >
                      <ImageIcon className="w-4 h-4" />
                      {language === 'fr' ? 'Envoyer vers le Collecteur' : 'Send to Collector'}
                    </button>
                  );
                })()}

                {/* Option Déplacer vers - Visible uniquement en mode Admin */}
                {isAuthenticated && (() => {
                  const selectedPhotosForMove = frames.filter(f => f.isSelected && f.photoUrl);
                  const hasSelectedForMove = selectedPhotosForMove.length > 0;
                  // CORRECTION: Le compteur n'affiche que les photos sélectionnées
                  // Si aucune photo n'est sélectionnée, pas de compteur (on déplace juste la photo cliquée)
                  const totalToMove = hasSelectedForMove ? selectedPhotosForMove.length : 0;
                  const canMove = hasPhoto || hasSelectedForMove;
                  
                  return (
                    <button 
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${canMove ? 'hover:bg-purple-50 hover:text-purple-600' : 'text-gray-300 cursor-not-allowed'}`}
                      onClick={() => {
                        if (canMove) {
                          // La fonction handleOpenMoveToAlbum gère maintenant le déplacement multiple
                          // Elle prend le frameId clicqué + toutes les photos sélectionnées
                          handleOpenMoveToAlbum(hasPhoto && contextMenu.frameId ? contextMenu.frameId : undefined);
                        } else {
                          toast.info(language === "fr" ? "Sélectionnez un élément à déplacer" : "Select an item to move");
                        }
                        setContextMenu(null);
                      }}
                    >
                      <FolderInput className="w-4 h-4" />
                      Déplacer vers...
                    </button>
                  );
                })()}
                
                {/* Supprimer cette photo/document */}
                <button 
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${hasPhoto ? 'hover:bg-red-50 hover:text-red-600' : 'text-gray-300 cursor-not-allowed'}`}
                  onClick={() => {
                    if (hasPhoto && contextMenu.frameId) {
                      if (window.confirm(language === 'fr' ? "Attention : La suppression de cet élément est irréversible.\n\nVoulez-vous continuer ?" : "Warning: Deleting this item is irreversible.\n\nDo you want to continue?")) {
                        saveToHistory(frames);
                        setFrames(frames.map(f => f.id === contextMenu.frameId ? { ...f, photoUrl: null, title: `${defaultTitle} ${f.id}`, format: isPhoto ? "JPG" : "PDF", date: "", location: "", comments: "" } : f));
                        toast.success(language === "fr" ? "Supprimé" : "Deleted");
                      }
                    } else {
                      toast.info(language === "fr" ? "Sélectionnez un élément à supprimer" : "Select an item to delete");
                    }
                    setContextMenu(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {language === "fr" ? (isPhoto ? "Supprimer cette photo" : "Supprimer ce document") : (isPhoto ? "Delete this photo" : "Delete this document")}
                </button>
                
                {/* Vider le cadre (retirer la photo sans supprimer le cadre) */}
                <button 
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${hasPhoto ? 'hover:bg-orange-50 hover:text-orange-600' : 'text-gray-300 cursor-not-allowed'}`}
                  onClick={() => {
                    if (hasPhoto && contextMenu.frameId) {
                      setFrameToEmpty(contextMenu.frameId);
                      setShowEmptyFrameConfirmModal(true);
                    } else {
                      toast.info(language === "fr" ? "Sélectionnez un cadre contenant un élément" : "Select a frame containing an item");
                    }
                    setContextMenu(null);
                  }}
                >
                  <Square className="w-4 h-4" />
                  Vider le cadre
                </button>
                
                {/* Rétablir le dernier cadre vidé */}
                {lastEmptiedFrame && (
                  <button 
                    className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 hover:text-green-600 flex items-center gap-2"
                    onClick={() => {
                      setFrames(frames.map(f => f.id === lastEmptiedFrame.frameId ? lastEmptiedFrame.data : f));
                      toast.success(language === "fr" ? "Cadre rétabli" : "Frame restored");
                      setLastEmptiedFrame(null);
                      setContextMenu(null);
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rétablir le dernier cadre vidé
                  </button>
                )}
                
                {/* Supprimer toutes les photos/documents */}
                <button 
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                  onClick={() => {
                    const photosCount = frames.filter(f => f.photoUrl).length;
                    if (photosCount === 0) {
                      toast.info(language === "fr" ? "Aucun élément à supprimer" : "No item to delete");
                      setContextMenu(null);
                      return;
                    }
                    if (window.confirm(language === 'fr' ? `Attention : La suppression de ${isPhoto ? "toutes les photos" : "tous les documents"} de cet album est irréversible.\n\n${photosCount} élément${photosCount > 1 ? "s seront supprimés" : " sera supprimé"}.\n\nVoulez-vous continuer ?` : `Warning: Deleting ${isPhoto ? "all photos" : "all documents"} from this album is irreversible.\n\n${photosCount} item${photosCount > 1 ? "s will be deleted" : " will be deleted"}.\n\nDo you want to continue?`)) {
                      saveToHistory(frames);
                      setFrames(frames.map(f => ({ ...f, photoUrl: null, title: `${defaultTitle} ${f.id}`, format: isPhoto ? "JPG" : "PDF", date: "", location: "", comments: "" })));
                      toast.success(language === "fr" ? `${photosCount} élément${photosCount > 1 ? "s" : ""} supprimé${photosCount > 1 ? "s" : ""}` : `${photosCount} item${photosCount > 1 ? "s" : ""} deleted`);
                    }
                    setContextMenu(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {language === "fr" ? (isPhoto ? "Supprimer toutes les photos" : "Supprimer tous les documents") : (isPhoto ? "Delete all photos" : "Delete all documents")}
                </button>

                {/* Option Diaporama */}
                {isPhoto && diaporamaPhotos.length > 0 && currentAlbumCategory?.mediaType !== 'videos' && (
                  <>
                    <div className="h-px bg-gray-100 my-1" />
                    <button 
                      className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                      onClick={() => {
                        if (contextMenu?.frameId) {
                          const clickedFrame = frames.find(f => f.id === contextMenu.frameId);
                          if (clickedFrame?.photoUrl) {
                            const startIdx = diaporamaPhotos.findIndex(p => p.url === clickedFrame.photoUrl);
                            setDiaporamaStartIndex(startIdx >= 0 ? startIdx : 0);
                          }
                        } else {
                          setDiaporamaStartIndex(0);
                        }
                        setShowDiaporama(true);
                        setContextMenu(null);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <rect x="2" y="6" width="20" height="12" rx="2"/>
                        <polygon points="10 9 15 12 10 15 10 9"/>
                      </svg>
                      Diaporama
                    </button>
                  </>
                )}

                {/* Option Envoyer - actif si photo cliquée OU photos sélectionnées */}
                {(() => {
                  const selectedPhotos = frames.filter(f => f.isSelected && f.photoUrl);
                  const hasSelectedPhotos = selectedPhotos.length > 0;
                  const canSendMail = hasPhoto || hasSelectedPhotos;
                  
                  return (
                    <>
                      <div className="h-px bg-gray-100 my-1" />
                      <button 
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${canSendMail ? 'hover:bg-blue-50 hover:text-blue-600' : 'text-gray-300 cursor-not-allowed'}`}
                        onClick={() => {
                          if (canSendMail) {
                            // Si on clique sur une photo non sélectionnée, la sélectionner
                            if (hasPhoto && contextMenu?.frameId) {
                              const clickedFrame = frames.find(f => f.id === contextMenu.frameId);
                              if (clickedFrame && !clickedFrame.isSelected) {
                                setFrames(frames.map(f => f.id === contextMenu.frameId ? { ...f, isSelected: true } : f));
                              }
                            }
                            setShowSendModal(true);
                          } else {
                            toast.info(language === "fr" ? "Sélectionnez un élément à envoyer" : "Select an item to send");
                          }
                          setContextMenu(null);
                        }}
                      >
                        <Send className="w-4 h-4" />
                        Envoyer
                      </button>
                    </>
                  );
                })()}

                {/* Option Imprimer - actif si photo cliquée OU photos sélectionnées */}
                {(() => {
                  const selectedPhotos = frames.filter(f => f.isSelected && f.photoUrl);
                  const hasSelectedPhotos = selectedPhotos.length > 0;
                  const canPrint = hasPhoto || hasSelectedPhotos;
                  
                  return (
                    <button 
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${canPrint ? 'hover:bg-blue-50 hover:text-blue-600' : 'text-gray-300 cursor-not-allowed'}`}
                      onClick={() => {
                        if (canPrint) {
                          // Collecter les photos à imprimer
                          let photosToprint: typeof frames = [];
                          
                          // Si on clique sur une photo spécifique
                          if (hasPhoto && contextMenu?.frameId) {
                            const clickedFrame = frames.find(f => f.id === contextMenu.frameId);
                            if (clickedFrame) {
                              // Si la photo cliquée n'est pas sélectionnée, imprimer seulement celle-ci
                              if (!clickedFrame.isSelected) {
                                photosToprint = [clickedFrame];
                              } else {
                                // Sinon imprimer toutes les sélectionnées
                                photosToprint = selectedPhotos;
                              }
                            }
                          } else {
                            // Clic en dehors d'une photo, imprimer les sélectionnées
                            photosToprint = selectedPhotos;
                          }
                          
                          if (photosToprint.length > 0) {
                            handlePrintSelected(photosToprint);
                          }
                        } else {
                          toast.info(language === "fr" ? "Sélectionnez un élément à imprimer" : "Select an item to print");
                        }
                        setContextMenu(null);
                      }}
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer
                    </button>
                  );
                })()}
              </>
            );
          })()}

          <div className="h-px bg-gray-100 my-1" />
          
          {/* Options Sélectionner tout / Désélectionner tout */}
          {(() => {
            const framesWithPhotos = frames.filter(f => f.photoUrl);
            const selectedFrames = frames.filter(f => f.isSelected && f.photoUrl);
            const allSelected = framesWithPhotos.length > 0 && selectedFrames.length === framesWithPhotos.length;
            const hasSelection = selectedFrames.length > 0;
            
            return (
              <>
                {!allSelected && framesWithPhotos.length > 0 && (
                  <button 
                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                    onClick={() => {
                      setFrames(frames.map(f => f.photoUrl ? { ...f, isSelected: true } : f));
                      toast.success(language === 'fr' ? `${framesWithPhotos.length} élément(s) sélectionné(s)` : `${framesWithPhotos.length} item(s) selected`);
                      setContextMenu(null);
                    }}
                  >
                    <CheckSquare className="w-4 h-4" />
                    Sélectionner tout ({framesWithPhotos.length})
                  </button>
                )}
                {hasSelection && (
                  <button 
                    className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2"
                    onClick={() => {
                      setFrames(frames.map(f => ({ ...f, isSelected: false })));
                      toast.info(language === "fr" ? "Sélection annulée" : "Selection cancelled");
                      setContextMenu(null);
                    }}
                  >
                    <Square className="w-4 h-4" />
                    Désélectionner tout ({selectedFrames.length})
                  </button>
                )}
              </>
            );
          })()}
          
          <div className="h-px bg-gray-100 my-1" />
          <button 
            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
            onClick={() => {
              setSelectedFrameForManagement(contextMenu?.frameId || null);
              setShowFrameManagementModal(true);
              setContextMenu(null);
            }}
          >
            <div className="w-4 h-4 flex items-center justify-center border border-current rounded-sm text-[10px] font-bold">G</div>
            Gestion des cadres
          </button>
        </div>
      )}



      {/* MODALE GESTION CADRES */}
      <Dialog open={showFrameManagementModal} onOpenChange={setShowFrameManagementModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gestion des cadres</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="frames-count" className="text-right">Nombre de cadres :</Label>
              <Input
                id="frames-count"
                type="number"
                min="1"
                value={framesToAdd}
                onChange={(e) => setFramesToAdd(parseInt(e.target.value) || 1)}
                className="col-span-3"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleAddFrames('before')}>{language === 'fr' ? 'Ajouter AVANT' : 'Add BEFORE'}</Button>
              <Button onClick={() => handleAddFrames('after')}>{language === "fr" ? "Ajouter APRÈS" : "Add AFTER"}</Button>
              <div className="h-px bg-gray-200 my-2" />
              <Button variant="destructive" onClick={handleDeleteEmptyFrames}>{language === "fr" ? "Supprimer tous les cadres vides" : "Delete all empty frames"}</Button>
              <Button variant="destructive" onClick={handleDeleteSelectedFrame}>{language === 'fr' ? 'Supprimer ce cadre' : 'Delete this frame'}</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFrameManagementModal(false)}>{language === 'fr' ? 'Fermer' : 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE CONFIRMATION SUPPRESSION CADRE */}
      <AlertDialog open={showDeleteFrameConfirmModal} onOpenChange={setShowDeleteFrameConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>Ce cadre contient {isPhoto ? "une photo" : "un document"}.</p>
                <p className="text-red-600 font-semibold">
                  ⚠️ Attention : La suppression du cadre entraînera également la suppression de son contenu.
                </p>
                <p>{language === 'fr' ? 'Voulez-vous vraiment supprimer ce cadre ?' : 'Are you sure you want to delete this frame?'}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteFrameConfirmModal(false)}>{language === 'fr' ? 'Annuler' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDeleteSelectedFrame}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODALE CONFIRMATION VIDER CADRE */}
      <AlertDialog open={showEmptyFrameConfirmModal} onOpenChange={setShowEmptyFrameConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === "fr" ? "Vider le cadre" : "Empty frame"}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>{language === 'fr' ? 'Voulez-vous vraiment vider ce cadre ?' : 'Are you sure you want to clear this frame?'}</p>
                <p className="text-orange-600">
                  Le contenu ({isPhoto ? "photo" : "document"}) sera retiré mais le cadre restera en place.
                </p>
                <p className="text-sm text-gray-500">
                  Vous pourrez rétablir le contenu via le menu contextuel si vous changez d'avis.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowEmptyFrameConfirmModal(false);
              setFrameToEmpty(null);
            }}>{language === 'fr' ? 'Annuler' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (frameToEmpty) {
                  const frameData = frames.find(f => f.id === frameToEmpty);
                  if (frameData) {
                    // Sauvegarder dans l'historique pour Ctrl+Z
                    saveToHistory(frames);
                    // Sauvegarder pour pouvoir rétablir
                    setLastEmptiedFrame({ frameId: frameToEmpty, data: { ...frameData } });
                    // Vider le cadre
                    setFrames(frames.map(f => f.id === frameToEmpty ? { 
                      ...f, 
                      photoUrl: null, 
                      imageData: undefined,
                      videoUrl: undefined,
                      thumbnailUrl: undefined,
                      title: `${defaultTitle} ${f.id}`, 
                      format: isPhoto ? "JPG" : "PDF", 
                      date: "", 
                      location: "", 
                      comments: "",
                      mediaType: undefined,
                      videoDuration: undefined
                    } : f));
                    toast.success(language === "fr" ? "Cadre vidé - Vous pouvez rétablir via le menu contextuel" : "Frame emptied - You can restore via context menu");
                  }
                }
                setShowEmptyFrameConfirmModal(false);
                setFrameToEmpty(null);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Vider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODALE DÉTAILS */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle>Détails {isPhoto ? "de la photo" : "du document"}</DialogTitle>
          </DialogHeader>
          
          {selectedFrameForDetails && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input 
                    value={selectedFrameForDetails.title} 
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setSelectedFrameForDetails({...selectedFrameForDetails, title: newTitle});
                      setFrames(frames.map(f => f.id === selectedFrameForDetails.id ? { ...f, title: newTitle } : f));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Input value={selectedFrameForDetails.format || (isPhoto ? "JPG" : "PDF")} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    value={selectedFrameForDetails.date || ""} 
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setSelectedFrameForDetails({...selectedFrameForDetails, date: newDate});
                      setFrames(frames.map(f => f.id === selectedFrameForDetails.id ? { ...f, date: newDate } : f));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lieu / Origine</Label>
                  <Input 
                    value={selectedFrameForDetails.location || ""} 
                    onChange={(e) => {
                      const newLoc = e.target.value;
                      setSelectedFrameForDetails({...selectedFrameForDetails, location: newLoc});
                      setFrames(frames.map(f => f.id === selectedFrameForDetails.id ? { ...f, location: newLoc } : f));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Commentaires / Notes</Label>
                <Textarea 
                  className="min-h-[150px]" 
                  value={selectedFrameForDetails.comments || ""} 
                  onChange={(e) => {
                    const newComments = e.target.value;
                    setSelectedFrameForDetails({...selectedFrameForDetails, comments: newComments});
                    setFrames(frames.map(f => f.id === selectedFrameForDetails.id ? { ...f, comments: newComments } : f));
                  }}
                />
              </div>

              <DialogFooter>
                <Button onClick={() => setShowDetailsModal(false)}>{language === 'fr' ? 'Fermer' : 'Close'}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODALE INFO EXPORT */}
      <Dialog open={showExportInfoModal} onOpenChange={setShowExportInfoModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              Information importante
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>{language === "fr" ? "✅ Première étape :" : "✅ First step:"}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {language === "fr" ? <>Votre navigateur va vous demander d'<strong>autoriser le téléchargement</strong>. Cliquez sur <strong>"Autoriser"</strong> pour continuer.</> : <>Your browser will ask you to <strong>allow download</strong>. Click <strong>"Allow"</strong> to continue.</>}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {language === "fr" ? "Cette autorisation n'est demandée qu'une seule fois. Les exports suivants seront automatiques." : "This permission is only asked once. Future exports will be automatic."}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                <strong>{language === "fr" ? "Où vont vos fichiers ?" : "Where do your files go?"}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-3">
                {language === "fr" ? <>Vos photos seront exportées dans le dossier <strong>"Téléchargements"</strong> de votre ordinateur.</> : <>Your photos will be exported to the <strong>"Downloads"</strong> folder on your computer.</>}
              </p>
              <p className="text-sm text-gray-600">
                {language === "fr" ? "De là, vous pourrez les glisser vers un email, un disque externe, ou tout autre emplacement de votre choix." : "From there, you can drag them to an email, external drive, or any other location of your choice."}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>{language === "fr" ? "💡 Astuce :" : "💡 Tip:"}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {language === "fr" ? <>Pour que vos fichiers arrivent directement sur le <strong>Bureau</strong>, vous pouvez modifier les paramètres de votre navigateur :</> : <>To have your files go directly to the <strong>Desktop</strong>, you can change your browser settings:</>}
              </p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1 list-disc list-inside">
                <li><strong>Safari</strong>{language === "fr" ? ": Préférences → Général → Emplacement de téléchargement → Bureau" : ": Preferences → General → Download location → Desktop"}</li>
                <li><strong>Chrome</strong>{language === "fr" ? ": Paramètres → Téléchargements → Modifier → Bureau" : ": Settings → Downloads → Change → Desktop"}</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <input 
                type="checkbox" 
                id="dontShowAgain" 
                className="rounded border-gray-300"
                defaultChecked
              />
              <label htmlFor="dontShowAgain">Ne plus afficher ce message</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportInfoModal(false)}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Button>
            <Button onClick={handleExportWithInfo} className="bg-blue-600 hover:bg-blue-700">
              J'ai compris, exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE CONVERSION */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{language === "fr" ? "Convertir les éléments" : "Convert items"}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Vous avez sélectionné {frames.filter(f => f.isSelected && f.photoUrl).length} élément(s).
              Choisissez le format de destination :
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-all flex flex-col items-center gap-2 text-center ${convertMode === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                onClick={() => setConvertMode('pdf')}
              >
                <FileText className={`w-8 h-8 ${convertMode === 'pdf' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-medium">Format PDF</span>
                <span className="text-xs text-gray-500">{language === 'fr' ? 'Fusionner en un seul document' : 'Merge into one document'}</span>
              </div>

              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-all flex flex-col items-center gap-2 text-center ${convertMode === 'images' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                onClick={() => setConvertMode('images')}
              >
                <ImageIcon className={`w-8 h-8 ${convertMode === 'images' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-medium">Format Images (ZIP)</span>
                <span className="text-xs text-gray-500">{language === "fr" ? "Extraire en fichiers séparés" : "Extract as separate files"}</span>
              </div>
            </div>

            {convertMode === 'images' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="mb-2 block text-sm font-medium text-gray-700">Format de sortie :</Label>
                <div className="flex gap-2 flex-wrap">
                  {['jpg', 'png', 'bmp', 'svg'].map((fmt) => (
                    <div 
                      key={fmt}
                      onClick={() => setImageFormat(fmt as any)}
                      className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer border transition-colors ${
                        imageFormat === fmt 
                          ? 'bg-blue-100 border-blue-500 text-blue-700' 
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </div>
                  ))}
                </div>
                {imageFormat === 'svg' && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Note : Le format SVG encapsulera l'image originale.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConvertModal(false)}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Button>
            <Button onClick={handleConvert}>
              {convertMode === 'pdf' ? 'Convertir en PDF' : `Convertir en ${imageFormat.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CHOIX IMPORT */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">{language === 'fr' ? 'Importer des fichiers depuis...' : 'Import files from...'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            {/* Option 1 : Caméra (webcam) */}
            <Button 
              variant="outline" 
              className="h-36 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all"
              onClick={() => {
                setShowImportModal(false);
                setShowCameraModal(true);
              }}
            >
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                <Camera className="w-7 h-7 text-purple-600" />
              </div>
              <span className="font-medium text-sm text-center">{language === "fr" ? "Caméra" : "Camera"}</span>
              <span className="text-xs text-gray-500 text-center">Prendre une photo</span>
            </Button>

            {/* Option 2 : Gestionnaire de fichiers */}
            <Button 
              variant="outline" 
              className="h-36 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
              onClick={() => {
                setShowImportModal(false);
                document.getElementById('universal-file-input')?.click();
              }}
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <FolderOpen className="w-7 h-7 text-blue-600" />
              </div>
              <span className="font-medium text-sm text-center">Gestionnaire</span>
              <span className="text-xs text-gray-500 text-center">de fichiers</span>
              <span className="text-xs text-gray-400 text-center">Windows / Linux</span>
            </Button>

            {/* Option 3 : Finder */}
            <Button 
              variant="outline" 
              className="h-36 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all"
              onClick={() => {
                setShowImportModal(false);
                document.getElementById('universal-file-input')?.click();
              }}
            >
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <circle cx="15.5" cy="8.5" r="1.5"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                </svg>
              </div>
              <span className="font-medium text-sm text-center">Finder</span>
              <span className="text-xs text-gray-500 text-center">macOS</span>
            </Button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Accédez à vos fichiers depuis l'appareil photo, la carte SD ou le gestionnaire de fichiers.
          </p>
        </DialogContent>
      </Dialog>

      {/* MODAL CAMERA */}
      <Dialog open={showCameraModal} onOpenChange={setShowCameraModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Prendre une photo</DialogTitle>
          </DialogHeader>
              <div className="flex flex-col items-center gap-4">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setShowCameraModal(false)}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Button>
              <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Camera className="w-4 h-4" />
                Capturer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODALE SUCCÈS */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl">{language === "fr" ? "Message envoyé !" : "Message sent!"}</DialogTitle>
            <p className="text-gray-500">
              Votre message a été envoyé avec succès à <span className="font-medium text-gray-900">{emailData.to}</span>.
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowSuccessModal(false)} className="min-w-[120px]">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIAPORAMA PLEIN ÉCRAN */}
      {showDiaporama && diaporamaPhotos.length > 0 && (
        <Diaporama
          photos={diaporamaPhotos}
          startIndex={diaporamaStartIndex}
          onClose={() => {
            setShowDiaporama(false);
            setDiaporamaSelectedOnly(false); // Réinitialiser après fermeture
          }}
        />
      )}



      {/* LECTURE CONTINUE VIDÉOS */}
      {showVideoPlaylist && (
        <VideoPlaylistModal
          isOpen={showVideoPlaylist}
          onClose={() => {
            setShowVideoPlaylist(false);
            setDiaporamaSelectedOnly(false); // Réinitialiser après fermeture
          }}
          videos={frames.filter(f => {
            if (!f.isVideo || !f.imageData) return false;
            if (diaporamaSelectedOnly) return f.isSelected;
            return true;
          })}
          startIndex={videoPlaylistStartIndex}
          albumName={albumName}
        />
      )}

      {/* MODALE CHOIX RETOUCHE (IA / Manuel / Avancé) */}
      <PhotoRetouchModal
        isOpen={showRetouchModal}
        onClose={() => {
          setShowRetouchModal(false);
        }}
        imageSrc={retouchImageSrc}
        onSave={handleRetouchModalSave}
        onOpenAdvanced={handleOpenAdvancedRetouch}
      />

      {/* PAGE RETOUCHE PHOTO AVANCEE (12 fonctions) */}
      {showRetouchPage && retouchImageSrc && (
        <RetouchePhoto
          imageUrl={retouchImageSrc}
          imageTitle={retouchImageTitle}
          imageComments={retouchImageComments}
          albumId={currentAlbumId || ''}
          frameId={retouchFrameId || 0}
          onSaveAsCopy={handleRetouchSaveAsCopy}
          onClose={handleRetouchClose}
        />
      )}




      {/* MODALE ENVOI PAR EMAIL */}
      <SendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        photos={frames
          .filter(f => f.isSelected && f.photoUrl)
          .map((f, i) => ({
            filename: f.title || `photo-${i + 1}.jpg`,
            dataUrl: f.photoUrl!,
          }))}
      />

      {/* MODALE SUPPRESSION ALBUM */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">{language === "fr" ? "Supprimer l'album" : "Delete album"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-gray-700 font-medium">
              Attention : La suppression entraînera la disparition de toutes les {isPhoto ? 'photos' : 'documents'} contenu{isPhoto ? 'e' : ''}s dans cet album.
            </p>
            <p className="text-gray-600">
              Cette action est irréversible. Seul l'administrateur peut supprimer un album.
            </p>
            {/* Afficher le champ mot de passe uniquement si l'utilisateur n'est PAS en mode Admin */}
            {!isAuthenticated && (
              <div className="grid gap-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Mot de passe requis"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleDeleteAlbum}>{language === "fr" ? "Supprimer définitivement" : "Delete permanently"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE PRÉVISUALISATION IMPORT */}
      <ImportPreviewModal
        isOpen={showImportPreview}
        onClose={() => {
          setShowImportPreview(false);
          setPreviewFiles([]);
        }}
        files={previewFiles}
        onImport={handleImportFromPreview}
        isPhoto={isPhoto}
      />

      {/* MODALE CONTRÔLE PARENTAL UNIFIÉE */}
      <ParentalControlModal
        isOpen={showParentalControl}
        onClose={() => setShowParentalControl(false)}
        onComplete={handleParentalControlComplete}
        files={pendingFilesForParentalControl}
        controlLevel={parentalControlLevel}
        isPhoto={isPhoto}
      />

      {/* MODALE AVERTISSEMENT VIDÉO / CONTRÔLE PARENTAL */}
      <VideoParentalWarningModal
        isOpen={showVideoParentalWarning}
        onClose={() => {
          setShowVideoParentalWarning(false);
          setPendingVideoFiles([]);
          setVideoWarningCallback(null);
        }}
        onDisableAndContinue={handleVideoParentalWarningContinue}
        onCancel={() => {
          setShowVideoParentalWarning(false);
          setPendingVideoFiles([]);
          setVideoWarningCallback(null);
          toast.info(language === 'fr' ? 'Import annulé' : 'Import cancelled');
        }}
        currentLevel={parentalControlLevel}
      />

      {/* MODALE CONFIRMATION QUITTER */}
      <QuitConfirmModal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        onSaveAndQuit={async () => {
          // Sauvegarder les données de l'album avant de quitter
          if (currentAlbumId) {
            try {
              await db.albums.put({
                id: currentAlbumId,
                frames: frames,
                updatedAt: Date.now()
              });
              toast.success(language === 'fr' ? 'Session sauvegardée' : 'Session saved');
            } catch (error) {
              console.error('Erreur sauvegarde:', error);
              toast.error(language === 'fr' ? 'Erreur lors de la sauvegarde' : 'Error saving');
            }
          }
        }}
      />

      {/* MODALE DÉPLACEMENT VERS UN AUTRE ALBUM (Admin uniquement) */}
      <Dialog open={showMoveToAlbumModal} onOpenChange={(open) => {
        if (!open) {
          setShowMoveToAlbumModal(false);
          setFramesToMove([]);
          setAvailableAlbums([]);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <FolderInput className="w-5 h-5" />
              Déplacer vers un autre album
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {framesToMove.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Déplacer {framesToMove.length} élément{framesToMove.length > 1 ? 's' : ''} :</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {framesToMove.slice(0, 5).map(f => (
                    <span key={f.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{f.title}</span>
                  ))}
                  {framesToMove.length > 5 && (
                    <span className="text-xs text-gray-500">+{framesToMove.length - 5} autres</span>
                  )}
                </div>
              </div>
            )}
            
            {availableAlbums.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{language === 'fr' ? 'Aucun autre album disponible' : 'No other album available'}</p>
                <p className="text-sm">Créez d'abord un autre album dans {isPhoto ? 'PhotoClass' : 'Documents'}</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                <p className="text-sm text-gray-600">{language === "fr" ? "Sélectionnez l'album de destination :" : "Select destination album:"}</p>
                
                {/* Albums PhotoClass */}
                {availableAlbums.filter(a => a.series === 'photoclass').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Albums Photos
                    </h4>
                    <div className="space-y-2 pl-2">
                      {availableAlbums.filter(a => a.series === 'photoclass').map((album) => (
                        <button
                          key={album.id}
                          onClick={() => handleMoveToAlbum(album.id)}
                          className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            {album.type === 'secure' ? (
                              <Lock className="w-5 h-5 text-amber-500" />
                            ) : (
                              <FolderOpen className="w-5 h-5 text-blue-500" />
                            )}
                            <div>
                              <p className="font-medium group-hover:text-purple-600">{translateAlbumTitle(album.title)}</p>
                              <p className="text-xs text-gray-500">
                                {album.type === 'secure' ? (language === 'fr' ? 'Sécurisé' : 'Secure') : 'Album'}
                                {album.hasEmptyFrame ? (language === 'fr' ? ' • Cadre dispo' : ' • Frame available') : (language === 'fr' ? ' • Nouveau cadre' : ' • New frame')}
                              </p>
                            </div>
                          </div>
                          <FolderInput className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Albums Documents */}
                {availableAlbums.filter(a => a.series === 'classpapiers').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documents
                    </h4>
                    <div className="space-y-2 pl-2">
                      {availableAlbums.filter(a => a.series === 'classpapiers').map((album) => (
                        <button
                          key={album.id}
                          onClick={() => handleMoveToAlbum(album.id)}
                          className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            {album.type === 'secure' ? (
                              <Lock className="w-5 h-5 text-amber-500" />
                            ) : (
                              <FolderOpen className="w-5 h-5 text-emerald-500" />
                            )}
                            <div>
                              <p className="font-medium group-hover:text-purple-600">{translateAlbumTitle(album.title)}</p>
                              <p className="text-xs text-gray-500">
                                {album.type === 'secure' ? (language === 'fr' ? 'Sécurisé' : 'Secure') : 'Album'}
                                {album.hasEmptyFrame ? (language === 'fr' ? ' • Cadre dispo' : ' • Frame available') : (language === 'fr' ? ' • Nouveau cadre' : ' • New frame')}
                              </p>
                            </div>
                          </div>
                          <FolderInput className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowMoveToAlbumModal(false);
              setFramesToMove([]);
              setAvailableAlbums([]);
            }}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE CONFIRMATION DOUBLONS */}
      <AlertDialog open={showDuplicateConfirmModal} onOpenChange={setShowDuplicateConfirmModal}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{language === "fr" ? "🔍 Photo en doublon détectée" : "🔍 Duplicate photo detected"}</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicatesToHandle.length > 0 && currentDuplicateIndex < duplicatesToHandle.length && (
                <div className="space-y-4">
                  <p className="text-base">
                    La photo <strong>{duplicatesToHandle[currentDuplicateIndex].newItem.title}</strong> existe déjà dans cet album.
                  </p>
                  
                  {/* Affichage côte à côte */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700">Photo existante</p>
                      <img 
                        src={duplicatesToHandle[currentDuplicateIndex].existingFrame.photoUrl} 
                        alt="Existante"
                        className="w-full h-48 object-contain border-2 border-gray-300 rounded"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-blue-700">Nouvelle photo</p>
                      <img 
                        src={duplicatesToHandle[currentDuplicateIndex].newItem.photoUrl} 
                        alt="Nouvelle"
                        className="w-full h-48 object-contain border-2 border-blue-500 rounded"
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Doublon {currentDuplicateIndex + 1} sur {duplicatesToHandle.length}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              // Annuler tout
              setShowDuplicateConfirmModal(false);
              setDuplicatesToHandle([]);
              setNonDuplicatesToAdd([]);
              setCurrentDuplicateIndex(0);
              setDuplicateDecisions({});
              toast.info(language === "fr" ? "Import annulé" : "Import cancelled");
            }}>{language === 'fr' ? 'Annuler tout' : 'Cancel all'}</AlertDialogCancel>
            
            <Button 
              variant="outline"
              onClick={() => {
                // Ignorer ce doublon
                const newDecisions = { ...duplicateDecisions, [currentDuplicateIndex]: 'skip' as const };
                setDuplicateDecisions(newDecisions);
                
                if (currentDuplicateIndex < duplicatesToHandle.length - 1) {
                  // Passer au doublon suivant
                  setCurrentDuplicateIndex(currentDuplicateIndex + 1);
                } else {
                  // Terminer le traitement
                  finalizeDuplicateHandling(newDecisions);
                }
              }}
            >
              Ignorer
            </Button>
            
            <Button 
              onClick={() => {
                // Remplacer ce doublon
                const newDecisions = { ...duplicateDecisions, [currentDuplicateIndex]: 'replace' as const };
                setDuplicateDecisions(newDecisions);
                
                if (currentDuplicateIndex < duplicatesToHandle.length - 1) {
                  // Passer au doublon suivant
                  setCurrentDuplicateIndex(currentDuplicateIndex + 1);
                } else {
                  // Terminer le traitement
                  finalizeDuplicateHandling(newDecisions);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Remplacer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modale choix de projet pour le Collecteur */}
      <Dialog open={!!collecteurModal} onOpenChange={(open) => { if (!open) setCollecteurModal(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'À quel projet voulez-vous relier cette image ?' : 'Which project should this image be linked to?'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Choix : Projet existant */}
            {collecteurProjects.length > 0 && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="collecteur-mode"
                  checked={collecteurMode === 'existing'}
                  onChange={() => setCollecteurMode('existing')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    {language === 'fr' ? 'Projet existant' : 'Existing project'}
                  </span>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={collecteurSelectedProjectId}
                    onChange={(e) => {
                      setCollecteurSelectedProjectId(e.target.value);
                      setCollecteurMode('existing');
                    }}
                    disabled={collecteurMode !== 'existing'}
                  >
                    {collecteurProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {new Date(p.updatedAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            )}

            {/* Indication pour créer un nouveau projet */}
            <p className="text-xs text-gray-500 italic">
              {language === 'fr'
                ? 'Pour créer un nouveau projet, allez dans Albums \u2192 Créer catégorie/album'
                : 'To create a new project, go to Albums \u2192 Create category/album'}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCollecteurModal(null)}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!collecteurSelectedProjectId}
              onClick={async () => {
                if (!collecteurModal) return;
                const projectId = collecteurSelectedProjectId;

                console.log("[COLLECTEUR] envoi projectId:", projectId, "image:", collecteurModal.photoUrl);
                await addToCollecteur({
                  photoUrl: collecteurModal.photoUrl,
                  name: collecteurModal.name,
                  thumbnail: collecteurModal.thumbnail,
                  albumId: currentAlbumId || 'unknown',
                  albumName: albumName || 'Album',
                  projectId,
                });

                const projectName = collecteurProjects.find(p => p.id === projectId)?.name || '';

                toast.success(
                  language === 'fr'
                    ? `Image ajoutée au Collecteur (${projectName})`
                    : `Image added to Collector (${projectName})`
                );
                setCollecteurModal(null);
              }}
            >
              {language === 'fr' ? 'Valider' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
