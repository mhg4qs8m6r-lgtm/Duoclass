import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Maximize2, Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, RotateCw, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { formatDuration } from '@/lib/videoUtils';
import { useLanguage } from '@/contexts/LanguageContext';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  initialRotation?: number;
  onRotationChange?: (rotation: number) => void;
}

export function VideoPlayerModal({ 
  isOpen, 
  onClose, 
  videoUrl, 
  title, 
  initialRotation = 0,
  onRotationChange 
}: VideoPlayerModalProps) {
  const { t, language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  // Normaliser la rotation à 0, 90, 180 ou 270
  const normalizeRotation = (r: number) => ((r % 360) + 360) % 360;
  const [rotation, setRotation] = useState(normalizeRotation(initialRotation));
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchroniser la rotation avec la prop initialRotation (normalisée)
  useEffect(() => {
    setRotation(normalizeRotation(initialRotation));
  }, [initialRotation]);

  // Réinitialiser l'état d'erreur quand l'URL change
  useEffect(() => {
    setVideoError(null);
    setIsBuffering(false);
  }, [videoUrl]);

  // Gérer la rotation (sans couper le son)
  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    if (onRotationChange) {
      onRotationChange(newRotation);
    }
    // Ne pas toucher à la lecture - la rotation est purement visuelle
  };

  // Gérer la lecture/pause
  const togglePlay = () => {
    if (videoRef.current && !videoError) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error("Erreur de lecture:", err);
          setVideoError(language === 'fr' ? "Impossible de lire cette vidéo. Le format n'est peut-être pas supporté par votre navigateur." : "Unable to play this video. The format may not be supported by your browser.");
        });
      }
    }
  };

  // Gérer le mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Gérer le plein écran
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Gérer le changement de position
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Avancer/reculer de 10 secondes
  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  // Gérer le changement de volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  // Masquer les contrôles après inactivité
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Mettre à jour le temps courant et gérer les événements vidéo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsBuffering(false);
    };
    const handleCanPlay = () => {
      setIsBuffering(false);
    };
    const handleCanPlayThrough = () => {
      setIsBuffering(false);
    };
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (video) {
        video.currentTime = 0;
        setCurrentTime(0);
      }
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      const videoElement = e.target as HTMLVideoElement;
      const error = videoElement.error;
      console.error("Erreur vidéo:", error);
      
      let errorMessage = language === 'fr' ? "Erreur de lecture vidéo" : "Video playback error";
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = language === 'fr' ? "La lecture a été interrompue" : "Playback was interrupted";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = language === 'fr' ? "Erreur réseau lors du chargement" : "Network error during loading";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = language === 'fr' ? "Erreur de décodage - format non supporté" : "Decoding error - unsupported format";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = language === 'fr' ? "Format vidéo non supporté par votre navigateur" : "Video format not supported by your browser";
            break;
        }
      }
      setVideoError(errorMessage);
      setIsBuffering(false);
    };
    const handleWaiting = () => {
      setIsBuffering(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
    };
  }, [isPlaying]);

  // Réinitialiser quand la modale s'ouvre
  useEffect(() => {
    if (isOpen && videoRef.current) {
      setIsPlaying(false);
      setCurrentTime(0);
      setVideoError(null);
      setIsBuffering(false);
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  }, [isOpen, videoUrl]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'r':
          e.preventDefault();
          handleRotate();
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, isFullscreen, rotation, onClose]);

  // Fonction de fermeture explicite
  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Arrêter la vidéo avant de fermer
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-[90vw] max-h-[90vh] w-full h-full flex flex-col p-0 bg-black border-none [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header avec bouton fermer - TOUJOURS VISIBLE */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex justify-between items-center">
            <h2 className="text-white text-lg font-medium truncate pr-4">{title}</h2>
            <button
              onClick={handleClose}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-colors pointer-events-auto cursor-pointer"
              title={t('common.closeEsc')}
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Zone vidéo */}
        <div 
          className="flex-1 flex items-center justify-center relative cursor-pointer overflow-hidden"
          onClick={togglePlay}
          onMouseMove={handleMouseMove}
        >
          {/* Message d'erreur */}
          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <p className="text-white text-lg text-center px-8">{videoError}</p>
              <p className="text-gray-400 text-sm mt-2 text-center px-8">
                {language === 'fr' ? 'Essayez de convertir la vidéo en MP4 (H.264) pour une meilleure compatibilité.' : 'Try converting the video to MP4 (H.264) for better compatibility.'}
              </p>
              <button
                onClick={handleClose}
                className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Indicateur de buffering - seulement pendant le chargement */}
          {isBuffering && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-white/50 border-t-white"></div>
            </div>
          )}

          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full transition-transform duration-300"
            style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
            playsInline
            preload="metadata"
            onDurationChange={() => {
              if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
                setDuration(videoRef.current.duration);
              }
            }}
          />

          {/* Bouton play/pause central (visible quand en pause) */}
          {!isPlaying && !videoError && !isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 rounded-full p-6">
                <Play className="w-16 h-16 text-white fill-white" />
              </div>
            </div>
          )}

          {/* Indicateur de rotation */}
          {rotation !== 0 && (
            <div className="absolute top-16 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm z-40">
              {rotation}°
            </div>
          )}
        </div>

        {/* Contrôles */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 z-40 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Barre de progression */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
              style={{
                background: `linear-gradient(to right, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%)`
              }}
            />
          </div>

          {/* Boutons de contrôle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                className="text-white hover:text-blue-400 transition-colors" 
                disabled={!!videoError}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
              </button>

              {/* Reculer 10s */}
              <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white hover:text-blue-400 transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Avancer 10s */}
              <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white hover:text-blue-400 transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Temps */}
              <span className="text-white text-sm">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Rotation */}
              <button 
                onClick={(e) => { e.stopPropagation(); handleRotate(); }} 
                className="text-white hover:text-blue-400 transition-colors"
                title={`Rotation (${rotation}° → ${(rotation + 90) % 360}°) - Touche R`}
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {/* Plein écran */}
              <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:text-blue-400 transition-colors" title={t('common.fullscreen')}>
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Indication ESC pour sortir du plein écran */}
          {isFullscreen && (
            <div className="text-center mt-2 text-white/70 text-xs">
              {language === 'fr' ? <>Appuyez sur <kbd className="bg-white/20 px-2 py-0.5 rounded text-white">ESC</kbd> pour sortir du plein écran</> : <>Press <kbd className="bg-white/20 px-2 py-0.5 rounded text-white">ESC</kbd> to exit full screen</>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
