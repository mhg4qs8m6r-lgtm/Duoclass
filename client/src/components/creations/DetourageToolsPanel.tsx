import { useState, useRef, useEffect, useCallback } from "react";
import { Hand, Hexagon, Sparkles, RotateCcw, Eraser, X, Circle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { removeBackground } from "@imgly/background-removal";

export type DetourageMode = "auto" | "manual" | "floodfill";
export type ManualTool = "lasso" | "polygon" | "bezier" | "wand" | "face";

interface DetourageToolsPanelProps {
  activePhoto: string | null;
  selectedElementId: string | null;
  onDetourageComplete: (result: string, name: string) => void;
  onApplyDetourageToElement?: (elementId: string, detourageResult: string) => void;
  onModeChange?: (mode: DetourageMode, tool: ManualTool | null) => void;
  /** Appelé quand l'état de la gomme change (active/inactive + taille) */
  onEraserChange?: (active: boolean, size: number) => void;
}

/**
 * Convertit n'importe quelle source d'image en Blob.
 */
function imageSourceToBlob(src: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (src.startsWith('data:')) {
      try {
        const commaIndex = src.indexOf(',');
        if (commaIndex === -1) throw new Error('Invalid data URL');
        const header = src.substring(0, commaIndex);
        const base64Data = src.substring(commaIndex + 1);
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        resolve(new Blob([bytes], { type: mimeType }));
        return;
      } catch (e: any) { /* fallback */ }
    }
    if (src.startsWith('blob:')) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', src, true);
      xhr.responseType = 'blob';
      xhr.onload = () => (xhr.status === 200 || xhr.status === 0) ? resolve(xhr.response) : fallback();
      xhr.onerror = fallback;
      xhr.send();
      return;
    }
    if (src.startsWith('http')) {
      fetch(src).then(r => r.blob()).then(resolve).catch(fallback);
      return;
    }
    fallback();

    function fallback() {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob null')), 'image/png');
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    }
  });
}

// ─── Flood fill sur ImageData ──────────────────────────────────────────────
function floodFill(imageData: ImageData, startX: number, startY: number, tolerance: number) {
  const { width, height, data } = imageData;
  const x = Math.round(startX);
  const y = Math.round(startY);
  if (x < 0 || x >= width || y < 0 || y >= height) return;

  const idx = (y * width + x) * 4;
  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];
  const targetA = data[idx + 3];

  if (targetA === 0) return;

  const visited = new Uint8Array(width * height);
  const stack: number[] = [x, y];

  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const pos = cy * width + cx;

    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    if (visited[pos]) continue;
    visited[pos] = 1;

    const i = pos * 4;
    const dr = Math.abs(data[i] - targetR);
    const dg = Math.abs(data[i + 1] - targetG);
    const db = Math.abs(data[i + 2] - targetB);
    const da = Math.abs(data[i + 3] - targetA);

    if (dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance) {
      data[i + 3] = 0;
      stack.push(cx - 1, cy);
      stack.push(cx + 1, cy);
      stack.push(cx, cy - 1);
      stack.push(cx, cy + 1);
    }
  }
}

// ─── Gomme : effacer un disque de pixels ───────────────────────────────────
export function eraseCircle(imageData: ImageData, cx: number, cy: number, radius: number) {
  const { width, height, data } = imageData;
  const r = Math.round(radius);
  const x0 = Math.max(0, Math.round(cx) - r);
  const y0 = Math.max(0, Math.round(cy) - r);
  const x1 = Math.min(width - 1, Math.round(cx) + r);
  const y1 = Math.min(height - 1, Math.round(cy) + r);
  const r2 = r * r;

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= r2) {
        data[(py * width + px) * 4 + 3] = 0;
      }
    }
  }
}

// ─── Motif damier (transparence) ───────────────────────────────────────────
function createCheckerPattern(): CanvasPattern | null {
  const size = 10;
  const c = document.createElement('canvas');
  c.width = size * 2;
  c.height = size * 2;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ccc';
  ctx.fillRect(0, 0, size * 2, size * 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillRect(size, size, size, size);
  return ctx.createPattern(c, 'repeat');
}

export default function DetourageToolsPanel({
  activePhoto,
  selectedElementId,
  onDetourageComplete,
  onApplyDetourageToElement,
  onModeChange,
  onEraserChange,
}: DetourageToolsPanelProps) {
  const { language } = useLanguage();

  const [mode, setMode] = useState<DetourageMode>("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetourageResult, setLastDetourageResult] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("");

  // ─── État flood fill ───────────────────────────────────────────────────────
  const [tolerance, setTolerance] = useState(32);
  const [floodFillActive, setFloodFillActive] = useState<'exterior' | 'interior' | null>(null);
  const [floodFillImageData, setFloodFillImageData] = useState<ImageData | null>(null);
  const [floodFillOriginal, setFloodFillOriginal] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Historique pour Annuler ────────────────────────────────────────────────
  const undoStackRef = useRef<ImageData[]>([]);
  const floodFillImageDataRef = useRef<ImageData | null>(null);
  floodFillImageDataRef.current = floodFillImageData;

  const pushUndo = useCallback(() => {
    if (!floodFillImageData) return;
    // Copier l'état actuel avant modification
    const copy = new ImageData(
      new Uint8ClampedArray(floodFillImageData.data),
      floodFillImageData.width,
      floodFillImageData.height
    );
    undoStackRef.current.push(copy);
    // Limiter la pile à 30 entrées pour la mémoire
    if (undoStackRef.current.length > 30) {
      undoStackRef.current.shift();
    }
  }, [floodFillImageData]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      toast.info(language === 'fr' ? 'Rien à annuler' : 'Nothing to undo');
      return;
    }
    const previous = stack.pop()!;
    setFloodFillImageData(previous);
  }, [language]);

  // ─── État gomme ────────────────────────────────────────────────────────────
  const [eraserActive, setEraserActive] = useState(false);
  const [eraserSize, setEraserSize] = useState(12);
  const isErasingRef = useRef(false);

  // Notifier le parent des changements de la gomme
  useEffect(() => {
    onEraserChange?.(eraserActive, eraserSize);
  }, [eraserActive, eraserSize, onEraserChange]);

  // ─── Charger l'image sélectionnée dans le flood fill ───────────────────────
  const loadImageForFloodFill = useCallback(() => {
    const src = activePhoto;
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Si des données existaient, sauvegarder dans l'historique avant remplacement
      // (permet d'annuler les coups de gomme sur le canvas principal)
      const prev = floodFillImageDataRef.current;
      if (prev) {
        const copy = new ImageData(
          new Uint8ClampedArray(prev.data),
          prev.width,
          prev.height
        );
        undoStackRef.current.push(copy);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
      } else {
        undoStackRef.current = [];
      }
      setFloodFillImageData(data);
      setFloodFillOriginal(src);
      setImgDimensions({ w: canvas.width, h: canvas.height });
    };
    img.src = src;
  }, [activePhoto]);

  // Recharger quand on entre en mode floodfill ou quand l'image change
  useEffect(() => {
    if (mode === 'floodfill' && activePhoto) {
      loadImageForFloodFill();
    }
  }, [mode, activePhoto, loadImageForFloodFill]);

  // ─── Dessiner l'aperçu avec damier ─────────────────────────────────────────
  const drawPreview = useCallback(() => {
    if (!previewCanvasRef.current || !floodFillImageData || !imgDimensions) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const maxW = 280;
    const scale = Math.min(maxW / imgDimensions.w, 1);
    const cw = Math.round(imgDimensions.w * scale);
    const ch = Math.round(imgDimensions.h * scale);

    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    // Fond damier
    const checker = createCheckerPattern();
    if (checker) {
      ctx.fillStyle = checker;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Image modifiée
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = floodFillImageData.width;
    tmpCanvas.height = floodFillImageData.height;
    tmpCanvas.getContext('2d')!.putImageData(floodFillImageData, 0, 0);
    ctx.drawImage(tmpCanvas, 0, 0, cw, ch);
  }, [floodFillImageData, imgDimensions]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // ─── Convertir coordonnées écran → image ───────────────────────────────────
  const screenToImageCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!previewCanvasRef.current || !floodFillImageData) return null;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const scaleX = floodFillImageData.width / previewCanvasRef.current.width;
    const scaleY = floodFillImageData.height / previewCanvasRef.current.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // ─── Clic sur le canvas → flood fill ou gomme ponctuelle ──────────────────
  const handlePreviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!floodFillImageData || !imgDimensions || !previewCanvasRef.current) return;

    // En mode gomme, un simple clic efface aussi
    if (eraserActive) return;

    // Flood fill uniquement si un mode est actif
    if (!floodFillActive) return;

    const coords = screenToImageCoords(e);
    if (!coords) return;

    pushUndo();

    const newData = new ImageData(
      new Uint8ClampedArray(floodFillImageData.data),
      floodFillImageData.width,
      floodFillImageData.height
    );

    floodFill(newData, coords.x, coords.y, tolerance);
    setFloodFillImageData(newData);

    toast.success(
      language === 'fr'
        ? `Zone supprimée (tolérance: ${tolerance})`
        : `Area removed (tolerance: ${tolerance})`
    );
  };

  // ─── Gomme : gestion du drag (mousedown/move/up) ──────────────────────────
  const handleEraserMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eraserActive || !floodFillImageData) return;
    e.preventDefault();
    isErasingRef.current = true;
    applyEraser(e);
  };

  const handleEraserMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isErasingRef.current || !eraserActive || !floodFillImageData) return;
    applyEraser(e);
  };

  const handleEraserMouseUp = () => {
    isErasingRef.current = false;
  };

  // Relâcher si la souris sort du canvas
  useEffect(() => {
    const handleGlobalUp = () => { isErasingRef.current = false; };
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, []);

  const applyEraser = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = screenToImageCoords(e);
    if (!coords || !floodFillImageData) return;

    // Calculer le rayon en pixels image
    const canvasScale = previewCanvasRef.current
      ? floodFillImageData.width / previewCanvasRef.current.width
      : 1;
    const radiusInImage = eraserSize * canvasScale;

    const newData = new ImageData(
      new Uint8ClampedArray(floodFillImageData.data),
      floodFillImageData.width,
      floodFillImageData.height
    );
    eraseCircle(newData, coords.x, coords.y, radiusInImage);
    setFloodFillImageData(newData);
  };

  // ─── Appliquer le résultat flood fill à l'élément ─────────────────────────
  const handleApplyFloodFill = () => {
    if (!floodFillImageData || !selectedElementId || !onApplyDetourageToElement) return;

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = floodFillImageData.width;
    tmpCanvas.height = floodFillImageData.height;
    tmpCanvas.getContext('2d')!.putImageData(floodFillImageData, 0, 0);

    tmpCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      onApplyDetourageToElement(selectedElementId, url);
      setLastDetourageResult(url);
      toast.success(language === 'fr' ? 'Résultat appliqué !' : 'Result applied!');
    }, 'image/png');
  };

  // ─── Réinitialiser le flood fill ───────────────────────────────────────────
  const handleResetFloodFill = () => {
    if (floodFillOriginal) {
      loadImageForFloodFill();
      toast.info(language === 'fr' ? 'Image originale restaurée' : 'Original image restored');
    }
  };

  // ─── Détourage automatique IA ─────────────────────────────────────────────
  const handleAutoDetourage = async () => {
    if (!activePhoto) {
      toast.error(language === "fr" ? "Sélectionnez d'abord une image sur le canvas" : "First select an image on the canvas");
      return;
    }
    if (!selectedElementId) {
      toast.error(language === "fr" ? "Cliquez sur une image dans la zone de travail" : "Click on an image in the work area");
      return;
    }

    setIsProcessing(true);
    setProgressMessage(language === "fr" ? "Préparation de l'image..." : "Preparing image...");
    setOriginalImage(activePhoto);

    try {
      toast.info(language === "fr" ? "Détourage en cours... Cela peut prendre 30-60 secondes." : "Processing... This may take 30-60 seconds.");

      const imageBlob = await imageSourceToBlob(activePhoto);
      if (!imageBlob || imageBlob.size === 0) {
        throw new Error(language === 'fr' ? "Impossible de récupérer les données de l'image" : 'Unable to retrieve image data');
      }

      setProgressMessage(language === "fr" ? "Traitement IA en cours..." : "AI processing...");

      const resultBlob = await removeBackground(imageBlob, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        progress: (_key, current, total) => {
          const percent = Math.round((current / total) * 100);
          setProgressMessage(language === "fr" ? `Traitement IA... ${percent}%` : `AI processing... ${percent}%`);
        },
      });

      const resultUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(resultBlob);
      });

      if (onApplyDetourageToElement && selectedElementId) {
        onApplyDetourageToElement(selectedElementId, resultUrl);
        setLastDetourageResult(resultUrl);
        toast.success(language === "fr" ? "Détourage appliqué avec succès !" : "Cutout applied successfully!");
      }
    } catch (error: any) {
      console.error('[Detourage] Error:', error);
      toast.error(language === "fr"
        ? `Erreur lors du détourage: ${error.message || 'Erreur inconnue'}`
        : `Cutout error: ${error.message || 'Unknown error'}`);
      setOriginalImage(null);
    } finally {
      setIsProcessing(false);
      setProgressMessage("");
    }
  };

  // ─── Recommencer ──────────────────────────────────────────────────────────
  const handleRecommencer = () => {
    if (originalImage && selectedElementId && onApplyDetourageToElement) {
      onApplyDetourageToElement(selectedElementId, originalImage);
      setLastDetourageResult(null);
      setOriginalImage(null);
      toast.info(language === "fr" ? "Image originale restaurée" : "Original image restored");
    }
  };

  // ─── Changement de mode ───────────────────────────────────────────────────
  const handleModeChange = (newMode: DetourageMode) => {
    setMode(newMode);
    setLastDetourageResult(null);
    setOriginalImage(null);
    setFloodFillActive(null);
    setFloodFillImageData(null);
    setFloodFillOriginal(null);
    setEraserActive(false);
    undoStackRef.current = [];
    if (newMode !== 'floodfill') {
      onModeChange?.(newMode as any, null);
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Message si pas de photo sélectionnée */}
      {!selectedElementId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {language === "fr"
            ? "Cliquez sur une image dans la zone de travail pour la détourer."
            : "Click on an image in the work area to cut it out."}
        </div>
      )}

      {/* 3 boutons : Automatique, Manuel, Point par point */}
      <div>
        <Label className="text-xs font-medium text-gray-600 mb-2 block">
          {language === "fr" ? "Mode de détourage" : "Cutout mode"}
        </Label>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant={mode === "auto" ? "default" : "outline"}
            size="sm"
            className={`justify-start gap-2 text-xs ${mode === "auto" ? "bg-purple-500 hover:bg-purple-600" : ""}`}
            onClick={() => handleModeChange("auto")}
          >
            <Sparkles className="w-4 h-4" />
            {language === "fr" ? "Automatique (IA)" : "Automatic (AI)"}
          </Button>

          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            className={`justify-start gap-2 text-xs ${mode === "manual" ? "bg-green-500 hover:bg-green-600" : ""}`}
            onClick={() => handleModeChange("manual")}
          >
            <Hand className="w-4 h-4" />
            {language === "fr" ? "Manuel" : "Manual"}
          </Button>

          {mode === "manual" && (
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 text-xs bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              onClick={() => onModeChange?.("manual", "polygon")}
            >
              <Hexagon className="w-4 h-4" />
              {language === "fr" ? "Point par point" : "Point by point"}
            </Button>
          )}
        </div>
      </div>

      {/* Actions détourage auto/manuel */}
      <div className="space-y-2 pt-2 border-t">
        {mode === "auto" && (
          <>
            <Button
              className="w-full gap-2 bg-purple-500 hover:bg-purple-600"
              onClick={handleAutoDetourage}
              disabled={!selectedElementId || isProcessing}
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing
                ? (progressMessage || (language === "fr" ? "Détourage en cours..." : "Processing..."))
                : (language === "fr" ? "Détourer automatiquement" : "Auto cutout")}
            </Button>

            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            )}

            {lastDetourageResult && originalImage && (
              <Button
                variant="outline"
                className="w-full gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={handleRecommencer}
              >
                <RotateCcw className="w-4 h-4" />
                {language === "fr" ? "Recommencer (annuler le détourage)" : "Redo (cancel cutout)"}
              </Button>
            )}

            {selectedElementId && !isProcessing && !lastDetourageResult && (
              <p className="text-xs text-gray-500 text-center">
                {language === "fr"
                  ? "Le détourage sera appliqué directement sur l'image sélectionnée"
                  : "Cutout will be applied directly to the selected image"}
              </p>
            )}
          </>
        )}

        {mode === "manual" && (
          <div className="text-xs text-green-700 bg-green-50 rounded p-2 border border-green-200">
            {language === "fr"
              ? "Cliquez « Point par point » pour ouvrir l'outil de détourage précis dans un nouvel onglet."
              : "Click \"Point by point\" to open the precise cutout tool in a new tab."}
          </div>
        )}
      </div>

      {/* ─── Section Suppression d'arrière-plan (flood fill + gomme) ─────── */}
      <div className="pt-3 border-t">
        <Label className="text-xs font-medium text-gray-600 mb-2 block">
          {language === "fr" ? "Suppression d'arrière-plan" : "Background removal"}
        </Label>

        <div className="grid grid-cols-1 gap-2">
          {/* Supprimer fond extérieur */}
          <Button
            variant={mode === "floodfill" && floodFillActive === "exterior" && !eraserActive ? "default" : "outline"}
            size="sm"
            className={`justify-start gap-2 text-xs ${
              mode === "floodfill" && floodFillActive === "exterior" && !eraserActive
                ? "bg-rose-500 hover:bg-rose-600"
                : ""
            }`}
            disabled={!selectedElementId}
            onClick={() => {
              if (mode !== "floodfill") handleModeChange("floodfill");
              setFloodFillActive("exterior");
              setEraserActive(false);
            }}
          >
            <Eraser className="w-4 h-4" />
            {language === "fr" ? "Supprimer fond extérieur" : "Remove outer background"}
          </Button>

          {/* Supprimer intérieur */}
          <Button
            variant={mode === "floodfill" && floodFillActive === "interior" && !eraserActive ? "default" : "outline"}
            size="sm"
            className={`justify-start gap-2 text-xs ${
              mode === "floodfill" && floodFillActive === "interior" && !eraserActive
                ? "bg-rose-500 hover:bg-rose-600"
                : ""
            }`}
            disabled={!selectedElementId}
            onClick={() => {
              if (mode !== "floodfill") handleModeChange("floodfill");
              setFloodFillActive("interior");
              setEraserActive(false);
            }}
          >
            <Eraser className="w-4 h-4" />
            {language === "fr" ? "Supprimer intérieur" : "Remove inner area"}
          </Button>

          {/* Gomme manuelle */}
          <Button
            variant={mode === "floodfill" && eraserActive ? "default" : "outline"}
            size="sm"
            className={`justify-start gap-2 text-xs ${
              mode === "floodfill" && eraserActive
                ? "bg-amber-500 hover:bg-amber-600"
                : ""
            }`}
            disabled={!selectedElementId}
            onClick={() => {
              if (mode !== "floodfill") handleModeChange("floodfill");
              setEraserActive(true);
              setFloodFillActive(null);
            }}
          >
            <Circle className="w-4 h-4" />
            {language === "fr" ? "Gomme manuelle" : "Manual eraser"}
          </Button>
        </div>

        {/* Contrôles flood fill + gomme */}
        {mode === "floodfill" && (
          <div className="mt-3 space-y-3">
            {/* Slider tolérance (flood fill) */}
            {!eraserActive && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs text-gray-600">
                    {language === "fr" ? "Tolérance" : "Tolerance"}
                  </Label>
                  <span className="text-xs font-mono text-gray-500">{tolerance}</span>
                </div>
                <Slider
                  min={0}
                  max={255}
                  step={1}
                  value={[tolerance]}
                  onValueChange={(val) => setTolerance(val[0])}
                  className="w-full"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {language === "fr"
                    ? "Bas = précis, Haut = large zone"
                    : "Low = precise, High = wider area"}
                </p>
              </div>
            )}

            {/* Slider taille gomme */}
            {eraserActive && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs text-gray-600">
                    {language === "fr" ? "Taille gomme" : "Eraser size"}
                  </Label>
                  <span className="text-xs font-mono text-gray-500">{eraserSize}px</span>
                </div>
                <Slider
                  min={2}
                  max={50}
                  step={1}
                  value={[eraserSize]}
                  onValueChange={(val) => setEraserSize(val[0])}
                  className="w-full"
                />
              </div>
            )}

            {/* Indication du mode actif */}
            {(floodFillActive || eraserActive) && (
              <div className={`text-xs rounded p-2 border ${
                eraserActive
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}>
                {eraserActive
                  ? (language === 'fr'
                    ? "Cliquez et glissez sur l'image dans la zone de travail pour gommer les pixels résiduels."
                    : "Click and drag on the image in the work area to erase residual pixels.")
                  : floodFillActive === 'exterior'
                  ? (language === 'fr'
                    ? "Cliquez sur le fond extérieur de l'image ci-dessous pour le supprimer."
                    : "Click on the outer background in the preview below to remove it.")
                  : (language === 'fr'
                    ? "Cliquez sur la zone intérieure de l'image ci-dessous pour la supprimer."
                    : "Click on the inner area in the preview below to remove it.")}
              </div>
            )}

            {/* Aperçu avec damier */}
            {floodFillImageData && (
              <div className="space-y-2">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100"
                  style={{ minHeight: '120px' }}
                >
                  <canvas
                    ref={previewCanvasRef}
                    onClick={!eraserActive ? handlePreviewClick : undefined}
                    className={`max-w-full ${eraserActive ? 'cursor-default' : floodFillActive ? 'cursor-crosshair' : 'cursor-default'}`}
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                    onClick={handleUndo}
                    disabled={undoStackRef.current.length === 0}
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    {language === "fr" ? "Annuler" : "Undo"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={handleResetFloodFill}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {language === "fr" ? "Réinitialiser" : "Reset"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1 text-xs bg-emerald-500 hover:bg-emerald-600"
                    onClick={handleApplyFloodFill}
                    disabled={!selectedElementId}
                  >
                    {language === "fr" ? "Appliquer" : "Apply"}
                  </Button>
                </div>

                {/* Bouton fermer le mode */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1 text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setFloodFillActive(null);
                    setFloodFillImageData(null);
                    setFloodFillOriginal(null);
                    setEraserActive(false);
                    handleModeChange("auto");
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  {language === "fr" ? "Fermer l'outil" : "Close tool"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
