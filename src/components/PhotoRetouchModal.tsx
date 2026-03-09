import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Wand2, Sliders, Undo, X, ChevronLeft, Check, Settings2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PhotoRetouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (newImageUrl: string) => void;
  onOpenAdvanced?: () => void; // Pour ouvrir la page de retouche avancée avec les 12 fonctions
}

export default function PhotoRetouchModal({ isOpen, onClose, imageSrc, onSave, onOpenAdvanced }: PhotoRetouchModalProps) {
  const { language } = useLanguage();
  const [mode, setMode] = useState<'ai' | 'manual' | null>(null);
  const [brightness, setBrightness] = useState([100]);
  const [contrast, setContrast] = useState([100]);
  const [saturation, setSaturation] = useState([100]);
  const [exposure, setExposure] = useState([100]);
  const [whiteBalance, setWhiteBalance] = useState([100]);
  const [rotation, setRotation] = useState([0]);
  const [blur, setBlur] = useState([0]);
  const [sharpness, setSharpness] = useState([100]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [displayLayout, setDisplayLayout] = useState<'vertical' | 'horizontal'>('vertical');
  
  // États pour afficher/masquer les réglages avancés
  const [showExposure, setShowExposure] = useState(false);
  const [showWhiteBalance, setShowWhiteBalance] = useState(false);
  const [showRotation, setShowRotation] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const [showSharpness, setShowSharpness] = useState(false);

  const handleAiEnhance = () => {
    setIsProcessing(true);
    // Simulation du traitement IA
    setTimeout(() => {
      // Appliquer une amélioration automatique
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        if (ctx) {
          ctx.filter = 'contrast(1.15) saturate(1.2) brightness(1.05)';
          ctx.drawImage(img, 0, 0);
          setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
        }
        setIsProcessing(false);
      };
      
      img.onerror = () => {
        setPreviewUrl(imageSrc);
        setIsProcessing(false);
      };
      
      img.src = imageSrc;
    }, 1000);
  };

  const handleSave = () => {
    // Si mode manuel, appliquer les filtres avant de sauvegarder
    if (mode === 'manual') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculer les dimensions avec rotation
        const angle = rotation[0] * Math.PI / 180;
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));
        const newWidth = img.width * cos + img.height * sin;
        const newHeight = img.width * sin + img.height * cos;
        
        canvas.width = rotation[0] !== 0 ? newWidth : img.width;
        canvas.height = rotation[0] !== 0 ? newHeight : img.height;
        
        if (ctx) {
          // Appliquer la rotation
          if (rotation[0] !== 0) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(angle);
            ctx.translate(-img.width / 2, -img.height / 2);
          }
          
          // Construire le filtre CSS
          // Exposition = brightness supplémentaire
          const exposureFactor = exposure[0] / 100;
          const brightnessFactor = brightness[0] / 100;
          const combinedBrightness = brightnessFactor * exposureFactor;
          
          // Balance des blancs = sepia + hue-rotate (simulation)
          const wbOffset = (whiteBalance[0] - 100) / 100;
          const sepiaAmount = Math.abs(wbOffset) * 0.3;
          const hueRotate = wbOffset * 30; // -30 à +30 degrés
          
          // Nettete via contrast léger
          const sharpnessBoost = 1 + (sharpness[0] - 100) / 500;
          
          let filterString = `brightness(${combinedBrightness}) contrast(${(contrast[0] / 100) * sharpnessBoost}) saturate(${saturation[0]}%)`;
          
          if (wbOffset !== 0) {
            filterString += ` sepia(${sepiaAmount}) hue-rotate(${hueRotate}deg)`;
          }
          
          if (blur[0] > 0) {
            filterString += ` blur(${blur[0]}px)`;
          }
          
          ctx.filter = filterString;
          ctx.drawImage(img, 0, 0);
          onSave(canvas.toDataURL('image/jpeg', 0.92));
        }
        resetState();
      };
      
      img.src = imageSrc;
    } else {
      onSave(previewUrl || imageSrc);
      resetState();
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const resetState = () => {
    setMode(null);
    setBrightness([100]);
    setContrast([100]);
    setSaturation([100]);
    setExposure([100]);
    setWhiteBalance([100]);
    setRotation([0]);
    setBlur([0]);
    setSharpness([100]);
    setShowExposure(false);
    setShowWhiteBalance(false);
    setShowRotation(false);
    setShowBlur(false);
    setShowSharpness(false);
    setPreviewUrl(null);
    setIsProcessing(false);
  };

  const handleOpenAdvanced = () => {
    // Appeler directement la fonction qui gère tout
    if (onOpenAdvanced) {
      onOpenAdvanced();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Wand2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <DialogTitle>{language === "fr" ? "Studio de Retouche" : "Editing Studio"}</DialogTitle>
              <DialogDescription>{language === "fr" ? "Améliorez vos photos avec l'IA ou manuellement" : "Enhance your photos with AI or manually"}</DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2" 
                  onClick={() => {
                    setPreviewUrl(null);
                    setBrightness([100]);
                    setContrast([100]);
                    setSaturation([100]);
                    setExposure([100]);
                    setWhiteBalance([100]);
                    setRotation([0]);
                    setBlur([0]);
                    setSharpness([100]);
                    setZoomLevel(100);
                    // Si mode IA, relancer l'amélioration
                    if (mode === 'ai') {
                      handleAiEnhance();
                    }
                  }}
                >
                  <Undo className="w-4 h-4" /> Rétablir
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Contenu Principal */}
        {!mode ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full p-8">
              {/* Option Retouche IA */}
              <button 
                onClick={() => {
                  setMode('ai');
                  handleAiEnhance();
                }}
                className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-purple-500 hover:shadow-xl transition-all group"
              >
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wand2 className="w-10 h-10 text-purple-600" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">{language === "fr" ? "Retouche Magique IA" : "AI Magic Editing"}</h3>
                  <p className="text-sm text-gray-500">{language === "fr" ? "Laissez l'IA sublimer votre photo automatiquement." : "Let AI automatically enhance your photo."}</p>
                </div>
              </button>

              {/* Option Réglages Manuels */}
              <button 
                onClick={() => setMode('manual')}
                className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all group"
              >
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sliders className="w-10 h-10 text-blue-600" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">{language === "fr" ? "Retouches Manuelles" : "Manual Editing"}</h3>
                  <p className="text-sm text-gray-500">{language === "fr" ? "Ajustez luminosité, contraste et couleurs." : "Adjust brightness, contrast and colors."}</p>
                </div>
              </button>

              {/* Option Retouche Avancée (12 fonctions) */}
              {onOpenAdvanced && (
                <button 
                  onClick={handleOpenAdvanced}
                  className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-green-500 hover:shadow-xl transition-all group"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Settings2 className="w-10 h-10 text-green-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">{language === "fr" ? "Retouche Avancée" : "Advanced Editing"}</h3>
                    <p className="text-sm text-gray-500">{language === "fr" ? "12 fonctions professionnelles de retouche." : "12 professional editing functions."}</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Outils */}
            <div className="w-80 bg-white border-r flex flex-col overflow-y-auto shrink-0">
              <div className="p-4 border-b">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 text-gray-600"
                  onClick={() => {
                    setMode(null);
                    setPreviewUrl(null);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Changer de mode
                </Button>
              </div>

              <div className="p-6 space-y-8">
                {mode === 'ai' ? (
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                        <Wand2 className="w-4 h-4" />
                        Amélioration Auto
                      </h4>
                      <p className="text-sm text-purple-700">
                        L'IA a analysé votre photo et optimisé les couleurs et la netteté.
                      </p>
                    </div>
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={handleAiEnhance}
                      disabled={isProcessing}
                    >
                      {isProcessing ? language === 'fr' ? 'Traitement...' : 'Processing...' : language === 'fr' ? 'Régénérer' : 'Regenerate'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <Label>{language === "fr" ? "Luminosité" : "Brightness"}</Label>
                        <span className="text-sm text-gray-500">{brightness}%</span>
                      </div>
                      <Slider 
                        value={brightness} 
                        onValueChange={setBrightness} 
                        min={0} 
                        max={200} 
                        step={1} 
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <Label>{language === "fr" ? "Contraste" : "Contrast"}</Label>
                        <span className="text-sm text-gray-500">{contrast}%</span>
                      </div>
                      <Slider 
                        value={contrast} 
                        onValueChange={setContrast} 
                        min={0} 
                        max={200} 
                        step={1} 
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <Label>{language === "fr" ? "Saturation" : "Saturation"}</Label>
                        <span className="text-sm text-gray-500">{saturation}%</span>
                      </div>
                      <Slider 
                        value={saturation} 
                        onValueChange={setSaturation} 
                        min={0} 
                        max={200} 
                        step={1} 
                      />
                    </div>

                    {/* Réglages avancés */}
                    <div className="pt-4 border-t border-gray-200 space-y-4">
                      {/* Exposition */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>{language === "fr" ? "Exposition" : "Exposure"}</Label>
                          <span className="text-sm text-gray-500">{exposure}%</span>
                        </div>
                        <Slider 
                          value={exposure} 
                          onValueChange={setExposure} 
                          min={50} 
                          max={150} 
                          step={1} 
                        />
                      </div>

                      {/* Balance des blancs */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>{language === "fr" ? "Balance des blancs" : "White balance"}</Label>
                          <span className="text-sm text-gray-500">{whiteBalance[0] < 100 ? language === 'fr' ? 'Froid' : 'Cool' : whiteBalance[0] > 100 ? language === 'fr' ? 'Chaud' : 'Warm' : language === 'fr' ? 'Neutre' : 'Neutral'}</span>
                        </div>
                        <Slider 
                          value={whiteBalance} 
                          onValueChange={setWhiteBalance} 
                          min={50} 
                          max={150} 
                          step={1} 
                        />
                      </div>

                      {/* Rotation / Redressement */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>{language === "fr" ? "Cadrage et redressement" : "Framing and straightening"}</Label>
                          <span className="text-sm text-gray-500">{rotation}°</span>
                        </div>
                        <Slider 
                          value={rotation} 
                          onValueChange={setRotation} 
                          min={-45} 
                          max={45} 
                          step={1} 
                        />
                      </div>

                      {/* Flou d'arrière-plan */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>{language === "fr" ? "Ajustage du fonds (flou)" : "Background adjustment (blur)"}</Label>
                          <span className="text-sm text-gray-500">{blur}px</span>
                        </div>
                        <Slider 
                          value={blur} 
                          onValueChange={setBlur} 
                          min={0} 
                          max={10} 
                          step={0.5} 
                        />
                      </div>

                      {/* Netteté */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>{language === "fr" ? "Netteté" : "Sharpness"}</Label>
                          <span className="text-sm text-gray-500">{sharpness}%</span>
                        </div>
                        <Slider 
                          value={sharpness} 
                          onValueChange={setSharpness} 
                          min={50} 
                          max={200} 
                          step={1} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto p-4 border-t bg-gray-50">
                <Button className="w-full gap-2" size="lg" onClick={handleSave}>
                  <Check className="w-5 h-5" />
                  Valider et Enregistrer
                </Button>
              </div>
            </div>

            {/* Zone de Prévisualisation */}
            <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden relative">
              {/* Barre de contrôles : Zoom + Disposition */}
              <div className="flex items-center justify-center gap-4 py-2 bg-white/80 border-b border-gray-200">
                {/* Contrôle de zoom */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Zoom :</span>
                  <button 
                    onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                    className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="25"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-24 accent-purple-600"
                  />
                  <button 
                    onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                    className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold"
                  >
                    +
                  </button>
                  <span className="text-sm font-semibold text-purple-600 w-10">{zoomLevel}%</span>
                </div>

                {/* Séparateur */}
                <div className="w-px h-6 bg-gray-300" />

                {/* Bouton de basculement Vertical/Horizontal */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Disposition :</span>
                  <button
                    onClick={() => setDisplayLayout(displayLayout === 'vertical' ? 'horizontal' : 'vertical')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      displayLayout === 'vertical' 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {displayLayout === 'vertical' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        Vertical
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        Horizontal
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Zone d'images avec scroll */}
              <div className="flex-1 overflow-auto p-4">
                {displayLayout === 'vertical' ? (
                  /* Affichage Vertical */
                  <div className="flex flex-col gap-4 items-center">
                    {/* Image Originale */}
                    <div className="flex flex-col items-center gap-2 w-full">
                      <span className="text-sm font-semibold text-gray-600 bg-white px-4 py-1.5 rounded-full shadow-sm">Original</span>
                      <div className="relative shadow-xl rounded-lg overflow-hidden border-2 border-gray-300">
                        <img 
                          src={imageSrc} 
                          alt="Original" 
                          className="object-contain"
                          style={{ maxWidth: '100%', maxHeight: `${zoomLevel * 2.5}px` }}
                        />
                      </div>
                    </div>

                    {/* Séparateur avec flèche */}
                    <div className="flex items-center justify-center py-1">
                      <span className="text-3xl text-purple-400">↓</span>
                    </div>

                    {/* Image Retouchée */}
                    <div className="flex flex-col items-center gap-2 w-full">
                      <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-4 py-1.5 rounded-full shadow-sm">{language === 'fr' ? 'Retouche' : 'Retouch'}</span>
                      <div className="relative shadow-xl rounded-lg overflow-hidden border-2 border-purple-400">
                        {isProcessing && (
                          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                              <span className="font-medium text-purple-900">{language === 'fr' ? 'Amélioration en cours...' : 'Enhancement in progress...'}</span>
                            </div>
                          </div>
                        )}
                        <img 
                          src={previewUrl || imageSrc} 
                          alt={language === 'fr' ? 'Retouche' : 'Retouch'} 
                          className="object-contain"
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: `${zoomLevel * 2.5}px`,
                            ...(mode === 'manual' ? {
                              filter: `brightness(${(brightness[0] / 100) * (exposure[0] / 100) * 100}%) contrast(${(contrast[0] / 100) * (1 + (sharpness[0] - 100) / 500) * 100}%) saturate(${saturation}%)${whiteBalance[0] !== 100 ? ` sepia(${Math.abs(whiteBalance[0] - 100) / 100 * 0.3}) hue-rotate(${(whiteBalance[0] - 100) / 100 * 30}deg)` : ''}${blur[0] > 0 ? ` blur(${blur[0]}px)` : ''}`,
                              transform: `rotate(${rotation}deg)`
                            } : {})
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Affichage Horizontal */
                  <div className="flex gap-6 items-start justify-center h-full">
                    {/* Image Originale */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-semibold text-gray-600 bg-white px-4 py-1.5 rounded-full shadow-sm">Original</span>
                      <div className="relative shadow-xl rounded-lg overflow-hidden border-2 border-gray-300">
                        <img 
                          src={imageSrc} 
                          alt="Original" 
                          className="object-contain"
                          style={{ maxHeight: `${zoomLevel * 3}px`, maxWidth: 'none' }}
                        />
                      </div>
                    </div>

                    {/* Séparateur avec flèche */}
                    <div className="flex items-center justify-center self-center">
                      <span className="text-3xl text-purple-400">→</span>
                    </div>

                    {/* Image Retouchée */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-4 py-1.5 rounded-full shadow-sm">{language === 'fr' ? 'Retouche' : 'Retouch'}</span>
                      <div className="relative shadow-xl rounded-lg overflow-hidden border-2 border-purple-400">
                        {isProcessing && (
                          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                              <span className="font-medium text-purple-900">{language === 'fr' ? 'Amélioration en cours...' : 'Enhancement in progress...'}</span>
                            </div>
                          </div>
                        )}
                        <img 
                          src={previewUrl || imageSrc} 
                          alt={language === 'fr' ? 'Retouche' : 'Retouch'} 
                          className="object-contain"
                          style={{ 
                            maxHeight: `${zoomLevel * 3}px`, 
                            maxWidth: 'none',
                            ...(mode === 'manual' ? {
                              filter: `brightness(${(brightness[0] / 100) * (exposure[0] / 100) * 100}%) contrast(${(contrast[0] / 100) * (1 + (sharpness[0] - 100) / 500) * 100}%) saturate(${saturation}%)${whiteBalance[0] !== 100 ? ` sepia(${Math.abs(whiteBalance[0] - 100) / 100 * 0.3}) hue-rotate(${(whiteBalance[0] - 100) / 100 * 30}deg)` : ''}${blur[0] > 0 ? ` blur(${blur[0]}px)` : ''}`,
                              transform: `rotate(${rotation}deg)`
                            } : {})
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
