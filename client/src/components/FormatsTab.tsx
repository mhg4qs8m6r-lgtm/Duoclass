import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Frame,
  ZoomIn,
  ZoomOut,
  Grid,
  Ruler,
  Download,
  RotateCcw,
  RotateCw,
  Move,
  Image as ImageIcon,
  Crosshair,
  Magnet,
  Eye,
  EyeOff,
  Crop,
  Check,
  X,
  Trash2,
  GripVertical,
  GripHorizontal,
  Lock,
  Unlock,
  Square,
  RectangleHorizontal,
  Settings,
  Palette,
  Wrench,
  Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { CollageElement } from "./CreationsAtelier";
import { toast } from "sonner";

interface FormatsTabProps {
  collageElements: CollageElement[];
  onUpdateElements: (elements: CollageElement[]) => void;
  selectedPhotos?: { id: number; photoUrl: string; title?: string }[];
  onCollageGenerated?: (imageData: string) => void;
}

// Formats papier photo standard (en cm)
const PHOTO_FORMATS = [
  { id: "10x15", width: 10, height: 15, name: { fr: "10 × 15 cm", en: "4 × 6 in" }, inchWidth: 4, inchHeight: 6 },
  { id: "13x18", width: 13, height: 18, name: { fr: "13 × 18 cm", en: "5 × 7 in" }, inchWidth: 5, inchHeight: 7 },
  { id: "18x24", width: 18, height: 24, name: { fr: "18 × 24 cm", en: "7 × 9.5 in" }, inchWidth: 7, inchHeight: 9.5 },
  { id: "20x25", width: 20, height: 25, name: { fr: "20 × 25 cm", en: "8 × 10 in" }, inchWidth: 8, inchHeight: 10 },
  { id: "24x30", width: 24, height: 29.7, name: { fr: "24 × 29,7 cm", en: "9.5 × 11.7 in" }, inchWidth: 9.5, inchHeight: 11.7 },
];

// Conversion pixels par cm (pour l'affichage à l'écran)
const BASE_PX_PER_CM = 37.8; // ~96 DPI

export default function FormatsTab({
  collageElements,
  onUpdateElements,
  selectedPhotos = [],
  onCollageGenerated,
}: FormatsTabProps) {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // États
  const [selectedFormat, setSelectedFormat] = useState<string>("10x15");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [zoom, setZoom] = useState(100); // Pourcentage de zoom
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false); // Aimantation à la grille
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [imageRotation, setImageRotation] = useState(0); // Rotation de l'image en degrés
  const [previewMode, setPreviewMode] = useState(false); // Mode aperçu final
  const [cropMode, setCropMode] = useState(false); // Mode recadrage
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false); // En train de dessiner la zone de crop
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropHandle, setCropHandle] = useState<string | null>(null); // Poignée de redimensionnement active
  const [isDraggingCrop, setIsDraggingCrop] = useState(false); // Déplacement de la zone de crop
  
  // État pour le drag de l'image
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  
  // État pour le crosshair (lignes de repère)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  
  // État pour les guides permanents
  const [permanentGuides, setPermanentGuides] = useState<{ type: 'horizontal' | 'vertical'; position: number; id: string }[]>([]);
  const [isDraggingGuide, setIsDraggingGuide] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState(true);
  const [guidesLocked, setGuidesLocked] = useState(false); // Verrouillage des guides
  
  // Ratios de recadrage prédéfinis
  const [cropRatio, setCropRatio] = useState<string | null>(null); // null = libre, "1:1", "4:3", "16:9", "3:2"
  
  // Image sélectionnée
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Obtenir le format actuel
  const currentFormat = PHOTO_FORMATS.find(f => f.id === selectedFormat) || PHOTO_FORMATS[0];
  
  // Calculer les dimensions en pixels selon le zoom
  const getPixelDimensions = useCallback(() => {
    const format = currentFormat;
    const w = orientation === "portrait" ? format.width : format.height;
    const h = orientation === "portrait" ? format.height : format.width;
    const scale = zoom / 100;
    return {
      width: Math.round(w * BASE_PX_PER_CM * scale),
      height: Math.round(h * BASE_PX_PER_CM * scale),
      cmWidth: w,
      cmHeight: h,
      inchWidth: orientation === "portrait" ? format.inchWidth : format.inchHeight,
      inchHeight: orientation === "portrait" ? format.inchHeight : format.inchWidth,
    };
  }, [currentFormat, orientation, zoom]);
  
  // Dessiner le cadre avec grille
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dims = getPixelDimensions();
    canvas.width = dims.width;
    canvas.height = dims.height;
    
    // Fond blanc
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, dims.width, dims.height);
    
    // Dessiner l'image si présente
    if (selectedImage) {
      const img = new Image();
      img.onload = () => {
        // Calculer le positionnement de l'image avec rotation
        const scale = imageScale;
        const imgWidth = img.width * scale;
        const imgHeight = img.height * scale;
        const centerX = dims.width / 2 + imagePosition.x;
        const centerY = dims.height / 2 + imagePosition.y;
        
        // Appliquer la rotation
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((imageRotation * Math.PI) / 180);
        ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        ctx.restore();
        
        // Redessiner la grille par-dessus (sauf en mode aperçu)
        if (showGrid && !previewMode) {
          drawGrid(ctx, dims);
        }
      };
      img.src = selectedImage;
    } else if (showGrid && !previewMode) {
      drawGrid(ctx, dims);
    }
  }, [selectedFormat, orientation, zoom, showGrid, backgroundColor, selectedImage, imagePosition, imageScale, imageRotation, previewMode, getPixelDimensions]);
  
  // Fonction pour dessiner la grille
  const drawGrid = (ctx: CanvasRenderingContext2D, dims: { width: number; height: number; cmWidth: number; cmHeight: number }) => {
    const pxPerCm = dims.width / dims.cmWidth;
    const pxPerMm = pxPerCm / 10;
    
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 0.5;
    
    // Lignes verticales (mm)
    for (let mm = 0; mm <= dims.cmWidth * 10; mm++) {
      const x = mm * pxPerMm;
      const isCm = mm % 10 === 0;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dims.height);
      
      if (isCm) {
        ctx.strokeStyle = "#999999";
        ctx.lineWidth = 1;
      } else if (mm % 5 === 0) {
        ctx.strokeStyle = "#bbbbbb";
        ctx.lineWidth = 0.75;
      } else {
        ctx.strokeStyle = "#dddddd";
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();
    }
    
    // Lignes horizontales (mm)
    for (let mm = 0; mm <= dims.cmHeight * 10; mm++) {
      const y = mm * pxPerMm;
      const isCm = mm % 10 === 0;
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.width, y);
      
      if (isCm) {
        ctx.strokeStyle = "#999999";
        ctx.lineWidth = 1;
      } else if (mm % 5 === 0) {
        ctx.strokeStyle = "#bbbbbb";
        ctx.lineWidth = 0.75;
      } else {
        ctx.strokeStyle = "#dddddd";
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();
    }
  };
  
  // Gérer le zoom avec la molette
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoom(prev => Math.max(50, Math.min(300, prev + delta)));
  };
  
  // Gérer le drag de l'image
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedImage) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };
  
  // Fonction d'aimantation à la grille
  const snapPosition = useCallback((pos: { x: number; y: number }) => {
    if (!snapToGrid) return pos;
    
    const dims = getPixelDimensions();
    const pxPerCm = dims.width / dims.cmWidth;
    const pxPer5mm = pxPerCm / 2; // Aimantation aux 5mm
    
    // Arrondir aux 5mm les plus proches
    const snappedX = Math.round(pos.x / pxPer5mm) * pxPer5mm;
    const snappedY = Math.round(pos.y / pxPer5mm) * pxPer5mm;
    
    return { x: snappedX, y: snappedY };
  }, [snapToGrid, getPixelDimensions]);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    // Gérer le déplacement des guides permanents (seulement si non verrouillés)
    if (isDraggingGuide && canvasRef.current && !guidesLocked) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const guide = permanentGuides.find(g => g.id === isDraggingGuide);
      if (guide) {
        let newPosition: number;
        if (guide.type === 'horizontal') {
          newPosition = Math.max(0, Math.min(e.clientY - canvasRect.top, dims.height));
        } else {
          newPosition = Math.max(0, Math.min(e.clientX - canvasRect.left, dims.width));
        }
        setPermanentGuides(prev => prev.map(g => 
          g.id === isDraggingGuide ? { ...g, position: newPosition } : g
        ));
      }
      return;
    }
    
    // Mettre à jour la position du crosshair
    if (canvasContainerRef.current && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      let x = e.clientX - canvasRect.left;
      let y = e.clientY - canvasRect.top;
      
      // Appliquer l'aimantation au crosshair si activée
      if (snapToGrid) {
        const snapped = snapPosition({ x, y });
        x = snapped.x;
        y = snapped.y;
      }
      
      // Vérifier si la souris est dans le canvas
      if (x >= 0 && x <= canvasRect.width && y >= 0 && y <= canvasRect.height) {
        setMousePosition({ x, y });
      } else {
        setMousePosition(null);
      }
    }
    
    // Gérer le redimensionnement du crop
    if (cropHandle && cropArea && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;
      const minSize = 50;
      
      let newCrop = { ...cropArea };
      
      switch (cropHandle) {
        case "nw":
          newCrop.width = cropArea.x + cropArea.width - mouseX;
          newCrop.height = cropArea.y + cropArea.height - mouseY;
          newCrop.x = mouseX;
          newCrop.y = mouseY;
          break;
        case "ne":
          newCrop.width = mouseX - cropArea.x;
          newCrop.height = cropArea.y + cropArea.height - mouseY;
          newCrop.y = mouseY;
          break;
        case "sw":
          newCrop.width = cropArea.x + cropArea.width - mouseX;
          newCrop.height = mouseY - cropArea.y;
          newCrop.x = mouseX;
          break;
        case "se":
          newCrop.width = mouseX - cropArea.x;
          newCrop.height = mouseY - cropArea.y;
          break;
        case "n":
          newCrop.height = cropArea.y + cropArea.height - mouseY;
          newCrop.y = mouseY;
          break;
        case "s":
          newCrop.height = mouseY - cropArea.y;
          break;
        case "w":
          newCrop.width = cropArea.x + cropArea.width - mouseX;
          newCrop.x = mouseX;
          break;
        case "e":
          newCrop.width = mouseX - cropArea.x;
          break;
      }
      
      // Appliquer les contraintes de ratio si défini
      if (cropRatio) {
        const [ratioW, ratioH] = cropRatio.split(':').map(Number);
        const aspectRatio = ratioW / ratioH;
        
        // Ajuster selon la poignée utilisée
        if (['nw', 'ne', 'sw', 'se'].includes(cropHandle)) {
          // Coins: ajuster la hauteur en fonction de la largeur
          newCrop.height = newCrop.width / aspectRatio;
          if (cropHandle === 'nw' || cropHandle === 'ne') {
            newCrop.y = cropArea.y + cropArea.height - newCrop.height;
          }
        } else if (['n', 's'].includes(cropHandle)) {
          // Haut/Bas: ajuster la largeur en fonction de la hauteur
          newCrop.width = newCrop.height * aspectRatio;
          newCrop.x = cropArea.x + (cropArea.width - newCrop.width) / 2;
        } else if (['w', 'e'].includes(cropHandle)) {
          // Gauche/Droite: ajuster la hauteur en fonction de la largeur
          newCrop.height = newCrop.width / aspectRatio;
          newCrop.y = cropArea.y + (cropArea.height - newCrop.height) / 2;
        }
      }
      
      // Appliquer les contraintes de taille minimale
      if (newCrop.width >= minSize && newCrop.height >= minSize) {
        setCropArea(newCrop);
      }
      return;
    }
    
    // Gérer le déplacement du crop
    if (isDraggingCrop && cropArea && cropStart && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      let newX = e.clientX - canvasRect.left - cropStart.x;
      let newY = e.clientY - canvasRect.top - cropStart.y;
      
      // Contraindre aux limites du canvas
      newX = Math.max(0, Math.min(newX, canvasRect.width - cropArea.width));
      newY = Math.max(0, Math.min(newY, canvasRect.height - cropArea.height));
      
      setCropArea({ ...cropArea, x: newX, y: newY });
      return;
    }
    
    // Gérer le drag de l'image
    if (!isDragging) return;
    
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;
    
    // Appliquer l'aimantation au déplacement si activée
    if (snapToGrid) {
      const snapped = snapPosition({ x: newX, y: newY });
      newX = snapped.x;
      newY = snapped.y;
    }
    
    setImagePosition({ x: newX, y: newY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setCropHandle(null);
    setIsDraggingCrop(false);
    setCropStart(null);
    setIsDraggingGuide(null);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
    setMousePosition(null);
    setCropHandle(null);
    setIsDraggingCrop(false);
    setCropStart(null);
    setIsDraggingGuide(null);
  };
  
  // Sélectionner une photo
  const selectPhoto = (photoUrl: string) => {
    setSelectedImage(photoUrl);
    setImagePosition({ x: 0, y: 0 });
    
    // Calculer l'échelle initiale pour que l'image remplisse le cadre
    const img = new Image();
    img.onload = () => {
      const dims = getPixelDimensions();
      const scaleX = dims.width / img.width;
      const scaleY = dims.height / img.height;
      setImageScale(Math.max(scaleX, scaleY));
    };
    img.src = photoUrl;
  };
  
  // Exporter l'image
  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Créer un canvas haute résolution pour l'export (300 DPI)
    const exportCanvas = document.createElement("canvas");
    const dims = getPixelDimensions();
    const dpiScale = 300 / 96; // Conversion de 96 DPI écran à 300 DPI impression
    
    exportCanvas.width = dims.width * dpiScale;
    exportCanvas.height = dims.height * dpiScale;
    
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    
    ctx.scale(dpiScale, dpiScale);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, dims.width, dims.height);
    
    if (selectedImage) {
      const img = new Image();
      img.onload = () => {
        const scale = imageScale;
        const imgWidth = img.width * scale;
        const imgHeight = img.height * scale;
        const centerX = dims.width / 2 + imagePosition.x;
        const centerY = dims.height / 2 + imagePosition.y;
        
        // Appliquer la rotation pour l'export
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((imageRotation * Math.PI) / 180);
        ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        ctx.restore();
        
        // Télécharger
        const link = document.createElement("a");
        link.download = `photo_${currentFormat.id}_${Date.now()}.png`;
        link.href = exportCanvas.toDataURL("image/png");
        link.click();
        
        toast.success(language === "fr" ? "Image exportée en haute résolution (300 DPI)" : "Image exported in high resolution (300 DPI)");
      };
      img.src = selectedImage;
    } else {
      toast.error(language === "fr" ? "Aucune image à exporter" : "No image to export");
    }
  };
  
  // Rotation de l'image
  const rotateImage = (degrees: number) => {
    setImageRotation((prev) => (prev + degrees) % 360);
  };
  
  // Réinitialiser la position
  const resetPosition = () => {
    setImagePosition({ x: 0, y: 0 });
    setImageRotation(0);
    if (selectedImage) {
      const img = new Image();
      img.onload = () => {
        const dims = getPixelDimensions();
        const scaleX = dims.width / img.width;
        const scaleY = dims.height / img.height;
        setImageScale(Math.max(scaleX, scaleY));
      };
      img.src = selectedImage;
    }
  };
  
  const dims = getPixelDimensions();
  
  // Appliquer le recadrage
  const applyCrop = () => {
    if (!selectedImage || !cropArea || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Créer un canvas temporaire pour le recadrage
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropArea.width;
    tempCanvas.height = cropArea.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    
    // Copier la zone recadrée
    tempCtx.drawImage(
      canvas,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );
    
    // Convertir en data URL et mettre à jour l'image
    const croppedDataUrl = tempCanvas.toDataURL("image/png");
    setSelectedImage(croppedDataUrl);
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    setImageRotation(0);
    setCropMode(false);
    setCropArea(null);
    
    toast.success(language === "fr" ? "Image recadrée !" : "Image cropped!");
  };
  
  // Formater les dimensions pour l'affichage
  const formatDimension = (cm: number, inch: number) => {
    if (language === "fr") {
      return `${cm} cm`;
    } else {
      // Convertir en fractions pour les pouces
      const whole = Math.floor(inch);
      const frac = inch - whole;
      if (frac === 0) return `${whole}"`;
      if (Math.abs(frac - 0.5) < 0.01) return `${whole} 1/2"`;
      if (Math.abs(frac - 0.25) < 0.01) return `${whole} 1/4"`;
      if (Math.abs(frac - 0.75) < 0.01) return `${whole} 3/4"`;
      return `${inch.toFixed(1)}"`;
    }
  };
  
  // Calculer la position en cm/inch pour le crosshair
  const getCrosshairPosition = () => {
    if (!mousePosition) return null;
    const pxPerCm = dims.width / dims.cmWidth;
    const cmX = mousePosition.x / pxPerCm;
    const cmY = mousePosition.y / pxPerCm;
    const inchX = cmX / 2.54;
    const inchY = cmY / 2.54;
    return { cmX, cmY, inchX, inchY };
  };
  
  const crosshairPos = getCrosshairPosition();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        {/* Panneau de gauche - Options avec onglets */}
        <div className="w-72 border-r border-gray-200 flex flex-col">
          {/* Espace pour s'aligner avec la règle horizontale */}
          {showDimensions && !previewMode && <div className="h-10 shrink-0 border-b border-gray-200 bg-gray-50" />}
          
          <Tabs defaultValue="format" className="flex-1 flex flex-col min-h-0">
            {/* Onglets horizontaux */}
            <TabsList className="grid grid-cols-3 mx-2 mt-2 shrink-0">
              <TabsTrigger value="format" className="text-xs px-2">
                <Frame className="w-3 h-3 mr-1" />
                Format
              </TabsTrigger>
              <TabsTrigger value="affichage" className="text-xs px-2">
                <Eye className="w-3 h-3 mr-1" />
                {language === "fr" ? "Affichage" : "Display"}
              </TabsTrigger>
              <TabsTrigger value="image" className="text-xs px-2" disabled={!selectedImage}>
                <ImageIcon className="w-3 h-3 mr-1" />
                Image
              </TabsTrigger>
            </TabsList>
            
            {/* Contenu onglet Format */}
            <TabsContent value="format" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full p-3">
                <div className="space-y-4">
                  {/* Sélection du format */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      {language === "fr" ? "Format papier" : "Paper Format"}
                    </h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PHOTO_FORMATS.map((format) => (
                        <button
                          key={format.id}
                          onClick={() => setSelectedFormat(format.id)}
                          className={`p-2 rounded-lg border-2 transition-all text-left ${
                            selectedFormat === format.id
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {format.name[language as "fr" | "en"]}
                            </span>
                            <div 
                              className="w-6 h-8 border border-gray-400 rounded-sm bg-gray-100"
                              style={{ aspectRatio: `${format.width}/${format.height}` }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Orientation */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      {language === "fr" ? "Orientation" : "Orientation"}
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        variant={orientation === "portrait" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOrientation("portrait")}
                        className="flex-1"
                      >
                        {language === "fr" ? "Portrait" : "Portrait"}
                      </Button>
                      <Button
                        variant={orientation === "landscape" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOrientation("landscape")}
                        className="flex-1"
                      >
                        {language === "fr" ? "Paysage" : "Landscape"}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Zoom */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Zoom ({zoom}%)
                    </h4>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.max(50, prev - 10))}>
                        <ZoomOut className="w-3 h-3" />
                      </Button>
                      <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={50} max={300} step={10} className="flex-1" />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.min(300, prev + 10))}>
                        <ZoomIn className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Actions rapides */}
                  <div className="pt-2 space-y-2">
                    <Button variant="outline" className="w-full" size="sm" onClick={resetPosition}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Réinitialiser" : "Reset"}
                    </Button>
                    <Button className="w-full" size="sm" onClick={exportImage} disabled={!selectedImage}>
                      <Download className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Exporter (300 DPI)" : "Export (300 DPI)"}
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Contenu onglet Affichage */}
            <TabsContent value="affichage" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full p-3">
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {language === "fr" ? "Options d'affichage" : "Display Options"}
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-grid" className="text-sm flex items-center gap-2">
                      <Grid className="w-4 h-4" />
                      {language === "fr" ? "Grille" : "Grid"}
                    </Label>
                    <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-dims" className="text-sm flex items-center gap-2">
                      <Ruler className="w-4 h-4" />
                      {language === "fr" ? "Règles" : "Rulers"}
                    </Label>
                    <Switch id="show-dims" checked={showDimensions} onCheckedChange={setShowDimensions} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-crosshair" className="text-sm flex items-center gap-2">
                      <Crosshair className="w-4 h-4" />
                      {language === "fr" ? "Repères" : "Crosshair"}
                    </Label>
                    <Switch id="show-crosshair" checked={showCrosshair} onCheckedChange={setShowCrosshair} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="snap-grid" className="text-sm flex items-center gap-2">
                      <Magnet className="w-4 h-4" />
                      {language === "fr" ? "Aimantation" : "Snap"}
                    </Label>
                    <Switch id="snap-grid" checked={snapToGrid} onCheckedChange={setSnapToGrid} />
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      {language === "fr" ? "Guides permanents" : "Permanent Guides"}
                    </h4>
                    
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="show-guides" className="text-sm flex items-center gap-2">
                        <GripHorizontal className="w-4 h-4" />
                        {language === "fr" ? "Afficher" : "Show"}
                      </Label>
                      <Switch id="show-guides" checked={showGuides} onCheckedChange={setShowGuides} />
                    </div>
                    
                    {permanentGuides.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`flex-1 text-xs ${guidesLocked ? 'text-amber-600 border-amber-300 bg-amber-50' : ''}`}
                          onClick={() => setGuidesLocked(!guidesLocked)}
                        >
                          {guidesLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                          {guidesLocked ? (language === "fr" ? "Déverr." : "Unlock") : (language === "fr" ? "Verr." : "Lock")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setPermanentGuides([])}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          {language === "fr" ? `(${permanentGuides.length})` : `(${permanentGuides.length})`}
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {language === "fr" 
                        ? "Cliquez sur les règles pour ajouter des guides" 
                        : "Click on rulers to add guides"}
                    </p>
                  </div>
                  
                  {/* Mode Aperçu */}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <Button
                      variant={previewMode ? "default" : "outline"}
                      className="w-full"
                      size="sm"
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {previewMode 
                        ? (language === "fr" ? "Quitter l'aperçu" : "Exit preview")
                        : (language === "fr" ? "Aperçu final" : "Final preview")}
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Contenu onglet Image */}
            <TabsContent value="image" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full p-3">
                <div className="space-y-4">
                  {selectedImage ? (
                    <>
                      {/* Échelle */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                          {language === "fr" ? "Échelle" : "Scale"} ({Math.round(imageScale * 100)}%)
                        </h4>
                        <Slider
                          value={[imageScale * 100]}
                          onValueChange={([v]) => setImageScale(v / 100)}
                          min={10}
                          max={300}
                          step={5}
                        />
                      </div>
                      
                      {/* Rotation */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                          {language === "fr" ? "Rotation" : "Rotation"} ({imageRotation}°)
                        </h4>
                        <div className="flex gap-2 mb-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => rotateImage(-90)}>
                            <RotateCcw className="w-4 h-4 mr-1" /> -90°
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => rotateImage(90)}>
                            <RotateCw className="w-4 h-4 mr-1" /> +90°
                          </Button>
                        </div>
                        <Slider value={[imageRotation]} onValueChange={([v]) => setImageRotation(v)} min={-180} max={180} step={1} />
                      </div>
                      
                      {/* Recadrage */}
                      <div className="border-t border-gray-200 pt-3">
                        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                          {language === "fr" ? "Recadrage" : "Crop"}
                        </h4>
                        
                        {/* Ratios prédéfinis */}
                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          <Button variant={cropRatio === null ? "default" : "outline"} size="sm" onClick={() => setCropRatio(null)} className="text-xs">
                            {language === "fr" ? "Libre" : "Free"}
                          </Button>
                          <Button variant={cropRatio === "1:1" ? "default" : "outline"} size="sm" onClick={() => setCropRatio("1:1")} className="text-xs">
                            <Square className="w-3 h-3 mr-1" /> 1:1
                          </Button>
                          <Button variant={cropRatio === "4:3" ? "default" : "outline"} size="sm" onClick={() => setCropRatio("4:3")} className="text-xs">4:3</Button>
                          <Button variant={cropRatio === "3:2" ? "default" : "outline"} size="sm" onClick={() => setCropRatio("3:2")} className="text-xs">3:2</Button>
                          <Button variant={cropRatio === "16:9" ? "default" : "outline"} size="sm" onClick={() => setCropRatio("16:9")} className="text-xs">16:9</Button>
                          <Button variant={cropRatio === "9:16" ? "default" : "outline"} size="sm" onClick={() => setCropRatio("9:16")} className="text-xs">9:16</Button>
                        </div>
                        
                        <Button
                          variant={cropMode ? "default" : "outline"}
                          className={`w-full ${cropMode ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                          size="sm"
                          onClick={() => {
                            if (cropMode) {
                              setCropMode(false);
                              setCropArea(null);
                            } else {
                              setCropMode(true);
                              const dims = getPixelDimensions();
                              let cropWidth = dims.width * 0.8;
                              let cropHeight = dims.height * 0.8;
                              if (cropRatio) {
                                const [ratioW, ratioH] = cropRatio.split(':').map(Number);
                                const aspectRatio = ratioW / ratioH;
                                if (cropWidth / cropHeight > aspectRatio) {
                                  cropWidth = cropHeight * aspectRatio;
                                } else {
                                  cropHeight = cropWidth / aspectRatio;
                                }
                              }
                              setCropArea({
                                x: (dims.width - cropWidth) / 2,
                                y: (dims.height - cropHeight) / 2,
                                width: cropWidth,
                                height: cropHeight
                              });
                            }
                          }}
                        >
                          <Crop className="w-4 h-4 mr-2" />
                          {cropMode 
                            ? (language === "fr" ? "Annuler" : "Cancel")
                            : (language === "fr" ? "Recadrer" : "Crop")}
                        </Button>
                        
                        {cropMode && cropArea && (
                          <Button
                            variant="default"
                            className="w-full mt-2 bg-green-500 hover:bg-green-600"
                            size="sm"
                            onClick={applyCrop}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            {language === "fr" ? "Appliquer" : "Apply"}
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-8">
                      {language === "fr" 
                        ? "Sélectionnez une photo pour accéder aux options" 
                        : "Select a photo to access options"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Zone centrale - Canvas avec règles */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Règle horizontale */}
          {showDimensions && !previewMode && (
            <div 
              className="h-10 bg-gray-50 border-b border-gray-300 flex items-end justify-center relative ml-10 shrink-0 overflow-hidden cursor-crosshair hover:bg-cyan-50 transition-colors"
              onClick={(e) => {
                // Créer un guide vertical en cliquant sur la règle horizontale
                const rect = e.currentTarget.querySelector('div')?.getBoundingClientRect();
                if (rect) {
                  const x = e.clientX - rect.left;
                  if (x >= 0 && x <= dims.width) {
                    const newGuide = { type: 'vertical' as const, position: x, id: `v-${Date.now()}` };
                    setPermanentGuides(prev => [...prev, newGuide]);
                    toast.success(language === "fr" ? "Guide vertical ajouté" : "Vertical guide added");
                  }
                }
              }}
            >
              <div 
                className="relative h-full"
                style={{ width: dims.width }}
              >
                {/* Graduations cm avec nombres - positionnés en bas près de la zone de travail */}
                {Array.from({ length: Math.ceil(dims.cmWidth) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 flex flex-col-reverse items-center"
                    style={{ left: (i / dims.cmWidth) * 100 + "%" }}
                  >
                    <div className={`w-px ${i % 5 === 0 ? 'h-4 bg-gray-700' : 'h-2 bg-gray-400'}`} />
                    <span className="text-xs font-semibold text-gray-700 mt-0.5">
                      {i > 0 ? (language === "fr" ? i : (i * dims.inchWidth / dims.cmWidth).toFixed(1)) : ""}
                    </span>
                  </div>
                ))}
                {/* Graduations mm (petits traits entre les cm) */}
                {Array.from({ length: Math.ceil(dims.cmWidth) * 10 }).map((_, i) => {
                  if (i % 10 === 0) return null; // Skip cm marks
                  return (
                    <div
                      key={`mm-${i}`}
                      className="absolute bottom-0"
                      style={{ left: (i / (dims.cmWidth * 10)) * 100 + "%" }}
                    >
                      <div className={`w-px ${i % 5 === 0 ? 'h-2 bg-gray-400' : 'h-1 bg-gray-300'}`} />
                    </div>
                  );
                })}
                {/* Dimension totale */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white text-sm font-bold px-3 py-1 rounded shadow">
                  {formatDimension(dims.cmWidth, dims.inchWidth)}
                </div>
                {/* Indicateur de position du crosshair sur la règle horizontale */}
                {showCrosshair && mousePosition && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
                    style={{ left: mousePosition.x }}
                  />
                )}
              </div>
            </div>
          )}
          
          <div className="flex-1 flex min-h-0">
            {/* Règle verticale */}
            {showDimensions && !previewMode && (
              <div 
                className="w-10 bg-gray-50 border-r border-gray-300 flex items-center justify-end relative shrink-0 overflow-visible cursor-crosshair hover:bg-cyan-50 transition-colors"
                onClick={(e) => {
                  // Créer un guide horizontal en cliquant sur la règle verticale
                  const rect = e.currentTarget.querySelector('div')?.getBoundingClientRect();
                  if (rect) {
                    const y = e.clientY - rect.top;
                    if (y >= 0 && y <= dims.height) {
                      const newGuide = { type: 'horizontal' as const, position: y, id: `h-${Date.now()}` };
                      setPermanentGuides(prev => [...prev, newGuide]);
                      toast.success(language === "fr" ? "Guide horizontal ajouté" : "Horizontal guide added");
                    }
                  }
                }}
              >
                <div 
                  className="relative w-full"
                  style={{ height: dims.height }}
                >
                  {/* Graduations cm avec nombres - positionnés à droite près de la zone de travail */}
                  {Array.from({ length: Math.ceil(dims.cmHeight) + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute right-0 flex flex-row-reverse items-center"
                      style={{ top: (i / dims.cmHeight) * 100 + "%" }}
                    >
                      <div className={`h-px ${i % 5 === 0 ? 'w-4 bg-gray-700' : 'w-2 bg-gray-400'}`} />
                      <span className="text-xs font-semibold text-gray-700 ml-0.5">
                        {i > 0 ? (language === "fr" ? i : (i * dims.inchHeight / dims.cmHeight).toFixed(1)) : ""}
                      </span>
                    </div>
                  ))}
                  {/* Graduations mm (petits traits entre les cm) */}
                  {Array.from({ length: Math.ceil(dims.cmHeight) * 10 }).map((_, i) => {
                    if (i % 10 === 0) return null;
                    return (
                      <div
                        key={`mm-${i}`}
                        className="absolute right-0"
                        style={{ top: (i / (dims.cmHeight * 10)) * 100 + "%" }}
                      >
                        <div className={`h-px ${i % 5 === 0 ? 'w-2 bg-gray-400' : 'w-1 bg-gray-300'}`} />
                      </div>
                    );
                  })}
                  {/* Dimension totale */}
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-90 bg-purple-500 text-white text-sm font-bold px-3 py-1 rounded shadow whitespace-nowrap">
                    {formatDimension(dims.cmHeight, dims.inchHeight)}
                  </div>
                  {/* Indicateur de position du crosshair sur la règle verticale */}
                  {showCrosshair && mousePosition && (
                    <div 
                      className="absolute left-0 right-0 h-0.5 bg-red-500 pointer-events-none z-10"
                      style={{ top: mousePosition.y }}
                    />
                  )}
                </div>
              </div>
            )}
            
            {/* Zone de travail */}
            <div 
              ref={containerRef}
              className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-4"
              onWheel={handleWheel}
            >
              <div 
                ref={canvasContainerRef}
                className="relative"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {/* Canvas principal */}
                <canvas
                  ref={canvasRef}
                  className="shadow-lg cursor-move"
                  style={{
                    width: dims.width,
                    height: dims.height,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                />
                
                {/* Lignes de repère (crosshair) */}
                {showCrosshair && mousePosition && !previewMode && (
                  <>
                    {/* Ligne horizontale */}
                    <div 
                      className="absolute left-0 right-0 h-px bg-red-500 pointer-events-none"
                      style={{ top: mousePosition.y }}
                    />
                    {/* Ligne verticale */}
                    <div 
                      className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
                      style={{ left: mousePosition.x }}
                    />
                    {/* Indicateur de position */}
                    {crosshairPos && (
                      <div 
                        className="absolute bg-yellow-400 text-black text-xl font-bold px-4 py-2 rounded-lg shadow-2xl pointer-events-none whitespace-nowrap border-2 border-yellow-600"
                        style={{ 
                          left: mousePosition.x + 20, 
                          top: mousePosition.y + 20,
                          zIndex: 100
                        }}
                      >
                        {language === "fr" 
                          ? `${crosshairPos.cmX.toFixed(1)} × ${crosshairPos.cmY.toFixed(1)} cm`
                          : `${crosshairPos.inchX.toFixed(2)}" × ${crosshairPos.inchY.toFixed(2)}"`
                        }
                      </div>
                    )}
                  </>
                )}
                
                {/* Guides permanents */}
                {showGuides && !previewMode && permanentGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className={`absolute ${guide.type === 'horizontal' ? 'left-0 right-0 h-0.5' : 'top-0 bottom-0 w-0.5'} ${guidesLocked ? 'bg-amber-500 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400 cursor-ns-resize'} ${guide.type === 'vertical' && !guidesLocked ? 'cursor-ew-resize' : ''} z-20 group`}
                    style={guide.type === 'horizontal' ? { top: guide.position } : { left: guide.position }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (!guidesLocked) {
                        setIsDraggingGuide(guide.id);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!guidesLocked) {
                        setPermanentGuides(prev => prev.filter(g => g.id !== guide.id));
                        toast.success(language === "fr" ? "Guide supprimé" : "Guide removed");
                      } else {
                        toast.info(language === "fr" ? "Guides verrouillés" : "Guides locked");
                      }
                    }}
                  >
                    {/* Indicateur de position du guide */}
                    <div 
                      className={`absolute ${guide.type === 'horizontal' ? '-left-14 top-1/2 -translate-y-1/2' : 'left-1/2 -translate-x-1/2 -top-6'} ${guidesLocked ? 'bg-amber-600' : 'bg-cyan-600'} text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1`}
                    >
                      {guidesLocked && <Lock className="w-3 h-3" />}
                      {(() => {
                        const pxPerCm = dims.width / dims.cmWidth;
                        const pos = guide.position / pxPerCm;
                        return language === "fr" ? `${pos.toFixed(1)} cm` : `${(pos / 2.54).toFixed(2)}"`;
                      })()}
                    </div>
                  </div>
                ))}
                
                {/* Indicateur de déplacement */}
                {selectedImage && !mousePosition && !cropMode && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 opacity-50">
                      <Move className="w-4 h-4" />
                      {language === "fr" ? "Glisser pour déplacer" : "Drag to move"}
                    </div>
                  </div>
                )}
                
                {/* Overlay de recadrage */}
                {cropMode && cropArea && (
                  <>
                    {/* Zone assombrie autour de la sélection */}
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
                      {/* Haut */}
                      <div 
                        className="absolute bg-black/50" 
                        style={{ top: 0, left: 0, right: 0, height: cropArea.y }}
                      />
                      {/* Bas */}
                      <div 
                        className="absolute bg-black/50" 
                        style={{ top: cropArea.y + cropArea.height, left: 0, right: 0, bottom: 0 }}
                      />
                      {/* Gauche */}
                      <div 
                        className="absolute bg-black/50" 
                        style={{ top: cropArea.y, left: 0, width: cropArea.x, height: cropArea.height }}
                      />
                      {/* Droite */}
                      <div 
                        className="absolute bg-black/50" 
                        style={{ top: cropArea.y, left: cropArea.x + cropArea.width, right: 0, height: cropArea.height }}
                      />
                    </div>
                    
                    {/* Cadre de sélection */}
                    <div 
                      className="absolute border-2 border-orange-500 cursor-move"
                      style={{ 
                        left: cropArea.x, 
                        top: cropArea.y, 
                        width: cropArea.width, 
                        height: cropArea.height,
                        zIndex: 51
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsDraggingCrop(true);
                        setCropStart({ x: e.clientX - cropArea.x, y: e.clientY - cropArea.y });
                      }}
                    >
                      {/* Grille de composition (règle des tiers) */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-orange-300/50" />
                        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-orange-300/50" />
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-orange-300/50" />
                        <div className="absolute top-2/3 left-0 right-0 h-px bg-orange-300/50" />
                      </div>
                      
                      {/* Poignées de redimensionnement */}
                      {/* Coins */}
                      <div 
                        className="absolute -top-2 -left-2 w-4 h-4 bg-orange-500 border-2 border-white rounded-sm cursor-nw-resize"
                        onMouseDown={(e) => { e.stopPropagation(); setCropHandle("nw"); }}
                      />
                      <div 
                        className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 border-2 border-white rounded-sm cursor-ne-resize"
                        onMouseDown={(e) => { e.stopPropagation(); setCropHandle("ne"); }}
                      />
                      <div 
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-orange-500 border-2 border-white rounded-sm cursor-sw-resize"
                        onMouseDown={(e) => { e.stopPropagation(); setCropHandle("sw"); }}
                      />
                      <div 
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-orange-500 border-2 border-white rounded-sm cursor-se-resize"
                        onMouseDown={(e) => { e.stopPropagation(); setCropHandle("se"); }}
                      />
                      {/* Côtés */}
                      <div 
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-orange-500 border-2 border-white rounded-sm cursor-n-resize"
                        onMouseDown={(e) => { e.stopPropagation(); setCropHandle("n"); }}
                      />
                      <div 
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-orange-500 border-2 border-white rounded-sm cursor-s-resize"
                        onMouseDown={(e) => { e.stopPropagation(); setCropHandle("s"); }}
                      />
                      <div 
                        className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-orange-500 border-2 border-white rounded-sm cursor-w-resize"
                        onMouseDown={(e) => { e.stopPropagation(); setCropHandle("w"); }}
                      />
                      <div 
                        className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-orange-500 border-2 border-white rounded-sm cursor-e-resize"
                        onMouseDown={(e) => { e.stopPropagation(); setCropHandle("e"); }}
                      />
                      
                      {/* Dimensions de la zone */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Panneau de droite - Photos disponibles */}
        <div className="w-48 border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {language === "fr" ? "Photos" : "Photos"}
            </h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 gap-2">
              {selectedPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => selectPhoto(photo.photoUrl)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === photo.photoUrl
                      ? "border-purple-500 ring-2 ring-purple-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.title || "Photo"}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              {selectedPhotos.length === 0 && (
                <div className="col-span-2 text-center text-gray-400 text-sm py-8">
                  {language === "fr" 
                    ? "Sélectionnez des photos dans l'album" 
                    : "Select photos from the album"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
