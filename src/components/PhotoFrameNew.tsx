import { useState, useEffect } from 'react';
import { Pencil, Trash2, ImageOff, Play, RotateCw } from 'lucide-react';
import { formatDuration } from '@/lib/videoUtils';
import { cn } from '@/lib/utils';
import { calculateFrameSize, FRAME_TITLE_HEIGHT, DisplayMode } from '@/lib/frameUtils';
import { PhotoFrame } from '@/types/photo';
import { useLanguage } from '@/contexts/LanguageContext';

export interface PhotoFrameNewProps {
  frame: PhotoFrame;
  index?: number;
  isSelected: boolean;
  onSelect: (id: number, isSelected: boolean) => void;
  onDoubleClick: (id: number) => void;
  onContextMenu: (e: React.MouseEvent, id: number) => void;
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
  onRotate?: (id: number) => void; // Nouvelle prop pour la rotation
  zoomLevel: number;
  displayMode?: DisplayMode;
  isOverlay?: boolean;
}

export default function PhotoFrameNew({
  frame,
  index,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onEdit,
  onDelete,
  onRotate,
  zoomLevel,
  displayMode = "normal",
  isOverlay = false
}: PhotoFrameNewProps) {
  const { t } = useLanguage();
  const size = calculateFrameSize(zoomLevel, displayMode);
  
  const [imgError, setImgError] = useState(false);

  // Reset error state when photoUrl changes
  useEffect(() => {
    setImgError(false);
  }, [frame.photoUrl]);

  // Calculer la rotation actuelle (0, 90, 180, 270)
  const rotation = frame.rotation || 0;

  return (
    <div 
      className={`relative flex flex-col select-none ${isOverlay ? 'pointer-events-auto' : ''}`}
      style={{ width: size, height: size + FRAME_TITLE_HEIGHT }}
      data-frame-id={frame.id}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onContextMenu(e, frame.id);
      }}
      onDoubleClick={() => onDoubleClick(frame.id)}
    >
      {/* Zone Image / Contenu */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden relative"
      >

        {frame.photoUrl && !imgError ? (
          <>
            {/* Image avec rotation appliquée */}
            <img 
              src={frame.photoUrl} 
              alt={frame.title} 
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
              draggable={false}
              onError={() => setImgError(true)}
            />
            
            {/* Bouton de rotation (en haut à droite de l'image) - pour images ET vidéos */}
            {onRotate && !isOverlay && (
              <button
                className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md border border-gray-200 hover:border-blue-400 transition-all z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRotate(frame.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                title={`Rotation (${rotation}° → ${rotation + 90}°)`}
              >
                <RotateCw className="w-4 h-4 text-blue-500" />
              </button>
            )}
            
            {/* Overlay pour les vidéos */}
            {frame.mediaType === 'video' && (
              <>
                {/* Icône Play au centre - CLIQUABLE */}
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDoubleClick(frame.id);
                  }}
                >
                  <div className="bg-black/60 rounded-full p-3 shadow-lg hover:bg-black/80 transition-colors">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
                {/* Durée en bas à droite */}
                {frame.duration && (
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                    {formatDuration(frame.duration)}
                  </div>
                )}
              </>
            )}
          </>
        ) : frame.photoUrl && imgError ? (
          <div className="flex flex-col items-center justify-center text-red-400 p-2 text-center">
            <ImageOff className="w-8 h-8 mb-1" />
            <span className="text-xs">Image introuvable</span>
          </div>
        ) : (
          <div 
            className="text-blue-200 text-4xl font-light cursor-pointer hover:text-blue-400 transition-colors w-full h-full flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById('universal-file-input')?.click();
            }}
          >+</div>
        )}
      </div>

      {/* Barre de titre / Métadonnées - Masquée si isOverlay est vrai */}
      {!isOverlay && (
        <div className="h-10 flex items-center relative">
          
          {/* Case de sélection (Gauche) */}
          <div 
            className="w-10 h-full flex items-center justify-center cursor-pointer hover:bg-blue-50/50"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(frame.id, !isSelected);
            }}
          >
            <div className={cn(
              "w-5 h-5 border-2 border-blue-300 rounded-sm transition-colors",
              isSelected && "bg-blue-500 border-blue-500"
            )} />
          </div>

          {/* Titre (Centre) - Cliquable pour ouvrir les détails */}
          <div 
            className="flex-1 px-2 text-center truncate font-medium text-blue-600 text-sm cursor-pointer hover:text-blue-800 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(frame.id);
            }}
            title={t('common.clickToEdit')}
          >
            {frame.title || "Sans titre"}
          </div>

          {/* Format (Droite) */}
          <div className="px-2 text-xs font-bold text-blue-400 h-full flex items-center justify-center min-w-[40px]">
            {frame.format || "JPG"}
          </div>

          {/* Crayon (Flottant) */}
          <button 
            className="absolute -top-3 right-12 bg-white rounded-full p-1 shadow-sm border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(frame.id);
            }}
            title={t('common.comments')}
          >
            <Pencil className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          </button>

          {/* Poubelle (Flottant - Gauche) */}
          {onDelete && frame.photoUrl && (
            <button 
              className="absolute -top-8 left-2 bg-white rounded-full p-1 shadow-sm border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(frame.id);
              }}
              title={t('common.deletePhoto')}
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
