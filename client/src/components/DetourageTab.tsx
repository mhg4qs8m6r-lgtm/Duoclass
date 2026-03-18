import { useState, useRef, useEffect, useCallback, DragEvent, MouseEvent, WheelEvent } from "react";
import { Scissors, Wand2, RotateCcw, Check, Loader2, Undo, Redo, Trash2, ZoomIn, ZoomOut, Move, MousePointer, Hexagon, PenTool, Plus, Eraser, Circle, User, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { PhotoFrame } from "@/types/photo";
import { BibliothequeItem } from "./CreationsAtelier";
import { removeBackground } from "@imgly/background-removal";
import { toast } from "sonner";
import { useFaceDetection } from "@/hooks/useFaceDetection";

interface DetourageTabProps {
  selectedPhoto?: PhotoFrame | null;
  selectedPhotos?: PhotoFrame[]; // Toutes les photos sélectionnées de l'album
  onSelectPhoto?: (photo: PhotoFrame) => void; // Callback pour changer la photo active
  onAddToBibliotheque: (item: BibliothequeItem) => void;
}

interface Point {
  x: number;
  y: number;
}

type ManualMode = "lasso" | "polygon" | "bezier" | "magicwand"; // Lasso = tracé continu, Polygon = point par point, Bezier = courbes lisses, MagicWand = sélection par couleur
type LassoTool = "draw" | "edit" | "pan" | "insert" | "eraser"; // insert = ajouter un point, eraser = gomme

export default function DetourageTab({
  selectedPhoto,
  selectedPhotos = [],
  onSelectPhoto,
  onAddToBibliotheque,
}: DetourageTabProps) {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lassoCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<"auto" | "manual" | "face">("auto");
  const [manualMode, setManualMode] = useState<ManualMode>("lasso");
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // États pour le lasso/polygone manuel
  const [isDrawing, setIsDrawing] = useState(false);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [lassoHistory, setLassoHistory] = useState<Point[][]>([]);
  const [brushSize, setBrushSize] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  
  // États pour le zoom et le pan
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  
  // Outil actif
  const [lassoTool, setLassoTool] = useState<LassoTool>("draw");
  
  // État pour l'édition des points
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  
  // État pour le mode polygone - position du curseur pour la ligne de prévisualisation
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  
  // État pour le lissage automatique
  const [smoothingEnabled, setSmoothingEnabled] = useState(true);
  const [smoothingStrength, setSmoothingStrength] = useState(0.5); // 0 = pas de lissage, 1 = lissage max
  
  // État pour l'historique Undo/Redo complet
  const [undoStack, setUndoStack] = useState<Point[][]>([]);
  const [redoStack, setRedoStack] = useState<Point[][]>([]);
  
  // Points de contrôle Bézier (pour chaque point, on a un point de contrôle entrant et sortant)
  const [bezierControlPoints, setBezierControlPoints] = useState<{in: Point, out: Point}[]>([]);
  
  // État pour la gomme
  const [eraserSize, setEraserSize] = useState(20);
  const [isErasing, setIsErasing] = useState(false);
  
  // État pour l'édition des poignées Bézier
  const [selectedControlPoint, setSelectedControlPoint] = useState<{pointIndex: number, type: 'in' | 'out'} | null>(null);
  const [isDraggingControlPoint, setIsDraggingControlPoint] = useState(false);
  
  // Image originale pour le détourage
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  
  // États pour la baguette magique
  const [magicWandTolerance, setMagicWandTolerance] = useState(32); // Tolérance de couleur (0-255)
  const [magicWandContiguous, setMagicWandContiguous] = useState(true); // Sélection contiguë uniquement
  const [magicWandSelection, setMagicWandSelection] = useState<ImageData | null>(null);
  
  // État pour le redimensionnement de l'image détourée
  const [resultScale, setResultScale] = useState(100); // Pourcentage (50% à 200%)
  const [resultDimensions, setResultDimensions] = useState<{width: number, height: number} | null>(null);
  
  // Photos avec contenu (filtrées)
  const photosWithContent = selectedPhotos.filter(p => p.src || p.photoUrl);
  
  // Hook de détection de visage
  const { isLoading: isFaceLoading, faces, detectFaces, createFaceMask, loadModels } = useFaceDetection();
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
  const [faceShape, setFaceShape] = useState<'circle' | 'oval' | 'rectangle'>('oval');
  const [facePadding, setFacePadding] = useState(30);

  // Dessiner l'image source sur le canvas
  useEffect(() => {
    if (selectedPhoto?.src && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setOriginalImageSize({ width: img.width, height: img.height });
        
        const maxWidth = 500;
        const maxHeight = 350;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        if (lassoCanvasRef.current) {
          lassoCanvasRef.current.width = width;
          lassoCanvasRef.current.height = height;
        }
        
        setImageSize({ width, height });
        setImageLoaded(true);
        setLassoPoints([]);
        setLassoHistory([]);
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
        setIsPolygonClosed(false);
      };
      img.src = selectedPhoto.src;
    }
  }, [selectedPhoto]);

  // Dessiner le lasso/polygone sur le canvas overlay
  useEffect(() => {
    if (!lassoCanvasRef.current || mode !== "manual") return;
    
    const canvas = lassoCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (lassoPoints.length === 0) return;
    
    // Dessiner le premier point s'il n'y en a qu'un
    if (lassoPoints.length === 1) {
      ctx.beginPath();
      ctx.arc(lassoPoints[0].x, lassoPoints[0].y, 4, 0, Math.PI * 2); // Point plus petit
      ctx.fillStyle = "#22c55e"; // Vert pour le point de départ
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Ligne de prévisualisation vers le curseur (fil d'Ariane - mode polygone)
      if (manualMode === "polygon" && cursorPosition && !isPolygonClosed) {
        // Ligne principale (plus visible)
        ctx.beginPath();
        ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        ctx.lineTo(cursorPosition.x, cursorPosition.y);
        ctx.strokeStyle = "#9333ea"; // Violet plein
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]); // Tirets plus longs
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Petit cercle au curseur pour indiquer où sera le prochain point
        ctx.beginPath();
        ctx.arc(cursorPosition.x, cursorPosition.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(147, 51, 234, 0.3)";
        ctx.fill();
        ctx.strokeStyle = "#9333ea";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      return;
    }

    // Appliquer le lissage si activé (mode lasso uniquement)
    const pointsToDraw = (manualMode === "lasso" && smoothingEnabled && !isDrawing && lassoPoints.length > 4)
      ? smoothPoints(lassoPoints)
      : lassoPoints;
    
    // Dessiner le tracé
    ctx.beginPath();
    ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
    
    if (manualMode === "bezier" && pointsToDraw.length >= 3) {
      // Mode Bézier : courbes quadratiques entre les points
      for (let i = 1; i < pointsToDraw.length - 1; i++) {
        const xc = (pointsToDraw[i].x + pointsToDraw[i + 1].x) / 2;
        const yc = (pointsToDraw[i].y + pointsToDraw[i + 1].y) / 2;
        ctx.quadraticCurveTo(pointsToDraw[i].x, pointsToDraw[i].y, xc, yc);
      }
      // Dernier segment
      const lastPoint = pointsToDraw[pointsToDraw.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
    } else {
      // Mode normal : lignes droites
      for (let i = 1; i < pointsToDraw.length; i++) {
        ctx.lineTo(pointsToDraw[i].x, pointsToDraw[i].y);
      }
    }
    
    // Fermer le chemin si terminé
    const isClosed = (manualMode === "lasso" && !isDrawing && lassoPoints.length > 2) || 
                     ((manualMode === "polygon" || manualMode === "bezier") && isPolygonClosed);
    
    if (isClosed) {
      ctx.closePath();
      ctx.fillStyle = "rgba(147, 51, 234, 0.15)";
      ctx.fill();
    }
    
    // Trait principal
    ctx.strokeStyle = "#9333ea";
    ctx.lineWidth = Math.max(1, brushSize);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    
    // Contour blanc
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = Math.max(1, brushSize) + 1;
    ctx.stroke();
    
    ctx.strokeStyle = "#9333ea";
    ctx.lineWidth = Math.max(1, brushSize);
    ctx.stroke();
    
    // Ligne de prévisualisation vers le curseur (fil d'Ariane - mode polygone, non fermé)
    if (manualMode === "polygon" && cursorPosition && !isPolygonClosed && lassoPoints.length > 0) {
      const lastPoint = lassoPoints[lassoPoints.length - 1];
      
      // Ligne principale (plus visible)
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(cursorPosition.x, cursorPosition.y);
      ctx.strokeStyle = "#9333ea"; // Violet plein
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]); // Tirets plus longs
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Petit cercle au curseur pour indiquer où sera le prochain point
      ctx.beginPath();
      ctx.arc(cursorPosition.x, cursorPosition.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(147, 51, 234, 0.3)";
      ctx.fill();
      ctx.strokeStyle = "#9333ea";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Dessiner les points de contrôle (petits points pour le mode polygone)
    const pointRadius = lassoTool === "edit" ? 5 : (manualMode === "polygon" ? 3 : 2);
    
    lassoPoints.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
      
      if (index === 0) {
        ctx.fillStyle = "#22c55e"; // Premier point en vert
      } else if (selectedPointIndex === index) {
        ctx.fillStyle = "#f97316"; // Point sélectionné en orange
      } else {
        ctx.fillStyle = "#9333ea";
      }
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Numéro du point en mode polygone (seulement en mode édition avec gros points)
      if (manualMode === "polygon" && lassoTool === "edit" && pointRadius >= 4) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((index + 1).toString(), point.x, point.y);
      }
    });
  }, [lassoPoints, isDrawing, mode, brushSize, lassoTool, selectedPointIndex, manualMode, cursorPosition, isPolygonClosed, smoothingEnabled, smoothingStrength]);

  // Gestion du zoom avec la molette
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (mode !== "manual") return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(5, zoom + delta));
    setZoom(newZoom);
  };

  // Coordonnées canvas
  const getCanvasCoords = (e: MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = lassoCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = ((e.clientX - rect.left) * scaleX - panOffset.x) / zoom;
    const y = ((e.clientY - rect.top) * scaleY - panOffset.y) / zoom;
    
    return { x, y };
  };

  // Trouver le point le plus proche
  const findNearestPoint = (clickPos: Point, threshold: number = 15): number | null => {
    let nearestIndex: number | null = null;
    let minDistance = threshold;
    
    lassoPoints.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(point.x - clickPos.x, 2) + Math.pow(point.y - clickPos.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });
    
    return nearestIndex;
  };

  // Trouver le segment le plus proche (pour insertion de point)
  const findNearestSegment = (clickPos: Point, threshold: number = 10): number | null => {
    if (lassoPoints.length < 2) return null;
    
    let nearestIndex: number | null = null;
    let minDistance = threshold;
    
    for (let i = 0; i < lassoPoints.length - 1; i++) {
      const p1 = lassoPoints[i];
      const p2 = lassoPoints[i + 1];
      
      // Distance du point au segment
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthSq = dx * dx + dy * dy;
      
      if (lengthSq === 0) continue;
      
      // Projection du point sur le segment
      let t = ((clickPos.x - p1.x) * dx + (clickPos.y - p1.y) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));
      
      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;
      
      const distance = Math.sqrt(
        Math.pow(clickPos.x - projX, 2) + Math.pow(clickPos.y - projY, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    // Vérifier aussi le segment de fermeture si fermé
    if (isPolygonClosed && lassoPoints.length >= 3) {
      const p1 = lassoPoints[lassoPoints.length - 1];
      const p2 = lassoPoints[0];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthSq = dx * dx + dy * dy;
      
      if (lengthSq > 0) {
        let t = ((clickPos.x - p1.x) * dx + (clickPos.y - p1.y) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        
        const distance = Math.sqrt(
          Math.pow(clickPos.x - projX, 2) + Math.pow(clickPos.y - projY, 2)
        );
        
        if (distance < minDistance) {
          nearestIndex = lassoPoints.length - 1; // Index du dernier point (segment vers le premier)
        }
      }
    }
    
    return nearestIndex;
  };

  // Vérifier si on clique près du premier point (pour fermer le polygone)
  const isNearFirstPoint = (point: Point, threshold: number = 15): boolean => {
    if (lassoPoints.length < 3) return false;
    const firstPoint = lassoPoints[0];
    const distance = Math.sqrt(
      Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
    );
    return distance < threshold;
  };
  
  // Effacer les points dans le rayon de la gomme
  const erasePointsNear = (center: Point) => {
    const radius = eraserSize / zoom; // Ajuster pour le zoom
    setLassoPoints(prev => {
      const newPoints = prev.filter(p => {
        const distance = Math.sqrt(
          Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2)
        );
        return distance > radius;
      });
      // Si on a effacé des points, réouvrir la sélection
      if (newPoints.length !== prev.length && isPolygonClosed) {
        setIsPolygonClosed(false);
      }
      return newPoints;
    });
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "manual") return;
    
    const point = getCanvasCoords(e);
    
    if (lassoTool === "pan") {
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (lassoTool === "edit") {
      const nearestIndex = findNearestPoint(point);
      if (nearestIndex !== null) {
        setSelectedPointIndex(nearestIndex);
        setIsDraggingPoint(true);
      }
      return;
    }
    
    // Mode insertion de point entre deux points existants
    if (lassoTool === "insert") {
      const segmentIndex = findNearestSegment(point);
      if (segmentIndex !== null) {
        // Sauvegarder l'état pour Undo
        setUndoStack(prev => [...prev, [...lassoPoints]]);
        setRedoStack([]);
        
        // Insérer le point après l'index du segment
        const insertIndex = segmentIndex + 1;
        setLassoPoints(prev => [
          ...prev.slice(0, insertIndex),
          point,
          ...prev.slice(insertIndex)
        ]);
        
        toast.success(language === "fr" 
          ? `Point inséré entre ${segmentIndex + 1} et ${segmentIndex + 2}` 
          : `Point inserted between ${segmentIndex + 1} and ${segmentIndex + 2}`);
      }
      return;
    }
    
    // Mode gomme : effacer les points proches
    if (lassoTool === "eraser") {
      setIsErasing(true);
      // Sauvegarder l'état pour Undo avant de commencer à effacer
      setUndoStack(prev => [...prev, [...lassoPoints]]);
      setRedoStack([]);
      // Effacer les points dans le rayon de la gomme
      erasePointsNear(point);
      return;
    }
    
    // Mode dessin
    if (manualMode === "lasso") {
      // Lasso : tracé continu
      setIsDrawing(true);
      setLassoPoints([point]);
      setIsPolygonClosed(false);
    } else {
      // Polygone ou Bézier : point par point
      if (isPolygonClosed) {
        // Réinitialiser si déjà fermé
        setLassoPoints([point]);
        setIsPolygonClosed(false);
      } else if (lassoPoints.length >= 3 && isNearFirstPoint(point)) {
        // Fermer le polygone/bézier en cliquant près du premier point
        setIsPolygonClosed(true);
        setLassoHistory(prev => [...prev, [...lassoPoints]]);
        toast.success(language === "fr" ? "Sélection fermée !" : "Selection closed!");
      } else {
        // Ajouter un nouveau point
        setLassoPoints(prev => [...prev, point]);
      }
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "manual") return;
    
    const point = getCanvasCoords(e);
    
    // Mettre à jour la position du curseur pour la prévisualisation
    if ((manualMode === "polygon" || manualMode === "bezier") && !isPolygonClosed) {
      setCursorPosition(point);
    }
    
    if (lassoTool === "pan" && isPanning) {
      const dx = e.clientX - lastPanPosition.x;
      const dy = e.clientY - lastPanPosition.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (lassoTool === "edit" && isDraggingPoint && selectedPointIndex !== null) {
      setLassoPoints(prev => {
        const newPoints = [...prev];
        newPoints[selectedPointIndex] = point;
        return newPoints;
      });
      return;
    }
    
    // Mode gomme : effacer en continu
    if (lassoTool === "eraser" && isErasing) {
      erasePointsNear(point);
      return;
    }
    
    // Mode lasso uniquement : tracé continu
    if (!isDrawing || lassoTool !== "draw" || manualMode !== "lasso") return;
    
    const lastPoint = lassoPoints[lassoPoints.length - 1];
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
    );
    
    if (distance > 3) {
      setLassoPoints(prev => [...prev, point]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    if (isErasing) {
      setIsErasing(false);
      return;
    }
    
    if (isDraggingPoint) {
      setIsDraggingPoint(false);
      if (lassoPoints.length > 2) {
        setLassoHistory(prev => [...prev, [...lassoPoints]]);
      }
      return;
    }
    
    if (!isDrawing || manualMode !== "lasso") return;
    
    setIsDrawing(false);
    
    if (lassoPoints.length > 5) {
      setLassoHistory(prev => [...prev, lassoPoints]);
    }
  };

  // Double-clic pour fermer le polygone ou bézier
  const handleDoubleClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "manual" || (manualMode !== "polygon" && manualMode !== "bezier")) return;
    if (lassoPoints.length < 3) {
      toast.error(language === "fr" ? "Placez au moins 3 points" : "Place at least 3 points");
      return;
    }
    
    setIsPolygonClosed(true);
    setLassoHistory(prev => [...prev, [...lassoPoints]]);
    toast.success(language === "fr" ? "Sélection fermée !" : "Selection closed!");
  };

  // Clic droit pour supprimer un point
  const handleContextMenu = (e: MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (mode !== "manual") return;
    
    const point = getCanvasCoords(e);
    const nearestIndex = findNearestPoint(point, 20);
    
    if (nearestIndex !== null && lassoPoints.length > 1) {
      // Ne pas supprimer si c'est le seul point ou si on a moins de 3 points en mode polygone fermé
      if (manualMode === "polygon" && isPolygonClosed && lassoPoints.length <= 3) {
        toast.error(language === "fr" ? "Minimum 3 points requis" : "Minimum 3 points required");
        return;
      }
      
      setLassoPoints(prev => prev.filter((_, i) => i !== nearestIndex));
      setSelectedPointIndex(null);
      
      // Si on supprime un point et qu'on était fermé, rouvrir si moins de 3 points
      if (isPolygonClosed && lassoPoints.length - 1 < 3) {
        setIsPolygonClosed(false);
      }
      
      toast.success(language === "fr" ? `Point ${nearestIndex + 1} supprimé` : `Point ${nearestIndex + 1} deleted`);
    }
  };

  // Fonction de lissage Catmull-Rom
  const smoothPoints = (points: Point[], tension: number = 0.5): Point[] => {
    if (!smoothingEnabled || points.length < 4) return points;
    
    const smoothed: Point[] = [];
    const t = tension * smoothingStrength;
    
    // Ajouter le premier point
    smoothed.push(points[0]);
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      // Interpoler entre p1 et p2
      for (let j = 1; j <= 3; j++) {
        const s = j / 4;
        const s2 = s * s;
        const s3 = s2 * s;
        
        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * s * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 * t +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3 * t
        );
        
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * s * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 * t +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3 * t
        );
        
        smoothed.push({ x, y });
      }
    }
    
    // Ajouter le dernier point
    smoothed.push(points[points.length - 1]);
    
    return smoothed;
  };

  // Annuler (Undo) - Amélioré avec pile Undo/Redo
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      // Sauvegarder l'état actuel dans Redo
      setRedoStack(prev => [...prev, [...lassoPoints]]);
      // Restaurer l'état précédent
      const previousState = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setLassoPoints(previousState);
      toast.info(language === "fr" ? "Action annulée" : "Action undone");
    } else if (manualMode === "polygon" && lassoPoints.length > 0 && !isPolygonClosed) {
      // En mode polygone, retirer le dernier point
      setRedoStack(prev => [...prev, [...lassoPoints]]);
      setLassoPoints(prev => prev.slice(0, -1));
    } else if (lassoHistory.length > 1) {
      const newHistory = [...lassoHistory];
      newHistory.pop();
      setLassoHistory(newHistory);
      setLassoPoints(newHistory[newHistory.length - 1]);
      setIsPolygonClosed(false);
    } else {
      setLassoPoints([]);
      setLassoHistory([]);
      setIsPolygonClosed(false);
    }
    setSelectedPointIndex(null);
  }, [undoStack, lassoPoints, manualMode, isPolygonClosed, lassoHistory, language]);

  // Rétablir (Redo)
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      // Sauvegarder l'état actuel dans Undo
      setUndoStack(prev => [...prev, [...lassoPoints]]);
      // Restaurer l'état suivant
      const nextState = redoStack[redoStack.length - 1];
      setRedoStack(prev => prev.slice(0, -1));
      setLassoPoints(nextState);
      toast.info(language === "fr" ? "Action rétablie" : "Action redone");
    }
  }, [redoStack, lassoPoints, language]);

  // Raccourcis clavier Ctrl+Z et Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== "manual") return;
      
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
  }, [mode, handleUndo, handleRedo]);

  // Effacer tout
  const handleClearLasso = () => {
    setLassoPoints([]);
    setLassoHistory([]);
    setSelectedPointIndex(null);
    setIsPolygonClosed(false);
  };

  // Zoom
  const handleZoomIn = () => setZoom(prev => Math.min(5, prev + 0.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.25));
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };
  
  // Fonction pour recadrer automatiquement l'image à sa bounding box (supprime les pixels transparents)
  const cropToBoundingBox = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    
    // Trouver les limites de la zone non-transparente
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // Si aucun pixel non-transparent trouvé, retourner l'image originale
    if (minX >= maxX || minY >= maxY) {
      return canvas.toDataURL("image/png");
    }
    
    // Ajouter une petite marge (2px)
    const margin = 2;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(canvas.width - 1, maxX + margin);
    maxY = Math.min(canvas.height - 1, maxY + margin);
    
    // Créer un nouveau canvas avec les dimensions recadrées
    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;
    
    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;
    
    const croppedCtx = croppedCanvas.getContext("2d");
    if (!croppedCtx) return canvas.toDataURL("image/png");
    
    // Copier la zone recadrée
    croppedCtx.drawImage(
      canvas,
      minX, minY, croppedWidth, croppedHeight,
      0, 0, croppedWidth, croppedHeight
    );
    
    return croppedCanvas.toDataURL("image/png");
  };

  // Changer de mode manuel
  const handleManualModeChange = (newMode: ManualMode) => {
    setManualMode(newMode);
    setLassoPoints([]);
    setLassoHistory([]);
    setIsPolygonClosed(false);
    setSelectedPointIndex(null);
  };

  // Appliquer le détourage manuel
  const handleManualDetourage = async () => {
    const minPoints = (manualMode === "polygon" || manualMode === "bezier") ? 3 : 5;
    const isClosed = (manualMode === "polygon" || manualMode === "bezier") ? isPolygonClosed : lassoPoints.length >= minPoints;
    
    if (!canvasRef.current || !lassoCanvasRef.current || lassoPoints.length < minPoints || ((manualMode === "polygon" || manualMode === "bezier") && !isPolygonClosed)) {
      toast.error(language === "fr" 
        ? ((manualMode === "polygon" || manualMode === "bezier") ? "Fermez la sélection (double-clic ou clic sur le premier point)" : "Tracez un contour autour de l'élément")
        : ((manualMode === "polygon" || manualMode === "bezier") ? "Close the selection (double-click or click first point)" : "Draw a contour around the element"));
      return;
    }

    setIsProcessing(true);

    try {
      const sourceCanvas = canvasRef.current;
      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = sourceCanvas.width;
      resultCanvas.height = sourceCanvas.height;
      const ctx = resultCanvas.getContext("2d");
      
      if (!ctx) throw new Error("Cannot get context");

      ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);

      // Utiliser les points lissés pour le détourage si le lissage est activé
      const pointsForClip = (manualMode === "lasso" && smoothingEnabled && lassoPoints.length > 4)
        ? smoothPoints(lassoPoints)
        : lassoPoints;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pointsForClip[0].x, pointsForClip[0].y);
      
      if (manualMode === "bezier" && pointsForClip.length >= 3) {
        // Mode Bézier : courbes quadratiques pour le clip
        for (let i = 1; i < pointsForClip.length - 1; i++) {
          const xc = (pointsForClip[i].x + pointsForClip[i + 1].x) / 2;
          const yc = (pointsForClip[i].y + pointsForClip[i + 1].y) / 2;
          ctx.quadraticCurveTo(pointsForClip[i].x, pointsForClip[i].y, xc, yc);
        }
        const lastPoint = pointsForClip[pointsForClip.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
      } else {
        for (let i = 1; i < pointsForClip.length; i++) {
          ctx.lineTo(pointsForClip[i].x, pointsForClip[i].y);
        }
      }
      
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(sourceCanvas, 0, 0);
      ctx.restore();

      // Recadrer automatiquement aux dimensions de la pièce détourée
      const base64 = cropToBoundingBox(resultCanvas);
      setProcessedImage(base64);
      toast.success(language === "fr" ? "Détourage terminé et recadré !" : "Cutout complete and cropped!");
    } catch (error) {
      console.error("Erreur de détourage manuel:", error);
      toast.error(language === "fr" ? "Erreur lors du détourage" : "Cutout error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Détourage automatique avec IA
  const handleAutoDetourage = async () => {
    if (!selectedPhoto?.src) {
      toast.error(language === "fr" ? "Aucune photo sélectionnée" : "No photo selected");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Convertir l'image source en Blob via le canvas pour éviter
      // l'erreur "The string did not match the expected pattern" de fetch()
      // lorsque la source est un blob: révoqué ou une chaîne non-URL.
      let imageBlob: Blob;
      if (originalImageRef.current) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = originalImageRef.current.naturalWidth;
        tempCanvas.height = originalImageRef.current.naturalHeight;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx!.drawImage(originalImageRef.current, 0, 0);
        imageBlob = await new Promise<Blob>((resolve, reject) => {
          tempCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          }, "image/png");
        });
      } else {
        const response = await fetch(selectedPhoto.src);
        imageBlob = await response.blob();
      }

      const result = await removeBackground(imageBlob, {
        // Charger les modèles ONNX et WASM depuis le CDN officiel
        // pour éviter de les bundler dans le build (~25 MB économisés)
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        progress: (key, current, total) => {
          const percentage = Math.round((current / total) * 100);
          setProgress(percentage);
        },
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        // Recadrer automatiquement aux dimensions de la pièce détourée
        const img = new Image();
        img.onload = () => {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(img, 0, 0);
            const croppedBase64 = cropToBoundingBox(tempCanvas);
            setProcessedImage(croppedBase64);
          } else {
            setProcessedImage(base64);
          }
          toast.success(language === "fr" ? "Détourage terminé et recadré !" : "Cutout complete and cropped!");
        };
        img.src = base64;
      };
      reader.readAsDataURL(result);
    } catch (error) {
      console.error("Erreur de détourage:", error);
      toast.error(language === "fr" ? "Erreur lors du détourage" : "Cutout error");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Baguette magique - Sélection par couleur
  const handleMagicWandClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (manualMode !== "magicwand" || !canvasRef.current || !originalImageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    // Obtenir les données de l'image
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Couleur du pixel cliqué
    const startIdx = (y * canvas.width + x) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    
    // Créer un masque de sélection
    const selectionMask = new Uint8Array(canvas.width * canvas.height);
    const tolerance = magicWandTolerance;
    
    // Fonction pour vérifier si une couleur est similaire
    const colorMatch = (idx: number) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      return Math.abs(r - targetR) <= tolerance &&
             Math.abs(g - targetG) <= tolerance &&
             Math.abs(b - targetB) <= tolerance;
    };
    
    if (magicWandContiguous) {
      // Sélection contiguë (flood fill)
      const stack: [number, number][] = [[x, y]];
      const visited = new Set<string>();
      
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const key = `${cx},${cy}`;
        
        if (visited.has(key)) continue;
        if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height) continue;
        
        const idx = (cy * canvas.width + cx) * 4;
        if (!colorMatch(idx)) continue;
        
        visited.add(key);
        selectionMask[cy * canvas.width + cx] = 255;
        
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    } else {
      // Sélection globale (toutes les couleurs similaires)
      for (let i = 0; i < canvas.width * canvas.height; i++) {
        if (colorMatch(i * 4)) {
          selectionMask[i] = 255;
        }
      }
    }
    
    // Convertir le masque en points de contour (simplifié)
    const contourPoints: Point[] = [];
    const step = 5; // Simplification
    
    for (let py = 0; py < canvas.height; py += step) {
      for (let px = 0; px < canvas.width; px += step) {
        const idx = py * canvas.width + px;
        if (selectionMask[idx] === 255) {
          // Vérifier si c'est un bord
          const isEdge = 
            px === 0 || px >= canvas.width - step ||
            py === 0 || py >= canvas.height - step ||
            selectionMask[(py - step) * canvas.width + px] === 0 ||
            selectionMask[(py + step) * canvas.width + px] === 0 ||
            selectionMask[py * canvas.width + (px - step)] === 0 ||
            selectionMask[py * canvas.width + (px + step)] === 0;
          
          if (isEdge) {
            contourPoints.push({ x: px, y: py });
          }
        }
      }
    }
    
    // Dessiner l'indicateur visuel de la sélection sur le canvas de lasso
    const lassoCanvas = lassoCanvasRef.current;
    if (lassoCanvas) {
      const lassoCtx = lassoCanvas.getContext("2d");
      if (lassoCtx) {
        // Effacer le canvas de lasso
        lassoCtx.clearRect(0, 0, lassoCanvas.width, lassoCanvas.height);
        
        // Dessiner la zone sélectionnée en surbrillance
        const highlightData = lassoCtx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < selectionMask.length; i++) {
          if (selectionMask[i] === 255) {
            const idx = i * 4;
            highlightData.data[idx] = 255;     // Rouge
            highlightData.data[idx + 1] = 165; // Orange
            highlightData.data[idx + 2] = 0;   // 
            highlightData.data[idx + 3] = 100; // Semi-transparent
          }
        }
        lassoCtx.putImageData(highlightData, 0, 0);
      }
    }
    
    // Trier les points pour former un contour cohérent
    if (contourPoints.length > 2) {
      const sortedPoints: Point[] = [contourPoints[0]];
      const remaining = contourPoints.slice(1);
      
      while (remaining.length > 0) {
        const lastPoint = sortedPoints[sortedPoints.length - 1];
        let nearestIdx = 0;
        let nearestDist = Infinity;
        
        for (let i = 0; i < remaining.length; i++) {
          const dist = Math.hypot(remaining[i].x - lastPoint.x, remaining[i].y - lastPoint.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }
        
        sortedPoints.push(remaining[nearestIdx]);
        remaining.splice(nearestIdx, 1);
      }
      
      setLassoPoints(sortedPoints);
      setIsPolygonClosed(true);
      
      // Compter le nombre de pixels sélectionnés
      const selectedPixels = selectionMask.filter(v => v === 255).length;
      const percentage = ((selectedPixels / selectionMask.length) * 100).toFixed(1);
      
      toast.success(language === "fr" 
        ? `Zone sélectionnée : ${percentage}% de l'image (${sortedPoints.length} points)` 
        : `Selected area: ${percentage}% of image (${sortedPoints.length} points)`);
    } else {
      toast.info(language === "fr" 
        ? "Aucune zone sélectionnée. Essayez d'augmenter la tolérance." 
        : "No area selected. Try increasing tolerance.");
    }
  };

  // Fonction pour redimensionner l'image détourée
  const getScaledImage = (imageBase64: string, scale: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const newWidth = Math.round(img.width * scale / 100);
        const newHeight = Math.round(img.height * scale / 100);
        
        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(imageBase64);
        }
      };
      img.src = imageBase64;
    });
  };
  
  // Mettre à jour les dimensions quand l'image détourée change
  useEffect(() => {
    if (processedImage) {
      const img = new Image();
      img.onload = () => {
        setResultDimensions({ width: img.width, height: img.height });
        setResultScale(100); // Réinitialiser l'échelle
      };
      img.src = processedImage;
    } else {
      setResultDimensions(null);
    }
  }, [processedImage]);
  
  // Ajouter à la bibliothèque
  const handleAddToBibliotheque = async () => {
    if (!processedImage) return;
    
    // Appliquer le redimensionnement si nécessaire
    const finalImage = resultScale !== 100 
      ? await getScaledImage(processedImage, resultScale)
      : processedImage;

    const item: BibliothequeItem = {
      id: `detourage_${Date.now()}`,
      type: "detourage",
      name: language === "fr" ? `Détourage ${new Date().toLocaleDateString()}` : `Cutout ${new Date().toLocaleDateString()}`,
      thumbnail: finalImage,
      fullImage: finalImage,
      createdAt: Date.now(),
      sourcePhotoId: selectedPhoto?.id?.toString(),
    };

    onAddToBibliotheque(item);
    toast.success(language === "fr" ? "Ajouté à la bibliothèque !" : "Added to library!");
    setProcessedImage(null);
  };

  // Réinitialiser
  const handleReset = () => {
    setProcessedImage(null);
    setLassoPoints([]);
    setLassoHistory([]);
    setSelectedPointIndex(null);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsPolygonClosed(false);
  };

  // Curseur
  const getCursor = () => {
    if (lassoTool === "pan") return "grab";
    if (lassoTool === "edit") return "pointer";
    if (lassoTool === "insert") return "cell";
    if (lassoTool === "eraser") return "none"; // On affiche un cercle personnalisé
    if (manualMode === "magicwand") return "crosshair";
    if (manualMode === "polygon" || manualMode === "bezier") return "crosshair";
    return "crosshair";
  };

  // Vérifier si on peut détourer
  const canDetour = () => {
    if (manualMode === "magicwand" || manualMode === "polygon" || manualMode === "bezier") {
      return lassoPoints.length >= 3 && isPolygonClosed;
    }
    return lassoPoints.length >= 5;
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Barre d'outils */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {/* Mode Auto/Manuel */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={mode === "auto" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("auto")}
            className="gap-2"
          >
            <Wand2 className="w-4 h-4" />
            {language === "fr" ? "Automatique (IA)" : "Automatic (AI)"}
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("manual")}
            className="gap-2"
          >
            <Scissors className="w-4 h-4" />
            {language === "fr" ? "Manuel" : "Manual"}
          </Button>
          <Button
            variant={mode === "face" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setMode("face");
              // Charger les modèles si nécessaire
              loadModels();
            }}
            className="gap-2"
          >
            <ScanFace className="w-4 h-4" />
            {language === "fr" ? "Visage" : "Face"}
          </Button>
        </div>

        {/* Outils manuels */}
        {mode === "manual" && imageLoaded && (
          <>
            {/* Choix Lasso / Polygone / Bézier */}
            <div className="flex gap-1 bg-green-50 p-1 rounded-lg">
              <Button
                variant={manualMode === "lasso" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleManualModeChange("lasso")}
                title={language === "fr" ? "Lasso (tracé continu)" : "Lasso (continuous)"}
                className={`gap-1 ${manualMode === "lasso" ? "bg-green-500 hover:bg-green-600" : ""}`}
              >
                <PenTool className="w-4 h-4" />
                <span className="text-xs">{language === "fr" ? "Lasso" : "Lasso"}</span>
              </Button>
              <Button
                variant={manualMode === "polygon" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleManualModeChange("polygon")}
                title={language === "fr" ? "Point par point" : "Point by point"}
                className={`gap-1 ${manualMode === "polygon" ? "bg-green-500 hover:bg-green-600" : ""}`}
              >
                <Hexagon className="w-4 h-4" />
                <span className="text-xs">{language === "fr" ? "Pt par Pt" : "Pt by Pt"}</span>
              </Button>
              <Button
                variant={manualMode === "bezier" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleManualModeChange("bezier")}
                title={language === "fr" ? "Bézier (courbes lisses)" : "Bezier (smooth curves)"}
                className={`gap-1 ${manualMode === "bezier" ? "bg-green-500 hover:bg-green-600" : ""}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 20 Q 12 4 22 20" />
                  <circle cx="2" cy="20" r="2" fill="currentColor" />
                  <circle cx="22" cy="20" r="2" fill="currentColor" />
                  <circle cx="12" cy="4" r="2" />
                </svg>
                <span className="text-xs">{language === "fr" ? "Bézier" : "Bezier"}</span>
              </Button>
              <Button
                variant={manualMode === "magicwand" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleManualModeChange("magicwand")}
                title={language === "fr" ? "Baguette magique (sélection par couleur)" : "Magic wand (color selection)"}
                className={`gap-1 ${manualMode === "magicwand" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
              >
                <Wand2 className="w-4 h-4" />
                <span className="text-xs">{language === "fr" ? "Baguette" : "Wand"}</span>
              </Button>
            </div>

            {/* Outils de sélection */}
            <div className="flex gap-1 bg-purple-50 p-1 rounded-lg">
              <Button
                variant={lassoTool === "draw" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLassoTool("draw")}
                title={language === "fr" ? "Dessiner" : "Draw"}
                className="px-2"
              >
                {manualMode === "lasso" ? <PenTool className="w-4 h-4" /> : <Hexagon className="w-4 h-4" />}
              </Button>
              <Button
                variant={lassoTool === "edit" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLassoTool("edit")}
                title={language === "fr" ? "Éditer les points" : "Edit points"}
                className="px-2"
              >
                <MousePointer className="w-4 h-4" />
              </Button>
              <Button
                variant={lassoTool === "pan" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLassoTool("pan")}
                title={language === "fr" ? "Déplacer" : "Pan"}
                className="px-2"
              >
                <Move className="w-4 h-4" />
              </Button>
              <Button
                variant={lassoTool === "insert" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLassoTool("insert")}
                title={language === "fr" ? "Insérer un point" : "Insert point"}
                className="px-2"
                disabled={lassoPoints.length < 2}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant={lassoTool === "eraser" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLassoTool("eraser")}
                title={language === "fr" ? "Gomme" : "Eraser"}
                className={`px-2 ${lassoTool === "eraser" ? "bg-red-500 hover:bg-red-600" : ""}`}
                disabled={lassoPoints.length < 1}
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Taille de la gomme */}
            {lassoTool === "eraser" && (
              <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-lg">
                <span className="text-xs text-red-700">
                  {language === "fr" ? "Taille:" : "Size:"}
                </span>
                <Slider
                  value={[eraserSize]}
                  min={5}
                  max={50}
                  step={5}
                  onValueChange={([value]) => setEraserSize(value)}
                  className="w-20"
                />
                <span className="text-xs text-red-600 w-6">{eraserSize}px</span>
              </div>
            )}

            {/* Contrôles de zoom */}
            <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
              <Button variant="ghost" size="sm" onClick={handleZoomOut} className="px-2">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium text-blue-700 min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} className="px-2">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetZoom} className="px-2 text-xs">
                1:1
              </Button>
            </div>

            {/* Épaisseur du trait */}
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-lg">
              <span className="text-xs text-purple-700">
                {language === "fr" ? "Trait:" : "Line:"}
              </span>
              <Slider
                value={[brushSize]}
                min={1}
                max={5}
                step={1}
                onValueChange={([value]) => setBrushSize(value)}
                className="w-16"
              />
              <span className="text-xs text-purple-600 w-4">{brushSize}</span>
            </div>

            {/* Lissage (mode lasso uniquement) */}
            {manualMode === "lasso" && (
              <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-lg">
                <Button
                  variant={smoothingEnabled ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSmoothingEnabled(!smoothingEnabled)}
                  title={language === "fr" ? "Lissage automatique" : "Auto smoothing"}
                  className={`px-2 text-xs ${smoothingEnabled ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                >
                  {language === "fr" ? "Lissage" : "Smooth"}
                </Button>
                {smoothingEnabled && (
                  <Slider
                    value={[smoothingStrength * 100]}
                    min={10}
                    max={100}
                    step={10}
                    onValueChange={([value]) => setSmoothingStrength(value / 100)}
                    className="w-16"
                  />
                )}
              </div>
            )}

            {/* Options baguette magique */}
            {manualMode === "magicwand" && (
              <div className="flex items-center gap-3 bg-amber-50 px-3 py-1 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-700">
                    {language === "fr" ? "Tolérance" : "Tolerance"}
                  </span>
                  <Slider
                    value={[magicWandTolerance]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={([value]) => setMagicWandTolerance(value)}
                    className="w-20"
                  />
                  <span className="text-xs text-amber-600 w-6">{magicWandTolerance}</span>
                </div>
                <Button
                  variant={magicWandContiguous ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMagicWandContiguous(!magicWandContiguous)}
                  title={language === "fr" ? "Sélection contiguë uniquement" : "Contiguous selection only"}
                  className={`px-2 text-xs ${magicWandContiguous ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                >
                  {language === "fr" ? "Contigu" : "Contiguous"}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Options de détection de visage */}
        {mode === "face" && imageLoaded && (
          <>
            {/* Forme du masque */}
            <div className="flex gap-1 bg-pink-50 p-1 rounded-lg">
              <Button
                variant={faceShape === "oval" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFaceShape("oval")}
                className={faceShape === "oval" ? "bg-pink-500 hover:bg-pink-600" : ""}
              >
                {language === "fr" ? "Ovale" : "Oval"}
              </Button>
              <Button
                variant={faceShape === "circle" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFaceShape("circle")}
                className={faceShape === "circle" ? "bg-pink-500 hover:bg-pink-600" : ""}
              >
                {language === "fr" ? "Cercle" : "Circle"}
              </Button>
              <Button
                variant={faceShape === "rectangle" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFaceShape("rectangle")}
                className={faceShape === "rectangle" ? "bg-pink-500 hover:bg-pink-600" : ""}
              >
                {language === "fr" ? "Rectangle" : "Rectangle"}
              </Button>
            </div>

            {/* Marge autour du visage */}
            <div className="flex items-center gap-2 bg-pink-50 px-3 py-1 rounded-lg">
              <span className="text-xs text-pink-700">
                {language === "fr" ? "Marge:" : "Padding:"}
              </span>
              <Slider
                value={[facePadding]}
                min={0}
                max={100}
                step={5}
                onValueChange={([value]) => setFacePadding(value)}
                className="w-20"
              />
              <span className="text-xs text-pink-600 w-6">{facePadding}px</span>
            </div>

            {/* Bouton Détecter */}
            <Button
              onClick={async () => {
                if (originalImageRef.current) {
                  setIsProcessing(true);
                  try {
                    const detectedFaces = await detectFaces(originalImageRef.current);
                    if (detectedFaces.length === 0) {
                      toast.info(language === "fr" ? "Aucun visage détecté" : "No face detected");
                    } else {
                      toast.success(language === "fr" ? `${detectedFaces.length} visage(s) détecté(s)` : `${detectedFaces.length} face(s) detected`);
                      setSelectedFaceIndex(0);
                    }
                  } catch (err) {
                    toast.error(language === "fr" ? "Erreur lors de la détection" : "Detection error");
                  } finally {
                    setIsProcessing(false);
                  }
                }
              }}
              disabled={isProcessing || isFaceLoading || !selectedPhoto}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              {isProcessing || isFaceLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ScanFace className="w-4 h-4 mr-2" />
              )}
              {language === "fr" ? "Détecter" : "Detect"}
            </Button>

            {/* Sélecteur de visage si plusieurs détectés */}
            {faces.length > 1 && (
              <div className="flex items-center gap-2 bg-pink-50 px-3 py-1 rounded-lg">
                <span className="text-xs text-pink-700">
                  {language === "fr" ? "Visage:" : "Face:"}
                </span>
                {faces.map((_, index) => (
                  <Button
                    key={index}
                    variant={selectedFaceIndex === index ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedFaceIndex(index)}
                    className={`px-2 ${selectedFaceIndex === index ? "bg-pink-500 hover:bg-pink-600" : ""}`}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}

        {mode === "manual" && imageLoaded && (
          <>
            {/* Actions Undo/Redo */}
            <div className="flex gap-1 bg-orange-50 p-1 rounded-lg">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleUndo} 
                disabled={lassoPoints.length === 0 && undoStack.length === 0}
                title={language === "fr" ? "Annuler (Ctrl+Z)" : "Undo (Ctrl+Z)"}
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRedo} 
                disabled={redoStack.length === 0}
                title={language === "fr" ? "Rétablir (Ctrl+Y)" : "Redo (Ctrl+Y)"}
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearLasso} 
                disabled={lassoPoints.length === 0}
                title={language === "fr" ? "Effacer" : "Clear"}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Compteur de points (mode polygone) */}
            {manualMode === "polygon" && lassoPoints.length > 0 && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {lassoPoints.length} {language === "fr" ? "point(s)" : "point(s)"}
                {isPolygonClosed && <span className="text-green-600 ml-1">✓</span>}
              </div>
            )}
          </>
        )}

        {processedImage && (
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {language === "fr" ? "Recommencer" : "Reset"}
            </Button>
            <Button size="sm" onClick={handleAddToBibliotheque} className="bg-green-500 hover:bg-green-600">
              <Check className="w-4 h-4 mr-2" />
              {language === "fr" ? "Ajouter à la bibliothèque" : "Add to library"}
            </Button>
          </div>
        )}
      </div>

      {/* Zone de travail */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Colonne latérale gauche - Photos sélectionnées */}
        {photosWithContent.length > 0 && (
          <div className="w-28 flex flex-col bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden">
            <div className="p-2 bg-gray-100 border-b text-center">
              <p className="text-xs font-medium text-gray-600">
                {language === "fr" ? "Photos" : "Photos"}
              </p>
              <p className="text-[10px] text-gray-400">
                {photosWithContent.length} {language === "fr" ? "sélectionnée(s)" : "selected"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {photosWithContent.map((photo, index) => {
                const photoSrc = photo.src || photo.photoUrl;
                const isActive = selectedPhoto?.id === photo.id;
                return (
                  <div
                    key={photo.id || index}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/json", JSON.stringify(photo));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => onSelectPhoto?.(photo)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      isActive 
                        ? "border-purple-500 ring-2 ring-purple-300" 
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    <img
                      src={photoSrc}
                      alt={photo.title || `Photo ${index + 1}`}
                      className="w-full h-16 object-cover"
                      draggable={false}
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-purple-500/10 border-2 border-purple-500" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] px-1 truncate">
                      {photo.title || `#${index + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-1 bg-gray-100 border-t">
              <p className="text-[8px] text-gray-400 text-center">
                {language === "fr" ? "Glissez vers Image source" : "Drag to Source image"}
              </p>
            </div>
          </div>
        )}

        {/* Image source */}
        <div 
          ref={containerRef}
          className={`flex-1 flex flex-col items-center justify-center rounded-xl p-4 transition-all overflow-hidden ${
            isDragOver 
              ? "bg-purple-100 border-2 border-dashed border-purple-400" 
              : "bg-gray-100"
          }`}
          onDragOver={(e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragOver(false);
            try {
              const photoData = JSON.parse(e.dataTransfer.getData("application/json"));
              if (photoData && onSelectPhoto) {
                onSelectPhoto(photoData);
                toast.success(language === "fr" ? "Photo chargée" : "Photo loaded");
              }
            } catch (err) {
              console.error("Erreur de drop:", err);
            }
          }}
          onWheel={handleWheel}
        >
          <p className="text-sm text-gray-500 mb-2">
            {language === "fr" ? "Image source" : "Source image"}
            {mode === "manual" && zoom !== 1 && (
              <span className="ml-2 text-purple-600 text-xs">
                (Zoom: {Math.round(zoom * 100)}%)
              </span>
            )}
          </p>
          {selectedPhoto?.src ? (
            <div 
              className="relative overflow-hidden rounded-lg shadow-md"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.2s ease-out",
              }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[350px]"
                style={{ 
                  background: "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 20px 20px",
                  transform: `translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                }}
              />
              {mode === "manual" && (
                <>
                  <canvas
                    ref={lassoCanvasRef}
                    className="absolute top-0 left-0"
                    style={{ 
                      width: imageSize.width, 
                      height: imageSize.height,
                      cursor: getCursor(),
                      transform: `translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={(e) => {
                      handleMouseMove(e);
                      // Mettre à jour la position du curseur pour la gomme
                      if (lassoTool === "eraser") {
                        setCursorPosition(getCanvasCoords(e));
                      }
                    }}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                      handleMouseUp();
                      if (lassoTool === "eraser") setCursorPosition(null);
                    }}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    onClick={(e) => {
                      if (manualMode === "magicwand") {
                        handleMagicWandClick(e);
                      }
                    }}
                  />
                  {/* Cercle de prévisualisation de la gomme */}
                  {lassoTool === "eraser" && cursorPosition && (
                    <div
                      className="absolute pointer-events-none border-2 border-red-500 rounded-full bg-red-500/20"
                      style={{
                        width: eraserSize * zoom,
                        height: eraserSize * zoom,
                        left: cursorPosition.x * zoom + panOffset.x - (eraserSize * zoom) / 2,
                        top: cursorPosition.y * zoom + panOffset.y - (eraserSize * zoom) / 2,
                      }}
                    />
                  )}
                  {/* Poignées de contrôle Bézier (mode édition) */}
                  {manualMode === "bezier" && lassoTool === "edit" && lassoPoints.length >= 2 && (
                    <svg
                      className="absolute top-0 left-0 pointer-events-none"
                      style={{
                        width: imageSize.width,
                        height: imageSize.height,
                        transform: `translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                      }}
                    >
                      {lassoPoints.map((point, index) => {
                        // Calculer les poignées par défaut (tangentes)
                        const prevPoint = lassoPoints[index === 0 ? lassoPoints.length - 1 : index - 1];
                        const nextPoint = lassoPoints[(index + 1) % lassoPoints.length];
                        const handleLength = 30;
                        
                        // Direction de la tangente
                        const dx = nextPoint.x - prevPoint.x;
                        const dy = nextPoint.y - prevPoint.y;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;
                        
                        const inHandle = {
                          x: point.x - (dx / len) * handleLength,
                          y: point.y - (dy / len) * handleLength,
                        };
                        const outHandle = {
                          x: point.x + (dx / len) * handleLength,
                          y: point.y + (dy / len) * handleLength,
                        };
                        
                        return (
                          <g key={index}>
                            {/* Lignes vers les poignées */}
                            <line
                              x1={point.x}
                              y1={point.y}
                              x2={inHandle.x}
                              y2={inHandle.y}
                              stroke="#9333ea"
                              strokeWidth="1"
                              strokeDasharray="3,3"
                            />
                            <line
                              x1={point.x}
                              y1={point.y}
                              x2={outHandle.x}
                              y2={outHandle.y}
                              stroke="#9333ea"
                              strokeWidth="1"
                              strokeDasharray="3,3"
                            />
                            {/* Poignées */}
                            <circle
                              cx={inHandle.x}
                              cy={inHandle.y}
                              r="4"
                              fill="#9333ea"
                              stroke="white"
                              strokeWidth="1"
                              className="pointer-events-auto cursor-move"
                            />
                            <circle
                              cx={outHandle.x}
                              cy={outHandle.y}
                              r="4"
                              fill="#9333ea"
                              stroke="white"
                              strokeWidth="1"
                              className="pointer-events-auto cursor-move"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-16">
              <Scissors className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{language === "fr" ? "Sélectionnez une photo pour commencer" : "Select a photo to start"}</p>
            </div>
          )}
        </div>

        {/* Flèche / Actions */}
        <div className="flex flex-col items-center justify-center gap-3">
          {!processedImage && selectedPhoto && mode !== "face" && (
            <Button
              onClick={mode === "auto" ? handleAutoDetourage : handleManualDetourage}
              disabled={isProcessing || (mode === "manual" && !canDetour())}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress > 0 ? `${progress}%` : "..."}
                </>
              ) : (
                <>
                  {mode === "auto" ? <Wand2 className="w-4 h-4 mr-2" /> : <Scissors className="w-4 h-4 mr-2" />}
                  {language === "fr" ? "Détourer" : "Cutout"}
                </>
              )}
            </Button>
          )}
          
          {/* Bouton Extraire le visage */}
          {!processedImage && selectedPhoto && mode === "face" && faces.length > 0 && selectedFaceIndex !== null && (
            <Button
              onClick={() => {
                if (originalImageRef.current && selectedFaceIndex !== null && faces[selectedFaceIndex]) {
                  const faceMask = createFaceMask(
                    originalImageRef.current,
                    faces[selectedFaceIndex],
                    facePadding,
                    faceShape
                  );
                  if (faceMask) {
                    setProcessedImage(faceMask);
                    toast.success(language === "fr" ? "Visage extrait !" : "Face extracted!");
                  }
                }
              }}
              disabled={isProcessing}
              className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-5"
            >
              <User className="w-4 h-4 mr-2" />
              {language === "fr" ? "Extraire" : "Extract"}
            </Button>
          )}
          
          {mode === "manual" && !canDetour() && lassoPoints.length > 0 && (
            <p className="text-xs text-gray-400 text-center max-w-[100px]">
              {manualMode === "polygon" 
                ? (language === "fr" ? "Double-clic pour fermer" : "Double-click to close")
                : (language === "fr" ? "Continuez le tracé..." : "Continue drawing...")}
            </p>
          )}
        </div>

        {/* Résultat */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-2">
            {language === "fr" ? "Résultat" : "Result"}
          </p>
          {processedImage ? (
            <>
              <img
                src={processedImage}
                alt={language === "fr" ? "Détourage" : "Cutout"}
                className="max-w-full max-h-[280px] rounded-lg shadow-md"
                style={{ 
                  background: "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 20px 20px",
                  transform: `scale(${resultScale / 100})`
                }}
              />
              
              {/* Contrôles de redimensionnement */}
              <div className="mt-4 w-full max-w-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{language === "fr" ? "Taille" : "Size"}: {resultScale}%</span>
                  {resultDimensions && (
                    <span className="text-gray-400">
                      {Math.round(resultDimensions.width * resultScale / 100)} × {Math.round(resultDimensions.height * resultScale / 100)} px
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 w-7 p-0"
                    onClick={() => setResultScale(prev => Math.max(25, prev - 10))}
                    disabled={resultScale <= 25}
                  >
                    -
                  </Button>
                  <Slider
                    value={[resultScale]}
                    onValueChange={([val]) => setResultScale(val)}
                    min={25}
                    max={200}
                    step={5}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 w-7 p-0"
                    onClick={() => setResultScale(prev => Math.min(200, prev + 10))}
                    disabled={resultScale >= 200}
                  >
                    +
                  </Button>
                </div>
                <div className="flex justify-center gap-1">
                  {[50, 75, 100, 150, 200].map(preset => (
                    <Button
                      key={preset}
                      variant={resultScale === preset ? "default" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setResultScale(preset)}
                    >
                      {preset}%
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-16">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-dashed border-gray-300" />
              <p className="text-sm">{language === "fr" ? "Le résultat apparaîtra ici" : "Result will appear here"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          {mode === "auto" 
            ? (language === "fr" 
                ? "💡 Le détourage automatique utilise l'IA pour supprimer l'arrière-plan. Fonctionne mieux avec des sujets bien définis."
                : "💡 Automatic cutout uses AI to remove the background. Works best with well-defined subjects.")
            : mode === "face"
              ? (language === "fr"
                  ? "💡 Mode Visage : Cliquez sur 'Détecter' pour trouver les visages. Choisissez la forme et la marge, puis cliquez sur 'Extraire'."
                  : "💡 Face mode: Click 'Detect' to find faces. Choose shape and padding, then click 'Extract'.")
              : manualMode === "lasso"
                ? (language === "fr"
                    ? `💡 Mode Lasso : ${lassoTool === "draw" ? "Maintenez et glissez pour tracer un contour continu." : lassoTool === "edit" ? "Cliquez et glissez les points pour affiner." : "Maintenez et glissez pour déplacer l'image."} Molette = zoom.`
                    : `💡 Lasso mode: ${lassoTool === "draw" ? "Hold and drag to draw a continuous contour." : lassoTool === "edit" ? "Click and drag points to refine." : "Hold and drag to pan."} Scroll = zoom.`)
                : (language === "fr"
                    ? `💡 Mode Point par point : ${lassoTool === "draw" ? "Cliquez pour placer chaque point. Double-clic ou clic sur le 1er point pour fermer." : lassoTool === "edit" ? "Cliquez et glissez les points pour affiner." : "Maintenez et glissez pour déplacer."} Molette = zoom.`
                    : `💡 Point by point mode: ${lassoTool === "draw" ? "Click to place each point. Double-click or click first point to close." : lassoTool === "edit" ? "Click and drag points to refine." : "Hold and drag to pan."} Scroll = zoom.`)
          }
        </p>
      </div>
    </div>
  );
}
