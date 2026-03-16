import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import useTouchGestures from "@/hooks/useTouchGestures";

interface DiaporamaProps {
  photos: { url: string; title: string }[];
  startIndex?: number;
  onClose: () => void;
}

export default function Diaporama({ photos, startIndex = 0, onClose }: DiaporamaProps) {
  const { t, language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(5);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Zoom state
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  const goToPrevious = useCallback(() => {
    if (zoom > 1) return; // Don't navigate when zoomed
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [photos.length, zoom]);

  const goToNext = useCallback(() => {
    if (zoom > 1) return; // Don't navigate when zoomed
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [photos.length, zoom]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
    setIsPlaying(false); // Stop slideshow when zooming
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Touch gestures
  const { touchHandlers } = useTouchGestures({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    onPinchIn: handleZoomOut,
    onPinchOut: handleZoomIn,
    onDoubleTap: () => {
      if (zoom > 1) {
        resetZoom();
      } else {
        handleZoomIn();
      }
    },
    swipeThreshold: 50,
    pinchThreshold: 0.15,
  });

  // Pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      lastPosition.current = { ...position };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      setPosition({
        x: lastPosition.current.x + deltaX,
        y: lastPosition.current.y + deltaY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan when zoomed
  const handleTouchPan = useCallback((e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      const touch = e.touches[0];
      if (!isDragging) {
        setIsDragging(true);
        dragStart.current = { x: touch.clientX, y: touch.clientY };
        lastPosition.current = { ...position };
      } else {
        const deltaX = touch.clientX - dragStart.current.x;
        const deltaY = touch.clientY - dragStart.current.y;
        setPosition({
          x: lastPosition.current.x + deltaX,
          y: lastPosition.current.y + deltaY,
        });
      }
    }
  }, [zoom, isDragging, position]);

  useEffect(() => {
    if (!isPlaying || zoom > 1) return;
    const timer = setInterval(() => goToNext(), duration * 1000);
    return () => clearInterval(timer);
  }, [isPlaying, duration, goToNext, zoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft": goToPrevious(); break;
        case "ArrowRight": goToNext(); break;
        case " ": e.preventDefault(); togglePlay(); break;
        case "Escape": 
          if (zoom > 1) {
            resetZoom();
          } else if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
          } else {
            onClose(); 
          }
          break;
        case "f":
        case "F": 
          e.preventDefault();
          toggleFullscreen(); 
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
          e.preventDefault();
          handleZoomOut();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext, togglePlay, toggleFullscreen, onClose, zoom, resetZoom, handleZoomIn, handleZoomOut]);

  // Écouter les changements de plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let hideTimer: NodeJS.Timeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setShowControls(false), 3000);
    };
    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, []);

  // Reset zoom when changing photo
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  if (photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div 
      className="fixed inset-0 bg-black z-[9999] flex items-center justify-center overflow-hidden touch-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowControls(true);
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      {...touchHandlers}
      onTouchMove={(e) => {
        touchHandlers.onTouchMove(e);
        if (zoom > 1) handleTouchPan(e);
      }}
      onTouchEnd={(e) => {
        touchHandlers.onTouchEnd(e);
        setIsDragging(false);
      }}
    >
      <img
        src={currentPhoto.url}
        alt={currentPhoto.title}
        className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
        style={{
          transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        draggable={false}
      />

      {/* Swipe indicators (visible on touch devices) */}
      {zoom === 1 && (
        <>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none md:hidden">
            <ChevronLeft className="w-12 h-12" />
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none md:hidden">
            <ChevronRight className="w-12 h-12" />
          </div>
        </>
      )}

      {/* Zoom indicator */}
      {zoom > 1 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-white text-sm">
          {Math.round(zoom * 100)}%
        </div>
      )}

      <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}>
        {/* Top right controls */}
        <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            className="w-12 h-12 bg-black/50 hover:bg-black/70 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            title={language === 'fr' ? "Zoom arrière (-)" : "Zoom out (-)"}
            disabled={zoom <= 1}
            style={{ opacity: zoom <= 1 ? 0.5 : 1 }}
          >
            <ZoomOut className="w-6 h-6" />
          </button>
          <button
            onClick={handleZoomIn}
            className="w-12 h-12 bg-black/50 hover:bg-black/70 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            title={language === 'fr' ? "Zoom avant (+)" : "Zoom in (+)"}
            disabled={zoom >= 4}
            style={{ opacity: zoom >= 4 ? 0.5 : 1 }}
          >
            <ZoomIn className="w-6 h-6" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-12 h-12 bg-black/50 hover:bg-black/70 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            title={isFullscreen ? (language === 'fr' ? "Quitter le plein écran (F)" : "Exit fullscreen (F)") : (language === 'fr' ? "Plein écran (F)" : "Fullscreen (F)")}
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-black/50 hover:bg-black/70 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            title={t('common.closeEsc')}
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Title bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-6 py-2 rounded-full pointer-events-auto">
          <span className="text-white text-lg font-medium">{currentPhoto.title}</span>
          <span className="text-white/70 text-sm ml-3">{currentIndex + 1} / {photos.length}</span>
        </div>

        {/* Navigation controls - larger for touch */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
          <button
            onClick={goToPrevious}
            className="w-14 h-14 md:w-16 md:h-16 bg-black/50 hover:bg-black/70 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            title={t('common.previousPhoto')}
            disabled={zoom > 1}
            style={{ opacity: zoom > 1 ? 0.5 : 1 }}
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 md:w-20 md:h-20 bg-white/90 hover:bg-white active:bg-gray-200 rounded-full flex items-center justify-center text-black transition-colors shadow-lg"
            title={isPlaying ? (language === 'fr' ? "Pause (Espace)" : "Pause (Space)") : (language === 'fr' ? "Lecture (Espace)" : "Play (Space)")}
          >
            {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10" /> : <Play className="w-8 h-8 md:w-10 md:h-10 ml-1" />}
          </button>

          <button
            onClick={goToNext}
            className="w-14 h-14 md:w-16 md:h-16 bg-black/50 hover:bg-black/70 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors"
            title={t('common.nextPhoto')}
            disabled={zoom > 1}
            style={{ opacity: zoom > 1 ? 0.5 : 1 }}
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
          </button>
        </div>

        {/* Duration slider - hidden on mobile when zoomed */}
        <div className={`absolute bottom-8 right-8 bg-black/50 px-4 py-3 rounded-lg flex items-center gap-3 pointer-events-auto ${zoom > 1 ? 'hidden md:flex' : ''}`}>
          <span className="text-white text-sm whitespace-nowrap">{language === 'fr' ? 'Durée :' : 'Duration:'}</span>
          <Slider
            value={[duration]}
            onValueChange={(val) => setDuration(val[0])}
            min={2}
            max={10}
            step={1}
            className="w-24"
          />
          <span className="text-white text-sm font-bold w-8">{duration}s</span>
        </div>

        {/* Photo dots - larger for touch */}
        {photos.length <= 20 && zoom === 1 && (
          <div className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 pointer-events-auto">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all ${
                  index === currentIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60 active:bg-white/80"
                }`}
                title={`Photo ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Touch hint - shown only on mobile */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs md:hidden pointer-events-none">
          {zoom > 1 ? (language === 'fr' ? "Pincez pour dézoomer • Double-tap pour réinitialiser" : "Pinch to zoom out • Double-tap to reset") : (language === 'fr' ? "Glissez pour naviguer • Double-tap pour zoomer" : "Swipe to navigate • Double-tap to zoom")}
        </div>
      </div>
    </div>
  );
}
