import { useState } from 'react';
import { Plus, Check, Pencil } from 'lucide-react';
import { PhotoFrame } from '@/types/photo';
import { useLanguage } from '@/contexts/LanguageContext';

interface PhotoGridProps {
  frames: PhotoFrame[];
  zoomLevel: number;
  onFrameClick: (frameId: number, e: React.MouseEvent) => void;
  onFrameDoubleClick: (frameId: number) => void;
  onEditClick: (frameId: number) => void;
  onContextMenu: (e: React.MouseEvent, frameId: number) => void;
  onDragStart: (e: React.DragEvent, frame: PhotoFrame) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, frameId: number) => void;
}

export default function PhotoGrid({ 
  frames, 
  zoomLevel, 
  onFrameClick, 
  onFrameDoubleClick, 
  onEditClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop
}: PhotoGridProps) {
  const { t } = useLanguage();
  // Calculer la taille des colonnes en fonction du zoom
  const getGridCols = () => {
    if (zoomLevel <= 25) return 'grid-cols-6';
    if (zoomLevel <= 50) return 'grid-cols-5';
    if (zoomLevel <= 75) return 'grid-cols-4';
    if (zoomLevel <= 100) return 'grid-cols-3';
    return 'grid-cols-2';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-100" onClick={(e) => e.stopPropagation()}>
      <div className={`grid ${getGridCols()} gap-6 transition-all duration-300`}>
        {frames.map(frame => (
          <div 
            key={frame.id}
            draggable={!!frame.photoUrl}
            onDragStart={(e) => onDragStart(e, frame)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, frame.id)}
            onClick={(e) => onFrameClick(frame.id, e)}
            onDoubleClick={() => onFrameDoubleClick(frame.id)}
            onContextMenu={(e) => onContextMenu(e, frame.id)}
            className={`
              aspect-square rounded-xl border-4 shadow-sm transition-all relative group bg-white overflow-hidden cursor-pointer
              ${frame.isSelected ? 'border-blue-500 ring-4 ring-blue-200' : 'border-white hover:border-gray-300'}
              ${!frame.photoUrl ? 'border-dashed border-gray-300 bg-gray-50' : ''}
            `}
          >
            {frame.photoUrl ? (
              <>
                <img 
                  src={frame.photoUrl} 
                  alt={frame.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback si l'image ne charge pas
                    e.currentTarget.src = `https://placehold.co/400x400/e2e8f0/64748b?text=${encodeURIComponent(frame.title)}`;
                  }}
                />
                
                {/* Overlay au survol */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                
                {/* Checkbox de sélection - Déplacé en bas à droite pour ne pas gêner le format */}
                <div className={`absolute bottom-8 right-2 transition-opacity ${frame.isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${frame.isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-gray-400'}`}>
                    {frame.isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                
                {/* Badge Format - En haut à gauche */}
                {frame.format && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm z-10">
                    {frame.format}
                  </div>
                )}

                {/* Bouton Modifier (Crayon) - En haut à droite */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick(frame.id);
                  }}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-blue-600 p-1.5 rounded-full shadow-sm transition-transform hover:scale-110 border border-blue-100 z-10"
                  title={t('common.editDetails')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                
                {/* Titre en bas */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2">
                  <p className="text-white text-xs font-medium truncate text-center">{frame.title}</p>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                <Plus className="w-8 h-8" />
                <span className="text-xs font-medium">Vide</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
