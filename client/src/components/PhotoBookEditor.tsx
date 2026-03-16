import { useState, useReducer, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { 
  Book, Plus, Trash2, Copy, Lock, Unlock, 
  ChevronLeft, ChevronRight, Download, Settings, 
  Image, Frame, Save, RotateCcw, RotateCw,
  Square, Circle, RectangleHorizontal, X, 
  ZoomIn, ZoomOut, Maximize, FileImage, Type,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

import { PhotoFrame as PhotoFrameType } from '@/types/photo';
import {
  BookConfig, BookPage, PhotoFrame, DecorativeBorder, TextBox, CurvedText,
  PhotoBookEditorState, PhotoBookAction, BOOK_THEMES, PAGE_DIMENSIONS,
  AVAILABLE_SHAPES, CURVED_TEXT_PATH_OPTIONS, CurvedTextPathType
} from '@/types/photoBook';
import { PREDEFINED_BORDERS, getBorderById, BORDER_CATEGORIES } from '@/lib/photoBookBorders';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================
// ÉDITEUR DE LIVRE PHOTO - ARCHITECTURE SIMPLIFIÉE
// ============================================================
// Logique : Format → Marges → Emplacements photos
// Terminologie : "Emplacement" au lieu de "Cadre"
// ============================================================

interface PhotoBookEditorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotos: PhotoFrameType[];
  albumName: string;
}

// Générateur d'ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Configuration étendue avec marges
interface ExtendedBookConfig extends BookConfig {
  margins: {
    top: number;    // en pourcentage
    bottom: number;
    left: number;
    right: number;
  };
}

// État initial simplifié
const createInitialState = (photos: PhotoFrameType[], albumName: string): PhotoBookEditorState & { config: ExtendedBookConfig } => ({
  config: {
    title: albumName || 'Mon Livre Photo',
    subtitle: '',
    author: '',
    date: new Date().toLocaleDateString('fr-FR'),
    format: 'A4',
    theme: 'classic',
    margins: { top: 5, bottom: 5, left: 5, right: 5 }, // Marges par défaut 5%
  },
  pages: [],
  currentPageIndex: -1,
  selectedFrameId: null,
  selectedTextBoxId: null,
  selectedCurvedTextId: null,
  availablePhotos: photos.filter(p => p.photoUrl && !p.isVideo).map(p => ({
    id: String(p.id),
    url: p.photoUrl || '',
    title: p.title,
    used: false,
  })),
  borders: [...PREDEFINED_BORDERS],
  templates: [],
  isDirty: false,
  mode: 'edit',
});

// Reducer simplifié
function photoBookReducer(
  state: PhotoBookEditorState & { config: ExtendedBookConfig }, 
  action: PhotoBookAction | { type: 'SET_MARGINS'; payload: Partial<ExtendedBookConfig['margins']> }
): PhotoBookEditorState & { config: ExtendedBookConfig } {
  switch (action.type) {
    case 'SET_CONFIG': {
      const newConfig = { ...state.config, ...action.payload };
      // Si le thème change, mettre à jour la couleur de fond de toutes les pages
      let newPages = state.pages;
      if (action.payload.theme && action.payload.theme !== state.config.theme) {
        const newBgColor = BOOK_THEMES[action.payload.theme].background;
        newPages = state.pages.map(page => ({
          ...page,
          backgroundColor: newBgColor,
        }));
      }
      return { ...state, config: newConfig, pages: newPages, isDirty: true };
    }
    
    case 'SET_MARGINS':
      return { 
        ...state, 
        config: { ...state.config, margins: { ...state.config.margins, ...action.payload } }, 
        isDirty: true 
      };
    
    case 'ADD_PAGE': {
      const newPage: BookPage = {
        id: generateId(),
        pageNumber: state.pages.length + 1,
        frames: [],
        backgroundColor: BOOK_THEMES[state.config.theme].background,
        isLocked: false,
      };
      
      const insertIndex = action.payload?.afterIndex !== undefined 
        ? action.payload.afterIndex + 1 
        : state.pages.length;
      
      const newPages = [...state.pages];
      newPages.splice(insertIndex, 0, newPage);
      newPages.forEach((p, i) => p.pageNumber = i + 1);
      
      return { ...state, pages: newPages, currentPageIndex: insertIndex, isDirty: true };
    }
    
    case 'DELETE_PAGE': {
      if (state.pages.length <= 1) {
        toast.error((localStorage.getItem('duoclass_language') || 'fr') === 'fr' ? "Impossible de supprimer la dernière page" : "Cannot delete the last page");
        return state;
      }
      const newPages = state.pages.filter((_, i) => i !== action.payload.pageIndex);
      newPages.forEach((p, i) => p.pageNumber = i + 1);
      
      return {
        ...state,
        pages: newPages,
        currentPageIndex: Math.min(state.currentPageIndex, newPages.length - 1),
        isDirty: true,
      };
    }
    
    case 'DUPLICATE_PAGE': {
      const pageToDuplicate = state.pages[action.payload.pageIndex];
      if (!pageToDuplicate) return state;
      
      const duplicatedPage: BookPage = {
        ...pageToDuplicate,
        id: generateId(),
        pageNumber: pageToDuplicate.pageNumber + 1,
        frames: pageToDuplicate.frames.map(f => ({ ...f, id: generateId() })),
      };
      
      const newPages = [...state.pages];
      newPages.splice(action.payload.pageIndex + 1, 0, duplicatedPage);
      newPages.forEach((p, i) => p.pageNumber = i + 1);
      
      return { ...state, pages: newPages, isDirty: true };
    }
    
    case 'SELECT_PAGE':
      return { ...state, currentPageIndex: action.payload.pageIndex, selectedFrameId: null };
    
    case 'UPDATE_PAGE': {
      const newPages = [...state.pages];
      newPages[action.payload.pageIndex] = {
        ...newPages[action.payload.pageIndex],
        ...action.payload.updates,
      };
      return { ...state, pages: newPages, isDirty: true };
    }
    
    case 'ADD_FRAME': {
      const newPages = [...state.pages];
      newPages[action.payload.pageIndex].frames.push(action.payload.frame);
      return { ...state, pages: newPages, selectedFrameId: action.payload.frame.id, isDirty: true };
    }
    
    case 'UPDATE_FRAME': {
      const newPages = [...state.pages];
      const frameIndex = newPages[action.payload.pageIndex].frames.findIndex(
        f => f.id === action.payload.frameId
      );
      if (frameIndex !== -1) {
        newPages[action.payload.pageIndex].frames[frameIndex] = {
          ...newPages[action.payload.pageIndex].frames[frameIndex],
          ...action.payload.updates,
        };
      }
      return { ...state, pages: newPages, isDirty: true };
    }
    
    case 'DELETE_FRAME': {
      const newPages = [...state.pages];
      newPages[action.payload.pageIndex].frames = newPages[action.payload.pageIndex].frames.filter(
        f => f.id !== action.payload.frameId
      );
      return { 
        ...state, 
        pages: newPages, 
        selectedFrameId: state.selectedFrameId === action.payload.frameId ? null : state.selectedFrameId,
        isDirty: true 
      };
    }
    
    case 'SELECT_FRAME':
      return { ...state, selectedFrameId: action.payload.frameId };
    
    case 'PLACE_PHOTO': {
      const newPages = [...state.pages];
      const frameIndex = newPages[action.payload.pageIndex].frames.findIndex(
        f => f.id === action.payload.frameId
      );
      if (frameIndex !== -1) {
        newPages[action.payload.pageIndex].frames[frameIndex] = {
          ...newPages[action.payload.pageIndex].frames[frameIndex],
          photoId: action.payload.photoId,
          photoUrl: action.payload.photoUrl,
          photoTitle: action.payload.photoTitle,
        };
      }
      
      const newAvailablePhotos = state.availablePhotos.map(p => 
        p.id === action.payload.photoId ? { ...p, used: true } : p
      );
      
      return { ...state, pages: newPages, availablePhotos: newAvailablePhotos, isDirty: true };
    }
    
    case 'REMOVE_PHOTO': {
      const newPages = [...state.pages];
      const frame = newPages[action.payload.pageIndex].frames.find(
        f => f.id === action.payload.frameId
      );
      const photoId = frame?.photoId;
      
      const frameIndex = newPages[action.payload.pageIndex].frames.findIndex(
        f => f.id === action.payload.frameId
      );
      if (frameIndex !== -1) {
        newPages[action.payload.pageIndex].frames[frameIndex] = {
          ...newPages[action.payload.pageIndex].frames[frameIndex],
          photoId: undefined,
          photoUrl: undefined,
          photoTitle: undefined,
        };
      }
      
      const newAvailablePhotos = state.availablePhotos.map(p => 
        p.id === photoId ? { ...p, used: false } : p
      );
      
      return { ...state, pages: newPages, availablePhotos: newAvailablePhotos, isDirty: true };
    }
    
    case 'APPLY_BORDER': {
      const newPages = [...state.pages];
      const frameIndex = newPages[action.payload.pageIndex].frames.findIndex(
        f => f.id === action.payload.frameId
      );
      if (frameIndex !== -1) {
        newPages[action.payload.pageIndex].frames[frameIndex].borderId = action.payload.borderId;
      }
      return { ...state, pages: newPages, isDirty: true };
    }
    
    case 'LOCK_PAGE': {
      const newPages = [...state.pages];
      newPages[action.payload.pageIndex].isLocked = true;
      return { ...state, pages: newPages, isDirty: true };
    }
    
    case 'UNLOCK_PAGE': {
      const newPages = [...state.pages];
      newPages[action.payload.pageIndex].isLocked = false;
      return { ...state, pages: newPages, isDirty: true };
    }
    
    // ============ ACTIONS ZONES DE TEXTE ============
    case 'ADD_TEXTBOX': {
      const newPages = [...state.pages];
      if (!newPages[action.payload.pageIndex].textBoxes) {
        newPages[action.payload.pageIndex].textBoxes = [];
      }
      newPages[action.payload.pageIndex].textBoxes!.push(action.payload.textBox);
      return { ...state, pages: newPages, selectedTextBoxId: action.payload.textBox.id, selectedFrameId: null, isDirty: true };
    }
    
    case 'UPDATE_TEXTBOX': {
      const newPages = [...state.pages];
      const textBoxes = newPages[action.payload.pageIndex].textBoxes || [];
      const textBoxIndex = textBoxes.findIndex(t => t.id === action.payload.textBoxId);
      if (textBoxIndex !== -1) {
        textBoxes[textBoxIndex] = { ...textBoxes[textBoxIndex], ...action.payload.updates };
        newPages[action.payload.pageIndex].textBoxes = textBoxes;
      }
      return { ...state, pages: newPages, isDirty: true };
    }
    
    case 'DELETE_TEXTBOX': {
      const newPages = [...state.pages];
      newPages[action.payload.pageIndex].textBoxes = (newPages[action.payload.pageIndex].textBoxes || []).filter(
        t => t.id !== action.payload.textBoxId
      );
      return { 
        ...state, 
        pages: newPages, 
        selectedTextBoxId: state.selectedTextBoxId === action.payload.textBoxId ? null : state.selectedTextBoxId,
        isDirty: true 
      };
    }
    
    case 'SELECT_TEXTBOX':
      return { ...state, selectedTextBoxId: action.payload.textBoxId, selectedFrameId: null, selectedCurvedTextId: null };
    
    // ============ ACTIONS TEXTES COURBÉS ============
    case 'ADD_CURVED_TEXT': {
      const newPages = [...state.pages];
      if (!newPages[action.payload.pageIndex].curvedTexts) {
        newPages[action.payload.pageIndex].curvedTexts = [];
      }
      newPages[action.payload.pageIndex].curvedTexts!.push(action.payload.curvedText);
      return { ...state, pages: newPages, selectedCurvedTextId: action.payload.curvedText.id, selectedFrameId: null, selectedTextBoxId: null, isDirty: true };
    }
    
    case 'UPDATE_CURVED_TEXT': {
      const newPages = [...state.pages];
      const curvedTexts = newPages[action.payload.pageIndex].curvedTexts || [];
      const curvedTextIndex = curvedTexts.findIndex(t => t.id === action.payload.curvedTextId);
      if (curvedTextIndex !== -1) {
        curvedTexts[curvedTextIndex] = { ...curvedTexts[curvedTextIndex], ...action.payload.updates };
        newPages[action.payload.pageIndex].curvedTexts = curvedTexts;
      }
      return { ...state, pages: newPages, isDirty: true };
    }
    
    case 'DELETE_CURVED_TEXT': {
      const newPages = [...state.pages];
      newPages[action.payload.pageIndex].curvedTexts = (newPages[action.payload.pageIndex].curvedTexts || []).filter(
        t => t.id !== action.payload.curvedTextId
      );
      return { 
        ...state, 
        pages: newPages, 
        selectedCurvedTextId: state.selectedCurvedTextId === action.payload.curvedTextId ? null : state.selectedCurvedTextId,
        isDirty: true 
      };
    }
    
    case 'SELECT_CURVED_TEXT':
      return { ...state, selectedCurvedTextId: action.payload.curvedTextId, selectedFrameId: null, selectedTextBoxId: null };
    
    default:
      return state;
  }
}

// ============================================================
// COMPOSANT EMPLACEMENT PHOTO (anciennement "Cadre")
// ============================================================
interface PlacementComponentProps {
  frame: PhotoFrame;
  isSelected: boolean;
  border?: DecorativeBorder;
  onSelect: () => void;
  onDrop: (photoId: string, photoUrl: string, photoTitle?: string) => void;
  onRemovePhoto: () => void;
  onDelete: () => void;
  onUpdatePosition: (updates: Partial<PhotoFrame['position']>) => void;
  onRotate: (angle: number) => void;
  isLocked: boolean;
  margins: ExtendedBookConfig['margins'];
}

function PlacementComponent({ 
  frame, isSelected, border, onSelect, onDrop, onRemovePhoto, onDelete, onUpdatePosition, onRotate, isLocked, margins 
}: PlacementComponentProps) {
  const { language } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotatingFree, setIsRotatingFree] = useState(false);
  const rotationStartRef = useRef<{ startAngle: number; startRotation: number; centerX: number; centerY: number } | null>(null);
  const currentRotationRef = useRef<number>(frame.position.rotation || 0);
  
  // Synchroniser la ref avec la prop
  useEffect(() => {
    currentRotationRef.current = frame.position.rotation || 0;
  }, [frame.position.rotation]);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, frameX: 0, frameY: 0, frameW: 0, frameH: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  
  // Zone utile (après marges)
  const usableWidth = 100 - margins.left - margins.right;
  const usableHeight = 100 - margins.top - margins.bottom;
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLocked && !isDragging) setIsDragOver(true);
  };
  
  const handleDragLeave = () => setIsDragOver(false);
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLocked) return;
    
    const photoData = e.dataTransfer.getData('application/json');
    if (photoData) {
      const { id, url, title } = JSON.parse(photoData);
      onDrop(id, url, title);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked || e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    
    const target = e.target as HTMLElement;
    if (target.dataset.resize) {
      setIsResizing(target.dataset.resize);
    } else if (!target.dataset.action) {
      setIsDragging(true);
    }
    
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      frameX: frame.position.x,
      frameY: frame.position.y,
      frameW: frame.position.width,
      frameH: frame.position.height,
    });
  };
  
  // Gestion de la rotation libre à la souris
  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLocked || !frameRef.current) return;
    
    // Calculer le centre de l'emplacement
    const rect = frameRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculer l'angle initial entre le centre et la souris
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    
    rotationStartRef.current = {
      startAngle,
      startRotation: currentRotationRef.current,
      centerX,
      centerY,
    };
    setIsRotatingFree(true);
  };
  
  // Gestion du mouvement de rotation libre
  useEffect(() => {
    if (!isRotatingFree) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!rotationStartRef.current) return;
      
      const { startAngle, startRotation, centerX, centerY } = rotationStartRef.current;
      
      // Calculer l'angle actuel
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      
      // Calculer la différence d'angle
      let deltaAngle = currentAngle - startAngle;
      
      // Nouvelle rotation
      let newRotation = startRotation + deltaAngle;
      
      // Snap à 15° si Shift est enfoncé
      if (e.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }
      
      // Normaliser entre -180 et 180
      while (newRotation > 180) newRotation -= 360;
      while (newRotation < -180) newRotation += 360;
      
      currentRotationRef.current = newRotation;
      onUpdatePosition({ rotation: newRotation });
    };
    
    const handleMouseUp = () => {
      setIsRotatingFree(false);
      rotationStartRef.current = null;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRotatingFree, onUpdatePosition]);
  
  useEffect(() => {
    if (!isDragging && !isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!frameRef.current?.parentElement) return;
      
      const parent = frameRef.current.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / parentRect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / parentRect.height) * 100;
      
      if (isDragging) {
        // CORRECTION: Utiliser dragStart.frameW/H pour éviter les problèmes de dépendance
        const newX = Math.max(0, Math.min(100 - dragStart.frameW, dragStart.frameX + deltaX));
        const newY = Math.max(0, Math.min(100 - dragStart.frameH, dragStart.frameY + deltaY));
        onUpdatePosition({ x: newX, y: newY });
      } else if (isResizing) {
        let newW = dragStart.frameW;
        let newH = dragStart.frameH;
        let newX = dragStart.frameX;
        let newY = dragStart.frameY;
        
        // CORRECTION: Permettre de redimensionner jusqu'aux bords (100%)
        if (isResizing.includes('e')) {
          newW = Math.max(10, Math.min(100 - dragStart.frameX, dragStart.frameW + deltaX));
        }
        if (isResizing.includes('w')) {
          const maxDeltaX = dragStart.frameX;
          const actualDeltaX = Math.max(-maxDeltaX, Math.min(dragStart.frameW - 10, -deltaX));
          newX = dragStart.frameX - actualDeltaX;
          newW = dragStart.frameW + actualDeltaX;
        }
        if (isResizing.includes('s')) {
          newH = Math.max(10, Math.min(100 - dragStart.frameY, dragStart.frameH + deltaY));
        }
        if (isResizing.includes('n')) {
          const maxDeltaY = dragStart.frameY;
          const actualDeltaY = Math.max(-maxDeltaY, Math.min(dragStart.frameH - 10, -deltaY));
          newY = dragStart.frameY - actualDeltaY;
          newH = dragStart.frameH + actualDeltaY;
        }
        
        onUpdatePosition({ x: newX, y: newY, width: newW, height: newH });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, onUpdatePosition]);
  
  // Style de l'emplacement
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${frame.position.x}%`,
    top: `${frame.position.y}%`,
    width: `${frame.position.width}%`,
    height: `${frame.position.height}%`,
    transform: frame.position.rotation ? `rotate(${frame.position.rotation}deg)` : undefined,
    borderRadius: frame.shape === 'circle' ? '50%' : frame.shape === 'oval' ? '50%' : '4px',
    cursor: isLocked ? 'default' : isDragging ? 'grabbing' : 'grab',
  };
  
  return (
    <div
      ref={frameRef}
      data-placement="true"
      style={style}
      className={`
        transition-shadow
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg overflow-visible' : 'shadow-md overflow-hidden'}
        ${isDragOver ? 'ring-2 ring-green-500 bg-green-50' : ''}
        ${!frame.photoUrl ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-white'}
      `}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Bordure décorative - affichée à l'extérieur du cadre */}
      {border && (
        <img 
          src={border.imageUrl} 
          alt="" 
          className="absolute pointer-events-none"
          style={{ 
            zIndex: 10,
            // Bordure à l'extérieur : déborde de 10% de chaque côté
            left: '-10%',
            top: '-10%',
            width: '120%',
            height: '120%',
          }}
        />
      )}
      
      {/* Photo ou placeholder */}
      {frame.photoUrl ? (
        <img 
          src={frame.photoUrl} 
          alt={frame.photoTitle || ''} 
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 pointer-events-none">
          <div className="text-center pointer-events-none">
            <Image className="w-8 h-8 mx-auto mb-1 opacity-50" />
            <span className="text-xs">Glisser photo</span>
          </div>
        </div>
      )}
      
      {/* Barre d'outils de l'emplacement (visible si sélectionné) */}
      {isSelected && !isLocked && (
        <>
          {/* Barre d'outils : Rotation libre + Retirer photo */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-lg p-1">
            {/* Bouton de rotation libre - Maintenir et déplacer la souris */}
            <button
              data-action="rotate"
              onMouseDown={handleRotateMouseDown}
              className={`p-1.5 rounded select-none cursor-grab ${isRotatingFree ? 'bg-blue-100 cursor-grabbing' : 'hover:bg-gray-100'}`}
              title={language === 'fr' ? "Maintenir et déplacer pour tourner (Shift = snap 15°)" : "Hold and drag to rotate (Shift = snap 15°)"}
            >
              <svg className="w-5 h-5 text-blue-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-9-9" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            
            {/* Retirer la photo */}
            {frame.photoUrl && (
              <button
                data-action="remove"
                onClick={(e) => { e.stopPropagation(); onRemovePhoto(); }}
                className="p-1.5 hover:bg-orange-100 rounded border-l"
                title="Retirer la photo"
              >
                <X className="w-4 h-4 text-orange-500 pointer-events-none" />
              </button>
            )}
            
            {/* Supprimer l'emplacement */}
            <button
              data-action="delete"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-red-100 rounded border-l"
              title={language === 'fr' ? "Supprimer l'emplacement" : 'Delete slot'}
            >
              <Trash2 className="w-4 h-4 text-red-500 pointer-events-none" />
            </button>
          </div>
          
          {/* Indicateur d'angle (en bas) - toujours visible si rotation != 0 ou en cours de rotation */}
          {(frame.position.rotation !== undefined && frame.position.rotation !== 0) || isRotatingFree ? (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
              {Math.round(frame.position.rotation || 0)}°
            </div>
          ) : null}
          
          {/* Poignées de redimensionnement */}
          <div data-resize="nw" className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-nw-resize" onMouseDown={handleMouseDown} />
          <div data-resize="n" className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-n-resize" onMouseDown={handleMouseDown} />
          <div data-resize="ne" className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-ne-resize" onMouseDown={handleMouseDown} />
          <div data-resize="e" className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-e-resize" onMouseDown={handleMouseDown} />
          <div data-resize="se" className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-se-resize" onMouseDown={handleMouseDown} />
          <div data-resize="s" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-s-resize" onMouseDown={handleMouseDown} />
          <div data-resize="sw" className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-sw-resize" onMouseDown={handleMouseDown} />
          <div data-resize="w" className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-w-resize" onMouseDown={handleMouseDown} />
        </>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT ZONE DE TEXTE
// ============================================================
interface TextBoxComponentProps {
  textBox: TextBox;
  isSelected: boolean;
  onSelect: () => void;
  onUpdatePosition: (updates: Partial<TextBox['position']>) => void;
  onUpdateText: (text: string) => void;
  onUpdateStyle: (updates: Partial<Omit<TextBox, 'id' | 'position' | 'text'>>) => void;
  onDelete: () => void;
  isLocked: boolean;
  margins: ExtendedBookConfig['margins'];
}

function TextBoxComponent({
  textBox, isSelected, onSelect, onUpdatePosition, onUpdateText, onUpdateStyle, onDelete, isLocked, margins
}: TextBoxComponentProps) {
  const { language } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRotatingFree, setIsRotatingFree] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const rotationStartRef = useRef<{ startAngle: number; startRotation: number; centerX: number; centerY: number } | null>(null);
  const currentRotationRef = useRef<number>(textBox.position.rotation || 0);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, frameX: 0, frameY: 0, frameW: 0, frameH: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Synchroniser la ref avec la prop
  useEffect(() => {
    currentRotationRef.current = textBox.position.rotation || 0;
  }, [textBox.position.rotation]);
  
  // Focus sur le textarea quand on passe en mode édition
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked || e.button !== 0 || isEditing) return;
    e.stopPropagation();
    onSelect();
    
    const target = e.target as HTMLElement;
    if (target.dataset.resize) {
      setIsResizing(target.dataset.resize);
    } else if (!target.dataset.action) {
      setIsDragging(true);
    }
    
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      frameX: textBox.position.x,
      frameY: textBox.position.y,
      frameW: textBox.position.width,
      frameH: textBox.position.height,
    });
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const handleBlur = () => {
    setIsEditing(false);
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateText(e.target.value);
  };
  
  // Gestion de la rotation libre à la souris
  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLocked || !boxRef.current) return;
    
    const rect = boxRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    
    rotationStartRef.current = {
      startAngle,
      startRotation: currentRotationRef.current,
      centerX,
      centerY,
    };
    setIsRotatingFree(true);
  };
  
  // Gestion du mouvement de rotation libre
  useEffect(() => {
    if (!isRotatingFree) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!rotationStartRef.current) return;
      
      const { startAngle, startRotation, centerX, centerY } = rotationStartRef.current;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      let deltaAngle = currentAngle - startAngle;
      let newRotation = startRotation + deltaAngle;
      
      if (e.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }
      
      while (newRotation > 180) newRotation -= 360;
      while (newRotation < -180) newRotation += 360;
      
      currentRotationRef.current = newRotation;
      onUpdatePosition({ rotation: newRotation });
    };
    
    const handleMouseUp = () => {
      setIsRotatingFree(false);
      rotationStartRef.current = null;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRotatingFree, onUpdatePosition]);
  
  // Gestion du déplacement et redimensionnement
  useEffect(() => {
    if (!isDragging && !isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!boxRef.current?.parentElement) return;
      
      const parent = boxRef.current.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / parentRect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / parentRect.height) * 100;
      
      if (isDragging) {
        const newX = Math.max(0, Math.min(100 - textBox.position.width, dragStart.frameX + deltaX));
        const newY = Math.max(0, Math.min(100 - textBox.position.height, dragStart.frameY + deltaY));
        onUpdatePosition({ x: newX, y: newY });
      } else if (isResizing) {
        let newW = dragStart.frameW;
        let newH = dragStart.frameH;
        let newX = dragStart.frameX;
        let newY = dragStart.frameY;
        
        if (isResizing.includes('e')) {
          newW = Math.max(10, Math.min(100 - dragStart.frameX, dragStart.frameW + deltaX));
        }
        if (isResizing.includes('w')) {
          const maxDeltaX = dragStart.frameX;
          const actualDeltaX = Math.max(-maxDeltaX, Math.min(dragStart.frameW - 10, -deltaX));
          newX = dragStart.frameX - actualDeltaX;
          newW = dragStart.frameW + actualDeltaX;
        }
        if (isResizing.includes('s')) {
          newH = Math.max(5, Math.min(100 - dragStart.frameY, dragStart.frameH + deltaY));
        }
        if (isResizing.includes('n')) {
          const maxDeltaY = dragStart.frameY;
          const actualDeltaY = Math.max(-maxDeltaY, Math.min(dragStart.frameH - 5, -deltaY));
          newY = dragStart.frameY - actualDeltaY;
          newH = dragStart.frameH + actualDeltaY;
        }
        
        onUpdatePosition({ x: newX, y: newY, width: newW, height: newH });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, textBox.position, onUpdatePosition]);
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${textBox.position.x}%`,
    top: `${textBox.position.y}%`,
    width: `${textBox.position.width}%`,
    height: `${textBox.position.height}%`,
    transform: textBox.position.rotation ? `rotate(${textBox.position.rotation}deg)` : undefined,
    cursor: isLocked ? 'default' : isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
    fontFamily: textBox.fontFamily,
    fontSize: `${textBox.fontSize}px`,
    fontWeight: textBox.fontWeight,
    fontStyle: textBox.fontStyle,
    textDecoration: textBox.textDecoration,
    textAlign: textBox.textAlign,
    color: textBox.color,
    backgroundColor: textBox.backgroundColor || 'transparent',
    padding: textBox.padding ? `${textBox.padding}px` : '4px',
  };
  
  return (
    <div
      ref={boxRef}
      data-textbox="true"
      style={style}
      className={`
        transition-shadow
        ${isSelected ? 'ring-2 ring-purple-500 shadow-lg' : ''}
        ${isEditing ? 'ring-2 ring-green-500' : ''}
      `}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={textBox.text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          className="w-full h-full bg-transparent border-none outline-none resize-none"
          style={{
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            fontStyle: 'inherit',
            textDecoration: 'inherit',
            textAlign: 'inherit',
            color: 'inherit',
          }}
        />
      ) : (
        <div className="w-full h-full overflow-hidden whitespace-pre-wrap">
          {textBox.text ? textBox.text : <span className="text-gray-400 italic pointer-events-none">{language === 'fr' ? 'Double-clic pour éditer' : 'Double-click to edit'}</span>}
        </div>
      )}
      
      {/* Barre d'outils (visible si sélectionné et pas en édition) */}
      {isSelected && !isLocked && !isEditing && (
        <>
          {/* Barre d'outils simplifiée - rotation et suppression uniquement */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-xl p-1.5 border border-purple-300 z-[100]" 
            style={{ top: '-40px', minWidth: 'max-content' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Rotation */}
            <button
              data-action="rotate"
              onMouseDown={handleRotateMouseDown}
              className={`p-1 rounded select-none cursor-grab ${isRotatingFree ? 'bg-purple-100 cursor-grabbing' : 'hover:bg-gray-100'}`}
              title={language === 'fr' ? "Maintenir et déplacer pour tourner" : "Hold and drag to rotate"}
            >
              <svg className="w-4 h-4 text-purple-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-9-9" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            
            {/* Supprimer */}
            <button
              data-action="delete"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 hover:bg-red-100 rounded"
              title={language === 'fr' ? 'Supprimer' : 'Delete'}
            >
              <X className="w-4 h-4 text-red-500 pointer-events-none" />
            </button>
          </div>
          
          {/* Indicateur d'angle */}
          {(textBox.position.rotation !== undefined && textBox.position.rotation !== 0) || isRotatingFree ? (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded">
              {Math.round(textBox.position.rotation || 0)}°
            </div>
          ) : null}
          
          {/* Poignées de redimensionnement */}
          <div data-resize="nw" className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-nw-resize" onMouseDown={handleMouseDown} />
          <div data-resize="n" className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-n-resize" onMouseDown={handleMouseDown} />
          <div data-resize="ne" className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-ne-resize" onMouseDown={handleMouseDown} />
          <div data-resize="e" className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-e-resize" onMouseDown={handleMouseDown} />
          <div data-resize="se" className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-se-resize" onMouseDown={handleMouseDown} />
          <div data-resize="s" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-s-resize" onMouseDown={handleMouseDown} />
          <div data-resize="sw" className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-sw-resize" onMouseDown={handleMouseDown} />
          <div data-resize="w" className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-w-resize" onMouseDown={handleMouseDown} />
        </>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT TEXTE COURBÉ
// ============================================================
interface CurvedTextComponentProps {
  curvedText: CurvedText;
  isSelected: boolean;
  onSelect: () => void;
  onUpdatePosition: (updates: Partial<CurvedText['position']>) => void;
  onUpdate: (updates: Partial<CurvedText>) => void;
  onDelete: () => void;
  isLocked: boolean;
  margins: ExtendedBookConfig['margins'];
}

function CurvedTextComponent({
  curvedText, isSelected, onSelect, onUpdatePosition, onUpdate, onDelete, isLocked, margins
}: CurvedTextComponentProps) {
  const { language } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, frameX: 0, frameY: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Gérer le drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked || isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      frameX: curvedText.position.x,
      frameY: curvedText.position.y,
    });
  };
  
  // Double-clic pour éditer
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    onSelect(); // Sélectionner d'abord
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  
  // Gestion du drag
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!boxRef.current?.parentElement) return;
      const parent = boxRef.current.parentElement;
      const rect = parent.getBoundingClientRect();
      
      // Calculer le déplacement en pourcentage par rapport au parent
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;
      
      // Calculer les nouvelles positions
      let newX = dragStart.frameX + deltaX;
      let newY = dragStart.frameY + deltaY;
      
      // Limites : permettre le déplacement dans toute la zone (0 à 100%)
      newX = Math.max(0, Math.min(100 - curvedText.position.width, newX));
      newY = Math.max(0, Math.min(100 - curvedText.position.height, newY));
      
      onUpdatePosition({ x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, curvedText.position, onUpdatePosition, margins]);
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${curvedText.position.x}%`,
    top: `${curvedText.position.y}%`,
    width: `${curvedText.position.width}%`,
    height: `${curvedText.position.height}%`,
    cursor: isLocked ? 'default' : isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
    zIndex: isSelected ? 30 : 20,
  };
  
  // Calcul du chemin SVG pour le texte courbé
  // viewBox adapté selon le type de chemin
  const viewBoxWidth = 300;
  const viewBoxHeight = curvedText.pathType === 'circle' || curvedText.pathType === 'heart' || curvedText.pathType === 'spiral' ? 150 : 80;
  
  // Générateur de chemin selon le type
  const generatePath = (): string => {
    const curveAmount = (curvedText.curveRadius / 100) * 50;
    const pathType = curvedText.pathType || 'arc';
    
    switch (pathType) {
      case 'arc':
        // Arc simple (comportement original)
        const arcY = curveAmount * 0.5; // Augmenter la courbure
        return curvedText.curveDirection === 'top'
          ? `M 5 ${40 + arcY} Q ${viewBoxWidth / 2} ${40 - arcY * 2} ${viewBoxWidth - 5} ${40 + arcY}`
          : `M 5 ${40 - arcY} Q ${viewBoxWidth / 2} ${40 + arcY * 2} ${viewBoxWidth - 5} ${40 - arcY}`;
      
      case 'circle': {
        // Cercle ou semi-cercle
        const radius = 40 + (curveAmount * 0.3);
        const cx = viewBoxWidth / 2;
        const cy = 40;
        // Arc de cercle (demi-cercle supérieur ou inférieur)
        if (curvedText.curveDirection === 'top') {
          return `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
        } else {
          return `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 0 ${cx + radius} ${cy}`;
        }
      }
      
      case 'wave': {
        // Vague sinüoïdiale
        const amplitude = 10 + (curveAmount * 0.2);
        const centerY = 40;
        const segments = 3; // Nombre d'ondulations
        const segmentWidth = (viewBoxWidth - 10) / segments;
        let path = `M 5 ${centerY}`;
        for (let i = 0; i < segments; i++) {
          const x1 = 5 + (i * segmentWidth) + (segmentWidth / 4);
          const x2 = 5 + (i * segmentWidth) + (segmentWidth * 3 / 4);
          const x3 = 5 + ((i + 1) * segmentWidth);
          const y1 = centerY - amplitude;
          const y2 = centerY + amplitude;
          path += ` Q ${x1} ${y1} ${(x1 + x2) / 2} ${centerY}`;
          path += ` Q ${x2} ${y2} ${x3} ${centerY}`;
        }
        return path;
      }
      
      case 'heart': {
        // Forme de cœur
        const scale = 0.6 + (curveAmount * 0.005);
        const cx = viewBoxWidth / 2;
        const cy = 40;
        // Chemin en forme de cœur (partie supérieure)
        return `M ${cx} ${cy - 15 * scale} ` +
          `C ${cx - 35 * scale} ${cy - 50 * scale} ${cx - 55 * scale} ${cy - 15 * scale} ${cx} ${cy + 20 * scale} ` +
          `C ${cx + 55 * scale} ${cy - 15 * scale} ${cx + 35 * scale} ${cy - 50 * scale} ${cx} ${cy - 15 * scale}`;
      }
      
      case 'spiral': {
        // Spirale
        const cx = viewBoxWidth / 2;
        const cy = 40;
        const turns = 1.5;
        const startRadius = 15;
        const endRadius = 40 + (curveAmount * 0.3);
        const points: string[] = [];
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = t * turns * 2 * Math.PI - Math.PI / 2;
          const radius = startRadius + (endRadius - startRadius) * t;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
        }
        return `M ${points[0]} ` + points.slice(1).map(p => `L ${p}`).join(' ');
      }
      
      default:
        return `M 5 40 L ${viewBoxWidth - 5} 40`;
    }
  };
  
  const pathD = generatePath();
  
  return (
    <div
      ref={boxRef}
      data-curvedtext="true"
      data-curvedtext-id={curvedText.id}
      style={{
        ...style,
        backgroundColor: isSelected ? 'rgba(251, 146, 60, 0.05)' : 'rgba(200, 200, 200, 0.02)',
      }}
      className={`
        transition-shadow hover:bg-orange-50/30
        ${isSelected ? 'ring-2 ring-orange-500 shadow-lg bg-orange-50/10' : 'border border-dashed border-gray-300/50'}
        ${isEditing ? 'ring-2 ring-green-500' : ''}
      `}
      onClick={(e) => { 
        e.stopPropagation(); 
        e.preventDefault();
        onSelect(); 
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!isLocked) {
          handleMouseDown(e);
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Barre d'outils */}
      {isSelected && !isLocked && (
        <div 
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white rounded shadow-lg px-2 py-1 flex items-center gap-1 z-50"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onUpdate({ curveDirection: curvedText.curveDirection === 'top' ? 'bottom' : 'top' })}
            className="p-1 hover:bg-gray-100 rounded text-sm font-bold"
            title="Inverser la courbure"
          >
            {curvedText.curveDirection === 'top' ? '⌒' : '⌣'}
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-100 rounded text-red-500"
            title={language === 'fr' ? 'Supprimer' : 'Delete'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* SVG avec texte courbé - viewBox plus grand pour meilleur rendu */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <path
            id={`curve-${curvedText.id}`}
            d={pathD}
            fill="transparent"
          />
        </defs>
        <text
          fill={curvedText.color}
          style={{
            fontFamily: curvedText.fontFamily,
            fontSize: `${curvedText.fontSize}px`,
            fontWeight: 'normal',
            pointerEvents: 'none',
          }}
        >
          <textPath
            href={`#curve-${curvedText.id}`}
            startOffset="50%"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {curvedText.text}
          </textPath>
        </text>
      </svg>
      
      {/* Mode édition */}
      {isEditing && (
        <input
          ref={inputRef}
          type="text"
          value={curvedText.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              setIsEditing(false);
            }
          }}
          className="absolute inset-0 bg-white/90 border-2 border-green-500 rounded px-2 text-center"
          style={{
            fontFamily: curvedText.fontFamily,
            fontSize: `${curvedText.fontSize}px`,
            color: curvedText.color,
          }}
        />
      )}
      
      {/* Poignées de sélection */}
      {isSelected && !isLocked && !isEditing && (
        <>
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-orange-500 border-2 border-white rounded-sm" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-orange-500 border-2 border-white rounded-sm" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-orange-500 border-2 border-white rounded-sm" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-orange-500 border-2 border-white rounded-sm" />
        </>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PHOTO DRAGGABLE
// ============================================================
interface DraggablePhotoProps {
  photo: { id: string; url: string; title?: string; used: boolean };
}

function DraggablePhoto({ photo }: DraggablePhotoProps) {
  const { language } = useLanguage();
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: photo.id,
      url: photo.url,
      title: photo.title,
    }));
  };
  
  return (
    <div
      draggable={!photo.used}
      onDragStart={handleDragStart}
      className={`
        relative aspect-square rounded overflow-hidden cursor-grab
        ${photo.used ? 'opacity-40 cursor-not-allowed' : 'hover:ring-2 hover:ring-blue-400'}
      `}
    >
      <img src={photo.url} alt={photo.title || ''} className="w-full h-full object-cover" />
      {photo.used && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="text-white text-xs">{language === 'fr' ? 'Utilisée' : 'Used'}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function PhotoBookEditor({ isOpen, onClose, selectedPhotos, albumName }: PhotoBookEditorProps) {
  const { language } = useLanguage();
  const [state, dispatch] = useReducer(
    photoBookReducer, 
    { photos: selectedPhotos, albumName },
    ({ photos, albumName }) => createInitialState(photos, albumName)
  );
  
  const [activeTab, setActiveTab] = useState<'format' | 'photos' | 'borders'>('format');
  const [selectedBorderCategory, setSelectedBorderCategory] = useState<string>('classic');
  const [zoom, setZoom] = useState(100);
  const [uniformMargin, setUniformMargin] = useState(true);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  
  const currentPage = state.pages[state.currentPageIndex];
  const selectedFrame = currentPage?.frames.find(f => f.id === state.selectedFrameId);
  const selectedTextBox = currentPage?.textBoxes?.find(t => t.id === state.selectedTextBoxId);
  const selectedCurvedText = currentPage?.curvedTexts?.find(t => t.id === state.selectedCurvedTextId);
  const theme = BOOK_THEMES[state.config.theme];
  
  // Initialiser avec une page si vide
  useEffect(() => {
    if (state.pages.length === 0) {
      dispatch({ type: 'ADD_PAGE', payload: {} });
    }
  }, [state.pages.length]);
  
  // Ajouter une nouvelle page
  const handleAddPage = () => {
    dispatch({ type: 'ADD_PAGE', payload: { afterIndex: state.currentPageIndex } });
  };
  
  // Supprimer la page courante
  const handleDeletePage = () => {
    if (state.pages.length > 1) {
      dispatch({ type: 'DELETE_PAGE', payload: { pageIndex: state.currentPageIndex } });
    }
  };
  
  // Dupliquer la page courante
  const handleDuplicatePage = () => {
    dispatch({ type: 'DUPLICATE_PAGE', payload: { pageIndex: state.currentPageIndex } });
  };
  
  // Verrouiller/déverrouiller la page
  const handleToggleLock = () => {
    if (currentPage?.isLocked) {
      dispatch({ type: 'UNLOCK_PAGE', payload: { pageIndex: state.currentPageIndex } });
    } else {
      dispatch({ type: 'LOCK_PAGE', payload: { pageIndex: state.currentPageIndex } });
    }
  };
  
  // Ajouter un emplacement photo
  const handleAddPlacement = (shape: PhotoFrame['shape'] = 'rectangle') => {
    if (currentPage?.isLocked) {
      toast.error(language === "fr" ? "La page est verrouillée" : "Page is locked");
      return;
    }
    
    // Définir les dimensions selon la forme
    // Pour un carré ou cercle, on veut des proportions 1:1 visuellement
    // Page A4 portrait : 210x297mm
    // Les % sont relatifs à la largeur et hauteur de la page
    // Pour un carré visuel : width% * pageWidth = height% * pageHeight
    // Donc : height% = width% * (pageWidth / pageHeight) = width% * (210/297) = width% * 0.707
    const aspectRatio = 210 / 297; // ~0.707 pour A4 portrait
    
    let width = 30;
    let height = 30;
    
    if (shape === 'rectangle') {
      width = 40;
      height = 30;
    } else if (shape === 'oval') {
      width = 35;
      height = 25;
    } else if (shape === 'square' || shape === 'circle') {
      // Pour un carré/cercle visuel : height% = width% * 0.707
      width = 30;
      height = Math.round(30 * aspectRatio); // ~21% pour un carré visuel
    }
    
    const newFrame: PhotoFrame = {
      id: generateId(),
      shape,
      position: {
        x: 20,
        y: 20,
        width,
        height,
        rotation: 0,
      },
    };
    
    dispatch({ type: 'ADD_FRAME', payload: { pageIndex: state.currentPageIndex, frame: newFrame } });
  };
  
  // Ajouter une zone de texte
  const handleAddTextBox = () => {
    if (currentPage?.isLocked) {
      toast.error(language === "fr" ? "La page est verrouillée" : "Page is locked");
      return;
    }
    
    const newTextBox: TextBox = {
      id: generateId(),
      position: {
        x: 10,
        y: 10,
        width: 40,
        height: 15,
        rotation: 0,
      },
      text: '',
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      color: '#333333',
    };
    
    dispatch({ type: 'ADD_TEXTBOX', payload: { pageIndex: state.currentPageIndex, textBox: newTextBox } });
  };
  
  // Ajouter un texte courbé
  const handleAddCurvedText = () => {
    if (currentPage?.isLocked) {
      toast.error(language === "fr" ? "La page est verrouillée" : "Page is locked");
      return;
    }
    
    const newCurvedText: CurvedText = {
      id: generateId(),
      position: {
        x: 20,
        y: 20,
        width: 60,
        height: 30,
        rotation: 0,
      },
      text: language === 'fr' ? 'Texte courbé' : 'Curved text',
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      color: '#333333',
      pathType: 'arc',
      curveDirection: 'top',
      curveRadius: 100,
    };
    
    dispatch({ type: 'ADD_CURVED_TEXT', payload: { pageIndex: state.currentPageIndex, curvedText: newCurvedText } });
  };
  
  // Supprimer l'emplacement sélectionné
  const handleDeletePlacement = () => {
    if (state.selectedFrameId && !currentPage?.isLocked) {
      dispatch({ 
        type: 'DELETE_FRAME', 
        payload: { pageIndex: state.currentPageIndex, frameId: state.selectedFrameId } 
      });
    }
  };
  
  // Rotation rapide
  const handleRotatePlacement = (angle: number) => {
    if (!state.selectedFrameId || !selectedFrame) return;
    
    const currentRotation = selectedFrame.position.rotation || 0;
    let newRotation = currentRotation + angle;
    
    // Normaliser entre -180 et 180
    while (newRotation > 180) newRotation -= 360;
    while (newRotation < -180) newRotation += 360;
    
    dispatch({
      type: 'UPDATE_FRAME',
      payload: {
        pageIndex: state.currentPageIndex,
        frameId: state.selectedFrameId,
        updates: { position: { ...selectedFrame.position, rotation: newRotation } }
      }
    });
  };
  
  // Placer une photo
  const handlePlacePhoto = (frameId: string, photoId: string, photoUrl: string, photoTitle?: string) => {
    dispatch({ 
      type: 'PLACE_PHOTO', 
      payload: { pageIndex: state.currentPageIndex, frameId, photoId, photoUrl, photoTitle } 
    });
  };
  
  // Retirer une photo
  const handleRemovePhoto = (frameId: string) => {
    dispatch({ type: 'REMOVE_PHOTO', payload: { pageIndex: state.currentPageIndex, frameId } });
  };
  
  // Appliquer une bordure
  const handleApplyBorder = (borderId: string) => {
    if (state.selectedFrameId) {
      dispatch({ 
        type: 'APPLY_BORDER', 
        payload: { pageIndex: state.currentPageIndex, frameId: state.selectedFrameId, borderId } 
      });
    }
  };
  
  // Mise à jour des marges
  const handleMarginChange = (value: number, side?: 'top' | 'bottom' | 'left' | 'right') => {
    if (uniformMargin) {
      dispatch({ type: 'SET_MARGINS' as any, payload: { top: value, bottom: value, left: value, right: value } });
    } else if (side) {
      dispatch({ type: 'SET_MARGINS' as any, payload: { [side]: value } });
    }
  };
  
  // Générer le PDF
  const handleGeneratePDF = async () => {
    toast.info(language === "fr" ? "Génération du PDF en cours..." : "Generating PDF...");
    
    try {
      const { jsPDF } = await import('jspdf');
      const dimensions = PAGE_DIMENSIONS[state.config.format];
      const margins = state.config.margins;
      
      // Convertir les marges de % en mm
      const marginTop = (margins.top / 100) * dimensions.height;
      const marginBottom = (margins.bottom / 100) * dimensions.height;
      const marginLeft = (margins.left / 100) * dimensions.width;
      const marginRight = (margins.right / 100) * dimensions.width;
      
      const pdf = new jsPDF({
        orientation: state.config.format === 'landscape' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: state.config.format === 'square' ? [dimensions.width, dimensions.height] : state.config.format.toLowerCase() as 'a4' | 'a5',
      });
      
      // Helper couleur
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      // ========== PAGE DE COUVERTURE ==========
      const coverBgRgb = hexToRgb(theme.coverBg) || { r: 128, g: 0, b: 32 };
      pdf.setFillColor(coverBgRgb.r, coverBgRgb.g, coverBgRgb.b);
      pdf.rect(0, 0, dimensions.width, dimensions.height, 'F');
      
      // Bordure
      const accentRgb = hexToRgb(theme.accent) || { r: 212, g: 175, b: 55 };
      pdf.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
      pdf.setLineWidth(1);
      pdf.rect(10, 10, dimensions.width - 20, dimensions.height - 20);
      
      // Titre
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.text(state.config.title, dimensions.width / 2, dimensions.height / 2 - 20, { align: 'center' });
      
      if (state.config.subtitle) {
        pdf.setFontSize(14);
        pdf.text(state.config.subtitle, dimensions.width / 2, dimensions.height / 2, { align: 'center' });
      }
      
      if (state.config.date) {
        pdf.setFontSize(10);
        pdf.text(state.config.date, dimensions.width / 2, dimensions.height - 30, { align: 'center' });
      }
      
      // ========== PAGES DE CONTENU ==========
      for (let pageIdx = 0; pageIdx < state.pages.length; pageIdx++) {
        const page = state.pages[pageIdx];
        pdf.addPage();
        
        // Fond
        const bgRgb = hexToRgb(page.backgroundColor) || { r: 255, g: 255, b: 255 };
        pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        pdf.rect(0, 0, dimensions.width, dimensions.height, 'F');
        
        // Zone utile
        const contentX = marginLeft;
        const contentY = marginTop;
        const contentW = dimensions.width - marginLeft - marginRight;
        const contentH = dimensions.height - marginTop - marginBottom;
        
        // Cadre de la zone utile (optionnel, pour visualisation)
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.2);
        pdf.rect(contentX, contentY, contentW, contentH);
        
        // Emplacements photos
        for (const frame of page.frames) {
          if (!frame.photoUrl) continue;
          
          const x = contentX + (frame.position.x / 100) * contentW;
          const y = contentY + (frame.position.y / 100) * contentH;
          const w = (frame.position.width / 100) * contentW;
          const h = (frame.position.height / 100) * contentH;
          
          // Ombre
          pdf.setFillColor(200, 200, 200);
          pdf.rect(x + 1.5, y + 1.5, w, h, 'F');
          
          // Photo
          try {
            pdf.addImage(frame.photoUrl, 'JPEG', x, y, w, h);
            
            // Bordure simple
            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.3);
            pdf.rect(x, y, w, h);
          } catch (e) {
            console.error('Erreur ajout image:', e);
          }
        }
        
        // Numéro de page
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`${page.pageNumber}`, dimensions.width / 2, dimensions.height - 8, { align: 'center' });
      }
      
      // Télécharger
      const fileName = `${state.config.title.replace(/[^a-zA-Z0-9à-ü]/gi, '_')}_livre_photo.pdf`;
      pdf.save(fileName);
      
      toast.success(language === "fr" ? "Livre photo PDF généré avec succès !" : "Photo book PDF generated successfully!");
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error(language === "fr" ? "Erreur lors de la génération du PDF" : "Error generating PDF");
    }
  };
  
  // Filtrer les bordures
  const filteredBorders = state.borders.filter(b => 
    b.category === selectedBorderCategory && b.type === 'frame'
  );
  
  // Calcul des dimensions de la page
  const pageDimensions = PAGE_DIMENSIONS[state.config.format];
  const aspectRatio = pageDimensions.width / pageDimensions.height;
  const pageHeight = 500 * (zoom / 100);
  const pageWidth = pageHeight * aspectRatio;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onClose} className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                Retour
              </Button>
              <DialogTitle className="flex items-center gap-2">
                <Book className="w-6 h-6 text-red-600" />
                {language === 'fr' ? 'Éditeur de Livre Photo' : 'Photo Book Editor'}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(150, zoom + 10))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="default" onClick={handleGeneratePDF}>
                <Download className="w-4 h-4 mr-2" />
                {language === 'fr' ? 'Générer PDF' : 'Generate PDF'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        {/* Corps principal */}
        <div className="flex flex-1 overflow-hidden">
          {/* Panneau gauche - Configuration */}
          <div className="w-72 border-r flex flex-col bg-gray-50">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col h-full">
              <TabsList className="grid grid-cols-3 m-2">
                <TabsTrigger value="format" className="text-xs px-2 gap-1">
                  <Settings className="w-4 h-4" />
                  Format
                </TabsTrigger>
                <TabsTrigger value="photos" className="text-xs px-2 gap-1">
                  <Image className="w-4 h-4" />
                  Photos
                </TabsTrigger>
                <TabsTrigger value="borders" className="text-xs px-2 gap-1">
                  <Frame className="w-4 h-4" />
                  Bordures
                </TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                {/* ============ ONGLET FORMAT ============ */}
                <TabsContent value="format" className="m-0 p-3 space-y-4 pb-8">
                  {/* 1. FORMAT DU LIVRE */}
                  <div className="bg-white rounded-lg p-3 border">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-700">
                      <FileImage className="w-4 h-4" />
                      1. Format du livre
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Format de page</Label>
                        <Select 
                          value={state.config.format}
                          onValueChange={(v) => dispatch({ type: 'SET_CONFIG', payload: { format: v as BookConfig['format'] } })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A4">A4 Portrait (210×297mm)</SelectItem>
                            <SelectItem value="A5">A5 Portrait (148×210mm)</SelectItem>
                            <SelectItem value="square">{language === 'fr' ? 'Carré (200×200mm)' : 'Square (200×200mm)'}</SelectItem>
                            <SelectItem value="landscape">{language === 'fr' ? 'A4 Paysage (297×210mm)' : 'A4 Landscape (297×210mm)'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs">{language === "fr" ? "Thème" : "Theme"}</Label>
                        <Select 
                          value={state.config.theme}
                          onValueChange={(v) => dispatch({ type: 'SET_CONFIG', payload: { theme: v as BookConfig['theme'] } })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classic">{language === 'fr' ? 'Classique (crème)' : 'Classic (cream)'}</SelectItem>
                            <SelectItem value="modern">{language === 'fr' ? 'Moderne (blanc)' : 'Modern (white)'}</SelectItem>
                            <SelectItem value="vintage">{language === 'fr' ? 'Vintage (beige)' : 'Vintage (beige)'}</SelectItem>
                            <SelectItem value="elegant">{language === 'fr' ? 'Élégant (noir)' : 'Elegant (black)'}</SelectItem>
                            <SelectItem value="minimal">{language === 'fr' ? 'Minimal (gris)' : 'Minimal (grey)'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* 2. MARGES */}
                  <div className="bg-white rounded-lg p-3 border">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-700">
                      <Maximize className="w-4 h-4" />
                      2. Marges (zone utile)
                    </h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-xs">
                        <input 
                          type="checkbox" 
                          checked={uniformMargin}
                          onChange={(e) => setUniformMargin(e.target.checked)}
                          className="rounded"
                        />
                        Marges uniformes
                      </label>
                      
                      {uniformMargin ? (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Marge</span>
                            <span className="font-medium">
                              {state.config.margins.top}% 
                              <span className="text-blue-600 ml-1">
                                ({((state.config.margins.top / 100) * pageDimensions.width).toFixed(1)}mm)
                              </span>
                            </span>
                          </div>
                          <Slider
                            value={[state.config.margins.top]}
                            onValueChange={([v]) => handleMarginChange(v)}
                            min={0}
                            max={20}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {(['top', 'bottom', 'left', 'right'] as const).map(side => {
                            const isVertical = side === 'top' || side === 'bottom';
                            const dimension = isVertical ? pageDimensions.height : pageDimensions.width;
                            const mmValue = ((state.config.margins[side] / 100) * dimension).toFixed(1);
                            return (
                              <div key={side}>
                                <Label className="text-xs">
                                  {side === 'top' ? 'Haut' : side === 'bottom' ? 'Bas' : side === 'left' ? 'Gauche' : 'Droite'}
                                </Label>
                                <div className="flex items-center gap-1">
                                  <Slider
                                    value={[state.config.margins[side]]}
                                    onValueChange={([v]) => handleMarginChange(v, side)}
                                    min={0}
                                    max={20}
                                    step={1}
                                    className="flex-1"
                                  />
                                  <span className="text-xs w-16 text-right">
                                    {state.config.margins[side]}% <span className="text-blue-600">({mmValue}mm)</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 3. AJOUTER DES ÉLÉMENTS */}
                  <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-700">
                      <Plus className="w-4 h-4" />
                      {language === 'fr' ? '3. Ajouter des éléments' : '3. Add elements'}
                    </h3>
                    
                    {/* Zone de texte en premier */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={handleAddTextBox}
                        className="p-2 bg-purple-100 border-2 border-purple-300 rounded hover:bg-purple-200 hover:border-purple-500 text-center transition-colors flex flex-col items-center justify-center gap-1"
                        disabled={currentPage?.isLocked}
                      >
                        <Type className="w-5 h-5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">Texte</span>
                      </button>
                      <button
                        onClick={handleAddCurvedText}
                        className="p-2 bg-orange-100 border-2 border-orange-300 rounded hover:bg-orange-200 hover:border-orange-500 text-center transition-colors flex flex-col items-center justify-center gap-1"
                        disabled={currentPage?.isLocked}
                      >
                        <span className="text-lg">⌒</span>
                        <span className="text-xs font-medium text-orange-700">{language === 'fr' ? 'Texte courbé' : 'Curved text'}</span>
                      </button>
                    </div>
                    
                    {/* Emplacements photos */}
                    <p className="text-xs text-gray-600 mb-2">{language === 'fr' ? 'Emplacements photos :' : 'Photo slots:'}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {AVAILABLE_SHAPES.slice(0, 4).map(shape => (
                        <button
                          key={shape.id}
                          onClick={() => handleAddPlacement(shape.type)}
                          className="p-2 bg-white border-2 border-blue-300 rounded hover:bg-blue-100 hover:border-blue-500 text-center transition-colors"
                          disabled={currentPage?.isLocked}
                        >
                          <span className="text-xl block">{shape.icon}</span>
                          <span className="text-xs">{shape.label}</span>
                        </button>
                      ))}
                    </div>
                    
                    <p className="text-xs text-blue-600 mt-2">
                      Cliquez pour ajouter, puis redimensionnez et positionnez librement.
                    </p>
                  </div>
                  
                  {/* Propriétés de l'emplacement sélectionné */}
                  {selectedFrame && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-amber-700">
                        <Frame className="w-4 h-4" />
                        {language === 'fr' ? 'Emplacement sélectionné' : 'Selected slot'}
                      </h3>
                      
                      <div className="space-y-3">
                        {/* Forme */}
                        <div>
                          <Label className="text-xs">Forme</Label>
                          <div className="flex gap-1 mt-1">
                            {['rectangle', 'square', 'circle', 'oval'].map(shape => (
                              <button
                                key={shape}
                                onClick={() => dispatch({
                                  type: 'UPDATE_FRAME',
                                  payload: { 
                                    pageIndex: state.currentPageIndex, 
                                    frameId: state.selectedFrameId!, 
                                    updates: { shape: shape as PhotoFrame['shape'] } 
                                  }
                                })}
                                className={`p-1.5 rounded flex-1 ${
                                  selectedFrame.shape === shape 
                                    ? 'bg-amber-500 text-white' 
                                    : 'bg-white hover:bg-amber-100 border'
                                }`}
                              >
                                {shape === 'rectangle' && <RectangleHorizontal className="w-4 h-4 mx-auto" />}
                                {shape === 'square' && <Square className="w-4 h-4 mx-auto" />}
                                {shape === 'circle' && <Circle className="w-4 h-4 mx-auto" />}
                                {shape === 'oval' && <Circle className="w-4 h-3 mx-auto" />}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Rotation */}
                        <div>
                          <Label className="text-xs">Rotation : {selectedFrame.position.rotation || 0}°</Label>
                          <div className="flex gap-1 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRotatePlacement(-90)}
                              className="flex-1"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              -90°
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => dispatch({
                                type: 'UPDATE_FRAME',
                                payload: { 
                                  pageIndex: state.currentPageIndex, 
                                  frameId: state.selectedFrameId!, 
                                  updates: { position: { ...selectedFrame.position, rotation: 0 } } 
                                }
                              })}
                              className="flex-1"
                            >
                              0°
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRotatePlacement(90)}
                              className="flex-1"
                            >
                              <RotateCw className="w-4 h-4 mr-1" />
                              +90°
                            </Button>
                          </div>
                        </div>
                        
                        {/* Supprimer */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeletePlacement}
                          className="w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer l'emplacement
                        </Button>
                      </div>
                    </div>
                  )}
                  
                </TabsContent>
                
                {/* ============ ONGLET PHOTOS ============ */}
                <TabsContent value="photos" className="m-0 p-3">
                  <h3 className="font-semibold text-sm mb-2">
                    Photos disponibles ({state.availablePhotos.filter(p => !p.used).length}/{state.availablePhotos.length})
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {language === 'fr' ? 'Glissez-déposez les photos sur les emplacements.' : 'Drag and drop photos onto the slots.'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {state.availablePhotos.map(photo => (
                      <DraggablePhoto key={photo.id} photo={photo} />
                    ))}
                  </div>
                  {state.availablePhotos.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {language === 'fr' ? 'Aucune photo sélectionnée' : 'No photo selected'}
                    </p>
                  )}
                </TabsContent>
                
                {/* ============ ONGLET BORDURES ============ */}
                <TabsContent value="borders" className="m-0 p-3">
                  <h3 className="font-semibold text-sm mb-2">{language === 'fr' ? 'Bordures décoratives' : 'Decorative borders'}</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {language === 'fr' ? 'Sélectionnez un emplacement puis choisissez une bordure.' : 'Select a slot then choose a border.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {BORDER_CATEGORIES.filter(c => c.id !== 'custom').map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedBorderCategory(cat.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          selectedBorderCategory === cat.id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {/* Sans bordure */}
                    <button
                      onClick={() => state.selectedFrameId && dispatch({
                        type: 'UPDATE_FRAME',
                        payload: { 
                          pageIndex: state.currentPageIndex, 
                          frameId: state.selectedFrameId, 
                          updates: { borderId: undefined } 
                        }
                      })}
                      className="aspect-square border rounded hover:bg-gray-100 flex items-center justify-center"
                      disabled={!state.selectedFrameId}
                    >
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                    
                    {filteredBorders.map(border => (
                      <button
                        key={border.id}
                        onClick={() => handleApplyBorder(border.id)}
                        className={`aspect-square border rounded overflow-hidden hover:ring-2 hover:ring-blue-400 ${
                          selectedFrame?.borderId === border.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        disabled={!state.selectedFrameId}
                      >
                        <img src={border.imageUrl} alt={border.name} className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
          
          {/* Zone centrale - Aperçu de la page */}
          <div className="flex-1 flex flex-col bg-gray-200 overflow-hidden">
            {/* Barre d'outils de page */}
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => dispatch({ type: 'SELECT_PAGE', payload: { pageIndex: Math.max(0, state.currentPageIndex - 1) } })}
                  disabled={state.currentPageIndex <= 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {state.currentPageIndex + 1} / {state.pages.length}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => dispatch({ type: 'SELECT_PAGE', payload: { pageIndex: Math.min(state.pages.length - 1, state.currentPageIndex + 1) } })}
                  disabled={state.currentPageIndex >= state.pages.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleAddPage} title={language === 'fr' ? 'Ajouter une page' : 'Add a page'}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDuplicatePage} title="Dupliquer la page">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleToggleLock} title={currentPage?.isLocked ? (language === 'fr' ? "Déverrouiller" : "Unlock") : (language === 'fr' ? "Verrouiller" : "Lock")}>
                  {currentPage?.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeletePage} disabled={state.pages.length <= 1} title={language === 'fr' ? 'Supprimer la page' : 'Delete page'}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
            
            {/* Aperçu de la page */}
            <div 
              ref={pageContainerRef}
              className="flex-1 flex items-center justify-center p-8 overflow-auto"
              onClick={(e) => { 
                // Gérer les clics sur les éléments
                const target = e.target as HTMLElement;
                const isPlacement = target.closest('[data-placement]');
                const isTextBox = target.closest('[data-textbox]');
                const curvedTextEl = target.closest('[data-curvedtext]');
                
                // Si on clique sur un texte courbé, le sélectionner
                if (curvedTextEl) {
                  const curvedTextId = curvedTextEl.getAttribute('data-curvedtext-id');
                  if (curvedTextId) {
                    dispatch({ type: 'SELECT_CURVED_TEXT', payload: { curvedTextId } });
                    dispatch({ type: 'SELECT_FRAME', payload: { frameId: null } });
                    dispatch({ type: 'SELECT_TEXTBOX', payload: { textBoxId: null } });
                  }
                  return;
                }
                
                // Ne désélectionner que si on clique directement sur le conteneur ou la page (pas sur un emplacement)
                if (!isPlacement && !isTextBox && (e.target === e.currentTarget || target.closest('.page-background'))) {
                  dispatch({ type: 'SELECT_FRAME', payload: { frameId: null } }); 
                  dispatch({ type: 'SELECT_TEXTBOX', payload: { textBoxId: null } }); 
                  dispatch({ type: 'SELECT_CURVED_TEXT', payload: { curvedTextId: null } }); 
                }
              }}
            >
              {currentPage && (
                <div 
                  className="relative bg-white shadow-2xl overflow-visible page-background"
                  style={{
                    width: `${pageWidth}px`,
                    height: `${pageHeight}px`,
                    backgroundColor: currentPage.backgroundColor,
                  }}
                >
                  {/* Indicateur de marges (zone utile) */}
                  <div 
                    className="absolute border-2 border-dashed border-blue-300 pointer-events-none"
                    style={{
                      left: `${state.config.margins.left}%`,
                      top: `${state.config.margins.top}%`,
                      right: `${state.config.margins.right}%`,
                      bottom: `${state.config.margins.bottom}%`,
                    }}
                  />
                  
                  {/* Zone des emplacements (dans les marges) */}
                  <div 
                    className="absolute overflow-visible"
                    style={{
                      left: `${state.config.margins.left}%`,
                      top: `${state.config.margins.top}%`,
                      width: `${100 - state.config.margins.left - state.config.margins.right}%`,
                      height: `${100 - state.config.margins.top - state.config.margins.bottom}%`,
                      zIndex: 1,
                    }}
                  >
                    {currentPage.frames.map(frame => (
                      <PlacementComponent
                        key={frame.id}
                        frame={frame}
                        isSelected={state.selectedFrameId === frame.id}
                        border={frame.borderId ? getBorderById(frame.borderId) : undefined}
                        onSelect={() => {
                          dispatch({ type: 'SELECT_FRAME', payload: { frameId: frame.id } });
                          dispatch({ type: 'SELECT_TEXTBOX', payload: { textBoxId: null } });
                        }}
                        onDrop={(photoId, photoUrl, photoTitle) => handlePlacePhoto(frame.id, photoId, photoUrl, photoTitle)}
                        onRemovePhoto={() => handleRemovePhoto(frame.id)}
                        onDelete={() => dispatch({ type: 'DELETE_FRAME', payload: { pageIndex: state.currentPageIndex, frameId: frame.id } })}
                        onUpdatePosition={(updates) => dispatch({
                          type: 'UPDATE_FRAME',
                          payload: { 
                            pageIndex: state.currentPageIndex, 
                            frameId: frame.id, 
                            updates: { position: { ...frame.position, ...updates } } 
                          }
                        })}
                        onRotate={handleRotatePlacement}
                        isLocked={currentPage.isLocked}
                        margins={state.config.margins}
                      />
                    ))}
                    
                    {/* Zones de texte */}
                    {(currentPage.textBoxes || []).map(textBox => (
                      <TextBoxComponent
                        key={textBox.id}
                        textBox={textBox}
                        isSelected={state.selectedTextBoxId === textBox.id}
                        onSelect={() => {
                          dispatch({ type: 'SELECT_TEXTBOX', payload: { textBoxId: textBox.id } });
                          dispatch({ type: 'SELECT_FRAME', payload: { frameId: null } });
                        }}
                        onUpdatePosition={(updates) => dispatch({
                          type: 'UPDATE_TEXTBOX',
                          payload: { 
                            pageIndex: state.currentPageIndex, 
                            textBoxId: textBox.id, 
                            updates: { position: { ...textBox.position, ...updates } } 
                          }
                        })}
                        onUpdateText={(text) => dispatch({
                          type: 'UPDATE_TEXTBOX',
                          payload: { pageIndex: state.currentPageIndex, textBoxId: textBox.id, updates: { text } }
                        })}
                        onUpdateStyle={(updates) => dispatch({
                          type: 'UPDATE_TEXTBOX',
                          payload: { pageIndex: state.currentPageIndex, textBoxId: textBox.id, updates }
                        })}
                        onDelete={() => dispatch({
                          type: 'DELETE_TEXTBOX',
                          payload: { pageIndex: state.currentPageIndex, textBoxId: textBox.id }
                        })}
                        isLocked={currentPage.isLocked}
                        margins={state.config.margins}
                      />
                    ))}
                    
                    {/* Textes courbés */}
                    {(currentPage.curvedTexts || []).map(curvedText => (
                      <CurvedTextComponent
                        key={curvedText.id}
                        curvedText={curvedText}
                        isSelected={state.selectedCurvedTextId === curvedText.id}
                        onSelect={() => {
                          dispatch({ type: 'SELECT_CURVED_TEXT', payload: { curvedTextId: curvedText.id } });
                          dispatch({ type: 'SELECT_FRAME', payload: { frameId: null } });
                          dispatch({ type: 'SELECT_TEXTBOX', payload: { textBoxId: null } });
                        }}
                        onUpdatePosition={(updates) => dispatch({
                          type: 'UPDATE_CURVED_TEXT',
                          payload: { 
                            pageIndex: state.currentPageIndex, 
                            curvedTextId: curvedText.id, 
                            updates: { position: { ...curvedText.position, ...updates } } 
                          }
                        })}
                        onUpdate={(updates) => dispatch({
                          type: 'UPDATE_CURVED_TEXT',
                          payload: { 
                            pageIndex: state.currentPageIndex, 
                            curvedTextId: curvedText.id, 
                            updates 
                          }
                        })}
                        onDelete={() => dispatch({
                          type: 'DELETE_CURVED_TEXT',
                          payload: { pageIndex: state.currentPageIndex, curvedTextId: curvedText.id }
                        })}
                        isLocked={currentPage.isLocked}
                        margins={state.config.margins}
                      />
                    ))}
                  </div>
                  
                  {/* Message si page vide */}
                  {currentPage.frames.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                      <div className="text-center">
                        <Plus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>{language === 'fr' ? 'Ajoutez des emplacements depuis le panneau Format' : 'Add slots from the Format panel'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Panneau droit - Zone de texte sélectionnée + Pages */}
          <div className="w-56 border-l bg-gray-50 flex flex-col">
            <ScrollArea className="flex-1">
              {/* Zone de texte sélectionnée */}
              {selectedTextBox && (
                <div className="p-2 border-b">
                  <div className="bg-purple-50 rounded-lg p-2 border border-purple-300">
                    <h3 className="font-semibold text-xs mb-2 flex items-center gap-1 text-purple-700">
                      <Type className="w-3 h-3" />
                      Zone de texte
                    </h3>
                    
                    <div className="space-y-2">
                      {/* Police */}
                      <div>
                        <Label className="text-[10px]">Police</Label>
                        <Select
                          value={selectedTextBox.fontFamily}
                          onValueChange={(value) => dispatch({
                            type: 'UPDATE_TEXTBOX',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              textBoxId: state.selectedTextBoxId!, 
                              updates: { fontFamily: value } 
                            }
                          })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {/* Sans-serif classiques */}
                            <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                            <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                            <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                            <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                            <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                            <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                            <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                            <SelectItem value="'Oswald', sans-serif">Oswald</SelectItem>
                            <SelectItem value="'Raleway', sans-serif">Raleway</SelectItem>
                            <SelectItem value="'Bebas Neue', sans-serif">Bebas Neue</SelectItem>
                            {/* Serif élégantes */}
                            <SelectItem value="Georgia, serif">Georgia</SelectItem>
                            <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                            <SelectItem value="'Playfair Display', serif">Playfair Display</SelectItem>
                            <SelectItem value="'Merriweather', serif">Merriweather</SelectItem>
                            <SelectItem value="'Lora', serif">Lora</SelectItem>
                            <SelectItem value="'Crimson Text', serif">Crimson Text</SelectItem>
                            <SelectItem value="'Abril Fatface', serif">Abril Fatface</SelectItem>
                            <SelectItem value="'Cinzel', serif">Cinzel</SelectItem>
                            <SelectItem value="'Cinzel Decorative', serif">Cinzel Decorative</SelectItem>
                            {/* Cursives / Script */}
                            <SelectItem value="'Dancing Script', cursive">Dancing Script</SelectItem>
                            <SelectItem value="'Pacifico', cursive">Pacifico</SelectItem>
                            <SelectItem value="'Great Vibes', cursive">Great Vibes</SelectItem>
                            <SelectItem value="'Satisfy', cursive">Satisfy</SelectItem>
                            <SelectItem value="'Lobster', cursive">Lobster</SelectItem>
                            <SelectItem value="'Caveat', cursive">Caveat</SelectItem>
                            <SelectItem value="'Sacramento', cursive">Sacramento</SelectItem>
                            <SelectItem value="'Courgette', cursive">Courgette</SelectItem>
                            {/* Anglaises (calligraphie élégante) */}
                            <SelectItem value="'Pinyon Script', cursive">✍ Pinyon Script</SelectItem>
                            <SelectItem value="'Tangerine', cursive">✍ Tangerine</SelectItem>
                            <SelectItem value="'Alex Brush', cursive">✍ Alex Brush</SelectItem>
                            <SelectItem value="'Allura', cursive">✍ Allura</SelectItem>
                            <SelectItem value="'Italianno', cursive">✍ Italianno</SelectItem>
                            <SelectItem value="'Monsieur La Doulaise', cursive">✍ Monsieur La Doulaise</SelectItem>
                            {/* Gothiques / Médiévales */}
                            <SelectItem value="'UnifrakturMaguntia', serif">⚔ UnifrakturMaguntia</SelectItem>
                            <SelectItem value="'UnifrakturCook', serif">⚔ UnifrakturCook</SelectItem>
                            <SelectItem value="'Almendra Display', serif">⚔ Almendra Display</SelectItem>
                            <SelectItem value="'MedievalSharp', serif">⚔ MedievalSharp</SelectItem>
                            <SelectItem value="'Pirata One', serif">⚔ Pirata One</SelectItem>
                            <SelectItem value="'Uncial Antiqua', serif">⚔ Uncial Antiqua</SelectItem>
                            {/* Fantaisie / Décoratives */}
                            <SelectItem value="'Permanent Marker', cursive">Permanent Marker</SelectItem>
                            <SelectItem value="'Amatic SC', cursive">Amatic SC</SelectItem>
                            <SelectItem value="'Shadows Into Light', cursive">Shadows Into Light</SelectItem>
                            <SelectItem value="'Indie Flower', cursive">Indie Flower</SelectItem>
                            {/* Monospace */}
                            <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Taille */}
                      <div>
                        <Label className="text-[10px]">Taille : {selectedTextBox.fontSize}px</Label>
                        <Slider
                          value={[selectedTextBox.fontSize]}
                          onValueChange={([v]) => dispatch({
                            type: 'UPDATE_TEXTBOX',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              textBoxId: state.selectedTextBoxId!, 
                              updates: { fontSize: v } 
                            }
                          })}
                          min={8}
                          max={72}
                          step={1}
                          className="w-full mt-1"
                        />
                      </div>
                      
                      {/* Style */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => dispatch({
                            type: 'UPDATE_TEXTBOX',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              textBoxId: state.selectedTextBoxId!, 
                              updates: { fontWeight: selectedTextBox.fontWeight === 'bold' ? 'normal' : 'bold' } 
                            }
                          })}
                          className={`p-1.5 rounded text-xs ${selectedTextBox.fontWeight === 'bold' ? 'bg-purple-500 text-white' : 'bg-white hover:bg-purple-100 border'}`}
                        >
                          <Bold className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => dispatch({
                            type: 'UPDATE_TEXTBOX',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              textBoxId: state.selectedTextBoxId!, 
                              updates: { fontStyle: selectedTextBox.fontStyle === 'italic' ? 'normal' : 'italic' } 
                            }
                          })}
                          className={`p-1.5 rounded text-xs ${selectedTextBox.fontStyle === 'italic' ? 'bg-purple-500 text-white' : 'bg-white hover:bg-purple-100 border'}`}
                        >
                          <Italic className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => dispatch({
                            type: 'UPDATE_TEXTBOX',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              textBoxId: state.selectedTextBoxId!, 
                              updates: { textDecoration: selectedTextBox.textDecoration === 'underline' ? 'none' : 'underline' } 
                            }
                          })}
                          className={`p-1.5 rounded text-xs ${selectedTextBox.textDecoration === 'underline' ? 'bg-purple-500 text-white' : 'bg-white hover:bg-purple-100 border'}`}
                        >
                          <Underline className="w-3 h-3" />
                        </button>
                        <div className="w-px bg-gray-300 mx-0.5" />
                        <button
                          onClick={() => dispatch({
                            type: 'UPDATE_TEXTBOX',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              textBoxId: state.selectedTextBoxId!, 
                              updates: { textAlign: 'left' } 
                            }
                          })}
                          className={`p-1.5 rounded text-xs ${selectedTextBox.textAlign === 'left' ? 'bg-purple-500 text-white' : 'bg-white hover:bg-purple-100 border'}`}
                        >
                          <AlignLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => dispatch({
                            type: 'UPDATE_TEXTBOX',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              textBoxId: state.selectedTextBoxId!, 
                              updates: { textAlign: 'center' } 
                            }
                          })}
                          className={`p-1.5 rounded text-xs ${selectedTextBox.textAlign === 'center' ? 'bg-purple-500 text-white' : 'bg-white hover:bg-purple-100 border'}`}
                        >
                          <AlignCenter className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => dispatch({
                            type: 'UPDATE_TEXTBOX',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              textBoxId: state.selectedTextBoxId!, 
                              updates: { textAlign: 'right' } 
                            }
                          })}
                          className={`p-1.5 rounded text-xs ${selectedTextBox.textAlign === 'right' ? 'bg-purple-500 text-white' : 'bg-white hover:bg-purple-100 border'}`}
                        >
                          <AlignRight className="w-3 h-3" />
                        </button>
                      </div>
                      
                      {/* Couleur du texte - Color Picker */}
                      <div>
                        <Label className="text-[10px] flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: selectedTextBox.color }} />
                          Couleur du texte
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div 
                            className="relative w-full h-8 rounded border-2 border-gray-300 hover:border-purple-500 transition-colors cursor-pointer overflow-hidden flex items-center"
                            style={{ backgroundColor: selectedTextBox.color }}
                          >
                            <input
                              type="color"
                              value={selectedTextBox.color}
                              onChange={(e) => dispatch({
                                type: 'UPDATE_TEXTBOX',
                                payload: { 
                                  pageIndex: state.currentPageIndex, 
                                  textBoxId: state.selectedTextBoxId!, 
                                  updates: { color: e.target.value } 
                                }
                              })}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              title={language === 'fr' ? 'Cliquez pour choisir une couleur' : 'Click to choose a color'}
                            />
                            <span className="ml-2 text-xs font-mono px-1 py-0.5 rounded" style={{ 
                              backgroundColor: 'rgba(255,255,255,0.8)', 
                              color: '#333' 
                            }}>
                              {selectedTextBox.color.toUpperCase()}
                            </span>
                            <span className="ml-auto mr-2 text-xs" style={{ 
                              backgroundColor: 'rgba(255,255,255,0.8)', 
                              color: '#333',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              🎨 Cliquer
                            </span>
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-1 italic">{language === 'fr' ? '💡 Cliquez sur "Afficher les couleurs..." pour le disque' : '💡 Click "Show colors..." for the color wheel'}</p>
                      </div>
                      
                      {/* Supprimer */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => dispatch({
                          type: 'DELETE_TEXTBOX',
                          payload: { pageIndex: state.currentPageIndex, textBoxId: state.selectedTextBoxId! }
                        })}
                        className="w-full h-7 text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Texte courbé sélectionné */}
              {selectedCurvedText && (
                <div className="p-2 border-b">
                  <div className="bg-orange-50 rounded-lg p-2 border border-orange-300">
                    <h3 className="font-semibold text-xs mb-2 flex items-center gap-1 text-orange-700">
                      <span className="text-sm">⌒</span>
                      {language === 'fr' ? 'Texte courbé' : 'Curved text'}
                    </h3>
                    
                    <div className="space-y-2">
                      {/* Type de chemin */}
                      <div>
                        <Label className="text-[10px]">Type de chemin</Label>
                        <div className="grid grid-cols-5 gap-1 mt-1">
                          {CURVED_TEXT_PATH_OPTIONS.map((option) => (
                            <button
                              key={option.type}
                              onClick={() => dispatch({
                                type: 'UPDATE_CURVED_TEXT',
                                payload: { 
                                  pageIndex: state.currentPageIndex, 
                                  curvedTextId: state.selectedCurvedTextId!, 
                                  updates: { pathType: option.type } 
                                }
                              })}
                              className={`p-1.5 rounded text-sm flex flex-col items-center justify-center ${
                                (selectedCurvedText.pathType || 'arc') === option.type 
                                  ? 'bg-orange-500 text-white' 
                                  : 'bg-white hover:bg-orange-100 border'
                              }`}
                              title={option.label}
                            >
                              <span className="text-base">{option.icon}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-gray-500 mt-1">
                          {CURVED_TEXT_PATH_OPTIONS.find(o => o.type === (selectedCurvedText.pathType || 'arc'))?.label || 'Arc'}
                        </p>
                      </div>
                      
                      {/* Police */}
                      <div>
                        <Label className="text-[10px]">Police</Label>
                        <Select
                          value={selectedCurvedText.fontFamily}
                          onValueChange={(value) => dispatch({
                            type: 'UPDATE_CURVED_TEXT',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              curvedTextId: state.selectedCurvedTextId!, 
                              updates: { fontFamily: value } 
                            }
                          })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {/* Sans-serif classiques */}
                            <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                            <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                            <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                            <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                            <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                            <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                            <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                            <SelectItem value="'Oswald', sans-serif">Oswald</SelectItem>
                            <SelectItem value="'Raleway', sans-serif">Raleway</SelectItem>
                            <SelectItem value="'Bebas Neue', sans-serif">Bebas Neue</SelectItem>
                            {/* Serif élégantes */}
                            <SelectItem value="Georgia, serif">Georgia</SelectItem>
                            <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                            <SelectItem value="'Playfair Display', serif">Playfair Display</SelectItem>
                            <SelectItem value="'Merriweather', serif">Merriweather</SelectItem>
                            <SelectItem value="'Lora', serif">Lora</SelectItem>
                            <SelectItem value="'Crimson Text', serif">Crimson Text</SelectItem>
                            <SelectItem value="'Abril Fatface', serif">Abril Fatface</SelectItem>
                            <SelectItem value="'Cinzel', serif">Cinzel</SelectItem>
                            <SelectItem value="'Cinzel Decorative', serif">Cinzel Decorative</SelectItem>
                            {/* Cursives / Script */}
                            <SelectItem value="'Dancing Script', cursive">Dancing Script</SelectItem>
                            <SelectItem value="'Pacifico', cursive">Pacifico</SelectItem>
                            <SelectItem value="'Great Vibes', cursive">Great Vibes</SelectItem>
                            <SelectItem value="'Satisfy', cursive">Satisfy</SelectItem>
                            <SelectItem value="'Lobster', cursive">Lobster</SelectItem>
                            <SelectItem value="'Caveat', cursive">Caveat</SelectItem>
                            <SelectItem value="'Sacramento', cursive">Sacramento</SelectItem>
                            <SelectItem value="'Courgette', cursive">Courgette</SelectItem>
                            {/* Anglaises (calligraphie élégante) */}
                            <SelectItem value="'Pinyon Script', cursive">✍ Pinyon Script</SelectItem>
                            <SelectItem value="'Tangerine', cursive">✍ Tangerine</SelectItem>
                            <SelectItem value="'Alex Brush', cursive">✍ Alex Brush</SelectItem>
                            <SelectItem value="'Allura', cursive">✍ Allura</SelectItem>
                            <SelectItem value="'Italianno', cursive">✍ Italianno</SelectItem>
                            <SelectItem value="'Monsieur La Doulaise', cursive">✍ Monsieur La Doulaise</SelectItem>
                            {/* Gothiques / Médiévales */}
                            <SelectItem value="'UnifrakturMaguntia', serif">⚔ UnifrakturMaguntia</SelectItem>
                            <SelectItem value="'UnifrakturCook', serif">⚔ UnifrakturCook</SelectItem>
                            <SelectItem value="'Almendra Display', serif">⚔ Almendra Display</SelectItem>
                            <SelectItem value="'MedievalSharp', serif">⚔ MedievalSharp</SelectItem>
                            <SelectItem value="'Pirata One', serif">⚔ Pirata One</SelectItem>
                            <SelectItem value="'Uncial Antiqua', serif">⚔ Uncial Antiqua</SelectItem>
                            {/* Fantaisie / Décoratives */}
                            <SelectItem value="'Permanent Marker', cursive">Permanent Marker</SelectItem>
                            <SelectItem value="'Amatic SC', cursive">Amatic SC</SelectItem>
                            <SelectItem value="'Shadows Into Light', cursive">Shadows Into Light</SelectItem>
                            <SelectItem value="'Indie Flower', cursive">Indie Flower</SelectItem>
                            {/* Monospace */}
                            <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Taille */}
                      <div>
                        <Label className="text-[10px]">Taille : {selectedCurvedText.fontSize}px</Label>
                        <Slider
                          value={[selectedCurvedText.fontSize]}
                          onValueChange={([v]) => dispatch({
                            type: 'UPDATE_CURVED_TEXT',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              curvedTextId: state.selectedCurvedTextId!, 
                              updates: { fontSize: v } 
                            }
                          })}
                          min={8}
                          max={72}
                          step={1}
                          className="w-full mt-1"
                        />
                      </div>
                      
                      {/* Courbure */}
                      <div>
                        <Label className="text-[10px]">Courbure : {selectedCurvedText.curveRadius}%</Label>
                        <Slider
                          value={[selectedCurvedText.curveRadius]}
                          onValueChange={([v]) => dispatch({
                            type: 'UPDATE_CURVED_TEXT',
                            payload: { 
                              pageIndex: state.currentPageIndex, 
                              curvedTextId: state.selectedCurvedTextId!, 
                              updates: { curveRadius: v } 
                            }
                          })}
                          min={0}
                          max={200}
                          step={5}
                          className="w-full mt-1"
                        />
                      </div>
                      
                      {/* Direction de la courbure - uniquement pour arc et cercle */}
                      {(selectedCurvedText.pathType === 'arc' || selectedCurvedText.pathType === 'circle' || !selectedCurvedText.pathType) && (
                        <div>
                          <Label className="text-[10px]">Direction</Label>
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => dispatch({
                                type: 'UPDATE_CURVED_TEXT',
                                payload: { 
                                  pageIndex: state.currentPageIndex, 
                                  curvedTextId: state.selectedCurvedTextId!, 
                                  updates: { curveDirection: 'top' } 
                                }
                              })}
                              className={`flex-1 p-1.5 rounded text-sm ${selectedCurvedText.curveDirection === 'top' ? 'bg-orange-500 text-white' : 'bg-white hover:bg-orange-100 border'}`}
                              title={language === 'fr' ? 'Arc vers le haut' : 'Arc upward'}
                            >
                              ⌒ Haut
                            </button>
                            <button
                              onClick={() => dispatch({
                                type: 'UPDATE_CURVED_TEXT',
                                payload: { 
                                  pageIndex: state.currentPageIndex, 
                                  curvedTextId: state.selectedCurvedTextId!, 
                                  updates: { curveDirection: 'bottom' } 
                                }
                              })}
                              className={`flex-1 p-1.5 rounded text-sm ${selectedCurvedText.curveDirection === 'bottom' ? 'bg-orange-500 text-white' : 'bg-white hover:bg-orange-100 border'}`}
                              title={language === 'fr' ? 'Arc vers le bas' : 'Arc downward'}
                            >
                              ⌣ Bas
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Couleur du texte - Color Picker */}
                      <div>
                        <Label className="text-[10px] flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: selectedCurvedText.color }} />
                          Couleur du texte
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div 
                            className="relative w-full h-8 rounded border-2 border-gray-300 hover:border-orange-500 transition-colors cursor-pointer overflow-hidden flex items-center"
                            style={{ backgroundColor: selectedCurvedText.color }}
                          >
                            <input
                              type="color"
                              value={selectedCurvedText.color}
                              onChange={(e) => dispatch({
                                type: 'UPDATE_CURVED_TEXT',
                                payload: { 
                                  pageIndex: state.currentPageIndex, 
                                  curvedTextId: state.selectedCurvedTextId!, 
                                  updates: { color: e.target.value } 
                                }
                              })}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              title={language === 'fr' ? 'Cliquez pour choisir une couleur' : 'Click to choose a color'}
                            />
                            <span className="ml-2 text-xs font-mono px-1 py-0.5 rounded" style={{ 
                              backgroundColor: 'rgba(255,255,255,0.8)', 
                              color: '#333' 
                            }}>
                              {selectedCurvedText.color.toUpperCase()}
                            </span>
                            <span className="ml-auto mr-2 text-xs" style={{ 
                              backgroundColor: 'rgba(255,255,255,0.8)', 
                              color: '#333',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              🎨 Cliquer
                            </span>
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-1 italic">{language === 'fr' ? '💡 Cliquez sur "Afficher les couleurs..." pour le disque' : '💡 Click "Show colors..." for the color wheel'}</p>
                      </div>
                      
                      {/* Supprimer */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => dispatch({
                          type: 'DELETE_CURVED_TEXT',
                          payload: { pageIndex: state.currentPageIndex, curvedTextId: state.selectedCurvedTextId! }
                        })}
                        className="w-full h-7 text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pages */}
              <div className="p-2">
                <span className="text-xs font-semibold">Pages</span>               <div className="mt-2 space-y-2">
                  {state.pages.map((page, index) => (
                    <button
                      key={page.id}
                      onClick={() => dispatch({ type: 'SELECT_PAGE', payload: { pageIndex: index } })}
                      className={`w-full border rounded overflow-hidden relative ${
                        index === state.currentPageIndex ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ 
                        backgroundColor: page.backgroundColor,
                        aspectRatio: `${pageDimensions.width} / ${pageDimensions.height}`,
                      }}
                    >
                      {/* Miniature des emplacements */}
                      <div 
                        className="absolute"
                        style={{
                          left: `${state.config.margins.left}%`,
                          top: `${state.config.margins.top}%`,
                          width: `${100 - state.config.margins.left - state.config.margins.right}%`,
                          height: `${100 - state.config.margins.top - state.config.margins.bottom}%`,
                        }}
                      >
                        {page.frames.map((frame, i) => (
                          <div
                            key={i}
                            className="absolute"
                            style={{
                              left: `${frame.position.x}%`,
                              top: `${frame.position.y}%`,
                              width: `${frame.position.width}%`,
                              height: `${frame.position.height}%`,
                              backgroundColor: frame.photoUrl ? undefined : '#E5E7EB',
                              borderRadius: frame.shape === 'circle' ? '50%' : '2px',
                              overflow: 'hidden',
                              transform: frame.position.rotation ? `rotate(${frame.position.rotation}deg)` : undefined,
                            }}
                          >
                            {frame.photoUrl && (
                              <img src={frame.photoUrl} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Numéro de page */}
                      <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white px-1 rounded">
                        {page.pageNumber}
                      </span>
                      
                      {/* Indicateur verrouillé */}
                      {page.isLocked && (
                        <Lock className="absolute top-1 right-1 w-3 h-3 text-gray-500" />
                      )}
                    </button>
                  ))}
                  
                  {/* Bouton ajouter page */}
                  <button
                    onClick={handleAddPage}
                    className="w-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                    style={{ aspectRatio: `${pageDimensions.width} / ${pageDimensions.height}` }}
                  >
                    <Plus className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
