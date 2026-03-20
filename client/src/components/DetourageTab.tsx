import { useState, useRef, useEffect, useCallback, type DragEvent, type MouseEvent } from "react";
import { Scissors, Wand2, RotateCcw, Check, Loader2, Trash2, User, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PhotoFrame } from "@/types/photo";
import type { BibliothequeItem } from "./CreationsAtelier";
import { removeBackground } from "@imgly/background-removal";
import { toast } from "sonner";
import { useFaceDetection } from "@/hooks/useFaceDetection";

interface DetourageTabProps {
  selectedPhoto?: PhotoFrame | null;
  selectedPhotos?: PhotoFrame[];
  onSelectPhoto?: (photo: PhotoFrame) => void;
  onAddToBibliotheque: (item: BibliothequeItem) => void;
}

interface Point { x: number; y: number }

// Curseur SVG précis
const CROSSHAIR_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>` +
  `<line x1='12' y1='0' x2='12' y2='9' stroke='white' stroke-width='1.5'/>` +
  `<line x1='12' y1='15' x2='12' y2='24' stroke='white' stroke-width='1.5'/>` +
  `<line x1='0' y1='12' x2='9' y2='12' stroke='white' stroke-width='1.5'/>` +
  `<line x1='15' y1='12' x2='24' y2='12' stroke='white' stroke-width='1.5'/>` +
  `<line x1='12' y1='1' x2='12' y2='9' stroke='black' stroke-width='0.5'/>` +
  `<line x1='12' y1='15' x2='12' y2='23' stroke='black' stroke-width='0.5'/>` +
  `<line x1='1' y1='12' x2='9' y2='12' stroke='black' stroke-width='0.5'/>` +
  `<line x1='15' y1='12' x2='23' y2='12' stroke='black' stroke-width='0.5'/>` +
  `<circle cx='12' cy='12' r='1' fill='black'/>` +
  `</svg>`;
const CROSSHAIR = `url("data:image/svg+xml,${encodeURIComponent(CROSSHAIR_SVG)}") 12 12, crosshair`;

export default function DetourageTab({
  selectedPhoto,
  selectedPhotos = [],
  onSelectPhoto,
  onAddToBibliotheque,
}: DetourageTabProps) {
  const { language } = useLanguage();

  // Refs — UN SEUL canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Image
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });

  // Mode
  const [mode, setMode] = useState<"auto" | "manual" | "face">("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  // Polygon
  const [points, setPoints] = useState<Point[]>([]);
  const [closed, setClosed] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Photos
  const photosWithContent = selectedPhotos.filter(p => p.src || p.photoUrl);

  // Drop
  const [isDragOver, setIsDragOver] = useState(false);

  // Face
  const { faces, createFaceMask, loadModels } = useFaceDetection();
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
  const [faceShape] = useState<"circle" | "oval" | "rectangle">("oval");
  const [facePadding] = useState(30);

  // ─── Charger l'image ───────────────────────────────────────────────────────
  useEffect(() => {
    const src = selectedPhoto?.src || (selectedPhoto as any)?.photoUrl;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > 500) { h = (h * 500) / w; w = 500; }
      if (h > 400) { w = (w * 400) / h; h = 400; }
      setImageSize({ w: Math.round(w), h: Math.round(h) });
      resetManual();
    };
    img.src = src;
  }, [selectedPhoto]);

  // ─── Redessiner tout (image + tracé) sur LE SEUL canvas ───────────────────
  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img || imageSize.w === 0) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // 1. Image
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);

    // 2. Tracé (mode manuel uniquement)
    if (mode !== "manual" || points.length === 0) return;

    // Zone remplie si fermé
    if (closed && points.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
      ctx.fill();
    }

    // Lignes
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    if (closed) ctx.closePath();
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Prévisualisation vers le curseur
    if (!closed && cursorPos && points.length > 0) {
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(cursorPos.x, cursorPos.y);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#8b5cf6";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Halo premier point
    const hoverFirst = !closed && cursorPos && points.length >= 3 &&
      Math.hypot(cursorPos.x - points[0].x, cursorPos.y - points[0].y) < 12;
    if (hoverFirst) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
      ctx.fill();
    }

    // Points
    points.forEach((p, i) => {
      const isFirst = i === 0;
      const r = isFirst ? (hoverFirst ? 7 : 5) : (dragIdx === i ? 6 : 4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isFirst ? "#22c55e" : (dragIdx === i ? "#f97316" : "#3b82f6");
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (closed) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), p.x, p.y);
      }
    });
  }, [imageSize, mode, points, closed, cursorPos, dragIdx]);

  // Redessiner à chaque changement
  useEffect(() => { redraw(); }, [redraw]);

  const findPoint = useCallback((pos: Point, threshold = 12): number | null => {
    for (let i = 0; i < points.length; i++) {
      if (Math.hypot(pos.x - points[i].x, pos.y - points[i].y) < threshold) return i;
    }
    return null;
  }, [points]);

  // ─── Handlers souris — code copié littéralement de TestCanvas.tsx ──────────

  // onClick : placement des points (copie exacte de TestCanvas handleClick)
  const handleClick = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "manual") return;
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;

    // DEBUG — à lire dans la console Safari
    console.log('[DetourageTab click]', {
      clientX: e.clientX, clientY: e.clientY,
      rectLeft: rect.left, rectTop: rect.top,
      rectW: rect.width, rectH: rect.height,
      bufferW: c.width, bufferH: c.height,
      resultX: x, resultY: y,
    });

    if (closed) return; // en mode fermé, onClick ne place pas de points (drag via onMouseDown)
    if (points.length >= 3 && Math.hypot(x - points[0].x, y - points[0].y) < 12) {
      setClosed(true);
      toast.success(language === "fr"
        ? "Sélection fermée ! Déplacez les points pour affiner, puis cliquez Détourer."
        : "Selection closed! Drag points to refine, then click Cutout.");
      return;
    }
    setPoints(prev => [...prev, { x, y }]);
  }, [mode, closed, points, language]);

  // onMouseDown : uniquement pour démarrer le drag d'un point (polygone fermé)
  const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "manual" || !closed) return;
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    const idx = findPoint({ x, y });
    if (idx !== null) setDragIdx(idx);
  }, [mode, closed, findPoint]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "manual") return;
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    setCursorPos({ x, y });
    if (dragIdx !== null) {
      setPoints(prev => { const n = [...prev]; n[dragIdx] = { x, y }; return n; });
    }
  }, [mode, dragIdx]);

  const handleMouseUp = useCallback(() => {
    if (dragIdx !== null) setDragIdx(null);
  }, [dragIdx]);

  const handleContextMenu = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (mode !== "manual") return;
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    const idx = findPoint({ x, y }, 15);
    if (idx !== null && points.length > 1) {
      setPoints(prev => prev.filter((_, i) => i !== idx));
      if (closed && points.length - 1 < 3) setClosed(false);
    }
  }, [mode, points, closed, findPoint]);

  const getCursor = (): string => {
    if (mode !== "manual") return "default";
    if (dragIdx !== null) return "grabbing";
    if (closed && cursorPos && findPoint(cursorPos) !== null) return "grab";
    if (!closed && cursorPos && points.length >= 3 &&
        Math.hypot(cursorPos.x - points[0].x, cursorPos.y - points[0].y) < 12) return "pointer";
    return CROSSHAIR;
  };

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const resetManual = () => {
    setPoints([]); setClosed(false); setCursorPos(null); setDragIdx(null); setProcessedImage(null);
  };

  // ─── cropToBoundingBox ─────────────────────────────────────────────────────
  const cropToBoundingBox = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (data[(y * width + x) * 4 + 3] > 0) {
          if (x < minX) minX = x; if (y < minY) minY = y;
          if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
    if (minX >= maxX || minY >= maxY) return canvas.toDataURL("image/png");
    const m = 2;
    minX = Math.max(0, minX - m); minY = Math.max(0, minY - m);
    maxX = Math.min(width - 1, maxX + m); maxY = Math.min(height - 1, maxY + m);
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    const out = document.createElement("canvas");
    out.width = cw; out.height = ch;
    out.getContext("2d")!.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
    return out.toDataURL("image/png");
  };

  // ─── Détourage manuel ─────────────────────────────────────────────────────
  const handleManualDetourage = async () => {
    if (!imgRef.current || points.length < 3 || !closed) {
      toast.error(language === "fr"
        ? "Fermez la sélection en cliquant sur le premier point vert"
        : "Close the selection by clicking the first green point");
      return;
    }
    setIsProcessing(true);
    try {
      // Utiliser l'image source nettement (pas le canvas qui a le tracé dessiné dessus)
      const c = canvasRef.current!;
      const clean = document.createElement("canvas");
      clean.width = c.width; clean.height = c.height;
      const ctx = clean.getContext("2d")!;
      ctx.drawImage(imgRef.current, 0, 0, c.width, c.height);

      const out = document.createElement("canvas");
      out.width = c.width; out.height = c.height;
      const octx = out.getContext("2d")!;
      octx.beginPath();
      octx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) octx.lineTo(points[i].x, points[i].y);
      octx.closePath();
      octx.clip();
      octx.drawImage(clean, 0, 0);

      setProcessedImage(cropToBoundingBox(out));
      toast.success(language === "fr" ? "Détourage terminé !" : "Cutout complete!");
    } catch (err) {
      console.error("Manual cutout error:", err);
      toast.error(language === "fr" ? "Erreur lors du détourage" : "Cutout error");
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Détourage automatique IA ─────────────────────────────────────────────
  const handleAutoDetourage = async () => {
    if (!selectedPhoto?.src) {
      toast.error(language === "fr" ? "Aucune photo sélectionnée" : "No photo selected");
      return;
    }
    setIsProcessing(true); setProgress(0);
    try {
      let imageBlob: Blob;
      if (imgRef.current) {
        const tc = document.createElement("canvas");
        tc.width = imgRef.current.naturalWidth; tc.height = imgRef.current.naturalHeight;
        tc.getContext("2d")!.drawImage(imgRef.current, 0, 0);
        imageBlob = await new Promise<Blob>((res, rej) => {
          tc.toBlob(b => b ? res(b) : rej(new Error("toBlob failed")), "image/png");
        });
      } else {
        imageBlob = await (await fetch(selectedPhoto.src)).blob();
      }
      const result = await removeBackground(imageBlob, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        progress: (_k, cur, tot) => setProgress(Math.round((cur / tot) * 100)),
      });
      const base64: string = await new Promise(res => {
        const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(result);
      });
      const img = new Image();
      img.onload = () => {
        const tc = document.createElement("canvas");
        tc.width = img.width; tc.height = img.height;
        tc.getContext("2d")!.drawImage(img, 0, 0);
        setProcessedImage(cropToBoundingBox(tc));
        toast.success(language === "fr" ? "Détourage terminé !" : "Cutout complete!");
      };
      img.src = base64;
    } catch (err) {
      console.error("Auto cutout error:", err);
      toast.error(language === "fr" ? "Erreur lors du détourage" : "Cutout error");
    } finally {
      setIsProcessing(false); setProgress(0);
    }
  };

  // ─── Bibliothèque ─────────────────────────────────────────────────────────
  const handleAddToBibliotheque = () => {
    if (!processedImage) return;
    onAddToBibliotheque({
      id: `detourage_${Date.now()}`, type: "detourage",
      name: language === "fr" ? `Détourage ${new Date().toLocaleDateString()}` : `Cutout ${new Date().toLocaleDateString()}`,
      thumbnail: processedImage, fullImage: processedImage,
      createdAt: Date.now(), sourcePhotoId: selectedPhoto?.id?.toString(),
    });
    toast.success(language === "fr" ? "Ajouté à la bibliothèque !" : "Added to library!");
    setProcessedImage(null);
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col p-4">
      {/* Barre d'outils */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <Button variant={mode === "auto" ? "default" : "ghost"} size="sm" onClick={() => { setMode("auto"); resetManual(); }} className="gap-2">
            <Wand2 className="w-4 h-4" />{language === "fr" ? "Automatique (IA)" : "Automatic (AI)"}
          </Button>
          <Button variant={mode === "manual" ? "default" : "ghost"} size="sm" onClick={() => { setMode("manual"); setProcessedImage(null); }} className="gap-2">
            <Scissors className="w-4 h-4" />{language === "fr" ? "Manuel" : "Manual"}
          </Button>
          <Button variant={mode === "face" ? "default" : "ghost"} size="sm" onClick={() => { setMode("face"); loadModels(); }} className="gap-2">
            <ScanFace className="w-4 h-4" />{language === "fr" ? "Visage" : "Face"}
          </Button>
        </div>

        {mode === "manual" && (
          <>
            <Button variant="ghost" size="sm" onClick={resetManual} disabled={points.length === 0}>
              <Trash2 className="w-4 h-4 mr-1" />{language === "fr" ? "Effacer" : "Clear"}
            </Button>
            {points.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {points.length} point{points.length > 1 ? "s" : ""}
                {closed && <span className="text-green-600 ml-1">✓ fermé</span>}
              </span>
            )}
          </>
        )}

        {processedImage && (
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={resetManual}>
              <RotateCcw className="w-4 h-4 mr-1" />{language === "fr" ? "Recommencer" : "Reset"}
            </Button>
            <Button size="sm" onClick={handleAddToBibliotheque} className="bg-green-500 hover:bg-green-600">
              <Check className="w-4 h-4 mr-1" />{language === "fr" ? "Ajouter à la bibliothèque" : "Add to library"}
            </Button>
          </div>
        )}
      </div>

      {/* Zone de travail */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Colonne photos */}
        {photosWithContent.length > 0 && (
          <div className="w-28 flex flex-col bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden">
            <div className="p-2 bg-gray-100 border-b text-center">
              <p className="text-xs font-medium text-gray-600">{language === "fr" ? "Photos" : "Photos"}</p>
              <p className="text-[10px] text-gray-400">{photosWithContent.length}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {photosWithContent.map((photo, i) => {
                const src = (photo as any).src || photo.photoUrl;
                const active = selectedPhoto?.id === photo.id;
                return (
                  <div key={photo.id || i} draggable
                    onDragStart={(e) => { e.dataTransfer.setData("application/json", JSON.stringify(photo)); }}
                    onClick={() => onSelectPhoto?.(photo)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${active ? "border-purple-500 ring-2 ring-purple-300" : "border-gray-200"}`}
                  >
                    <img src={src} alt={photo.title || `#${i+1}`} className="w-full h-16 object-cover" draggable={false} />
                    {active && <div className="absolute inset-0 bg-purple-500/10 border-2 border-purple-500" />}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[8px] px-1 truncate">{photo.title || `#${i+1}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Canvas unique */}
        <div
          className={`flex-1 flex flex-col items-center justify-center rounded-xl p-4 transition-all ${isDragOver ? "bg-purple-100 border-2 border-dashed border-purple-400" : "bg-gray-100"}`}
          onClickCapture={(e) => {
            const target = e.target as HTMLElement;
            console.log('[DetourageTab onClickCapture]', {
              tagName: target.tagName,
              className: target.className?.slice?.(0, 80),
              id: target.id,
              pointerEvents: window.getComputedStyle(target).pointerEvents,
              zIndex: window.getComputedStyle(target).zIndex,
              position: window.getComputedStyle(target).position,
              isCanvas: target === canvasRef.current,
            });
          }}
          onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e: DragEvent<HTMLDivElement>) => {
            e.preventDefault(); setIsDragOver(false);
            try { const d = JSON.parse(e.dataTransfer.getData("application/json")); if (d && onSelectPhoto) onSelectPhoto(d); } catch {}
          }}
        >
          <p className="text-sm text-gray-500 mb-2">{language === "fr" ? "Image source" : "Source image"}</p>

          {selectedPhoto?.src ? (
            <canvas
              ref={canvasRef}
              width={imageSize.w}
              height={imageSize.h}
              style={{
                display: "block",
                width: imageSize.w,
                height: imageSize.h,
                flexShrink: 0,
                cursor: getCursor(),
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                background: "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 20px 20px",
              }}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); setCursorPos(null); }}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <div className="text-center text-gray-400 py-16">
              <Scissors className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{language === "fr" ? "Sélectionnez une photo" : "Select a photo"}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-3">
          {!processedImage && selectedPhoto && mode !== "face" && (
            <Button
              onClick={mode === "auto" ? handleAutoDetourage : handleManualDetourage}
              disabled={isProcessing || (mode === "manual" && (!closed || points.length < 3))}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-5"
            >
              {isProcessing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{progress > 0 ? `${progress}%` : "..."}</>
                : <>{mode === "auto" ? <Wand2 className="w-4 h-4 mr-2" /> : <Scissors className="w-4 h-4 mr-2" />}{language === "fr" ? "Détourer" : "Cutout"}</>}
            </Button>
          )}
          {!processedImage && selectedPhoto && mode === "face" && faces.length > 0 && selectedFaceIndex !== null && (
            <Button onClick={() => {
              if (imgRef.current && selectedFaceIndex !== null && faces[selectedFaceIndex]) {
                const mask = createFaceMask(imgRef.current, faces[selectedFaceIndex], facePadding, faceShape);
                if (mask) { setProcessedImage(mask); toast.success(language === "fr" ? "Visage extrait !" : "Face extracted!"); }
              }
            }} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-5">
              <User className="w-4 h-4 mr-2" />{language === "fr" ? "Extraire" : "Extract"}
            </Button>
          )}
        </div>

        {/* Résultat */}
        {processedImage && (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2">{language === "fr" ? "Résultat" : "Result"}</p>
            <img src={processedImage} alt="Result" className="max-w-full max-h-[350px] rounded-lg shadow-md"
              style={{ background: "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 20px 20px" }}
              draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", processedImage); }} />
          </div>
        )}
      </div>

      {/* Instructions */}
      {mode === "manual" && !processedImage && selectedPhoto?.src && (
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 border rounded-lg p-2 text-center">
          {!closed
            ? (language === "fr"
              ? "Cliquez pour placer des points. Clic droit = supprimer. Cliquez le point vert pour fermer."
              : "Click to place points. Right-click = remove. Click green point to close.")
            : (language === "fr"
              ? "Glissez les points pour affiner. Clic droit = supprimer. Cliquez Détourer quand prêt."
              : "Drag points to refine. Right-click = remove. Click Cutout when ready.")}
        </div>
      )}
    </div>
  );
}
