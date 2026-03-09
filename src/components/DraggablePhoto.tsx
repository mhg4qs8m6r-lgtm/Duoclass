import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import PhotoFrameNew from './PhotoFrameNew';
import { PhotoFrame } from '@/types/photo';
import { DisplayMode } from '@/lib/frameUtils';

interface DraggablePhotoProps {
  frame: PhotoFrame;
  zoomLevel: number;
  displayMode?: DisplayMode;
  onSelect: (id: number, isSelected: boolean) => void;
  onDoubleClick: (id: number) => void;
  onContextMenu: (e: React.MouseEvent, id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onRotate?: (id: number) => void;
}

export function DraggablePhoto({ frame, zoomLevel, displayMode = "normal", onSelect, onDoubleClick, onContextMenu, onEdit, onDelete, onRotate }: DraggablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `photo-${frame.id}`,
    data: { frameId: frame.id, type: 'photo' }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
    touchAction: 'none',
  };

  // Only render if there is a photo URL
  if (!frame.photoUrl) return null;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className="absolute top-0 left-0 w-full h-full"
    >
      <PhotoFrameNew
        frame={frame}
        isSelected={frame.isSelected || false}
        onSelect={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onEdit={onEdit}
        onDelete={onDelete}
        onRotate={onRotate}
        zoomLevel={zoomLevel}
        displayMode={displayMode}
        isOverlay={isDragging}
      />
    </div>
  );
}
