import { useState, useEffect, useRef } from "react";
import { X, Scissors, Library, Sparkles, LayoutGrid, Sticker, Frame, Image, Printer, Mail, Download, Save, Edit2, Plus, ZoomIn, ZoomOut, Grid3X3, Ruler, Crosshair, RotateCcw, Lock, Unlock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { PhotoFrame } from "@/types/photo";
import { db, BibliothequeItemDB, addBibliothequeItem, deleteBibliothequeItemSync } from "@/db";
import { toast } from "sonner";

// Import des sous-composants (pour les modales)
import DetourageTab from "./DetourageTab";
import BibliothequeTab from "./BibliothequeTab";
import EffetsTab from "./EffetsTab";
import MiseEnPageTab from "./MiseEnPageTab";
import StickersTab from "./StickersTab";

interface CreationsAtelierProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhoto?: PhotoFrame | null;
  selectedPhotos?: PhotoFrame[];
  onSaveToAlbum?: (imageData: string, name?: string) => void;
  onPrint?: (imageData: string) => void;
  onEmail?: (imageData: string) => void;
}

// Types pour les formats de papier photo
const PAPER_FORMATS = [
  { id: "10x15", width: 10, height: 15, label: "10 x 15 cm" },
  { id: "13x18", width: 13, height: 18, label: "13 x 18 cm" },
  { id: "18x24", width: 18, height: 24, label: "18 x 24 cm" },
  { id: "20x25", width: 20, height: 25, label: "20 x 25 cm" },
  { id: "24x30", width: 24, height: 29.7, label: "24 x 29,7 cm" },
  { id: "30x40", width: 30, height: 40, label: "30 x 40 cm" },
  { id: "40x50", width: 40, height: 50, label: "40 x 50 cm" },
  { id: "custom", width: 20, height: 20, label: "Personnalisé" },
];

// Types pour les éléments sur le canvas
interface CanvasElement {
  id: string;
  type: "image" | "text" | "shape";
  src?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  flipX?: boolean;
  flipY?: boolean;
  locked?: boolean;
  name?: string;
}

export default function CreationsAtelier({
  isOpen,
  onClose,
  selectedPhoto,
  selectedPhotos = [],
  onSaveToAlbum,
  onPrint,
  onEmail,
}: CreationsAtelierProps) {
  const { t, language } = useLanguage();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // État du canvas
  const [paperFormat, setPaperFormat] = useState(PAPER_FORMATS[0]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(false);
  
  // Éléments sur le canvas
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Photos et éléments dans la colonne de droite
  const [rightPanelItems, setRightPanelItems] = useState<{id: string, type: string, src: string, name: string}[]>([]);
  
  // Bibliothèque (chargée depuis IndexedDB)
  const [bibliothequeItems, setBibliothequeItems] = useState<BibliothequeItem[]>([]);
  
  // Modales
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Photo active pour le détourage
  const [activePhoto, setActivePhoto] = useState<PhotoFrame | null>(null);
  
  // Export
  const [currentExport, setCurrentExport] = useState<string | null>(null);
  const [creationName, setCreationName] = useState("");
  
  // Charger les photos sélectionnées dans la colonne de droite
  useEffect(() => {
    if (isOpen && selectedPhotos.length > 0) {
      const items = selectedPhotos.map(p => ({
        id: p.id?.toString() || `photo-${Date.now()}`,
        type: "photo",
        src: p.src || p.photoUrl || "",
        name: p.title || "Photo"
      }));
      setRightPanelItems(items);
      if (selectedPhoto) {
        setActivePhoto(selectedPhoto);
      }
    }
  }, [isOpen, selectedPhotos, selectedPhoto]);
  
  // Charger la bibliothèque depuis IndexedDB
  useEffect(() => {
    if (isOpen) {
      loadBibliothequeFromDB();
    }
  }, [isOpen]);
  
  const loadBibliothequeFromDB = async () => {
    try {
      const items = await db.bibliotheque_items.toArray();
      const convertedItems: BibliothequeItem[] = items.map(item => ({
        id: String(item.id ?? Date.now()),
        type: item.type,
        name: item.name,
        thumbnail: item.thumbnail,
        fullImage: item.fullImage,
        createdAt: item.createdAt,
        sourcePhotoId: item.sourcePhotoId,
      }));
      setBibliothequeItems(convertedItems);
    } catch (error) {
      console.error("Erreur lors du chargement de la bibliothèque:", error);
    }
  };
  
  // Ajouter un élément à la bibliothèque
  const addToBibliotheque = async (item: BibliothequeItem) => {
    try {
      setBibliothequeItems(prev => [...prev, item]);
      const dbItem: BibliothequeItemDB = {
        id: item.id,
        category: 'mes-elements',
        url: item.thumbnail ?? item.fullImage ?? '',
        type: item.type,
        name: item.name,
        thumbnail: item.thumbnail,
        fullImage: item.fullImage,
        addedAt: item.createdAt ?? Date.now(),
        createdAt: item.createdAt,
        sourcePhotoId: item.sourcePhotoId,
      };
      await addBibliothequeItem(dbItem);

      // Ajouter aussi à la colonne de droite
      setRightPanelItems(prev => [...prev, {
        id: item.id,
        type: item.type ?? 'import',
        src: item.fullImage ?? item.thumbnail ?? '',
        name: item.name
      }]);
      
      toast.success(language === "fr" ? "Ajouté à la bibliothèque" : "Added to library");
    } catch (error) {
      console.error("Erreur lors de l'ajout à la bibliothèque:", error);
      toast.error(language === "fr" ? "Erreur lors de la sauvegarde" : "Error saving item");
    }
  };
  
  // Ajouter un élément au canvas
  const addToCanvas = (src: string, name?: string) => {
    const newElement: CanvasElement = {
      id: `element-${Date.now()}`,
      type: "image",
      src,
      x: 50,
      y: 50,
      width: 150,
      height: 150,
      rotation: 0,
      zIndex: canvasElements.length + 1,
      opacity: 1,
      name: name || "Élément"
    };
    setCanvasElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    toast.success(language === "fr" ? "Ajouté au canvas" : "Added to canvas");
  };
  
  // Ajouter un résultat à la colonne de droite
  const addToRightPanel = (src: string, name: string, type: string = "result") => {
    const newItem = {
      id: `result-${Date.now()}`,
      type,
      src,
      name
    };
    setRightPanelItems(prev => [...prev, newItem]);
    setActiveModal(null); // Fermer la modale
    toast.success(language === "fr" ? `"${name}" ajouté` : `"${name}" added`);
  };
  
  // Supprimer un élément du canvas
  const removeFromCanvas = (id: string) => {
    setCanvasElements(prev => prev.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };
  
  // Mettre à jour un élément du canvas
  const updateCanvasElement = (id: string, updates: Partial<CanvasElement>) => {
    setCanvasElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };
  
  // Calculer les dimensions du canvas en pixels
  const getCanvasPixelDimensions = () => {
    const DPI = 96; // Pixels par pouce pour l'affichage
    const CM_TO_INCH = 0.393701;
    const width = orientation === "portrait" ? paperFormat.width : paperFormat.height;
    const height = orientation === "portrait" ? paperFormat.height : paperFormat.width;
    return {
      width: Math.round(width * CM_TO_INCH * DPI * (zoom / 100)),
      height: Math.round(height * CM_TO_INCH * DPI * (zoom / 100))
    };
  };
  
  const canvasDimensions = getCanvasPixelDimensions();
  
  // Générer un nom par défaut
  const generateDefaultName = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    const timeStr = now.toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit", minute: "2-digit",
    }).replace(":", "h");
    return language === "fr" ? `Création ${dateStr} ${timeStr}` : `Creation ${dateStr} ${timeStr}`;
  };
  
  // Export du canvas
  const exportCanvas = () => {
    // TODO: Implémenter l'export réel du canvas
    if (!creationName) {
      setCreationName(generateDefaultName());
    }
    toast.success(language === "fr" ? "Canvas exporté" : "Canvas exported");
  };
  
  // Télécharger
  const handleDownload = () => {
    if (currentExport) {
      const link = document.createElement("a");
      link.href = currentExport;
      link.download = `${creationName || generateDefaultName()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(language === "fr" ? "Téléchargé !" : "Downloaded!");
    } else {
      toast.error(language === "fr" ? "Aucune création à télécharger" : "No creation to download");
    }
  };
  
  // Onglets verticaux (ouvrent des modales)
  const verticalTabs = [
    { id: "detourage", label: language === "fr" ? "Détourage" : "Cutout", icon: Scissors },
    { id: "bibliotheque", label: language === "fr" ? "Bibliothèque" : "Library", icon: Library },
    { id: "effets", label: language === "fr" ? "Effets" : "Effects", icon: Sparkles },
    { id: "miseenpage", label: language === "fr" ? "Mise en page" : "Layout", icon: LayoutGrid },
    { id: "stickers", label: "Stickers", icon: Sticker },
  ];
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-[1400px] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {language === "fr" ? "Créations / Atelier" : "Creations / Workshop"}
              </h2>
              <p className="text-sm text-gray-500">
                {language === "fr" 
                  ? "Détourage, collage, effets artistiques et mise en page" 
                  : "Cutout, collage, artistic effects and layout"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Contenu principal : 3 colonnes */}
        <div className="flex-1 flex overflow-hidden">
          {/* Colonne de gauche : Onglets verticaux */}
          <div className="w-20 bg-gray-100 border-r flex flex-col items-center py-4 gap-2">
            {verticalTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeModal === tab.id ? "default" : "ghost"}
                size="sm"
                className={`w-16 h-16 flex flex-col items-center justify-center gap-1 ${activeModal === tab.id ? "bg-purple-500 text-white" : ""}`}
                onClick={() => setActiveModal(tab.id)}
                title={tab.label}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] leading-tight text-center">{tab.label}</span>
              </Button>
            ))}
          </div>
          
          {/* Colonne centrale : Canvas avec options */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Barre d'options horizontale */}
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b">
              {/* Format papier */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-500">{language === "fr" ? "Format:" : "Format:"}</Label>
                <select
                  value={paperFormat.id}
                  onChange={(e) => setPaperFormat(PAPER_FORMATS.find(f => f.id === e.target.value) || PAPER_FORMATS[0])}
                  className="text-sm border rounded px-2 py-1"
                >
                  {PAPER_FORMATS.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Orientation */}
              <div className="flex items-center gap-1">
                <Button
                  variant={orientation === "portrait" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrientation("portrait")}
                  className="text-xs px-2"
                >
                  Portrait
                </Button>
                <Button
                  variant={orientation === "landscape" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrientation("landscape")}
                  className="text-xs px-2"
                >
                  Paysage
                </Button>
              </div>
              
              <div className="h-6 w-px bg-gray-300" />
              
              {/* Zoom */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs w-12 text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="h-6 w-px bg-gray-300" />
              
              {/* Options d'affichage */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Switch id="grid" checked={showGrid} onCheckedChange={setShowGrid} className="scale-75" />
                  <Label htmlFor="grid" className="text-xs cursor-pointer">
                    <Grid3X3 className="w-4 h-4" />
                  </Label>
                </div>
                <div className="flex items-center gap-1">
                  <Switch id="rulers" checked={showRulers} onCheckedChange={setShowRulers} className="scale-75" />
                  <Label htmlFor="rulers" className="text-xs cursor-pointer">
                    <Ruler className="w-4 h-4" />
                  </Label>
                </div>
                <div className="flex items-center gap-1">
                  <Switch id="crosshair" checked={showCrosshair} onCheckedChange={setShowCrosshair} className="scale-75" />
                  <Label htmlFor="crosshair" className="text-xs cursor-pointer">
                    <Crosshair className="w-4 h-4" />
                  </Label>
                </div>
              </div>
              
              <div className="flex-1" />
              
              {/* Actions */}
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setCanvasElements([])}>
                <RotateCcw className="w-4 h-4" />
                {language === "fr" ? "Réinitialiser" : "Reset"}
              </Button>
            </div>
            
            {/* Zone du canvas */}
            <div className="flex-1 overflow-auto bg-gray-200 p-4 flex items-center justify-center">
              <div className="relative">
                {/* Règle horizontale */}
                {showRulers && (
                  <div className="absolute -top-6 left-8 right-0 h-6 bg-white border-b flex items-end">
                    {Array.from({ length: Math.ceil(canvasDimensions.width / 37.8) + 1 }).map((_, i) => (
                      <div key={i} className="relative" style={{ width: 37.8 }}>
                        <div className="absolute bottom-0 left-0 w-px h-3 bg-gray-400" />
                        <span className="absolute bottom-1 left-1 text-[8px] text-gray-500">{i}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Règle verticale */}
                {showRulers && (
                  <div className="absolute top-0 -left-8 bottom-0 w-8 bg-white border-r flex flex-col">
                    {Array.from({ length: Math.ceil(canvasDimensions.height / 37.8) + 1 }).map((_, i) => (
                      <div key={i} className="relative" style={{ height: 37.8 }}>
                        <div className="absolute top-0 right-0 w-3 h-px bg-gray-400" />
                        <span className="absolute top-1 right-1 text-[8px] text-gray-500">{i}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Canvas principal */}
                <div
                  ref={canvasRef}
                  className="relative bg-white shadow-lg"
                  style={{
                    width: canvasDimensions.width,
                    height: canvasDimensions.height,
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const data = e.dataTransfer.getData("text/plain");
                    if (data) {
                      try {
                        const item = JSON.parse(data);
                        if (item.src) {
                          addToCanvas(item.src, item.name);
                        }
                      } catch {
                        // Si ce n'est pas du JSON, c'est peut-être une URL d'image
                        if (data.startsWith("data:") || data.startsWith("http")) {
                          addToCanvas(data);
                        }
                      }
                    }
                  }}
                >
                  {/* Grille */}
                  {showGrid && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                        `,
                        backgroundSize: `${37.8 * (zoom / 100)}px ${37.8 * (zoom / 100)}px`,
                      }}
                    />
                  )}
                  
                  {/* Éléments du canvas */}
                  {canvasElements.map((element) => (
                    <div
                      key={element.id}
                      className={`absolute cursor-move ${selectedElementId === element.id ? "ring-2 ring-purple-500" : ""} ${element.locked ? "cursor-not-allowed" : ""}`}
                      style={{
                        left: element.x,
                        top: element.y,
                        width: element.width,
                        height: element.height,
                        transform: `rotate(${element.rotation}deg) ${element.flipX ? "scaleX(-1)" : ""} ${element.flipY ? "scaleY(-1)" : ""}`,
                        zIndex: element.zIndex,
                        opacity: element.opacity,
                      }}
                      onClick={() => !element.locked && setSelectedElementId(element.id)}
                    >
                      {element.type === "image" && element.src && (
                        <img
                          src={element.src}
                          alt={element.name || ""}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      )}
                      
                      {/* Contrôles de l'élément sélectionné */}
                      {selectedElementId === element.id && !element.locked && (
                        <div className="absolute -top-8 left-0 flex gap-1 bg-white rounded shadow px-1 py-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); updateCanvasElement(element.id, { locked: true }); }}
                            title={language === "fr" ? "Verrouiller" : "Lock"}
                          >
                            <Lock className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500"
                            onClick={(e) => { e.stopPropagation(); removeFromCanvas(element.id); }}
                            title={language === "fr" ? "Supprimer" : "Delete"}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      
                      {/* Indicateur de verrouillage */}
                      {element.locked && (
                        <div className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-1">
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Message si canvas vide */}
                  {canvasElements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {language === "fr" 
                            ? "Glissez une photo depuis la colonne de droite" 
                            : "Drag a photo from the right column"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Indicateur de dimensions */}
                <div className="absolute -top-6 right-0 bg-purple-500 text-white text-xs px-2 py-0.5 rounded">
                  {orientation === "portrait" ? paperFormat.width : paperFormat.height} cm
                </div>
                <div className="absolute top-0 -right-10 bg-purple-500 text-white text-xs px-2 py-0.5 rounded transform rotate-90 origin-left">
                  {orientation === "portrait" ? paperFormat.height : paperFormat.width} cm
                </div>
              </div>
            </div>
          </div>
          
          {/* Colonne de droite : Photos & Éléments */}
          <div className="w-48 bg-gray-50 border-l flex flex-col">
            <div className="px-3 py-2 border-b bg-white">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Image className="w-4 h-4" />
                {language === "fr" ? "Photos" : "Photos"}
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 grid grid-cols-2 gap-2">
                {rightPanelItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square bg-white rounded border shadow-sm cursor-grab hover:ring-2 hover:ring-purple-300 transition-all"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", JSON.stringify({ src: item.src, name: item.name }));
                    }}
                    onDoubleClick={() => addToCanvas(item.src, item.name)}
                    title={`${item.name}\n${language === "fr" ? "Double-clic ou glisser vers le canvas" : "Double-click or drag to canvas"}`}
                  >
                    <img
                      src={item.src}
                      alt={item.name}
                      className="w-full h-full object-cover rounded"
                    />
                    {item.type !== "photo" && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] px-1 py-0.5 truncate">
                        {item.name}
                      </div>
                    )}
                  </div>
                ))}
                
                {rightPanelItems.length === 0 && (
                  <div className="col-span-2 text-center text-gray-400 text-xs py-8">
                    {language === "fr" 
                      ? "Aucune photo sélectionnée" 
                      : "No photo selected"}
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Bouton pour ajouter depuis la bibliothèque */}
            <div className="p-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1"
                onClick={() => setActiveModal("bibliotheque")}
              >
                <Plus className="w-4 h-4" />
                {language === "fr" ? "Bibliothèque" : "Library"}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {canvasElements.length} {language === "fr" ? "éléments sur le canvas" : "elements on canvas"}
          </div>
          <div className="flex items-center gap-2">
            {/* Nom de la création */}
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
              <Edit2 className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={creationName}
                onChange={(e) => setCreationName(e.target.value)}
                placeholder={language === "fr" ? "Nom de la création..." : "Creation name..."}
                className="border-0 p-0 h-auto text-sm w-48 focus-visible:ring-0"
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
              <Download className="w-4 h-4" />
              {language === "fr" ? "Télécharger" : "Download"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Printer className="w-4 h-4" />
              {language === "fr" ? "Imprimer" : "Print"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Mail className="w-4 h-4" />
              @Mail
            </Button>
            {onSaveToAlbum && (
              <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white gap-1">
                <Save className="w-4 h-4" />
                {language === "fr" ? "Sauvegarder" : "Save"}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              {language === "fr" ? "Fermer" : "Close"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Modales */}
      
      {/* Modale Détourage */}
      <Dialog open={activeModal === "detourage"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              {language === "fr" ? "Détourage" : "Cutout"}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] overflow-hidden">
            <DetourageTab
              selectedPhoto={activePhoto}
              selectedPhotos={selectedPhotos}
              onSelectPhoto={setActivePhoto}
              onAddToBibliotheque={(item) => {
                addToBibliotheque(item);
                // Ajouter aussi à la colonne de droite pour utilisation immédiate
                addToRightPanel(item.fullImage ?? '', item.name, "detourage");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modale Bibliothèque */}
      <Dialog open={activeModal === "bibliotheque"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-5 h-5" />
              {language === "fr" ? "Bibliothèque" : "Library"}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] overflow-hidden">
            <BibliothequeTab
              items={bibliothequeItems}
              onRemove={async (id) => {
                setBibliothequeItems(prev => prev.filter(item => item.id !== id));
                await deleteBibliothequeItemSync(id);
                toast.success(language === "fr" ? "Élément supprimé" : "Item deleted");
              }}
              onAddToCollage={(element) => {
                // Ajouter à la colonne de droite
                if (element.src) {
                  addToRightPanel(element.src, element.id, "bibliotheque");
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modale Effets */}
      <Dialog open={activeModal === "effets"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {language === "fr" ? "Effets" : "Effects"}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] overflow-hidden">
            <EffetsTab
              sourceImage={activePhoto?.src || null}
              onApplyEffect={(imageData) => {
                addToRightPanel(imageData, language === "fr" ? "Photo avec effet" : "Photo with effect", "effect");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modale Mise en page */}
      <Dialog open={activeModal === "miseenpage"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              {language === "fr" ? "Mise en page" : "Layout"}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] overflow-hidden">
            <MiseEnPageTab
              collageElements={[]}
              onUpdateElements={() => {}}
              selectedPhotos={selectedPhotos.map(p => ({ id: p.id, photoUrl: p.src, title: p.title }))}
              onCollageGenerated={(imageData) => {
                addToRightPanel(imageData, language === "fr" ? "Mise en page" : "Layout", "layout");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modale Stickers */}
      <Dialog open={activeModal === "stickers"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Sticker className="w-5 h-5" />
              Stickers
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] overflow-hidden">
            <StickersTab
              onAddSticker={(stickerUrl, name) => {
                addToRightPanel(stickerUrl, name || "Sticker", "sticker");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Types pour la bibliothèque
export interface BibliothequeItem {
  id: string;
  type?: "detourage" | "clipart" | "emotion" | "masque" | "cadre" | "bordure" | "lettre" | "frise" | "coin" | "arrierePlan" | "import" | string;
  name: string;
  thumbnail?: string;
  fullImage?: string;
  createdAt?: number;
  sourcePhotoId?: string;
}

export interface CollageElement {
  id: string;
  type: "image" | "text" | "shape";
  src?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
  textColor?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  decorativeBorderUrl?: string;
  decorativeBorderId?: string;
  tintColor?: string;
  flipX?: boolean;
  flipY?: boolean;
  locked?: boolean;
  groupId?: string;
  maskShape?: "none" | "circle" | "oval" | "triangle" | "rectangle" | "hexagon" | "star" | "diamond" | "heart" | "pentagon" | "drop" | "leaf" | "parallelogram" | "trapeze";
  maskUrl?: string;
  cropX?: number;
  cropY?: number;
  cropScale?: number;
}
