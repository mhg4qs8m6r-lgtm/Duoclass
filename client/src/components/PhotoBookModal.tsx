import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PhotoFrame } from '@/types/photo';
import { Book, Monitor, Printer, ChevronLeft, ChevronRight, Play, Pause, Maximize, X, Minimize } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Types pour le livre photo
export type PhotoBookMode = 'digital' | 'printable';
export type PhotosPerPage = 1 | 2 | 3 | 4;
export type PageFormat = 'A4' | 'A5' | 'square';
export type TransitionType = 'fade' | 'slide' | 'zoom' | 'flip' | 'bookFlip';

interface PhotoBookPage {
  photos: PhotoFrame[];
  caption?: string;
}

interface PhotoBookConfig {
  mode: PhotoBookMode;
  title: string;
  subtitle?: string;
  photosPerPage: PhotosPerPage;
  format: PageFormat;
  showCaptions: boolean;
  showDates: boolean;
  coverPhoto?: PhotoFrame;
  transition: TransitionType;
}

interface PhotoBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotos: PhotoFrame[];
  albumName: string;
}

export default function PhotoBookModal({ isOpen, onClose, selectedPhotos, albumName }: PhotoBookModalProps) {
  const { language } = useLanguage();
  // Étapes : 1=choix du mode, 2=configuration, 3=prévisualisation
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Configuration du livre
  const [config, setConfig] = useState<PhotoBookConfig>({
    mode: 'digital',
    title: albumName || 'Mon Livre Photo',
    subtitle: '',
    photosPerPage: 1,
    format: 'A4',
    showCaptions: true,
    showDates: true,
    coverPhoto: selectedPhotos[0] || undefined,
    transition: 'fade'
  });

  // État pour la présentation numérique
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideInterval, setSlideInterval] = useState(5); // secondes
  
  // État pour les transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const [displayedPage, setDisplayedPage] = useState(0);
  
  // Ref pour le conteneur plein écran
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // Générer les pages du livre
  const generatePages = (): PhotoBookPage[] => {
    const pages: PhotoBookPage[] = [];
    const photos = selectedPhotos.filter(p => p.photoUrl && !p.isVideo);
    
    for (let i = 0; i < photos.length; i += config.photosPerPage) {
      const pagePhotos = photos.slice(i, i + config.photosPerPage);
      pages.push({
        photos: pagePhotos,
        caption: pagePhotos.map(p => p.title || '').filter(Boolean).join(' • ')
      });
    }
    
    return pages;
  };

  const pages = generatePages();
  const totalPages = pages.length + 1; // +1 pour la couverture

  // Gestion des transitions
  const changePage = (newPage: number, direction: 'next' | 'prev') => {
    if (isTransitioning || newPage < 0 || newPage >= totalPages) return;
    
    setTransitionDirection(direction);
    setIsTransitioning(true);
    
    // Après la moitié de la transition, changer la page affichée
    setTimeout(() => {
      setDisplayedPage(newPage);
      setCurrentPage(newPage);
    }, 300);
    
    // Fin de la transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  // Auto-play pour la présentation numérique
  // Utiliser useRef pour éviter les problèmes de closure avec currentPage
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  
  const totalPagesRef = useRef(totalPages);
  totalPagesRef.current = totalPages;
  
  const isTransitioningRef = useRef(isTransitioning);
  isTransitioningRef.current = isTransitioning;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isPlaying && step === 3 && config.mode === 'digital') {
      timer = setInterval(() => {
        // Vérifier si une transition est en cours
        if (isTransitioningRef.current) return;
        
        const current = currentPageRef.current;
        const total = totalPagesRef.current;
        
        // Passer à la page suivante ou revenir au début
        const nextPage = current < total - 1 ? current + 1 : 0;
        
        setTransitionDirection('next');
        setIsTransitioning(true);
        
        setTimeout(() => {
          setDisplayedPage(nextPage);
          setCurrentPage(nextPage);
        }, 300);
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, 600);
        
      }, slideInterval * 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, step, config.mode, slideInterval]);

  // Navigation
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      changePage(currentPage + 1, 'next');
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 0) {
      changePage(currentPage - 1, 'prev');
    }
  };

  // Gestion du plein écran natif
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      try {
        if (fullscreenRef.current?.requestFullscreen) {
          await fullscreenRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } catch (e) {
        // Fallback si le plein écran natif échoue
        setIsFullscreen(true);
      }
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      } catch (e) {
        setIsFullscreen(false);
      }
    }
  };

  // Écouter les changements de plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Raccourcis clavier en mode présentation
  useEffect(() => {
    if (step !== 3 || config.mode !== 'digital') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goToNextPage();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevPage();
          break;
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          }
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'p':
        case 'P':
          setIsPlaying(!isPlaying);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, config.mode, currentPage, isFullscreen, isPlaying]);

  // Générer le PDF
  const generatePDF = async () => {
    toast.info(language === "fr" ? "Génération du PDF en cours..." : "Generating PDF...");
    
    try {
      const { jsPDF } = await import('jspdf');
      
      // Dimensions selon le format
      const dimensions: Record<PageFormat, [number, number]> = {
        'A4': [210, 297],
        'A5': [148, 210],
        'square': [200, 200]
      };
      
      const [width, height] = dimensions[config.format];
      const pdf = new jsPDF({
        orientation: config.format === 'square' ? 'portrait' : 'portrait',
        unit: 'mm',
        format: config.format === 'square' ? [width, height] : config.format.toLowerCase() as 'a4' | 'a5'
      });

      // Page de couverture
      pdf.setFillColor(200, 30, 60); // Rouge bordeaux
      pdf.rect(0, 0, width, height, 'F');
      
      // Titre sur la couverture
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.text(config.title, width / 2, height / 3, { align: 'center' });
      
      if (config.subtitle) {
        pdf.setFontSize(16);
        pdf.text(config.subtitle, width / 2, height / 3 + 15, { align: 'center' });
      }

      // Photo de couverture si disponible
      if (config.coverPhoto?.photoUrl) {
        try {
          const imgData = config.coverPhoto.photoUrl;
          const imgWidth = width * 0.6;
          const imgHeight = imgWidth * 0.75;
          pdf.addImage(imgData, 'JPEG', (width - imgWidth) / 2, height / 2, imgWidth, imgHeight);
        } catch (e) {
          console.error('Erreur ajout image couverture:', e);
        }
      }

      // Pages de contenu
      for (let i = 0; i < pages.length; i++) {
        pdf.addPage();
        const page = pages[i];
        
        // Fond blanc
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, width, height, 'F');
        
        // Numéro de page
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(10);
        pdf.text(`${i + 1}`, width / 2, height - 10, { align: 'center' });

        // Disposition des photos selon photosPerPage
        const margin = 15;
        const availableWidth = width - (margin * 2);
        const availableHeight = height - (margin * 2) - 20;

        if (config.photosPerPage === 1 && page.photos[0]?.photoUrl) {
          try {
            const imgData = page.photos[0].photoUrl;
            const imgSize = Math.min(availableWidth, availableHeight * 0.8);
            pdf.addImage(imgData, 'JPEG', (width - imgSize) / 2, margin, imgSize, imgSize * 0.75);
            
            if (config.showCaptions && page.photos[0].title) {
              pdf.setTextColor(80, 80, 80);
              pdf.setFontSize(12);
              pdf.text(page.photos[0].title, width / 2, height - margin - 15, { align: 'center' });
            }
            
            if (config.showDates && page.photos[0].date) {
              pdf.setTextColor(120, 120, 120);
              pdf.setFontSize(9);
              pdf.text(page.photos[0].date, width / 2, height - margin - 5, { align: 'center' });
            }
          } catch (e) {
            console.error('Erreur ajout image:', e);
          }
        } else if (config.photosPerPage === 2) {
          const photoWidth = (availableWidth - 10) / 2;
          const photoHeight = photoWidth * 0.75;
          
          page.photos.forEach((photo, idx) => {
            if (photo.photoUrl) {
              try {
                const x = margin + (idx * (photoWidth + 10));
                pdf.addImage(photo.photoUrl, 'JPEG', x, margin + 30, photoWidth, photoHeight);
                
                if (config.showCaptions && photo.title) {
                  pdf.setTextColor(80, 80, 80);
                  pdf.setFontSize(9);
                  pdf.text(photo.title, x + photoWidth / 2, margin + 30 + photoHeight + 8, { align: 'center', maxWidth: photoWidth });
                }
              } catch (e) {
                console.error('Erreur ajout image:', e);
              }
            }
          });
        } else if (config.photosPerPage === 4) {
          const photoWidth = (availableWidth - 10) / 2;
          const photoHeight = (availableHeight - 30) / 2;
          
          page.photos.forEach((photo, idx) => {
            if (photo.photoUrl) {
              try {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const x = margin + (col * (photoWidth + 10));
                const y = margin + (row * (photoHeight + 15));
                pdf.addImage(photo.photoUrl, 'JPEG', x, y, photoWidth, photoHeight * 0.8);
                
                if (config.showCaptions && photo.title) {
                  pdf.setTextColor(80, 80, 80);
                  pdf.setFontSize(8);
                  pdf.text(photo.title, x + photoWidth / 2, y + photoHeight * 0.8 + 6, { align: 'center', maxWidth: photoWidth });
                }
              } catch (e) {
                console.error('Erreur ajout image:', e);
              }
            }
          });
        }
      }

      // Télécharger le PDF
      const fileName = `${config.title.replace(/[^a-zA-Z0-9]/g, '_')}_livre_photo.pdf`;
      pdf.save(fileName);
      
      toast.success(language === "fr" ? "Livre photo PDF généré avec succès !" : "Photo book PDF generated successfully!");
      onClose();
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error(language === "fr" ? "Erreur lors de la génération du PDF" : "Error generating PDF");
    }
  };

  // Classes CSS pour les transitions
  const getTransitionClasses = () => {
    const baseClasses = "transition-all ease-in-out";
    
    // Durée plus longue pour bookFlip
    const duration = config.transition === 'bookFlip' ? 'duration-700' : 'duration-500';
    
    if (!isTransitioning) return `${baseClasses} ${duration}`;
    
    switch (config.transition) {
      case 'fade':
        return `${baseClasses} ${duration} ${isTransitioning ? 'opacity-0' : 'opacity-100'}`;
      case 'slide':
        if (transitionDirection === 'next') {
          return `${baseClasses} ${duration} ${isTransitioning ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`;
        } else {
          return `${baseClasses} ${duration} ${isTransitioning ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`;
        }
      case 'zoom':
        return `${baseClasses} ${duration} ${isTransitioning ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`;
      case 'flip':
        return `${baseClasses} ${duration}`;
      case 'bookFlip':
        return `${baseClasses} ${duration}`;
      default:
        return `${baseClasses} ${duration}`;
    }
  };

  // Style inline pour les transformations 3D (bookFlip et flip)
  const getTransformStyle = (): React.CSSProperties => {
    if (config.transition === 'bookFlip') {
      return {
        transformStyle: 'preserve-3d',
        perspective: '1500px',
        transform: isTransitioning 
          ? (transitionDirection === 'next' 
              ? 'rotateY(-90deg) scale(0.95)' 
              : 'rotateY(90deg) scale(0.95)')
          : 'rotateY(0deg) scale(1)',
        transformOrigin: transitionDirection === 'next' ? 'left center' : 'right center',
        backfaceVisibility: 'hidden'
      };
    }
    if (config.transition === 'flip') {
      return {
        perspective: '1000px',
        transform: isTransitioning ? 'rotateY(90deg)' : 'rotateY(0deg)'
      };
    }
    return {};
  };

  // Rendu de la page de prévisualisation
  const renderPageContent = (page: PhotoBookPage) => {
    const gridClass = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-2',
      4: 'grid-cols-2'
    }[config.photosPerPage];

    return (
      <div className={`grid ${gridClass} gap-4 w-full h-full p-4`}>
        {page.photos.map((photo, idx) => (
          <div key={idx} className="relative flex flex-col items-center justify-center">
            <img 
              src={photo.photoUrl || ''} 
              alt={photo.title || `Photo ${idx + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{ 
                maxHeight: config.photosPerPage === 1 ? '65vh' : config.photosPerPage === 2 ? '45vh' : '30vh'
              }}
            />
            {config.showCaptions && photo.title && (
              <p className="mt-3 text-center text-white font-medium text-lg drop-shadow-lg">{photo.title}</p>
            )}
            {config.showDates && photo.date && (
              <p className="text-center text-white/80 text-sm">{photo.date}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Rendu selon l'étape
  const renderStep = () => {
    switch (step) {
      case 1:
        // Choix du mode
        return (
          <div className="space-y-6">
            <p className="text-gray-600 text-center">
              {language === 'fr' ? <>{selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} sélectionnée{selectedPhotos.length > 1 ? 's' : ''}</> : <>{selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} selected</>}
            </p>
            
            <RadioGroup 
              value={config.mode} 
              onValueChange={(v) => setConfig({...config, mode: v as PhotoBookMode})}
              className="grid grid-cols-2 gap-4"
            >
              <div className={`relative flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all ${config.mode === 'digital' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <RadioGroupItem value="digital" id="digital" className="sr-only" />
                <label htmlFor="digital" className="cursor-pointer text-center">
                  <Monitor className="w-16 h-16 mx-auto mb-3 text-blue-600" />
                  <h3 className="font-bold text-lg">{language === 'fr' ? 'Présentation Numérique' : 'Digital Presentation'}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    {language === 'fr' ? 'Diaporama élégant avec transitions, navigation et mode plein écran' : 'Elegant slideshow with transitions, navigation and fullscreen mode'}
                  </p>
                </label>
              </div>
              
              <div className={`relative flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all ${config.mode === 'printable' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <RadioGroupItem value="printable" id="printable" className="sr-only" />
                <label htmlFor="printable" className="cursor-pointer text-center">
                  <Printer className="w-16 h-16 mx-auto mb-3 text-green-600" />
                  <h3 className="font-bold text-lg">Livre Imprimable</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    {language === 'fr' ? "Génère un PDF haute qualité prêt pour l'impression" : 'Generates a high quality PDF ready for printing'}
                  </p>
                </label>
              </div>
            </RadioGroup>
          </div>
        );

      case 2:
        // Configuration
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Titre du livre</Label>
                <Input 
                  id="title"
                  value={config.title}
                  onChange={(e) => setConfig({...config, title: e.target.value})}
                  placeholder="Mon Livre Photo"
                />
              </div>
              <div>
                <Label htmlFor="subtitle">Sous-titre (optionnel)</Label>
                <Input 
                  id="subtitle"
                  value={config.subtitle}
                  onChange={(e) => setConfig({...config, subtitle: e.target.value})}
                  placeholder="Vacances 2025"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'fr' ? 'Photos par page' : 'Photos per page'}</Label>
                <Select 
                  value={String(config.photosPerPage)} 
                  onValueChange={(v) => setConfig({...config, photosPerPage: Number(v) as PhotosPerPage})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 photo par page</SelectItem>
                    <SelectItem value="2">{language === 'fr' ? '2 photos par page' : '2 photos per page'}</SelectItem>
                    <SelectItem value="4">{language === 'fr' ? '4 photos par page' : '4 photos per page'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {config.mode === 'printable' && (
                <div>
                  <Label>{language === "fr" ? "Format" : "Format"}</Label>
                  <Select 
                    value={config.format} 
                    onValueChange={(v) => setConfig({...config, format: v as PageFormat})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (21 x 29,7 cm)</SelectItem>
                      <SelectItem value="A5">A5 (14,8 x 21 cm)</SelectItem>
                      <SelectItem value="square">{language === 'fr' ? 'Carré (20 x 20 cm)' : 'Square (20 x 20 cm)'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {config.mode === 'digital' && (
                <div>
                  <Label>Type de transition</Label>
                  <Select 
                    value={config.transition} 
                    onValueChange={(v) => setConfig({...config, transition: v as TransitionType})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fondu</SelectItem>
                      <SelectItem value="slide">Glissement</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="bookFlip">{language === 'fr' ? 'Page tournée' : 'Page flip'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {config.mode === 'digital' && (
                <div>
                  <Label>{language === 'fr' ? 'Durée par page (secondes)' : 'Duration per page (seconds)'}</Label>
                  <Select 
                    value={String(slideInterval)} 
                    onValueChange={(v) => setSlideInterval(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 secondes</SelectItem>
                      <SelectItem value="5">5 secondes</SelectItem>
                      <SelectItem value="8">8 secondes</SelectItem>
                      <SelectItem value="10">10 secondes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showCaptions}
                  onChange={(e) => setConfig({...config, showCaptions: e.target.checked})}
                  className="w-4 h-4"
                />
                <span>{language === 'fr' ? 'Afficher les légendes' : 'Show captions'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showDates}
                  onChange={(e) => setConfig({...config, showDates: e.target.checked})}
                  className="w-4 h-4"
                />
                <span>Afficher les dates</span>
              </label>
            </div>

            {/* Sélection photo de couverture */}
            <div>
              <Label>Photo de couverture</Label>
              <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                {selectedPhotos.filter(p => p.photoUrl && !p.isVideo).slice(0, 8).map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setConfig({...config, coverPhoto: photo})}
                    className={`shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${config.coverPhoto?.id === photo.id ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}`}
                  >
                    <img src={photo.photoUrl || ''} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-600">
              {language === 'fr' ? <><strong>Aperçu :</strong> {pages.length} page{pages.length > 1 ? 's' : ''} + couverture avec {config.photosPerPage} photo{config.photosPerPage > 1 ? 's' : ''} par page.</> : <><strong>Preview:</strong> {pages.length} page{pages.length > 1 ? 's' : ''} + cover with {config.photosPerPage} photo{config.photosPerPage > 1 ? 's' : ''} per page.</>}
            </div>
          </div>
        );

      case 3:
        // Prévisualisation
        if (config.mode === 'digital') {
          return (
            <div 
              ref={fullscreenRef}
              className={`relative ${isFullscreen ? 'fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-gray-800 to-black' : ''}`}
            >
              {/* Contrôles en haut */}
              <div className={`absolute top-4 right-4 z-20 flex gap-2`}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleFullscreen}
                  className="bg-white/90 hover:bg-white shadow-lg"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
                {isFullscreen && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsFullscreen(false);
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      }
                    }}
                    className="bg-white/90 hover:bg-white shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Contenu de la page avec transitions */}
              <div 
                className={`flex flex-col items-center justify-center ${isFullscreen ? 'h-screen' : 'min-h-[450px]'} ${!isFullscreen ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 rounded-lg' : ''} overflow-hidden`}
              >
                <div 
                  className={`w-full h-full flex items-center justify-center ${getTransitionClasses()}`}
                  style={getTransformStyle()}
                >
                  {displayedPage === 0 ? (
                    // Page de couverture
                    <div className="text-center p-8">
                      <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">{config.title}</h1>
                      {config.subtitle && <p className="text-2xl text-white/80 mb-8">{config.subtitle}</p>}
                      {config.coverPhoto?.photoUrl && (
                        <img 
                          src={config.coverPhoto.photoUrl} 
                          alt="Couverture" 
                          className="max-w-lg max-h-72 mx-auto rounded-xl shadow-2xl border-4 border-white/20"
                        />
                      )}
                    </div>
                  ) : (
                    pages[displayedPage - 1] && renderPageContent(pages[displayedPage - 1])
                  )}
                </div>
              </div>

              {/* Navigation en bas */}
              <div className={`flex items-center justify-center gap-4 ${isFullscreen ? 'absolute bottom-8 left-0 right-0' : 'mt-4'}`}>
                <Button 
                  variant="outline" 
                  onClick={goToPrevPage} 
                  disabled={currentPage === 0 || isTransitioning}
                  className="bg-white/90 hover:bg-white shadow-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <Button 
                  variant={isPlaying ? "destructive" : "default"}
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-6 shadow-lg"
                >
                  {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  {isPlaying ? 'Pause' : 'Lecture'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={goToNextPage} 
                  disabled={currentPage >= totalPages - 1 || isTransitioning}
                  className="bg-white/90 hover:bg-white shadow-lg disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
                
                <span className={`text-sm ml-4 ${isFullscreen ? 'text-white' : 'text-gray-600'} bg-black/30 px-3 py-1 rounded-full`}>
                  {currentPage === 0 ? 'Couverture' : `Page ${currentPage}`} / {totalPages - 1}
                </span>
              </div>

              {/* Indicateur de transition - sous les boutons de navigation */}
              {config.mode === 'digital' && (
                <div className={`text-xs text-center mt-2 ${isFullscreen ? 'text-white/50' : 'text-gray-400'}`}>
                  {language === 'fr' ? 'Transition' : 'Transition'} : {config.transition === 'fade' ? (language === 'fr' ? 'Fondu' : 'Fade') : config.transition === 'slide' ? (language === 'fr' ? 'Glissement' : 'Slide') : config.transition === 'zoom' ? 'Zoom' : config.transition === 'bookFlip' ? (language === 'fr' ? 'Page tournée' : 'Page flip') : (language === 'fr' ? 'Retournement' : 'Flip')}
                  {' • '}
                  <span className="text-[10px] sm:text-xs">← → (nav) • Espace • F • P</span>
                </div>
              )}
            </div>
          );
        } else {
          // Mode imprimable - aperçu avant génération PDF
          return (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-6 text-center">
                <Book className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h3 className="text-xl font-bold mb-2">{config.title}</h3>
                {config.subtitle && <p className="text-gray-600 mb-4">{config.subtitle}</p>}
                <div className="text-sm text-gray-500 space-y-1">
                  <p>{language === 'fr' ? 'Format' : 'Format'} : {config.format}</p>
                  <p>{pages.length} page{pages.length > 1 ? 's' : ''} + {language === 'fr' ? 'couverture' : 'cover'}</p>
                  <p>{selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button onClick={generatePDF} className="bg-green-600 hover:bg-green-700 px-8">
                  <Printer className="w-5 h-5 mr-2" />
                  {language === 'fr' ? 'Générer le PDF' : 'Generate PDF'}
                </Button>
              </div>
            </div>
          );
        }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${step === 3 && config.mode === 'digital' && isFullscreen ? 'max-w-full h-full p-0' : 'max-w-2xl'}`}>
        {!(step === 3 && isFullscreen) && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="w-6 h-6 text-red-600" />
              {language === 'fr' ? 'Créer un Livre Photo' : 'Create a Photo Book'}
              {step > 1 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - {language === 'fr' ? 'Étape' : 'Step'} {step}/3
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
        )}

        <div className={`${step === 3 && isFullscreen ? '' : 'py-4'}`}>
          {renderStep()}
        </div>

        {!(step === 3 && isFullscreen) && (
          <DialogFooter className="flex justify-between">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Button>
              {step < 3 && (
                <Button onClick={() => setStep((step + 1) as 2 | 3)}>
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 3 && config.mode === 'digital' && (
                <Button variant="ghost" onClick={onClose}>{language === 'fr' ? 'Fermer' : 'Close'}</Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
