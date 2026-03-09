import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Move, 
  RotateCw, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Undo, 
  Redo,
  Download,
  Layers,
  ChevronUp,
  ChevronDown,
  Palette,
  Scissors,
  Image as ImageIcon,
  Smile,
  Circle,
  Frame,
  Upload,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Library,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
  Group,
  Ungroup,
  Square,
  ArrowUpToLine,
  ArrowDownToLine,
  MoveUp,
  MoveDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Copy,
  ClipboardPaste
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { BibliothequeItem, CollageElement } from "./CreationsAtelier";
import { toast } from "sonner";

interface CollageTabProps {
  elements: CollageElement[];
  onUpdateElement: (id: string, updates: Partial<CollageElement>) => void;
  onRemoveElement: (id: string) => void;
  onAddElement: (element: CollageElement) => void;
  bibliothequeItems: BibliothequeItem[];
  onExport: (imageData: string) => void;
}

// Couleurs de fond prédéfinies
const backgroundColors = [
  "#FFFFFF", "#F3F4F6", "#FEF3C7", "#DBEAFE", "#D1FAE5", 
  "#FCE7F3", "#E0E7FF", "#1F2937", "#000000", "transparent"
];

// Catégories de la bibliothèque
const libraryCategories = [
  { id: "detourage", label: { fr: "Détourages", en: "Cutouts" }, icon: Scissors },
  { id: "clipart", label: { fr: "Cliparts", en: "Cliparts" }, icon: ImageIcon },
  { id: "emotion", label: { fr: "Émotions", en: "Emotions" }, icon: Smile },
  { id: "masque", label: { fr: "Masques", en: "Masks" }, icon: Circle },
  { id: "cadre", label: { fr: "Cadres", en: "Frames" }, icon: Frame },
  { id: "arrierePlan", label: { fr: "Fonds", en: "Backgrounds" }, icon: Palette },
  { id: "import", label: { fr: "Imports", en: "Imports" }, icon: Upload },
];

// Éléments par défaut (émotions)
const defaultEmotions = [
  { id: "emoji_smile", name: "😊", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iI0ZGRDkzRCIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjQiIHI9IjQiIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSI0NCIgY3k9IjI0IiByPSI0IiBmaWxsPSIjMzMzIi8+PHBhdGggZD0iTTE2IDQwIFEzMiA1MiA0OCA0MCIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48L3N2Zz4=" },
  { id: "emoji_heart", name: "❤️", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cGF0aCBkPSJNMzIgNTZDMTYgNDQgNCAxMiAzMiAxMkM2MCAxMiA0OCA0NCAzMiA1NloiIGZpbGw9IiNFODFFNjMiLz48L3N2Zz4=" },
  { id: "emoji_star", name: "⭐", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cG9seWdvbiBwb2ludHM9IjMyLDQgNDAsMjQgNjQsMjQgNDQsMzggNTIsNjAgMzIsNDYgMTIsNjAgMjAsMzggMCwyNCAxNiwyNCIgZmlsbD0iI0ZGQzEwNyIvPjwvc3ZnPg==" },
  { id: "emoji_thumbsup", name: "👍", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cGF0aCBkPSJNMjAgNTZWMjhoMTJWOGwxNiAxNnY0MGgtMjhaIiBmaWxsPSIjRkZDQTI4Ii8+PC9zdmc+" },
  { id: "emoji_fire", name: "🔥", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cGF0aCBkPSJNMzIgNEMyMCAyMCAyNCAzMiAxNiA0MEMxMiA0NCAxMiA1MiAyMCA1NkMyNCA1OCAyOCA2MCAzMiA2MEMzNiA2MCA0MCA1OCA0NCA1NkM1MiA1MiA1MiA0NCA0OCA0MEMzNiAyOCA0NCAyMCAzMiA0WiIgZmlsbD0iI0ZGNTcyMiIvPjxwYXRoIGQ9Ik0zMiAyNEMyOCAzMiAzMiA0MCAyOCA0OEMzMiA1MiAzNiA1MiA0MCA0OEMzNiA0MCAzNiAzMiAzMiAyNFoiIGZpbGw9IiNGRkM0MDAiLz48L3N2Zz4=" },
  { id: "emoji_party", name: "🎉", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cGF0aCBkPSJNOCA1Nkw0MCA4TDU2IDI0TDggNTZaIiBmaWxsPSIjRkZDQTI4Ii8+PGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNCIgZmlsbD0iI0U5MUU2MyIvPjxjaXJjbGUgY3g9IjQ4IiBjeT0iMTIiIHI9IjMiIGZpbGw9IiM0Q0FGNTAiLz48Y2lyY2xlIGN4PSI1MiIgY3k9IjQwIiByPSI0IiBmaWxsPSIjMjE5NkYzIi8+PC9zdmc+" },
];

export default function CollageTab({
  elements,
  onUpdateElement,
  onRemoveElement,
  onAddElement,
  bibliothequeItems,
  onExport,
}: CollageTabProps) {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [history, setHistory] = useState<CollageElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // État pour le panneau bibliothèque
  const [showLibrary, setShowLibrary] = useState(true);
  const [activeCategory, setActiveCategory] = useState("detourage");
  const [draggedItem, setDraggedItem] = useState<BibliothequeItem | null>(null);
  
  // État pour les guides d'alignement
  const [showGuides, setShowGuides] = useState(true);
  const [activeGuides, setActiveGuides] = useState<{
    vertical: number[];
    horizontal: number[];
  }>({ vertical: [], horizontal: [] });
  const SNAP_THRESHOLD = 8; // Distance en pixels pour l'aimantation
  
  // État pour le rectangle de sélection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const selectedElement = elements.find(el => el.id === selectedElementId);

  // État pour copier/coller le style
  const [copiedStyle, setCopiedStyle] = useState<Partial<CollageElement> | null>(null);

  // Sauvegarder l'état dans l'historique
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...elements]);
      // Limiter l'historique à 50 états
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [elements, historyIndex]);

  // Undo - Annuler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      // Restaurer l'état précédent
      previousState.forEach(el => {
        onUpdateElement(el.id, el);
      });
      // Supprimer les éléments qui n'existent plus
      const previousIds = previousState.map(el => el.id);
      elements.forEach(el => {
        if (!previousIds.includes(el.id)) {
          onRemoveElement(el.id);
        }
      });
      toast.info(language === "fr" ? "Action annulée" : "Action undone");
    }
  }, [history, historyIndex, elements, onUpdateElement, onRemoveElement, language]);

  // Redo - Rétablir
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      // Restaurer l'état suivant
      nextState.forEach(el => {
        onUpdateElement(el.id, el);
      });
      toast.info(language === "fr" ? "Action rétablie" : "Action redone");
    }
  }, [history, historyIndex, onUpdateElement, language]);

  // Raccourcis clavier Ctrl+Z et Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Obtenir les éléments pour une catégorie
  const getItemsForCategory = (categoryId: string): BibliothequeItem[] => {
    if (categoryId === "emotion") {
      const userEmotions = bibliothequeItems.filter(item => item.type === "emotion");
      const defaultItems: BibliothequeItem[] = defaultEmotions.map(e => ({
        id: e.id,
        type: "emotion" as const,
        name: e.name,
        thumbnail: e.src,
        fullImage: e.src,
        createdAt: 0,
      }));
      return [...defaultItems, ...userEmotions];
    }
    return bibliothequeItems.filter(item => item.type === categoryId);
  };

  const currentCategoryItems = getItemsForCategory(activeCategory);

  // Gestion du drag & drop depuis la bibliothèque
  const handleDragStart = (e: React.DragEvent, item: BibliothequeItem) => {
    e.dataTransfer.setData("bibliotheque-item", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("bibliotheque-item");
    if (!data) return;

    try {
      const item: BibliothequeItem = JSON.parse(data);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - 75;
      const y = e.clientY - rect.top - 75;

      const newElement: CollageElement = {
        id: `element_${Date.now()}`,
        type: "image",
        src: item.fullImage,
        x: Math.max(0, Math.min(x, canvasSize.width - 150)),
        y: Math.max(0, Math.min(y, canvasSize.height - 150)),
        width: 150,
        height: 150,
        rotation: 0,
        zIndex: elements.length + 1,
        opacity: 1,
      };

      onAddElement(newElement);
      setSelectedElementId(newElement.id);
      saveToHistory();
      toast.success(language === "fr" ? "Élément ajouté !" : "Element added!");
    } catch (error) {
      console.error("Erreur de drop:", error);
    }
    setDraggedItem(null);
  };

  // Ajouter un élément au clic (alternative au drag)
  const handleAddFromLibrary = (item: BibliothequeItem) => {
    const newElement: CollageElement = {
      id: `element_${Date.now()}`,
      type: "image",
      src: item.fullImage,
      x: canvasSize.width / 2 - 75,
      y: canvasSize.height / 2 - 75,
      width: 150,
      height: 150,
      rotation: 0,
      zIndex: elements.length + 1,
      opacity: 1,
    };
    onAddElement(newElement);
    setSelectedElementId(newElement.id);
    saveToHistory();
    toast.success(language === "fr" ? "Élément ajouté au centre !" : "Element added to center!");
  };

  // Déplacement d'un élément sur le canevas
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    
    // Multi-sélection avec Ctrl+clic
    if (e.ctrlKey || e.metaKey) {
      setSelectedElementIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(elementId)) {
          newSet.delete(elementId);
        } else {
          newSet.add(elementId);
        }
        return newSet;
      });
      // Garder aussi la sélection simple pour le panneau latéral
      setSelectedElementId(elementId);
      return;
    }
    
    // Sélection simple - effacer la multi-sélection
    if (!selectedElementIds.has(elementId)) {
      setSelectedElementIds(new Set());
    }
    
    setSelectedElementId(elementId);
    setIsDragging(true);

    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragOffset({
      x: e.clientX - rect.left - element.x,
      y: e.clientY - rect.top - element.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentElement = elements.find(el => el.id === selectedElementId);
    if (!currentElement) return;

    let newX = e.clientX - rect.left - dragOffset.x;
    let newY = e.clientY - rect.top - dragOffset.y;

    // Guides d'alignement
    if (showGuides) {
      const newActiveGuides: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };
      
      // Points de référence de l'élément en cours
      const currentLeft = newX;
      const currentRight = newX + currentElement.width;
      const currentCenterX = newX + currentElement.width / 2;
      const currentTop = newY;
      const currentBottom = newY + currentElement.height;
      const currentCenterY = newY + currentElement.height / 2;

      // Vérifier l'alignement avec les autres éléments
      elements.forEach(el => {
        if (el.id === selectedElementId || el.locked) return;

        const elLeft = el.x;
        const elRight = el.x + el.width;
        const elCenterX = el.x + el.width / 2;
        const elTop = el.y;
        const elBottom = el.y + el.height;
        const elCenterY = el.y + el.height / 2;

        // Alignement horizontal (bords gauche/droite/centre)
        if (Math.abs(currentLeft - elLeft) < SNAP_THRESHOLD) {
          newX = elLeft;
          newActiveGuides.vertical.push(elLeft);
        } else if (Math.abs(currentRight - elRight) < SNAP_THRESHOLD) {
          newX = elRight - currentElement.width;
          newActiveGuides.vertical.push(elRight);
        } else if (Math.abs(currentCenterX - elCenterX) < SNAP_THRESHOLD) {
          newX = elCenterX - currentElement.width / 2;
          newActiveGuides.vertical.push(elCenterX);
        } else if (Math.abs(currentLeft - elRight) < SNAP_THRESHOLD) {
          newX = elRight;
          newActiveGuides.vertical.push(elRight);
        } else if (Math.abs(currentRight - elLeft) < SNAP_THRESHOLD) {
          newX = elLeft - currentElement.width;
          newActiveGuides.vertical.push(elLeft);
        }

        // Alignement vertical (bords haut/bas/centre)
        if (Math.abs(currentTop - elTop) < SNAP_THRESHOLD) {
          newY = elTop;
          newActiveGuides.horizontal.push(elTop);
        } else if (Math.abs(currentBottom - elBottom) < SNAP_THRESHOLD) {
          newY = elBottom - currentElement.height;
          newActiveGuides.horizontal.push(elBottom);
        } else if (Math.abs(currentCenterY - elCenterY) < SNAP_THRESHOLD) {
          newY = elCenterY - currentElement.height / 2;
          newActiveGuides.horizontal.push(elCenterY);
        } else if (Math.abs(currentTop - elBottom) < SNAP_THRESHOLD) {
          newY = elBottom;
          newActiveGuides.horizontal.push(elBottom);
        } else if (Math.abs(currentBottom - elTop) < SNAP_THRESHOLD) {
          newY = elTop - currentElement.height;
          newActiveGuides.horizontal.push(elTop);
        }
      });

      // Alignement au centre du canevas
      const canvasCenterX = canvasSize.width / 2;
      const canvasCenterY = canvasSize.height / 2;
      
      if (Math.abs(currentCenterX - canvasCenterX) < SNAP_THRESHOLD) {
        newX = canvasCenterX - currentElement.width / 2;
        newActiveGuides.vertical.push(canvasCenterX);
      }
      if (Math.abs(currentCenterY - canvasCenterY) < SNAP_THRESHOLD) {
        newY = canvasCenterY - currentElement.height / 2;
        newActiveGuides.horizontal.push(canvasCenterY);
      }

      setActiveGuides(newActiveGuides);
    }

    // Déplacer l'élément principal
    const deltaX = newX - currentElement.x;
    const deltaY = newY - currentElement.y;
    
    onUpdateElement(selectedElementId, {
      x: Math.max(0, Math.min(newX, canvasSize.width - 50)),
      y: Math.max(0, Math.min(newY, canvasSize.height - 50)),
    });
    
    // Si multi-sélection, déplacer aussi les autres éléments sélectionnés
    if (selectedElementIds.size > 1 && selectedElementIds.has(selectedElementId)) {
      selectedElementIds.forEach(id => {
        if (id !== selectedElementId) {
          const el = elements.find(e => e.id === id);
          if (el && !el.locked) {
            onUpdateElement(id, {
              x: Math.max(0, Math.min(el.x + deltaX, canvasSize.width - 50)),
              y: Math.max(0, Math.min(el.y + deltaY, canvasSize.height - 50)),
            });
          }
        }
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      saveToHistory();
    }
    setIsDragging(false);
    setActiveGuides({ vertical: [], horizontal: [] });
  };

  // Redimensionner l'élément sélectionné
  const handleResize = (delta: number) => {
    if (!selectedElement) return;
    const newWidth = Math.max(50, selectedElement.width + delta);
    const newHeight = Math.max(50, selectedElement.height + delta);
    onUpdateElement(selectedElementId!, { width: newWidth, height: newHeight });
    saveToHistory();
  };

  // Rotation de l'élément
  const handleRotate = (degrees: number) => {
    if (!selectedElement) return;
    onUpdateElement(selectedElementId!, { 
      rotation: (selectedElement.rotation + degrees) % 360 
    });
    saveToHistory();
  };

  // Changer le z-index (avancer/reculer d'un niveau)
  const handleZIndex = (direction: "up" | "down") => {
    if (!selectedElement) return;
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedElements.findIndex(el => el.id === selectedElementId);
    
    if (direction === "up" && currentIndex < sortedElements.length - 1) {
      // Échanger avec l'élément au-dessus
      const nextElement = sortedElements[currentIndex + 1];
      const tempZIndex = selectedElement.zIndex;
      onUpdateElement(selectedElementId!, { zIndex: nextElement.zIndex });
      onUpdateElement(nextElement.id, { zIndex: tempZIndex });
    } else if (direction === "down" && currentIndex > 0) {
      // Échanger avec l'élément en-dessous
      const prevElement = sortedElements[currentIndex - 1];
      const tempZIndex = selectedElement.zIndex;
      onUpdateElement(selectedElementId!, { zIndex: prevElement.zIndex });
      onUpdateElement(prevElement.id, { zIndex: tempZIndex });
    }
    saveToHistory();
  };

  // Premier plan (tout devant)
  const handleBringToFront = () => {
    if (!selectedElement) return;
    const maxZIndex = Math.max(...elements.map(el => el.zIndex));
    if (selectedElement.zIndex < maxZIndex) {
      onUpdateElement(selectedElementId!, { zIndex: maxZIndex + 1 });
      saveToHistory();
      toast.success(language === "fr" ? "Élément au premier plan" : "Element brought to front");
    }
  };

  // Arrière-plan (tout derrière)
  const handleSendToBack = () => {
    if (!selectedElement) return;
    const minZIndex = Math.min(...elements.map(el => el.zIndex));
    if (selectedElement.zIndex > minZIndex) {
      // Décaler tous les autres éléments vers le haut
      elements.forEach(el => {
        if (el.id !== selectedElementId) {
          onUpdateElement(el.id, { zIndex: el.zIndex + 1 });
        }
      });
      onUpdateElement(selectedElementId!, { zIndex: 1 });
      saveToHistory();
      toast.success(language === "fr" ? "Élément à l'arrière-plan" : "Element sent to back");
    }
  };

  // Fonctions d'alignement
  const handleAlign = (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const elementsToAlign = selectedElementIds.size > 1 
      ? elements.filter(el => selectedElementIds.has(el.id))
      : selectedElement ? [selectedElement] : [];
    
    if (elementsToAlign.length === 0) return;

    // Si un seul élément, aligner par rapport au canevas
    if (elementsToAlign.length === 1) {
      const el = elementsToAlign[0];
      let newX = el.x;
      let newY = el.y;

      switch (alignment) {
        case "left":
          newX = 0;
          break;
        case "center":
          newX = (canvasSize.width - el.width) / 2;
          break;
        case "right":
          newX = canvasSize.width - el.width;
          break;
        case "top":
          newY = 0;
          break;
        case "middle":
          newY = (canvasSize.height - el.height) / 2;
          break;
        case "bottom":
          newY = canvasSize.height - el.height;
          break;
      }

      onUpdateElement(el.id, { x: newX, y: newY });
    } else {
      // Plusieurs éléments : aligner entre eux
      const bounds = {
        minX: Math.min(...elementsToAlign.map(el => el.x)),
        maxX: Math.max(...elementsToAlign.map(el => el.x + el.width)),
        minY: Math.min(...elementsToAlign.map(el => el.y)),
        maxY: Math.max(...elementsToAlign.map(el => el.y + el.height)),
      };

      elementsToAlign.forEach(el => {
        let newX = el.x;
        let newY = el.y;

        switch (alignment) {
          case "left":
            newX = bounds.minX;
            break;
          case "center":
            newX = bounds.minX + (bounds.maxX - bounds.minX - el.width) / 2;
            break;
          case "right":
            newX = bounds.maxX - el.width;
            break;
          case "top":
            newY = bounds.minY;
            break;
          case "middle":
            newY = bounds.minY + (bounds.maxY - bounds.minY - el.height) / 2;
            break;
          case "bottom":
            newY = bounds.maxY - el.height;
            break;
        }

        onUpdateElement(el.id, { x: newX, y: newY });
      });
    }

    saveToHistory();
    const alignmentNames: Record<string, { fr: string; en: string }> = {
      left: { fr: "gauche", en: "left" },
      center: { fr: "centre", en: "center" },
      right: { fr: "droite", en: "right" },
      top: { fr: "haut", en: "top" },
      middle: { fr: "milieu", en: "middle" },
      bottom: { fr: "bas", en: "bottom" },
    };
    toast.success(language === "fr" 
      ? `Aligné à ${alignmentNames[alignment].fr}` 
      : `Aligned to ${alignmentNames[alignment].en}`);
  };

  // Distribution uniforme
  const handleDistribute = (direction: "horizontal" | "vertical") => {
    const elementsToDistribute = selectedElementIds.size > 2 
      ? elements.filter(el => selectedElementIds.has(el.id))
      : [];
    
    if (elementsToDistribute.length < 3) {
      toast.error(language === "fr" 
        ? "Sélectionnez au moins 3 éléments pour distribuer" 
        : "Select at least 3 elements to distribute");
      return;
    }

    if (direction === "horizontal") {
      // Trier par position X
      const sorted = [...elementsToDistribute].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const availableSpace = (last.x + last.width) - first.x - totalWidth;
      const gap = availableSpace / (sorted.length - 1);

      let currentX = first.x + first.width + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        onUpdateElement(sorted[i].id, { x: currentX });
        currentX += sorted[i].width + gap;
      }
    } else {
      // Trier par position Y
      const sorted = [...elementsToDistribute].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const availableSpace = (last.y + last.height) - first.y - totalHeight;
      const gap = availableSpace / (sorted.length - 1);

      let currentY = first.y + first.height + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        onUpdateElement(sorted[i].id, { y: currentY });
        currentY += sorted[i].height + gap;
      }
    }

    saveToHistory();
    toast.success(language === "fr" 
      ? `Distribution ${direction === "horizontal" ? "horizontale" : "verticale"} appliquée` 
      : `${direction === "horizontal" ? "Horizontal" : "Vertical"} distribution applied`);
  };

  // Grouper les éléments sélectionnés
  const handleGroup = () => {
    if (selectedElementIds.size < 2) {
      toast.error(language === "fr" ? "Sélectionnez au moins 2 éléments (Ctrl+clic)" : "Select at least 2 elements (Ctrl+click)");
      return;
    }
    
    const groupId = `group_${Date.now()}`;
    selectedElementIds.forEach(id => {
      onUpdateElement(id, { groupId });
    });
    saveToHistory();
    toast.success(language === "fr" ? `${selectedElementIds.size} éléments groupés` : `${selectedElementIds.size} elements grouped`);
  };

  // Dégrouper les éléments
  const handleUngroup = () => {
    if (!selectedElement?.groupId) {
      toast.error(language === "fr" ? "Sélectionnez un élément groupé" : "Select a grouped element");
      return;
    }
    
    const groupId = selectedElement.groupId;
    const groupedElements = elements.filter(el => el.groupId === groupId);
    
    groupedElements.forEach(el => {
      onUpdateElement(el.id, { groupId: undefined });
    });
    
    setSelectedElementIds(new Set());
    saveToHistory();
    toast.success(language === "fr" ? `${groupedElements.length} éléments dégroupés` : `${groupedElements.length} elements ungrouped`);
  };

  // Sélectionner tous les éléments d'un groupe
  const selectGroupElements = (groupId: string) => {
    const groupedIds = elements.filter(el => el.groupId === groupId).map(el => el.id);
    setSelectedElementIds(new Set(groupedIds));
  };

  // Vérifier si l'élément sélectionné fait partie d'un groupe
  const isInGroup = selectedElement?.groupId !== undefined;
  const groupElementsCount = isInGroup 
    ? elements.filter(el => el.groupId === selectedElement?.groupId).length 
    : 0;

  // Fonction helper pour appliquer un masque à une image
  const applyMaskToImage = async (
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement, 
    element: CollageElement,
    maskUrl: string
  ): Promise<void> => {
    return new Promise((resolve) => {
      const maskImg = new Image();
      maskImg.crossOrigin = "anonymous";
      maskImg.onload = () => {
        // Créer un canvas temporaire pour l'image avec masque
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = element.width;
        tempCanvas.height = element.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) {
          resolve();
          return;
        }

        // Dessiner l'image
        tempCtx.drawImage(img, 0, 0, element.width, element.height);
        
        // Appliquer le masque en utilisant destination-in
        tempCtx.globalCompositeOperation = "destination-in";
        tempCtx.drawImage(maskImg, 0, 0, element.width, element.height);
        
        // Dessiner le résultat sur le canvas principal
        ctx.save();
        ctx.globalAlpha = element.opacity;
        ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
        ctx.rotate((element.rotation * Math.PI) / 180);
        if (element.flipX) ctx.scale(-1, 1);
        if (element.flipY) ctx.scale(1, -1);
        ctx.drawImage(tempCanvas, -element.width / 2, -element.height / 2);
        ctx.restore();
        
        resolve();
      };
      maskImg.onerror = () => {
        // Si le masque ne charge pas, dessiner l'image sans masque
        ctx.save();
        ctx.globalAlpha = element.opacity;
        ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
        ctx.rotate((element.rotation * Math.PI) / 180);
        if (element.flipX) ctx.scale(-1, 1);
        if (element.flipY) ctx.scale(1, -1);
        ctx.drawImage(img, -element.width / 2, -element.height / 2, element.width, element.height);
        ctx.restore();
        resolve();
      };
      maskImg.src = maskUrl;
    });
  };

  // Exporter le collage en image
  const handleExport = async () => {
    if (!canvasRef.current) return;

    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = canvasSize.width;
      exportCanvas.height = canvasSize.height;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      if (backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      }

      const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

      for (const element of sortedElements) {
        if (element.type === "image" && element.src) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = async () => {
              // Si l'élément a un masque, l'appliquer
              if (element.maskUrl && element.maskShape && element.maskShape !== "none") {
                await applyMaskToImage(ctx, img, element, element.maskUrl);
              } else {
                // Dessiner normalement sans masque
                ctx.save();
                ctx.globalAlpha = element.opacity;
                ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
                ctx.rotate((element.rotation * Math.PI) / 180);
                if (element.flipX) ctx.scale(-1, 1);
                if (element.flipY) ctx.scale(1, -1);
                ctx.drawImage(img, -element.width / 2, -element.height / 2, element.width, element.height);
                ctx.restore();
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = element.src!;
          });
        }
      }

      const imageData = exportCanvas.toDataURL("image/png");
      onExport(imageData);
      toast.success(language === "fr" ? "Collage exporté !" : "Collage exported!");
    } catch (error) {
      console.error("Erreur d'export:", error);
      toast.error(language === "fr" ? "Erreur lors de l'export" : "Export error");
    }
  };

  return (
    <div className="h-full flex">
      {/* Panneau latéral gauche - Bibliothèque */}
      <div 
        className={`bg-gray-50 border-r flex flex-col transition-all duration-300 ${
          showLibrary ? "w-64" : "w-12"
        }`}
      >
        {/* En-tête avec bouton toggle */}
        <div className="flex items-center justify-between p-2 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          {showLibrary && (
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                {language === "fr" ? "Bibliothèque" : "Library"}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLibrary(!showLibrary)}
            className="p-1 h-auto"
          >
            {showLibrary ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {showLibrary && (
          <>
            {/* Onglets des catégories */}
            <div className="flex flex-wrap gap-1 p-2 border-b">
              {libraryCategories.map((cat) => {
                const itemCount = getItemsForCategory(cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                      activeCategory === cat.id
                        ? "bg-purple-100 text-purple-700 font-medium"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                    title={cat.label[language as "fr" | "en"]}
                  >
                    <cat.icon className="w-3 h-3" />
                    {itemCount > 0 && (
                      <span className="text-[10px] bg-purple-200 text-purple-700 px-1 rounded-full">
                        {itemCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Grille des éléments */}
            <ScrollArea className="flex-1 p-2">
              {currentCategoryItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {currentCategoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`group relative bg-white border rounded-lg p-1.5 cursor-grab hover:shadow-md hover:border-purple-300 transition-all ${
                        draggedItem?.id === item.id ? "opacity-50 scale-95" : ""
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleAddFromLibrary(item)}
                      title={language === "fr" ? "Glisser ou cliquer pour ajouter" : "Drag or click to add"}
                    >
                      <div 
                        className="aspect-square rounded overflow-hidden flex items-center justify-center"
                        style={{ background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 50% / 8px 8px" }}
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain"
                          draggable={false}
                        />
                      </div>
                      <p className="text-[10px] text-center text-gray-500 truncate mt-1">
                        {item.name}
                      </p>
                      
                      {/* Indicateur drag */}
                      <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
                        <GripVertical className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs text-center">
                    {language === "fr" ? "Aucun élément" : "No items"}
                  </p>
                  {activeCategory === "detourage" && (
                    <p className="text-[10px] text-center mt-1 text-gray-400">
                      {language === "fr" 
                        ? "Créez des détourages dans l'onglet Détourage" 
                        : "Create cutouts in the Cutout tab"}
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Instructions */}
            <div className="p-2 border-t bg-purple-50/50">
              <p className="text-[10px] text-purple-600 text-center">
                {language === "fr"
                  ? "Glissez un élément sur le canevas →"
                  : "Drag an element onto the canvas →"}
              </p>
            </div>
          </>
        )}

        {/* Mode réduit - icônes seulement */}
        {!showLibrary && (
          <div className="flex flex-col items-center gap-2 py-2">
            {libraryCategories.slice(0, 5).map((cat) => {
              const itemCount = getItemsForCategory(cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setShowLibrary(true);
                  }}
                  className={`p-1.5 rounded transition-all relative ${
                    activeCategory === cat.id
                      ? "bg-purple-100 text-purple-700"
                      : "hover:bg-gray-100 text-gray-500"
                  }`}
                  title={cat.label[language as "fr" | "en"]}
                >
                  <cat.icon className="w-4 h-4" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-[8px] bg-purple-500 text-white w-3 h-3 rounded-full flex items-center justify-center">
                      {itemCount > 9 ? "+" : itemCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Zone de travail centrale */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Barre d'outils */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <Button variant="ghost" size="sm" onClick={() => handleResize(20)} disabled={!selectedElement}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleResize(-20)} disabled={!selectedElement}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleRotate(15)} disabled={!selectedElement}>
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Gestion des calques (z-index) */}
          <div className="flex gap-1 bg-indigo-50 p-1 rounded-lg" title={language === "fr" ? "Gestion des calques" : "Layer management"}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBringToFront} 
              disabled={!selectedElement}
              title={language === "fr" ? "Premier plan" : "Bring to front"}
              className="hover:bg-indigo-100"
            >
              <ArrowUpToLine className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleZIndex("up")} 
              disabled={!selectedElement}
              title={language === "fr" ? "Avancer" : "Move forward"}
              className="hover:bg-indigo-100"
            >
              <MoveUp className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleZIndex("down")} 
              disabled={!selectedElement}
              title={language === "fr" ? "Reculer" : "Move backward"}
              className="hover:bg-indigo-100"
            >
              <MoveDown className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSendToBack} 
              disabled={!selectedElement}
              title={language === "fr" ? "Arrière-plan" : "Send to back"}
              className="hover:bg-indigo-100"
            >
              <ArrowDownToLine className="w-4 h-4" />
            </Button>
          </div>

          {/* Alignement */}
          <div className="flex gap-1 bg-emerald-50 p-1 rounded-lg" title={language === "fr" ? "Alignement" : "Alignment"}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleAlign("left")} 
              disabled={!selectedElement && selectedElementIds.size === 0}
              title={language === "fr" ? "Aligner à gauche" : "Align left"}
              className="hover:bg-emerald-100"
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleAlign("center")} 
              disabled={!selectedElement && selectedElementIds.size === 0}
              title={language === "fr" ? "Centrer horizontalement" : "Center horizontally"}
              className="hover:bg-emerald-100"
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleAlign("right")} 
              disabled={!selectedElement && selectedElementIds.size === 0}
              title={language === "fr" ? "Aligner à droite" : "Align right"}
              className="hover:bg-emerald-100"
            >
              <AlignRight className="w-4 h-4" />
            </Button>
            <div className="w-px bg-emerald-200 mx-0.5" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleAlign("top")} 
              disabled={!selectedElement && selectedElementIds.size === 0}
              title={language === "fr" ? "Aligner en haut" : "Align top"}
              className="hover:bg-emerald-100"
            >
              <AlignStartVertical className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleAlign("middle")} 
              disabled={!selectedElement && selectedElementIds.size === 0}
              title={language === "fr" ? "Centrer verticalement" : "Center vertically"}
              className="hover:bg-emerald-100"
            >
              <AlignCenterVertical className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleAlign("bottom")} 
              disabled={!selectedElement && selectedElementIds.size === 0}
              title={language === "fr" ? "Aligner en bas" : "Align bottom"}
              className="hover:bg-emerald-100"
            >
              <AlignEndVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Distribution */}
          <div className="flex gap-1 bg-amber-50 p-1 rounded-lg" title={language === "fr" ? "Distribution" : "Distribution"}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDistribute("horizontal")} 
              disabled={selectedElementIds.size < 3}
              title={language === "fr" ? "Distribuer horizontalement (3+ éléments)" : "Distribute horizontally (3+ elements)"}
              className="hover:bg-amber-100"
            >
              <AlignHorizontalDistributeCenter className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDistribute("vertical")} 
              disabled={selectedElementIds.size < 3}
              title={language === "fr" ? "Distribuer verticalement (3+ éléments)" : "Distribute vertically (3+ elements)"}
              className="hover:bg-amber-100"
            >
              <AlignVerticalDistributeCenter className="w-4 h-4" />
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => selectedElementId && onRemoveElement(selectedElementId)}
            disabled={!selectedElement}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          {/* Boutons Undo/Redo */}
          <div className="flex gap-1 bg-orange-50 p-1 rounded-lg">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title={language === "fr" ? "Annuler (Ctrl+Z)" : "Undo (Ctrl+Z)"}
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title={language === "fr" ? "Rétablir (Ctrl+Y)" : "Redo (Ctrl+Y)"}
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          {/* Boutons Grouper/Dégrouper */}
          <div className="flex gap-1 bg-blue-50 p-1 rounded-lg">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleGroup}
              disabled={selectedElementIds.size < 2}
              title={language === "fr" ? "Grouper (Ctrl+clic pour sélection multiple)" : "Group (Ctrl+click for multi-select)"}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            >
              <Group className="w-4 h-4 mr-1" />
              {language === "fr" ? "Grouper" : "Group"}
              {selectedElementIds.size > 1 && (
                <span className="ml-1 text-xs bg-blue-200 px-1 rounded">{selectedElementIds.size}</span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleUngroup}
              disabled={!isInGroup}
              title={language === "fr" ? "Dégrouper" : "Ungroup"}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            >
              <Ungroup className="w-4 h-4 mr-1" />
              {language === "fr" ? "Dégrouper" : "Ungroup"}
            </Button>
          </div>

          {/* Bouton Guides */}
          <Button
            variant={showGuides ? "default" : "outline"}
            size="sm"
            onClick={() => setShowGuides(!showGuides)}
            title={language === "fr" ? "Guides d'alignement" : "Alignment guides"}
            className={showGuides ? "bg-pink-500 hover:bg-pink-600" : ""}
          >
            <Move className="w-4 h-4 mr-1" />
            {language === "fr" ? "Guides" : "Guides"}
          </Button>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              {language === "fr" ? "Exporter" : "Export"}
            </Button>
          </div>
        </div>

        {/* Canevas */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-gray-200 rounded-xl p-4">
          <div
            ref={canvasRef}
            className={`relative shadow-xl rounded-lg overflow-hidden transition-all ${
              draggedItem ? "ring-4 ring-purple-300 ring-opacity-50" : ""
            }`}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              backgroundColor: backgroundColor === "transparent" ? undefined : backgroundColor,
              backgroundImage: backgroundColor === "transparent" 
                ? "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 20px 20px" 
                : undefined,
            }}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedElementId(null)}
          >
            {elements.map((element) => {
              const isSelected = selectedElementId === element.id;
              const isMultiSelected = selectedElementIds.has(element.id);
              const hasGroup = element.groupId !== undefined;
              
              return (
              <ContextMenu key={element.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className={`absolute ${
                      element.locked ? "cursor-not-allowed" : "cursor-move"
                    } ${
                      isSelected
                        ? element.locked 
                          ? "ring-2 ring-orange-500 ring-offset-2" 
                          : "ring-2 ring-blue-500 ring-offset-2" 
                        : isMultiSelected
                          ? "ring-2 ring-green-500 ring-offset-1"
                          : hasGroup
                            ? "ring-1 ring-purple-300"
                            : "hover:ring-2 hover:ring-gray-300"
                    }`}
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      transform: `rotate(${element.rotation}deg) scaleX(${element.flipX ? -1 : 1}) scaleY(${element.flipY ? -1 : 1})`,
                      zIndex: element.zIndex,
                      opacity: element.opacity,
                    }}
                    onMouseDown={(e) => {
                      if (element.locked) {
                        e.stopPropagation();
                        setSelectedElementId(element.id);
                        return;
                      }
                      handleMouseDown(e, element.id);
                    }}
                  >
                {element.type === "image" && element.src && (
                  <div
                    className="w-full h-full relative overflow-hidden"
                    style={{
                      ...(element.shadow && {
                        filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.4))',
                      }),
                      // Appliquer le masque sur le conteneur pour le recadrage
                      ...(element.maskUrl && {
                        WebkitMaskImage: `url(${element.maskUrl})`,
                        maskImage: `url(${element.maskUrl})`,
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                      }),
                    }}
                  >
                    <img
                      src={element.src}
                      alt=""
                      className="pointer-events-none"
                      draggable={false}
                      style={{
                        // Recadrage interactif
                        width: `${(element.cropScale ?? 1) * 100}%`,
                        height: `${(element.cropScale ?? 1) * 100}%`,
                        objectFit: 'cover',
                        position: 'absolute',
                        left: `${(element.cropX ?? 50) - ((element.cropScale ?? 1) * 50)}%`,
                        top: `${(element.cropY ?? 50) - ((element.cropScale ?? 1) * 50)}%`,
                        ...(element.borderWidth && element.borderWidth > 0 && !element.maskUrl && {
                          border: `${element.borderWidth}px solid ${element.borderColor || '#3b82f6'}`,
                          boxSizing: 'border-box',
                        }),
                      }}
                    />
                    {/* Contour visible pour les masques */}
                    {element.maskUrl && element.borderWidth && element.borderWidth > 0 && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          border: `${element.borderWidth}px solid ${element.borderColor || '#3b82f6'}`,
                          boxSizing: 'border-box',
                          WebkitMaskImage: `url(${element.maskUrl})`,
                          maskImage: `url(${element.maskUrl})`,
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                        }}
                      />
                    )}
                  </div>
                )}
                {element.type === "text" && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span>{element.text}</span>
                  </div>
                )}

                {/* Poignées de redimensionnement et rotation */}
                {selectedElementId === element.id && !element.locked && (
                  <>
                    {/* 8 Poignées de redimensionnement */}
                    {/* Coins */}
                    <div 
                      className="absolute -left-2 -top-2 w-3 h-3 bg-blue-500 rounded-sm cursor-nw-resize border border-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startWidth = element.width;
                        const startHeight = element.height;
                        const startElX = element.x;
                        const startElY = element.y;
                        const aspectRatio = startWidth / startHeight;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaY = moveEvent.clientY - startY;
                          const newWidth = Math.max(50, startWidth - deltaX);
                          const newHeight = moveEvent.shiftKey ? newWidth / aspectRatio : Math.max(50, startHeight - deltaY);
                          const newX = startElX + (startWidth - newWidth);
                          const newY = startElY + (startHeight - newHeight);
                          onUpdateElement(element.id, { width: newWidth, height: newHeight, x: newX, y: newY });
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory();
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    <div 
                      className="absolute -right-2 -top-2 w-3 h-3 bg-blue-500 rounded-sm cursor-ne-resize border border-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startWidth = element.width;
                        const startHeight = element.height;
                        const startElY = element.y;
                        const aspectRatio = startWidth / startHeight;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaY = moveEvent.clientY - startY;
                          const newWidth = Math.max(50, startWidth + deltaX);
                          const newHeight = moveEvent.shiftKey ? newWidth / aspectRatio : Math.max(50, startHeight - deltaY);
                          const newY = startElY + (startHeight - newHeight);
                          onUpdateElement(element.id, { width: newWidth, height: newHeight, y: newY });
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory();
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    <div 
                      className="absolute -left-2 -bottom-2 w-3 h-3 bg-blue-500 rounded-sm cursor-sw-resize border border-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startWidth = element.width;
                        const startHeight = element.height;
                        const startElX = element.x;
                        const aspectRatio = startWidth / startHeight;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaY = moveEvent.clientY - startY;
                          const newWidth = Math.max(50, startWidth - deltaX);
                          const newHeight = moveEvent.shiftKey ? newWidth / aspectRatio : Math.max(50, startHeight + deltaY);
                          const newX = startElX + (startWidth - newWidth);
                          onUpdateElement(element.id, { width: newWidth, height: newHeight, x: newX });
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory();
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    <div 
                      className="absolute -right-2 -bottom-2 w-3 h-3 bg-blue-500 rounded-sm cursor-se-resize border border-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startWidth = element.width;
                        const startHeight = element.height;
                        const aspectRatio = startWidth / startHeight;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaY = moveEvent.clientY - startY;
                          const newWidth = Math.max(50, startWidth + deltaX);
                          const newHeight = moveEvent.shiftKey ? newWidth / aspectRatio : Math.max(50, startHeight + deltaY);
                          onUpdateElement(element.id, { width: newWidth, height: newHeight });
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory();
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Côtés */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 -top-2 w-6 h-2 bg-blue-500 rounded-sm cursor-n-resize border border-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startY = e.clientY;
                        const startHeight = element.height;
                        const startElY = element.y;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaY = moveEvent.clientY - startY;
                          const newHeight = Math.max(50, startHeight - deltaY);
                          const newY = startElY + (startHeight - newHeight);
                          onUpdateElement(element.id, { height: newHeight, y: newY });
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory();
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-6 h-2 bg-blue-500 rounded-sm cursor-s-resize border border-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startY = e.clientY;
                        const startHeight = element.height;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaY = moveEvent.clientY - startY;
                          const newHeight = Math.max(50, startHeight + deltaY);
                          onUpdateElement(element.id, { height: newHeight });
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory();
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 -left-2 w-2 h-6 bg-blue-500 rounded-sm cursor-w-resize border border-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startWidth = element.width;
                        const startElX = element.x;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const newWidth = Math.max(50, startWidth - deltaX);
                          const newX = startElX + (startWidth - newWidth);
                          onUpdateElement(element.id, { width: newWidth, x: newX });
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory();
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 -right-2 w-2 h-6 bg-blue-500 rounded-sm cursor-e-resize border border-white shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startWidth = element.width;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const newWidth = Math.max(50, startWidth + deltaX);
                          onUpdateElement(element.id, { width: newWidth });
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory();
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    
                    {/* Poignée de rotation en haut */}
                    <div className="absolute left-1/2 -top-8 -translate-x-1/2 flex flex-col items-center">
                      <div className="w-0.5 h-4 bg-blue-500" />
                      <button
                        className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center cursor-grab hover:bg-blue-600 transition-colors shadow-md"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startAngle = Math.atan2(
                            e.clientY - (element.y + element.height / 2),
                            e.clientX - (element.x + element.width / 2)
                          );
                          const startRotation = element.rotation;
                          
                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const currentAngle = Math.atan2(
                              moveEvent.clientY - (element.y + element.height / 2),
                              moveEvent.clientX - (element.x + element.width / 2)
                            );
                            const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
                            let newRotation = (startRotation + angleDiff) % 360;
                            if (newRotation < 0) newRotation += 360;
                            onUpdateElement(element.id, { rotation: Math.round(newRotation) });
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                        title={language === "fr" ? "Faire pivoter" : "Rotate"}
                      >
                        <RotateCw className="w-3 h-3 text-white" />
                      </button>
                    </div>
                    
                    {/* Indicateur d'angle */}
                    {element.rotation !== 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        {element.rotation}°
                      </div>
                    )}
                  </>
                )}
                
                {/* Indicateur de verrouillage */}
                {element.locked && (
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
                
                {/* Indicateur de groupe */}
                {hasGroup && (
                  <div 
                    className="absolute -top-2 -right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-md cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (element.groupId) selectGroupElements(element.groupId);
                    }}
                    title={language === "fr" ? "Cliquer pour sélectionner le groupe" : "Click to select group"}
                  >
                    <Group className="w-3 h-3 text-white" />
                  </div>
                )}
                
                {/* Indicateur de multi-sélection */}
                {isMultiSelected && !isSelected && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded shadow-md">
                    ✓
                  </div>
                )}
                
                {/* Indicateurs de retournement */}
                {(element.flipX || element.flipY) && selectedElementId === element.id && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1">
                    {element.flipX && (
                      <div className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <FlipHorizontal className="w-2 h-2" /> H
                      </div>
                    )}
                    {element.flipY && (
                      <div className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <FlipVertical className="w-2 h-2" /> V
                      </div>
                    )}
                  </div>
                )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  {/* Dupliquer */}
                  <ContextMenuItem
                    onClick={() => {
                      const newElement: CollageElement = {
                        ...element,
                        id: `element-${Date.now()}`,
                        x: element.x + 20,
                        y: element.y + 20,
                      };
                      onAddElement(newElement);
                      setSelectedElementId(newElement.id);
                      saveToHistory();
                      toast.success(language === "fr" ? "Élément dupliqué" : "Element duplicated");
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Dupliquer" : "Duplicate"}
                  </ContextMenuItem>
                  
                  <ContextMenuSeparator />
                  
                  {/* Copier le style */}
                  <ContextMenuItem
                    onClick={() => {
                      setCopiedStyle({
                        rotation: element.rotation,
                        flipX: element.flipX,
                        flipY: element.flipY,
                        opacity: element.opacity,
                        shadow: element.shadow,
                        borderWidth: element.borderWidth,
                        borderColor: element.borderColor,
                        maskShape: element.maskShape,
                        maskUrl: element.maskUrl,
                      });
                      toast.success(language === "fr" ? "Style copié" : "Style copied");
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Copier le style" : "Copy style"}
                  </ContextMenuItem>
                  
                  {/* Coller le style */}
                  <ContextMenuItem
                    disabled={!copiedStyle}
                    onClick={() => {
                      if (copiedStyle) {
                        onUpdateElement(element.id, copiedStyle);
                        saveToHistory();
                        toast.success(language === "fr" ? "Style appliqué" : "Style applied");
                      }
                    }}
                  >
                    <ClipboardPaste className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Coller le style" : "Paste style"}
                  </ContextMenuItem>
                  
                  <ContextMenuSeparator />
                  
                  {/* Retourner horizontalement */}
                  <ContextMenuItem
                    onClick={() => {
                      onUpdateElement(element.id, { flipX: !element.flipX });
                      saveToHistory();
                    }}
                  >
                    <FlipHorizontal className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Retourner H" : "Flip H"}
                  </ContextMenuItem>
                  
                  {/* Retourner verticalement */}
                  <ContextMenuItem
                    onClick={() => {
                      onUpdateElement(element.id, { flipY: !element.flipY });
                      saveToHistory();
                    }}
                  >
                    <FlipVertical className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Retourner V" : "Flip V"}
                  </ContextMenuItem>
                  
                  <ContextMenuSeparator />
                  
                  {/* Premier plan */}
                  <ContextMenuItem
                    onClick={() => {
                      const maxZ = Math.max(...elements.map(el => el.zIndex));
                      onUpdateElement(element.id, { zIndex: maxZ + 1 });
                      saveToHistory();
                    }}
                  >
                    <ArrowUpToLine className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Premier plan" : "Bring to front"}
                  </ContextMenuItem>
                  
                  {/* Arrière-plan */}
                  <ContextMenuItem
                    onClick={() => {
                      const minZ = Math.min(...elements.map(el => el.zIndex));
                      onUpdateElement(element.id, { zIndex: minZ - 1 });
                      saveToHistory();
                    }}
                  >
                    <ArrowDownToLine className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Arrière-plan" : "Send to back"}
                  </ContextMenuItem>
                  
                  {/* Monter d'un niveau */}
                  <ContextMenuItem
                    onClick={() => {
                      onUpdateElement(element.id, { zIndex: element.zIndex + 1 });
                      saveToHistory();
                    }}
                  >
                    <MoveUp className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Monter" : "Move up"}
                  </ContextMenuItem>
                  
                  {/* Descendre d'un niveau */}
                  <ContextMenuItem
                    onClick={() => {
                      onUpdateElement(element.id, { zIndex: Math.max(0, element.zIndex - 1) });
                      saveToHistory();
                    }}
                  >
                    <MoveDown className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Descendre" : "Move down"}
                  </ContextMenuItem>
                  
                  <ContextMenuSeparator />
                  
                  {/* Verrouiller / Déverrouiller */}
                  <ContextMenuItem
                    onClick={() => {
                      onUpdateElement(element.id, { locked: !element.locked });
                      saveToHistory();
                      toast.info(element.locked 
                        ? (language === "fr" ? "Élément déverrouillé" : "Element unlocked")
                        : (language === "fr" ? "Élément verrouillé" : "Element locked")
                      );
                    }}
                  >
                    {element.locked ? (
                      <><Unlock className="w-4 h-4 mr-2" />{language === "fr" ? "Déverrouiller" : "Unlock"}</>
                    ) : (
                      <><Lock className="w-4 h-4 mr-2" />{language === "fr" ? "Verrouiller" : "Lock"}</>
                    )}
                  </ContextMenuItem>
                  
                  <ContextMenuSeparator />
                  
                  {/* Supprimer */}
                  <ContextMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => {
                      onRemoveElement(element.id);
                      setSelectedElementId(null);
                      saveToHistory();
                      toast.success(language === "fr" ? "Élément supprimé" : "Element deleted");
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Supprimer" : "Delete"}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
            })}

            {/* Guides d'alignement visuels */}
            {showGuides && activeGuides.vertical.map((x, i) => (
              <div
                key={`guide-v-${i}`}
                className="absolute top-0 bottom-0 w-px bg-pink-500 pointer-events-none z-50"
                style={{ left: x }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-pink-500 text-white text-[9px] px-1 rounded">
                  {Math.round(x)}
                </div>
              </div>
            ))}
            {showGuides && activeGuides.horizontal.map((y, i) => (
              <div
                key={`guide-h-${i}`}
                className="absolute left-0 right-0 h-px bg-pink-500 pointer-events-none z-50"
                style={{ top: y }}
              >
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-pink-500 text-white text-[9px] px-1 rounded">
                  {Math.round(y)}
                </div>
              </div>
            ))}

            {/* Message si vide avec indication de drop */}
            {elements.length === 0 && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${
                draggedItem ? "bg-purple-100/50" : "text-gray-400"
              }`}>
                <Layers className={`w-16 h-16 mb-4 ${draggedItem ? "text-purple-400 animate-pulse" : "opacity-30"}`} />
                <p className={draggedItem ? "text-purple-600 font-medium" : ""}>
                  {draggedItem 
                    ? (language === "fr" ? "Déposez ici !" : "Drop here!")
                    : (language === "fr" ? "Glissez des éléments ici" : "Drag elements here")}
                </p>
                {!draggedItem && (
                  <p className="text-sm mt-1">
                    {language === "fr" 
                      ? "depuis la bibliothèque à gauche" 
                      : "from the library on the left"}
                  </p>
                )}
              </div>
            )}

            {/* Indicateur de zone de drop quand on drag */}
            {draggedItem && elements.length > 0 && (
              <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-purple-400 rounded-lg bg-purple-100/20" />
            )}
          </div>
        </div>
      </div>

      {/* Panneau latéral droit - Propriétés */}
      <div className="w-56 bg-gray-50 border-l p-3 flex flex-col gap-3">
        {/* Couleur de fond */}
        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Palette className="w-3 h-3" />
            {language === "fr" ? "Fond" : "Background"}
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {backgroundColors.map((color) => (
              <button
                key={color}
                onClick={() => setBackgroundColor(color)}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  backgroundColor === color 
                    ? "border-blue-500 scale-110" 
                    : "border-gray-200 hover:border-gray-400"
                }`}
                style={{
                  backgroundColor: color === "transparent" ? undefined : color,
                  backgroundImage: color === "transparent" 
                    ? "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 6px 6px" 
                    : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {/* Propriétés de l'élément sélectionné */}
        {selectedElement && (
          <div className="border-t pt-3">
            <h3 className="text-xs font-medium text-gray-700 mb-2">
              {language === "fr" ? "Élément sélectionné" : "Selected element"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500">
                  {language === "fr" ? "Opacité" : "Opacity"}
                </label>
                <Slider
                  value={[selectedElement.opacity * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([value]) => 
                    onUpdateElement(selectedElementId!, { opacity: value / 100 })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 flex items-center justify-between">
                  <span>{language === "fr" ? "Rotation" : "Rotation"}</span>
                  <span className="font-mono text-blue-600">{selectedElement.rotation}°</span>
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onUpdateElement(selectedElementId!, { rotation: (selectedElement.rotation - 90 + 360) % 360 })}
                    title={language === "fr" ? "Rotation -90°" : "Rotate -90°"}
                  >
                    <RotateCw className="w-3 h-3 transform -scale-x-100" />
                  </Button>
                  <Slider
                    value={[selectedElement.rotation]}
                    min={0}
                    max={360}
                    step={5}
                    onValueChange={([value]) => 
                      onUpdateElement(selectedElementId!, { rotation: value })
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onUpdateElement(selectedElementId!, { rotation: (selectedElement.rotation + 90) % 360 })}
                    title={language === "fr" ? "Rotation +90°" : "Rotate +90°"}
                  >
                    <RotateCw className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex justify-center gap-1 mt-1">
                  {[0, 90, 180, 270].map((angle) => (
                    <Button
                      key={angle}
                      variant={selectedElement.rotation === angle ? "default" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onUpdateElement(selectedElementId!, { rotation: angle })}
                    >
                      {angle}°
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500">
                <div>X: {Math.round(selectedElement.x)}</div>
                <div>Y: {Math.round(selectedElement.y)}</div>
                <div>W: {Math.round(selectedElement.width)}</div>
                <div>H: {Math.round(selectedElement.height)}</div>
              </div>

              {/* Retournement */}
              <div>
                <label className="text-[10px] text-gray-500">
                  {language === "fr" ? "Retournement" : "Flip"}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant={selectedElement.flipX ? "default" : "outline"}
                    size="sm"
                    className="h-7 flex-1"
                    onClick={() => onUpdateElement(selectedElementId!, { flipX: !selectedElement.flipX })}
                    title={language === "fr" ? "Retourner horizontalement" : "Flip horizontal"}
                  >
                    <FlipHorizontal className="w-3 h-3 mr-1" />
                    H
                  </Button>
                  <Button
                    variant={selectedElement.flipY ? "default" : "outline"}
                    size="sm"
                    className="h-7 flex-1"
                    onClick={() => onUpdateElement(selectedElementId!, { flipY: !selectedElement.flipY })}
                    title={language === "fr" ? "Retourner verticalement" : "Flip vertical"}
                  >
                    <FlipVertical className="w-3 h-3 mr-1" />
                    V
                  </Button>
                </div>
              </div>

              {/* Verrouillage */}
              <div>
                <Button
                  variant={selectedElement.locked ? "default" : "outline"}
                  size="sm"
                  className={`w-full h-7 ${selectedElement.locked ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                  onClick={() => onUpdateElement(selectedElementId!, { locked: !selectedElement.locked })}
                >
                  {selectedElement.locked ? (
                    <>
                      <Lock className="w-3 h-3 mr-2" />
                      {language === "fr" ? "Déverrouiller" : "Unlock"}
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 mr-2" />
                      {language === "fr" ? "Verrouiller" : "Lock"}
                    </>
                  )}
                </Button>
              </div>

              {/* Masques géométriques */}
              {selectedElement.type === "image" && (
                <div>
                  <label className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Circle className="w-3 h-3" />
                    {language === "fr" ? "Masque" : "Mask"}
                  </label>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {/* Aucun masque */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "none", maskUrl: undefined })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        !selectedElement.maskShape || selectedElement.maskShape === "none"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Aucun masque" : "No mask"}
                    >
                      <Square className="w-4 h-4 text-gray-400" />
                    </button>
                    {/* Cercle */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "circle", maskUrl: "/mise-en-page/masques/individuelles/masque-cercle.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "circle"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Cercle" : "Circle"}
                    >
                      <div className="w-5 h-5 rounded-full bg-gray-600" />
                    </button>
                    {/* Ovale */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "oval", maskUrl: "/mise-en-page/masques/individuelles/masque-ovale.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "oval"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Ovale" : "Oval"}
                    >
                      <div className="w-5 h-4 rounded-full bg-gray-600" />
                    </button>
                    {/* Triangle */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "triangle", maskUrl: "/mise-en-page/masques/individuelles/masque-triangle.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "triangle"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Triangle" : "Triangle"}
                    >
                      <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent border-b-gray-600" />
                    </button>
                    {/* Rectangle */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "rectangle", maskUrl: "/mise-en-page/masques/individuelles/masque-rectangle.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "rectangle"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Rectangle" : "Rectangle"}
                    >
                      <div className="w-5 h-4 bg-gray-600" />
                    </button>
                    {/* Hexagone */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "hexagon", maskUrl: "/mise-en-page/masques/individuelles/masque-hexagone.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "hexagon"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Hexagone" : "Hexagon"}
                    >
                      <div className="w-5 h-5 bg-gray-600" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                    </button>
                    {/* Étoile */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "star", maskUrl: "/mise-en-page/masques/individuelles/masque-etoile-6.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "star"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Étoile" : "Star"}
                    >
                      <div className="w-5 h-5 bg-gray-600" style={{ clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" }} />
                    </button>
                    {/* Losange */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "diamond", maskUrl: "/mise-en-page/masques/individuelles/masque-losange.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "diamond"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Losange" : "Diamond"}
                    >
                      <div className="w-4 h-4 bg-gray-600 rotate-45" />
                    </button>
                    {/* Coeur */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "heart", maskUrl: "/mise-en-page/masques/individuelles/masque-coeur.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "heart"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Coeur" : "Heart"}
                    >
                      <div className="text-gray-600 text-lg leading-none">♥</div>
                    </button>
                    {/* Pentagone */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "pentagon", maskUrl: "/mise-en-page/masques/individuelles/masque-pentagone.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "pentagon"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Pentagone" : "Pentagon"}
                    >
                      <div className="w-5 h-5 bg-gray-600" style={{ clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }} />
                    </button>
                    {/* Goutte */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "drop", maskUrl: "/mise-en-page/masques/individuelles/masque-goutte.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "drop"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Goutte" : "Drop"}
                    >
                      <div className="w-4 h-5 bg-gray-600" style={{ borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%" }} />
                    </button>
                    {/* Feuille */}
                    <button
                      onClick={() => onUpdateElement(selectedElementId!, { maskShape: "leaf", maskUrl: "/mise-en-page/masques/individuelles/masque-feuille.png" })}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElement.maskShape === "leaf"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={language === "fr" ? "Feuille" : "Leaf"}
                    >
                      <div className="text-gray-600 text-lg leading-none">🍃</div>
                    </button>
                    {/* Import masque personnalisé */}
                    <label
                      className="w-8 h-8 rounded border-2 border-dashed border-gray-300 flex items-center justify-center transition-all hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                      title={language === "fr" ? "Importer un masque" : "Import mask"}
                    >
                      <Upload className="w-4 h-4 text-gray-400" />
                      <input
                        type="file"
                        accept="image/png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              onUpdateElement(selectedElementId!, { 
                                maskShape: "none", 
                                maskUrl: dataUrl 
                              });
                              toast.success(language === "fr" ? "Masque personnalisé appliqué" : "Custom mask applied");
                            };
                            reader.readAsDataURL(file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  
                  {/* Effets de bordure sur le masque */}
                  {selectedElement.maskUrl && (
                    <div className="mt-2 space-y-2">
                      <label className="text-[10px] text-gray-500">
                        {language === "fr" ? "Effets de bordure" : "Border effects"}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {/* Ombre portée */}
                        <Button
                          variant={selectedElement.shadow ? "default" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => onUpdateElement(selectedElementId!, { shadow: !selectedElement.shadow })}
                        >
                          {language === "fr" ? "Ombre" : "Shadow"}
                        </Button>
                        {/* Contour */}
                        <Button
                          variant={(selectedElement.borderWidth && selectedElement.borderWidth > 0) ? "default" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => {
                            if (selectedElement.borderWidth && selectedElement.borderWidth > 0) {
                              onUpdateElement(selectedElementId!, { borderWidth: 0 });
                            } else {
                              onUpdateElement(selectedElementId!, { borderWidth: 3, borderColor: "#3b82f6" });
                            }
                          }}
                        >
                          {language === "fr" ? "Contour" : "Border"}
                        </Button>
                      </div>
                      {/* Couleur du contour */}
                      {selectedElement.borderWidth && selectedElement.borderWidth > 0 && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-gray-500">
                            {language === "fr" ? "Couleur" : "Color"}
                          </label>
                          <div className="flex gap-1">
                            {["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#000000", "#ffffff"].map((color) => (
                              <button
                                key={color}
                                onClick={() => onUpdateElement(selectedElementId!, { borderColor: color })}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${
                                  selectedElement.borderColor === color
                                    ? "border-blue-500 scale-110"
                                    : "border-gray-200 hover:border-gray-400"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Épaisseur du contour */}
                      {selectedElement.borderWidth && selectedElement.borderWidth > 0 && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-gray-500 w-16">
                            {language === "fr" ? "Épaisseur" : "Width"}
                          </label>
                          <Slider
                            value={[selectedElement.borderWidth]}
                            min={1}
                            max={10}
                            step={1}
                            onValueChange={([value]) => onUpdateElement(selectedElementId!, { borderWidth: value })}
                            className="flex-1"
                          />
                          <span className="text-[10px] text-gray-500 w-6">{selectedElement.borderWidth}px</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Recadrage interactif */}
                  <div className="mt-3 space-y-2 border-t pt-2">
                    <label className="text-[10px] text-gray-500 font-medium">
                      {language === "fr" ? "Recadrage dans le masque" : "Crop inside mask"}
                    </label>
                    <div className="space-y-2">
                      {/* Position horizontale */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 w-12">X</label>
                        <Slider
                          value={[selectedElement.cropX ?? 50]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([value]) => onUpdateElement(selectedElementId!, { cropX: value })}
                          className="flex-1"
                        />
                        <span className="text-[10px] text-gray-500 w-8">{selectedElement.cropX ?? 50}%</span>
                      </div>
                      {/* Position verticale */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 w-12">Y</label>
                        <Slider
                          value={[selectedElement.cropY ?? 50]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([value]) => onUpdateElement(selectedElementId!, { cropY: value })}
                          className="flex-1"
                        />
                        <span className="text-[10px] text-gray-500 w-8">{selectedElement.cropY ?? 50}%</span>
                      </div>
                      {/* Échelle */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 w-12">
                          {language === "fr" ? "Zoom" : "Zoom"}
                        </label>
                        <Slider
                          value={[selectedElement.cropScale ?? 1]}
                          min={0.5}
                          max={3}
                          step={0.1}
                          onValueChange={([value]) => onUpdateElement(selectedElementId!, { cropScale: value })}
                          className="flex-1"
                        />
                        <span className="text-[10px] text-gray-500 w-8">{((selectedElement.cropScale ?? 1) * 100).toFixed(0)}%</span>
                      </div>
                      {/* Bouton réinitialiser */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-6 text-[10px]"
                        onClick={() => onUpdateElement(selectedElementId!, { cropX: 50, cropY: 50, cropScale: 1 })}
                      >
                        {language === "fr" ? "Réinitialiser le recadrage" : "Reset crop"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Liste des calques */}
        <div className="border-t pt-3 flex-1 overflow-auto">
          <h3 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Layers className="w-3 h-3" />
            {language === "fr" ? "Calques" : "Layers"} ({elements.length})
          </h3>
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {[...elements]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((element) => (
                  <button
                    key={element.id}
                    onClick={() => setSelectedElementId(element.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs ${
                      selectedElementId === element.id
                        ? "bg-blue-100 text-blue-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {element.type === "image" && element.src && (
                      <img src={element.src} alt="" className="w-5 h-5 object-contain rounded" />
                    )}
                    <span className="truncate flex-1">
                      {element.type === "image" ? "Image" : element.text || (language === 'fr' ? "Élément" : "Element")}
                    </span>
                    <span className="text-[10px] text-gray-400">z{element.zIndex}</span>
                  </button>
                ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
