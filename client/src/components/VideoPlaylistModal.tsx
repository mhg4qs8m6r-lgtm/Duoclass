import { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoFrame } from '@/types/photo';
import { formatDuration } from '@/lib/videoUtils';
import { useLanguage } from '@/contexts/LanguageContext';

interface VideoPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: PhotoFrame[];
  startIndex?: number;
  albumName?: string;
}

export default function VideoPlaylistModal({
  isOpen,
  onClose,
  videos,
  startIndex = 0,
  albumName = "Album"
}: VideoPlaylistModalProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentVideo = videos[currentIndex];

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isOpen, startIndex]);

  // Auto-play when video changes
  useEffect(() => {
    if (videoRef.current && isOpen) {
      videoRef.current.load();
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentIndex, isOpen]);

  // Handle video end - play next
  const handleVideoEnd = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    } else {
      // End of playlist
      setIsPlaying(false);
    }
  };

  // Play/Pause toggle
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Previous video
  const playPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    }
  };

  // Next video
  const playNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Update time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Update duration
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            playPrevious();
          } else if (videoRef.current) {
            videoRef.current.currentTime -= 10;
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            playNext();
          } else if (videoRef.current) {
            videoRef.current.currentTime += 10;
          }
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'l':
          setShowPlaylist(!showPlaylist);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, isFullscreen, showPlaylist, currentIndex]);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!isOpen || !currentVideo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex" ref={containerRef}>
      {/* Main video area */}
      <div className={`flex-1 flex flex-col ${showPlaylist ? 'mr-80' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 text-white">
          <div>
            <h2 className="text-xl font-bold">{albumName}</h2>
            <p className="text-gray-400 text-sm">
              Vidéo {currentIndex + 1} sur {videos.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="text-white hover:bg-white/10"
              title={t('common.togglePlaylist')}
            >
              <List className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Video container */}
        <div className="flex-1 flex items-center justify-center px-4 pb-4 relative">
          <video
            ref={videoRef}
            src={currentVideo.imageData}
            className="max-h-full max-w-full rounded-lg"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={() => {
              if (videoRef.current && videoRef.current.duration) {
                setDuration(videoRef.current.duration);
              }
            }}
            onEnded={handleVideoEnd}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlay}
            preload="metadata"
          />
          
          {/* Bouton Play central (visible quand en pause) */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <div className="bg-black/60 rounded-full p-6 hover:bg-black/70 transition-colors">
                <Play className="w-16 h-16 text-white fill-white" />
              </div>
            </div>
          )}
        </div>

        {/* Video title */}
        <div className="text-center text-white mb-2">
          <h3 className="text-lg font-medium">{currentVideo.label || `Vidéo ${currentIndex + 1}`}</h3>
        </div>

        {/* Controls */}
        <div className="p-4 bg-black/50">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-white text-sm w-16 text-right">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-white text-sm w-16">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={playPrevious}
              disabled={currentIndex === 0}
              className="text-white hover:bg-white/10 disabled:opacity-30"
              title={t('common.previousVideo')}
            >
              <SkipBack className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/10 w-14 h-14"
              title={t('common.playPause')}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={playNext}
              disabled={currentIndex === videos.length - 1}
              className="text-white hover:bg-white/10 disabled:opacity-30"
              title={t('common.nextVideo')}
            >
              <SkipForward className="w-6 h-6" />
            </Button>

            <div className="w-px h-8 bg-gray-600 mx-2" />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/10"
              title={t('common.mute')}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10"
              title={t('common.fullscreen')}
            >
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Playlist sidebar */}
      {showPlaylist && (
        <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-bold">Playlist</h3>
            <p className="text-gray-400 text-sm">{videos.length} vidéos</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {videos.map((video, index) => (
              <div
                key={video.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsPlaying(true);
                }}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                  index === currentIndex
                    ? 'bg-blue-600/30 border-l-4 border-blue-500'
                    : 'hover:bg-gray-800'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-800">
                  {video.imageData && (
                    <img
                      src={video.imageData}
                      alt={video.label || `Vidéo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {index === currentIndex && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                  {video.videoDuration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                      {formatDuration(video.videoDuration)}
                    </span>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${
                    index === currentIndex ? 'text-white font-medium' : 'text-gray-300'
                  }`}>
                    {video.label || `Vidéo ${index + 1}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    #{index + 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs">
        Espace: Lecture/Pause | ←→: ±10s | Shift+←→: Vidéo précédente/suivante | M: Muet | F: Plein écran | L: Playlist
      </div>
    </div>
  );
}
