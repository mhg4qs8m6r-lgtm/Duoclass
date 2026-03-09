import React, { useRef, useState, useEffect, useCallback } from 'react';

interface CustomScrollbarProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

/**
 * Composant d'ascenseur personnalisé toujours visible
 * Affiche une barre de défilement verticale même quand il n'y a pas assez de contenu
 */
export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({ containerRef, className = '' }) => {
  const [scrollInfo, setScrollInfo] = useState({
    scrollTop: 0,
    scrollHeight: 100,
    clientHeight: 100,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartScrollTop, setDragStartScrollTop] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Calculer la taille et position du thumb
  const thumbHeight = Math.max(
    40,
    (scrollInfo.clientHeight / Math.max(scrollInfo.scrollHeight, scrollInfo.clientHeight)) * scrollInfo.clientHeight
  );
  
  const maxScrollTop = scrollInfo.scrollHeight - scrollInfo.clientHeight;
  const thumbTop = maxScrollTop > 0 
    ? (scrollInfo.scrollTop / maxScrollTop) * (scrollInfo.clientHeight - thumbHeight)
    : 0;

  // Vérifier si le scroll est possible
  const canScroll = scrollInfo.scrollHeight > scrollInfo.clientHeight;

  // Mettre à jour les infos de scroll
  const updateScrollInfo = useCallback(() => {
    if (containerRef.current) {
      setScrollInfo({
        scrollTop: containerRef.current.scrollTop,
        scrollHeight: containerRef.current.scrollHeight,
        clientHeight: containerRef.current.clientHeight,
      });
    }
  }, [containerRef]);

  // Observer les changements de scroll et de taille
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateScrollInfo();

    const handleScroll = () => updateScrollInfo();
    container.addEventListener('scroll', handleScroll);

    // Observer les changements de taille du contenu
    const resizeObserver = new ResizeObserver(() => {
      updateScrollInfo();
    });
    resizeObserver.observe(container);

    // Observer les mutations du DOM (ajout/suppression d'éléments)
    const mutationObserver = new MutationObserver(() => {
      setTimeout(updateScrollInfo, 100);
    });
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef, updateScrollInfo]);

  // Gérer le clic sur la track
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !trackRef.current) return;
    
    const trackRect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;
    const clickRatio = clickY / trackRect.height;
    
    containerRef.current.scrollTop = clickRatio * maxScrollTop;
  };

  // Gérer le drag du thumb
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartScrollTop(containerRef.current?.scrollTop || 0);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !trackRef.current) return;
      
      const deltaY = e.clientY - dragStartY;
      const trackHeight = trackRef.current.clientHeight;
      const scrollRatio = deltaY / (trackHeight - thumbHeight);
      
      containerRef.current.scrollTop = dragStartScrollTop + scrollRatio * maxScrollTop;
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
  }, [isDragging, dragStartY, dragStartScrollTop, containerRef, maxScrollTop, thumbHeight]);

  // Boutons haut/bas
  const scrollUp = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop -= 100;
    }
  };

  const scrollDown = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop += 100;
    }
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`} style={{ width: '20px' }}>
      {/* Bouton Haut */}
      <button
        onClick={scrollUp}
        disabled={!canScroll || scrollInfo.scrollTop <= 0}
        className="w-5 h-5 flex items-center justify-center rounded bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
        title="Remonter"
      >
        ▲
      </button>

      {/* Track de l'ascenseur */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="flex-1 w-3 bg-gray-200 rounded-full relative cursor-pointer min-h-[100px]"
        style={{ 
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.2)',
          border: '1px solid #CBD5E1'
        }}
      >
        {/* Thumb (curseur) */}
        <div
          onMouseDown={handleThumbMouseDown}
          className={`absolute left-0 right-0 rounded-full transition-colors cursor-grab ${
            isDragging ? 'bg-blue-700 cursor-grabbing' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          style={{
            top: `${thumbTop}px`,
            height: `${thumbHeight}px`,
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.4)',
          }}
        />
      </div>

      {/* Bouton Bas */}
      <button
        onClick={scrollDown}
        disabled={!canScroll || scrollInfo.scrollTop >= maxScrollTop}
        className="w-5 h-5 flex items-center justify-center rounded bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
        title="Descendre"
      >
        ▼
      </button>
    </div>
  );
};

export default CustomScrollbar;
