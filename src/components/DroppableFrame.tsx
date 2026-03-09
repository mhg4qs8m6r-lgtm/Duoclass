import { useDroppable } from '@dnd-kit/core';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useRef } from 'react';
import { PhotoFrame } from '@/types/photo';
import { calculateFrameSize, FRAME_TITLE_HEIGHT, DisplayMode } from '@/lib/frameUtils';

interface DroppableFrameProps {
  frame: PhotoFrame;
  index: number;
  zoomLevel: number;
  displayMode?: DisplayMode;
  children?: React.ReactNode;
  onContextMenu?: (e: React.MouseEvent, id: number) => void;
  onExternalDrop?: (frameId: number, files: File[]) => void;
}

export function DroppableFrame({ frame, index, zoomLevel, displayMode = "normal", children, onContextMenu, onExternalDrop }: DroppableFrameProps) {
  const { language } = useLanguage();
  const { isOver, setNodeRef } = useDroppable({
    id: `frame-${frame.id}`,
    data: { frameId: frame.id, index, type: 'frame' }
  });

  const [isExternalDragOver, setIsExternalDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const size = calculateFrameSize(zoomLevel, displayMode);

  // Gérer le drag externe (depuis le bureau) - uniquement pour cadres vides
  const handleDragEnter = (e: React.DragEvent) => {
    if (!frame.photoUrl && e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragCounterRef.current++;
      setIsExternalDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!frame.photoUrl && e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!frame.photoUrl) {
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsExternalDragOver(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    // Ne traiter que si le cadre est vide
    if (!frame.photoUrl && onExternalDrop && e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation(); // Stopper la propagation uniquement lors du drop réussi
      dragCounterRef.current = 0;
      setIsExternalDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onExternalDrop(frame.id, files);
      }
    }
  };

  const isHighlighted = isOver || isExternalDragOver;
  const showDropIndicator = isExternalDragOver && !frame.photoUrl;

  return (
    <div 
      ref={setNodeRef}
      data-frame-id={frame.id}
      style={{ width: size, height: size + FRAME_TITLE_HEIGHT }}
      className={`relative flex flex-col bg-white shadow-sm border-2 transition-colors ${
        isHighlighted ? 'border-blue-500 bg-blue-50' : 'border-blue-300'
      }`}
      onContextMenu={(e) => {
        if (onContextMenu) {
          onContextMenu(e, frame.id);
        }
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Zone Image (Vide) */}
      <div className="flex-1 flex items-center justify-center relative">
        {showDropIndicator && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-100/90 z-10">
            <div className="text-center">
              <div className="text-3xl mb-1">📥</div>
              <p className="text-xs font-medium text-blue-600">{language === 'fr' ? 'Déposer ici' : 'Drop here'}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Barre de titre (Vide) */}
      <div className={`h-10 border-t-2 flex items-center ${isHighlighted ? 'border-blue-500 bg-blue-100' : 'border-blue-300 bg-white'}`}>
        <div className={`w-10 h-full border-r-2 ${isHighlighted ? 'border-blue-500' : 'border-blue-300'}`}></div>
        <div className="flex-1"></div>
        <div className={`w-[40px] h-full border-l-2 ${isHighlighted ? 'border-blue-500' : 'border-blue-300'}`}></div>
      </div>

      {/* Overlay content (DraggablePhoto) */}
      {children}
    </div>
  );
}
