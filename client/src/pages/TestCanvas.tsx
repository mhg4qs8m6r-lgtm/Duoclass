import { useRef, useState, useEffect, useCallback } from "react";

interface Point { x: number; y: number }

// Curseur SVG précis (croix de visée)
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
const CROSSHAIR_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(CROSSHAIR_SVG)}") 12 12, crosshair`;

// ─── Recadrer au contenu non-transparent ────────────────────────────────────
function cropToBoundingBox(canvas: HTMLCanvasElement): string {
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
}

// ─── Page de détourage manuel ───────────────────────────────────────────────
export default function TestCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [elementId, setElementId] = useState<string | null>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const [closed, setClosed] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mouse: Point; pan: Point } | null>(null);

  // ─── 1. Récupérer l'image depuis localStorage (une seule fois au montage) ──
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return; // éviter de recharger si le composant remonte
    didLoadRef.current = true;
    const data = localStorage.getItem("detourage-image");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setImageSrc(parsed.src);
        setElementId(parsed.elementId || null);
      } catch {
        setImageSrc(data);
      }
    }
  }, []);

  // ─── 2. Charger l'image et dimensionner le canvas ─────────────────────────
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    if (!imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      imgRef.current = img;
      const maxW = Math.min(800, window.innerWidth - 60);
      const maxH = Math.min(600, window.innerHeight - 200);
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxW) { h = (h * maxW) / w; w = maxW; }
      if (h > maxH) { w = (w * maxH) / h; h = maxH; }
      setImageSize({ w: Math.round(w), h: Math.round(h) });
    };
    img.onerror = (err) => {
      console.error("[TestCanvas] image load FAILED:", err);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // ─── 3. Redessiner canvas (image + tracé) avec zoom/pan ───────────────────
  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img || imageSize.w === 0) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, c.width, c.height);

    // Damier de transparence (avant le zoom, en arrière-plan fixe)
    const tileSize = 10;
    for (let ty = 0; ty < c.height; ty += tileSize) {
      for (let tx = 0; tx < c.width; tx += tileSize) {
        ctx.fillStyle = ((tx / tileSize + ty / tileSize) % 2 === 0) ? "#ffffff" : "#e5e5e5";
        ctx.fillRect(tx, ty, tileSize, tileSize);
      }
    }

    // Appliquer zoom + pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Image
    ctx.drawImage(img, 0, 0, imageSize.w, imageSize.h);

    if (points.length === 0) { ctx.restore(); return; }

    // Zone remplie si fermé
    if (closed && points.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
      ctx.fill();
    }

    // Lignes du polygone
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    if (closed) ctx.closePath();
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();

    // Fil d'Ariane vers le curseur
    if (!closed && cursorPos && points.length > 0) {
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(cursorPos.x, cursorPos.y);
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.strokeStyle = "#8b5cf6";
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Halo premier point
    const hoverFirst = !closed && cursorPos && points.length >= 3 &&
      Math.hypot(cursorPos.x - points[0].x, cursorPos.y - points[0].y) < 12 / zoom;
    if (hoverFirst) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 14 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
      ctx.fill();
    }

    // Points
    points.forEach((p, i) => {
      const isFirst = i === 0;
      const r = (isFirst ? (hoverFirst ? 7 : 5) : (dragIdx === i ? 6 : 4)) / zoom;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isFirst ? "#22c55e" : (dragIdx === i ? "#f97316" : "#3b82f6");
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      if (closed) {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(8, 10 / zoom)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), p.x, p.y);
      }
    });

    ctx.restore();
  }, [imageSize, points, closed, cursorPos, dragIdx, zoom, pan]);

  useEffect(() => { redraw(); }, [redraw]);

  // ─── 4. Coordonnées écran → coordonnées image (avec zoom/pan) ─────────────
  const getXY = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    // Position en pixels canvas (buffer)
    const canvasX = ((e.clientX - rect.left) / rect.width) * c.width;
    const canvasY = ((e.clientY - rect.top) / rect.height) * c.height;
    // Inverser pan + zoom pour obtenir les coordonnées image
    return {
      x: (canvasX - pan.x) / zoom,
      y: (canvasY - pan.y) / zoom,
    };
  };

  // Position brute en pixels canvas (pour le pan)
  const getRawXY = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const findPoint = (pos: Point, threshold = 12): number | null => {
    const t = threshold / zoom;
    for (let i = 0; i < points.length; i++) {
      if (Math.hypot(pos.x - points[i].x, pos.y - points[i].y) < t) return i;
    }
    return null;
  };

  // ─── 5. Handlers souris ───────────────────────────────────────────────────
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (result || isPanning) return;
    // Ignorer le clic qui suit immédiatement la fin d'un pan
    if (panJustEndedRef.current) { panJustEndedRef.current = false; return; }
    const pos = getXY(e);
    if (closed) return;
    if (points.length >= 3 && Math.hypot(pos.x - points[0].x, pos.y - points[0].y) < 12 / zoom) {
      setClosed(true);
      return;
    }
    setPoints(prev => [...prev, pos]);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan : clic milieu OU Alt+clic gauche
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { mouse: getRawXY(e), pan: { ...pan } };
      return;
    }
    if (result) return;
    if (!closed) return;
    const pos = getXY(e);
    const idx = findPoint(pos);
    if (idx !== null) setDragIdx(idx);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan en cours
    if (isPanning && panStartRef.current) {
      const raw = getRawXY(e);
      setPan({
        x: panStartRef.current.pan.x + (raw.x - panStartRef.current.mouse.x),
        y: panStartRef.current.pan.y + (raw.y - panStartRef.current.mouse.y),
      });
      return;
    }
    if (result) return;
    const pos = getXY(e);
    setCursorPos(pos);
    if (dragIdx !== null) {
      setPoints(prev => { const n = [...prev]; n[dragIdx] = pos; return n; });
    }
  };

  const panJustEndedRef = useRef(false);

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      // Marquer qu'un pan vient de finir pour empêcher le onClick suivant
      panJustEndedRef.current = true;
      return;
    }
    if (dragIdx !== null) setDragIdx(null);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (result) return;
    const pos = getXY(e);
    const idx = findPoint(pos, 15);
    if (idx !== null && points.length > 1) {
      setPoints(prev => prev.filter((_, i) => i !== idx));
      if (closed && points.length - 1 < 3) setClosed(false);
    }
  };

  // ─── 6. Zoom molette ──────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    // Position souris en pixels canvas
    const mx = ((e.clientX - rect.left) / rect.width) * c.width;
    const my = ((e.clientY - rect.top) / rect.height) * c.height;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(prev => {
      const newZoom = Math.min(10, Math.max(0.2, prev * factor));
      // Ajuster le pan pour zoomer vers le curseur
      setPan(p => ({
        x: mx - (mx - p.x) * (newZoom / prev),
        y: my - (my - p.y) * (newZoom / prev),
      }));
      return newZoom;
    });
  }, []);

  // Attacher le wheel handler avec passive: false (sinon preventDefault ne marche pas)
  // Dépend aussi de `result` : quand on revient du résultat, le canvas remonte et il faut réattacher
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.addEventListener("wheel", handleWheel, { passive: false });
    return () => c.removeEventListener("wheel", handleWheel);
  }, [handleWheel, imageSize, result]);

  // ─── 7. Curseur ───────────────────────────────────────────────────────────
  const getCursor = (): string => {
    if (result) return "default";
    if (isPanning) return "grabbing";
    if (dragIdx !== null) return "grabbing";
    if (closed && cursorPos && findPoint(cursorPos) !== null) return "grab";
    if (!closed && cursorPos && points.length >= 3 &&
        Math.hypot(cursorPos.x - points[0].x, cursorPos.y - points[0].y) < 12 / zoom) return "pointer";
    return CROSSHAIR_CURSOR;
  };

  // ─── 8. Découper et envoyer le résultat ───────────────────────────────────
  const handleCutout = () => {
    const img = imgRef.current;
    if (!img || points.length < 3 || !closed) return;

    try {
      // Travailler sur un canvas à la taille de l'image (sans zoom/pan)
      const clean = document.createElement("canvas");
      clean.width = imageSize.w; clean.height = imageSize.h;
      clean.getContext("2d")!.drawImage(img, 0, 0, imageSize.w, imageSize.h);

      const out = document.createElement("canvas");
      out.width = imageSize.w; out.height = imageSize.h;
      const octx = out.getContext("2d")!;
      octx.beginPath();
      octx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) octx.lineTo(points[i].x, points[i].y);
      octx.closePath();
      octx.clip();
      octx.drawImage(clean, 0, 0);

      const dataUrl = cropToBoundingBox(out);
      console.log("[TestCanvas] cutout done, result length:", dataUrl.length);
      setResult(dataUrl);
      // Le postMessage est envoyé uniquement via "Appliquer et fermer"
    } catch (err) {
      console.error("[TestCanvas] cutout FAILED (tainted canvas?):", err);
      // Fallback : découpe sans cropToBoundingBox (évite getImageData sur canvas tainted)
      const clean = document.createElement("canvas");
      clean.width = imageSize.w; clean.height = imageSize.h;
      clean.getContext("2d")!.drawImage(img, 0, 0, imageSize.w, imageSize.h);

      const out = document.createElement("canvas");
      out.width = imageSize.w; out.height = imageSize.h;
      const octx = out.getContext("2d")!;
      octx.beginPath();
      octx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) octx.lineTo(points[i].x, points[i].y);
      octx.closePath();
      octx.clip();
      octx.drawImage(clean, 0, 0);

      setResult(out.toDataURL("image/png"));
    }
  };

  // ─── 9. Retour au tracé (après aperçu du résultat) ────────────────────────
  const handleBackToEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[TestCanvas] handleBackToEdit called, points:", points.length, "closed:", closed);
    setResult(null);
    // points et closed restent intacts — le canvas se réaffiche avec le tracé existant
  };

  // ─── 10. Reset complet ────────────────────────────────────────────────────
  const reset = () => {
    setPoints([]); setClosed(false); setCursorPos(null); setDragIdx(null); setResult(null);
    setZoom(1); setPan({ x: 0, y: 0 });
  };

  const resetView = () => {
    setZoom(1); setPan({ x: 0, y: 0 });
  };

  // ─── 11. Rendu ────────────────────────────────────────────────────────────
  if (!imageSrc) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>
        <h2 style={{ marginBottom: 16, color: "#374151" }}>Détourage manuel</h2>
        <p style={{ color: "#6b7280" }}>Aucune image reçue.</p>
        <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>
          Cette page est ouverte depuis l'onglet Détourage de l'assemblage.
        </p>
      </div>
    );
  }

  // Taille d'affichage du canvas (fixe, le zoom est interne)
  const displayW = imageSize.w;
  const displayH = imageSize.h;

  return (
    <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 12, color: "#374151", fontSize: 18 }}>
        Détourage manuel
      </h2>

      {/* Barre d'outils */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        {!result && (
          <>
            <span style={{ fontSize: 13, color: "#6b7280", background: "#f3f4f6", padding: "4px 10px", borderRadius: 6 }}>
              {points.length} point{points.length !== 1 ? "s" : ""}
              {closed && <span style={{ color: "#16a34a", marginLeft: 6 }}>✓ fermé</span>}
            </span>
            <button
              type="button"
              onClick={() => {
                setPoints(prev => prev.slice(0, -1));
                if (closed && points.length - 1 < 3) setClosed(false);
              }}
              disabled={points.length === 0}
              style={{ padding: "4px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: points.length ? "pointer" : "not-allowed", opacity: points.length ? 1 : 0.4 }}
            >
              ← Annuler
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={points.length === 0}
              style={{ padding: "4px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", cursor: points.length ? "pointer" : "not-allowed", opacity: points.length ? 1 : 0.4 }}
            >
              ↻ Réinitialiser
            </button>

            {/* Contrôles zoom */}
            <span style={{ marginLeft: 8, fontSize: 12, color: "#9ca3af" }}>|</span>
            <button
              type="button"
              onClick={() => { setZoom(z => Math.min(10, z * 1.3)); }}
              style={{ padding: "4px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
            >
              + Zoom
            </button>
            <button
              type="button"
              onClick={() => { setZoom(z => Math.max(0.2, z / 1.3)); }}
              style={{ padding: "4px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
            >
              − Zoom
            </button>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{Math.round(zoom * 100)}%</span>
            {zoom !== 1 && (
              <button
                type="button"
                onClick={resetView}
                style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", color: "#6b7280" }}
              >
                1:1
              </button>
            )}

            {closed && points.length >= 3 && (
              <button
                type="button"
                onClick={handleCutout}
                style={{ marginLeft: "auto", padding: "6px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", color: "#fff", cursor: "pointer" }}
              >
                ✂ Détourer
              </button>
            )}
          </>
        )}
        {result && (
          <>
            <button
              type="button"
              onClick={handleBackToEdit}
              style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, borderRadius: 6, border: "1px solid #8b5cf6", background: "#f5f3ff", color: "#7c3aed", cursor: "pointer" }}
            >
              ← Modifier le tracé
            </button>
            <button
              type="button"
              onClick={reset}
              style={{ padding: "4px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
            >
              ↻ Recommencer
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.opener) {
                  window.opener.postMessage({ type: "detourage-result", elementId, result }, "*");
                }
                window.close();
              }}
              style={{ marginLeft: "auto", padding: "6px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer" }}
            >
              ✓ Appliquer et fermer
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {!result && (
        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
          {!closed
            ? "Cliquez pour placer des points. Clic droit = supprimer. Point vert = fermer. Molette = zoom. Alt+glisser = déplacer."
            : "Glissez les points pour affiner. Clic droit = supprimer. Molette = zoom. Alt+glisser = déplacer."}
        </p>
      )}

      {/* Zone de travail */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Canvas */}
        {!result && imageSize.w > 0 && (
          <canvas
            ref={canvasRef}
            width={displayW}
            height={displayH}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); setCursorPos(null); }}
            onContextMenu={handleContextMenu}
            style={{
              display: "block",
              cursor: getCursor(),
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,.15)",
            }}
          />
        )}

        {/* Résultat */}
        {result && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Résultat :</p>
            <img
              src={result}
              alt="Détourage"
              style={{
                maxWidth: 500,
                maxHeight: 400,
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                background: "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 20px 20px",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
