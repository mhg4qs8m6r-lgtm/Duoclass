import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Scissors, Wrench, Sparkles, LayoutGrid, Sticker, Library, Image, Printer, Mail, Download, Save, Edit2, Plus, ZoomIn, ZoomOut, Grid3X3, Ruler, Crosshair, RotateCcw, Lock, Unlock, Trash2, ChevronRight, ChevronDown, Copy, ArrowUp, ArrowDown, MoreVertical, Layers, ImagePlus, FlipHorizontal, FlipVertical, Spline, CheckCircle, Minus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { PhotoFrame } from "@/types/photo";
import { db, BibliothequeItemDB, CreationsBasketItem, CreationsProject, getCreationsBasket, clearCreationsBasket, removeFromCreationsBasket, getAllCreationsProjects, createCreationsProject, getCreationsProject, updateCreationsProject, addToCreationsBasket, deleteCreationsProject, saveCollageToAlbum } from "@/db";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ShoppingBasket, Trash2 as TrashIcon } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

// Import des panneaux d'outils (inline, pas de modales)
import DetourageToolsPanel, { DetourageMode, ManualTool } from "./DetourageToolsPanel";
import AssemblagePanel, { PassePartoutData, FiletConfig } from "./AssemblagePanel";

interface CreationsAtelierProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // ID du projet ouvert
  projectName?: string; // Nom du projet
  selectedPhotos?: PhotoFrame[]; // Photos sélectionnées (pour envoi direct)
  albumPhotos?: PhotoFrame[]; // Toutes les photos de l'album (pour la colonne source)
  onSaveProject?: (projectData: any) => void;
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
// IMPORTANT: x, y, width, height sont en CENTIMÈTRES (pas en pixels)
// Cela permet de garder des dimensions cohérentes quelle que soit l'orientation ou le zoom
interface CanvasElement {
  id: string;
  type: "image" | "text" | "shape";
  src?: string;
  text?: string;
  x: number; // Position X en cm
  y: number; // Position Y en cm
  width: number; // Largeur en cm
  height: number; // Hauteur en cm
  rotation: number;
  zIndex: number;
  opacity: number;
  flipX?: boolean;
  flipY?: boolean;
  locked?: boolean;
  name?: string;
  // Dimensions originales de l'image en pixels (pour référence)
  originalWidthPx?: number;
  originalHeightPx?: number;
  groupId?: string; // ID du groupe (les éléments avec le même groupId forment un groupe)
  // Champs typographiques (type === "text")
  fontFamily?: string;       // Ex. "Georgia", "Playfair Display"
  fontSize?: number;         // En points (pt)
  fontColor?: string;        // Couleur CSS ex. "#1a1a1a"
  fontBold?: boolean;
  fontItalic?: boolean;
  fontUnderline?: boolean;
  textAlign?: "left" | "center" | "right";
  strokeColor?: string;      // Couleur du contour
  strokeWidth?: number;      // Épaisseur du contour en px
  shadowColor?: string;      // Couleur de l'ombre
  shadowBlur?: number;       // Flou de l'ombre en px
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  // Champs découpe interactive (type === "shape")
  shape?: "rect" | "square" | "round" | "oval" | "arch" | "puzzle" | "heart" | "star" | "diamond" | "hexagon" | "line"; // Forme de l'ouverture
  openingColor?: string;     // Couleur de fond de cette découpe (ex. "#ffffff")
  validated?: boolean;       // true = découpe figée, false = en cours de positionnement
  openingIndex?: number;     // Numéro d'ordre de la découpe (1, 2, 3...)
  // Encoches puzzle : 1 = tenon (sortant), -1 = mortaise (rentrante), 0 = bord droit (périmètre)
  puzzleEdges?: { top: number; right: number; bottom: number; left: number };
  /** Afficher le numéro de la pièce au centre (pour puzzles enfants) */
  puzzleShowNumber?: boolean;
  /** Mode vierge : contours seuls sans remplissage (pour découpe laser sur bois) */
  puzzleTransparent?: boolean;
  /** Taille des numéros de pièces (small=20%, medium=35%, large=55% de la plus petite dimension) */
  puzzleNumberSize?: 'small' | 'medium' | 'large';
  /** Nombre de branches de l'étoile (3 à 8, défaut 5) */
  starBranches?: number;
  /** Profondeur de l'encoche du cœur (0=cœur plat, 100=cœur profond, défaut 50) */
  heartDepth?: number;
  /**
   * Path SVG personnalisé en coordonnées cm (relatif à la page blanche).
   * Quand présent, remplace le rendu géométrique standard de la forme.
   * Généré par l'éditeur de segments (incurvation / suppression de bords).
   */
  customPath?: string;

}

// Types pour les éléments du collecteur
interface CollectorItem {
  id: string;
  type: "photo" | "detourage" | "element" | "sticker" | "effect";
  src: string;
  name: string;
  thumbnail?: string;
}

// Onglets principaux
type MainTab = "detourage" | "assemblage";
  // Sous-onglets d'assemblage (conservé pour compatibilité éventuelle)
type AssemblageSubTab = "bibliotheque" | "effets" | "miseenpage" | "stickers";

// Composant helper : positionne le menu contextuel pour qu'il reste toujours dans la fenêtre
const ContextMenuPositioned = ({
  x, y, children, onClose
}: {
  x: number; y: number;
  children: React.ReactNode;
  onClose: () => void;
}) => {
  // Calcul préventif de la position AVANT le rendu
  // On utilise une hauteur estimée conservative (700px = menu complet avec alignement)
  // et une largeur estimée (240px) pour éviter tout débordement
  const ESTIMATED_HEIGHT = 700;
  const ESTIMATED_WIDTH = 240;
  const MARGIN = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = x;
  let top = y;
  // Ajustement horizontal
  if (left + ESTIMATED_WIDTH + MARGIN > vw) left = vw - ESTIMATED_WIDTH - MARGIN;
  if (left < MARGIN) left = MARGIN;
  // Ajustement vertical : si le menu déborde vers le bas, l'ouvrir vers le HAUT
  if (top + ESTIMATED_HEIGHT + MARGIN > vh) top = Math.max(MARGIN, vh - ESTIMATED_HEIGHT - MARGIN);
  if (top < MARGIN) top = MARGIN;

  const menuRef = useRef<HTMLDivElement>(null);

  // Ajustement fin après rendu (correction si hauteur réelle diffère de l'estimation)
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const curVh = window.innerHeight;
    if (rect.bottom > curVh - MARGIN) {
      el.style.top = `${Math.max(MARGIN, curVh - rect.height - MARGIN)}px`;
    }
    if (rect.right > window.innerWidth - MARGIN) {
      el.style.left = `${Math.max(MARGIN, window.innerWidth - rect.width - MARGIN)}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] z-[101]"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

// Composant helper : affiche une image via <canvas> drawImage (invisible pour Safari — pas de contrôles natifs)
const CanvasImage = ({ src, className, dataElementId }: { src: string; className?: string; dataElementId?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const img = imgRef.current;
      if (!img || !img.complete) return;
      // Adapter la résolution du canvas à la taille CSS affichée
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    if (imgRef.current && imgRef.current.src === src && imgRef.current.complete) {
      draw();
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = src;
  }, [src]);

  // Redessiner quand le canvas est redimensionné (zoom, resize poignée, etc.)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const ctx = canvas.getContext('2d');
      const img = imgRef.current;
      if (!ctx || !img || !img.complete) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      data-element-id={dataElementId}
      style={{ width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none' }}
    />
  );
};

/**
 * Génère le SVG path d'une pièce de puzzle avec encoches Bezier.
 * @param w Largeur de la pièce (en unités quelconques : px, mm, cm)
 * @param h Hauteur de la pièce
 * @param edges { top, right, bottom, left } : 1=tenon sortant, -1=mortaise rentrante, 0=bord droit
 * @returns string SVG path (d attribut), coordonnées relatives à (0,0)
 */
function buildPuzzlePath(
  w: number,
  h: number,
  edges: { top: number; right: number; bottom: number; left: number }
): string {
  const nr = Math.min(w, h) * 0.20; // rayon du tenon
  const pcx = w / 2, pcy = h / 2;
  const { top, right, bottom, left } = edges;

  // Segment de bord avec encoche :
  // dir=1 tenon sortant, dir=-1 mortaise rentrante, dir=0 bord droit
  // Pour le bord haut (gauche→droite) : tenon sort vers y négatif
  // Pour le bord droit (haut→bas) : tenon sort vers x positif
  // Pour le bord bas (droite→gauche) : tenon sort vers y positif
  // Pour le bord gauche (bas→haut) : tenon sort vers x négatif

  const segments: string[] = [];

  // --- Bord haut : de (0,0) vers (w,0), tenon vers y négatif ---
  segments.push(`M0,0`);
  if (top === 0) {
    segments.push(`L${w},0`);
  } else {
    const d = top; // 1=sortant vers haut, -1=rentrant vers bas
    segments.push(`L${pcx - nr},0`);
    segments.push(`C${pcx - nr},${-d * nr * 0.5} ${pcx - nr * 0.5},${-d * nr * 1.3} ${pcx},${-d * nr * 1.3}`);
    segments.push(`C${pcx + nr * 0.5},${-d * nr * 1.3} ${pcx + nr},${-d * nr * 0.5} ${pcx + nr},0`);
    segments.push(`L${w},0`);
  }

  // --- Bord droit : de (w,0) vers (w,h), tenon vers x positif ---
  if (right === 0) {
    segments.push(`L${w},${h}`);
  } else {
    const d = right;
    segments.push(`L${w},${pcy - nr}`);
    segments.push(`C${w + d * nr * 0.5},${pcy - nr} ${w + d * nr * 1.3},${pcy - nr * 0.5} ${w + d * nr * 1.3},${pcy}`);
    segments.push(`C${w + d * nr * 1.3},${pcy + nr * 0.5} ${w + d * nr * 0.5},${pcy + nr} ${w},${pcy + nr}`);
    segments.push(`L${w},${h}`);
  }

  // --- Bord bas : de (w,h) vers (0,h), tenon vers y positif ---
  if (bottom === 0) {
    segments.push(`L0,${h}`);
  } else {
    const d = bottom;
    segments.push(`L${pcx + nr},${h}`);
    segments.push(`C${pcx + nr},${h + d * nr * 0.5} ${pcx + nr * 0.5},${h + d * nr * 1.3} ${pcx},${h + d * nr * 1.3}`);
    segments.push(`C${pcx - nr * 0.5},${h + d * nr * 1.3} ${pcx - nr},${h + d * nr * 0.5} ${pcx - nr},${h}`);
    segments.push(`L0,${h}`);
  }

  // --- Bord gauche : de (0,h) vers (0,0), tenon vers x négatif ---
  if (left === 0) {
    segments.push(`Z`);
  } else {
    const d = left;
    segments.push(`L0,${pcy + nr}`);
    segments.push(`C${-d * nr * 0.5},${pcy + nr} ${-d * nr * 1.3},${pcy + nr * 0.5} ${-d * nr * 1.3},${pcy}`);
    segments.push(`C${-d * nr * 1.3},${pcy - nr * 0.5} ${-d * nr * 0.5},${pcy - nr} 0,${pcy - nr}`);
    segments.push(`Z`);
  }

  return segments.join(' ');
}

// ─── Éditeur de segments ─────────────────────────────────────────────────────
/**
 * Un segment représente soit une ligne droite (type 'L') soit une courbe
 * quadratique de Bézier (type 'Q') entre deux points en coordonnées cm.
 * Pour 'Q', cx/cy est le point de contrôle intermédiaire.
 */
interface Segment {
  type: 'L' | 'Q';
  x1: number; y1: number; // Point de départ (cm)
  x2: number; y2: number; // Point d'arrivée (cm)
  cx?: number; cy?: number; // Point de contrôle Bézier (cm, uniquement pour 'Q')
}

/**
 * Décompose la forme géométrique d'un élément shape en segments en coordonnées
 * cm absolues (relatives à la page blanche). Retourne null si la forme n'est
 * pas supportée par l'éditeur de segments.
 */
/**
 * Projette un point (px, py) sur le segment le plus proche du périmètre d'une forme.
 * Retourne le point projeté en coordonnées cm.
 */
function snapToPerimeter(
  px: number, py: number,
  segments: Array<{ type: string; x1: number; y1: number; x2: number; y2: number; cx?: number; cy?: number }>
): { x: number; y: number } {
  let bestDist = Infinity;
  let bestPt = { x: px, y: py };
  for (const seg of segments) {
    // Projection sur segment linéaire
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-10) continue;
    const t = Math.max(0, Math.min(1, ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2));
    const projX = seg.x1 + t * dx;
    const projY = seg.y1 + t * dy;
    const dist = Math.hypot(px - projX, py - projY);
    if (dist < bestDist) {
      bestDist = dist;
      bestPt = { x: projX, y: projY };
    }
  }
  return bestPt;
}

/**
 * Découpe une forme en deux polygones à partir d'une ligne de découpe (p1→p2 en cm).
 * Retourne deux SVG paths en coordonnées cm, ou null si la découpe est impossible.
 */
function cutShapeByLine(
  el: { x: number; y: number; width: number; height: number; shape?: string; customPath?: string },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { pathA: string; pathB: string } | null {
  const segs = buildShapeSegments(el);
  if (!segs || segs.length < 2) return null;

  // Construire la liste des sommets du périmètre (polygone linéaire)
  const verts: { x: number; y: number }[] = [];
  for (const s of segs) {
    verts.push({ x: s.x1, y: s.y1 });
  }
  // Fermer implicitement (dernier sommet = premier)

  const n = verts.length;

  // Trouver les deux points d'intersection de la ligne de découpe avec le périmètre
  // On cherche les deux arêtes les plus proches de p1 et p2
  function projectOnEdge(
    px: number, py: number
  ): { edgeIdx: number; t: number; x: number; y: number } {
    let bestDist = Infinity;
    let best = { edgeIdx: 0, t: 0, x: px, y: py };
    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-10) continue;
      const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      const dist = Math.hypot(px - projX, py - projY);
      if (dist < bestDist) {
        bestDist = dist;
        best = { edgeIdx: i, t, x: projX, y: projY };
      }
    }
    return best;
  }

  const snap1 = projectOnEdge(p1.x, p1.y);
  const snap2 = projectOnEdge(p2.x, p2.y);

  // Si les deux points tombent sur la même arête, découpe impossible
  if (snap1.edgeIdx === snap2.edgeIdx && Math.abs(snap1.t - snap2.t) < 0.01) return null;

  // Construire les deux polygones en parcourant le périmètre dans les deux sens
  function buildPoly(
    from: { edgeIdx: number; t: number; x: number; y: number },
    to: { edgeIdx: number; t: number; x: number; y: number }
  ): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    pts.push({ x: from.x, y: from.y });
    // Parcourir les sommets de from.edgeIdx+1 jusqu'à to.edgeIdx (inclus)
    let idx = (from.edgeIdx + 1) % n;
    const maxIter = n + 2;
    let iter = 0;
    while (idx !== (to.edgeIdx + 1) % n && iter < maxIter) {
      if (idx === (to.edgeIdx + 1) % n) break;
      // Ajouter le sommet de l'arête to si on y arrive
      if (idx === to.edgeIdx) {
        pts.push(verts[idx]);
        break;
      }
      pts.push(verts[idx]);
      idx = (idx + 1) % n;
      iter++;
    }
    pts.push({ x: to.x, y: to.y });
    return pts;
  }

  const polyA = buildPoly(snap1, snap2);
  const polyB = buildPoly(snap2, snap1);

  function polyToPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    return 'M' + pts.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(' L') + ' Z';
  }

  return { pathA: polyToPath(polyA), pathB: polyToPath(polyB) };
}

function buildShapeSegments(el: {
  x: number; y: number; width: number; height: number;
  shape?: string; customPath?: string;
}): Segment[] | null {
  const { x, y, width: w, height: h } = el;
  if (el.customPath) {
    return parseCustomPathToSegments(el.customPath);
  }
  switch (el.shape) {
    case 'rect':
    case undefined: {
      return [
        { type: 'L', x1: x,     y1: y,     x2: x + w, y2: y },
        { type: 'L', x1: x + w, y1: y,     x2: x + w, y2: y + h },
        { type: 'L', x1: x + w, y1: y + h, x2: x,     y2: y + h },
        { type: 'L', x1: x,     y1: y + h, x2: x,     y2: y },
      ];
    }
    case 'square': {
      const side = Math.min(w, h);
      const ox = x + (w - side) / 2;
      const oy = y + (h - side) / 2;
      return [
        { type: 'L', x1: ox,        y1: oy,        x2: ox + side, y2: oy },
        { type: 'L', x1: ox + side, y1: oy,        x2: ox + side, y2: oy + side },
        { type: 'L', x1: ox + side, y1: oy + side, x2: ox,        y2: oy + side },
        { type: 'L', x1: ox,        y1: oy + side, x2: ox,        y2: oy },
      ];
    }
    case 'diamond': {
      return [
        { type: 'L', x1: x + w/2, y1: y,       x2: x + w,   y2: y + h/2 },
        { type: 'L', x1: x + w,   y1: y + h/2, x2: x + w/2, y2: y + h },
        { type: 'L', x1: x + w/2, y1: y + h,   x2: x,       y2: y + h/2 },
        { type: 'L', x1: x,       y1: y + h/2, x2: x + w/2, y2: y },
      ];
    }
    case 'hexagon': {
      const hcx = x + w/2, hcy = y + h/2;
      const hrx = w/2, hry = h/2;
      const pts: {px: number; py: number}[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        pts.push({ px: hcx + hrx * Math.cos(a), py: hcy + hry * Math.sin(a) });
      }
      return pts.map((p, i) => ({
        type: 'L' as const,
        x1: p.px, y1: p.py,
        x2: pts[(i + 1) % 6].px, y2: pts[(i + 1) % 6].py,
      }));
    }
    case 'arch': {
      return [
        { type: 'L', x1: x,     y1: y + h,   x2: x + w, y2: y + h },
        { type: 'L', x1: x + w, y1: y + h,   x2: x + w, y2: y + h/2 },
        { type: 'Q', x1: x + w, y1: y + h/2, x2: x,     y2: y + h/2, cx: x + w/2, cy: y },
        { type: 'L', x1: x,     y1: y + h/2, x2: x,     y2: y + h },
      ];
    }
    default:
      return null;
  }
}

/**
 * Parse un customPath SVG en coordonnées cm vers un tableau de Segment.
 * Supporte les commandes M, L, Q, Z.
 */
function parseCustomPathToSegments(pathStr: string): Segment[] {
  const segments: Segment[] = [];
  const tokens = pathStr.match(/[MLQZmlqz]|[-+]?[0-9]*\.?[0-9]+/g) || [];
  let i = 0;
  let startX = 0, startY = 0;
  let curX = 0, curY = 0;
  let cmd = '';
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/[MLQZmlqz]/.test(tok)) { cmd = tok; i++; }
    if (cmd === 'M' || cmd === 'm') {
      const ax = parseFloat(tokens[i]); const ay = parseFloat(tokens[i+1]); i += 2;
      curX = cmd === 'm' ? curX + ax : ax;
      curY = cmd === 'm' ? curY + ay : ay;
      startX = curX; startY = curY;
    } else if (cmd === 'L' || cmd === 'l') {
      const ax = parseFloat(tokens[i]); const ay = parseFloat(tokens[i+1]); i += 2;
      const nx = cmd === 'l' ? curX + ax : ax;
      const ny = cmd === 'l' ? curY + ay : ay;
      segments.push({ type: 'L', x1: curX, y1: curY, x2: nx, y2: ny });
      curX = nx; curY = ny;
    } else if (cmd === 'Q' || cmd === 'q') {
      const cx = parseFloat(tokens[i]); const cy = parseFloat(tokens[i+1]);
      const ax = parseFloat(tokens[i+2]); const ay = parseFloat(tokens[i+3]); i += 4;
      const ncx = cmd === 'q' ? curX + cx : cx;
      const ncy = cmd === 'q' ? curY + cy : cy;
      const nx = cmd === 'q' ? curX + ax : ax;
      const ny = cmd === 'q' ? curY + ay : ay;
      segments.push({ type: 'Q', x1: curX, y1: curY, x2: nx, y2: ny, cx: ncx, cy: ncy });
      curX = nx; curY = ny;
    } else if (cmd === 'Z' || cmd === 'z') {
      if (curX !== startX || curY !== startY) {
        segments.push({ type: 'L', x1: curX, y1: curY, x2: startX, y2: startY });
      }
      curX = startX; curY = startY; i++;
    } else { i++; }
  }
  return segments;
}

/**
 * Reconstruit un path SVG en coordonnées cm à partir d'un tableau de segments.
 */
function pathFromSegments(segments: Segment[]): string {
  if (segments.length === 0) return '';
  const parts: string[] = [];
  parts.push(`M${segments[0].x1.toFixed(4)},${segments[0].y1.toFixed(4)}`);
  for (const seg of segments) {
    if (seg.type === 'L') {
      parts.push(`L${seg.x2.toFixed(4)},${seg.y2.toFixed(4)}`);
    } else if (seg.type === 'Q' && seg.cx !== undefined && seg.cy !== undefined) {
      parts.push(`Q${seg.cx.toFixed(4)},${seg.cy.toFixed(4)} ${seg.x2.toFixed(4)},${seg.y2.toFixed(4)}`);
    }
  }
  parts.push('Z');
  return parts.join(' ');
}
// ─── Fin Éditeur de segments ──────────────────────────────────────────────────

export default function CreationsAtelierV2({
  isOpen,
  onClose,
  projectId,
  projectName = "Nouveau projet",  // Will be overridden by caller with language-aware value
  selectedPhotos = [],
  albumPhotos = [],
  onSaveProject,
}: CreationsAtelierProps) {
  const { t, language } = useLanguage();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
  // État du canvas
  const [paperFormat, setPaperFormat] = useState(PAPER_FORMATS[4]); // 24x29.7 par défaut
  // Dimensions du format personnalisé (en cm, saisie libre)
  const [customWidth, setCustomWidth] = useState(20);
  const [customHeight, setCustomHeight] = useState(20);
  // États texte intermédiaires pour permettre une saisie fluide sans écrasement
  // (ex. l'utilisateur tape "3" avant de taper "35" : on ne valide qu'à onBlur)
  const [customWidthText, setCustomWidthText] = useState('20');
  const [customHeightText, setCustomHeightText] = useState('20');
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [imageZoom, setImageZoom] = useState(100); // Zoom de l'image sélectionnée (100% = taille normale)
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(false);
  /** Affiche les croix de repérage d'imprimerie (crop marks) aux 4 coins de la page */
  const [showCropMarks, setShowCropMarks] = useState(false);
  // Overlay sticker planner : contour offset (toggle b). NE contient PAS showCropMarks.
  // Les croix de repérage sont gérées par stickerCropMarks (toggle c) séparément.
  const [stickerOverlay, setStickerOverlay] = useState<{ elementId: string; offsetMm: number; gaussPasses: number } | null>(null);
  // Croix de repérage du Sticker Planner (toggle c) — state séparé et contrôlé par le parent.
  // Cela garantit zéro couplage avec le toggle b (Contour).
  const [stickerCropMarks, setStickerCropMarks] = useState(false);
  // Paths SVG de silhouette calculés par alpha tracing (clé = elementId, valeur = path d)
  // Chaque path est en coordonnées cm relatives à la page blanche.
  const [stickerContourPaths, setStickerContourPaths] = useState<Record<string, string | null>>({});
  // Ref pour lire stickerContourPaths dans le useEffect sans créer de dépendance
  const stickerContourPathsRef = useRef<Record<string, string | null>>({});
  useEffect(() => { stickerContourPathsRef.current = stickerContourPaths; }, [stickerContourPaths]);
  // Refs pour détecter si le recalcul est dû à un changement d'elementId/offsetMm
  // (reset complet) ou seulement à de nouveaux IDs (recalcul partiel des manquants).
  const prevOverlayKeyRef = useRef<string>('');
  
  // Toggle cadre extérieur du format (Passe-partout)
  const [showFormatBorder, setShowFormatBorder] = useState(false);
  // Filets : traits fins concentriques autour des ouvertures (max 3)
  const [filets, setFilets] = useState<FiletConfig[]>([]);

  // Onglets
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("detourage");
  // activeAssemblageSubTab conservé pour éviter les erreurs de références résiduelles
  const [activeAssemblageSubTab] = useState<AssemblageSubTab>("bibliotheque");
  
  // Éléments sur le canvas
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  // Modale d'aperçu SVG laser
  const [svgPreviewModal, setSvgPreviewModal] = useState<{ svgContent: string; filename: string } | null>(null);
  
  // Refs pour le déplacement groupé (multi-sélection)
  const multiDragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // Photos sources (colonne de droite extrême)
  const [sourcePhotos, setSourcePhotos] = useState<CollectorItem[]>([]);
  
  // Collecteur (pièces détourées et éléments de montage)
  const [collectorItems, setCollectorItems] = useState<CollectorItem[]>([]);
  
  // Nom et ID du projet
  const [currentProjectName, setCurrentProjectName] = useState(projectName);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectId || null);
  
  // Photo active pour le travail sur le canvas
  const [activeCanvasPhoto, setActiveCanvasPhoto] = useState<string | null>(null);
  
  // États pour le drag des éléments sur le canvas
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<{ x: number; y: number } | null>(null);
  
  // États pour le redimensionnement
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'nw', 'ne', 'sw', 'se'
  const [elementStartSize, setElementStartSize] = useState<{ width: number; height: number } | null>(null);
  
  // États pour la rotation libre
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStartAngle, setRotationStartAngle] = useState<number>(0); // angle initial du curseur
  const [rotationStartValue, setRotationStartValue] = useState<number>(0); // rotation initiale de l'élément
  const [rotationCenterRef, setRotationCenterRef] = useState<{ x: number; y: number } | null>(null);

  // États pour le lasso de sélection (rectangle de sélection)
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoEnd, setLassoEnd] = useState<{ x: number; y: number } | null>(null);
  const [lassoAdditive, setLassoAdditive] = useState(false); // Ctrl/Shift pour ajouter à la sélection
  
  // État pour afficher le panier
  const [showBasket, setShowBasket] = useState(false);
  
  // États pour les dimensions de l'image
  const [lockAspectRatio, setLockAspectRatio] = useState(true); // Verrouillage des proportions
  // États texte intermédiaires pour les champs largeur/hauteur d'éléments (saisie fluide, validation onBlur)
  const [elemWidthText, setElemWidthText] = useState('');
  const [elemHeightText, setElemHeightText] = useState('');
  const [elemDimEditing, setElemDimEditing] = useState<'width' | 'height' | null>(null);
  const [showDimensionsInCm, setShowDimensionsInCm] = useState(false); // Afficher en cm au lieu de px
  
  // États pour le détourage manuel
  const [detourageMode, setDetourageMode] = useState<DetourageMode>("auto");
  const [manualTool, setManualTool] = useState<ManualTool | null>(null);
  const [detouragePoints, setDetouragePoints] = useState<{x: number, y: number}[]>([]);
  const [isDetourageActive, setIsDetourageActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{x: number, y: number} | null>(null);

  // Écouter le résultat du détourage manuel (retour depuis /test-canvas via postMessage)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "detourage-result") return;
      const { elementId: eid, result } = e.data;
      if (!result) return;
      // Appliquer le détourage sur l'élément d'origine
      if (eid) {
        updateCanvasElement(eid, { src: result });
      }
      // Ajouter aussi au collecteur
      addToCollector(result, language === "fr" ? "Détourage manuel" : "Manual cutout", "detourage");
      toast.success(language === "fr" ? "Détourage appliqué !" : "Cutout applied!");
      // Nettoyage
      localStorage.removeItem("detourage-image");
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [language]);
  
  // État pour le menu contextuel (clic droit sur élément)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string;
  } | null>(null);
  
  // État pour le menu contextuel de la zone vide (clic droit sur canvas)
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  
  // États pour la modale de sélection/création de projet
  const [showProjectModal, setShowProjectModal] = useState(true); // Afficher au démarrage
  const [showNewProjectHelp, setShowNewProjectHelp] = useState(false); // Modale d'aide pour créer un projet
  const [existingProjects, setExistingProjects] = useState<CreationsProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  
  // Contenu du panier (réactif avec useLiveQuery)
  const basketItems = useLiveQuery(() => db.creations_basket.orderBy('addedAt').toArray(), []) || [];
  
  // État pour la sauvegarde automatique
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true); // Pour éviter la sauvegarde au chargement initial
  const autoSaveCounterRef = useRef(0); // Compteur pour éviter les sauvegardes en boucle
  const justDidRightClickRef = useRef(false); // Flag pour empêcher onClick de désélectionner après un clic droit
  const justFinishedLassoRef = useRef(false); // Flag pour empêcher onClick de désélectionner après un lasso
  
  // État pour la confirmation avant de quitter
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // État pour le flux "Nouveau projet depuis la barre du bas"
  const [showSaveBeforeNew, setShowSaveBeforeNew] = useState(false);
  const lastSavedDataRef = useRef<string>(''); // Snapshot des données au dernier save

  // ID de l'élément passe-partout à remplacer lors du prochain ajout
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  // ─── Éditeur de segments ───────────────────────────────────────────────────
  /** ID de l'élément shape dont on affiche l'éditeur de segments (null = aucun) */
  const [segmentEditorElementId, setSegmentEditorElementId] = useState<string | null>(null);
  /** true = tous les segments de la forme sont actuellement arrondis */
  const [segmentsRounded, setSegmentsRounded] = useState<boolean>(false);
  /** Mode édition de nœuds : activé via le bouton "Éditer les segments" quand une forme polygonale est sélectionnée */
  const [isNodeEditMode, setIsNodeEditMode] = useState<boolean>(false);
  /** Index du segment actuellement sélectionné dans le tableau de segments (null = aucun) */
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  /** Intensité de l'arrondi du segment sélectionné (0–100, correspond à 0–50% de la longueur du segment) */
  const [roundIntensity, setRoundIntensity] = useState<number>(35);
  /** Index du segment dont on drag le point de contrôle Bézier (null = aucun) */
  const [draggingCPIndex, setDraggingCPIndex] = useState<number | null>(null);
  // ─── Fin Éditeur de segments ──────────────────────────────────────────────────────

  // ── Mode découpe par ligne ──────────────────────────────────────────────────────────
  const [isCutMode, setIsCutMode] = useState<boolean>(false);
  const [cutStart, setCutStart] = useState<{ x: number; y: number } | null>(null);
  const [cutEnd, setCutEnd] = useState<{ x: number; y: number } | null>(null);
  // ── Mode tracé libre de ligne ─────────────────────────────────────────────────────────────────────────────────────
  /** true = l'utilisateur est en train de tracer une ligne (cliquer-glisser) */
  const [isLineDrawMode, setIsLineDrawMode] = useState<boolean>(false);
  /** true = l'utilisateur est en train de déplacer le point de contrôle d'une courbe de Bézier */
  const [isDraggingCtrl, setIsDraggingCtrl] = useState<boolean>(false);
  /** ID de l'élément dont le point de contrôle est en cours de drag */
  const draggingCtrlElementIdRef = useRef<string | null>(null);
  /** Point de départ du tracé en cours (coordonnées cm) */
  const [lineDrawStart, setLineDrawStart] = useState<{ x: number; y: number } | null>(null);
  /** Ref synchrone du point de départ — évite le problème de closure dans onMouseDown
   * (le state React n'est pas encore mis à jour quand onMouseDown est appelé après onMouseUp) */
  const lineDrawStartRef = useRef<{ x: number; y: number } | null>(null);
  /** Point courant de la souris pendant le tracé (pour aperçu) */
  const [lineDrawEnd, setLineDrawEnd] = useState<{ x: number; y: number } | null>(null);
  /** Ref synchrone du point courant — évite le problème de closure dans onMouseUp */
  const lineDrawEndRef = useRef<{ x: number; y: number } | null>(null);
  /**
   * Premier point de la chaîne de segments (pour le snap de fermeture).
   * Conservé entre les segments successifs jusqu'à la fermeture ou l'annulation.
   */
  const [lineChainFirstPoint, setLineChainFirstPoint] = useState<{ x: number; y: number } | null>(null);
  /** IDs des segments déjà tracés dans la chaîne courante (pour groupage éventuel) */
  const lineChainSegmentIdsRef = useRef<string[]>([]);
  /** Couleur du prochain segment de ligne à tracer (contrôlé par le panneau Assemblage) */
  const [lineDrawColor, setLineDrawColor] = useState<string>('#000000');
  /** Épaisseur du trait de ligne en px (1–5) */
  const [lineDrawStrokeWidth, setLineDrawStrokeWidth] = useState<number>(0.5);
  /**
   * Active/désactive l'éditeur de segments selon la sélection courante.
   * Formes exclues : round, oval, heart, star, puzzle (courbes non-polygonales).
   */
  // 'line' est exclu : elle n'a pas de segments polygonaux (2 points seulement)
  // => l'arrondi est géré séparément via le rendu SVG avec courbe de Bézier
  const EXCLUDED_SHAPES_FROM_EDITOR = ['round', 'oval', 'heart', 'star', 'puzzle', 'line'];
  useEffect(() => {
    if (!selectedElementId) {
      setSegmentEditorElementId(null);
      setSegmentsRounded(false);
      setIsNodeEditMode(false);
      setSelectedSegmentIndex(null);
      return;
    }
    const el = canvasElements.find(e => e.id === selectedElementId);
    if (!el || el.type !== 'shape' || EXCLUDED_SHAPES_FROM_EDITOR.includes(el.shape || 'rect')) {
      setSegmentEditorElementId(null);
      setSegmentsRounded(false);
      setIsNodeEditMode(false);
      setSelectedSegmentIndex(null);
      return;
    }
    // Si c'est un nouvel élément, réinitialiser la sélection de segment
    setSegmentEditorElementId(prev => {
      if (prev !== el.id) { setSelectedSegmentIndex(null); setRoundIntensity(35); }
      return el.id;
    });
    // Détecter si la forme a déjà un customPath avec des segments arrondis (type Q)
    if (el.customPath) {
      const segs = buildShapeSegments(el);
      setSegmentsRounded(segs ? segs.some(s => s.type === 'Q') : false);
    } else {
      setSegmentsRounded(false);
    }
  }, [selectedElementId, canvasElements]);

  /**
   * Finalise une chaîne de segments de ligne en leur assignant un groupId commun.
   * À appeler juste avant de réinitialiser lineChainSegmentIdsRef.
   * Si la chaîne ne contient qu'un seul segment, aucun groupe n'est créé.
   */
  const finalizeLineChain = useCallback(() => {
    const ids = lineChainSegmentIdsRef.current;
    if (ids.length < 2) return; // Pas de groupe pour un segment isolé
    const chainGroupId = `line-chain-${Date.now()}`;
    setCanvasElements(prev =>
      prev.map(el => ids.includes(el.id) ? { ...el, groupId: chainGroupId } : el)
    );
  }, []);

  // Mémorisation des derniers paramètres du passe-partout appliqué (pour remplacement partiel)
  const lastPassePartoutParamsRef = useRef<PassePartoutData | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null); // ID de l'élément texte en cours d'édition inline
  // États pour les découpes interactives (passe-partout nouvelle génération)
  const [activeOpeningId, setActiveOpeningId] = useState<string | null>(null); // ID de la découpe en cours de positionnement
  const openingCounterRef = useRef<number>(0); // Compteur pour numéroter les découpes
  
  // État pour le survol des vignettes (affichage en portail)
  const [hoveredThumbnail, setHoveredThumbnail] = useState<{
    src: string;
    name: string;
    rect: DOMRect;
    type: 'collector' | 'basket';
  } | null>(null);
  
  // Fermer automatiquement le survol après 3 secondes ou au scroll/clic
  useEffect(() => {
    if (!hoveredThumbnail) return;
    
    // Fermer après 3 secondes
    const timeout = setTimeout(() => {
      setHoveredThumbnail(null);
    }, 3000);
    
    // Fermer au scroll ou clic n'importe où
    const handleClose = () => setHoveredThumbnail(null);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('click', handleClose, true);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('click', handleClose, true);
    };
  }, [hoveredThumbnail]);
  
  // Taille maximale du canvas - utilise tout l'espace disponible
  // La zone de travail reste FIXE, seul le contenu s'adapte au format
  const [canvasContainerSize, setCanvasContainerSize] = useState({ width: 600, height: 700 });

  
  // Mettre à jour la taille du container quand la fenêtre change
  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        // Utiliser tout l'espace disponible moins les marges pour les règles
        setCanvasContainerSize({
          width: Math.max(400, rect.width - 40),
          height: Math.max(400, rect.height - 40)
        });
      }
    };
    
    // Mise à jour initiale après le rendu
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, [isOpen]);
  
  // Charger les projets existants à l'ouverture
  // Combine les projets de creations_projects ET les albums de la catégorie "MES PROJETS CRÉATIONS"
  useEffect(() => {
    if (isOpen) {
      // Réinitialiser le canvas à chaque ouverture : l'utilisateur choisit
      // explicitement dans la modale (nouveau projet vide ou projet existant)
      setCurrentProjectId(null);
      setCurrentProjectName(language === 'fr' ? 'Nouveau projet' : 'New project');
      setCanvasElements([]);
      setCollectorItems([]);
      setSourcePhotos([]);
      setFilets([]);
      isInitialLoadRef.current = true;
      const loadProjects = async () => {
        // 1. Charger les projets de la table creations_projects
        const creationsProjects = await getAllCreationsProjects();
        console.log('[Créations] Projets de creations_projects:', creationsProjects.length);
        
        // 2. Charger les albums de la catégorie "MES PROJETS CRÉATIONS" (cat_mes_projets)
        const mesProjetsAlbums = await db.album_metas
          .where('categoryId')
          .equals('cat_mes_projets')
          .toArray();
        console.log('[Créations] Albums de MES PROJETS CRÉATIONS:', mesProjetsAlbums.length, mesProjetsAlbums);
        
        // 3. Fusionner les deux sources (éviter les doublons par ID)
        const existingIds = new Set(creationsProjects.map(p => p.id));
        
        // Convertir les albums MES PROJETS CRÉATIONS en format CreationsProject
        // Récupérer le nombre de photos depuis la table albums pour chaque album
        const albumsAsProjectsPromises = mesProjetsAlbums
          .filter(album => !existingIds.has(album.id)) // Éviter les doublons
          .map(async (album) => {
            // Récupérer les données de l'album (frames) pour avoir le nombre de photos
            const albumData = await db.albums.get(album.id);
            const photoCount = albumData?.frames?.length || 0;
            console.log(`[Créations] Album ${album.title}: ${photoCount} photos`);
            
            // Convertir les frames en format CreationsProjectPhoto pour le compteur
            // IMPORTANT: Ne garder que les frames qui ont une vraie photo (pas les cadres vides)
            const photos = (albumData?.frames || [])
              .filter(frame => frame.photoUrl || frame.url) // Exclure les cadres vides
              .map(frame => ({
                id: String(frame.id),
                photoUrl: frame.photoUrl || frame.url,
                thumbnail: frame.thumbnailUrl || frame.photoUrl || frame.url,
                photoTitle: frame.title || '',
                dateAdded: frame.createdAt || Date.now()
              }));
            
            return {
              id: album.id,
              name: album.title,
              photos: photos,
              canvasElements: [],
              createdAt: album.createdAt,
              updatedAt: albumData?.updatedAt || album.createdAt
            };
          });
        
        const albumsAsProjects: CreationsProject[] = await Promise.all(albumsAsProjectsPromises);
        
        // Combiner et trier par date de mise à jour
        const allProjects = [...creationsProjects, ...albumsAsProjects]
          .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
        
        setExistingProjects(allProjects);
        
        // Si un projectId est fourni, ne pas afficher la modale
        if (projectId) {
          setShowProjectModal(false);
          setSelectedProjectId(projectId);
          setCurrentProjectId(projectId);
        } else {
          setShowProjectModal(true);
        }
      };
      
      loadProjects();
    }
  }, [isOpen, projectId]);
  
  // Charger les photos du projet sélectionné quand l'Atelier s'ouvre
  useEffect(() => {
    const loadProjectPhotos = async () => {
      if (isOpen && currentProjectId) {
        try {
          // Charger les photos depuis l'album projet (IndexedDB)
          const albumData = await db.albums.get(currentProjectId);
          if (albumData && albumData.frames) {
            // Filtrer pour ne garder que les frames avec une photoUrl
            const photosWithUrl = albumData.frames.filter((frame: any) => frame.photoUrl);
            const projectPhotos: CollectorItem[] = photosWithUrl.map((frame: any) => ({
              id: `photo_${frame.id}`,
              type: 'photo' as const,
              src: frame.photoUrl,
              name: frame.title || 'Photo',
              thumbnail: frame.thumbnailUrl || frame.photoUrl
            }));
            setSourcePhotos(projectPhotos);
            console.log(`[Créations] ${projectPhotos.length} photos chargées depuis le projet`);
          } else {
            setSourcePhotos([]);
          }
          
          // Charger les données du canvas sauvegardées
          const creationsProject = await getCreationsProject(currentProjectId);
          if (creationsProject && creationsProject.canvasData) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const savedData = JSON.parse(creationsProject.canvasData as string) as any;
              console.log('[Créations] Données canvas chargées:', savedData);
              
              // Restaurer les éléments du canvas
              if (savedData.canvasElements && Array.isArray(savedData.canvasElements)) {
                setCanvasElements(savedData.canvasElements);
              }
              
              // Restaurer les éléments du collecteur
              if (savedData.collectorItems && Array.isArray(savedData.collectorItems)) {
                setCollectorItems(savedData.collectorItems);
              }
              
              // Restaurer le format papier
              if (savedData.paperFormat) {
                const format = PAPER_FORMATS.find(f => f.id === savedData.paperFormat);
                if (format) {
                  if (format.id === 'custom' && savedData.customWidth && savedData.customHeight) {
                    // Restaurer les dimensions personnalisées
                    const cw = Number(savedData.customWidth);
                    const ch = Number(savedData.customHeight);
                    setCustomWidth(cw);
                    setCustomHeight(ch);
                    setCustomWidthText(String(cw));
                    setCustomHeightText(String(ch));
                    setPaperFormat({ ...format, width: cw, height: ch });
                  } else {
                    setPaperFormat(format);
                  }
                }
              }
              
              // Restaurer l'orientation
              if (savedData.orientation) {
                setOrientation(savedData.orientation);
              }
              
              // Restaurer le zoom
              if (savedData.imageZoom) {
                setImageZoom(savedData.imageZoom);
              }
              
              // Restaurer les photos sources depuis les données sauvegardées
              if (savedData.sourcePhotos && Array.isArray(savedData.sourcePhotos)) {
                setSourcePhotos(savedData.sourcePhotos);
                console.log('[Créations] Photos sources restaurées:', savedData.sourcePhotos.length);
              } else if (creationsProject.photos && creationsProject.photos.length > 0) {
                // Fallback: charger depuis le champ photos du projet
                const projectPhotos: CollectorItem[] = creationsProject.photos.map(photo => ({
                  id: String(photo.id ?? Date.now()),
                  type: 'photo' as const,
                  src: String(photo.photoUrl ?? ''),
                  name: photo.photoTitle || 'Photo',
                  thumbnail: photo.thumbnail ?? photo.photoUrl ?? undefined
                }));
                setSourcePhotos(projectPhotos);
                console.log('[Créations] Photos sources chargées depuis projet:', projectPhotos.length);
              }
              
              toast.info(language === "fr" ? "Projet chargé" : "Project loaded");
            } catch (parseError) {
              console.error('Erreur lors du parsing des données canvas:', parseError);
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement des photos du projet:', error);
          setSourcePhotos([]);
        }
      } else if (isOpen && !currentProjectId) {
        // Pas de projet sélectionné, réinitialiser
        setSourcePhotos([]);
      }
    };
    
    loadProjectPhotos();
  }, [isOpen, currentProjectId, language]);
  
  // Raccourcis clavier : Ctrl+A (tout sélectionner), Delete (supprimer sélection), Escape (désélectionner)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A : tout sélectionner
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Ne pas intercepter si on est dans un input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        const allIds = new Set(canvasElements.filter(el => !el.locked).map(el => el.id));
        setSelectedElementIds(allIds);
        if (canvasElements.length > 0) {
          setSelectedElementId(canvasElements[canvasElements.length - 1].id);
        }
        toast.info(language === 'fr' 
          ? `${allIds.size} élément(s) sélectionné(s)` 
          : `${allIds.size} element(s) selected`);
      }
      
      // Delete ou Backspace : supprimer les éléments sélectionnés
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (selectedElementIds.size > 0) {
          e.preventDefault();
          const count = selectedElementIds.size;
          setCanvasElements(prev => prev.filter(el => !selectedElementIds.has(el.id)));
          setSelectedElementIds(new Set());
          setSelectedElementId(null);
          setActiveCanvasPhoto(null);
          toast.info(language === 'fr' 
            ? `${count} élément(s) supprimé(s)` 
            : `${count} element(s) deleted`);
        }
      }
      
      // Escape : quitter le mode tracé de ligne ou désélectionner tout
      if (e.key === 'Escape') {
        if (isNodeEditMode) {
          setIsNodeEditMode(false);
          setSelectedSegmentIndex(null);
          return;
        }
        if (isLineDrawMode) {
          // Quitter le mode ligne et réinitialiser la chaîne
          lineDrawStartRef.current = null;
          lineDrawEndRef.current = null;
          setIsLineDrawMode(false);
          setLineDrawStart(null);
          setLineDrawEnd(null);
          setLineChainFirstPoint(null);
          finalizeLineChain();
          lineChainSegmentIdsRef.current = [];
          return;
        }
        if (selectedElementIds.size > 0) {
          setSelectedElementIds(new Set());
          setSelectedElementId(null);
          setActiveCanvasPhoto(null);
        }
      }
      
      // Ctrl+G : grouper les éléments sélectionnés
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'g') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        if (selectedElementIds.size >= 2) {
          const groupId = `group-${Date.now()}`;
          setCanvasElements(prev => prev.map(el => 
            selectedElementIds.has(el.id) ? { ...el, groupId } : el
          ));
          toast.success(language === 'fr' ? `${selectedElementIds.size} éléments groupés` : `${selectedElementIds.size} elements grouped`);
        }
      }
      
      // Ctrl+Shift+G : dégrouper les éléments sélectionnés
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        const groupIds = new Set<string>();
        canvasElements.forEach(el => {
          if (selectedElementIds.has(el.id) && el.groupId) groupIds.add(el.groupId);
        });
        if (groupIds.size > 0) {
          setCanvasElements(prev => prev.map(el => 
            el.groupId && groupIds.has(el.groupId) ? { ...el, groupId: undefined } : el
          ));
          toast.success(language === 'fr' ? 'Groupe(s) dégroupé(s)' : 'Group(s) ungrouped');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canvasElements, selectedElementIds, language]);
  
  // Marquer la fin du chargement initial après un délai
  useEffect(() => {
    if (isOpen && currentProjectId) {
      // Attendre que le chargement initial soit terminé avant d'activer l'auto-save
      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
        console.log('[AutoSave] Chargement initial terminé, auto-save activé');
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      isInitialLoadRef.current = true;
    }
  }, [isOpen, currentProjectId]);
  
  // Sauvegarde automatique (debounced) - se déclenche à chaque modification du canvas
  useEffect(() => {
    // Ne pas sauvegarder pendant le chargement initial ou si pas de projet
    if (isInitialLoadRef.current || !currentProjectId || !isOpen || showProjectModal) {
      return;
    }
    
    // Annuler le timer précédent
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Déclencher la sauvegarde après 1.5 secondes d'inactivité
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        const targetProjectId = currentProjectId;
        
        // Préparer les données du canvas
        const canvasData = JSON.stringify({
          canvasElements,
          collectorItems,
          sourcePhotos,
          paperFormat: paperFormat.id,
          // Sauvegarder les dimensions personnalisées pour la restauration
          ...(paperFormat.id === 'custom' ? { customWidth, customHeight } : {}),
          orientation,
          imageZoom,
        });
        
        // Combiner sourcePhotos + canvasElements pour le compteur
        const allPhotosForCount = [
          ...sourcePhotos.map(photo => ({
            id: photo.id,
            photoUrl: photo.src,
            thumbnail: photo.thumbnail,
            photoTitle: photo.name,
            dateAdded: Date.now()
          })),
          ...canvasElements
            .filter((el): el is CanvasElement & { src: string } => !!el.src && !sourcePhotos.some(sp => sp.src === el.src))
            .map(el => ({
              id: el.id,
              photoUrl: el.src,
              thumbnail: el.src,
              photoTitle: el.name || 'Photo',
              dateAdded: Date.now()
            }))
        ];
        
        // Sauvegarder dans IndexedDB
        const existingProject = await getCreationsProject(targetProjectId);
        if (existingProject) {
          existingProject.canvasData = canvasData;
          existingProject.photos = allPhotosForCount;
          await updateCreationsProject(existingProject);
        } else {
          // Créer le projet s'il n'existe pas encore
          const newProject = await createCreationsProject(currentProjectName, targetProjectId);
          newProject.canvasData = canvasData;
          newProject.photos = allPhotosForCount;
          await updateCreationsProject(newProject);
        }
        
        autoSaveCounterRef.current += 1;
        console.log(`[AutoSave] Sauvegarde auto #${autoSaveCounterRef.current} effectuée pour le projet ${targetProjectId}`);
        lastSavedDataRef.current = canvasData;
        setHasUnsavedChanges(false);
        setAutoSaveStatus('saved');
        
        // Réinitialiser le statut après 3 secondes
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('[AutoSave] Erreur:', error);
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 5000);
      }
    }, 1500);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [canvasElements, collectorItems, sourcePhotos, paperFormat, orientation, imageZoom, currentProjectId, isOpen, showProjectModal, currentProjectName]);
  
  // Détecter les modifications non sauvegardées
  useEffect(() => {
    if (isInitialLoadRef.current || !currentProjectId || !isOpen) return;
    const currentData = JSON.stringify({ canvasElements, collectorItems, sourcePhotos, paperFormat: paperFormat.id, ...(paperFormat.id === 'custom' ? { customWidth, customHeight } : {}), orientation, imageZoom });
    if (lastSavedDataRef.current && currentData !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [canvasElements, collectorItems, sourcePhotos, paperFormat, orientation, imageZoom, currentProjectId, isOpen]);
  
  // Intercepter la fermeture du navigateur si modifications non sauvegardées
  useEffect(() => {
    if (!hasUnsavedChanges || !isOpen) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isOpen]);
  
  // Ref pour accéder aux éléments canvas courants sans les mettre dans les dépendances du useEffect.
  // Cela évite que le useEffect se re-déclenche à chaque re-render du parent.
  const canvasElementsRef = useRef(canvasElements);
  useEffect(() => { canvasElementsRef.current = canvasElements; });
  // IDs stables des éléments image sur le canvas (primitif string, stable comme dépendance).
  // Quand onDuplicateElement remplace l'élément original par des copies, les IDs changent
  // et le useEffect alpha tracing doit se re-déclencher pour calculer les paths des copies.
  // IMPORTANT : useMemo garantit que la string ne change de référence que si les IDs changent
  // réellement. Sans useMemo, la string est recalculée à chaque render (même valeur, nouvelle
  // référence) ce qui invalide stableCanvasImageElements et fait clignoter le toggle d.
  const canvasImageIds = useMemo(
    () => canvasElements
      .filter(el => el.type === 'image' && el.src)
      .map(el => el.id)
      .join(','),
    [canvasElements]
  );

  // Prop stable pour AssemblagePanel : ne change de référence que si les éléments image changent.
  // Évite que AssemblagePanel se re-rende à chaque re-render du parent (ex: setStickerContourPaths).
  const stableCanvasImageElements = useMemo(() => canvasElements
    .filter(el => el.type === 'image' && el.src)
    .map(el => ({
      id: el.id,
      name: el.name,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [canvasImageIds]);

  // Callback stable pour AssemblagePanel : ne change pas de référence à chaque rendu.
  // Cela empêche syncOverlay d'être recréé inutilement dans AssemblagePanel.
  const stableOnStickerOverlayChange = useCallback((overlay: { elementId: string; offsetMm: number; showCropMarks: boolean; gaussPasses?: number } | null) => {
    setStickerOverlay(overlay ? { elementId: overlay.elementId, offsetMm: overlay.offsetMm, gaussPasses: overlay.gaussPasses ?? 3 } : null);
  }, []);

  // Alpha tracingg : calcule le path SVG de la silhouette réelle de chaque sticker
  // quand stickerOverlay est actif.
  // IMPORTANT : les paths sont stockés en coordonnées NORMALISÉES (0..1 relatif à l'élément).
  // La conversion en px canvas se fait au moment du rendu SVG avec le pxPerCm courant.
  // Cela évite que le path devienne invalide si le zoom change entre le calcul et le rendu.
  useEffect(() => {
    if (!stickerOverlay) {
      setStickerContourPaths({});
      return;
    }
    let cancelled = false;
    // Snapshot des éléments au moment du déclenchement (via ref stable).
    const stickerEls = canvasElementsRef.current.filter(el => el.type === 'image' && el.src);
    if (stickerEls.length === 0) return;

    // Détecter si le changement vient d'elementId/offsetMm (reset complet)
    // ou uniquement de canvasImageIds (nouvelles copies — recalcul partiel).
    const overlayKey = `${stickerOverlay.elementId}|${stickerOverlay.offsetMm}|${stickerOverlay.gaussPasses}`;
    const isOverlayChange = prevOverlayKeyRef.current !== overlayKey;
    prevOverlayKeyRef.current = overlayKey;
    if (isOverlayChange) {
      // Reset complet : l'overlay ou l'offset a changé, tous les paths doivent être recalculés.
      setStickerContourPaths({});
      stickerContourPathsRef.current = {};
    }
    /**
     * Construit le path SVG du contour de silhouette réelle de l'image.
     *
     * Algorithme :
     * 1. Dessiner l'image dans un canvas 2D hors-écran (64×64 px).
     * 2. Dilater le masque alpha de `dilateR` pixels (morphologie).
     * 3. Extraire le contour avec un edge tracing simplifié (marche de bord).
     * 4. Convertir les coordonnées pixel en coordonnées NORMALISÉES (0..1 relatif à l'élément).
     * 5. Lisser le polygone avec des courbes de Bézier cubiques.
     *
     * Retourne null si l'image ne peut pas être analysée.
     */
    const buildContourPath = (
      el: CanvasElement,
      pxPerCm: number,
      offsetPx: number,
      imgSrc: string,
      gaussPasses: number = 3
    ): Promise<string | null> => {
      // Résolution 128×128 pour capturer plus de détails de la silhouette
      const ANALYSIS_W = 128;
      const ANALYSIS_H = 128;
      const ALPHA_THRESHOLD = 30;

      const analyze = (img: HTMLImageElement): string | null => {
        try {
          // Étape 1 : dessiner l'image dans un canvas hors-écran
          const c = document.createElement('canvas');
          c.width = ANALYSIS_W;
          c.height = ANALYSIS_H;
          const ctx = c.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(img, 0, 0, ANALYSIS_W, ANALYSIS_H);
          const { data } = ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H);

          // Détecter si l'image a un canal alpha réel (PNG détouré) ou non (JPEG).
          // Pour un JPEG, tous les pixels ont alpha=255 → le masque alpha couvre tout le canvas
          // → le contour serait le périmètre rectangulaire de l'image.
          // Dans ce cas, on utilise un flood fill depuis les 4 coins pour détecter le fond.
          let hasRealAlpha = false;
          for (let i = 0; i < ANALYSIS_W * ANALYSIS_H; i++) {
            if (data[i * 4 + 3] < 200) { hasRealAlpha = true; break; }
          }

          // Masque binaire (1 = opaque/sujet, 0 = transparent/fond)
          const mask = new Uint8Array(ANALYSIS_W * ANALYSIS_H);

          if (hasRealAlpha) {
            // Image PNG détourée : utiliser le canal alpha directement
            for (let i = 0; i < ANALYSIS_W * ANALYSIS_H; i++) {
              mask[i] = data[i * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0;
            }
          } else {
            // Image JPEG (ou PNG sans transparence) : détecter le fond par flood fill
            // depuis tout le périmètre de l'image (pas seulement les 4 coins, car le
            // sujet peut toucher les coins et fausser la couleur de référence).
            //
            // Stratégie :
            // 1. Collecter tous les pixels du périmètre.
            // 2. Calculer la médiane de leurs composantes R, G, B comme couleur de fond.
            // 3. Flood fill BFS depuis les pixels du périmètre proches de la médiane.
            // 4. Si le masque résultant est trivial (>90% sujet), fallback luminosité.

            const COLOR_TOLERANCE = 60;

            // Étape 1 : collecter les pixels du périmètre complet
            const perimeterIndices: number[] = [];
            for (let x = 0; x < ANALYSIS_W; x++) {
              perimeterIndices.push(x);                                     // ligne du haut
              perimeterIndices.push((ANALYSIS_H - 1) * ANALYSIS_W + x);   // ligne du bas
            }
            for (let y = 1; y < ANALYSIS_H - 1; y++) {
              perimeterIndices.push(y * ANALYSIS_W);                        // colonne gauche
              perimeterIndices.push(y * ANALYSIS_W + (ANALYSIS_W - 1));    // colonne droite
            }

            // Étape 2 : médiane des composantes R, G, B du périmètre
            const pR: number[] = [], pG: number[] = [], pB: number[] = [];
            for (const idx of perimeterIndices) {
              pR.push(data[idx * 4]);
              pG.push(data[idx * 4 + 1]);
              pB.push(data[idx * 4 + 2]);
            }
            const medianVal = (arr: number[]) => {
              const s = [...arr].sort((a, b) => a - b);
              return s[Math.floor(s.length / 2)];
            };
            const bgR = medianVal(pR);
            const bgG = medianVal(pG);
            const bgB = medianVal(pB);

            // Étape 3 : flood fill BFS depuis les pixels du périmètre proches du fond
            mask.fill(1); // tout est sujet par défaut
            const visited = new Uint8Array(ANALYSIS_W * ANALYSIS_H);
            const queue: number[] = [];
            for (const idx of perimeterIndices) {
              if (visited[idx]) continue;
              const dr = data[idx * 4] - bgR;
              const dg = data[idx * 4 + 1] - bgG;
              const db = data[idx * 4 + 2] - bgB;
              if (Math.sqrt(dr * dr + dg * dg + db * db) < COLOR_TOLERANCE) {
                visited[idx] = 1;
                mask[idx] = 0;
                queue.push(idx);
              }
            }
            while (queue.length > 0) {
              const idx = queue.shift()!;
              const px2 = idx % ANALYSIS_W;
              const py2 = Math.floor(idx / ANALYSIS_W);
              const neighbors = [
                py2 > 0 ? idx - ANALYSIS_W : -1,
                py2 < ANALYSIS_H - 1 ? idx + ANALYSIS_W : -1,
                px2 > 0 ? idx - 1 : -1,
                px2 < ANALYSIS_W - 1 ? idx + 1 : -1,
              ];
              for (const nIdx of neighbors) {
                if (nIdx < 0 || visited[nIdx]) continue;
                const dr = data[nIdx * 4] - bgR;
                const dg = data[nIdx * 4 + 1] - bgG;
                const db = data[nIdx * 4 + 2] - bgB;
                if (Math.sqrt(dr * dr + dg * dg + db * db) < COLOR_TOLERANCE) {
                  visited[nIdx] = 1;
                  mask[nIdx] = 0;
                  queue.push(nIdx);
                }
              }
            }

            // Étape 4 : vérifier que le masque n'est pas trivial.
            // Si >90% des pixels sont "sujet", le flood fill a échoué → fallback luminosité.
            let subjectCount = 0;
            for (let i = 0; i < mask.length; i++) { if (mask[i]) subjectCount++; }
            if (subjectCount > mask.length * 0.9) {
              // Fallback : seuillage par luminosité relative au fond.
              // On suppose que le fond est plus clair que le sujet (cas fréquent).
              const luma = new Float32Array(ANALYSIS_W * ANALYSIS_H);
              for (let i = 0; i < ANALYSIS_W * ANALYSIS_H; i++) {
                luma[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
              }
              const perimLuma = perimeterIndices.map(i => luma[i]).sort((a, b) => a - b);
              const bgLuma = perimLuma[Math.floor(perimLuma.length / 2)];
              const LUMA_THRESHOLD = 30;
              for (let i = 0; i < ANALYSIS_W * ANALYSIS_H; i++) {
                mask[i] = Math.abs(luma[i] - bgLuma) > LUMA_THRESHOLD ? 1 : 0;
              }
            }
          }

          // Étape 2 : dilater le masque de dilateR pixels (approximation disque)
          const dilateR = Math.max(1, Math.round(offsetPx / ((el.width * pxPerCm) / ANALYSIS_W)));
          const dilated = new Uint8Array(ANALYSIS_W * ANALYSIS_H);
          for (let y = 0; y < ANALYSIS_H; y++) {
            for (let x = 0; x < ANALYSIS_W; x++) {
              if (mask[y * ANALYSIS_W + x]) { dilated[y * ANALYSIS_W + x] = 1; continue; }
              outer: for (let dy = -dilateR; dy <= dilateR; dy++) {
                for (let dx = -dilateR; dx <= dilateR; dx++) {
                  if (dx * dx + dy * dy > dilateR * dilateR) continue;
                  const nx = x + dx, ny = y + dy;
                  if (nx >= 0 && nx < ANALYSIS_W && ny >= 0 && ny < ANALYSIS_H && mask[ny * ANALYSIS_W + nx]) {
                    dilated[y * ANALYSIS_W + x] = 1;
                    break outer;
                  }
                }
              }
            }
          }

          // Vérifier qu'il y a des pixels opaques
          let hasOpaque = false;
          for (let i = 0; i < dilated.length; i++) { if (dilated[i]) { hasOpaque = true; break; } }
          if (!hasOpaque) return null;

          // Étape 3 : extraire le contour par Moore neighborhood tracing (8-connexe).
          // Algorithme : Jacob's stopping criterion — on s'arrête quand on revient
          // au pixel de départ ET qu'on arrive depuis la même direction qu'au départ.
          const isOpaque = (x: number, y: number) =>
            x >= 0 && x < ANALYSIS_W && y >= 0 && y < ANALYSIS_H && dilated[y * ANALYSIS_W + x] === 1;

          // 8 directions dans l'ordre horaire : E, SE, S, SW, W, NW, N, NE
          const DX8 = [1, 1, 0, -1, -1, -1, 0, 1];
          const DY8 = [0, 1, 1, 1, 0, -1, -1, -1];

          // Trouver le point de départ : premier pixel opaque en scan ligne par ligne
          let startX = -1, startY = -1;
          outer2: for (let y = 0; y < ANALYSIS_H; y++) {
            for (let x = 0; x < ANALYSIS_W; x++) {
              if (isOpaque(x, y)) { startX = x; startY = y; break outer2; }
            }
          }
          if (startX < 0) return null;

          // Moore neighborhood tracing avec critère d'arrêt de Jacob
          // dir = index dans DX8/DY8 (direction depuis laquelle on est arrivé au pixel courant)
          // On commence en regardant vers l'ouest (dir=4) depuis le pixel de départ.
          const contourPts: Array<[number, number]> = [];
          let cx2 = startX, cy2 = startY;
          // Direction de départ : on cherche depuis l'ouest (le pixel à gauche est vide)
          let startDir = 4; // ouest
          const MAX_STEPS = ANALYSIS_W * ANALYSIS_H * 2;
          let step = 0;
          // Premier tour : trouver le premier voisin opaque depuis startDir
          let firstDir = -1;
          for (let k = 0; k < 8; k++) {
            const nd = (startDir + k) % 8;
            if (isOpaque(cx2 + DX8[nd], cy2 + DY8[nd])) { firstDir = nd; break; }
          }
          if (firstDir < 0) {
            // Pixel isolé — utiliser le fallback bbox
            contourPts.length = 0;
          } else {
            contourPts.push([cx2, cy2]);
            let dir = firstDir;
            cx2 += DX8[dir]; cy2 += DY8[dir];
            // Direction d'entrée = opposé de la direction de déplacement
            let entryDir = (dir + 4) % 8;
            while (step < MAX_STEPS) {
              contourPts.push([cx2, cy2]);
              // Chercher le prochain voisin opaque en tournant depuis (entryDir + 1) % 8
              let found = false;
              for (let k = 1; k <= 8; k++) {
                const nd = (entryDir + k) % 8;
                const nx = cx2 + DX8[nd], ny = cy2 + DY8[nd];
                if (isOpaque(nx, ny)) {
                  dir = nd;
                  cx2 = nx; cy2 = ny;
                  entryDir = (dir + 4) % 8;
                  found = true;
                  break;
                }
              }
              if (!found) break; // pixel isolé
              // Critère d'arrêt : retour au point de départ depuis la même direction
              if (cx2 === startX && cy2 === startY && contourPts.length > 4) break;
              step++;
            }
          }

          if (contourPts.length < 3) {
            // Fallback bbox si le contour est trop petit.
            // Coordonnées NORMALISÉES (0..1 relatif à l'élément).
            let minX2 = ANALYSIS_W, maxX2 = 0, minY2 = ANALYSIS_H, maxY2 = 0;
            for (let y = 0; y < ANALYSIS_H; y++) for (let x = 0; x < ANALYSIS_W; x++) {
              if (dilated[y * ANALYSIS_W + x]) {
                if (x < minX2) minX2 = x; if (x > maxX2) maxX2 = x;
                if (y < minY2) minY2 = y; if (y > maxY2) maxY2 = y;
              }
            }
            // Normaliser en 0..1
            const bx = minX2 / ANALYSIS_W;
            const by = minY2 / ANALYSIS_H;
            const bw = (maxX2 - minX2 + 1) / ANALYSIS_W;
            const bh = (maxY2 - minY2 + 1) / ANALYSIS_H;
            // Rayon arrondi en coordonnées normalisées
            const rr2 = Math.min(offsetPx / (el.width * pxPerCm), bw * 0.4, bh * 0.4);
            return `M${(bx+rr2).toFixed(4)},${by.toFixed(4)} H${(bx+bw-rr2).toFixed(4)} Q${(bx+bw).toFixed(4)},${by.toFixed(4)} ${(bx+bw).toFixed(4)},${(by+rr2).toFixed(4)} V${(by+bh-rr2).toFixed(4)} Q${(bx+bw).toFixed(4)},${(by+bh).toFixed(4)} ${(bx+bw-rr2).toFixed(4)},${(by+bh).toFixed(4)} H${(bx+rr2).toFixed(4)} Q${bx.toFixed(4)},${(by+bh).toFixed(4)} ${bx.toFixed(4)},${(by+bh-rr2).toFixed(4)} V${(by+rr2).toFixed(4)} Q${bx.toFixed(4)},${by.toFixed(4)} ${(bx+rr2).toFixed(4)},${by.toFixed(4)} Z`;
          }

            // Étape 4 : convertir les coordonnées pixel en coordonnées NORMALISÉES (0..1 relatif à l'élément).
          // On ne stocke PAS les coordonnées px absolues car pxPerCm peut changer (zoom).
          // La conversion en px se fait au moment du rendu SVG.
          // Décimer le contour : garder au maximum 120 points pour un rendu fluide
          // sans surcharger le SVG. Avec ANALYSIS_W=128, le périmètre peut atteindre
          // ~400 points — on en conserve 120 pour un bon équilibre précision/fluidité.
          const DECIMATE = Math.max(1, Math.floor(contourPts.length / 120));
          const rawPts = contourPts
            .filter((_, i) => i % DECIMATE === 0)
            .map(([px, py]) => ([px / ANALYSIS_W, py / ANALYSIS_H] as [number, number]));
          if (rawPts.length < 3) return null;

          // Lissage gaussien des coordonnées normalisées (3 passes, noyau [0.25, 0.5, 0.25])
          // Réduit les micro-irrégularités du contour pixelisé avant la conversion Bézier.
          const smooth = (arr: Array<[number, number]>, passes: number): Array<[number, number]> => {
            let cur = arr;
            for (let p = 0; p < passes; p++) {
              const m = cur.length;
              cur = cur.map((_, i) => [
                cur[(i - 1 + m) % m][0] * 0.25 + cur[i][0] * 0.5 + cur[(i + 1) % m][0] * 0.25,
                cur[(i - 1 + m) % m][1] * 0.25 + cur[i][1] * 0.5 + cur[(i + 1) % m][1] * 0.25,
              ] as [number, number]);
            }
            return cur;
          };
          const pts = smooth(rawPts, gaussPasses);

          // Étape 5 : générer un path SVG lissé avec courbes de Bézier cubiques (Catmull-Rom → Bézier).
          // Tension t=0.5 (Catmull-Rom centripète) donne des courbes plus douces que t=0.4.
          // Les coordonnées sont normalisées (0..1). Le rendu les multipliera par pxPerCm * el.width/height.
          const n = pts.length;
          const pathParts: string[] = [`M${pts[0][0].toFixed(4)},${pts[0][1].toFixed(4)}`];
          for (let i = 0; i < n; i++) {
            const p0 = pts[(i - 1 + n) % n];
            const p1 = pts[i];
            const p2 = pts[(i + 1) % n];
            const p3 = pts[(i + 2) % n];
            // Tension Catmull-Rom → Bézier (t=0.5 : lissage optimal)
            const t = 0.5;
            const cp1x = p1[0] + (p2[0] - p0[0]) * t;
            const cp1y = p1[1] + (p2[1] - p0[1]) * t;
            const cp2x = p2[0] - (p3[0] - p1[0]) * t;
            const cp2y = p2[1] - (p3[1] - p1[1]) * t;
            pathParts.push(`C${cp1x.toFixed(4)},${cp1y.toFixed(4)} ${cp2x.toFixed(4)},${cp2y.toFixed(4)} ${p2[0].toFixed(4)},${p2[1].toFixed(4)}`);
          }
          pathParts.push('Z');
          return pathParts.join(' ');
        } catch {
          return null;
        }
      };

      /**
       * Charge l'image de manière à permettre la lecture des pixels (getImageData).
       *
       * Stratégie par ordre de priorité :
       * 1. Si l'image est une data URL (déjà en base64) : charger directement.
       * 2. Si l'image est une URL HTTP (ex: S3) : passer par le proxy serveur
       *    /api/proxy-image pour obtenir une data URL sans problème CORS.
       * 3. Fallback : charger directement avec crossOrigin='anonymous'.
       */
      const loadImageForAnalysis = (src: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          const loadImg = (imgSrc: string, withCORS: boolean) => {
            const img = new window.Image();
            if (withCORS) img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = imgSrc;
          };

          if (src.startsWith('data:')) {
            // Data URL : pas de problème CORS
            loadImg(src, false);
          } else if (src.startsWith('http')) {
            // URL externe : utiliser le proxy pour éviter le canvas tainté
            fetch(`/api/proxy-image?url=${encodeURIComponent(src)}`)
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                if (data?.dataUrl) {
                  loadImg(data.dataUrl, false);
                } else {
                  // Fallback direct avec CORS
                  loadImg(src, true);
                }
              })
              .catch(() => loadImg(src, true));
          } else {
            loadImg(src, true);
          }
        });
      };

      return loadImageForAnalysis(imgSrc).then(img => {
        if (!img) return null;
        return analyze(img);
      });
    };

    // Lancer l'analyse pour tous les stickers.
    // offsetPx est calculé avec une référence de 1cm = 50px (référence fixe).
    // Le rendu SVG convertira les coordonnées normalisées en px avec le pxPerCm courant.
    // Cela évite que le path soit invalide si le zoom change entre le calcul et le rendu.
    const REF_PX_PER_CM = 50; // référence fixe pour le calcul de dilateR
    const offsetPx = (stickerOverlay.offsetMm / 10) * REF_PX_PER_CM;

    // Optimisation : ne recalculer que les IDs manquants dans stickerContourPaths.
    // Cela évite de relancer l'alpha tracing lors des auto-saves (qui reconstruisent
    // canvasElements avec les mêmes IDs, déclenchant canvasImageIds sans changement réel).
    // Les IDs manquants correspondent aux copies créées par onDuplicateElement.
    // On lit l'état courant via la ref (stable) pour éviter de créer une dépendance.
    const currentPaths = stickerContourPathsRef.current;
    const missingEls = stickerEls.filter(el => !(el.id in currentPaths));
    if (missingEls.length === 0) return; // rien à recalculer
    Promise.all(
      missingEls.map(el =>
        buildContourPath(el, REF_PX_PER_CM, offsetPx, el.src!, stickerOverlay.gaussPasses).then(path => ({ id: el.id, path }))
      )
    ).then(results => {
      if (cancelled) return;
      setStickerContourPaths(current => {
        const updated = { ...current };
        results.forEach(({ id, path }) => { updated[id] = path; });
        return updated;
      });
    });
    return () => { cancelled = true; };
  // canvasElementsRef.current est lu via ref (stable) — pas besoin dans les dépendances.
  // canvasImageIds est inclus pour détecter les nouvelles copies créées par onDuplicateElement
  // (Nb stickers > 1). Le useEffect ne recalcule que les IDs manquants dans stickerContourPaths
  // pour éviter les recalculs inutiles lors des auto-saves (les IDs existants sont conservés).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickerOverlay?.elementId, stickerOverlay?.offsetMm, stickerOverlay?.gaussPasses, canvasImageIds]);

  // Fonction pour demander la fermeture
  // La boîte de confirmation n'est affichée que si l'utilisateur a des modifications
  // non sauvegardées ET qu'un projet est actif (targetProjectId défini).
  const handleRequestClose = () => {
    if (hasUnsavedChanges && currentProjectId) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  // Lancer le flux "Nouveau projet depuis la barre du bas"
  const handleNewProjectFromBar = () => {
    // Demander si l'utilisateur veut sauvegarder avant de créer un nouveau projet
    setShowSaveBeforeNew(true);
  };
  
  // Sauvegarder et quitter
  const handleSaveAndClose = async () => {
    try {
      setAutoSaveStatus('saving');
      const canvasData = JSON.stringify({ canvasElements, collectorItems, sourcePhotos, paperFormat: paperFormat.id, ...(paperFormat.id === 'custom' ? { customWidth, customHeight } : {}), orientation, imageZoom });
      const allPhotosForCount = [
        ...sourcePhotos.map(photo => ({ id: photo.id, photoUrl: photo.src, thumbnail: photo.thumbnail, photoTitle: photo.name, dateAdded: Date.now() })),
        ...canvasElements.filter((el): el is CanvasElement & { src: string } => !!el.src && !sourcePhotos.some(sp => sp.src === el.src)).map(el => ({ id: el.id, photoUrl: el.src, thumbnail: el.src, photoTitle: el.name || 'Photo', dateAdded: Date.now() }))
      ];
      if (currentProjectId) {
        const existingProject = await getCreationsProject(currentProjectId);
        if (existingProject) {
          existingProject.canvasData = canvasData;
          existingProject.photos = allPhotosForCount;
          await updateCreationsProject(existingProject);
        }
      }
      lastSavedDataRef.current = canvasData;
      setHasUnsavedChanges(false);
      setAutoSaveStatus('saved');
      toast.success(language === 'fr' ? 'Projet sauvegardé' : 'Project saved');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(language === 'fr' ? 'Erreur de sauvegarde' : 'Save error');
    }
    setShowExitConfirm(false);
    onClose();
  };
  
  // === GROUPEMENT D'ÉLÉMENTS ===
  
  // Grouper les éléments sélectionnés
  const handleGroupElements = () => {
    if (selectedElementIds.size < 2) {
      toast.info(language === 'fr' ? 'Sélectionnez au moins 2 éléments pour grouper' : 'Select at least 2 elements to group');
      return;
    }
    const groupId = `group-${Date.now()}`;
    setCanvasElements(prev => prev.map(el => 
      selectedElementIds.has(el.id) ? { ...el, groupId } : el
    ));
    toast.success(language === 'fr' ? `${selectedElementIds.size} éléments groupés` : `${selectedElementIds.size} elements grouped`);
  };
  
  // Dégrouper les éléments du groupe sélectionné
  const handleUngroupElements = () => {
    // Trouver les groupIds des éléments sélectionnés
    const groupIds = new Set<string>();
    canvasElements.forEach(el => {
      if (selectedElementIds.has(el.id) && el.groupId) {
        groupIds.add(el.groupId);
      }
    });
    if (groupIds.size === 0) {
      toast.info(language === 'fr' ? 'Aucun groupe à dégrouper' : 'No group to ungroup');
      return;
    }
    setCanvasElements(prev => prev.map(el => 
      el.groupId && groupIds.has(el.groupId) ? { ...el, groupId: undefined } : el
    ));
    toast.success(language === 'fr' ? 'Groupe(s) dégroupé(s)' : 'Group(s) ungrouped');
  };
  
  // Vérifier si la sélection contient un groupe
  const selectionHasGroup = canvasElements.some(el => selectedElementIds.has(el.id) && el.groupId);
  
  // Quand on clique sur un élément qui fait partie d'un groupe, sélectionner tout le groupe
  const selectElementWithGroup = (elementId: string) => {
    const element = canvasElements.find(el => el.id === elementId);
    if (element?.groupId) {
      const groupElements = canvasElements.filter(el => el.groupId === element.groupId);
      const newSelection = new Set(groupElements.map(el => el.id));
      setSelectedElementIds(newSelection);
      setSelectedElementId(elementId);
    } else {
      setSelectedElementIds(new Set([elementId]));
      setSelectedElementId(elementId);
    }
  };
  
  // === EXPORT : Télécharger, Imprimer, @Mail ===
  const [isExporting, setIsExporting] = useState(false);
  
  // Convertir une data: URL en Blob (utilitaire pour captureCanvas)
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const b64 = atob(parts[1]);
    const arr = new Uint8Array(b64.length);
    for (let i = 0; i < b64.length; i++) arr[i] = b64.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };
  
  const captureCanvas = async (_scale = 2): Promise<HTMLCanvasElement | null> => {
    // Stratégie : data:URL → Blob → createImageBitmap() → drawImage(bitmap)
    // createImageBitmap ne contamine PAS le canvas (pas de tainted canvas)
    // On récupère le src complet depuis le DOM (le navigateur l'a en mémoire)
    
    const page = pageRef.current;
    if (!page) {
      toast.error(language === 'fr' ? 'Page non trouvée' : 'Page not found');
      return null;
    }
    
    const imageElements = canvasElements.filter(el => el.type === 'image' && el.src);
    const textElements = canvasElements.filter(el => el.type === 'text');
    const openingElements = canvasElements.filter(el => el.type === 'shape');
    if (imageElements.length === 0 && textElements.length === 0 && openingElements.length === 0) {
      toast.error(language === 'fr' ? 'Aucun élément à capturer' : 'No elements to capture');
      return null;
    }
    
    try {
      // Résolution de sortie fixe (150 DPI)
      const DPI = 150;
      const PX_PER_CM = DPI / 2.54;
      const fmtW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
      const fmtH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
      const outW = Math.round(fmtW * PX_PER_CM);
      const outH = Math.round(fmtH * PX_PER_CM);
      
      const offscreen = document.createElement('canvas');
      offscreen.width = outW;
      offscreen.height = outH;
      const ctx = offscreen.getContext('2d');
      if (!ctx) {
        toast.error(language === 'fr' ? 'Impossible de créer le canvas' : 'Cannot create canvas');
        return null;
      }
      
      // Fond blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
      
      // Passe unique : tous les éléments triés par zIndex global
      const sortedElements = [...canvasElements].sort((a, b) => a.zIndex - b.zIndex);
      let drawnCount = 0;
      
      // DIAGNOSTIC : afficher l'état de chaque élément
      const diagLines: string[] = [];
      diagLines.push(`${sortedElements.length} éléments à capturer (images=${imageElements.length}, shapes=${openingElements.length}, textes=${textElements.length})`);
      
      // Vérifier les images dans le DOM
      const allDomImgs = page.querySelectorAll('img[data-element-id]');
      diagLines.push(`${allDomImgs.length} img[data-element-id] dans le DOM`);
      
      for (const element of sortedElements) {
        // --- Éléments de type 'shape' (puzzle, rect, round, oval, arch) ---
        if (element.type === 'shape') {
          const x = element.x * PX_PER_CM;
          const y = element.y * PX_PER_CM;
          const w = element.width * PX_PER_CM;
          const h = element.height * PX_PER_CM;
          ctx.save();
          ctx.globalAlpha = element.opacity;
          const cx = x + w / 2;
          const cy = y + h / 2;
          ctx.translate(cx, cy);
          ctx.rotate((element.rotation * Math.PI) / 180);

          const fillColor = element.openingColor || '#ffffff';
          const strokeColor = '#1a1a1a';
          const strokeWidth = 3;

          if (element.shape === 'puzzle') {
            const edges = element.puzzleEdges || { top: 0, right: 0, bottom: 0, left: 0 };
            const svgPath = buildPuzzlePath(w, h, edges);
            const path2d = new Path2D(svgPath);
            ctx.translate(-w / 2, -h / 2);
            ctx.fillStyle = element.puzzleTransparent ? 'rgba(0,0,0,0)' : fillColor;
            ctx.fill(path2d);
            // Halo blanc semi-transparent pour lisibilité sur fond sombre
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = strokeWidth + 3;
            ctx.stroke(path2d);
            // Trait principal
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke(path2d);
            if (element.puzzleShowNumber && element.openingIndex != null) {
              const sizeKey = element.puzzleNumberSize || 'medium';
              const baseSize = Math.min(w, h);
              const sizeFactor = sizeKey === 'small' ? 0.18 : sizeKey === 'large' ? 0.38 : 0.28;
              const fontSize = baseSize * sizeFactor;
              ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.strokeStyle = 'white';
              ctx.lineWidth = fontSize * 0.25;
              ctx.strokeText(String(element.openingIndex + 1), w / 2, h / 2);
              ctx.fillStyle = '#1e293b';
              ctx.fillText(String(element.openingIndex + 1), w / 2, h / 2);
            }
          } else {
            const shape = element.shape || 'rect';
            ctx.translate(-w / 2, -h / 2);
            ctx.beginPath();
            if (shape === 'round') {
              const r = Math.min(w, h) / 2;
              ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
            } else if (shape === 'oval') {
              ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            } else if (shape === 'arch') {
              const r = w / 2;
              ctx.moveTo(0, h);
              ctx.lineTo(0, r);
              ctx.arc(w / 2, r, r, Math.PI, 0);
              ctx.lineTo(w, h);
              ctx.closePath();
            } else if (shape === 'heart') {
              // Cœur normalisé : lobes en haut, pointe en bas
              // heartDepth (0–100) contrôle la profondeur de l'encoche centrale
              const hDepthCanvas = (element.heartDepth ?? 50) / 100;
              const hNotchYCanvas = h * (0.25 + hDepthCanvas * 0.25);
              ctx.moveTo(w * 0.5, hNotchYCanvas);
              // Lobe gauche
              ctx.bezierCurveTo(w * 0.5, h * 0.10, w * 0.0, h * 0.10, w * 0.0, h * 0.35);
              ctx.bezierCurveTo(w * 0.0, h * 0.60, w * 0.5, h * 0.75, w * 0.5, h * 1.0);
              // Lobe droit (symétrique)
              ctx.bezierCurveTo(w * 0.5, h * 0.75, w * 1.0, h * 0.60, w * 1.0, h * 0.35);
              ctx.bezierCurveTo(w * 1.0, h * 0.10, w * 0.5, h * 0.10, w * 0.5, hNotchYCanvas);
              ctx.closePath();
            } else if (shape === 'star') {
              // Étoile à 5 branches
              const outerR = Math.min(w, h) / 2;
              const innerR = outerR * 0.42;
              const scx = w / 2, scy = h / 2;
              for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI) / 5 - Math.PI / 2;
                const r = i % 2 === 0 ? outerR : innerR;
                const px = scx + r * Math.cos(angle);
                const py = scy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
              ctx.closePath();
            } else if (shape === 'diamond') {
              // Losange : 4 points aux milieux des côtés de la boîte
              ctx.moveTo(w / 2, 0);
              ctx.lineTo(w, h / 2);
              ctx.lineTo(w / 2, h);
              ctx.lineTo(0, h / 2);
              ctx.closePath();
            } else if (shape === 'hexagon') {
              // Hexagone régulier inscrit dans la boîte (aplati horizontal)
              const hcx = w / 2, hcy = h / 2;
              const hrx = w / 2, hry = h / 2;
              for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3 - Math.PI / 6;
                const px = hcx + hrx * Math.cos(a);
                const py = hcy + hry * Math.sin(a);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
              ctx.closePath();
            } else if (shape === 'line') {
              // Nouveau modèle SVG : x=x1, y=y1, width=x2, height=y2 (coordonnées absolues en cm)
              // Le ctx est déjà translaté au centre (cx, cy) et rotaté — on doit annuler cela
              // car les coordonnées sont absolues dans la page, pas relatives à l'élément
              ctx.restore(); // Annuler le save() du début de l'élément
              ctx.save();
              ctx.globalAlpha = element.opacity;
              const lx1 = element.x * PX_PER_CM;
              const ly1 = element.y * PX_PER_CM;
              const lx2 = element.width * PX_PER_CM;  // x2 en pixels
              const ly2 = element.height * PX_PER_CM; // y2 en pixels
              const lineStrokeColor = element.openingColor && element.openingColor !== 'transparent' ? element.openingColor : '#1a1a1a';
              ctx.beginPath();
              if (element.customPath) {
                // Courbe de Bézier quadratique : parser le customPath
                const pm = element.customPath.match(/M\s*([\d.\-]+)\s+([\d.\-]+)\s+Q\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)/);
                if (pm) {
                  const px1 = parseFloat(pm[1]) * PX_PER_CM;
                  const py1 = parseFloat(pm[2]) * PX_PER_CM;
                  const pcx = parseFloat(pm[3]) * PX_PER_CM;
                  const pcy = parseFloat(pm[4]) * PX_PER_CM;
                  const px2 = parseFloat(pm[5]) * PX_PER_CM;
                  const py2 = parseFloat(pm[6]) * PX_PER_CM;
                  ctx.moveTo(px1, py1);
                  ctx.quadraticCurveTo(pcx, pcy, px2, py2);
                } else {
                  ctx.moveTo(lx1, ly1);
                  ctx.lineTo(lx2, ly2);
                }
              } else {
                ctx.moveTo(lx1, ly1);
                ctx.lineTo(lx2, ly2);
              }
              ctx.strokeStyle = lineStrokeColor;
              ctx.lineWidth = Math.max(2, 2);
              ctx.lineCap = 'round';
              ctx.stroke();
              ctx.restore();
              drawnCount++;
              diagLines.push(`Shape "${element.name}" (line) -> DESSINÉ OK`);
              continue;
            } else {
              ctx.rect(0, 0, w, h);
            }
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
          }
          ctx.restore();
          drawnCount++;
          diagLines.push(`Shape "${element.name}" (${element.shape}) -> DESSINÉ OK`);
          continue;
        }

        // --- Éléments de type 'text' ---
        if (element.type === 'text') {
          if (!element.text) continue;
          const x = element.x * PX_PER_CM;
          const y = element.y * PX_PER_CM;
          const w = element.width * PX_PER_CM;
          const h = element.height * PX_PER_CM;
          const fontSizePx = (element.fontSize || 36) * PX_PER_CM / 37.8;
          const fontStr = `${element.fontItalic ? 'italic ' : ''}${element.fontBold ? 'bold ' : ''}${fontSizePx}px ${element.fontFamily || 'Inter'}`;
          ctx.save();
          ctx.globalAlpha = element.opacity;
          const cx = x + w / 2;
          const cy = y + h / 2;
          ctx.translate(cx, cy);
          ctx.rotate((element.rotation * Math.PI) / 180);
          ctx.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);
          ctx.font = fontStr;
          ctx.fillStyle = element.fontColor || '#1a1a1a';
          ctx.textBaseline = 'middle';
          ctx.textAlign = element.textAlign || 'center';
          if ((element.shadowBlur || 0) > 0 || element.shadowOffsetX || element.shadowOffsetY) {
            ctx.shadowColor = element.shadowColor || 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = element.shadowBlur || 0;
            ctx.shadowOffsetX = element.shadowOffsetX || 0;
            ctx.shadowOffsetY = element.shadowOffsetY || 0;
          }
          if ((element.strokeWidth || 0) > 0) {
            ctx.strokeStyle = element.strokeColor || '#000';
            ctx.lineWidth = element.strokeWidth || 1;
            ctx.strokeText(element.text, 0, 0, w);
          }
          ctx.fillText(element.text, 0, 0, w);
          if (element.fontUnderline) {
            const metrics = ctx.measureText(element.text);
            const textW = Math.min(metrics.width, w);
            const startX = element.textAlign === 'center' ? -textW / 2 : element.textAlign === 'right' ? -textW : 0;
            ctx.fillRect(startX, fontSizePx * 0.1, textW, Math.max(1, fontSizePx * 0.05));
          }
          ctx.restore();
          drawnCount++;
          diagLines.push(`Texte "${element.name}" -> DESSINÉ OK`);
          continue;
        }

        // --- Éléments de type 'image' ---
        if (element.type !== 'image' || !element.src) continue;
        const domImg = page.querySelector(`img[data-element-id="${element.id}"]`) as HTMLImageElement | null;
        const stateSrcLen = (element.src || '').length;
        const domSrcLen = domImg?.src?.length || 0;
        const domComplete = domImg?.complete;
        const domNatW = domImg?.naturalWidth || 0;
        
        diagLines.push(`"${element.name}": state.src=${stateSrcLen}chars, dom.src=${domSrcLen}chars, complete=${domComplete}, natW=${domNatW}`);
        
        // Stratégie de récupération du src (correction bug tronqué à 122 chars) :
        // 1. Préférer le src DOM si l'image est complète et chargée (naturalWidth > 0)
        // 2. Sinon prendre le src le plus long (le state peut être tronqué)
        // 3. Un src valide = data: URL complète (>100 chars) ou URL http(s)
        let src = '';
        const domSrcFull = domImg?.src || '';
        const domImgLoaded = domImg?.complete === true && (domImg?.naturalWidth ?? 0) > 0;
        if (domImgLoaded && domSrcFull.length > 200) {
          // Image DOM chargée et src complet : source la plus fiable
          src = domSrcFull;
        } else if (domSrcLen > stateSrcLen && domSrcLen > 200) {
          // DOM src plus long que le state (state tronqué)
          src = domSrcFull;
        } else if (stateSrcLen > 200) {
          // State src suffisamment long
          src = element.src || '';
        } else {
          // Fallback : prendre le plus long disponible
          src = domSrcLen >= stateSrcLen ? domSrcFull : (element.src || '');
        }
        
        // Validation : data: URL complète ou URL http(s)
        const isValidSrc = (src.startsWith('data:') && src.length > 100) ||
                           (src.startsWith('http') && src.length > 10);
        if (!src || !isValidSrc) {
          diagLines.push(`  -> SKIP: src invalide (len=${src.length}, debut=${src.substring(0, 30)})`);
          continue;
        }
        
        try {
          let blob: Blob;
          if (src.startsWith('data:')) {
            blob = dataUrlToBlob(src);
          } else {
            const resp = await fetch(src);
            blob = await resp.blob();
          }
          diagLines.push(`  -> blob: ${blob.size} bytes, type=${blob.type}`);
          
          const bitmap = await createImageBitmap(blob);
          diagLines.push(`  -> bitmap: ${bitmap.width}x${bitmap.height}`);
          
          const x = element.x * PX_PER_CM;
          const y = element.y * PX_PER_CM;
          const w = element.width * PX_PER_CM;
          const h = element.height * PX_PER_CM;
          
          ctx.save();
          ctx.globalAlpha = element.opacity;
          const cx = x + w / 2;
          const cy = y + h / 2;
          ctx.translate(cx, cy);
          ctx.rotate((element.rotation * Math.PI) / 180);
          ctx.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);
          ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
          bitmap.close();
          ctx.restore();
          drawnCount++;
          diagLines.push(`  -> DESSINÉ OK`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          diagLines.push(`  -> ERREUR: ${errMsg}`);
        }
      }
      
      // Afficher le diagnostic complet dans un toast persistant
      const diagText = diagLines.join('\n');
      console.log('[captureCanvas DIAG]\n' + diagText);
      toast.info(`Capture: ${drawnCount} éléments`, { duration: 5000 });
      
      if (drawnCount === 0) {
        toast.error(language === 'fr' ? 'Aucun élément n\'a pu être capturé' : 'No elements could be captured');
        return null;
      }
      
      return offscreen;
    } catch (err) {
      console.error('[captureCanvas] Error:', err);
      toast.error(language === 'fr' ? `Erreur capture: ${err instanceof Error ? err.message : err}` : `Capture error: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  };
  
  // Utilitaire : convertir un canvas en Blob (contourne le tainted canvas de toDataURL)
  const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/png', quality = 0.95): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('toBlob returned null')),
        type,
        quality
      );
    });
  };
  
  const handleDownload = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    toast.info(language === 'fr' ? 'Préparation du téléchargement...' : 'Preparing download...');
    try {
      const canvas = await captureCanvas(3); // Haute résolution
      if (!canvas) return;
      
      // Utiliser toBlob au lieu de toDataURL (contourne le tainted canvas)
      const blob = await canvasToBlob(canvas, 'image/png');
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${currentProjectName || 'creation'}-${new Date().toISOString().slice(0,10)}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Libérer l'URL après un court délai
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(language === 'fr' ? 'Téléchargement lancé !' : 'Download started!');
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(language === 'fr' ? `Erreur téléchargement: ${errMsg}` : `Download error: ${errMsg}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handlePrint = async () => {
    if (isExporting) return;
    setIsExporting(true);
    toast.info(language === 'fr' ? 'Préparation de l\'impression...' : 'Preparing print...');
    try {
      const canvas = await captureCanvas(2);
      if (!canvas) return;
      
      // Créer un PDF avec les bonnes dimensions
      const format = paperFormat;
      const isLandscape = orientation === 'landscape';
      const pdfWidth = isLandscape ? Math.max(format.width, format.height) : Math.min(format.width, format.height);
      const pdfHeight = isLandscape ? Math.min(format.width, format.height) : Math.max(format.width, format.height);
      
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'cm',
        format: [pdfWidth, pdfHeight],
      });
      
      // Utiliser toBlob pour éviter tainted canvas
      const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.95);
      const jpegUrl = URL.createObjectURL(jpegBlob);
      pdf.addImage(jpegUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      URL.revokeObjectURL(jpegUrl);
      
      // Ouvrir la fenêtre d'impression
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.success(language === 'fr' ? 'Fenêtre d\'impression ouverte' : 'Print window opened');
    } catch (err) {
      console.error('Erreur impression:', err);
      toast.error(language === 'fr' ? 'Erreur lors de l\'impression' : 'Print error');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleEmail = async () => {
    if (isExporting) return;
    setIsExporting(true);
    toast.info(language === 'fr' ? 'Préparation de l\'image...' : 'Preparing image...');
    try {
      const canvas = await captureCanvas(2);
      if (!canvas) return;
      
      // Convertir en blob pour le partage
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        toast.error(language === 'fr' ? 'Erreur de conversion' : 'Conversion error');
        return;
      }
      
      // Essayer l'API Web Share si disponible
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${currentProjectName || 'creation'}.png`, { type: 'image/png' });
        const shareData = { files: [file], title: currentProjectName || 'Ma création' };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success(language === 'fr' ? 'Partagé !' : 'Shared!');
          return;
        }
      }
      
      // Fallback : ouvrir mailto avec un lien de téléchargement
      // Utiliser toBlob au lieu de toDataURL
      const emailBlob = await canvasToBlob(canvas, 'image/png');
      const emailUrl = URL.createObjectURL(emailBlob);
      const link = document.createElement('a');
      link.download = `${currentProjectName || 'creation'}.png`;
      link.href = emailUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(emailUrl), 5000);
      
      // Ouvrir le client mail
      const subject = encodeURIComponent(currentProjectName || (language === 'fr' ? 'Ma création DuoClass' : 'My DuoClass creation'));
      const body = encodeURIComponent(language === 'fr' 
        ? 'Bonjour,\n\nVeuillez trouver ci-joint ma création.\n\nCordialement'
        : 'Hello,\n\nPlease find attached my creation.\n\nBest regards');
      window.open(`mailto:?subject=${subject}&body=${body}`);
      toast.success(language === 'fr' ? 'Image téléchargée, joignez-la à votre email' : 'Image downloaded, attach it to your email');
    } catch (err) {
      console.error('Erreur email:', err);
      toast.error(language === 'fr' ? 'Erreur lors du partage' : 'Sharing error');
    } finally {
      setIsExporting(false);
    }
  };

  // === NOUVEAU PROJET : modale de saisie du nom et création directe dans IndexedDB ===
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateNewProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    const newId = `project_${Date.now()}`;
    try {
      const created = await createCreationsProject(name, newId);

      // Créer immédiatement l'entrée album_metas pour que le projet
      // apparaisse dans MES PROJETS CRÉATIONS dès la création.
      const existingMeta = await db.album_metas.get(newId);
      if (!existingMeta) {
        await db.album_metas.add({
          id: newId,
          title: name,
          type: 'standard' as const,
          series: 'photoclass' as const,
          createdAt: Date.now(),
          categoryId: 'cat_mes_projets',
        });
        await db.albums.put({ id: newId, frames: [] });
        console.log('[CreationsAtelier] Album créé dans MES PROJETS CRÉATIONS:', name);
      }

      setCurrentProjectId(newId);
      setCurrentProjectName(name);
      setSelectedProjectId(newId);
      setSourcePhotos([]);
      setCanvasElements([]);
      setCollectorItems([]);
      // Ajouter le nouveau projet à la liste locale pour qu'il apparaisse immédiatement
      setExistingProjects(prev => [created, ...prev]);
      setShowNewProjectHelp(false);
      setNewProjectName('');
      setShowProjectModal(false);
      toast.success(
        language === 'fr'
          ? `Projet "${name}" créé avec succès !`
          : `Project "${name}" created successfully!`
      );
    } catch (err) {
      console.error('Erreur création projet:', err);
      toast.error(language === 'fr' ? 'Erreur lors de la création du projet' : 'Error creating project');
    }
  };

  // === SAUVER COMME : modale de saisie du nom puis capture et sauvegarde dans l'album ===
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');

  // Ouvre la modale de saisie du nom
  const handleSaveAs = () => {
    setSaveAsName(currentProjectName || (language === 'fr' ? 'Mon Collage' : 'My Collage'));
    setShowSaveAsModal(true);
  };

  // Effectue la capture et la sauvegarde après confirmation
  const handleSaveAsConfirm = async () => {
    const collageName = saveAsName.trim() || (language === 'fr' ? 'Mon Collage' : 'My Collage');
    setShowSaveAsModal(false);
    if (isExporting) return;
    setIsExporting(true);
    toast.info(language === 'fr' ? 'Capture du collage en cours...' : 'Capturing collage...');
    try {
      const canvas = await captureCanvas(3); // Haute résolution
      if (!canvas) return;

      // Convertir en blob puis en dataURL via FileReader (contourne tainted canvas)
      const saveBlob = await canvasToBlob(canvas, 'image/png');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(saveBlob);
      });

      // Correction de l'ordre des arguments : saveCollageToAlbum(imageDataUrl, collageName)
      await saveCollageToAlbum(dataUrl, collageName);
      toast.success(
        language === 'fr'
          ? `Collage "${collageName}_collage" sauvegardé dans l'album Mes Collages !`
          : `Collage "${collageName}_collage" saved to My Collages album!`
      );
    } catch (err) {
      console.error('Erreur sauver comme:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(language === 'fr' ? `Erreur sauvegarde: ${errMsg}` : `Save error: ${errMsg}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // La zone de travail est fixe, mais la PAGE est dessinée à l'intérieur
  // avec les proportions exactes du format sélectionné
  const getCanvasPixelDimensions = useCallback(() => {
    // Marge minimale autour de la page (pour les crop marks et l'espace visuel)
    const PAGE_MARGIN = 28; // px -- espace réservé pour les crop marks et la lisibilité
    // Espace disponible pour la zone de travail (moins les règles et la marge)
    const availableWidth = Math.max(200, canvasContainerSize.width - 40 - 2 * PAGE_MARGIN);
    const availableHeight = Math.max(200, canvasContainerSize.height - 40 - 2 * PAGE_MARGIN);
    
    // Dimensions du format papier en cm
    const formatWidthCm = orientation === "portrait" ? paperFormat.width : paperFormat.height;
    const formatHeightCm = orientation === "portrait" ? paperFormat.height : paperFormat.width;
    
    // Calculer le scale pour que la page tienne dans l'espace disponible
    // tout en conservant les proportions exactes
    const scaleX = availableWidth / formatWidthCm;
    const scaleY = availableHeight / formatHeightCm;
    const pxPerCm = Math.min(scaleX, scaleY); // Pixels par cm
    
    // Dimensions de la page en pixels (proportions exactes)
    const pageWidth = formatWidthCm * pxPerCm;
    const pageHeight = formatHeightCm * pxPerCm;
    
    // Espace total de la zone de travail (avec marge)
    const totalWidth = canvasContainerSize.width - 40;
    const totalHeight = canvasContainerSize.height - 40;
    
    return {
      // Zone de travail complète
      workspaceWidth: Math.max(400, totalWidth),
      workspaceHeight: Math.max(400, totalHeight),
      // Page intérieure (proportions exactes du format)
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      // Offset pour centrer la page dans la zone de travail (avec marge garantie)
      pageOffsetX: Math.max(PAGE_MARGIN, (totalWidth - pageWidth) / 2),
      pageOffsetY: Math.max(PAGE_MARGIN, (totalHeight - pageHeight) / 2),
      // Pixels par cm (pour convertir les dimensions)
      pxPerCm: pxPerCm,
      // Dimensions du format en cm
      formatWidthCm: formatWidthCm,
      formatHeightCm: formatHeightCm,
      // Ancien scale pour compatibilité
      scale: pxPerCm / 37.8, // 37.8 px/cm à 96 DPI
      width: pageWidth, // Pour compatibilité
      height: pageHeight // Pour compatibilité
    };
  }, [canvasContainerSize, paperFormat, orientation]);
  
  const canvasDimensions = getCanvasPixelDimensions();
  
  // Gérer le zoom IMAGE avec la molette (uniquement si une image est sélectionnée et non verrouillée)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (selectedElementId) {
      // Vérifier si l'élément est verrouillé
      const selectedElement = canvasElements.find(el => el.id === selectedElementId);
      if (selectedElement?.locked) {
        // Photo verrouillée : ne pas permettre le zoom
        return;
      }
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      const newZoom = Math.min(500, Math.max(10, imageZoom + delta));
      setImageZoom(newZoom);
      
      // Appliquer le zoom à l'élément sélectionné
      setCanvasElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          const scale = newZoom / 100;
          // Calculer les nouvelles dimensions basées sur les dimensions originales
          // On utilise les dimensions actuelles divisées par l'ancien zoom puis multipliées par le nouveau
          const oldScale = imageZoom / 100;
          const baseWidth = el.width / oldScale;
          const baseHeight = el.height / oldScale;
          const newWidth = baseWidth * scale;
          const newHeight = baseHeight * scale;
          
          // Centrer le zoom sur l'élément
          const deltaWidth = newWidth - el.width;
          const deltaHeight = newHeight - el.height;
          
          return {
            ...el,
            width: newWidth,
            height: newHeight,
            x: el.x - deltaWidth / 2,
            y: el.y - deltaHeight / 2
          };
        }
        return el;
      }));
    }
  }, [selectedElementId, imageZoom, canvasElements]);
  
  // Ajouter un élément au canvas avec dimensions en CENTIMÈTRES
  // Résolution standard : 96 DPI (pixels par pouce), 1 pouce = 2.54 cm
  const DPI_STANDARD = 96;
  const CM_PER_INCH = 2.54;
  const PX_PER_CM_STANDARD = DPI_STANDARD / CM_PER_INCH; // ~37.8 px/cm
  
  /**
   * Dessine l'ouverture (découpage transparent) d'un passe-partout sur un canvas 2D.
   * Supporte des dimensions d'ouverture indépendantes de la largeur de bordure
   * (utile pour l'ovale et les formes asymétriques).
   * La forme est découpée via globalCompositeOperation "destination-out".
   */
  const drawOpening = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: PassePartoutData,
    pxPerCm: number
  ) => {
    // Si des dimensions d'ouverture indépendantes sont fournies, les utiliser ;
    // sinon, déduire depuis la largeur de bordure.
    const innerW = data.openingWidthCm != null
      ? data.openingWidthCm * pxPerCm
      : w - data.borderWidthCm * pxPerCm * 2;
    const innerH = data.openingHeightCm != null
      ? data.openingHeightCm * pxPerCm
      : h - data.borderWidthCm * pxPerCm * 2;

    // Centrer l'ouverture dans le format
    const innerX = (w - innerW) / 2;
    const innerY = (h - innerH) / 2;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();

    switch (data.shape) {
      case "square": {
        const side = Math.min(innerW, innerH);
        const ox = innerX + (innerW - side) / 2;
        const oy = innerY + (innerH - side) / 2;
        ctx.rect(ox, oy, side, side);
        break;
      }
      case "round": {
        const cx = innerX + innerW / 2;
        const cy = innerY + innerH / 2;
        const radius = Math.min(innerW, innerH) / 2;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        break;
      }
      case "oval": {
        // L'ovale utilise pleinement les dimensions indépendantes largeur/hauteur
        const cx = innerX + innerW / 2;
        const cy = innerY + innerH / 2;
        ctx.ellipse(cx, cy, innerW / 2, innerH / 2, 0, 0, Math.PI * 2);
        break;
      }
      case "arch": {
        const ax = innerX;
        const ay = innerY;
        const aw = innerW;
        const ah = innerH;
        ctx.moveTo(ax, ay + ah);
        ctx.lineTo(ax, ay + ah / 2);
        ctx.arcTo(ax, ay, ax + aw / 2, ay, aw / 2);
        ctx.arcTo(ax + aw, ay, ax + aw, ay + ah / 2, aw / 2);
        ctx.lineTo(ax + aw, ay + ah);
        ctx.closePath();
        break;
      }
      default: // rect
        ctx.rect(innerX, innerY, innerW, innerH);
    }

    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };

  /**
   * Trace le chemin d'une ouverture à une position et des dimensions absolues (en pixels).
   * Contrairement à drawOpening, cette fonction ne gère pas la composition -
   * elle trace uniquement le path, l'appelant choisit fillStyle et globalCompositeOperation.
   */
  const drawOpeningPath = (
    ctx: CanvasRenderingContext2D,
    shape: string,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    switch (shape) {
      case 'square': {
        const side = Math.min(w, h);
        ctx.rect(x + (w - side) / 2, y + (h - side) / 2, side, side);
        break;
      }
      case 'round': {
        const radius = Math.min(w, h) / 2;
        ctx.arc(x + w / 2, y + h / 2, radius, 0, Math.PI * 2);
        break;
      }
      case 'oval': {
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        break;
      }
      case 'arch': {
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.arcTo(x, y, x + w / 2, y, w / 2);
        ctx.arcTo(x + w, y, x + w, y + h / 2, w / 2);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        break;
      }
      case 'puzzle': {
        // Forme puzzle : rectangle avec 4 encoches arrondies (2 saillantes, 2 rentrantes)
        const bx = x, by = y, bw = w, bh = h;
        const nr = Math.min(bw, bh) * 0.12; // rayon des encoches
        const cx = bx + bw / 2, cy = by + bh / 2;
        ctx.moveTo(bx, by);
        // Bord haut : encoche saillante vers le haut
        ctx.lineTo(cx - nr * 1.5, by);
        ctx.arc(cx, by, nr, Math.PI, 0, false); // saillant haut
        ctx.lineTo(bx + bw, by);
        // Bord droit : encoche rentrante
        ctx.lineTo(bx + bw, cy - nr * 1.5);
        ctx.arc(bx + bw, cy, nr, -Math.PI / 2, Math.PI / 2, true); // rentrant droit
        ctx.lineTo(bx + bw, by + bh);
        // Bord bas : encoche saillante vers le bas
        ctx.lineTo(cx + nr * 1.5, by + bh);
        ctx.arc(cx, by + bh, nr, 0, Math.PI, false); // saillant bas
        ctx.lineTo(bx, by + bh);
        // Bord gauche : encoche rentrante
        ctx.lineTo(bx, cy + nr * 1.5);
        ctx.arc(bx, cy, nr, Math.PI / 2, -Math.PI / 2, true); // rentrant gauche
        ctx.closePath();
        break;
      }
      default: // rect
        ctx.rect(x, y, w, h);
    }
  };

  const addToCanvas = (src: string, name?: string, dropPositionCm?: { x: number; y: number }) => {
    // Charger l'image pour obtenir ses dimensions réelles en pixels
    const img = document.createElement('img');
    img.onload = () => {
      // Convertir les dimensions de l'image de pixels vers cm (résolution standard 96 DPI)
      let widthCm = img.naturalWidth / PX_PER_CM_STANDARD;
      let heightCm = img.naturalHeight / PX_PER_CM_STANDARD;

      // Dimensions max en cm (80% du format papier)
      const formatWidthCm = orientation === "portrait" ? paperFormat.width : paperFormat.height;
      const formatHeightCm = orientation === "portrait" ? paperFormat.height : paperFormat.width;
      const maxWidthCm = formatWidthCm * 0.8;
      const maxHeightCm = formatHeightCm * 0.8;

      // Redimensionner si nécessaire tout en gardant les proportions
      if (widthCm > maxWidthCm || heightCm > maxHeightCm) {
        const ratio = Math.min(maxWidthCm / widthCm, maxHeightCm / heightCm);
        widthCm = widthCm * ratio;
        heightCm = heightCm * ratio;
      }

      // Position : utiliser le point de drop (centré sur l'image) ou centrer sur la page
      let xCm: number;
      let yCm: number;
      if (dropPositionCm) {
        xCm = dropPositionCm.x - widthCm / 2;
        yCm = dropPositionCm.y - heightCm / 2;
      } else {
        xCm = (formatWidthCm - widthCm) / 2;
        yCm = (formatHeightCm - heightCm) / 2;
      }

      const newElement: CanvasElement = {
        id: `element-${Date.now()}`,
        type: "image",
        src,
        x: xCm, // Position en cm
        y: yCm, // Position en cm
        width: widthCm, // Largeur en cm
        height: heightCm, // Hauteur en cm
        rotation: 0,
        zIndex: canvasElements.length + 1,
        opacity: 1,
        name: name || (language === 'fr' ? 'Élément' : 'Element'),
        originalWidthPx: img.naturalWidth,
        originalHeightPx: img.naturalHeight
      };
      setCanvasElements(prev => [...prev, newElement]);
      setSelectedElementId(newElement.id);
      setActiveCanvasPhoto(src);
    };
    img.src = src;
  };
  
  // Ajouter au collecteur (pièces détourées / éléments)
  const addToCollector = (src: string, name: string, type: CollectorItem["type"] = "detourage") => {
    const newItem: CollectorItem = {
      id: `collector-${Date.now()}`,
      type,
      src,
      name,
      thumbnail: src
    };
    setCollectorItems(prev => [...prev, newItem]);
    toast.success(language === "fr" ? `"${name}" ajouté au collecteur` : `"${name}" added to collector`);
  };
  
  // Supprimer un élément du canvas
  const removeFromCanvas = (id: string) => {
    setCanvasElements(prev => prev.filter(el => el.id !== id));
    setSelectedElementIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
      setActiveCanvasPhoto(null);
    }
  };
  
  // Retirer une photo du projet (colonne Photos/Images)
  const handleRemovePhotoFromProject = async (photoId: string) => {
    // Trouver la photo à supprimer AVANT de modifier l'état
    const photoToRemove = sourcePhotos.find(p => p.id === photoId);
    
    // Retirer de l'état local sourcePhotos
    setSourcePhotos(prev => prev.filter(p => p.id !== photoId));
    
    // Si un projet est sélectionné, retirer aussi de l'album projet dans IndexedDB
    if (currentProjectId && photoToRemove) {
      try {
        const albumData = await db.albums.get(currentProjectId);
        if (albumData && albumData.frames) {
          // SUPPRIMER le frame au lieu de le vider (filter au lieu de map)
          const updatedFrames = albumData.frames.filter((frame: any) => 
            frame.photoUrl !== photoToRemove.src
          );
          
          await db.albums.put({
            id: currentProjectId,
            frames: updatedFrames,
            updatedAt: Date.now()
          });
          
          console.log(`[Créations] Photo supprimée du projet: ${photoToRemove.src}`);
        }
      } catch (error) {
        console.error("Erreur lors de la suppression de la photo du projet:", error);
      }
    }
    
    toast.success(language === "fr" ? "Photo retirée du projet" : "Photo removed from project");
  };
  
  // Mettre à jour un élément du canvas
  const updateCanvasElement = (id: string, updates: Partial<CanvasElement>) => {
    setCanvasElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  // Dupliquer un élément du canvas
  const duplicateCanvasElement = (id: string) => {
    const element = canvasElements.find(el => el.id === id);
    if (!element) return;
    
    const newElement: CanvasElement = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      x: element.x + 0.5, // Décaler légèrement
      y: element.y + 0.5,
      locked: false,
      zIndex: Math.max(...canvasElements.map(el => el.zIndex)) + 1
    };
    
    setCanvasElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    toast.success(language === "fr" ? "Élément dupliqué" : "Element duplicated");
  };
  
  // Centrer un élément horizontalement (Y inchangé)
  const centerElementH = (id: string) => {
    const element = canvasElements.find(el => el.id === id);
    if (!element) return;
    const formatWidthCm = orientation === "portrait" ? paperFormat.width : paperFormat.height;
    const newX = (formatWidthCm - element.width) / 2;
    updateCanvasElement(id, { x: newX });
    toast.success(language === "fr" ? "Centré horizontalement" : "Centered horizontally");
  };
  // Centrer un élément verticalement (X inchangé)
  const centerElementV = (id: string) => {
    const element = canvasElements.find(el => el.id === id);
    if (!element) return;
    const formatHeightCm = orientation === "portrait" ? paperFormat.height : paperFormat.width;
    const newY = (formatHeightCm - element.height) / 2;
    updateCanvasElement(id, { y: newY });
    toast.success(language === "fr" ? "Centré verticalement" : "Centered vertically");
  };
  // Centrer un élément sur les deux axes
  const centerElement = (id: string) => {
    const element = canvasElements.find(el => el.id === id);
    if (!element) return;
    const formatWidthCm = orientation === "portrait" ? paperFormat.width : paperFormat.height;
    const formatHeightCm = orientation === "portrait" ? paperFormat.height : paperFormat.width;
    const newX = (formatWidthCm - element.width) / 2;
    const newY = (formatHeightCm - element.height) / 2;
    updateCanvasElement(id, { x: newX, y: newY });
    toast.success(language === "fr" ? "Elément centré" : "Element centered");
  };

  // Mettre un élément au premier plan
  // ===== Alignement multi-sélection =====
  // Référence : bord gauche le plus à gauche, bord droit le plus à droite, etc.
  const alignSelected = (direction: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => {
    const selected = canvasElements.filter(el => selectedElementIds.has(el.id));
    if (selected.length < 2) return;
    let ref: number;
    switch (direction) {
      case 'left':    ref = Math.min(...selected.map(el => el.x)); break;
      case 'right':   ref = Math.max(...selected.map(el => el.x + el.width)); break;
      case 'centerH': ref = (Math.min(...selected.map(el => el.x)) + Math.max(...selected.map(el => el.x + el.width))) / 2; break;
      case 'top':     ref = Math.min(...selected.map(el => el.y)); break;
      case 'bottom':  ref = Math.max(...selected.map(el => el.y + el.height)); break;
      case 'centerV': ref = (Math.min(...selected.map(el => el.y)) + Math.max(...selected.map(el => el.y + el.height))) / 2; break;
    }
    setCanvasElements(prev => prev.map(el => {
      if (!selectedElementIds.has(el.id)) return el;
      switch (direction) {
        case 'left':    return { ...el, x: ref };
        case 'right':   return { ...el, x: ref - el.width };
        case 'centerH': return { ...el, x: ref - el.width / 2 };
        case 'top':     return { ...el, y: ref };
        case 'bottom':  return { ...el, y: ref - el.height };
        case 'centerV': return { ...el, y: ref - el.height / 2 };
        default: return el;
      }
    }));
    const labels: Record<string, string> = {
      left: 'Alignés à gauche', right: 'Alignés à droite', centerH: 'Centrés horizontalement',
      top: 'Alignés en haut', bottom: 'Alignés en bas', centerV: 'Centrés verticalement'
    };
    toast.success(labels[direction] ?? 'Alignés');
  };

  // Distribuer l'écartement égal entre les éléments sélectionnés
  const distributeSelected = (axis: 'horizontal' | 'vertical') => {
    const selected = canvasElements.filter(el => selectedElementIds.has(el.id));
    if (selected.length < 3) {
      toast.info(language === 'fr' ? 'Sélectionnez au moins 3 éléments pour distribuer' : 'Select at least 3 elements to distribute');
      return;
    }
    if (axis === 'horizontal') {
      // Trier par position X
      const sorted = [...selected].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const gap = (last.x + last.width - first.x - totalWidth) / (sorted.length - 1);
      let currentX = first.x;
      const positions: Record<string, number> = {};
      for (const el of sorted) {
        positions[el.id] = currentX;
        currentX += el.width + gap;
      }
      setCanvasElements(prev => prev.map(el =>
        positions[el.id] !== undefined ? { ...el, x: positions[el.id] } : el
      ));
    } else {
      // Trier par position Y
      const sorted = [...selected].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const gap = (last.y + last.height - first.y - totalHeight) / (sorted.length - 1);
      let currentY = first.y;
      const positions: Record<string, number> = {};
      for (const el of sorted) {
        positions[el.id] = currentY;
        currentY += el.height + gap;
      }
      setCanvasElements(prev => prev.map(el =>
        positions[el.id] !== undefined ? { ...el, y: positions[el.id] } : el
      ));
    }
    toast.success(language === 'fr'
      ? (axis === 'horizontal' ? 'Espacement horizontal égalisé' : 'Espacement vertical égalisé')
      : (axis === 'horizontal' ? 'Horizontal spacing equalized' : 'Vertical spacing equalized')
    );
  };

  const bringToFront = (id: string) => {
    const maxZIndex = Math.max(...canvasElements.map(el => el.zIndex));
    updateCanvasElement(id, { zIndex: maxZIndex + 1 });
  };
  
  // Mettre un élément à l'arrière-plan
  const sendToBack = (id: string) => {
    // Réorganiser tous les z-index pour éviter les valeurs négatives
    const sortedElements = [...canvasElements].sort((a, b) => a.zIndex - b.zIndex);
    const targetElement = sortedElements.find(el => el.id === id);
    if (!targetElement) return;
    
    // Mettre l'élément cible en premier (z-index 1) et décaler les autres
    const newElements = canvasElements.map(el => {
      if (el.id === id) {
        return { ...el, zIndex: 1 };
      }
      // Décaler les autres éléments vers le haut
      const currentIndex = sortedElements.findIndex(s => s.id === el.id);
      const targetIndex = sortedElements.findIndex(s => s.id === id);
      if (currentIndex < targetIndex) {
        return { ...el, zIndex: el.zIndex + 1 };
      }
      return el;
    });
    setCanvasElements(newElements);
  };
  
  // Gérer le clic droit pour le menu contextuel
  const handleContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Empêcher le onClick de désélectionner après ce clic droit
    justDidRightClickRef.current = true;
    setTimeout(() => { justDidRightClickRef.current = false; }, 300);
    
    const element = canvasElements.find(el => el.id === elementId);
    if (!element) return;
    
    // Sélectionner l'élément s'il ne l'est pas encore
    if (!selectedElementIds.has(elementId)) {
      setSelectedElementIds(new Set([elementId]));
      setSelectedElementId(elementId);
      if (element.src) setActiveCanvasPhoto(element.src);
    }
    
    // Ouvrir le menu contextuel à la position du curseur
    setContextMenu({ x: e.clientX, y: e.clientY, elementId });
  };
  
  // Fermer le menu contextuel
  const closeContextMenu = () => {
    setContextMenu(null);
  };
  
  // Sauvegarder le projet
  const handleSaveProject = async () => {
    try {
      const targetProjectId = currentProjectId || projectId;
      
      // Préparer les données du canvas à sauvegarder (incluant les photos sources)
      const canvasData = JSON.stringify({
        canvasElements,
        collectorItems,
        sourcePhotos, // Sauvegarder aussi les photos sources
        paperFormat: paperFormat.id,
        // Sauvegarder les dimensions personnalisées si format custom
        ...(paperFormat.id === 'custom' ? { customWidth, customHeight } : {}),
        orientation,
        imageZoom,
      });
      
      // Combiner sourcePhotos + canvasElements pour avoir le bon compteur de photos
      const allPhotosForCount = [
        ...sourcePhotos.map(photo => ({
          id: photo.id,
          photoUrl: photo.src,
          thumbnail: photo.thumbnail,
          photoTitle: photo.name,
          dateAdded: Date.now()
        })),
        // Ajouter les éléments du canvas qui ne sont pas déjà dans sourcePhotos
        ...canvasElements
          .filter((el): el is CanvasElement & { src: string } => !!el.src && !sourcePhotos.some(sp => sp.src === el.src))
          .map(el => ({
            id: el.id,
            photoUrl: el.src,
            thumbnail: el.src,
            photoTitle: el.name || 'Photo',
            dateAdded: Date.now()
          }))
      ];
      
      // Vérifier si un projet existe déjà
      if (targetProjectId) {
        const existingProject = await getCreationsProject(targetProjectId);
        if (existingProject) {
          // Mettre à jour le projet existant
          existingProject.name = currentProjectName;
          existingProject.canvasData = canvasData;
          // Sauvegarder toutes les photos (sources + canvas) pour le compteur
          existingProject.photos = allPhotosForCount;
          await updateCreationsProject(existingProject);
          console.log('[CreationsAtelier] Projet mis à jour:', targetProjectId, 'avec', sourcePhotos.length, 'photos');
          
          // Synchroniser ou cr\u00e9er l'entr\u00e9e album_metas pour que le projet apparaisse dans Albums
          const albumMeta = await db.album_metas.get(targetProjectId);
          if (albumMeta) {
            if (albumMeta.title !== currentProjectName) {
              albumMeta.title = currentProjectName;
              await db.album_metas.put(albumMeta);
              console.log('[CreationsAtelier] Nom de l\'album synchronis\u00e9:', currentProjectName);
            }
          } else {
            await db.album_metas.add({ id: targetProjectId, title: currentProjectName, type: 'standard' as const, series: 'photoclass' as const, createdAt: Date.now(), categoryId: 'cat_mes_projets' });
            await db.albums.put({ id: targetProjectId, frames: [], updatedAt: Date.now() });
            console.log('[CreationsAtelier] Album cr\u00e9\u00e9 dans MES PROJETS CR\u00c9ATIONS:', currentProjectName);
          }
        } else {
          // Cr\u00e9er un nouveau projet avec cet ID
          const newProject = await createCreationsProject(currentProjectName, targetProjectId);
          newProject.canvasData = canvasData;
          newProject.photos = allPhotosForCount;
          await updateCreationsProject(newProject);
          console.log('[CreationsAtelier] Nouveau projet cr\u00e9\u00e9:', targetProjectId, 'avec', sourcePhotos.length, 'photos');
          
          // Cr\u00e9er ou synchroniser l'entr\u00e9e album_metas
          const albumMeta2 = await db.album_metas.get(targetProjectId);
          if (albumMeta2) {
            if (albumMeta2.title !== currentProjectName) {
              albumMeta2.title = currentProjectName;
              await db.album_metas.put(albumMeta2);
            }
          } else {
            await db.album_metas.add({ id: targetProjectId, title: currentProjectName, type: 'standard' as const, series: 'photoclass' as const, createdAt: Date.now(), categoryId: 'cat_mes_projets' });
            await db.albums.put({ id: targetProjectId, frames: [], updatedAt: Date.now() });
            console.log('[CreationsAtelier] Album cr\u00e9\u00e9 dans MES PROJETS CR\u00c9ATIONS:', currentProjectName);
          }
        }
      } else {
        // Pas d'ID de projet - créer un nouveau projet avec un ID généré
        const newId = `project_${Date.now()}`;
        const newProject = await createCreationsProject(currentProjectName, newId);
        newProject.canvasData = canvasData;
        newProject.photos = allPhotosForCount;
        await updateCreationsProject(newProject);
        setCurrentProjectId(newId); // Mettre à jour l'ID du projet courant
        console.log('[CreationsAtelier] Nouveau projet créé sans ID:', newId, 'avec', sourcePhotos.length, 'photos');
        
        // Créer aussi l'album dans albums_meta pour qu'il apparaisse dans MES PROJETS CRÉATIONS
        const newAlbumMeta = {
          id: newId,
          title: currentProjectName,
          type: 'standard' as const,
          series: 'photoclass' as const,
          createdAt: Date.now(),
          categoryId: 'cat_mes_projets'
        };
        await db.album_metas.add(newAlbumMeta);
        // Créer aussi l'entrée dans albums
        await db.albums.add({ id: newId, frames: [], updatedAt: Date.now() });
        console.log('[CreationsAtelier] Album créé dans MES PROJETS CRÉATIONS:', currentProjectName);
      }
      
      // Appeler le callback si fourni
      if (onSaveProject) {
        onSaveProject({
          id: targetProjectId,
          name: currentProjectName,
          canvasElements,
          collectorItems,
          sourcePhotos,
          paperFormat,
          orientation,
        });
      }
      
      toast.success(language === "fr" ? "Projet sauvegardé !" : "Project saved!");
    } catch (error) {
      console.error('[CreationsAtelier] Erreur lors de la sauvegarde:', error);
      toast.error(language === "fr" ? "Erreur lors de la sauvegarde" : "Error saving project");
    }
  };
  
  // Réinitialiser le canvas
  const handleReset = () => {
    setCanvasElements([]);
    setSelectedElementId(null);
    setActiveCanvasPhoto(null);
  };
  
  // Gestion du drag pour déplacer les éléments sur le canvas
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    // En mode tracé de ligne, laisser l'événement remonter jusqu'au canvas
    // pour que le onMouseDown du canvas gère le clic (début d'un nouveau segment)
    if (isLineDrawMode) return;

    const element = canvasElements.find(el => el.id === elementId);
    if (!element || element.locked) return;

    e.preventDefault();
    e.stopPropagation();
    
    // Déterminer la sélection effective AVANT de modifier l'état
    const isAlreadyInSelection = selectedElementIds.has(elementId);
    let effectiveSelection: Set<string>;
    
    if (e.shiftKey) {
      // Shift+clic : ajouter à la sélection existante (le onClick gère le toggle)
      effectiveSelection = new Set(selectedElementIds);
      effectiveSelection.add(elementId);
    } else if (isAlreadyInSelection && selectedElementIds.size > 1) {
      // L'élément est dans une multi-sélection : garder toute la sélection pour le drag groupé
      effectiveSelection = new Set(selectedElementIds);
    } else if (element.groupId) {
      // L'élément fait partie d'un groupe : sélectionner tout le groupe
      const groupElements = canvasElements.filter(el => el.groupId === element.groupId);
      effectiveSelection = new Set(groupElements.map(el => el.id));
      setSelectedElementIds(effectiveSelection);
    } else {
      // Sélection simple : réinitialiser à cet élément seul
      effectiveSelection = new Set([elementId]);
      setSelectedElementIds(effectiveSelection);
    }
    
    // Mettre à jour l'élément principal sélectionné
    if (selectedElementId !== elementId) {
      setSelectedElementId(elementId);
      setImageZoom(100);
    }
    if (element.src) setActiveCanvasPhoto(element.src);
    
    // Préparer le drag pour tous les éléments de la sélection effective
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStartPos({ x: element.x, y: element.y });
    // Pour les lignes (modèle SVG) : sauvegarder aussi width=x2 et height=y2
    setElementStartSize({ width: element.width, height: element.height });
    
    // Sauvegarder les positions de départ de TOUS les éléments sélectionnés
    const startPositions = new Map<string, { x: number; y: number }>();
    effectiveSelection.forEach(id => {
      const el = canvasElements.find(e => e.id === id);
      if (el && !el.locked) {
        startPositions.set(id, { x: el.x, y: el.y });
      }
    });
    // Toujours inclure l'élément en cours de drag
    if (!startPositions.has(elementId)) {
      startPositions.set(elementId, { x: element.x, y: element.y });
    }
    multiDragStartPositions.current = startPositions;
  };
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // === Drag du point de contrôle de la courbe de Bézier ===
    if (isDraggingCtrl && draggingCtrlElementIdRef.current && dragStart) {
      const pxPerCm = canvasDimensions.pxPerCm;
      const elId = draggingCtrlElementIdRef.current;
      setCanvasElements(prev => prev.map(el => {
        if (el.id !== elId || !el.customPath) return el;
        // Parser le customPath courant
        const m = el.customPath.match(/M\s*([\d.\-]+)\s+([\d.\-]+)\s+Q\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)/);
        if (!m) return el;
        const x1cm = parseFloat(m[1]);
        const y1cm = parseFloat(m[2]);
        const x2cm = parseFloat(m[5]);
        const y2cm = parseFloat(m[6]);
        // Nouvelle position du point de contrôle en cm (position souris convertie depuis pixels)
        // On utilise pageRef pour convertir les coordonnées souris en coordonnées page
        const pageEl = pageRef.current;
        if (!pageEl) return el;
        const rect = pageEl.getBoundingClientRect();
        const newCtrlXcm = (e.clientX - rect.left) / pxPerCm;
        const newCtrlYcm = (e.clientY - rect.top) / pxPerCm;
        const newPath = `M ${x1cm} ${y1cm} Q ${newCtrlXcm} ${newCtrlYcm} ${x2cm} ${y2cm}`;
        return { ...el, customPath: newPath };
      }));
      return;
    }
    if (!isDragging || !dragStart || !elementStartPos || !selectedElementId) return;
    
    // Convertir les deltas de pixels vers cm
    const pxPerCm = canvasDimensions.pxPerCm;
    const deltaXCm = (e.clientX - dragStart.x) / pxPerCm;
    const deltaYCm = (e.clientY - dragStart.y) / pxPerCm;
    
    // Déplacement groupé : déplacer tous les éléments sélectionnés
    if (multiDragStartPositions.current.size > 1) {
      setCanvasElements(prev => prev.map(el => {
        const startPos = multiDragStartPositions.current.get(el.id);
        if (startPos && !el.locked) {
          if (el.type === 'shape' && el.shape === 'line') {
            // Nouveau modèle SVG : déplacer aussi width=x2 et height=y2
            const origWidth = el.width - el.x + startPos.x; // x2 original
            const origHeight = el.height - el.y + startPos.y; // y2 original
            return {
              ...el,
              x: startPos.x + deltaXCm,
              y: startPos.y + deltaYCm,
              width: origWidth + deltaXCm,
              height: origHeight + deltaYCm,
            };
          }
          return {
            ...el,
            x: startPos.x + deltaXCm,
            y: startPos.y + deltaYCm
          };
        }
        return el;
      }));
    } else {
      // Déplacement simple (un seul élément)
      const movingEl = canvasElements.find(el => el.id === selectedElementId);
      if (movingEl?.type === 'shape' && movingEl?.shape === 'line' && elementStartSize) {
        // Nouveau modèle SVG : x=x1, y=y1, width=x2, height=y2
        // Déplacer les deux extrémités de la même valeur delta
        const updates: Partial<CanvasElement> = {
          x: elementStartPos.x + deltaXCm,
          y: elementStartPos.y + deltaYCm,
          width: elementStartSize.width + deltaXCm,
          height: elementStartSize.height + deltaYCm,
        };
        // Si la ligne a un customPath (courbe), déplacer aussi le point de contrôle
        if (movingEl.customPath) {
          const m = movingEl.customPath.match(/M\s*([\d.\-]+)\s+([\d.\-]+)\s+Q\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)/);
          if (m) {
            // Reconstruire le customPath avec les nouvelles coordonnées (toutes décalées)
            const nx1 = elementStartPos.x + deltaXCm;
            const ny1 = elementStartPos.y + deltaYCm;
            // Point de contrôle original (depuis le state initial)
            const origCtrlX = parseFloat(m[3]);
            const origCtrlY = parseFloat(m[4]);
            // Décalage du point de contrôle = même delta que les extrémités
            const origX1 = parseFloat(m[1]);
            const origY1 = parseFloat(m[2]);
            const ctrlDeltaX = origCtrlX - origX1;
            const ctrlDeltaY = origCtrlY - origY1;
            const newCtrlX = nx1 + ctrlDeltaX;
            const newCtrlY = ny1 + ctrlDeltaY;
            const nx2 = elementStartSize.width + deltaXCm;
            const ny2 = elementStartSize.height + deltaYCm;
            updates.customPath = `M ${nx1} ${ny1} Q ${newCtrlX} ${newCtrlY} ${nx2} ${ny2}`;
          }
        }
        updateCanvasElement(selectedElementId, updates);
      } else {
        updateCanvasElement(selectedElementId, {
          x: elementStartPos.x + deltaXCm,
          y: elementStartPos.y + deltaYCm
        });
      }
    }
  }, [isDragging, isDraggingCtrl, dragStart, elementStartPos, selectedElementId, canvasDimensions.pxPerCm]);
  
  // === LASSO DE SÉLECTION ===
  const handleLassoStart = (e: React.MouseEvent) => {
    // Ne pas démarrer si le détourage est actif
    if (isDetourageActive) return;
    
    // Vérifier que le clic n'est pas sur un élément du canvas (vérifier via data-element-id ou classe)
    const target = e.target as HTMLElement;
    // Remonter le DOM pour vérifier si on a cliqué sur un élément du canvas
    let el: HTMLElement | null = target;
    while (el && el !== e.currentTarget) {
      if (el.getAttribute('data-element-id') || el.getAttribute('data-canvas-element')) {
        return; // On a cliqué sur un élément du canvas, ne pas démarrer le lasso
      }
      el = el.parentElement;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Coordonnées dans le workspace (incluant le décalage de la page blanche)
    // pour être cohérentes avec le positionnement des éléments (pageOffX + el.x * pxPerCm)
    const x = e.clientX - rect.left + canvas.scrollLeft;
    const y = e.clientY - rect.top + canvas.scrollTop;
    
    setIsLassoing(true);
    setLassoStart({ x, y });
    setLassoEnd({ x, y });
    setLassoAdditive(e.ctrlKey || e.metaKey || e.shiftKey);
    
    // Si pas de modificateur, désélectionner tout avant le lasso
    if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
      setSelectedElementIds(new Set());
      setSelectedElementId(null);
      setActiveCanvasPhoto(null);
    }
  };
  
  const handleLassoMove = (e: React.MouseEvent) => {
    if (!isLassoing || !lassoStart) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + canvas.scrollLeft;
    const y = e.clientY - rect.top + canvas.scrollTop;
    
    setLassoEnd({ x, y });
    
    // Calculer le rectangle de sélection en pixels (relatif au canvas/workspace)
    const lassoLeft = Math.min(lassoStart.x, x);
    const lassoTop = Math.min(lassoStart.y, y);
    const lassoRight = Math.max(lassoStart.x, x);
    const lassoBottom = Math.max(lassoStart.y, y);
    
    // Vérifier quels éléments chevauchent le rectangle
    const pxPerCm = canvasDimensions.pxPerCm;
    const pageOffX = canvasDimensions.pageOffsetX;
    const pageOffY = canvasDimensions.pageOffsetY;
    
    const intersecting = new Set<string>();
    canvasElements.forEach(el => {
      if (el.locked) return;
      // Position de l'élément en pixels dans le workspace
      const elLeft = pageOffX + el.x * pxPerCm;
      const elTop = pageOffY + el.y * pxPerCm;
      const elRight = elLeft + el.width * pxPerCm;
      const elBottom = elTop + el.height * pxPerCm;
      
      // Vérifier le chevauchement (intersection de rectangles)
      if (elLeft < lassoRight && elRight > lassoLeft && elTop < lassoBottom && elBottom > lassoTop) {
        intersecting.add(el.id);
      }
    });
    
    // Mettre à jour la sélection en temps réel
    if (lassoAdditive) {
      // Mode additif : ajouter les éléments du lasso à la sélection existante
      setSelectedElementIds(prev => {
        const next = new Set(prev);
        intersecting.forEach(id => next.add(id));
        return next;
      });
    } else {
      setSelectedElementIds(intersecting);
    }
    
    if (intersecting.size > 0) {
      const lastId = Array.from(intersecting).pop()!;
      setSelectedElementId(lastId);
    }
  };
  
  const handleLassoEnd = () => {
    if (isLassoing && lassoStart && lassoEnd) {
      // Afficher un toast si des éléments ont été sélectionnés
      const dx = Math.abs(lassoEnd.x - lassoStart.x);
      const dy = Math.abs(lassoEnd.y - lassoStart.y);
      // Seulement si le lasso a une taille significative (pas juste un clic)
      if (dx > 5 || dy > 5) {
        // Empêcher le onClick de désélectionner après ce lasso
        justFinishedLassoRef.current = true;
        setTimeout(() => { justFinishedLassoRef.current = false; }, 300);
        
        if (selectedElementIds.size > 0) {
          toast.info(language === 'fr' 
            ? `${selectedElementIds.size} élément(s) sélectionné(s)` 
            : `${selectedElementIds.size} element(s) selected`);
        }
      }
    }
    setIsLassoing(false);
    setLassoStart(null);
    setLassoEnd(null);
  };
  
  const handleMouseUp = useCallback(() => {
    // Fin du drag du point de contrôle de la courbe
    if (isDraggingCtrl) {
      setIsDraggingCtrl(false);
      draggingCtrlElementIdRef.current = null;
      setDragStart(null);
      return;
    }
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setDragStart(null);
    setElementStartPos(null);
    setElementStartSize(null);
    setResizeHandle(null);
    setRotationCenterRef(null);
  }, [isDraggingCtrl]);

  // Démarrer la rotation libre
  const handleRotateStart = (e: React.MouseEvent, elementId: string) => {
    if (isLineDrawMode) return;
    const element = canvasElements.find(el => el.id === elementId);
    if (!element || element.locked) return;
    e.preventDefault();
    e.stopPropagation();
    // Centre de l'élément en coordonnées écran
    const pxPerCm = canvasDimensions.pxPerCm;
    const pageLeft = canvasDimensions.pageOffsetX;
    const pageTop  = canvasDimensions.pageOffsetY;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const cx = canvasRect.left + pageLeft + (element.x + element.width  / 2) * pxPerCm;
    const cy = canvasRect.top  + pageTop  + (element.y + element.height / 2) * pxPerCm;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    setIsRotating(true);
    setRotationStartAngle(startAngle);
    setRotationStartValue(element.rotation);
    setRotationCenterRef({ x: cx, y: cy });
    setSelectedElementId(elementId);
  };

  // Appliquer la rotation libre pendant le drag
  const handleRotateMove = useCallback((e: React.MouseEvent) => {
    if (!isRotating || !rotationCenterRef || !selectedElementId) return;
    const currentAngle = Math.atan2(e.clientY - rotationCenterRef.y, e.clientX - rotationCenterRef.x) * (180 / Math.PI);
    let newRotation = rotationStartValue + (currentAngle - rotationStartAngle);
    // Snap à 0°, 90°, 180°, 270° si proche (±5°)
    const snaps = [0, 90, 180, 270, -90, -180, -270, 360, -360];
    for (const snap of snaps) {
      if (Math.abs(newRotation - snap) < 5) { newRotation = snap; break; }
    }
    updateCanvasElement(selectedElementId, { rotation: newRotation % 360 });
  }, [isRotating, rotationCenterRef, selectedElementId, rotationStartAngle, rotationStartValue, updateCanvasElement]);
  
  // Gestion du redimensionnement
  const handleResizeStart = (e: React.MouseEvent, elementId: string, handle: string) => {
    if (isLineDrawMode) return;
    const element = canvasElements.find(el => el.id === elementId);
    if (!element || element.locked) return;

    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStartPos({ x: element.x, y: element.y });
    setElementStartSize({ width: element.width, height: element.height });
  };
  
  const handleResizeMove = useCallback((e: React.MouseEvent) => {
    if (!isResizing || !dragStart || !elementStartSize || !elementStartPos || !selectedElementId || !resizeHandle) return;

    const pxPerCm = canvasDimensions.pxPerCm;
    const deltaXCm = (e.clientX - dragStart.x) / pxPerCm;
    const deltaYCm = (e.clientY - dragStart.y) / pxPerCm;
    const MIN_SIZE_CM = 1;

    // Ratio original de l'élément - toujours conservé pour les poignées de coins
    const aspectRatio = elementStartSize.width / elementStartSize.height;

    // Formes qui doivent rester carrées (ratio 1:1 forcé sur toutes les poignées)
    const selectedEl = canvasElements.find(el => el.id === selectedElementId);
    const isSquareConstrained = selectedEl?.shape === 'round' || selectedEl?.shape === 'square';

    // Touche Maj (Shift) : force le ratio 1:1 sur les formes non-carrées (Rectangle, Ovale, Arche)
    const isShiftForced = e.shiftKey && !isSquareConstrained;

    let newWidth = elementStartSize.width;
    let newHeight = elementStartSize.height;
    let newX = elementStartPos.x;
    let newY = elementStartPos.y;

    // Calculer la nouvelle largeur selon la poignée, puis déduire la hauteur du ratio
    // Ratio effectif : 1:1 si Maj pressé (ou forme Rond/Carré), sinon ratio original
    const effectiveRatio = (isSquareConstrained || isShiftForced) ? 1 : aspectRatio;

    switch (resizeHandle) {
      case 'se': {
        const rawW = elementStartSize.width + deltaXCm;
        const rawH = elementStartSize.height + deltaYCm;
        newWidth = Math.max(MIN_SIZE_CM, Math.abs(deltaXCm) >= Math.abs(deltaYCm) ? rawW : rawH * effectiveRatio);
        newHeight = newWidth / effectiveRatio;
        break;
      }
      case 'sw': {
        const rawW = elementStartSize.width - deltaXCm;
        const rawH = elementStartSize.height + deltaYCm;
        newWidth = Math.max(MIN_SIZE_CM, Math.abs(deltaXCm) >= Math.abs(deltaYCm) ? rawW : rawH * effectiveRatio);
        newHeight = newWidth / effectiveRatio;
        newX = elementStartPos.x + (elementStartSize.width - newWidth);
        break;
      }
      case 'ne': {
        // Pour les lignes (shape='line') : la poignée 'ne' déplace le point d'arrivée (x2, y2)
        // Dans le nouveau modèle SVG : width = x2, height = y2
        if (selectedEl?.shape === 'line') {
          newWidth = elementStartSize.width + deltaXCm;  // x2 = x2_start + deltaX
          newHeight = elementStartSize.height + deltaYCm; // y2 = y2_start + deltaY
          // x/y inchangés : le point de départ (x1, y1) reste fixe
        } else {
          const rawW = elementStartSize.width + deltaXCm;
          const rawH = elementStartSize.height - deltaYCm;
          newWidth = Math.max(MIN_SIZE_CM, Math.abs(deltaXCm) >= Math.abs(deltaYCm) ? rawW : rawH * effectiveRatio);
          newHeight = newWidth / effectiveRatio;
          newY = elementStartPos.y + (elementStartSize.height - newHeight);
        }
        break;
      }
      case 'nw': {
        // Pour les lignes (shape='line') : la poignée 'nw' déplace le point de départ (x1, y1)
        // Dans le nouveau modèle SVG : x = x1, y = y1
        if (selectedEl?.shape === 'line') {
          newX = elementStartPos.x + deltaXCm;  // x1 = x1_start + deltaX
          newY = elementStartPos.y + deltaYCm;  // y1 = y1_start + deltaY
          // width/height inchangés : le point d'arrivée (x2, y2) reste fixe
          newWidth = elementStartSize.width;
          newHeight = elementStartSize.height;
        } else {
          const rawW = elementStartSize.width - deltaXCm;
          const rawH = elementStartSize.height - deltaYCm;
          newWidth = Math.max(MIN_SIZE_CM, Math.abs(deltaXCm) >= Math.abs(deltaYCm) ? rawW : rawH * effectiveRatio);
          newHeight = newWidth / effectiveRatio;
          newX = elementStartPos.x + (elementStartSize.width - newWidth);
          newY = elementStartPos.y + (elementStartSize.height - newHeight);
        }
        break;
      }
      // Poignées de côté - étirement sur un seul axe (ou ratio 1:1 forcé pour Rond/Carré, ou Maj pour les autres)
      case 'n': {
        newHeight = Math.max(MIN_SIZE_CM, elementStartSize.height - deltaYCm);
        newY = elementStartPos.y + (elementStartSize.height - newHeight);
        if (isSquareConstrained || isShiftForced) {
          newWidth = newHeight;
          newX = elementStartPos.x + (elementStartSize.width - newWidth) / 2;
        }
        break;
      }
      case 's': {
        newHeight = Math.max(MIN_SIZE_CM, elementStartSize.height + deltaYCm);
        if (isSquareConstrained || isShiftForced) {
          newWidth = newHeight;
          newX = elementStartPos.x + (elementStartSize.width - newWidth) / 2;
        }
        break;
      }
      case 'w': {
        newWidth = Math.max(MIN_SIZE_CM, elementStartSize.width - deltaXCm);
        newX = elementStartPos.x + (elementStartSize.width - newWidth);
        if (isSquareConstrained || isShiftForced) {
          newHeight = newWidth;
          newY = elementStartPos.y + (elementStartSize.height - newHeight) / 2;
        }
        break;
      }
      case 'e': {
        newWidth = Math.max(MIN_SIZE_CM, elementStartSize.width + deltaXCm);
        if (isSquareConstrained || isShiftForced) {
          newHeight = newWidth;
          newY = elementStartPos.y + (elementStartSize.height - newHeight) / 2;
        }
        break;
      }
    }

    // Si la ligne a un customPath (courbe), mettre à jour les coordonnées dans le path
    const resizingEl = canvasElements.find(el => el.id === selectedElementId);
    let customPathUpdate: string | undefined = undefined;
    if (resizingEl?.shape === 'line' && resizingEl.customPath && (resizeHandle === 'nw' || resizeHandle === 'ne')) {
      const m = resizingEl.customPath.match(/M\s*([\d.\-]+)\s+([\d.\-]+)\s+Q\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)/);
      if (m) {
        const ctrlX = parseFloat(m[3]);
        const ctrlY = parseFloat(m[4]);
        if (resizeHandle === 'nw') {
          // Point de départ déplacé : mettre à jour M et conserver Q et point d'arrivée
          customPathUpdate = `M ${newX} ${newY} Q ${ctrlX} ${ctrlY} ${parseFloat(m[5])} ${parseFloat(m[6])}`;
        } else if (resizeHandle === 'ne') {
          // Point d'arrivée déplacé : conserver M et Q, mettre à jour le point d'arrivée
          customPathUpdate = `M ${parseFloat(m[1])} ${parseFloat(m[2])} Q ${ctrlX} ${ctrlY} ${newWidth} ${Math.max(MIN_SIZE_CM, newHeight)}`;
        }
      }
    } else if (resizingEl?.customPath && resizingEl.shape !== 'line') {
      // Forme avec segments personnalisés : rescaler les coordonnées proportionnellement
      const segs = buildShapeSegments(resizingEl);
      if (segs && segs.length > 0) {
        const oldX = elementStartPos.x;
        const oldY = elementStartPos.y;
        const oldW = elementStartSize.width;
        const oldH = elementStartSize.height;
        const scaleW = newWidth / oldW;
        const scaleH = Math.max(MIN_SIZE_CM, newHeight) / oldH;
        const rescaled = segs.map(seg => {
          const s: Segment = {
            ...seg,
            x1: newX + (seg.x1 - oldX) * scaleW,
            y1: newY + (seg.y1 - oldY) * scaleH,
            x2: newX + (seg.x2 - oldX) * scaleW,
            y2: newY + (seg.y2 - oldY) * scaleH,
          };
          if (seg.type === 'Q' && seg.cx !== undefined && seg.cy !== undefined) {
            s.cx = newX + (seg.cx - oldX) * scaleW;
            s.cy = newY + (seg.cy - oldY) * scaleH;
          }
          return s;
        });
        customPathUpdate = pathFromSegments(rescaled);
      }
    }
    // Contraindre : taille minimale uniquement (laisser l'utilisateur positionner librement)
    newWidth = Math.max(MIN_SIZE_CM, newWidth);
    newHeight = Math.max(MIN_SIZE_CM, newHeight);

    const updatePayload = {
      width: newWidth,
      height: newHeight,
      x: newX,
      y: newY,
      ...(customPathUpdate !== undefined ? { customPath: customPathUpdate } : {}),
    };
    updateCanvasElement(selectedElementId, updatePayload);
  }, [isResizing, dragStart, elementStartSize, elementStartPos, selectedElementId, resizeHandle, canvasDimensions.pxPerCm, canvasElements]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onContextMenu={(e) => {
        // Bloquer la propagation pour empêcher le menu contextuel parent (UniversalAlbumPage)
        e.stopPropagation();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[98vw] max-w-[1600px] h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800">
                  {language === "fr" ? "Créations / Atelier" : "Creations / Workshop"}
                </h2>
                <span className="text-gray-400">•</span>
                <input
                  type="text"
                  value={currentProjectName}
                  onChange={(e) => setCurrentProjectName(e.target.value)}
                  placeholder={language === 'fr' ? 'Nom du collage...' : 'Collage name...'}
                  className="text-lg font-semibold text-purple-600 bg-purple-100 px-3 py-0.5 rounded-full border-0 outline-none focus:ring-2 focus:ring-purple-400 min-w-[150px] max-w-[300px]"
                  title={language === 'fr' ? 'Cliquez pour renommer le collage' : 'Click to rename the collage'}
                />
              </div>
              <p className="text-sm text-gray-500">
                {language === "fr" 
                  ? "Détourage, collage, effets artistiques et mise en page" 
                  : "Cutout, collage, artistic effects and layout"}
              </p>
            </div>
          </div>
          
          {/* Barre d'options */}
          <div className="flex items-center gap-4">
            {/* Format papier - pile de 4 lignes */}
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs text-gray-500">Format:</Label>
              <select
                value={paperFormat.id}
                onChange={(e) => {
                  const selected = PAPER_FORMATS.find(f => f.id === e.target.value) || PAPER_FORMATS[0];
                  if (selected.id === 'custom') {
                    // Appliquer les dimensions personnalisées actuelles et synchroniser les textes
                    setCustomWidthText(String(customWidth));
                    setCustomHeightText(String(customHeight));
                    setPaperFormat({ ...selected, width: customWidth, height: customHeight });
                  } else {
                    setPaperFormat(selected);
                  }
                }}
                className="text-sm border rounded px-2 py-1"
              >
                {PAPER_FORMATS.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
              {/* Champs de saisie pour le format personnalisé */}
              {paperFormat.id === 'custom' && (
                <div className="flex items-center gap-1 mt-1">
                  {/* Champ Largeur : saisie libre via état texte, validation à onBlur/Enter */}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customWidthText}
                    onChange={(e) => {
                      // Autoriser uniquement les chiffres, virgule et point
                      const raw = e.target.value.replace(',', '.');
                      if (/^\d{0,3}(\.\d{0,1})?$/.test(raw)) {
                        setCustomWidthText(raw);
                      }
                    }}
                    onBlur={() => {
                      const v = Math.min(100, Math.max(5, parseFloat(customWidthText) || customWidth));
                      const rounded = Math.round(v * 10) / 10;
                      setCustomWidthText(String(rounded));
                      setCustomWidth(rounded);
                      if (lockAspectRatio && customWidth > 0) {
                        const ratio = customHeight / customWidth;
                        const newH = Math.min(100, Math.max(5, Math.round(rounded * ratio * 10) / 10));
                        setCustomHeight(newH);
                        setCustomHeightText(String(newH));
                        setPaperFormat(f => ({ ...f, width: rounded, height: newH }));
                      } else {
                        setPaperFormat(f => ({ ...f, width: rounded }));
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-14 text-xs border rounded px-1 py-0.5 text-center"
                    placeholder="L"
                    title={language === 'fr' ? 'Largeur en cm (5–100)' : 'Width in cm (5–100)'}
                  />
                  {/* Cadenas de verrouillage des proportions */}
                  <button
                    type="button"
                    onClick={() => setLockAspectRatio(v => !v)}
                    className={`p-0.5 rounded transition-colors ${
                      lockAspectRatio
                        ? 'text-purple-600 bg-purple-50 border border-purple-200'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={
                      lockAspectRatio
                        ? (language === 'fr' ? 'Proportions verrouillées' : 'Proportions locked')
                        : (language === 'fr' ? 'Proportions libres' : 'Free proportions')
                    }
                  >
                    {lockAspectRatio
                      ? <Lock className="w-3 h-3" />
                      : <Unlock className="w-3 h-3" />}
                  </button>
                  {/* Champ Hauteur : saisie libre via état texte, validation à onBlur/Enter */}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customHeightText}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (/^\d{0,3}(\.\d{0,1})?$/.test(raw)) {
                        setCustomHeightText(raw);
                      }
                    }}
                    onBlur={() => {
                      const v = Math.min(100, Math.max(5, parseFloat(customHeightText) || customHeight));
                      const rounded = Math.round(v * 10) / 10;
                      setCustomHeightText(String(rounded));
                      setCustomHeight(rounded);
                      if (lockAspectRatio && customHeight > 0) {
                        const ratio = customWidth / customHeight;
                        const newW = Math.min(100, Math.max(5, Math.round(rounded * ratio * 10) / 10));
                        setCustomWidth(newW);
                        setCustomWidthText(String(newW));
                        setPaperFormat(f => ({ ...f, width: newW, height: rounded }));
                      } else {
                        setPaperFormat(f => ({ ...f, height: rounded }));
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-14 text-xs border rounded px-1 py-0.5 text-center"
                    placeholder="H"
                    title={language === 'fr' ? 'Hauteur en cm (5–100)' : 'Height in cm (5–100)'}
                  />
                  <span className="text-xs text-gray-400">cm</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Label className="text-xs text-gray-500">Dimension:</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-5 w-5 p-0 ${lockAspectRatio ? 'text-purple-600' : 'text-gray-400'}`}
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  title={lockAspectRatio ? (language === 'fr' ? "Proportions verrouillées (cliquez pour déverrouiller)" : "Proportions locked (click to unlock)") : (language === 'fr' ? "Proportions libres (cliquez pour verrouiller)" : "Free proportions (click to lock)")}
                >
                  {lockAspectRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </Button>
              </div>
              {(() => {
                const selectedElement = selectedElementId ? canvasElements.find(el => el.id === selectedElementId) : null;
                if (selectedElement) {
                  // Les dimensions sont stockées en cm
                  const aspectRatio = selectedElement.width / selectedElement.height;
                  // Vérifier si la photo est verrouillée (cadenas rouge) OU si les proportions sont verrouillées (cadenas dimensions)
                  const isLocked = selectedElement.locked || lockAspectRatio;
                  
                  const handleWidthChange = (newWidthStr: string) => {
                    const newWidth = parseFloat(newWidthStr);
                    if (isNaN(newWidth) || newWidth <= 0) return;
                    
                    if (isLocked) {
                      // Photo verrouillée OU cadenas dimensions fermé : pas de modification
                      return;
                    }
                    // Cadenas OUVERT : modifier uniquement la largeur
                    updateCanvasElement(selectedElement.id, { width: newWidth });
                  };
                  
                  const handleHeightChange = (newHeightStr: string) => {
                    const newHeight = parseFloat(newHeightStr);
                    if (isNaN(newHeight) || newHeight <= 0) return;
                    
                    if (isLocked) {
                      // Photo verrouillée OU cadenas dimensions fermé : pas de modification
                      return;
                    }
                    // Cadenas OUVERT : modifier uniquement la hauteur
                    updateCanvasElement(selectedElement.id, { height: newHeight });
                  };
                  
                  // Déterminer le message du tooltip
                  const getTooltip = (field: string) => {
                    if (selectedElement.locked) return language === 'fr' ? "Photo verrouillée - cliquez sur le cadenas orange pour déverrouiller" : "Photo locked - click the orange padlock to unlock";
                    if (lockAspectRatio) return language === 'fr' ? "Cadenas fermé - cliquez sur le cadenas violet pour déverrouiller" : "Lock closed - click the purple padlock to unlock";
                    return field === "width" ? (language === 'fr' ? "Largeur en cm" : "Width in cm") : (language === 'fr' ? "Hauteur en cm" : "Height in cm");
                  };
                  
                  return (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={elemDimEditing === 'width' ? elemWidthText : selectedElement.width.toFixed(1)}
                        onFocus={(e) => {
                          setElemWidthText(selectedElement.width.toFixed(1));
                          setElemDimEditing('width');
                          requestAnimationFrame(() => e.target.select());
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.');
                          if (/^\d{0,3}(\.\d{0,1})?$/.test(raw)) {
                            setElemWidthText(raw);
                          }
                        }}
                        onBlur={() => {
                          setElemDimEditing(null);
                          handleWidthChange(elemWidthText);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        disabled={isLocked}
                        className={`w-12 h-5 text-xs text-center border rounded font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 ${isLocked ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-purple-300 bg-purple-50 text-purple-700'}`}
                        title={getTooltip("width")}
                      />
                      <span className="text-gray-400 text-xs">×</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={elemDimEditing === 'height' ? elemHeightText : selectedElement.height.toFixed(1)}
                        onFocus={(e) => {
                          setElemHeightText(selectedElement.height.toFixed(1));
                          setElemDimEditing('height');
                          requestAnimationFrame(() => e.target.select());
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.');
                          if (/^\d{0,3}(\.\d{0,1})?$/.test(raw)) {
                            setElemHeightText(raw);
                          }
                        }}
                        onBlur={() => {
                          setElemDimEditing(null);
                          handleHeightChange(elemHeightText);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        disabled={isLocked}
                        className={`w-12 h-5 text-xs text-center border rounded font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 ${isLocked ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-purple-300 bg-purple-50 text-purple-700'}`}
                        title={getTooltip("height")}
                      />
                      <span className="text-purple-600 text-xs font-medium">cm</span>
                    </div>
                  );
                } else {
                  // Pas de photo sélectionnée - afficher un message
                  return (
                    <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap italic">
                      Aucune photo
                    </span>
                  );
                }
              })()}
            </div>
            
            {/* Orientation - empilé verticalement */}
            <div className="flex flex-col gap-0.5">
              <Button
                variant={orientation === "portrait" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrientation("portrait")}
                className={`text-xs px-3 h-6 ${orientation === "portrait" ? "bg-blue-600 text-white" : "text-gray-900 bg-white border-gray-300 hover:bg-gray-50"}`}
              >
                Portrait
              </Button>
              <Button
                variant={orientation === "landscape" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrientation("landscape")}
                className={`text-xs px-3 h-6 ${orientation === "landscape" ? "bg-blue-600 text-white" : "text-gray-900 bg-white border-gray-300 hover:bg-gray-50"}`}
              >
                Paysage
              </Button>
            </div>
            
            {/* Zoom Image et Dimensions de l'image - empilés verticalement */}
            <div className="flex flex-col gap-1">
              {/* Zoom Image (pour le découpage de précision) */}
              <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{language === "fr" ? "Zoom image:" : "Image zoom:"}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => setImageZoom(Math.max(10, imageZoom - 10))}
                disabled={!selectedElementId}
                title={language === "fr" ? "Réduire l'image" : "Reduce image"}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs w-14 text-center font-medium">{imageZoom}%</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => setImageZoom(Math.min(500, imageZoom + 10))}
                disabled={!selectedElementId}
                title={language === "fr" ? "Agrandir l'image" : "Enlarge image"}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs px-2" 
                onClick={() => setImageZoom(100)}
                disabled={!selectedElementId}
                title={language === "fr" ? "Taille réelle" : "Actual size"}
              >
                100%
              </Button>
              </div>
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
              {/* Toggle crop marks (croix de repérage d'imprimerie) */}
              <div className="flex items-center gap-1" title={"Croix de repérage (crop marks)"}
              >
                <Switch id="cropmarks" checked={showCropMarks} onCheckedChange={setShowCropMarks} className="scale-75" />
                <Label htmlFor="cropmarks" className="text-xs cursor-pointer">
                  {/* Icône : croix avec tirets (imprimerie) */}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="8" y1="0" x2="8" y2="5" />
                    <line x1="8" y1="11" x2="8" y2="16" />
                    <line x1="0" y1="8" x2="5" y2="8" />
                    <line x1="11" y1="8" x2="16" y2="8" />
                    <circle cx="8" cy="8" r="2" />
                  </svg>
                </Label>
              </div>
            </div>
            
            <Button variant="outline" size="sm" className="gap-1" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              {language === "fr" ? "Réinitialiser" : "Reset"}
            </Button>
          </div>
          
          <Button variant="ghost" size="icon" onClick={handleRequestClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Contenu principal : 4 zones */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ZONE 1 : Onglets verticaux + Zone Outils */}
          <div className="w-80 bg-gray-50 border-r flex flex-col">
            {/* Onglets principaux - z-10 pour rester au-dessus du ScrollArea */}
            <div className="flex border-b bg-white relative z-10 flex-shrink-0">
              {/* Onglet Détourage */}
              <button
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeMainTab === "detourage" 
                    ? "bg-purple-100 text-purple-700 border-b-2 border-purple-500" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveMainTab("detourage")}
              >
                <Scissors className="w-4 h-4" />
                {language === "fr" ? "Détourage" : "Cutout"}
              </button>
              
              {/* Onglet Assemblage */}
              <button
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeMainTab === "assemblage" 
                    ? "bg-purple-100 text-purple-700 border-b-2 border-purple-500" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveMainTab("assemblage")}
              >
                <Wrench className="w-4 h-4" />
                {language === "fr" ? "Assemblage" : "Assembly"}
              </button>
            </div>
            
{/* Barre de sous-onglets supprimée - remplacée par l'accordéon AssemblagePanel */}
            
            {/* Zone Outils - overflow-y-auto + min-h-0 garantit le défilement dans un flex-col */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4">
                {activeMainTab === "detourage" && (
                  <>
                    <DetourageToolsPanel
                      activePhoto={activeCanvasPhoto}
                      selectedElementId={selectedElementId}
                      onDetourageComplete={(result, name) => {
                        addToCollector(result, name, "detourage");
                      }}
                      onApplyDetourageToElement={(elementId, detourageResult) => {
                        // Appliquer le détourage directement sur l'élément sélectionné
                        updateCanvasElement(elementId, { src: detourageResult });
                      }}
                      onModeChange={(mode, tool) => {
                        // "Point par point" (polygon) → ouvrir TestCanvas dans un nouvel onglet
                        if (mode === "manual" && tool === "polygon") {
                          const selectedEl = selectedElementId ? canvasElements.find(el => el.id === selectedElementId) : null;
                          const src = selectedEl?.src
                            || activeCanvasPhoto
                            || canvasElements.find(el => el.type === "image" && el.src)?.src
                            || null;
                          const eid = selectedEl?.src ? selectedElementId
                            : !activeCanvasPhoto ? canvasElements.find(el => el.type === "image" && el.src)?.id || null
                            : selectedElementId;
                          if (!src) {
                            toast.error(language === "fr"
                              ? "Ajoutez d'abord une image sur le canvas"
                              : "Add an image to the canvas first");
                            return;
                          }
                          localStorage.setItem("detourage-image", JSON.stringify({ src, elementId: eid }));
                          window.open('/test-canvas', '_blank');
                          return;
                        }
                        // Autres modes/outils : juste mettre à jour l'état
                        setDetourageMode(mode);
                        setManualTool(tool);
                        setDetouragePoints([]);
                        setIsDetourageActive(mode === "manual" && tool !== "polygon");
                      }}
                    />
                    
                    {/* Boutons de contrôle du détourage manuel */}
                    {isDetourageActive && manualTool === "polygon" && detouragePoints.length > 0 && (
                      <div className="mt-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
                        <p className="text-sm text-violet-700 mb-2 font-medium">
                          {language === 'fr' ? <>{detouragePoints.length} point{detouragePoints.length > 1 ? 's' : ''} placé{detouragePoints.length > 1 ? 's' : ''}</> : <>{detouragePoints.length} point{detouragePoints.length > 1 ? 's' : ''} placed</>}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Annuler le dernier point
                              setDetouragePoints(prev => prev.slice(0, -1));
                            }}
                            className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            {language === 'fr' ? '← Annuler' : '← Undo'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Réinitialiser tous les points
                              setDetouragePoints([]);
                              toast.info(language === "fr" ? "Tracé réinitialisé" : "Trace reset");
                            }}
                            className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            {language === 'fr' ? '↻ Réinitialiser' : '↻ Reset'}
                          </Button>
                        </div>
                        {detouragePoints.length >= 3 && (
                          <p className="text-xs text-green-600 mt-2">
                            {language === 'fr' ? '🟢 Cliquez sur le point vert pour fermer la sélection' : '🟢 Click on the green point to close the selection'}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {activeMainTab === "assemblage" && (
                  <AssemblagePanel
                    canvasFormat={{
                      width: orientation === "portrait" ? paperFormat.width : paperFormat.height,
                      height: orientation === "portrait" ? paperFormat.height : paperFormat.width,
                      label: paperFormat.label,
                    }}
                    activeCanvasPhoto={activeCanvasPhoto}
                    onAddToCanvas={(src, name) => addToCanvas(src, name)}
                    onApplyEffect={(newSrc) => {
                      if (selectedElementId) {
                        updateCanvasElement(selectedElementId, { src: newSrc });
                        setActiveCanvasPhoto(newSrc);
                      }
                    }}
                    onAddPassePartout={(data: PassePartoutData) => {
                      /**
                       * Génère le passe-partout en deux passes :
                       *   1. Couleur de fond (toujours présente)
                       *   2. Motif par-dessus avec l'opacité choisie (si fourni)
                       * Puis découpe l'ouverture via destination-out.
                       * Le résultat est ajouté au canvas avec zIndex=1 (arrière-plan).
                       */
                      const PX = 96 / 2.54; // 96 DPI en px/cm
                      const ppW = Math.round(data.formatWidth * PX);
                      const ppH = Math.round(data.formatHeight * PX);

                      const renderAndAdd = (patternImg: HTMLImageElement | null) => {
                        const ppCanvas = document.createElement("canvas");
                        ppCanvas.width = ppW;
                        ppCanvas.height = ppH;
                        const ctx = ppCanvas.getContext("2d")!;

                        // Calculer les coordonnées de l'ouverture intérieure
                        const innerW = data.openingWidthCm != null ? data.openingWidthCm * PX : ppW - data.borderWidthCm * PX * 2;
                        const innerH = data.openingHeightCm != null ? data.openingHeightCm * PX : ppH - data.borderWidthCm * PX * 2;
                        const innerX = (ppW - innerW) / 2;
                        const innerY = (ppH - innerH) / 2;

                        // Logique de rendu selon la cible (intérieur ou extérieur) :
                        //
                        // Mode EXTERIEUR (défaut) :
                        //   1. Peindre couleur/motif sur tout le canvas
                        //   2. Découper l'ouverture (destination-out) → la zone intérieure devient transparente
                        //   Résultat : bordure colorée/motifée, ouverture transparente
                        //
                        // Mode INTERIEUR :
                        //   1. Découper l'ouverture (destination-out) → zone intérieure transparente
                        //   2. Peindre couleur/motif avec destination-over → ne remplit QUE la zone transparente
                        //   Résultat : bordure transparente, ouverture colorée/motifée

                        const isInterieur =
                          data.colorTarget === "interieur" || data.patternTarget === "interieur";

                        if (!isInterieur) {
                          // --- Mode EXTERIEUR ---
                          // Passe 0 : fond blanc opaque pour éviter la transparence du canvas 2D
                          // Sans ce fond, les pixels non couverts par la couleur/motif seraient
                          // transparents et laisseraient voir le fond gris du canvas principal.
                          ctx.fillStyle = "#ffffff";
                          ctx.fillRect(0, 0, ppW, ppH);
                          // Passe 1 : couleur de fond sur tout le canvas
                          if (data.borderColor && data.borderColor !== "transparent") {
                            ctx.fillStyle = data.borderColor;
                            ctx.fillRect(0, 0, ppW, ppH);
                          }
                          // Passe 2 : motif par-dessus
                          if (patternImg) {
                            const pat = ctx.createPattern(patternImg, "repeat");
                            if (pat) {
                              ctx.globalAlpha = (data.patternOpacity ?? 100) / 100;
                              ctx.fillStyle = pat;
                              ctx.fillRect(0, 0, ppW, ppH);
                              ctx.globalAlpha = 1;
                            }
                          }
                          // Passe 3 : découper l'ouverture
                          drawOpening(ctx, ppW, ppH, data, PX);
                        } else {
                          // --- Mode INTERIEUR ---
                          // Passe 1 : découper l'ouverture (crée une zone transparente)
                          drawOpening(ctx, ppW, ppH, data, PX);
                          // Passe 2 : peindre couleur dans la zone transparente (destination-over)
                          ctx.globalCompositeOperation = "destination-over";
                          if (data.colorTarget === "interieur" && data.borderColor && data.borderColor !== "transparent") {
                            ctx.fillStyle = data.borderColor;
                            ctx.fillRect(0, 0, ppW, ppH);
                          }
                          // Passe 3 : motif dans la zone transparente (destination-over)
                          if (data.patternTarget === "interieur" && patternImg) {
                            const pat = ctx.createPattern(patternImg, "repeat");
                            if (pat) {
                              ctx.globalAlpha = (data.patternOpacity ?? 100) / 100;
                              ctx.fillStyle = pat;
                              ctx.fillRect(0, 0, ppW, ppH);
                              ctx.globalAlpha = 1;
                            }
                          }
                          ctx.globalCompositeOperation = "source-over";
                        }

                        // Ajouter au canvas avec zIndex=1 (arrière-plan)
                        const src = ppCanvas.toDataURL("image/png");
                        const name = language === "fr" ? "Passe-partout" : "Mat frame";
                        const img = document.createElement("img");
                        img.onload = () => {
                          // Mémoriser les paramètres pour les remplacements partiels ultérieurs
                          lastPassePartoutParamsRef.current = data;
                          const formatW = orientation === "portrait" ? paperFormat.width : paperFormat.height;
                          const formatH = orientation === "portrait" ? paperFormat.height : paperFormat.width;
                          const newEl: CanvasElement = {
                            id: `element-${Date.now()}`,
                            type: "image",
                            src,
                            x: 0,
                            y: 0,
                            width: formatW,
                            height: formatH,
                            rotation: 0,
                            zIndex: 1,
                            opacity: 1,
                            name,
                            originalWidthPx: img.naturalWidth,
                            originalHeightPx: img.naturalHeight,
                          };
                          if (replaceTargetId) {
                            // Mode remplacement : substituer l'élément existant en conservant sa position
                            setCanvasElements(prev => prev.map(el =>
                              el.id === replaceTargetId
                                ? { ...newEl, id: replaceTargetId, x: el.x, y: el.y, zIndex: el.zIndex }
                                : el
                            ));
                            setSelectedElementId(replaceTargetId);
                            setReplaceTargetId(null);
                            toast.success(language === "fr" ? "Passe-partout remplacé" : "Mat frame replaced");
                          } else {
                            // Mode ajout normal : insérer en arrière-plan (zIndex=1)
                            setCanvasElements(prev => [
                              newEl,
                              ...prev.map(el => ({ ...el, zIndex: el.zIndex + 1 })),
                            ]);
                            setSelectedElementId(newEl.id);
                          }
                        };
                        img.src = src;
                      };

                      if (data.patternSrc) {
                        const patImg = new window.Image();
                        patImg.onload = () => renderAndAdd(patImg);
                        patImg.onerror = () => renderAndAdd(null);
                        patImg.src = data.patternSrc;
                      } else {
                        renderAndAdd(null);
                      }
                    }}
                    hasExistingPassePartout={canvasElements.some(el => el.name === "Passe-partout" || el.name === "Mat frame")}
                    hasExistingBackground={canvasElements.some(el => el.name === (language === 'fr' ? 'Fond' : 'Background'))}
                    onRemoveBackground={() => {
                      setCanvasElements(prev => prev.filter(el => el.name !== (language === 'fr' ? 'Fond' : 'Background')));
                    }}
                    onReplacePassePartout={(data: PassePartoutData) => {
                      // Supprimer tous les passe-partouts existants puis ajouter le nouveau
                      const existingIds = canvasElements
                        .filter(el => el.name === "Passe-partout" || el.name === "Mat frame")
                        .map(el => el.id);
                      setCanvasElements(prev => prev.filter(el => !existingIds.includes(el.id)));
                      // Lancer le rendu du nouveau passe-partout via onAddPassePartout
                      const PX = 96 / 2.54;
                      const ppW = Math.round(data.formatWidth * PX);
                      const ppH = Math.round(data.formatHeight * PX);
                      const renderAndReplace = (patternImg: HTMLImageElement | null) => {
                        const ppCanvas = document.createElement("canvas");
                        ppCanvas.width = ppW;
                        ppCanvas.height = ppH;
                        const ctx = ppCanvas.getContext("2d")!;
                        const innerW = data.openingWidthCm != null ? data.openingWidthCm * PX : ppW - data.borderWidthCm * PX * 2;
                        const innerH = data.openingHeightCm != null ? data.openingHeightCm * PX : ppH - data.borderWidthCm * PX * 2;
                        const isInterieur = data.colorTarget === "interieur" || data.patternTarget === "interieur";
                        if (!isInterieur) {
                          ctx.fillStyle = "#ffffff";
                          ctx.fillRect(0, 0, ppW, ppH);
                          if (data.borderColor && data.borderColor !== "transparent") {
                            ctx.fillStyle = data.borderColor;
                            ctx.fillRect(0, 0, ppW, ppH);
                          }
                          if (patternImg) {
                            const pat = ctx.createPattern(patternImg, "repeat");
                            if (pat) { ctx.globalAlpha = (data.patternOpacity ?? 100) / 100; ctx.fillStyle = pat; ctx.fillRect(0, 0, ppW, ppH); ctx.globalAlpha = 1; }
                          }
                          drawOpening(ctx, ppW, ppH, data, PX);
                        } else {
                          drawOpening(ctx, ppW, ppH, data, PX);
                          ctx.globalCompositeOperation = "destination-over";
                          if (data.colorTarget === "interieur" && data.borderColor && data.borderColor !== "transparent") { ctx.fillStyle = data.borderColor; ctx.fillRect(0, 0, ppW, ppH); }
                          if (data.patternTarget === "interieur" && patternImg) {
                            const pat = ctx.createPattern(patternImg, "repeat");
                            if (pat) { ctx.globalAlpha = (data.patternOpacity ?? 100) / 100; ctx.fillStyle = pat; ctx.fillRect(0, 0, ppW, ppH); ctx.globalAlpha = 1; }
                          }
                          ctx.globalCompositeOperation = "source-over";
                        }
                        const src = ppCanvas.toDataURL("image/png");
                        const name = language === "fr" ? "Passe-partout" : "Mat frame";
                        const img = document.createElement("img");
                        img.onload = () => {
                          const formatW = orientation === "portrait" ? paperFormat.width : paperFormat.height;
                          const formatH = orientation === "portrait" ? paperFormat.height : paperFormat.width;
                          const newEl: CanvasElement = { id: `element-${Date.now()}`, type: "image", src, x: 0, y: 0, width: formatW, height: formatH, rotation: 0, zIndex: 1, opacity: 1, name, originalWidthPx: img.naturalWidth, originalHeightPx: img.naturalHeight };
                          setCanvasElements(prev => [newEl, ...prev.map(el => ({ ...el, zIndex: el.zIndex + 1 }))]);
                          setSelectedElementId(newEl.id);
                          toast.success(language === "fr" ? "Passe-partout remplacé" : "Mat frame replaced");
                        };
                        img.src = src;
                      };
                      if (data.patternSrc) { const patImg = new window.Image(); patImg.onload = () => renderAndReplace(patImg); patImg.onerror = () => renderAndReplace(null); patImg.src = data.patternSrc; } else { renderAndReplace(null); }
                    }}
                    onReplaceColorOnly={(newColor: string, newTarget: "exterieur" | "interieur") => {
                      // Remplace uniquement la couleur en conservant la découpe et le motif existants
                      const stored = lastPassePartoutParamsRef.current;
                      if (!stored) return;
                      const mergedData: PassePartoutData = {
                        ...stored,
                        borderColor: newColor,
                        colorTarget: newTarget,
                      };
                      const PX = 96 / 2.54;
                      const ppW = Math.round(mergedData.formatWidth * PX);
                      const ppH = Math.round(mergedData.formatHeight * PX);
                      const renderAndReplaceColor = (patternImg: HTMLImageElement | null) => {
                        const ppCanvas = document.createElement("canvas");
                        ppCanvas.width = ppW;
                        ppCanvas.height = ppH;
                        const ctx = ppCanvas.getContext("2d")!;
                        const isInterieur = newTarget === "interieur";
                        if (!isInterieur) {
                          ctx.fillStyle = "#ffffff";
                          ctx.fillRect(0, 0, ppW, ppH);
                          if (newColor && newColor !== "transparent") {
                            ctx.fillStyle = newColor;
                            ctx.fillRect(0, 0, ppW, ppH);
                          }
                          if (patternImg) {
                            const pat = ctx.createPattern(patternImg, "repeat");
                            if (pat) { ctx.globalAlpha = (mergedData.patternOpacity ?? 100) / 100; ctx.fillStyle = pat; ctx.fillRect(0, 0, ppW, ppH); ctx.globalAlpha = 1; }
                          }
                          drawOpening(ctx, ppW, ppH, mergedData, PX);
                        } else {
                          drawOpening(ctx, ppW, ppH, mergedData, PX);
                          ctx.globalCompositeOperation = "destination-over";
                          if (newColor && newColor !== "transparent") { ctx.fillStyle = newColor; ctx.fillRect(0, 0, ppW, ppH); }
                          if (patternImg) {
                            const pat = ctx.createPattern(patternImg, "repeat");
                            if (pat) { ctx.globalAlpha = (mergedData.patternOpacity ?? 100) / 100; ctx.fillStyle = pat; ctx.fillRect(0, 0, ppW, ppH); ctx.globalAlpha = 1; }
                          }
                          ctx.globalCompositeOperation = "source-over";
                        }
                        const src = ppCanvas.toDataURL("image/png");
                        const img = document.createElement("img");
                        img.onload = () => {
                          lastPassePartoutParamsRef.current = mergedData;
                          const existing = canvasElements.find(el => el.name === "Passe-partout" || el.name === "Mat frame");
                          if (existing) {
                            setCanvasElements(prev => prev.map(el =>
                              (el.name === "Passe-partout" || el.name === "Mat frame")
                                ? { ...el, src, originalWidthPx: img.naturalWidth, originalHeightPx: img.naturalHeight }
                                : el
                            ));
                          }
                          toast.success(language === "fr" ? "Couleur remplacée" : "Color replaced");
                        };
                        img.src = src;
                      };
                      if (mergedData.patternSrc) { const patImg = new window.Image(); patImg.onload = () => renderAndReplaceColor(patImg); patImg.onerror = () => renderAndReplaceColor(null); patImg.src = mergedData.patternSrc; } else { renderAndReplaceColor(null); }
                    }}
                    onReplacePatternOnly={(newPatternSrc: string, newOpacity: number, newTarget: "exterieur" | "interieur") => {
                      // Remplace uniquement le motif en conservant la découpe et la couleur existantes
                      const stored = lastPassePartoutParamsRef.current;
                      if (!stored) return;
                      const mergedData: PassePartoutData = {
                        ...stored,
                        patternSrc: newPatternSrc,
                        patternOpacity: newOpacity,
                        patternTarget: newTarget,
                      };
                      const PX = 96 / 2.54;
                      const ppW = Math.round(mergedData.formatWidth * PX);
                      const ppH = Math.round(mergedData.formatHeight * PX);
                      const renderAndReplacePattern = (patternImg: HTMLImageElement | null) => {
                        const ppCanvas = document.createElement("canvas");
                        ppCanvas.width = ppW;
                        ppCanvas.height = ppH;
                        const ctx = ppCanvas.getContext("2d")!;
                        const isInterieur = newTarget === "interieur" || mergedData.colorTarget === "interieur";
                        if (!isInterieur) {
                          ctx.fillStyle = "#ffffff";
                          ctx.fillRect(0, 0, ppW, ppH);
                          if (mergedData.borderColor && mergedData.borderColor !== "transparent") {
                            ctx.fillStyle = mergedData.borderColor;
                            ctx.fillRect(0, 0, ppW, ppH);
                          }
                          if (patternImg) {
                            const pat = ctx.createPattern(patternImg, "repeat");
                            if (pat) { ctx.globalAlpha = newOpacity / 100; ctx.fillStyle = pat; ctx.fillRect(0, 0, ppW, ppH); ctx.globalAlpha = 1; }
                          }
                          drawOpening(ctx, ppW, ppH, mergedData, PX);
                        } else {
                          drawOpening(ctx, ppW, ppH, mergedData, PX);
                          ctx.globalCompositeOperation = "destination-over";
                          if (mergedData.colorTarget === "interieur" && mergedData.borderColor && mergedData.borderColor !== "transparent") { ctx.fillStyle = mergedData.borderColor; ctx.fillRect(0, 0, ppW, ppH); }
                          if (patternImg) {
                            const pat = ctx.createPattern(patternImg, "repeat");
                            if (pat) { ctx.globalAlpha = newOpacity / 100; ctx.fillStyle = pat; ctx.fillRect(0, 0, ppW, ppH); ctx.globalAlpha = 1; }
                          }
                          ctx.globalCompositeOperation = "source-over";
                        }
                        const src = ppCanvas.toDataURL("image/png");
                        const img = document.createElement("img");
                        img.onload = () => {
                          lastPassePartoutParamsRef.current = mergedData;
                          setCanvasElements(prev => prev.map(el =>
                            (el.name === "Passe-partout" || el.name === "Mat frame")
                              ? { ...el, src, originalWidthPx: img.naturalWidth, originalHeightPx: img.naturalHeight }
                              : el
                          ));
                          toast.success(language === "fr" ? "Motif remplacé" : "Pattern replaced");
                        };
                        img.src = src;
                      };
                      if (newPatternSrc) { const patImg = new window.Image(); patImg.onload = () => renderAndReplacePattern(patImg); patImg.onerror = () => renderAndReplacePattern(null); patImg.src = newPatternSrc; } else { renderAndReplacePattern(null); }
                    }}
                    onAddTextToCanvas={(textProps) => {
                      const newEl: CanvasElement = {
                        id: `text-${Date.now()}`,
                        type: "text",
                        text: textProps.text,
                        x: 1,
                        y: 1,
                        width: 10,
                        height: 3,
                        rotation: 0,
                        zIndex: canvasElements.length + 1,
                        opacity: 1,
                        name: "Texte",
                        fontFamily: textProps.fontFamily,
                        fontSize: textProps.fontSize,
                        fontColor: textProps.fontColor,
                        fontBold: textProps.fontBold,
                        fontItalic: textProps.fontItalic,
                        fontUnderline: textProps.fontUnderline,
                        textAlign: textProps.textAlign,
                        strokeColor: textProps.strokeColor,
                        strokeWidth: textProps.strokeWidth,
                        shadowColor: textProps.shadowColor,
                        shadowBlur: textProps.shadowBlur,
                        shadowOffsetX: textProps.shadowOffsetX,
                        shadowOffsetY: textProps.shadowOffsetY,
                      };
                      setCanvasElements(prev => [...prev, newEl]);
                      setSelectedElementId(newEl.id);
                    }}
                    selectedTextElement={(() => {
                      if (!selectedElementId) return null;
                      const el = canvasElements.find(e => e.id === selectedElementId && e.type === 'text');
                      if (!el) return null;
                      return {
                        id: el.id,
                        text: el.text || '',
                        fontFamily: el.fontFamily || 'Playfair Display',
                        fontSize: el.fontSize || 36,
                        fontColor: el.fontColor || '#1a1a1a',
                        fontBold: el.fontBold || false,
                        fontItalic: el.fontItalic || false,
                        fontUnderline: el.fontUnderline || false,
                        textAlign: (el.textAlign as 'left' | 'center' | 'right') || 'center',
                        strokeColor: el.strokeColor || '#000000',
                        strokeWidth: el.strokeWidth || 0,
                        shadowColor: el.shadowColor || 'rgba(0,0,0,0.5)',
                        shadowBlur: el.shadowBlur || 0,
                        shadowOffsetX: el.shadowOffsetX || 2,
                        shadowOffsetY: el.shadowOffsetY || 2,
                      };
                    })()}
                    onUpdateTextElement={(id, textProps) => {
                      setCanvasElements(prev => prev.map(el =>
                        el.id === id ? {
                          ...el,
                          text: textProps.text,
                          fontFamily: textProps.fontFamily,
                          fontSize: textProps.fontSize,
                          fontColor: textProps.fontColor,
                          fontBold: textProps.fontBold,
                          fontItalic: textProps.fontItalic,
                          fontUnderline: textProps.fontUnderline,
                          textAlign: textProps.textAlign,
                          strokeColor: textProps.strokeColor,
                          strokeWidth: textProps.strokeWidth,
                          shadowColor: textProps.shadowColor,
                          shadowBlur: textProps.shadowBlur,
                          shadowOffsetX: textProps.shadowOffsetX,
                          shadowOffsetY: textProps.shadowOffsetY,
                        } : el
                      ));
                    }}
                    // --- Découpes interactives : placement direct, pas de validation ---
                    isCutMode={isCutMode}
                    onToggleCutMode={() => {
                      setIsCutMode(prev => !prev);
                      setCutStart(null);
                      setCutEnd(null);
                    }}
                    isLineDrawMode={isLineDrawMode}
                    onToggleLineDrawMode={() => {
                      setIsLineDrawMode(prev => !prev);
                      // Réinitialiser la ref synchrone EN PREMIER (avant le state)
                      lineDrawStartRef.current = null;
                      lineDrawEndRef.current = null;
                      setLineDrawStart(null);
                      setLineDrawEnd(null);
                      // Réinitialiser la chaîne de segments en cours
                      setLineChainFirstPoint(null);
                      finalizeLineChain();
                      lineChainSegmentIdsRef.current = [];
                    }}
                    lineSelected={!!selectedElementId && canvasElements.find(e => e.id === selectedElementId)?.shape === 'line'}
                    lineIsRounded={!!selectedElementId && !!(canvasElements.find(e => e.id === selectedElementId)?.customPath)}
                    lineChainCount={lineChainSegmentIdsRef.current.length}
                    lineColor={lineDrawColor}
                    onLineColorChange={setLineDrawColor}
                    lineStrokeWidth={lineDrawStrokeWidth}
                    onLineStrokeWidthChange={setLineDrawStrokeWidth}
                    onRoundLine={() => {
                      if (!selectedElementId) return;
                      const el = canvasElements.find(e => e.id === selectedElementId);
                      if (!el || el.shape !== 'line') return;
                      if (el.customPath) {
                        // Redresser : supprimer le customPath
                        updateCanvasElement(selectedElementId, { customPath: undefined });
                      } else {
                        // Arrondir : transformer la ligne droite en courbe de Bézier quadratique
                        // Nouveau modèle SVG : x=x1, y=y1, width=x2, height=y2
                        const x1cm = el.x;     // point de départ X en cm
                        const y1cm = el.y;     // point de départ Y en cm
                        const x2cm = el.width; // point d'arrivée X en cm
                        const y2cm = el.height; // point d'arrivée Y en cm
                        // Milieu du segment
                        const mx = (x1cm + x2cm) / 2;
                        const my = (y1cm + y2cm) / 2;
                        // Vecteur perpendiculaire (normalé)
                        const dx = x2cm - x1cm;
                        const dy = y2cm - y1cm;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        const perpX = len > 0 ? -dy / len : 0;
                        const perpY = len > 0 ?  dx / len : 0;
                        // Point de contrôle à 30% de la longueur, perpendiculaire au milieu
                        const offset = len * 0.3;
                        const ctrlX = mx + perpX * offset;
                        const ctrlY = my + perpY * offset;
                        // Path SVG Q (quadratique) en coordonnées cm
                        const newPath = `M ${x1cm} ${y1cm} Q ${ctrlX} ${ctrlY} ${x2cm} ${y2cm}`;
                        updateCanvasElement(selectedElementId, { customPath: newPath });
                      }
                    }}
                    onAddOpening={(shape: CanvasElement['shape'], color: string, extraParams?: { starBranches?: number; heartDepth?: number }) => {
                      const formatW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
                      const formatH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
                      openingCounterRef.current += 1;
                      const idx = openingCounterRef.current;
                      const defaultW = formatW * 0.6;
                      const defaultH = shape === 'square' || shape === 'round'
                        ? defaultW
                        : shape === 'line' ? 0.3  // la ligne a une hauteur minimale
        : formatH * 0.6;
                      // Couleur toujours opaque
                      const safeColor = color && color !== 'transparent' ? color : '#ffffff';
                      const newOpening: CanvasElement = {
                        id: `opening-${Date.now()}`,
                        type: 'shape',
                        shape,
                        x: (formatW - defaultW) / 2,
                        y: (formatH - defaultH) / 2,
                        width: defaultW,
                        height: defaultH,
                        rotation: 0,
                        zIndex: canvasElements.length + 10,
                        opacity: 1,
                        openingIndex: idx,
                        name: language === 'fr' ? `Découpe ${idx}` : `Opening ${idx}`,
                        openingColor: safeColor,
                        // Paramètres spécifiques aux formes avancées
                        ...(shape === 'star' && extraParams?.starBranches !== undefined
                          ? { starBranches: extraParams.starBranches }
                          : {}),
                        ...(shape === 'heart' && extraParams?.heartDepth !== undefined
                          ? { heartDepth: extraParams.heartDepth }
                          : {}),
                      };
                      // Ajouter la nouvelle découpe (toutes les découpes existantes sont conservées)
                      setCanvasElements(prev => [...prev, newOpening]);
                      setSelectedElementId(newOpening.id);
                    }}
                    onDeleteOpening={(id: string) => {
                      setCanvasElements(prev => prev.filter(el => el.id !== id));
                      setSelectedElementId(null);
                    }}
                    onApplyColorToOpenings={(color: string, targetIds: string[]) => {
                      setCanvasElements(prev => prev.map(el =>
                        el.type === 'shape' && targetIds.includes(el.id)
                          ? { ...el, openingColor: color }
                          : el
                      ));
                    }}
                    onGenerateFromOpenings={(bgColor: string, patternSrc: string | null, patternOpacity: number) => {
                      // Récupérer toutes les découpes validées
                      // Toutes les shapes sont utilisées (pas de filtre validé)
                      const openings = canvasElements.filter(el => el.type === 'shape');
                      if (openings.length === 0) {
                        toast.error(language === 'fr' ? 'Aucune découpe à générer' : 'No opening to generate');
                        return;
                      }
                      const PX = 96 / 2.54;
                      const formatW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
                      const formatH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
                      const ppW = Math.round(formatW * PX);
                      const ppH = Math.round(formatH * PX);
                      const renderAndAdd = (patImg: HTMLImageElement | null) => {
                        const ppCanvas = document.createElement('canvas');
                        ppCanvas.width = ppW;
                        ppCanvas.height = ppH;
                        const ctx = ppCanvas.getContext('2d')!;
                        // Fond blanc
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, ppW, ppH);
                        // Couleur de fond globale
                        if (bgColor && bgColor !== 'transparent') {
                          ctx.fillStyle = bgColor;
                          ctx.fillRect(0, 0, ppW, ppH);
                        }
                        // Motif par-dessus
                        if (patImg) {
                          const pat = ctx.createPattern(patImg, 'repeat');
                          if (pat) {
                            ctx.globalAlpha = patternOpacity / 100;
                            ctx.fillStyle = pat;
                            ctx.fillRect(0, 0, ppW, ppH);
                            ctx.globalAlpha = 1;
                          }
                        }
                        // Découper chaque ouverture
                        openings.forEach(op => {
                          const opW = op.width * PX;
                          const opH = op.height * PX;
                          const opX = op.x * PX;
                          const opY = op.y * PX;
                          // Si la découpe a une couleur propre, l'appliquer d'abord
                          if (op.openingColor && op.openingColor !== 'transparent') {
                            ctx.globalCompositeOperation = 'source-over';
                            ctx.fillStyle = op.openingColor;
                            ctx.beginPath();
                            drawOpeningPath(ctx, op.shape || 'rect', opX, opY, opW, opH);
                            ctx.fill();
                          }
                          // Puis découper (rendre transparent)
                          ctx.globalCompositeOperation = 'destination-out';
                          ctx.beginPath();
                          drawOpeningPath(ctx, op.shape || 'rect', opX, opY, opW, opH);
                          ctx.fill();
                          ctx.globalCompositeOperation = 'source-over';
                        });
                        const src = ppCanvas.toDataURL('image/png');
                        const name = language === 'fr' ? 'Passe-partout' : 'Mat frame';
                        const img = document.createElement('img');
                        img.onload = () => {
                          const newEl: CanvasElement = {
                            id: `element-${Date.now()}`,
                            type: 'image',
                            src,
                            x: 0, y: 0,
                            width: formatW, height: formatH,
                            rotation: 0,
                            zIndex: 1,
                            opacity: 1,
                            name,
                            originalWidthPx: img.naturalWidth,
                            originalHeightPx: img.naturalHeight,
                          };
                          // Supprimer les découpes shape du canvas et ajouter l'image générée
                          setCanvasElements(prev => [
                            newEl,
                            ...prev
                              .filter(el => el.type !== 'shape')
                              .map(el => ({ ...el, zIndex: el.zIndex + 1 })),
                          ]);
                          setSelectedElementId(newEl.id);
                          openingCounterRef.current = 0;
                          toast.success(language === 'fr' ? 'Passe-partout généré !' : 'Mat frame generated!');
                        };
                        img.src = src;
                      };
                      if (patternSrc) {
                        const patImg = new window.Image();
                        patImg.onload = () => renderAndAdd(patImg);
                        patImg.onerror = () => renderAndAdd(null);
                        patImg.src = patternSrc;
                      } else {
                        renderAndAdd(null);
                      }
                    }}
                    canvasOpenings={canvasElements.filter(el => el.type === 'shape').map(el => ({
                      id: el.id,
                      shape: el.shape || 'rect',
                      openingColor: el.openingColor || '#ffffff',
                      validated: true,
                      name: el.name || '',
                    }))}
                    activeOpeningId={null}
                    selectedCanvasElementId={selectedElementId}
                    onAddBackground={(patternSrc, patternOpacity, bgColor) => {
                      // Génère un rectangle plein couvrant exactement le format, sans découpe
                      const formatW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
                      const formatH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
                      const canvas = document.createElement('canvas');
                      const DPI = 96;
                      const CM_TO_PX = DPI / 2.54;
                      canvas.width = Math.round(formatW * CM_TO_PX);
                      canvas.height = Math.round(formatH * CM_TO_PX);
                      const ctx = canvas.getContext('2d')!;
                      // Fond couleur
                      ctx.fillStyle = bgColor && bgColor !== 'transparent' ? bgColor : '#ffffff';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      // Appliquer le motif si présent
                      const applyAndAdd = (dataUrl: string) => {
                        const bgEl: CanvasElement = {
                          id: `bg-${Date.now()}`,
                          type: 'image',
                          src: dataUrl,
                          x: 0,
                          y: 0,
                          width: formatW,
                          height: formatH,
                          rotation: 0,
                          zIndex: 0,
                          opacity: 1,
                          locked: true,
                          name: language === 'fr' ? 'Fond' : 'Background',
                        };
                        setCanvasElements(prev => [
                          bgEl,
                          ...prev.filter(el => el.name !== (language === 'fr' ? 'Fond' : 'Background')),
                        ]);
                        toast.success(language === 'fr' ? 'Fond appliqué' : 'Background applied');
                      };
                      if (patternSrc) {
                        const img = new window.Image();
                        img.onload = () => {
                          ctx.globalAlpha = (patternOpacity ?? 100) / 100;
                          // Tile le motif
                          const pat = ctx.createPattern(img, 'repeat');
                          if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, canvas.width, canvas.height); }
                          ctx.globalAlpha = 1;
                          applyAndAdd(canvas.toDataURL('image/png'));
                        };
                        img.src = patternSrc;
                      } else {
                        applyAndAdd(canvas.toDataURL('image/png'));
                      }
                    }}
                    onExportLaserSVG={() => {
                      // Génère un SVG de découpe laser : périmètre du format + contours des ouvertures
                      // Unités en mm (1cm = 10mm), viewBox en mm pour compatibilité laser
                      const formatW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
                      const formatH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
                      const W = formatW * 10; // cm → mm
                      const H = formatH * 10;
                      const shapes = canvasElements.filter(el => el.type === 'shape');

                      // Construire le path de chaque ouverture
                      const openingPaths = shapes.map(el => {
                        const x = el.x * 10, y = el.y * 10;
                        const w = el.width * 10, h = el.height * 10;
                        const shape = el.shape || 'rect';
                        // Priorité au customPath (éditeur de segments) — coordonnées cm → mm
                        if (el.customPath) {
                          const scaleFactor = 10; // cm → mm
                          const laserPath = el.customPath.replace(
                            /([MLQZ])([^MLQZ]*)/g,
                            (_m: string, cmd: string, args: string) => {
                              if (cmd === 'Z') return 'Z ';
                              const nums = args.trim().replace(/,/g, ' ').split(/\s+/).filter(Boolean).map(Number);
                              const converted: number[] = [];
                              for (let ni = 0; ni < nums.length; ni += 2) {
                                converted.push((nums[ni] * scaleFactor).toFixed(3) as unknown as number);
                                converted.push((nums[ni + 1] * scaleFactor).toFixed(3) as unknown as number);
                              }
                              if (cmd === 'Q' && converted.length >= 4) {
                                return `Q${converted[0]},${converted[1]} ${converted[2]},${converted[3]} `;
                              }
                              return `${cmd}${converted[0]},${converted[1]} `;
                            }
                          );
                          return laserPath;
                        }
                        let d = '';
                        switch (shape) {
                          case 'round':
                          case 'oval':
                            // Ellipse : arc SVG (2 demi-arcs pour fermer le chemin)
                            d = `M ${x + w/2},${y} a ${w/2},${h/2} 0 1,0 0.001,0 Z`;
                            break;
                          case 'square':
                          case 'rect':
                          default:
                            d = `M ${x},${y} h ${w} v ${h} h -${w} Z`;
                            break;
                          case 'arch': {
                            const r = w / 2;
                            d = `M ${x},${y + r} a ${r},${r} 0 0,1 ${w},0 v ${h - r} h -${w} Z`;
                            break;
                          }
                          case 'heart': {
                            // Cœur paramétrable normalisé (lobes en haut, pointe en bas)
                            const hDepth = (el.heartDepth ?? 50) / 100;
                            const hNotchY = y + h * (0.25 + hDepth * 0.25);
                            d = [
                              `M ${x + w * 0.5} ${hNotchY}`,
                              `C ${x + w * 0.5} ${y + h * 0.10} ${x + w * 0.0} ${y + h * 0.10} ${x + w * 0.0} ${y + h * 0.35}`,
                              `C ${x + w * 0.0} ${y + h * 0.60} ${x + w * 0.5} ${y + h * 0.75} ${x + w * 0.5} ${y + h * 1.0}`,
                              `C ${x + w * 0.5} ${y + h * 0.75} ${x + w * 1.0} ${y + h * 0.60} ${x + w * 1.0} ${y + h * 0.35}`,
                              `C ${x + w * 1.0} ${y + h * 0.10} ${x + w * 0.5} ${y + h * 0.10} ${x + w * 0.5} ${hNotchY} Z`,
                            ].join(' ');
                            break;
                          }
                          case 'star': {
                            // Étoile paramétrable : starBranches (3–8, défaut 5)
                            const scx = x + w / 2, scy = y + h / 2;
                            const outerR = Math.min(w, h) / 2;
                            const innerR = outerR * 0.42;
                            const sBranches = el.starBranches ?? 5;
                            const pts: string[] = [];
                            for (let i = 0; i < sBranches * 2; i++) {
                              const angle = (i * Math.PI) / sBranches - Math.PI / 2;
                              const r = i % 2 === 0 ? outerR : innerR;
                              pts.push(`${i === 0 ? 'M' : 'L'} ${scx + r * Math.cos(angle)} ${scy + r * Math.sin(angle)}`);
                            }
                            d = pts.join(' ') + ' Z';
                            break;
                          }
                          case 'puzzle': {
                            // Utilise buildPuzzlePath avec les edges de la pièce, puis translate au bon endroit
                            const edges = el.puzzleEdges ?? { top: 1, right: 1, bottom: 1, left: -1 };
                            // buildPuzzlePath génère un path relatif à (0,0) — on applique une translation SVG via transform
                            // Pour éviter la translation, on reconstruit le path avec les coordonnées absolues
                            const nr = Math.min(w, h) * 0.20;
                            const pcx = w / 2, pcy = h / 2;
                            const segs: string[] = [];
                            segs.push(`M${x},${y}`);
                            if (edges.top === 0) {
                              segs.push(`L${x + w},${y}`);
                            } else {
                              const dir = edges.top;
                              segs.push(`L${x + pcx - nr},${y}`);
                              segs.push(`C${x + pcx - nr},${y - dir * nr * 0.5} ${x + pcx - nr * 0.5},${y - dir * nr * 1.3} ${x + pcx},${y - dir * nr * 1.3}`);
                              segs.push(`C${x + pcx + nr * 0.5},${y - dir * nr * 1.3} ${x + pcx + nr},${y - dir * nr * 0.5} ${x + pcx + nr},${y}`);
                              segs.push(`L${x + w},${y}`);
                            }
                            if (edges.right === 0) {
                              segs.push(`L${x + w},${y + h}`);
                            } else {
                              const dir = edges.right;
                              segs.push(`L${x + w},${y + pcy - nr}`);
                              segs.push(`C${x + w + dir * nr * 0.5},${y + pcy - nr} ${x + w + dir * nr * 1.3},${y + pcy - nr * 0.5} ${x + w + dir * nr * 1.3},${y + pcy}`);
                              segs.push(`C${x + w + dir * nr * 1.3},${y + pcy + nr * 0.5} ${x + w + dir * nr * 0.5},${y + pcy + nr} ${x + w},${y + pcy + nr}`);
                              segs.push(`L${x + w},${y + h}`);
                            }
                            if (edges.bottom === 0) {
                              segs.push(`L${x},${y + h}`);
                            } else {
                              const dir = edges.bottom;
                              segs.push(`L${x + pcx + nr},${y + h}`);
                              segs.push(`C${x + pcx + nr},${y + h + dir * nr * 0.5} ${x + pcx + nr * 0.5},${y + h + dir * nr * 1.3} ${x + pcx},${y + h + dir * nr * 1.3}`);
                              segs.push(`C${x + pcx - nr * 0.5},${y + h + dir * nr * 1.3} ${x + pcx - nr},${y + h + dir * nr * 0.5} ${x + pcx - nr},${y + h}`);
                              segs.push(`L${x},${y + h}`);
                            }
                            if (edges.left === 0) {
                              segs.push(`Z`);
                            } else {
                              const dir = edges.left;
                              segs.push(`L${x},${y + pcy + nr}`);
                              segs.push(`C${x - dir * nr * 0.5},${y + pcy + nr} ${x - dir * nr * 1.3},${y + pcy + nr * 0.5} ${x - dir * nr * 1.3},${y + pcy}`);
                              segs.push(`C${x - dir * nr * 1.3},${y + pcy - nr * 0.5} ${x - dir * nr * 0.5},${y + pcy - nr} ${x},${y + pcy - nr}`);
                              segs.push(`Z`);
                            }
                            d = segs.join(' ');
                            break;
                          }
                          case 'diamond': {
                            // Losange : 4 points aux milieux des côtés de la boîte
                            d = `M ${x + w/2} ${y} L ${x + w} ${y + h/2} L ${x + w/2} ${y + h} L ${x} ${y + h/2} Z`;
                            break;
                          }
                          case 'hexagon': {
                            // Hexagone régulier inscrit dans la boîte (aplati horizontal)
                            const hcx = x + w / 2, hcy = y + h / 2;
                            const hrx = w / 2, hry = h / 2;
                            const hexPts: string[] = [];
                            for (let i = 0; i < 6; i++) {
                              const a = (i * Math.PI) / 3 - Math.PI / 6;
                              hexPts.push(`${i === 0 ? 'M' : 'L'} ${hcx + hrx * Math.cos(a)} ${hcy + hry * Math.sin(a)}`);
                            }
                            d = hexPts.join(' ') + ' Z';
                            break;
                          }
                        }
                        return d;
                      }).filter(Boolean);

                      // Assembler les éléments de numérotation pour les pièces puzzle
                      const numberElements = shapes
                        .filter(el => el.shape === 'puzzle' && el.puzzleShowNumber && el.openingIndex != null)
                        .map(el => {
                          const cx = (el.x + el.width / 2) * 10;
                          const cy = (el.y + el.height / 2) * 10;
                          const sizeRatio = el.puzzleNumberSize === 'small' ? 0.20 : el.puzzleNumberSize === 'large' ? 0.55 : 0.35;
                          const fontSize = Math.max(2, Math.min(el.width, el.height) * 10 * sizeRatio);
                          return [
                            `  <!-- Numéro pièce ${el.openingIndex} -->`,
                            `  <text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}"`,
                            `        text-anchor="middle" dominant-baseline="central"`,
                            `        font-size="${fontSize.toFixed(1)}" font-weight="bold" font-family="Arial, sans-serif"`,
                            `        fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round">${el.openingIndex}</text>`,
                            `  <text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}"`,
                            `        text-anchor="middle" dominant-baseline="central"`,
                            `        font-size="${fontSize.toFixed(1)}" font-weight="bold" font-family="Arial, sans-serif"`,
                            `        fill="black">${el.openingIndex}</text>`,
                          ].join('\n');
                        });

                      // Assembler le SVG
                      // Le périmètre extérieur (cadre de découpe) est inclus uniquement si
                      // showFormatBorder est activé par l'utilisateur dans la section A.
                      const perimeterLine = showFormatBorder
                        ? `  <!-- Périmètre extérieur du format -->\n  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="black" stroke-width="0.5"/>`
                        : `  <!-- Périmètre extérieur non inclus (toggle désactivé) -->`;

                      // Croix de repérage d'angle (crop marks) — toujours incluses pour faciliter
                      // le positionnement de la planche sur la machine laser.
                      // Longueur du trait : 5 mm, espace entre le coin et le début du trait : 3 mm.
                      const MARK_LEN = 5;  // mm
                      const MARK_GAP = 3;  // mm
                      const cropMarkCorners = [
                        { cx: 0, cy: 0,  sx: -1, sy: -1 },
                        { cx: W, cy: 0,  sx:  1, sy: -1 },
                        { cx: 0, cy: H,  sx: -1, sy:  1 },
                        { cx: W, cy: H,  sx:  1, sy:  1 },
                      ];
                      const cropMarkLines: string[] = [
                        `  <!-- Croix de repérage d'angle (positionnement laser) -->`,
                      ];
                      cropMarkCorners.forEach(({ cx, cy, sx, sy }) => {
                        cropMarkLines.push(
                          `  <line x1="${(cx + sx * MARK_GAP).toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(cx + sx * (MARK_GAP + MARK_LEN)).toFixed(2)}" y2="${cy.toFixed(2)}" stroke="black" stroke-width="0.3"/>`,
                          `  <line x1="${cx.toFixed(2)}" y1="${(cy + sy * MARK_GAP).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(cy + sy * (MARK_GAP + MARK_LEN)).toFixed(2)}" stroke="black" stroke-width="0.3"/>`,
                          `  <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="1.5" fill="none" stroke="black" stroke-width="0.3"/>`,
                        );
                      });

                      // Filets : traits fins concentriques autour de chaque ouverture
                      // Chaque filet est un chemin décalé vers l'intérieur de offsetMm mm
                      const filetLines: string[] = [];
                      if (filets.length > 0) {
                        filetLines.push(`  <!-- Filets (traits fins concentriques) -->`);
                        shapes.forEach((el, elIdx) => {
                          const ex = el.x * 10, ey = el.y * 10;
                          const ew = el.width * 10, eh = el.height * 10;
                          const shape = el.shape || 'rect';
                          filets.forEach(filet => {
                            const off = filet.offsetMm;
                            const sw = Math.max(0.1, filet.thicknessMm);
                            // Décalage vers l'EXTÉRIEUR de la découpe
                            const fx = ex - off, fy = ey - off;
                            const fw = ew + 2 * off, fh = eh + 2 * off;
                            let fd = '';
                            if (shape === 'round') {
                              const r = Math.min(fw, fh) / 2;
                              fd = `M ${(fx + fw/2).toFixed(2)},${fy.toFixed(2)} a ${r.toFixed(2)},${r.toFixed(2)} 0 1,0 0.001,0 Z`;
                            } else if (shape === 'oval') {
                              fd = `M ${(fx + fw/2).toFixed(2)},${fy.toFixed(2)} a ${(fw/2).toFixed(2)},${(fh/2).toFixed(2)} 0 1,0 0.001,0 Z`;
                            } else if (shape === 'arch') {
                              fd = `M${fx.toFixed(2)},${(fy + fh).toFixed(2)} L${fx.toFixed(2)},${(fy + fh/2).toFixed(2)} Q${fx.toFixed(2)},${fy.toFixed(2)} ${(fx + fw/2).toFixed(2)},${fy.toFixed(2)} Q${(fx + fw).toFixed(2)},${fy.toFixed(2)} ${(fx + fw).toFixed(2)},${(fy + fh/2).toFixed(2)} L${(fx + fw).toFixed(2)},${(fy + fh).toFixed(2)} Z`;
                            } else if (shape === 'square') {
                              const side = Math.min(fw, fh);
                              const sqX = fx + (fw - side) / 2, sqY = fy + (fh - side) / 2;
                              fd = `M ${sqX.toFixed(2)},${sqY.toFixed(2)} h ${side.toFixed(2)} v ${side.toFixed(2)} h -${side.toFixed(2)} Z`;
                            } else if (shape === 'heart') {
                              const hd = (el.heartDepth ?? 50) / 100;
                              const hny = fy + fh * (0.25 + hd * 0.25);
                              fd = `M ${(fx+fw*0.5).toFixed(2)} ${hny.toFixed(2)} C ${(fx+fw*0.5).toFixed(2)} ${(fy+fh*0.10).toFixed(2)} ${fx.toFixed(2)} ${(fy+fh*0.10).toFixed(2)} ${fx.toFixed(2)} ${(fy+fh*0.35).toFixed(2)} C ${fx.toFixed(2)} ${(fy+fh*0.60).toFixed(2)} ${(fx+fw*0.5).toFixed(2)} ${(fy+fh*0.75).toFixed(2)} ${(fx+fw*0.5).toFixed(2)} ${(fy+fh).toFixed(2)} C ${(fx+fw*0.5).toFixed(2)} ${(fy+fh*0.75).toFixed(2)} ${(fx+fw).toFixed(2)} ${(fy+fh*0.60).toFixed(2)} ${(fx+fw).toFixed(2)} ${(fy+fh*0.35).toFixed(2)} C ${(fx+fw).toFixed(2)} ${(fy+fh*0.10).toFixed(2)} ${(fx+fw*0.5).toFixed(2)} ${(fy+fh*0.10).toFixed(2)} ${(fx+fw*0.5).toFixed(2)} ${hny.toFixed(2)} Z`;
                            } else if (shape === 'star') {
                              const outerR = Math.min(fw, fh) / 2, innerR = outerR * 0.42;
                              const scx = fx + fw/2, scy = fy + fh/2;
                              const branches = el.starBranches ?? 5;
                              const pts: string[] = [];
                              for (let si = 0; si < branches * 2; si++) {
                                const a = (si * Math.PI) / branches - Math.PI / 2;
                                const r = si % 2 === 0 ? outerR : innerR;
                                pts.push(`${si === 0 ? 'M' : 'L'} ${(scx + r * Math.cos(a)).toFixed(2)},${(scy + r * Math.sin(a)).toFixed(2)}`);
                              }
                              fd = pts.join(' ') + ' Z';
                            } else if (shape === 'diamond') {
                              fd = `M ${(fx+fw/2).toFixed(2)},${fy.toFixed(2)} L ${(fx+fw).toFixed(2)},${(fy+fh/2).toFixed(2)} L ${(fx+fw/2).toFixed(2)},${(fy+fh).toFixed(2)} L ${fx.toFixed(2)},${(fy+fh/2).toFixed(2)} Z`;
                            } else if (shape === 'hexagon') {
                              const hpts: string[] = [];
                              for (let hi = 0; hi < 6; hi++) {
                                const a = (hi * Math.PI) / 3 - Math.PI / 6;
                                hpts.push(`${hi === 0 ? 'M' : 'L'} ${(fx+fw/2+fw/2*Math.cos(a)).toFixed(2)},${(fy+fh/2+fh/2*Math.sin(a)).toFixed(2)}`);
                              }
                              fd = hpts.join(' ') + ' Z';
                            } else {
                              fd = `M ${fx.toFixed(2)},${fy.toFixed(2)} h ${fw.toFixed(2)} v ${fh.toFixed(2)} h -${fw.toFixed(2)} Z`;
                            }
                            filetLines.push(
                              `  <!-- Filet ouverture ${elIdx + 1} offset=${off}mm -->\n  <path d="${fd}" fill="none" stroke="${filet.color}" stroke-width="${sw.toFixed(2)}"/>`
                            );
                          });
                        });
                      }

                      // Étiquette de format : pour le format personnalisé, afficher les dimensions exactes
                      const formatDimensionLabel = paperFormat.id === 'custom'
                        ? `Personnalisé ${formatW}cm × ${formatH}cm`
                        : `${paperFormat.label} (${formatW}cm × ${formatH}cm)`;

                      const svgContent = [
                        `<?xml version="1.0" encoding="UTF-8"?>`,
                        `<!-- DuoClass - Matrice de découpe laser -->`,
                        `<!-- Format : ${formatDimensionLabel} -->`,
                        `<!-- Orientation : ${orientation === 'portrait' ? 'Portrait' : 'Paysage'} -->`,
                        `<!-- ${shapes.length} ouverture${shapes.length > 1 ? 's' : ''}${filets.length > 0 ? ` + ${filets.length} filet${filets.length > 1 ? 's' : ''}` : ''} -->`,
                        `<svg xmlns="http://www.w3.org/2000/svg"`,
                        `     width="${W}mm" height="${H}mm"`,
                        `     viewBox="0 0 ${W} ${H}"`,
                        `     style="background:white">`,
                        perimeterLine,
                        ...openingPaths.map((d, i) =>
                          `  <!-- Ouverture ${i + 1} -->\n  <path d="${d}" fill="none" stroke="black" stroke-width="0.5"/>`
                        ),
                        ...(filetLines.length > 0 ? filetLines : []),
                        ...(numberElements.length > 0 ? [
                          `  <!-- Numéros des pièces (couche gravure) -->`,
                          ...numberElements,
                        ] : []),
                        ...cropMarkLines,
                        `</svg>`,
                      ].join('\n');

                      // Ouvrir la modale d'aperçu avant de télécharger
                      // Pour le format personnalisé, inclure les dimensions dans le nom de fichier
                      const formatLabel = paperFormat.id === 'custom'
                        ? `personnalise_${formatW}x${formatH}cm`
                        : (paperFormat.label || 'format').replace(/[^a-z0-9]/gi, '_');
                      const filename = `duoclass_laser_${formatLabel}_${shapes.length}ouvertures.svg`;
                      setSvgPreviewModal({ svgContent, filename });
                    }}
                      onGenerateFullPagePuzzle={(cols, rows, showNumbers, transparent, numberSize) => {
                      // Génère cols*rows pièces de puzzle couvrant la page entière
                      const formatW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
                      const formatH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
                      openingCounterRef.current = 0;
                      const cellW = formatW / cols;
                      const cellH = formatH / rows;
                      const newPieces: CanvasElement[] = [];

                      // Pré-calculer les edges de chaque bord interne de la grille
                      // edgeH[r][c] = edge entre la pièce (r,c) bas et (r+1,c) haut : 1=tenon vers bas, -1=mortaise
                      // edgeV[r][c] = edge entre la pièce (r,c) droite et (r,c+1) gauche : 1=tenon vers droite, -1=mortaise
                      const edgeH: number[][] = Array.from({ length: rows - 1 }, () =>
                        Array.from({ length: cols }, () => (Math.random() < 0.5 ? 1 : -1))
                      );
                      const edgeV: number[][] = Array.from({ length: rows }, () =>
                        Array.from({ length: cols - 1 }, () => (Math.random() < 0.5 ? 1 : -1))
                      );

                      for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                          openingCounterRef.current += 1;
                          const idx = openingCounterRef.current;
                          // top : bord périmètre si r=0, sinon opposé du bas de la pièce du dessus
                          const top    = r === 0 ? 0 : -edgeH[r - 1][c];
                          // bottom : bord périmètre si r=rows-1, sinon valeur de l'edge horizontal
                          const bottom = r === rows - 1 ? 0 : edgeH[r][c];
                          // left : bord périmètre si c=0, sinon opposé du droit de la pièce à gauche
                          const left   = c === 0 ? 0 : -edgeV[r][c - 1];
                          // right : bord périmètre si c=cols-1, sinon valeur de l'edge vertical
                          const right  = c === cols - 1 ? 0 : edgeV[r][c];
                          newPieces.push({
                            id: `puzzle-${Date.now()}-${r}-${c}`,
                            type: 'shape' as const,
                            shape: 'puzzle' as const,
                            x: c * cellW,
                            y: r * cellH,
                            width: cellW,
                            height: cellH,
                            rotation: 0,
                            zIndex: canvasElements.filter(el => el.type !== 'shape').length + 10 + idx,
                            opacity: 1,
                            validated: true,
                            openingIndex: idx,
                            name: language === 'fr' ? `Pièce ${idx}` : `Piece ${idx}`,
                            openingColor: transparent ? 'transparent' : '#e0e7ff',
                            puzzleTransparent: transparent ?? false,
                            puzzleNumberSize: numberSize ?? 'medium',
                            puzzleEdges: { top, right, bottom, left },
                            puzzleShowNumber: showNumbers ?? false,
                          });
                        }
                      }
                      setCanvasElements(prev => [
                        ...prev.filter(el => el.type !== 'shape'),
                        ...newPieces,
                      ]);
                      toast.success(
                        language === 'fr'
                          ? `Puzzle généré : ${cols * rows} pièces (${cols}×${rows}) - glissez vos photos sur chaque pièce`
                          : `Puzzle generated: ${cols * rows} pieces (${cols}×${rows}) - drag photos onto each piece`
                      );
                    }}
                    onApplyTemplate={(openings) => {
                      // Ajouter les formes du modèle SANS supprimer les existantes
                      const formatW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
                      const formatH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
                      const maxExistingIdx = canvasElements
                        .filter(el => el.type === 'shape' && el.openingIndex != null)
                        .reduce((max, el) => Math.max(max, el.openingIndex!), 0);
                      const maxZIndex = canvasElements.reduce((max, el) => Math.max(max, el.zIndex), 0);
                      const newOpenings: CanvasElement[] = openings.map((op, i) => {
                        const idx = maxExistingIdx + i + 1;
                        openingCounterRef.current = Math.max(openingCounterRef.current, idx);
                        return {
                          id: `opening-${Date.now()}-${i}`,
                          type: 'shape' as const,
                          shape: op.shape,
                          x: op.xFrac * formatW,
                          y: op.yFrac * formatH,
                          width: op.wFrac * formatW,
                          height: op.hFrac * formatH,
                          rotation: 0,
                          zIndex: maxZIndex + 1 + i,
                          opacity: 1,
                          validated: true,
                          openingIndex: idx,
                          name: language === 'fr' ? `Découpe ${idx}` : `Opening ${idx}`,
                          openingColor: 'transparent',
                        };
                      });
                      setCanvasElements(prev => [...prev, ...newOpenings]);
                      setActiveOpeningId(null);
                      toast.success(
                        language === 'fr'
                          ? `Modèle ajouté : ${openings.length} découpe${openings.length > 1 ? 's' : ''} placée${openings.length > 1 ? 's' : ''}`
                          : `Template added: ${openings.length} opening${openings.length > 1 ? 's' : ''} placed`
                      );
                    }}
                    onGetCurrentShapes={() => {
                      const formatW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
                      const formatH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
                      const shapes = canvasElements.filter(el => el.type === 'shape');
                      if (shapes.length === 0) return null;
                      return shapes.map(el => ({
                        shape: el.shape || 'rect',
                        xFrac: el.x / formatW,
                        yFrac: el.y / formatH,
                        wFrac: el.width / formatW,
                        hFrac: el.height / formatH,
                      }));
                    }}
                    canvasImageElements={stableCanvasImageElements}
                    onStickerOverlayChange={stableOnStickerOverlayChange}
                    stickerCropMarks={stickerCropMarks}
                    onStickerCropMarksChange={setStickerCropMarks}
                    showFormatBorder={showFormatBorder}
                    onShowFormatBorderChange={setShowFormatBorder}
                    filets={filets}
                    onFiletsChange={setFilets}
                    segmentEditorActive={!!segmentEditorElementId}
                    segmentsRounded={segmentsRounded}
                    onRoundAllSegments={() => {
                      if (!segmentEditorElementId) return;
                      const el = canvasElements.find(e => e.id === segmentEditorElementId);
                      if (!el) return;
                      if (segmentsRounded) {
                        // Redresser : supprimer le customPath pour revenir à la forme originale
                        updateCanvasElement(segmentEditorElementId, { customPath: undefined });
                        setSegmentsRounded(false);
                      } else {
                        // Arrondir : convertir tous les segments L en Q
                        const segs = buildShapeSegments({ ...el, customPath: undefined });
                        if (!segs) return;
                        const rounded = segs.map(seg => {
                          if (seg.type === 'Q') return seg;
                          const mx = (seg.x1 + seg.x2) / 2;
                          const my = (seg.y1 + seg.y2) / 2;
                          const dx = seg.x2 - seg.x1; const dy = seg.y2 - seg.y1;
                          const len = Math.sqrt(dx * dx + dy * dy);
                          const perpX = len > 0 ? -dy / len : 0;
                          const perpY = len > 0 ? dx / len : 0;
                          const offset = Math.min(Math.abs(dx), Math.abs(dy), 1.5) * 0.5;
                          return { ...seg, type: 'Q' as const, cx: mx + perpX * offset, cy: my + perpY * offset };
                        });
                        const newPath = pathFromSegments(rounded);
                        updateCanvasElement(segmentEditorElementId, { customPath: newPath });
                        setSegmentsRounded(true);
                      }
                    }}
                    isNodeEditMode={isNodeEditMode}
                    onToggleNodeEditMode={() => {
                      setIsNodeEditMode(prev => !prev);
                      setSelectedSegmentIndex(null);
                    }}
                    selectedSegmentIndex={selectedSegmentIndex}
                    onRoundSegmentConcave={() => {
                      if (!segmentEditorElementId || selectedSegmentIndex === null) return;
                      const el = canvasElements.find(e => e.id === segmentEditorElementId);
                      if (!el) return;
                      const segs = buildShapeSegments(el);
                      if (!segs || selectedSegmentIndex >= segs.length) return;
                      const seg = segs[selectedSegmentIndex];
                      if (seg.type === 'Q') return; // déjà arrondi
                      // Point milieu du segment
                      const mx = (seg.x1 + seg.x2) / 2;
                      const my = (seg.y1 + seg.y2) / 2;
                      const dx = seg.x2 - seg.x1; const dy = seg.y2 - seg.y1;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      // Normale vers l'intérieur de la forme (perpendiculaire, côté intérieur)
                      // Pour un rectangle : le centre de la forme est le point de référence
                      const cx = el.x + el.width / 2;
                      const cy = el.y + el.height / 2;
                      // Vecteur perpendiculaire au segment
                      const perpX = len > 0 ? -dy / len : 0;
                      const perpY = len > 0 ? dx / len : 0;
                      // Choisir la direction vers le centre (concave = vers l'intérieur)
                      const toCenterX = cx - mx;
                      const toCenterY = cy - my;
                      const dot = perpX * toCenterX + perpY * toCenterY;
                      const sign = dot >= 0 ? 1 : -1;
                      const offset = Math.min(len * 0.35, 2.0);
                      const newSeg = { ...seg, type: 'Q' as const, cx: mx + sign * perpX * offset, cy: my + sign * perpY * offset };
                      const newSegs = segs.map((s, i) => i === selectedSegmentIndex ? newSeg : s);
                      updateCanvasElement(segmentEditorElementId, { customPath: pathFromSegments(newSegs) });
                      setSegmentsRounded(newSegs.some(s => s.type === 'Q'));
                    }}
                    onRoundSegmentConvex={() => {
                      if (!segmentEditorElementId || selectedSegmentIndex === null) return;
                      const el = canvasElements.find(e => e.id === segmentEditorElementId);
                      if (!el) return;
                      const segs = buildShapeSegments(el);
                      if (!segs || selectedSegmentIndex >= segs.length) return;
                      const seg = segs[selectedSegmentIndex];
                      if (seg.type === 'Q') return; // déjà arrondi
                      const mx = (seg.x1 + seg.x2) / 2;
                      const my = (seg.y1 + seg.y2) / 2;
                      const dx = seg.x2 - seg.x1; const dy = seg.y2 - seg.y1;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      const cx = el.x + el.width / 2;
                      const cy = el.y + el.height / 2;
                      const perpX = len > 0 ? -dy / len : 0;
                      const perpY = len > 0 ? dx / len : 0;
                      const toCenterX = cx - mx;
                      const toCenterY = cy - my;
                      const dot = perpX * toCenterX + perpY * toCenterY;
                      // Convexe = direction opposée au centre (vers l'extérieur)
                      const sign = dot >= 0 ? -1 : 1;
                      const offset = Math.min(len * 0.35, 2.0);
                      const newSeg = { ...seg, type: 'Q' as const, cx: mx + sign * perpX * offset, cy: my + sign * perpY * offset };
                      const newSegs = segs.map((s, i) => i === selectedSegmentIndex ? newSeg : s);
                      updateCanvasElement(segmentEditorElementId, { customPath: pathFromSegments(newSegs) });
                      setSegmentsRounded(newSegs.some(s => s.type === 'Q'));
                    }}
                    onDeleteSegment={() => {
                      if (!segmentEditorElementId || selectedSegmentIndex === null) return;
                      const el = canvasElements.find(e => e.id === segmentEditorElementId);
                      if (!el) return;
                      const segs = buildShapeSegments(el);
                      if (!segs || segs.length <= 2) return; // garder au moins 2 segments
                      // Supprimer le segment : relier directement x1 du segment suivant à x2 du précédent
                      const newSegs = segs.filter((_, i) => i !== selectedSegmentIndex);
                      // Reconstruire les connexions : x1 du segment suivant doit être x2 du précédent
                      const reconnected = newSegs.map((seg, i) => {
                        if (i === 0) return seg;
                        const prev = newSegs[i - 1];
                        return { ...seg, x1: prev.x2, y1: prev.y2 };
                      });
                      updateCanvasElement(segmentEditorElementId, { customPath: pathFromSegments(reconnected) });
                      setSelectedSegmentIndex(null);
                      setSegmentsRounded(reconnected.some(s => s.type === 'Q'));
                    }}
                    onStraightenSegment={() => {
                      if (!segmentEditorElementId || selectedSegmentIndex === null) return;
                      const el = canvasElements.find(e => e.id === segmentEditorElementId);
                      if (!el) return;
                      const segs = buildShapeSegments(el);
                      if (!segs || selectedSegmentIndex >= segs.length) return;
                      const newSegs = segs.map((seg, i) =>
                        i === selectedSegmentIndex ? { ...seg, type: 'L' as const, cx: undefined, cy: undefined } : seg
                      );
                      updateCanvasElement(segmentEditorElementId, { customPath: pathFromSegments(newSegs) });
                      setSegmentsRounded(newSegs.some(s => s.type === 'Q'));
                    }}
                     onExportStickerContoursSVG={(offsetMm, elementIds, useRealContour, alphaThreshold = 30) => {
                      // Récupérer les éléments sélectionnés
                      const selected = canvasElements.filter(
                        el => el.type === 'image' && el.src && elementIds.includes(el.id)
                      );
                      if (selected.length === 0) {
                        toast.error(language === 'fr' ? 'Aucun élément sélectionné' : 'No element selected');
                        return;
                      }

                      // Dimensions du format en mm
                      const formatW = orientation === 'portrait' ? paperFormat.width : paperFormat.height;
                      const formatH = orientation === 'portrait' ? paperFormat.height : paperFormat.width;
                      const fwMm = formatW * 10;
                      const fhMm = formatH * 10;
                      const offsetCm = offsetMm / 10;

                      /**
                       * Convertit un path normalisé (0..1 relatif à l'élément) en coordonnées mm
                       * dans l'espace du format SVG, en appliquant la rotation de l'élément.
                       *
                       * Les coordonnées normalisées sont identiques à celles utilisées par
                       * scalePathToPx pour le rendu canvas — seule l'unité change (mm au lieu de px).
                       */
                      const scalePathToMm = (d: string, el: typeof selected[0]): string => {
                        // Origine et dimensions de l'élément en mm
                        const ox = el.x * 10;       // cm → mm
                        const oy = el.y * 10;
                        const w  = el.width * 10;
                        const h  = el.height * 10;
                        const cx = ox + w / 2;
                        const cy = oy + h / 2;
                        const rot = el.rotation || 0;
                        const rad = (rot * Math.PI) / 180;
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        // Transforme un point normalisé (nx, ny) en coordonnées mm avec rotation
                        const tx = (nx: number, ny: number): [number, number] => {
                          const px = ox + nx * w;
                          const py = oy + ny * h;
                          const dx = px - cx;
                          const dy = py - cy;
                          return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
                        };
                        let curNx = 0, curNy = 0;
                        return d.replace(/([MCQLHVZmclhvz])([^MCQLHVZmclhvz]*)/g, (_, cmd: string, args: string) => {
                          const nums = args.trim().split(/[,\s]+/).filter(Boolean).map(Number);
                          if (cmd === 'Z' || cmd === 'z') return 'Z ';
                          if (cmd === 'M' || cmd === 'L') {
                            const pts: string[] = [];
                            for (let i = 0; i + 1 < nums.length; i += 2) {
                              curNx = nums[i]; curNy = nums[i + 1];
                              const [px, py] = tx(curNx, curNy);
                              pts.push(`${px.toFixed(3)},${py.toFixed(3)}`);
                            }
                            return `${cmd}${pts.join(' ')} `;
                          }
                          if (cmd === 'C') {
                            const pts: string[] = [];
                            for (let i = 0; i + 1 < nums.length; i += 2) {
                              if (i % 6 === 4) { curNx = nums[i]; curNy = nums[i + 1]; }
                              const [px, py] = tx(nums[i], nums[i + 1]);
                              pts.push(`${px.toFixed(3)},${py.toFixed(3)}`);
                            }
                            return `C${pts.join(' ')} `;
                          }
                          if (cmd === 'Q') {
                            const pts: string[] = [];
                            for (let i = 0; i + 1 < nums.length; i += 2) {
                              if (i % 4 === 2) { curNx = nums[i]; curNy = nums[i + 1]; }
                              const [px, py] = tx(nums[i], nums[i + 1]);
                              pts.push(`${px.toFixed(3)},${py.toFixed(3)}`);
                            }
                            return `Q${pts.join(' ')} `;
                          }
                          if (cmd === 'H') { curNx = nums[0]; const [px, py] = tx(curNx, curNy); return `L${px.toFixed(3)},${py.toFixed(3)} `; }
                          if (cmd === 'V') { curNy = nums[0]; const [px, py] = tx(curNx, curNy); return `L${px.toFixed(3)},${py.toFixed(3)} `; }
                          return `${cmd}${args}`;
                        });
                      };

                      /**
                       * Génère un rectangle arrondi (bbox simple) pour un élément.
                       * Utilisé comme fallback quand l'alpha tracing échoue.
                       */
                      const generateBboxRect = (el: typeof selected[0], offsetMmVal: number): string => {
                        const cx = (el.x + el.width / 2) * 10;
                        const cy = (el.y + el.height / 2) * 10;
                        const rot = el.rotation || 0;
                        const x0 = (el.x - offsetCm) * 10;
                        const y0 = (el.y - offsetCm) * 10;
                        const w0 = (el.width + 2 * offsetCm) * 10;
                        const h0 = (el.height + 2 * offsetCm) * 10;
                        const rr = Math.min(offsetMmVal, w0 * 0.4, h0 * 0.4);
                        return `<rect
                          x="${x0.toFixed(3)}"
                          y="${y0.toFixed(3)}"
                          width="${w0.toFixed(3)}"
                          height="${h0.toFixed(3)}"
                          rx="${rr.toFixed(3)}"
                          ry="${rr.toFixed(3)}"
                          fill="none"
                          stroke="#000000"
                          stroke-width="0.5"
                          transform="rotate(${rot.toFixed(2)},${cx.toFixed(3)},${cy.toFixed(3)})"
                        />`;
                      };

                      // Générer les paths SVG pour chaque sticker.
                      // Priorité : utiliser stickerContourPaths (silhouette réelle calculée par
                      // alpha tracing) si disponible. Fallback : bbox rectangulaire arrondie.
                      const buildAndDownload = async () => {
                        const paths: string[] = selected.map(el => {
                          const normalizedPath = stickerContourPaths[el.id];
                          if (useRealContour && normalizedPath) {
                            // Convertir le path normalisé (0..1) en coordonnées mm
                            const pathMm = scalePathToMm(normalizedPath, el);
                            return `<path d="${pathMm}" fill="none" stroke="#000000" stroke-width="0.5" />`;
                          }
                          return generateBboxRect(el, offsetMm);
                        });

                        // Générer les balises <image> pour chaque sticker (aperçu visuel)
                        const imageElements = selected.map(el => {
                          if (!el.src) return '';
                          const cx = (el.x + el.width / 2) * 10;
                          const cy = (el.y + el.height / 2) * 10;
                          const rot = el.rotation || 0;
                          const x0 = el.x * 10;
                          const y0 = el.y * 10;
                          const w0 = el.width * 10;
                          const h0 = el.height * 10;
                          return `<image href="${el.src}" x="${x0.toFixed(3)}" y="${y0.toFixed(3)}" width="${w0.toFixed(3)}" height="${h0.toFixed(3)}" transform="rotate(${rot.toFixed(2)},${cx.toFixed(3)},${cy.toFixed(3)})" preserveAspectRatio="xMidYMid meet" />`;
                        });
                        // Générer les croix de repérage aux 4 coins si activées
                        const cropMarkLines: string[] = [];
                        if (stickerCropMarks || showCropMarks) {
                          const markLen = 5; // mm
                          const markGap = 3; // mm
                          const corners = [
                            { cx: 0,     cy: 0,     sx: -1, sy: -1 },
                            { cx: fwMm,  cy: 0,     sx:  1, sy: -1 },
                            { cx: 0,     cy: fhMm,  sx: -1, sy:  1 },
                            { cx: fwMm,  cy: fhMm,  sx:  1, sy:  1 },
                          ];
                          corners.forEach(({ cx, cy, sx, sy }) => {
                            cropMarkLines.push(
                              `<line x1="${(cx + sx * markGap).toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(cx + sx * (markGap + markLen)).toFixed(2)}" y2="${cy.toFixed(2)}" stroke="#000" stroke-width="0.3" />`,
                              `<line x1="${cx.toFixed(2)}" y1="${(cy + sy * markGap).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(cy + sy * (markGap + markLen)).toFixed(2)}" stroke="#000" stroke-width="0.3" />`,
                              `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="1.5" fill="none" stroke="#000" stroke-width="0.3" />`
                            );
                          });
                        }
                        // Le périmètre extérieur est inclus uniquement si showFormatBorder est activé.
                        const stickerPerimeterLine = showFormatBorder
                          ? `  <!-- Périmètre extérieur du format -->\n  <rect x="0" y="0" width="${fwMm}" height="${fhMm}" fill="none" stroke="black" stroke-width="0.5"/>`
                          : `  <!-- Périmètre extérieur non inclus (toggle désactivé) -->`;
                        const svgContent = [
                          `<?xml version="1.0" encoding="UTF-8"?>`,
                          `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
                          `  width="${fwMm}mm" height="${fhMm}mm"`,
                          `  viewBox="0 0 ${fwMm} ${fhMm}"`,
                          `  style="background:white">`,
                          stickerPerimeterLine,
                          `  <!-- Images des stickers (aperçu visuel) -->`,
                          ...imageElements,
                          `  <!-- Contours offset des stickers (offset=${offsetMm}mm${useRealContour ? ', contour réel' : ', bbox'}) -->`,
                          ...paths,
                          `  <!-- Croix de repérage -->`,
                          ...cropMarkLines,
                          `</svg>`,
                        ].join('\n');

                        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `stickers_decoupe_offset${offsetMm}mm${useRealContour ? '_silhouette' : ''}.svg`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(
                          language === 'fr'
                            ? `SVG de découpe téléchargé (${selected.length} élément${selected.length > 1 ? 's' : ''}, offset ${offsetMm} mm${useRealContour ? ', silhouette' : ''})`
                            : `Cut SVG downloaded (${selected.length} element${selected.length > 1 ? 's' : ''}, offset ${offsetMm} mm${useRealContour ? ', silhouette' : ''})`
                        );
                      };

                      buildAndDownload();
                    }}
                    onApplyBinPackLayout={(placements) => {
                      // Déplacer chaque élément vers sa nouvelle position calculée par le bin-packing
                      setCanvasElements(prev =>
                        prev.map(el => {
                          const p = placements.find(pl => pl.id === el.id);
                          if (!p) return el;
                          return { ...el, x: p.x, y: p.y };
                        })
                      );
                    }}
                     onDuplicateElement={(sourceId, copies, removeOriginal) => {
                      // Trouver l'élément source
                      const source = canvasElements.find(el => el.id === sourceId);
                      if (!source) return;
                      // Créer les copies avec les positions calculées
                      const newElements = copies.map((copy, i) => ({
                        ...source,
                        id: `element-${Date.now()}-dup${i}`,
                        x: copy.x,
                        y: copy.y,
                        name: copy.name,
                        zIndex: canvasElements.length + i + 1,
                      }));
                      setCanvasElements(prev => {
                        // Supprimer le modèle original si demandé
                        const filtered = removeOriginal
                          ? prev.filter(el => el.id !== sourceId)
                          : prev;
                        return [...filtered, ...newElements];
                      });
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* ZONE 2 : Zone de travail (Canvas) - Occupe TOUT l'espace */}
          <div 
            className="flex-1 overflow-hidden flex flex-col"
            ref={canvasContainerRef}
            onWheel={handleWheel}
          >
            {/* Règle horizontale en haut - alignée avec la page */}
            {showRulers && (
              <div className="flex flex-shrink-0">
                {/* Coin supérieur gauche (espace pour la règle verticale) */}
                <div className="w-8 h-8 bg-gradient-to-br from-slate-300 to-slate-200 border-b-2 border-r-2 border-slate-400 flex-shrink-0 flex items-center justify-center">
                  <span className="text-[8px] text-slate-500 font-bold">cm</span>
                </div>
                
                {/* Règle horizontale - alignée avec la page */}
                <div className="flex-1 h-8 bg-slate-300 border-b border-slate-400 relative">
                  {/* Zone de règle alignée avec la page */}
                  <div 
                    className="absolute h-full bg-gradient-to-b from-slate-200 to-slate-100"
                    style={{
                      left: canvasDimensions.pageOffsetX,
                      width: canvasDimensions.pageWidth,
                    }}
                  >
                    {(() => {
                      const formatWidth = canvasDimensions.formatWidthCm;
                      const numMarks = Math.floor(formatWidth) + 1;
                      return Array.from({ length: numMarks }).map((_, i) => {
                        const pos = i * canvasDimensions.pxPerCm;
                        const isMajor = i % 5 === 0;
                        return (
                          <div key={i} className="absolute h-full" style={{ left: pos }}>
                            <div 
                              className={`absolute bottom-0 left-0 w-px ${isMajor ? 'h-4 bg-slate-600' : 'h-2 bg-slate-400'}`} 
                            />
                            {isMajor && (
                              <span className="absolute bottom-4 left-0 -translate-x-1/2 text-[10px] text-slate-700 font-bold">{i}</span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-1 overflow-hidden">
              {/* Règle verticale à gauche - alignée avec la page */}
              {showRulers && (
                <div className="w-8 bg-slate-300 border-r border-slate-400 relative flex-shrink-0">
                  {/* Zone de règle alignée avec la page */}
                  <div 
                    className="absolute w-full bg-gradient-to-r from-slate-200 to-slate-100"
                    style={{
                      top: canvasDimensions.pageOffsetY,
                      height: canvasDimensions.pageHeight,
                    }}
                  >
                    {(() => {
                      const formatHeight = canvasDimensions.formatHeightCm;
                      const numMarks = Math.floor(formatHeight) + 1;
                      return Array.from({ length: numMarks }).map((_, i) => {
                        const pos = i * canvasDimensions.pxPerCm;
                        const isMajor = i % 5 === 0;
                        return (
                          <div key={i} className="absolute w-full" style={{ top: pos }}>
                            <div 
                              className={`absolute top-0 right-0 h-px ${isMajor ? 'w-4 bg-slate-600' : 'w-2 bg-slate-400'}`} 
                            />
                            {isMajor && (
                              <span className="absolute top-0 right-4 -translate-y-1/2 text-[10px] text-slate-700 font-bold">{i}</span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              
              {/* Zone de travail - Fond gris avec la page blanche centrée */}
              <div
                ref={canvasRef}
                className={`flex-1 relative bg-slate-300 transition-all duration-200 overflow-hidden ${isLassoing || isLineDrawMode ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{
                  // Zone de travail complète
                  minWidth: canvasDimensions.workspaceWidth,
                  minHeight: canvasDimensions.workspaceHeight,
                }}
                onContextMenu={(e) => {
                  // Désactiver le menu contextuel par défaut du navigateur
                  e.preventDefault();
                  e.stopPropagation();
                  // Afficher le menu contextuel de la zone vide (pas sur un élément)
                  setCanvasContextMenu({
                    x: e.clientX,
                    y: e.clientY
                  });
                }}
                onMouseDown={(e) => {
                  // Mode tracé libre de ligne : enregistrer le point de départ
                  if (isLineDrawMode) {
                    // Utiliser pageRef pour des coordonnées directement relatives à la page blanche
                    // (plus robuste que canvasRef - pageOffsetX/Y qui peut dériver)
                    const page = pageRef.current;
                    if (!page) return;
                    const rect = page.getBoundingClientRect();
                    const pxX = e.clientX - rect.left;
                    const pxY = e.clientY - rect.top;
                    // Contraindre les coordonnées aux limites de la page blanche
                    const cmX = Math.max(0, Math.min(pxX / canvasDimensions.pxPerCm, canvasDimensions.formatWidthCm));
                    const cmY = Math.max(0, Math.min(pxY / canvasDimensions.pxPerCm, canvasDimensions.formatHeightCm));
                    // En mode chaîné, lineDrawStartRef.current est déjà défini par onMouseUp du segment précédent.
                    // Utiliser la ref (synchrone) plutôt que le state React (asynchrone) pour éviter le saut.
                    if (!lineDrawStartRef.current) {
                      // Premier clic : définir le point de départ
                      lineDrawStartRef.current = { x: cmX, y: cmY };
                      setLineDrawStart({ x: cmX, y: cmY });
                    }
                    // Initialiser lineDrawEnd au point de départ pour l'aperçu
                    const startPt = lineDrawStartRef.current;
                    setLineDrawEnd({ x: startPt.x, y: startPt.y });
                    lineDrawEndRef.current = { x: startPt.x, y: startPt.y };
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  // Mode découpe : enregistrer le point de départ
                  if (isCutMode && selectedElementId) {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const pxX = e.clientX - rect.left + canvas.scrollLeft - canvasDimensions.pageOffsetX;
                    const pxY = e.clientY - rect.top + canvas.scrollTop - canvasDimensions.pageOffsetY;
                    const cmX = pxX / canvasDimensions.pxPerCm;
                    const cmY = pxY / canvasDimensions.pxPerCm;
                    // Snap sur le périmètre de la forme sélectionnée
                    const el = canvasElements.find(e => e.id === selectedElementId);
                    if (el && el.type === 'shape') {
                      const segs = buildShapeSegments(el);
                      if (segs) {
                        const snapped = snapToPerimeter(cmX, cmY, segs);
                        setCutStart(snapped);
                        setCutEnd(snapped);
                      }
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  // Démarrer le lasso si on clique sur la zone vide
                  handleLassoStart(e);
                }}
                onMouseMove={(e) => {
                  // Mode tracé libre de ligne : mettre à jour le point courant
                  // Utiliser la ref synchrone pour éviter que le batching React
                  // ne bloque l'aperçu entre deux segments chaînés
                  if (isLineDrawMode && lineDrawStartRef.current) {
                    const page = pageRef.current;
                    if (!page) return;
                    const rect = page.getBoundingClientRect();
                    const pxX = e.clientX - rect.left;
                    const pxY = e.clientY - rect.top;
                    const endPt = {
                      x: Math.max(0, Math.min(pxX / canvasDimensions.pxPerCm, canvasDimensions.formatWidthCm)),
                      y: Math.max(0, Math.min(pxY / canvasDimensions.pxPerCm, canvasDimensions.formatHeightCm)),
                    };
                    lineDrawEndRef.current = endPt;
                    setLineDrawEnd(endPt);
                    return;
                  }
                  // Mode découpe : mettre à jour le point d'arrivée
                  if (isCutMode && cutStart && selectedElementId) {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const pxX = e.clientX - rect.left + canvas.scrollLeft - canvasDimensions.pageOffsetX;
                    const pxY = e.clientY - rect.top + canvas.scrollTop - canvasDimensions.pageOffsetY;
                    const cmX = pxX / canvasDimensions.pxPerCm;
                    const cmY = pxY / canvasDimensions.pxPerCm;
                    const el = canvasElements.find(e => e.id === selectedElementId);
                    if (el && el.type === 'shape') {
                      const segs = buildShapeSegments(el);
                      if (segs) {
                        const snapped = snapToPerimeter(cmX, cmY, segs);
                        setCutEnd(snapped);
                      }
                    }
                    return;
                  }
                  handleMouseMove(e);
                  handleResizeMove(e);
                  handleRotateMove(e);
                  handleLassoMove(e);
                  // Mettre à jour la position du curseur pour le détourage
                  if (isDetourageActive && manualTool === "polygon") {
                    const page = pageRef.current;
                    if (!page) return;
                    const rect = page.getBoundingClientRect();
                    setCursorPosition({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    });
                  }
                }}
                onMouseUp={(e) => {
                  // Mode tracé libre de ligne : créer l'élément ligne et chaîner les segments
                  if (isLineDrawMode && lineDrawStartRef.current) {
                    // Utiliser la ref synchrone pour le point de départ (garantit la cohérence
                    // même si le state React n'a pas encore été mis à jour par le batching)
                    const startPt = lineDrawStartRef.current;
                    // Recalculer les coordonnées depuis l'événement (pas depuis la ref)
                    // pour garantir le clamp même si la souris est sortie de la zone
                    const page = pageRef.current;
                    let finalEnd = lineDrawEndRef.current;
                    if (page) {
                      const rect = page.getBoundingClientRect();
                      const pxX = e.clientX - rect.left;
                      const pxY = e.clientY - rect.top;
                      finalEnd = {
                        x: Math.max(0, Math.min(pxX / canvasDimensions.pxPerCm, canvasDimensions.formatWidthCm)),
                        y: Math.max(0, Math.min(pxY / canvasDimensions.pxPerCm, canvasDimensions.formatHeightCm)),
                      };
                    }
                    if (finalEnd) {
                      const dx = finalEnd.x - startPt.x;
                      const dy = finalEnd.y - startPt.y;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      if (length > 0.1) {
                        // Déterminer si on doit snapper au premier point de la chaîne
                        const SNAP_THRESHOLD_CM = 0.5; // 5 mm de tolérance
                        const chainFirst = lineChainFirstPoint;
                        const isClosing = chainFirst !== null && (
                          Math.sqrt(
                            Math.pow(finalEnd.x - chainFirst.x, 2) +
                            Math.pow(finalEnd.y - chainFirst.y, 2)
                          ) < SNAP_THRESHOLD_CM
                        );
                        // Si fermeture : snapper l'extrémité exactement sur le premier point
                        const actualEnd = isClosing ? chainFirst! : finalEnd;
                        const dxFinal = actualEnd.x - startPt.x;
                        const dyFinal = actualEnd.y - startPt.y;
                        const lengthFinal = Math.sqrt(dxFinal * dxFinal + dyFinal * dyFinal);
                        if (lengthFinal > 0.05) {
                          const angle = Math.atan2(dyFinal, dxFinal) * (180 / Math.PI);
                          openingCounterRef.current += 1;
                          const idx = openingCounterRef.current;
                          // Nouveau modèle simplié pour les lignes :
                          // x = x1 (point de départ en cm)
                          // y = y1 (point de départ en cm)
                          // width = x2 (point d'arrivée en cm)
                          // height = y2 (point d'arrivée en cm)
                          // rotation = 0 (inutilisé, le rendu SVG utilise x1/y1/x2/y2 directement)
                          const newLine: CanvasElement = {
                            id: `opening-${Date.now()}`,
                            type: 'shape',
                            shape: 'line',
                            x: startPt.x,
                            y: startPt.y,
                            width: actualEnd.x,
                            height: actualEnd.y,
                            rotation: 0,
                            zIndex: canvasElements.length + 10,
                            opacity: 1,
                            openingIndex: idx,
                            name: language === 'fr' ? `Ligne ${idx}` : `Line ${idx}`,
                            openingColor: lineDrawColor,
                            strokeWidth: lineDrawStrokeWidth,
                          };
                          setCanvasElements(prev => [...prev, newLine]);
                          lineChainSegmentIdsRef.current.push(newLine.id);
                          setSelectedElementId(newLine.id);
                          if (isClosing) {
                            // Forme fermée : réinitialiser la chaîne et quitter le mode
                            setLineChainFirstPoint(null);
                            finalizeLineChain();
                            lineChainSegmentIdsRef.current = [];
                            lineDrawStartRef.current = null;
                            setLineDrawStart(null);
                            setLineDrawEnd(null);
                            lineDrawEndRef.current = null;
                            setIsLineDrawMode(false);
                            toast.success(language === 'fr' ? 'Forme fermée !' : 'Shape closed!');
                            return;
                          }
                          // Segment tracé, chaîne continue :
                          // le prochain segment commence là où celui-ci se termine
                          if (!chainFirst) {
                            // Premier segment de la chaîne : mémoriser le point de départ
                            setLineChainFirstPoint({ x: startPt.x, y: startPt.y });
                          }
                          // Préparer le prochain segment : départ = fin du segment actuel
                          // Mettre à jour la ref EN PREMIER (synchrone) puis le state (asynchrone)
                          lineDrawStartRef.current = { x: actualEnd.x, y: actualEnd.y };
                          setLineDrawStart({ x: actualEnd.x, y: actualEnd.y });
                          setLineDrawEnd(null);
                          lineDrawEndRef.current = null;
                          // Désactiver le mode tracé après chaque segment : l'utilisateur reclique sur Ligne pour continuer
                          setIsLineDrawMode(false);
                          return;
                        }
                      }
                      // Segment trop court (clic sans glissement) : annuler
                      lineDrawStartRef.current = null;
                      setLineDrawStart(null);
                      setLineDrawEnd(null);
                      lineDrawEndRef.current = null;
                      setLineChainFirstPoint(null);
                      finalizeLineChain();
                      lineChainSegmentIdsRef.current = [];
                      setIsLineDrawMode(false);
                      return;
                    }
                  }
                  // Mode découpe : effectuer la découpe
                  if (isCutMode && cutStart && cutEnd && selectedElementId) {
                    const el = canvasElements.find(e => e.id === selectedElementId);
                    if (el && el.type === 'shape') {
                      const result = cutShapeByLine(el, cutStart, cutEnd);
                      if (result) {
                        const groupId = `cut-group-${Date.now()}`;
                        const partA: typeof el = {
                          ...el,
                          id: `cut-a-${Date.now()}`,
                          customPath: result.pathA,
                          groupId,
                          name: (el.name || 'Découpe') + ' A',
                        };
                        const partB: typeof el = {
                          ...el,
                          id: `cut-b-${Date.now()}`,
                          customPath: result.pathB,
                          groupId,
                          name: (el.name || 'Découpe') + ' B',
                          zIndex: el.zIndex + 1,
                        };
                        setCanvasElements(prev => [
                          ...prev.filter(e => e.id !== selectedElementId),
                          partA,
                          partB,
                        ]);
                        setSelectedElementId(partA.id);
                        toast.success(language === 'fr' ? 'Forme découpée en 2 parties' : 'Shape cut into 2 parts');
                      } else {
                        toast.error(language === 'fr' ? 'Découpe impossible : tracez la ligne entre deux bords' : 'Cut failed: draw the line between two edges');
                      }
                    }
                    setCutStart(null);
                    setCutEnd(null);
                    setIsCutMode(false);
                    return;
                  }
                  handleMouseUp();
                  handleLassoEnd();
                }}
                onMouseLeave={() => {
                  if (isLineDrawMode && lineDrawStartRef.current) {
                    // Annuler le segment en cours mais conserver la chaîne
                    // (lineDrawStartRef.current reste défini pour le prochain segment)
                    setLineDrawEnd(null);
                    lineDrawEndRef.current = null;
                  }
                  if (isCutMode) {
                    setCutStart(null);
                    setCutEnd(null);
                  }
                  handleMouseUp();
                  handleLassoEnd();
                  setCursorPosition(null);
                }}
                onClick={(e) => {
                  // Gestion du clic pour le détourage point par point
                  if (isDetourageActive && manualTool === "polygon" && selectedElementId) {
                    // Utiliser pageRef (la page blanche) pour des coordonnées directement
                    // relatives au SVG overlay — même approche que le tracé de ligne
                    const page = pageRef.current;
                    if (!page) return;
                    const rect = page.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    // Vérifier si on clique près du premier point pour fermer
                    if (detouragePoints.length >= 3) {
                      const firstPoint = detouragePoints[0];
                      const distance = Math.sqrt(
                        Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
                      );
                      // Zone de détection plus grande (25px au lieu de 15px)
                      if (distance < 25) {
                        // Fermer le polygone - ajouter le premier point à la fin pour fermer
                        setDetouragePoints(prev => [...prev, { x: firstPoint.x, y: firstPoint.y }]);
                        toast.success(language === "fr" ? "Sélection fermée ! Cliquez sur 'Appliquer' pour détourer." : "Selection closed! Click 'Apply' to cutout.");
                        return;
                      }
                    }
                    
                    // Ajouter un nouveau point
                    setDetouragePoints(prev => [...prev, { x, y }]);
                  } else if (e.target === e.currentTarget) {
                    // Clic sur la zone de travail (zone grise) hors d'éléments → désélectionner
                    // (le lasso gère déjà la désélection dans handleLassoStart)
                    // Ne pas désélectionner si on vient de faire un clic droit
                    if (!isLassoing && !justDidRightClickRef.current && !justFinishedLassoRef.current) {
                      setSelectedElementId(null);
                      setSelectedElementIds(new Set());
                      setActiveCanvasPhoto(null);
                    }
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  // Calculer la position du drop en cm (relative à la page blanche)
                  let dropPositionCm: { x: number; y: number } | undefined;
                  const page = pageRef.current;
                  if (page) {
                    const pageRect = page.getBoundingClientRect();
                    const pxPerCm = canvasDimensions.pxPerCm;
                    const dropXcm = (e.clientX - pageRect.left) / pxPerCm;
                    const dropYcm = (e.clientY - pageRect.top) / pxPerCm;
                    dropPositionCm = { x: dropXcm, y: dropYcm };
                  }
                  // 1) Fichiers glissés depuis le bureau
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const files = Array.from(e.dataTransfer.files).filter(f =>
                      f.type.startsWith("image/") || f.name.match(/\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i)
                    );
                    for (const file of files) {
                      try {
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result as string);
                          reader.onerror = reject;
                          reader.readAsDataURL(file);
                        });
                        const name = file.name.replace(/\.[^/.]+$/, "");
                        addToCanvas(dataUrl, name, dropPositionCm);
                      } catch (err) {
                        console.error("Erreur import fichier sur canvas:", err);
                      }
                    }
                    if (files.length > 0) return;
                  }
                  // 2) Données internes (panier, bibliothèque, collecteur)
                  const data = e.dataTransfer.getData("text/plain");
                  if (data) {
                    try {
                      const item = JSON.parse(data);
                      if (item.src) {
                        addToCanvas(item.src, item.name, dropPositionCm);
                        const basketItem = basketItems.find(b => b.photoUrl === item.src);
                        if (basketItem) {
                          if (basketItem.id !== undefined) if (basketItem.id !== undefined) await removeFromCreationsBasket(basketItem.id);
                        }
                      }
                    } catch {
                      if (data.startsWith("data:") || data.startsWith("http")) {
                        addToCanvas(data, undefined, dropPositionCm);
                      }
                    }
                  }
                }}
              >
                {/* PAGE BLANCHE - Centrée dans la zone de travail */}
                <div
                  ref={pageRef}
                  className="absolute bg-white shadow-xl"
                  style={{
                    left: canvasDimensions.pageOffsetX,
                    top: canvasDimensions.pageOffsetY,
                    width: canvasDimensions.pageWidth,
                    height: canvasDimensions.pageHeight,
                    // Bordure légère pour délimiter la page
                    border: '1px solid #cbd5e1',
                    // overflow:visible pour que les croix de repérage sortent de la page blanche
                    overflow: 'visible',
                  }}
                  onClick={(e) => {
                    // Désélectionner si on clique dans le vide (pas sur un élément canvas)
                    // Ne pas désélectionner si on vient de faire un clic droit ou un lasso
                    const clickedOnElement = !!(e.target as HTMLElement).closest('[data-canvas-element="true"]');
                    if (!clickedOnElement && !isLassoing && !justDidRightClickRef.current && !justFinishedLassoRef.current) {
                      setSelectedElementId(null);
                      setSelectedElementIds(new Set());
                      setActiveCanvasPhoto(null);
                    }
                  }}
                >
                  {/* Grille sur la page - quadrillage tous les 1cm */}
                  {showGrid && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, rgba(100, 116, 139, 0.3) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(100, 116, 139, 0.3) 1px, transparent 1px)
                        `,
                        // Grille tous les 1cm
                        backgroundSize: `${canvasDimensions.pxPerCm}px ${canvasDimensions.pxPerCm}px`,
                      }}
                    />
                  )}
                  
                  {/* Crosshair (réticule) au centre de la page */}
                  {showCrosshair && (
                    <>
                      {/* Ligne horizontale */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: 0,
                          right: 0,
                          top: '50%',
                          height: '1px',
                          backgroundColor: 'rgba(168, 85, 247, 0.6)', // violet-500
                          transform: 'translateY(-0.5px)',
                        }}
                      />
                      {/* Ligne verticale */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          top: 0,
                          bottom: 0,
                          left: '50%',
                          width: '1px',
                          backgroundColor: 'rgba(168, 85, 247, 0.6)', // violet-500
                          transform: 'translateX(-0.5px)',
                        }}
                      />
                      {/* Point central */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: '50%',
                          top: '50%',
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'rgba(168, 85, 247, 0.8)',
                          borderRadius: '50%',
                          transform: 'translate(-50%, -50%)',
                          boxShadow: '0 0 4px rgba(168, 85, 247, 0.5)',
                        }}
                      />
                    </>
                  )}
                  
                  {/* Éléments du canvas - positionnés sur la page */}
                  {canvasElements.map((element) => {
                    // Convertir les dimensions de cm vers pixels pour l'affichage
                    const pxPerCm = canvasDimensions.pxPerCm;
                    const elementLeftPx = element.x * pxPerCm;
                    const elementTopPx = element.y * pxPerCm;
                    const elementWidthPx = element.width * pxPerCm;
                    const elementHeightPx = element.height * pxPerCm;
                    const isSelected = selectedElementId === element.id;
                    const isInMultiSelection = selectedElementIds.has(element.id);
                    const isMultiMode = selectedElementIds.size > 1;
                    
                    return (
                    <>
                    {/* Rendu spécial pour shape='line' : SVG absolu couvrant toute la page */}
                    {element.type === 'shape' && element.shape === 'line' ? (
                      <svg
                        key={element.id}
                        data-canvas-element="true"
                        className="absolute inset-0"
                        style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: element.zIndex, opacity: element.opacity, pointerEvents: 'none' }}
                      >
                        {/* Calcul des coordonnées pixel pour le rendu */}
                        {(() => {
                          const x1px = element.x * pxPerCm;
                          const y1px = element.y * pxPerCm;
                          const x2px = element.width * pxPerCm;
                          const y2px = element.height * pxPerCm;
                          const lineColor = element.openingColor && element.openingColor !== 'transparent' ? element.openingColor : '#1a1a1a';
                          const lw = isSelected ? 3 : 2;
                          // Parser le customPath si présent (format : "M x1 y1 Q cx cy x2 y2" en cm)
                          let ctrlXpx: number | null = null;
                          let ctrlYpx: number | null = null;
                          let svgPath: string | null = null;
                          if (element.customPath) {
                            const m = element.customPath.match(/M\s*([\d.\-]+)\s+([\d.\-]+)\s+Q\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)/);
                            if (m) {
                              const qx1 = parseFloat(m[1]) * pxPerCm;
                              const qy1 = parseFloat(m[2]) * pxPerCm;
                              ctrlXpx = parseFloat(m[3]) * pxPerCm;
                              ctrlYpx = parseFloat(m[4]) * pxPerCm;
                              const qx2 = parseFloat(m[5]) * pxPerCm;
                              const qy2 = parseFloat(m[6]) * pxPerCm;
                              svgPath = `M ${qx1} ${qy1} Q ${ctrlXpx} ${ctrlYpx} ${qx2} ${qy2}`;
                            }
                          }
                          const handleDown = (e: React.MouseEvent) => {
                            if (isLineDrawMode) return;
                            handleMouseDown(e, element.id);
                          };
                          return (
                            <>
                              {/* Halo blanc pour lisibilité */}
                              {svgPath ? (
                                <path d={svgPath} stroke="white" strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.5} style={{ pointerEvents: 'none' }} />
                              ) : (
                                <line x1={x1px} y1={y1px} x2={x2px} y2={y2px} stroke="white" strokeWidth={8} strokeLinecap="round" opacity={0.5} style={{ pointerEvents: 'none' }} />
                              )}
                              {/* Trait principal (visuel, sans événements souris) */}
                              {svgPath ? (
                                <path d={svgPath} stroke={lineColor} strokeWidth={lw} strokeLinecap="round" fill="none" style={{ pointerEvents: 'none' }} />
                              ) : (
                                <line x1={x1px} y1={y1px} x2={x2px} y2={y2px} stroke={lineColor} strokeWidth={lw} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                              )}
                              {/* Zone de clic élargie (hit area transparente 16px) — facilite la sélection individuelle */}
                              {svgPath ? (
                                <path
                                  d={svgPath}
                                  stroke="transparent" strokeWidth={20} strokeLinecap="round" fill="none"
                                  style={{ pointerEvents: 'stroke', cursor: element.locked ? 'not-allowed' : 'pointer' }}
                                  onMouseDown={handleDown}
                                  onClick={(e) => { e.stopPropagation(); }}
                                />
                              ) : (
                                <line
                                  x1={x1px} y1={y1px} x2={x2px} y2={y2px}
                                  stroke="transparent" strokeWidth={20} strokeLinecap="round"
                                  style={{ pointerEvents: 'stroke', cursor: element.locked ? 'not-allowed' : 'pointer' }}
                                  onMouseDown={handleDown}
                                  onClick={(e) => { e.stopPropagation(); }}
                                />
                              )}
                              {/* Contour de sélection indigo */}
                              {isSelected && (
                                svgPath ? (
                                  <path d={svgPath} stroke="#6366f1" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.35} />
                                ) : (
                                  <line x1={x1px} y1={y1px} x2={x2px} y2={y2px} stroke="#6366f1" strokeWidth={5} strokeLinecap="round" opacity={0.35} />
                                )
                              )}
                              {/* Poignée verte du point de contrôle (courbe uniquement, si sélectionné) */}
                              {isSelected && !isLineDrawMode && svgPath && ctrlXpx !== null && ctrlYpx !== null && (
                                <>
                                  {/* Ligne de guidage en pointillés du point de contrôle aux extrémités */}
                                  <line x1={x1px} y1={y1px} x2={ctrlXpx} y2={ctrlYpx} stroke="#22c55e" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
                                  <line x1={x2px} y1={y2px} x2={ctrlXpx} y2={ctrlYpx} stroke="#22c55e" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
                                  {/* Poignée draggable */}
                                  <circle
                                    cx={ctrlXpx} cy={ctrlYpx} r={7}
                                    fill="#22c55e" stroke="white" strokeWidth={2}
                                    style={{ cursor: 'move', pointerEvents: 'all' }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      if (element.locked) return;
                                      draggingCtrlElementIdRef.current = element.id;
                                      setIsDraggingCtrl(true);
                                      setDragStart({ x: e.clientX, y: e.clientY });
                                    }}
                                  />
                                </>
                              )}
                            </>
                          );
                        })()}
                        {/* Poignées aux extrémités (seulement si sélectionné) */}
                        {isSelected && !isLineDrawMode && (
                          <>
                            {/* Extrémité gauche (point de départ) */}
                            <circle
                              cx={element.x * pxPerCm} cy={element.y * pxPerCm} r={6}
                              fill="#a855f7" stroke="white" strokeWidth={2}
                              style={{ cursor: 'nw-resize', pointerEvents: 'all' }}
                              onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'nw'); }}
                            />
                            {/* Extrémité droite (point d'arrivée) */}
                            <circle
                              cx={element.width * pxPerCm} cy={element.height * pxPerCm} r={6}
                              fill="#a855f7" stroke="white" strokeWidth={2}
                              style={{ cursor: 'ne-resize', pointerEvents: 'all' }}
                              onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'ne'); }}
                            />

                          </>
                        )}
                      </svg>
                    ) : (
                    <div
                      key={element.id}
                      data-canvas-element="true"
                      className={`absolute ${element.locked ? "cursor-not-allowed" : isDragging && (isSelected || isInMultiSelection) ? "cursor-move" : "cursor-default"} ${
                        // Pas de ring rectangulaire sur les shapes (le contour SVG suffit) ni les lignes
                        element.type === 'shape' ? '' :
                        isMultiMode && isInMultiSelection && isSelected
                          ? "ring-2 ring-purple-500 ring-offset-1" // Élément principal dans la multi-sélection
                          : isMultiMode && isInMultiSelection
                            ? "ring-2 ring-blue-400 ring-offset-1" // Élément secondaire dans la multi-sélection
                            : isSelected && !isMultiMode
                              ? "ring-2 ring-purple-500" // Sélection simple
                              : element.groupId
                                ? "ring-1 ring-dashed ring-emerald-400" // Élément groupé (non sélectionné)
                                : ""
                      }`}
                      style={{
                        left: elementLeftPx,
                        top: elementTopPx,
                        width: elementWidthPx,
                        height: elementHeightPx,
                        transform: `rotate(${element.rotation}deg) ${element.flipX ? "scaleX(-1)" : ""} ${element.flipY ? "scaleY(-1)" : ""}`,
                        // Pour la forme 'line' : pivoter depuis le point de départ (gauche, milieu)
                        // Cela garantit que la ligne reste ancrée à (x,y) quelle que soit l'orientation
                        transformOrigin: element.type === 'shape' && element.shape === 'line' ? '0 50%' : undefined,
                        zIndex: element.zIndex, // Conserver le z-index de l'élément même s'il est sélectionné
                        opacity: element.opacity,
                        transition: (isDragging || isResizing) ? 'none' : 'all 0.1s ease',
                        userSelect: 'none',
                        // overflow:visible obligatoire pour que les poignées de redimensionnement
                        // (positionnées hors des limites du div) restent visibles et cliquables
                        overflow: 'visible',
                        // Agrandir la zone de clic invisible pour faciliter la sélection de la ligne
                        paddingTop: element.type === 'shape' && element.shape === 'line' ? '8px' : undefined,
                        paddingBottom: element.type === 'shape' && element.shape === 'line' ? '8px' : undefined,
                        marginTop: element.type === 'shape' && element.shape === 'line' ? '-8px' : undefined,
                        marginBottom: element.type === 'shape' && element.shape === 'line' ? '-8px' : undefined,
                      }}
                      draggable={false}
                      onMouseDown={(e) => handleMouseDown(e, element.id)}
                      onContextMenu={(e) => handleContextMenu(e, element.id)}
                      onClick={(e) => {
                        // Empêcher la propagation vers la page blanche (évite la désélection involontaire)
                        e.stopPropagation();
                        // Ne pas traiter le onClick si on vient de faire un clic droit (toggle sélection)
                        if (justDidRightClickRef.current) return;
                        
                        if (!isDragging && !element.locked) {
                          if (e.shiftKey) {
                            // Shift+clic : ajouter ou retirer de la multi-sélection
                            setSelectedElementIds(prev => {
                              const next = new Set(prev);
                              if (next.has(element.id) && next.size > 1) {
                                next.delete(element.id);
                              } else {
                                next.add(element.id);
                              }
                              return next;
                            });
                            setSelectedElementId(element.id);
                          } else if (selectedElementIds.has(element.id) && selectedElementIds.size > 1) {
                            // Clic simple sur un élément déjà dans une multi-sélection : ne pas réinitialiser
                            setSelectedElementId(element.id);
                          } else {
                            // Sélection simple
                            selectElementWithGroup(element.id);
                            setImageZoom(100);
                          }
                          if (element.src) setActiveCanvasPhoto(element.src);
                        }
                        // Fermer le menu contextuel si ouvert
                        closeContextMenu();
                      }}
                    >
                    {element.type === "image" && element.src && (
                      <CanvasImage
                        src={element.src}
                        dataElementId={element.id}
                      />
                    )}

                    {/* Rendu découpe interactive (type shape) */}
                    {element.type === "shape" && (() => {
                      const w = elementWidthPx;
                      const h = elementHeightPx;
                      // Couleur de l'ouverture : transparent si aucune couleur n'est définie
                      const fillColor = element.openingColor && element.openingColor !== 'transparent'
                        ? element.openingColor
                        : 'transparent';

                      // Si un path personnalisé (déformation de bord) est présent,
                      // le convertir de coordonnées cm (page blanche) en coordonnées px (element local)
                      if (element.customPath) {
                        const pxPerCm = elementWidthPx / element.width;
                        // Transformer les coordonnées absolues cm en coordonnées locales px
                        // Supporte M, L (2 coords), Q (4 coords : cx,cy x2,y2), Z
                        const localPath = element.customPath.replace(
                          /([MLQZ])([^MLQZ]*)/g,
                          (_m: string, cmd: string, args: string) => {
                            if (cmd === 'Z') return 'Z ';
                            const nums = args.trim().replace(/,/g, ' ').split(/\s+/).filter(Boolean).map(Number);
                            const converted: number[] = [];
                            for (let ni = 0; ni < nums.length; ni += 2) {
                              converted.push((nums[ni] - element.x) * pxPerCm);
                              converted.push((nums[ni + 1] - element.y) * pxPerCm);
                            }
                            if (cmd === 'Q' && converted.length >= 4) {
                              return `Q${converted[0].toFixed(2)},${converted[1].toFixed(2)} ${converted[2].toFixed(2)},${converted[3].toFixed(2)} `;
                            }
                            return `${cmd}${converted[0].toFixed(2)},${converted[1].toFixed(2)} `;
                          }
                        );
                        return (
                          <svg
                            width={w} height={h}
                            viewBox={`0 0 ${w} ${h}`}
                            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
                          >
                            <path
                              d={localPath}
                              fill={fillColor}
                              stroke="#6366f1"
                              strokeWidth="1.5"
                              strokeDasharray="4 2"
                            />
                          </svg>
                        );
                      }

                      // ─── Rendu spécial pour la forme 'line' ───────────────────────────────────
                      // Une ligne est un segment pur : fill=none, stroke coloré, épaisseur 2px
                      if (element.shape === 'line') {
                        const lineStroke = element.openingColor && element.openingColor !== 'transparent'
                          ? element.openingColor
                          : '#1a1a1a';
                        return (
                          <svg
                            width={w}
                            height={h}
                            viewBox={`0 0 ${w} ${h}`}
                            className="absolute inset-0 pointer-events-none"
                            style={{ overflow: 'visible' }}
                          >
                            {/* Halo blanc pour lisibilité sur fond sombre */}
                            <line
                              x1={0} y1={h / 2}
                              x2={w} y2={h / 2}
                              stroke="white"
                              strokeWidth={6}
                              strokeLinecap="round"
                              opacity={0.6}
                            />
                            {/* Ligne principale */}
                            <line
                              x1={0} y1={h / 2}
                              x2={w} y2={h / 2}
                              stroke={lineStroke}
                              strokeWidth={isSelected ? 3 : 2}
                              strokeLinecap="round"
                            />
                            {/* Contour de sélection indigo */}
                            {isSelected && (
                              <line
                                x1={0} y1={h / 2}
                                x2={w} y2={h / 2}
                                stroke="#6366f1"
                                strokeWidth={5}
                                strokeLinecap="round"
                                opacity={0.35}
                              />
                            )}
                          </svg>
                        );
                      }
                      // ─── Fin rendu ligne ──────────────────────────────────────────────────────

                      // Construire le path SVG selon la forme
                      let pathD = '';
                      switch (element.shape) {
                        case 'square': {
                          const side = Math.min(w, h);
                          const ox = (w - side) / 2;
                          const oy = (h - side) / 2;
                          pathD = `M${ox},${oy} h${side} v${side} h-${side} Z`;
                          break;
                        }
                        case 'round': {
                          const r = Math.min(w, h) / 2;
                          const cx = w / 2; const cy = h / 2;
                          pathD = `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0`;
                          break;
                        }
                        case 'oval':
                          pathD = `M${w / 2},0 a${w / 2},${h / 2} 0 1,0 0.001,0 Z`;
                          break;
                        case 'arch': {
                          const aw = w; const ah = h;
                          pathD = `M0,${ah} L0,${ah / 2} Q0,0 ${aw / 2},0 Q${aw},0 ${aw},${ah / 2} L${aw},${ah} Z`;
                          break;
                        }
                        case 'puzzle': {
                          // Utilise la fonction utilitaire buildPuzzlePath avec les edges de la pièce
                          // Si puzzleEdges n'est pas défini (ancienne pièce), utilise l'alternance par défaut
                          const edges = element.puzzleEdges ?? { top: 1, right: 1, bottom: 1, left: -1 };
                          pathD = buildPuzzlePath(w, h, edges);
                          break;
                        }
                        case 'heart': {
                          /**
                           * Cœur paramétrable normalisé sur la boîte [0,w] × [0,h].
                           * Les lobes sont en HAUT (y faible) et la pointe en BAS (y = h).
                           * heartDepth (0–100) contrôle la profondeur de l'encoche centrale :
                           *   0 = encoche presque plate (cœur très rond)
                           *   100 = encoche très profonde (cœur classique pointu)
                           */
                          const depth = (element.heartDepth ?? 50) / 100;
                          // Encoche centrale : de y=0.25 (plat) à y=0.50 (profond)
                          const notchY = h * (0.25 + depth * 0.25);
                          // Sommet des lobes
                          const lobeTopY = h * 0.05;
                          // Largeur du lobe (centre du lobe à x=w*0.25 et x=w*0.75)
                          pathD = [
                            // Départ : encoche centrale (haut, milieu)
                            `M ${w * 0.5} ${notchY}`,
                            // Lobe gauche
                            `C ${w * 0.5} ${h * 0.10} ${w * 0.0} ${h * 0.10} ${w * 0.0} ${h * 0.35}`,
                            `C ${w * 0.0} ${h * 0.60} ${w * 0.5} ${h * 0.75} ${w * 0.5} ${h * 1.0}`,
                            // Lobe droit (symétrique)
                            `C ${w * 0.5} ${h * 0.75} ${w * 1.0} ${h * 0.60} ${w * 1.0} ${h * 0.35}`,
                            `C ${w * 1.0} ${h * 0.10} ${w * 0.5} ${h * 0.10} ${w * 0.5} ${notchY} Z`,
                          ].join(' ');
                          break;
                        }
                        case 'star': {
                          // Étoile paramétrable : starBranches (3–8, défaut 5)
                          const scx = w / 2, scy = h / 2;
                          const outerR = Math.min(w, h) / 2;
                          const innerR = outerR * 0.42;
                          const branches = element.starBranches ?? 5;
                          const starPts: string[] = [];
                          for (let i = 0; i < branches * 2; i++) {
                            const angle = (i * Math.PI) / branches - Math.PI / 2;
                            const r = i % 2 === 0 ? outerR : innerR;
                            starPts.push(`${i === 0 ? 'M' : 'L'} ${scx + r * Math.cos(angle)} ${scy + r * Math.sin(angle)}`);
                          }
                          pathD = starPts.join(' ') + ' Z';
                          break;
                        }
                        case 'diamond': {
                          // Losange : 4 points aux milieux des côtés de la boîte
                          pathD = `M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`;
                          break;
                        }
                        case 'hexagon': {
                          // Hexagone régulier inscrit dans la boîte (aplati horizontal)
                          const hcx = w / 2, hcy = h / 2;
                          const hrx = w / 2, hry = h / 2;
                          const hexPts: string[] = [];
                          for (let i = 0; i < 6; i++) {
                            const a = (i * Math.PI) / 3 - Math.PI / 6;
                            hexPts.push(`${i === 0 ? 'M' : 'L'} ${hcx + hrx * Math.cos(a)} ${hcy + hry * Math.sin(a)}`);
                          }
                          pathD = hexPts.join(' ') + ' Z';
                          break;
                        }
                        default: // rect
                          pathD = `M0,0 h${w} v${h} h-${w} Z`;
                      }
                      return (
                        <svg
                          width={w}
                          height={h}
                          viewBox={`0 0 ${w} ${h}`}
                          className="absolute inset-0 pointer-events-none"
                          style={{ overflow: 'visible' }}
                        >
                          {/* Couleur opaque de la découpe (transparent en mode vierge) */}
                          <path d={pathD} fill={element.puzzleTransparent ? 'none' : fillColor} />
                          {/* Contour toujours visible pour les pièces puzzle */}
                          {/* Mode vierge : contour noir épais (2.5px) pour découpe laser sur bois */}
                          {/* Mode normal : gris foncé (1.8px) ou violet sélectioné (2.5px) */}
                          {/* Halo blanc sous le contour pour lisibilité sur fond sombre */}
                          {element.shape === 'puzzle' && (
                            <path
                              d={pathD}
                              fill="none"
                              stroke="white"
                              strokeWidth={element.puzzleTransparent ? 6 : (isSelected ? 6 : 5)}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity={0.7}
                            />
                          )}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={isSelected ? '#6366f1' : (element.shape === 'puzzle' ? (element.puzzleTransparent ? '#000000' : '#1a1a1a') : '#9ca3af')}
                            strokeWidth={element.shape === 'puzzle' ? (element.puzzleTransparent ? 4 : (isSelected ? 4 : 3)) : (isSelected ? 2 : 1)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={!isSelected && element.shape !== 'puzzle' ? '4 3' : undefined}
                          />
                          {/* Numéro de pièce au centre (optionnel, pour puzzles enfants) */}
                          {element.shape === 'puzzle' && element.puzzleShowNumber && element.openingIndex != null && (
                            <>
                              {/* Halo blanc pour lisibilité sur fond coloré */}
                              <text
                                x={w / 2}
                                y={h / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={Math.max(8, Math.min(w, h) * (element.puzzleNumberSize === 'small' ? 0.20 : element.puzzleNumberSize === 'large' ? 0.55 : 0.35))}
                                fontWeight="bold"
                                fontFamily="Arial, sans-serif"
                                fill="white"
                                stroke="white"
                                strokeWidth={4}
                                strokeLinejoin="round"
                                style={{ userSelect: 'none' }}
                              >
                                {element.openingIndex}
                              </text>
                              {/* Numéro principal en gris foncé */}
                              <text
                                x={w / 2}
                                y={h / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={Math.max(8, Math.min(w, h) * (element.puzzleNumberSize === 'small' ? 0.20 : element.puzzleNumberSize === 'large' ? 0.55 : 0.35))}
                                fontWeight="bold"
                                fontFamily="Arial, sans-serif"
                                fill="#1f2937"
                                style={{ userSelect: 'none' }}
                              >
                                {element.openingIndex}
                              </text>
                            </>
                          )}
                        </svg>
                      );
                    })()}

                    {/* Rendu texte */}
                    {element.type === "text" && (
                      <div
                        className="w-full h-full flex items-center overflow-hidden select-none"
                        style={{
                          fontFamily: element.fontFamily || "Inter",
                          fontSize: `${(element.fontSize || 36) * pxPerCm / 37.8}px`,
                          color: element.fontColor || "#1a1a1a",
                          fontWeight: element.fontBold ? "bold" : "normal",
                          fontStyle: element.fontItalic ? "italic" : "normal",
                          textDecoration: element.fontUnderline ? "underline" : "none",
                          textAlign: element.textAlign || "center",
                          WebkitTextStroke: (element.strokeWidth || 0) > 0
                            ? `${element.strokeWidth}px ${element.strokeColor || "#000"}`
                            : undefined,
                          textShadow: (element.shadowBlur || 0) > 0 || element.shadowOffsetX || element.shadowOffsetY
                            ? `${element.shadowOffsetX || 0}px ${element.shadowOffsetY || 0}px ${element.shadowBlur || 0}px ${element.shadowColor || "rgba(0,0,0,0.5)"}`
                            : undefined,
                          padding: "4px 8px",
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.3,
                          width: "100%",
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingTextId(element.id);
                        }}
                      >
                        {element.text || ""}
                      </div>
                    )}

                    {/* Édition inline du texte (double-clic) */}
                    {element.type === "text" && editingTextId === element.id && (
                      <textarea
                        autoFocus
                        className="absolute inset-0 w-full h-full resize-none bg-white/90 border-2 border-purple-400 rounded p-1 z-50 focus:outline-none"
                        style={{
                          fontFamily: element.fontFamily || "Inter",
                          fontSize: `${(element.fontSize || 36) * pxPerCm / 37.8}px`,
                          color: element.fontColor || "#1a1a1a",
                          fontWeight: element.fontBold ? "bold" : "normal",
                          fontStyle: element.fontItalic ? "italic" : "normal",
                          textAlign: element.textAlign || "center",
                          lineHeight: 1.3,
                        }}
                        value={element.text || ""}
                        onChange={(e) => updateCanvasElement(element.id, { text: e.target.value })}
                        onBlur={() => setEditingTextId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingTextId(null);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    {/* Contrôles de l'élément sélectionné - Poignées de redimensionnement */}
                    {(selectedElementId === element.id || isInMultiSelection) && !element.locked &&
                     element.name !== (language === 'fr' ? 'Fond' : 'Background') && (
                      <>
                        {/* Pour la forme 'line' : uniquement 2 poignées aux extrémités */}
                        {element.type === 'shape' && element.shape === 'line' ? (
                          <>
                            {/* Extrémité gauche */}
                            <div
                              className="absolute -top-1 -left-1 w-3 h-3 bg-purple-500 border-2 border-white rounded-full cursor-nw-resize shadow-md hover:bg-purple-600 z-[100]"
                              draggable={false}
                              onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'nw'); }}
                            />
                            {/* Extrémité droite */}
                            <div
                              className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 border-2 border-white rounded-full cursor-ne-resize shadow-md hover:bg-purple-600 z-[100]"
                              draggable={false}
                              onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'ne'); }}
                            />
                            {/* Poignée de rotation */}
                            {selectedElementId === element.id && (
                              <div
                                className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-md cursor-grab active:cursor-grabbing z-[110] flex items-center justify-center"
                                draggable={false}
                                title={language === 'fr' ? 'Faire pivoter' : 'Rotate'}
                                onMouseDown={(e) => { e.stopPropagation(); handleRotateStart(e, element.id); }}
                              >
                                <RotateCcw className="w-2.5 h-2.5 text-white pointer-events-none" />
                              </div>
                            )}
                          </>
                        ) : (<>
                        {/* Poignées de redimensionnement aux 4 coins */}
                        {/* Nord-Ouest (haut-gauche) */}
                        <div
                          className="absolute -top-1 -left-1 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-nw-resize shadow-md hover:bg-purple-600 z-[100]"
                          draggable={false}
                          title={(element.shape !== 'round' && element.shape !== 'square') ? (language === 'fr' ? 'Redimensionner (Maj = carré)' : 'Resize (Shift = square)') : undefined}
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'nw'); }}
                        />
                        {/* Nord-Est (haut-droite) */}
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-ne-resize shadow-md hover:bg-purple-600 z-[100]"
                          draggable={false}
                          title={(element.shape !== 'round' && element.shape !== 'square') ? (language === 'fr' ? 'Redimensionner (Maj = carré)' : 'Resize (Shift = square)') : undefined}
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'ne'); }}
                        />
                        {/* Sud-Ouest (bas-gauche) */}
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-sw-resize shadow-md hover:bg-purple-600 z-[100]"
                          draggable={false}
                          title={(element.shape !== 'round' && element.shape !== 'square') ? (language === 'fr' ? 'Redimensionner (Maj = carré)' : 'Resize (Shift = square)') : undefined}
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'sw'); }}
                        />
                        {/* Sud-Est (bas-droite) */}
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 border-2 border-white rounded-sm cursor-se-resize shadow-md hover:bg-purple-600 z-[100]"
                          draggable={false}
                          title={(element.shape !== 'round' && element.shape !== 'square') ? (language === 'fr' ? 'Redimensionner (Maj = carré)' : 'Resize (Shift = square)') : undefined}
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'se'); }}
                        />
                        {/* Poignées de côté - étirement indépendant largeur/hauteur (Maj = carré pour non-Rond/Carré) */}
                        {/* Nord (milieu haut) */}
                        <div
                          className="absolute left-1/2 bg-blue-400 border-2 border-white rounded-sm cursor-n-resize shadow-md hover:bg-blue-500"
                          style={{ top: -5, transform: 'translateX(-50%)', width: 20, height: 8, zIndex: 100 }}
                          draggable={false}
                          title={(element.shape !== 'round' && element.shape !== 'square') ? (language === 'fr' ? 'Étirer (Maj = carré)' : 'Stretch (Shift = square)') : undefined}
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'n'); }}
                        />
                        {/* Sud (milieu bas) */}
                        <div
                          className="absolute left-1/2 bg-blue-400 border-2 border-white rounded-sm cursor-s-resize shadow-md hover:bg-blue-500"
                          style={{ bottom: -5, transform: 'translateX(-50%)', width: 20, height: 8, zIndex: 100 }}
                          draggable={false}
                          title={(element.shape !== 'round' && element.shape !== 'square') ? (language === 'fr' ? 'Étirer (Maj = carré)' : 'Stretch (Shift = square)') : undefined}
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 's'); }}
                        />
                        {/* Ouest (milieu gauche) */}
                        <div
                          className="absolute top-1/2 bg-blue-400 border-2 border-white rounded-sm cursor-w-resize shadow-md hover:bg-blue-500"
                          style={{ left: -5, transform: 'translateY(-50%)', width: 8, height: 20, zIndex: 100 }}
                          draggable={false}
                          title={(element.shape !== 'round' && element.shape !== 'square') ? (language === 'fr' ? 'Étirer (Maj = carré)' : 'Stretch (Shift = square)') : undefined}
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'w'); }}
                        />
                        {/* Est (milieu droit) */}
                        <div
                          className="absolute top-1/2 bg-blue-400 border-2 border-white rounded-sm cursor-e-resize shadow-md hover:bg-blue-500"
                          style={{ right: -5, transform: 'translateY(-50%)', width: 8, height: 20, zIndex: 100 }}
                          draggable={false}
                          title={(element.shape !== 'round' && element.shape !== 'square') ? (language === 'fr' ? 'Étirer (Maj = carré)' : 'Stretch (Shift = square)') : undefined}
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, element.id, 'e'); }}
                        />
                        {/* Poignée de rotation (cercle vert, au-dessus au centre) */}
                        {selectedElementId === element.id && (
                          <div
                            className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-md cursor-grab active:cursor-grabbing z-[110] flex items-center justify-center"
                            draggable={false}
                            title={language === 'fr' ? 'Faire pivoter' : 'Rotate'}
                            onMouseDown={(e) => { e.stopPropagation(); handleRotateStart(e, element.id); }}
                          >
                            <RotateCcw className="w-2.5 h-2.5 text-white pointer-events-none" />
                          </div>
                        )}
                        {/* Bouton "Valider le détourage" — envoie l'image dans le collecteur (éléments image uniquement) */}
                        {selectedElementId === element.id && element.type === 'image' && element.src && (
                          <div
                            className="absolute -top-9 left-1/2 -translate-x-1/2 bg-white border-2 border-purple-400 hover:bg-purple-50 text-purple-700 rounded-full px-3 py-1 shadow-lg cursor-pointer z-[120] flex items-center gap-1.5 whitespace-nowrap"
                            draggable={false}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newItem: CollectorItem = {
                                id: `collector_${Date.now()}`,
                                type: 'detourage',
                                src: element.src!,
                                name: element.name || (language === 'fr' ? 'Pièce détourée' : 'Cutout piece'),
                                thumbnail: element.src!
                              };
                              setCollectorItems(prev => [...prev, newItem]);
                              toast.success(language === 'fr' ? 'Pièce envoyée vers "Pièces détourées"' : 'Piece sent to "Cutout pieces"');
                            }}
                          >
                            <span className="text-[11px] font-semibold">
                              {language === 'fr' ? '→ Envoyer vers Pièces détourées' : '→ Send to Cutout pieces'}
                            </span>
                          </div>
                        )}
                        {/* Bouton menu contextuel ⋮ (en haut à droite de l'élément sélectionné) */}
                        {selectedElementId === element.id && (
                          <div
                            className="absolute -top-4 right-3 w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-100 z-[110]"
                            draggable={false}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                elementId: element.id
                              });
                            }}
                          >
                            <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                          </div>
                        )}
                        {/* Bouton corbeille (supprimer la forme) */}
                        {selectedElementId === element.id && element.type === 'shape' && (
                          <div
                            className="absolute -top-4 -right-4 w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-red-600 z-[110]"
                            draggable={false}
                            title={language === 'fr' ? 'Supprimer cette forme' : 'Delete this shape'}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCanvasElements(prev => prev.filter(el => el.id !== element.id));
                              setSelectedElementId(null);
                            }}
                          >
                            <X className="w-3 h-3 text-white pointer-events-none" />
                          </div>
                        )}
                      </>)}
                    </>
                    )}
                    {/* ── Overlay de segments cliquables (actif uniquement en mode édition de segments) ── */}
                    {segmentEditorElementId === element.id && element.shape !== 'line' && (() => {
                      const { pxPerCm } = canvasDimensions;
                      const segs = buildShapeSegments(element);
                      if (!segs || segs.length === 0) return null;
                      const W = element.width * pxPerCm;
                      const H = element.height * pxPerCm;
                      return (
                        <>
                          <svg
                            key="segment-overlay"
                            className="absolute inset-0"
                            style={{ width: W, height: H, overflow: 'visible', zIndex: 50, pointerEvents: 'all' }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {segs.map((seg, i) => {
                              const x1 = (seg.x1 - element.x) * pxPerCm;
                              const y1 = (seg.y1 - element.y) * pxPerCm;
                              const x2 = (seg.x2 - element.x) * pxPerCm;
                              const y2 = (seg.y2 - element.y) * pxPerCm;
                              const isSelected = selectedSegmentIndex === i;
                              const hasCp = seg.type === 'Q' && seg.cx !== undefined && seg.cy !== undefined;
                              const cpx = hasCp ? (seg.cx! - element.x) * pxPerCm : 0;
                              const cpy = hasCp ? (seg.cy! - element.y) * pxPerCm : 0;
                              const pathD = hasCp
                                ? `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`
                                : `M ${x1} ${y1} L ${x2} ${y2}`;
                              return (
                                <g key={i}>
                                  {/* Zone de clic élargie transparente */}
                                  <path d={pathD} fill="none" stroke="transparent" strokeWidth={18}
                                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                    onClick={(e) => {
                                      e.stopPropagation(); e.preventDefault();
                                      if (!isSelected) setRoundIntensity(35);
                                      setSelectedSegmentIndex(isSelected ? null : i);
                                    }}
                                  />
                                  {/* Trait de surbrillance */}
                                  {isSelected && (
                                    <path d={pathD} fill="none" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="5 4" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                                  )}
                                  {/* Poignée Bézier : ligne + cercle draggable */}
                                  {hasCp && (
                                    <>
                                      {/* Ligne du milieu du segment vers le point de contrôle */}
                                      <line
                                        x1={(x1 + x2) / 2} y1={(y1 + y2) / 2} x2={cpx} y2={cpy}
                                        stroke="#818cf8" strokeWidth={1} strokeDasharray="3 2"
                                        style={{ pointerEvents: 'none' }}
                                      />
                                      {/* Cercle du point de contrôle */}
                                      <circle
                                        cx={cpx} cy={cpy} r={6}
                                        fill={draggingCPIndex === i ? "#f97316" : "#6366f1"}
                                        stroke="#fff" strokeWidth={2}
                                        style={{ pointerEvents: 'all', cursor: draggingCPIndex === i ? 'grabbing' : 'grab' }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setDraggingCPIndex(i);
                                          setSelectedSegmentIndex(i);

                                          const svgEl = (e.target as SVGCircleElement).closest('svg')!;
                                          const elRef = element; // capture
                                          const segsSnapshot = [...segs];

                                          const onMove = (ev: globalThis.MouseEvent) => {
                                            const svgRect = svgEl.getBoundingClientRect();
                                            const localX = ev.clientX - svgRect.left;
                                            const localY = ev.clientY - svgRect.top;
                                            const newCx = localX / pxPerCm + elRef.x;
                                            const newCy = localY / pxPerCm + elRef.y;
                                            const updated = segsSnapshot.map((s, idx) =>
                                              idx === i ? { ...s, cx: newCx, cy: newCy } : s
                                            );
                                            updateCanvasElement(elRef.id, { customPath: pathFromSegments(updated) });
                                          };
                                          const onUp = () => {
                                            setDraggingCPIndex(null);
                                            window.removeEventListener('mousemove', onMove);
                                            window.removeEventListener('mouseup', onUp);
                                          };
                                          window.addEventListener('mousemove', onMove);
                                          window.addEventListener('mouseup', onUp);
                                        }}
                                      />
                                    </>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                          {selectedSegmentIndex !== null && selectedSegmentIndex !== undefined && (() => {
                            const segs2 = buildShapeSegments(element);
                            if (!segs2 || selectedSegmentIndex >= segs2.length) return null;
                            const seg = segs2[selectedSegmentIndex];
                            const mx = ((seg.x1 + seg.x2) / 2 - element.x) * pxPerCm;
                            const my = ((seg.y1 + seg.y2) / 2 - element.y) * pxPerCm;
                            const isRounded = seg.type === 'Q';
                            return (
                              <div
                                key="seg-menu"
                                data-canvas-element="true"
                                className="absolute flex flex-col items-center gap-0.5 z-[60]"
                                style={{ left: mx, top: my - 48, transform: 'translateX(-50%)', pointerEvents: 'all' }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex gap-1 items-center">
                                  {isRounded ? (
                                    /* Slider d'intensité d'arrondi — visible uniquement quand le segment est arrondi */
                                    <div className="flex items-center gap-1" style={{ pointerEvents: 'all' }}>
                                      {/* Bouton - */}
                                      <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newIntensity = Math.max(5, roundIntensity - 5);
                                          setRoundIntensity(newIntensity);
                                          const mx2 = (seg.x1 + seg.x2) / 2;
                                          const my2 = (seg.y1 + seg.y2) / 2;
                                          const dx = seg.x2 - seg.x1; const dy = seg.y2 - seg.y1;
                                          const len = Math.sqrt(dx * dx + dy * dy);
                                          const cx2 = element.x + element.width / 2;
                                          const cy2 = element.y + element.height / 2;
                                          const perpX = len > 0 ? -dy / len : 0;
                                          const perpY = len > 0 ? dx / len : 0;
                                          const dot = perpX * (cx2 - mx2) + perpY * (cy2 - my2);
                                          const sign = dot >= 0 ? 1 : -1;
                                          const offset = Math.min(len * (newIntensity / 100), 2.5);
                                          const newSeg = { ...seg, type: 'Q' as const, cx: mx2 + sign * perpX * offset, cy: my2 + sign * perpY * offset };
                                          const newSegs = segs2.map((s, i2) => i2 === selectedSegmentIndex ? newSeg : s);
                                          updateCanvasElement(element.id, { customPath: pathFromSegments(newSegs) });
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:bg-white/60 transition-colors"
                                        style={{ textShadow: '0 0 4px white' }}
                                      >−</button>
                                      {/* Valeur % */}
                                      <span className="text-[10px] font-semibold text-indigo-700 min-w-[28px] text-center" style={{ textShadow: '0 0 4px white, 0 0 4px white' }}>{roundIntensity}%</span>
                                      {/* Bouton + */}
                                      <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newIntensity = Math.min(80, roundIntensity + 5);
                                          setRoundIntensity(newIntensity);
                                          const mx2 = (seg.x1 + seg.x2) / 2;
                                          const my2 = (seg.y1 + seg.y2) / 2;
                                          const dx = seg.x2 - seg.x1; const dy = seg.y2 - seg.y1;
                                          const len = Math.sqrt(dx * dx + dy * dy);
                                          const cx2 = element.x + element.width / 2;
                                          const cy2 = element.y + element.height / 2;
                                          const perpX = len > 0 ? -dy / len : 0;
                                          const perpY = len > 0 ? dx / len : 0;
                                          const dot = perpX * (cx2 - mx2) + perpY * (cy2 - my2);
                                          const sign = dot >= 0 ? 1 : -1;
                                          const offset = Math.min(len * (newIntensity / 100), 2.5);
                                          const newSeg = { ...seg, type: 'Q' as const, cx: mx2 + sign * perpX * offset, cy: my2 + sign * perpY * offset };
                                          const newSegs = segs2.map((s, i2) => i2 === selectedSegmentIndex ? newSeg : s);
                                          updateCanvasElement(element.id, { customPath: pathFromSegments(newSegs) });
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:bg-white/60 transition-colors"
                                        style={{ textShadow: '0 0 4px white' }}
                                      >+</button>
                                      {/* Bouton Redresser */}
                                      <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newSegs = segs2.map((s, i2) =>
                                            i2 === selectedSegmentIndex ? { ...s, type: 'L' as const, cx: undefined, cy: undefined } : s
                                          );
                                          updateCanvasElement(element.id, { customPath: pathFromSegments(newSegs) });
                                          setSegmentsRounded(newSegs.some(s => s.type === 'Q'));
                                          setRoundIntensity(35);
                                        }}
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
                                        style={{ textShadow: '0 0 4px white, 0 0 4px white' }}
                                      >↔ Redresser</button>
                                    </div>
                                  ) : (
                                    /* Bouton Arrondir — visible uniquement quand le segment est droit */
                                    <button
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const mx2 = (seg.x1 + seg.x2) / 2;
                                        const my2 = (seg.y1 + seg.y2) / 2;
                                        const dx = seg.x2 - seg.x1; const dy = seg.y2 - seg.y1;
                                        const len = Math.sqrt(dx * dx + dy * dy);
                                        const cx2 = element.x + element.width / 2;
                                        const cy2 = element.y + element.height / 2;
                                        const perpX = len > 0 ? -dy / len : 0;
                                        const perpY = len > 0 ? dx / len : 0;
                                        const dot = perpX * (cx2 - mx2) + perpY * (cy2 - my2);
                                        const sign = dot >= 0 ? 1 : -1;
                                        const offset = Math.min(len * (roundIntensity / 100), 2.5);
                                        const newSeg = { ...seg, type: 'Q' as const, cx: mx2 + sign * perpX * offset, cy: my2 + sign * perpY * offset };
                                        const newSegs = segs2.map((s, i2) => i2 === selectedSegmentIndex ? newSeg : s);
                                        updateCanvasElement(element.id, { customPath: pathFromSegments(newSegs) });
                                        setSegmentsRounded(true);
                                      }}
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 transition-colors whitespace-nowrap"
                                      style={{ textShadow: '0 0 4px white, 0 0 4px white' }}
                                    >⌒ Arrondir</button>
                                  )}
                                  <span className="text-gray-400 text-[10px] mx-0.5" style={{ textShadow: 'none' }}>·</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!segs2 || segs2.length <= 2) return;
                                      const newSegs = segs2.filter((_, i2) => i2 !== selectedSegmentIndex);
                                      const reconnected = newSegs.map((s, i2) => {
                                        if (i2 === 0) return s;
                                        const prev = newSegs[i2 - 1];
                                        return { ...s, x1: prev.x2, y1: prev.y2 };
                                      });
                                      updateCanvasElement(element.id, { customPath: pathFromSegments(reconnected) });
                                      setSelectedSegmentIndex(null);
                                      setSegmentsRounded(reconnected.some(s => s.type === 'Q'));
                                    }}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors whitespace-nowrap"
                                    style={{ textShadow: '0 0 4px white, 0 0 4px white' }}
                                  >
                                    ✕ Supprimer
                                  </button>
                                </div>
                                {/* Bouton OK — désélectionner le segment */}
                                <button
                                  className="flex items-center justify-center gap-1 px-1.5 py-0 text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                                  style={{ textShadow: '0 0 4px white, 0 0 4px white' }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); setSelectedSegmentIndex(null); }}
                                >
                                  ✓ OK
                                </button>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                    {/* Élément verrouillé : pas d'indicateur visuel, utiliser le clic droit pour déverrouiller */}
                  </div>
                  )}
                  </>
                  );
                })}
                
                {/* Menu flottant HTML Arrondir/Supprimer pour les lignes sélectionnées */}
                {canvasElements.filter(el => el.type === 'shape' && el.shape === 'line' && el.id === selectedElementId).map(el => {
                  const { pxPerCm, pageOffsetX, pageOffsetY } = canvasDimensions;
                  // Milieu du segment en coordonnées relatives à la page blanche
                  const mx = (el.x + el.width) / 2 * pxPerCm;
                  const my = (el.y + el.height) / 2 * pxPerCm;
                  const isRounded = !!el.customPath;
                  return (
                    <div
                      key={`line-menu-${el.id}`}
                      data-canvas-element="true"
                      className="absolute z-50 flex flex-col items-center gap-0.5"
                      style={{
                        left: mx - 70,
                        top: my - 48,
                        pointerEvents: 'all',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Ligne du haut : Arrondir + Supprimer */}
                      <div className="flex gap-1 items-center">
                        {/* Bouton Arrondir / Redresser */}
                        <button
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
                          style={{ textShadow: '0 0 4px white, 0 0 4px white' }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isRounded) {
                              updateCanvasElement(el.id, { customPath: undefined });
                            } else {
                              const x1cm = el.x;
                              const y1cm = el.y;
                              const x2cm = el.width;
                              const y2cm = el.height;
                              const mxCm = (x1cm + x2cm) / 2;
                              const myCm = (y1cm + y2cm) / 2;
                              const dx = x2cm - x1cm;
                              const dy = y2cm - y1cm;
                              const len = Math.sqrt(dx * dx + dy * dy);
                              const perpX = len > 0 ? -dy / len : 0;
                              const perpY = len > 0 ?  dx / len : 0;
                              const offset = len * 0.3;
                              const ctrlX = mxCm + perpX * offset;
                              const ctrlY = myCm + perpY * offset;
                              updateCanvasElement(el.id, { customPath: `M ${x1cm} ${y1cm} Q ${ctrlX} ${ctrlY} ${x2cm} ${y2cm}` });
                            }
                          }}
                        >
                          {isRounded ? '↔ Redresser' : '⌒ Arrondir'}
                        </button>
                        <span className="text-gray-400 text-[10px] mx-0.5">·</span>
                        {/* Bouton Supprimer — rouge visible dès le départ */}
                        <button
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors"
                          style={{ textShadow: '0 0 4px white, 0 0 4px white' }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            const idToDelete = el.id;
                            setSelectedElementId(null);
                            setCanvasElements(prev => prev.filter(cel => cel.id !== idToDelete));
                          }}
                        >
                          ✕ Supprimer
                        </button>
                      </div>
                      {/* Bouton OK centré — clore l'opération (désélectionner) */}
                      <button
                        className="flex items-center justify-center gap-1 px-1.5 py-0 text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                        style={{ textShadow: '0 0 4px white, 0 0 4px white' }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(null);
                        }}
                      >
                        ✓ OK
                      </button>
                    </div>
                  );
                })}

                {/* Aperçu SVG de la ligne en cours de tracé (mode tracé libre) */}
                {isLineDrawMode && lineDrawStartRef.current && lineDrawEnd && (() => {
                  const { pxPerCm } = canvasDimensions;
                  // Ce SVG est DANS la page blanche (pageRef), donc son (0,0) = coin supérieur
                  // gauche de la page. Les coordonnées en cm sont déjà relatives à la page.
                  // NE PAS ajouter pageOffsetX/Y ici.
                  const startPt = lineDrawStartRef.current!;
                  const x1 = startPt.x * pxPerCm;
                  const y1 = startPt.y * pxPerCm;
                  const x2 = lineDrawEnd.x * pxPerCm;
                  const y2 = lineDrawEnd.y * pxPerCm;
                  // Premier point de la chaîne (pour le snap de fermeture)
                  const firstPx = lineChainFirstPoint ? lineChainFirstPoint.x * pxPerCm : null;
                  const firstPy = lineChainFirstPoint ? lineChainFirstPoint.y * pxPerCm : null;
                  // Détecter si le curseur est près du premier point (snap actif)
                  const SNAP_PX = 0.5 * pxPerCm;
                  const isSnapActive = lineChainFirstPoint !== null && (
                    Math.sqrt(
                      Math.pow(lineDrawEnd.x - lineChainFirstPoint.x, 2) +
                      Math.pow(lineDrawEnd.y - lineChainFirstPoint.y, 2)
                    ) < 0.5
                  );
                  return (
                    <svg
                      key="line-draw-preview"
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 70 }}
                    >
                      {/* Segment en cours de tracé */}
                      <line
                        x1={x1} y1={y1}
                        x2={isSnapActive && firstPx !== null ? firstPx : x2}
                        y2={isSnapActive && firstPy !== null ? firstPy : y2}
                        stroke={isSnapActive ? '#22c55e' : '#f97316'}
                        strokeWidth="2"
                        strokeDasharray="6 3"
                        strokeLinecap="round"
                      />
                      {/* Point de départ du segment courant */}
                      <circle cx={x1} cy={y1} r="4" fill="#f97316" opacity="0.8" />
                      {/* Point d'arrivée courant */}
                      <circle
                        cx={isSnapActive && firstPx !== null ? firstPx : x2}
                        cy={isSnapActive && firstPy !== null ? firstPy : y2}
                        r="4" fill={isSnapActive ? '#22c55e' : '#f97316'} opacity="0.8"
                      />
                      {/* Cercle vert du premier point de la chaîne (cible de fermeture) */}
                      {firstPx !== null && firstPy !== null && (
                        <circle
                          cx={firstPx} cy={firstPy}
                          r={isSnapActive ? 10 : 7}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth={isSnapActive ? 3 : 2}
                          opacity="0.9"
                        />
                      )}
                    </svg>
                  );
                })()}

                {/* Croix de repérage d'imprimerie (crop marks) -- positionnées dans la zone grise, hors de la page blanche */}
                {/* stickerCropMarks est un state séparé du parent, zéro couplage avec stickerOverlay. */}
                {stickerCropMarks && (() => {
                  const { pageOffsetX: ox, pageOffsetY: oy, pageWidth: pw, pageHeight: ph, pxPerCm } = canvasDimensions;
                  // Longueur des traits (en px)
                  const markLen = Math.max(12, pxPerCm * 0.8);
                  // Espace entre le coin de la page et le début du trait
                  const markGap = Math.max(5, pxPerCm * 0.25);
                  // Rayon du cercle de repérage
                  const circleR = Math.max(4, pxPerCm * 0.15);
                  // Les 4 coins en coordonnées relatives à la PAGE BLANCHE (parent = page)
                  // ox/oy ne sont PAS ajoutés car le div parent est déjà positionné à (ox, oy)
                  const corners = [
                    { key: 'tl', cx: 0,   cy: 0,   sx: -1, sy: -1 },
                    { key: 'tr', cx: pw,  cy: 0,   sx:  1, sy: -1 },
                    { key: 'bl', cx: 0,   cy: ph,  sx: -1, sy:  1 },
                    { key: 'br', cx: pw,  cy: ph,  sx:  1, sy:  1 },
                  ];
                  return (
                    <svg
                      key="crop-marks"
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 60 }}
                    >
                      {corners.map(({ key, cx, cy, sx, sy }) => (
                        <g key={key}>
                          {/* Trait horizontal */}
                          <line
                            x1={cx + sx * markGap}
                            y1={cy}
                            x2={cx + sx * (markGap + markLen)}
                            y2={cy}
                            stroke="#1e293b"
                            strokeWidth={1}
                          />
                          {/* Trait vertical */}
                          <line
                            x1={cx}
                            y1={cy + sy * markGap}
                            x2={cx}
                            y2={cy + sy * (markGap + markLen)}
                            stroke="#1e293b"
                            strokeWidth={1}
                          />
                          {/* Cercle de repérage */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={circleR}
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth={0.8}
                          />
                        </g>
                      ))}
                    </svg>
                  );
                })()}

                {/* Overlay contour offset sticker planner.
                    Les paths SVG sont calculés par alpha tracing dans le useEffect dédié.
                    Chaque path suit la silhouette réelle de l'image (bbox des pixels opaques
                    + offset arrondi), en coordonnées px relatives à la page blanche. */}
                {stickerOverlay && (() => {
                  const { pxPerCm } = canvasDimensions;
                  const stickerEls = canvasElements.filter(el => el.type === 'image' && el.src);
                  if (stickerEls.length === 0) return null;
                  // Filtrer les éléments pour lesquels on a un path calculé
                  const renderable = stickerEls.filter(el => stickerContourPaths[el.id]);
                  if (renderable.length === 0) {
                    // Fallback : rectangle simple pendant le calcul asynchrone
                    const offsetPx = (stickerOverlay.offsetMm / 10) * pxPerCm;
                    return (
                      <svg key="sticker-offset-overlay" className="absolute inset-0 pointer-events-none"
                        style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 55 }}>
                        {stickerEls.map(el => {
                          const elX = el.x * pxPerCm;
                          const elY = el.y * pxPerCm;
                          const elW = el.width * pxPerCm;
                          const elH = el.height * pxPerCm;
                          const cx = elX + elW / 2;
                          const cy = elY + elH / 2;
                          const rx = Math.min(offsetPx, (elW + 2 * offsetPx) * 0.4);
                          return (
                            <rect key={el.id} x={elX - offsetPx} y={elY - offsetPx}
                              width={elW + 2 * offsetPx} height={elH + 2 * offsetPx}
                              rx={rx} ry={rx} fill="none" stroke="#a855f7" strokeWidth={1.5}
                              strokeDasharray="4 3"
                              transform={`rotate(${el.rotation || 0},${cx},${cy})`} />
                          );
                        })}
                      </svg>
                    );
                  }
                  /**
                   * Convertit un path SVG en coordonnées normalisées (0..1)
                   * vers des coordonnées px absolues sur le canvas, en appliquant
                   * la rotation de l'élément.
                   *
                   * Les commandes H et V sont converties en L (lineto absolu 2D)
                   * pour supporter correctement la rotation — H et V sont des
                   * commandes mono-axe qui n'ont pas de sens après une rotation.
                   *
                   * Supporte : M, L, C, Q, H (→ L), V (→ L), Z.
                   */
                  const scalePathToPx = (d: string, ox: number, oy: number, w: number, h: number, rot: number): string => {
                    const cx = ox + w / 2;
                    const cy = oy + h / 2;
                    const rad = (rot * Math.PI) / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    // Transforme un point normalisé (nx, ny) en coordonnées px avec rotation
                    const tx = (nx: number, ny: number): [number, number] => {
                      const px = ox + nx * w;
                      const py = oy + ny * h;
                      const dx = px - cx;
                      const dy = py - cy;
                      return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
                    };
                    // Curseur courant pour résoudre H et V (coordonnées normalisées)
                    let curNx = 0, curNy = 0;
                    return d.replace(/([MCQLHVZmclhvz])([^MCQLHVZmclhvz]*)/g, (_, cmd: string, args: string) => {
                      const nums = args.trim().split(/[,\s]+/).filter(Boolean).map(Number);
                      if (cmd === 'Z' || cmd === 'z') return 'Z ';
                      if (cmd === 'M' || cmd === 'L') {
                        const pts: string[] = [];
                        for (let i = 0; i + 1 < nums.length; i += 2) {
                          curNx = nums[i]; curNy = nums[i + 1];
                          const [px, py] = tx(curNx, curNy);
                          pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
                        }
                        return `${cmd}${pts.join(' ')} `;
                      }
                      if (cmd === 'C') {
                        const pts: string[] = [];
                        for (let i = 0; i + 1 < nums.length; i += 2) {
                          // Mettre à jour le curseur sur le point de destination (tous les 6 valeurs)
                          if (i % 6 === 4) { curNx = nums[i]; curNy = nums[i + 1]; }
                          const [px, py] = tx(nums[i], nums[i + 1]);
                          pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
                        }
                        return `C${pts.join(' ')} `;
                      }
                      if (cmd === 'Q') {
                        const pts: string[] = [];
                        for (let i = 0; i + 1 < nums.length; i += 2) {
                          if (i % 4 === 2) { curNx = nums[i]; curNy = nums[i + 1]; }
                          const [px, py] = tx(nums[i], nums[i + 1]);
                          pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
                        }
                        return `Q${pts.join(' ')} `;
                      }
                      // H → L : lineto horizontal absolu, converti en L 2D pour supporter la rotation
                      if (cmd === 'H') {
                        curNx = nums[0];
                        const [px, py] = tx(curNx, curNy);
                        return `L${px.toFixed(2)},${py.toFixed(2)} `;
                      }
                      // V → L : lineto vertical absolu, converti en L 2D pour supporter la rotation
                      if (cmd === 'V') {
                        curNy = nums[0];
                        const [px, py] = tx(curNx, curNy);
                        return `L${px.toFixed(2)},${py.toFixed(2)} `;
                      }
                      return `${cmd}${args}`;
                    });
                  };
                  return (
                    <svg key="sticker-offset-overlay" className="absolute inset-0 pointer-events-none"
                      style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 55 }}>
                      {renderable.map(el => {
                        const elX = el.x * pxPerCm;
                        const elY = el.y * pxPerCm;
                        const elW = el.width * pxPerCm;
                        const elH = el.height * pxPerCm;
                        const pathD = scalePathToPx(
                          stickerContourPaths[el.id]!,
                          elX, elY, elW, elH,
                          el.rotation || 0
                        );
                        return (
                          <path key={el.id}
                            d={pathD}
                            fill="none" stroke="#a855f7"
                            strokeWidth={1.5}
                            strokeDasharray="4 3" />
                        );
                      })}
                    </svg>
                  );
                })()}

                {/* Rectangle de lasso de sélection */}
                {/* Le lasso est dans pageRef, les coordonnées sont relatives à canvasRef
                     => on soustrait pageOffsetX/Y pour aligner avec le curseur */}
                {isLassoing && lassoStart && lassoEnd && (() => {
                  const offX = canvasDimensions.pageOffsetX;
                  const offY = canvasDimensions.pageOffsetY;
                  return (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-50"
                      style={{
                        left: Math.min(lassoStart.x, lassoEnd.x) - offX,
                        top: Math.min(lassoStart.y, lassoEnd.y) - offY,
                        width: Math.abs(lassoEnd.x - lassoStart.x),
                        height: Math.abs(lassoEnd.y - lassoStart.y),
                        borderStyle: 'dashed',
                      }}
                    />
                  );
                })()}
                
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
                
                {/* SVG pour le détourage manuel point par point - positionné sur la PAGE */}
                {isDetourageActive && manualTool === "polygon" && selectedElementId && (
                  <svg
                    className="absolute pointer-events-none"
                    style={{ 
                      left: canvasDimensions.pageOffsetX,
                      top: canvasDimensions.pageOffsetY,
                      width: canvasDimensions.pageWidth, 
                      height: canvasDimensions.pageHeight, 
                      zIndex: 2000 
                    }}
                  >
                    {/* Lignes entre les points */}
                    {detouragePoints.length > 1 && (
                      <polyline
                        points={detouragePoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                      />
                    )}
                    
                    {/* Ligne de fermeture si fermé */}
                    {detouragePoints.length > 2 && (
                      <line
                        x1={detouragePoints[detouragePoints.length - 1].x}
                        y1={detouragePoints[detouragePoints.length - 1].y}
                        x2={detouragePoints[0].x}
                        y2={detouragePoints[0].y}
                        stroke="#8b5cf6"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.5"
                      />
                    )}
                    
                    {/* Fil d'Ariane (ligne vers le curseur) */}
                    {detouragePoints.length > 0 && cursorPosition && (
                      <line
                        x1={detouragePoints[detouragePoints.length - 1].x}
                        y1={detouragePoints[detouragePoints.length - 1].y}
                        x2={cursorPosition.x}
                        y2={cursorPosition.y}
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        strokeDasharray="6,3"
                      />
                    )}
                    
                    {/* Points */}
                    {detouragePoints.map((point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r={index === 0 ? 5 : 3}
                        fill={index === 0 ? "#22c55e" : "#8b5cf6"}
                        stroke="white"
                        strokeWidth="1"
                      />
                    ))}
                    
                    {/* Cercle de prévisualisation au curseur */}
                    {cursorPosition && (
                      <circle
                        cx={cursorPosition.x}
                        cy={cursorPosition.y}
                        r="4"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    )}
                  </svg>
                )}

                </div>

                {/* Filets : traits fins concentriques autour de chaque ouverture.
                    Chaque filet est un recté décalé vers l'intérieur de l'ouverture
                    de offsetMm mm, avec une épaisseur thicknessMm mm.
                    Les coordonnées sont en px (pxPerCm de canvasDimensions). */}
                {filets.length > 0 && (() => {
                  const { pxPerCm, pageOffsetX, pageOffsetY, pageWidth, pageHeight } = canvasDimensions;
                  const openingEls = canvasElements.filter(el => el.type === 'shape');
                  if (openingEls.length === 0) return null;
                  return (
                    <svg
                      key="filets-overlay"
                      className="absolute pointer-events-none"
                      style={{ left: pageOffsetX, top: pageOffsetY, width: pageWidth, height: pageHeight, overflow: 'visible', zIndex: 58 }}
                    >
                      {openingEls.map(el => {
                        const elX = el.x * pxPerCm;
                        const elY = el.y * pxPerCm;
                        const elW = el.width * pxPerCm;
                        const elH = el.height * pxPerCm;
                        const cx = elX + elW / 2;
                        const cy = elY + elH / 2;
                        return filets.map(filet => {
                          // Convertir offset et épaisseur de mm en px
                          const offsetPx = (filet.offsetMm / 10) * pxPerCm;
                          const strokePx = Math.max(0.5, (filet.thicknessMm / 10) * pxPerCm);
                          const shape = el.shape || 'rect';
                          // Décalage vers l'EXTÉRIEUR de la découpe (la forme est un trou)
                          const rx = elX - offsetPx;
                          const ry = elY - offsetPx;
                          const rw = elW + 2 * offsetPx;
                          const rh = elH + 2 * offsetPx;
                          let pathEl: React.ReactNode;
                          if (shape === 'round') {
                            const r = Math.min(rw, rh) / 2;
                            pathEl = (
                              <circle key={filet.id}
                                cx={cx} cy={cy} r={r}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          } else if (shape === 'oval') {
                            pathEl = (
                              <ellipse key={filet.id}
                                cx={cx} cy={cy} rx={rw / 2} ry={rh / 2}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          } else if (shape === 'heart') {
                            // Filet cœur normalisé (lobes en haut, pointe en bas)
                            const hFiletDepth = (el.heartDepth ?? 50) / 100;
                            const hFiletNotchY = ry + rh * (0.25 + hFiletDepth * 0.25);
                            const heartD = [
                              `M ${rx + rw * 0.5} ${hFiletNotchY}`,
                              `C ${rx + rw * 0.5} ${ry + rh * 0.10} ${rx + rw * 0.0} ${ry + rh * 0.10} ${rx + rw * 0.0} ${ry + rh * 0.35}`,
                              `C ${rx + rw * 0.0} ${ry + rh * 0.60} ${rx + rw * 0.5} ${ry + rh * 0.75} ${rx + rw * 0.5} ${ry + rh * 1.0}`,
                              `C ${rx + rw * 0.5} ${ry + rh * 0.75} ${rx + rw * 1.0} ${ry + rh * 0.60} ${rx + rw * 1.0} ${ry + rh * 0.35}`,
                              `C ${rx + rw * 1.0} ${ry + rh * 0.10} ${rx + rw * 0.5} ${ry + rh * 0.10} ${rx + rw * 0.5} ${hFiletNotchY} Z`,
                            ].join(' ');
                            pathEl = (
                              <path key={filet.id}
                                d={heartD}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          } else if (shape === 'star') {
                            // Filet étoile : même path que l'ouverture mais réduit de offsetPx
                            const outerR = Math.min(rw, rh) / 2;
                            const innerR = outerR * 0.42;
                            const starPts: string[] = [];
                            for (let i = 0; i < 10; i++) {
                              const angle = (i * Math.PI) / 5 - Math.PI / 2;
                              const r = i % 2 === 0 ? outerR : innerR;
                              starPts.push(`${i === 0 ? 'M' : 'L'} ${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`);
                            }
                            pathEl = (
                              <path key={filet.id}
                                d={starPts.join(' ') + ' Z'}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          } else if (shape === 'diamond') {
                            // Filet losange
                            const diamondD = `M ${rx + rw/2} ${ry} L ${rx + rw} ${ry + rh/2} L ${rx + rw/2} ${ry + rh} L ${rx} ${ry + rh/2} Z`;
                            pathEl = (
                              <path key={filet.id}
                                d={diamondD}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          } else if (shape === 'hexagon') {
                            // Filet hexagone
                            const hexFiletPts: string[] = [];
                            for (let i = 0; i < 6; i++) {
                              const a = (i * Math.PI) / 3 - Math.PI / 6;
                              hexFiletPts.push(`${i === 0 ? 'M' : 'L'} ${rx + rw/2 + rw/2 * Math.cos(a)} ${ry + rh/2 + rh/2 * Math.sin(a)}`);
                            }
                            pathEl = (
                              <path key={filet.id}
                                d={hexFiletPts.join(' ') + ' Z'}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          } else if (shape === 'arch') {
                            // Filet arche : rectangle avec le haut arrondi
                            const archD = `M${rx},${ry + rh} L${rx},${ry + rh / 2} Q${rx},${ry} ${rx + rw / 2},${ry} Q${rx + rw},${ry} ${rx + rw},${ry + rh / 2} L${rx + rw},${ry + rh} Z`;
                            pathEl = (
                              <path key={filet.id}
                                d={archD}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          } else if (shape === 'square') {
                            // Filet carré centré
                            const side = Math.min(rw, rh);
                            const sqX = rx + (rw - side) / 2;
                            const sqY = ry + (rh - side) / 2;
                            pathEl = (
                              <rect key={filet.id}
                                x={sqX} y={sqY} width={side} height={side}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          } else {
                            // rect : rectangle simple
                            pathEl = (
                              <rect key={filet.id}
                                x={rx} y={ry} width={rw} height={rh}
                                fill="none"
                                stroke={filet.color}
                                strokeWidth={strokePx}
                                transform={`rotate(${el.rotation || 0},${cx},${cy})`}
                              />
                            );
                          }
                          return pathEl;
                        });
                      })}
                    </svg>
                  );
                })()}

                {/* Rectangle cadre extérieur du format — visible uniquement si showFormatBorder est activé.
                    Positionné en absolute avec les coordonnées exactes de la page blanche dans la zone de
                    travail. Utilise pageOffsetX/Y et pageWidth/pageHeight de canvasDimensions pour
                    correspondre précisément aux limites du format (ex. 18×24 cm). */}
                {showFormatBorder && (() => {
                  const { pageOffsetX, pageOffsetY, pageWidth, pageHeight } = canvasDimensions;
                  // Décalage de 2px vers l'extérieur pour que le trait soit visible sans masquer le contenu
                  const BORDER_OFFSET = 2;
                  return (
                    <svg
                      key="format-border"
                      className="absolute pointer-events-none"
                      style={{
                        left: pageOffsetX - BORDER_OFFSET,
                        top: pageOffsetY - BORDER_OFFSET,
                        width: pageWidth + 2 * BORDER_OFFSET,
                        height: pageHeight + 2 * BORDER_OFFSET,
                        overflow: 'visible',
                        zIndex: 65,
                      }}
                    >
                      {/* Trait solid indigo représentant la limite exacte du format */}
                      <rect
                        x={BORDER_OFFSET}
                        y={BORDER_OFFSET}
                        width={pageWidth}
                        height={pageHeight}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth={1.5}
                      />
                    </svg>
                  );
                })()}

                {/* Fin de la PAGE BLANCHE */}
              </div>
              
              {/* Indicateurs de dimensions supprimés - affichés dans la barre d'outils */}
            </div>
          </div>
          
          {/* ZONE DROITE UNIFIÉE : Pièces détourées + Photos/Images */}
          <div className="w-56 bg-gray-50 border-l flex flex-col relative z-[1100]">
            {/* Section 1 : Pièces détourées (moitié haute) */}
            <div
              className="flex-1 flex flex-col border-b min-h-0"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-purple-100');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-purple-100');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-purple-100');
                const data = e.dataTransfer.getData("text/plain");
                if (data) {
                  try {
                    const item = JSON.parse(data);
                    if (item.src) {
                      // Ajouter aux pièces détourées
                      const newItem: CollectorItem = {
                        id: `collector_${Date.now()}`,
                        type: 'photo',
                        src: item.src,
                        name: item.name || (language === 'fr' ? 'Pièce' : 'Piece'),
                        thumbnail: item.src
                      };
                      setCollectorItems(prev => [...prev, newItem]);
                      toast.success(language === "fr" ? "Pièce ajoutée au collecteur" : "Piece added to collector");
                    }
                  } catch (err) {
                    console.error('Erreur lors du drop:', err);
                  }
                }
              }}
            >
              <div className="px-2 py-1.5 border-b bg-purple-50 flex-shrink-0">
                <h3 className="font-medium text-xs text-center text-purple-700">
                  {language === "fr" ? "Pièces détourées" : "Cutout pieces"}
                </h3>
                <p className="text-[9px] text-purple-500 text-center">
                  {language === "fr" ? "Éléments de montage" : "Assembly elements"}
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-1.5 flex flex-wrap gap-1 justify-center">
                  {collectorItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative bg-white rounded border shadow-sm transition-all duration-200 group w-16 h-auto"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredThumbnail({ src: item.thumbnail || item.src, name: item.name, rect, type: 'collector' });
                      }}
                      onMouseLeave={() => setHoveredThumbnail(null)}
                    >
                      <img
                        src={item.thumbnail || item.src}
                        alt={item.name}
                        className="w-full h-auto object-contain rounded bg-[url('/images/transparent-bg.png')] bg-repeat"
                      />
                      {/* Bouton Utiliser — ajouter au canvas d'assemblage */}
                      <button
                        className="absolute -bottom-1 -right-1 bg-green-500 hover:bg-green-600 text-white rounded-full p-0.5 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCanvas(item.src, item.name);
                          setActiveMainTab("assemblage");
                        }}
                        title={language === "fr" ? "Utiliser sur le canvas" : "Use on canvas"}
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      {/* Bouton supprimer */}
                      <button
                        className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollectorItems(prev => prev.filter(i => i.id !== item.id));
                        }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  
                  {collectorItems.length === 0 && (
                    <div className="col-span-3 text-center text-gray-400 text-[10px] py-4">
                      {language === "fr" 
                        ? "Glissez vos détourages ici" 
                        : "Drag your cutouts here"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            {/* Section 2 : Photos/Images (moitié basse) */}
            <div
              className="flex-1 flex flex-col min-h-0"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-amber-100');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-amber-100');
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-amber-100');

                // Cas 1 : fichiers depuis le bureau (drag & drop système)
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                  if (files.length === 0) {
                    toast.error(language === 'fr' ? 'Seules les images sont acceptées' : 'Only image files are accepted');
                    return;
                  }
                  const itemsToAdd: Omit<import('@/db').CreationsBasketItem, 'id' | 'dateAdded'>[] = [];
                  for (const file of files) {
                    await new Promise<void>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        if (dataUrl) {
                          itemsToAdd.push({
                            photoUrl: dataUrl,
                            thumbnail: dataUrl,
                            photoTitle: file.name.replace(/\.[^.]+$/, ''),
                            albumId: 'desktop-drop',
                            albumName: language === 'fr' ? 'Bureau' : 'Desktop',
                          });
                        }
                        resolve();
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                  if (itemsToAdd.length > 0) {
                    const { added } = await addToCreationsBasket(itemsToAdd);
                    const n = added.length;
                    if (n > 0) {
                      toast.success(
                        language === 'fr'
                          ? `${n} photo${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} au panier`
                          : `${n} photo${n > 1 ? 's' : ''} added to basket`
                      );
                    } else {
                      toast.info(language === 'fr' ? 'Photo(s) déjà présente(s) dans le panier' : 'Photo(s) already in basket');
                    }
                  }
                  return;
                }
                // Cas 2 : drag interne (depuis la colonne source ou le collecteur)
                const data = e.dataTransfer.getData('text/plain');
                if (data) {
                  try {
                    const item = JSON.parse(data);
                    if (item.src) {
                      const { added } = await addToCreationsBasket([{
                        photoUrl: item.src,
                        thumbnail: item.thumbnail || item.src,
                        photoTitle: item.name || 'Photo',
                        albumId: item.albumId || 'internal',
                        albumName: item.albumName || (language === 'fr' ? 'Source' : 'Source'),
                      }]);
                      if (added.length > 0) {
                        toast.success(language === 'fr' ? 'Photo ajoutée au panier' : 'Photo added to basket');
                      } else {
                        toast.info(language === 'fr' ? 'Photo déjà dans le panier' : 'Photo already in basket');
                      }
                    }
                  } catch (err) {
                    console.error('Erreur lors du drop:', err);
                  }
                }
              }}
            >
              <div className="px-2 py-1.5 border-b bg-amber-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                    <ShoppingBasket className="w-3 h-3" />
                    {language === "fr" ? "Panier" : "Basket"}
                    {basketItems.length > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                        {basketItems.length}
                      </span>
                    )}
                  </span>
                  {basketItems.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 px-1 text-[9px] text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        if (window.confirm(language === "fr" ? "Vider le panier ?" : "Empty basket?")) {
                          await clearCreationsBasket();
                          toast.success(language === "fr" ? "Panier vidé" : "Basket emptied");
                        }
                      }}
                    >
                      <Trash2 className="w-2.5 h-2.5 mr-0.5" />
                      {language === "fr" ? "Vider" : "Clear"}
                    </Button>
                  )}
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-1.5">
                  {/* Affichage des photos du panier - vignettes plus petites avec hover */}
                  {basketItems.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1">
                      {basketItems.map((item) => (
                        <div
                          key={item.id}
                          className="relative bg-white rounded border border-amber-300 shadow-sm cursor-pointer transition-all duration-200 group"
                          style={{ width: '100%', height: '50px' }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", JSON.stringify({ src: item.photoUrl, name: item.photoTitle || item.albumName, fromBasket: true, basketId: item.id }));
                          }}
                          onDoubleClick={async () => {
                            addToCanvas(item.photoUrl, item.photoTitle || item.albumName);
                            // Retirer du panier après ajout au canvas
                            if (item.id !== undefined) await removeFromCreationsBasket(item.id);
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredThumbnail({ src: item.thumbnail || item.photoUrl, name: item.photoTitle || item.albumName || 'Photo', rect, type: 'basket' });
                          }}
                          onMouseLeave={() => setHoveredThumbnail(null)}
                          title={`${item.photoTitle || 'Photo'}\n${item.albumName}\n${language === "fr" ? "Double-clic ou glisser vers le canvas" : "Double-click or drag to canvas"}`}
                        >
                          <img
                            src={item.thumbnail || item.photoUrl}
                            alt={item.photoTitle || 'Photo'}
                            className="w-full h-full object-contain rounded"
                          />
                          {/* Bouton supprimer */}
                          <button
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (item.id !== undefined) await removeFromCreationsBasket(item.id);
                            }}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 text-[10px] py-4">
                      {language === "fr" 
                        ? "Panier vide" 
                        : "Empty basket"}
                    </div>
                  )}
                  
                  {/* Message d'instruction */}
                  <div className="text-center text-gray-500 text-[9px] mt-2 px-1 py-1.5 bg-blue-50 rounded border border-blue-100">
                    {language === "fr" 
                      ? "Glissez la/les photo(s) dans la surface de travail pour les intégrer au projet" 
                      : "Drag photo(s) to the workspace to add them to the project"}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              {canvasElements.length} {language === "fr" ? "éléments sur le canvas" : "elements on canvas"}
              {" \u2022 "}
              {collectorItems.length} {language === "fr" ? "dans le collecteur" : "in collector"}
            </div>
            {/* Indicateur de multi-sélection */}
            {selectedElementIds.size > 1 && (
              <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 animate-in fade-in">
                <span className="font-medium">{selectedElementIds.size}</span>
                {language === 'fr' ? 'sélectionné(s)' : 'selected'}
                <span className="text-blue-400 ml-1">Shift+clic</span>
              </div>
            )}
            {/* Boutons Grouper / Dégrouper */}
            {selectedElementIds.size >= 2 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 text-xs h-7 bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"
                onClick={handleGroupElements}
              >
                <Layers className="w-3 h-3" />
                {language === 'fr' ? 'Grouper' : 'Group'}
                <span className="text-purple-400 text-[10px]">(Ctrl+G)</span>
              </Button>
            )}
            {selectionHasGroup && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 text-xs h-7 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                onClick={handleUngroupElements}
              >
                <Layers className="w-3 h-3" />
                {language === 'fr' ? 'Dégrouper' : 'Ungroup'}
                <span className="text-orange-400 text-[10px]">(Ctrl+Shift+G)</span>
              </Button>
            )}
            {/* Barre d'alignement multi-sélection */}
            {selectedElementIds.size >= 2 && (
              <div className="flex items-center gap-1 bg-white border border-indigo-200 rounded-lg px-2 py-1 shadow-sm">
                <span className="text-[10px] text-indigo-400 font-semibold mr-1 whitespace-nowrap">Aligner :</span>
                {/* Groupe horizontal */}
                <div className="flex items-center gap-0.5">
                  <button
                    title="Aligner à gauche"
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-200 whitespace-nowrap"
                    onClick={() => alignSelected('left')}
                  >◧ G</button>
                  <button
                    title="Centrer horizontalement"
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-200 whitespace-nowrap"
                    onClick={() => alignSelected('centerH')}
                  >↔ H</button>
                  <button
                    title="Aligner à droite"
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-200 whitespace-nowrap"
                    onClick={() => alignSelected('right')}
                  >D ◦</button>
                </div>
                <div className="w-px h-4 bg-gray-200" />
                {/* Groupe vertical */}
                <div className="flex items-center gap-0.5">
                  <button
                    title="Aligner en haut"
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-200 whitespace-nowrap"
                    onClick={() => alignSelected('top')}
                  >▤ H</button>
                  <button
                    title="Centrer verticalement"
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-200 whitespace-nowrap"
                    onClick={() => alignSelected('centerV')}
                  >↕ V</button>
                  <button
                    title="Aligner en bas"
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-200 whitespace-nowrap"
                    onClick={() => alignSelected('bottom')}
                  >B ▪</button>
                </div>
                {/* Distribuer - visible seulement avec 3+ éléments */}
                {selectedElementIds.size >= 3 && (
                  <div className="flex items-center gap-1 border-l border-indigo-100 pl-2">
                    <span className="text-[10px] text-indigo-400 font-semibold mr-1 whitespace-nowrap">Distribuer :</span>
                    <button
                      title="Distribuer horizontalement (espacement égal)"
                      className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-200 whitespace-nowrap"
                      onClick={() => distributeSelected('horizontal')}
                    >↔ H</button>
                    <button
                      title="Distribuer verticalement (espacement égal)"
                      className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-200 whitespace-nowrap"
                      onClick={() => distributeSelected('vertical')}
                    >↕ V</button>
                  </div>
                )}
              </div>
            )}
            {/* Indicateur de sauvegarde automatique */}
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-all duration-300 ${
              autoSaveStatus === 'saving' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
              autoSaveStatus === 'saved' ? 'bg-green-50 text-green-600 border border-green-200' :
              autoSaveStatus === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
              'bg-gray-50 text-gray-400 border border-gray-200'
            }`}>
              {autoSaveStatus === 'saving' && (
                <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />{language === 'fr' ? 'Sauvegarde...' : 'Saving...'}</>
              )}
              {autoSaveStatus === 'saved' && (
                <><span className="text-green-500">\u2713</span>{language === 'fr' ? 'Sauvegardé' : 'Saved'}</>
              )}
              {autoSaveStatus === 'error' && (
                <><span className="text-red-500">\u2717</span>{language === 'fr' ? 'Erreur' : 'Error'}</>
              )}
              {autoSaveStatus === 'idle' && currentProjectId && (
                <><span className="text-gray-400">\u25CB</span>{language === 'fr' ? 'Auto-save actif' : 'Auto-save on'}</>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Nom du projet */}
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
              <Edit2 className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={currentProjectName}
                onChange={(e) => setCurrentProjectName(e.target.value)}
                placeholder={language === "fr" ? "Nom de la création..." : "Creation name..."}
                className="border-0 p-0 h-auto text-sm w-48 focus-visible:ring-0"
              />
            </div>
            
            <Button variant="outline" size="sm" className="gap-1" onClick={handleDownload} disabled={isExporting || canvasElements.length === 0}>
              <Download className="w-4 h-4" />
              {isExporting ? (language === "fr" ? "Export..." : "Exporting...") : (language === "fr" ? "Télécharger" : "Download")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint} disabled={isExporting || canvasElements.length === 0}>
              <Printer className="w-4 h-4" />
              {language === "fr" ? "Imprimer" : "Print"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleEmail} disabled={isExporting || canvasElements.length === 0}>
              <Mail className="w-4 h-4" />
              @Mail
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 border-pink-400 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
              onClick={handleSaveAs} 
              disabled={isExporting || canvasElements.length === 0}
            >
              <ImagePlus className="w-4 h-4" />
              {isExporting ? (language === "fr" ? "Sauvegarde..." : "Saving...") : (language === "fr" ? "Sauver comme" : "Save As")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-blue-400 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              onClick={handleNewProjectFromBar}
            >
              <Plus className="w-4 h-4" />
              {language === "fr" ? "Nouveau projet" : "New project"}
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white gap-1 hover:from-purple-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
              onClick={() => {
                handleSaveProject();
                const btn = document.activeElement as HTMLButtonElement;
                if (btn) {
                  btn.classList.add('animate-pulse');
                  setTimeout(() => btn.classList.remove('animate-pulse'), 500);
                }
              }}
            >
              <Save className="w-4 h-4" />
              {language === "fr" ? "Sauvegarder le projet" : "Save Project"}
            </Button>
            <Button variant="outline" onClick={handleRequestClose}>
              {language === "fr" ? "Fermer" : "Close"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Modale de confirmation avant de quitter */}
      {/* Modale Sauver comme : saisie du nom avant sauvegarde */}
      {showSaveAsModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[3100]">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Save className="w-5 h-5 text-blue-500" />
                {language === 'fr' ? 'Sauver comme' : 'Save As'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {language === 'fr'
                  ? 'Le collage sera sauvegardé dans l\'album "Mes Collages"'
                  : 'The collage will be saved in the "My Collages" album'}
              </p>
            </div>
            <div className="px-6 py-5">
              <Label htmlFor="saveAsNameInput" className="text-sm font-medium text-gray-700 mb-2 block">
                {language === 'fr' ? 'Nom du collage' : 'Collage name'}
              </Label>
              <Input
                id="saveAsNameInput"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAsConfirm(); if (e.key === 'Escape') setShowSaveAsModal(false); }}
                placeholder={language === 'fr' ? 'Nom du collage...' : 'Collage name...'}
                className="w-full"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveAsModal(false)}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                onClick={handleSaveAsConfirm}
                disabled={!saveAsName.trim()}
              >
                <Save className="w-4 h-4 mr-1" />
                {language === 'fr' ? 'Sauvegarder' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale : Sauvegarder avant de créer un nouveau projet */}
      {showSaveBeforeNew && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[3050]">
          <div className="bg-white rounded-xl shadow-2xl w-[440px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                {language === 'fr' ? 'Nouveau projet' : 'New project'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {language === 'fr'
                  ? `Voulez-vous sauvegarder "${currentProjectName}" avant de créer un nouveau projet ?`
                  : `Do you want to save "${currentProjectName}" before creating a new project?`}
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveBeforeNew(false)}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={() => {
                  setShowSaveBeforeNew(false);
                  setNewProjectName('');
                  setShowNewProjectHelp(true);
                }}
              >
                {language === 'fr' ? 'Créer sans sauvegarder' : 'Create without saving'}
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                onClick={async () => {
                  setShowSaveBeforeNew(false);
                  await handleSaveProject();
                  setNewProjectName('');
                  setShowNewProjectHelp(true);
                }}
              >
                <Save className="w-4 h-4 mr-1" />
                {language === 'fr' ? 'Sauvegarder puis créer' : 'Save then create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b bg-gradient-to-r from-amber-50 to-orange-50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-amber-500">⚠</span>
                {language === 'fr' ? 'Modifications non sauvegardées' : 'Unsaved Changes'}
              </h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-600 text-sm leading-relaxed">
                {language === 'fr'
                  ? 'Vous avez des modifications non sauvegardées. Que souhaitez-vous faire ?'
                  : 'You have unsaved changes. What would you like to do?'}
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowExitConfirm(false)}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { setShowExitConfirm(false); setHasUnsavedChanges(false); onClose(); }}>
                {language === 'fr' ? 'Quitter sans sauvegarder' : 'Quit without saving'}
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white" onClick={handleSaveAndClose}>
                <Save className="w-4 h-4 mr-1" />
                {language === 'fr' ? 'Sauvegarder et quitter' : 'Save and quit'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modale de sélection de projet */}
      {showProjectModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white">
                {language === "fr" ? "Atelier Créations" : "Creations Studio"}
              </h3>
              <p className="text-white/80 text-sm">
                {language === "fr" 
                  ? "Démarrez un nouveau projet ou reprenez un projet existant" 
                  : "Start a new project or resume an existing one"}
              </p>
            </div>
            
            {/* Contenu */}
            <div className="p-6">
              {/* Bouton principal : Nouveau projet vide (toujours en premier) */}
              <Button
                className="w-full py-5 mb-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md"
                onClick={() => {
                  setShowNewProjectHelp(true);
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                <span className="font-semibold">
                  {language === "fr" ? "Nouveau projet vide" : "New empty project"}
                </span>
              </Button>

              {/* Séparateur */}
              {existingProjects.length > 0 && (
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      {language === "fr" ? "ou ouvrir un projet existant" : "or open an existing project"}
                    </span>
                  </div>
                </div>
              )}

              {/* Liste des projets existants */}
              <div className="max-h-[280px] overflow-y-auto">
                {existingProjects.length > 0 ? (
                  <div className="space-y-2">
                    {existingProjects.map((project) => (
                      <div
                        key={project.id}
                        role="button"
                        tabIndex={0}
                        className="w-full p-4 text-left border rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedProjectId(project.id ?? null);
                          setCurrentProjectId(project.id ?? null);
                          setCurrentProjectName(project.name);

                          // Charger les photos du projet dans sourcePhotos
                          if ((project.photos ?? []).length > 0) {
                            const projectPhotos: CollectorItem[] = (project.photos ?? []).map(photo => ({
                              id: String(photo.id ?? Date.now()),
                              type: 'photo' as const,
                              src: String(photo.photoUrl ?? ''),
                              name: photo.photoTitle || 'Photo',
                              thumbnail: photo.thumbnail ?? undefined
                            }));
                            setSourcePhotos(projectPhotos);
                            console.log(`[Créations] ${projectPhotos.length} photos chargées pour le projet ${project.name}`);
                          } else {
                            setSourcePhotos([]);
                          }

                          setShowProjectModal(false);
                          toast.success(language === "fr" ? `Projet "${project.name}" ouvert` : `Project "${project.name}" opened`);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 group-hover:text-purple-700">
                              {project.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(project.photos ?? []).length} {language === "fr" ? "photo(s)" : "photo(s)"} •
                              {language === "fr" ? " Modifié le " : " Modified "}
                              {new Date(project.updatedAt ?? project.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              title={language === "fr" ? "Supprimer ce projet" : "Delete this project"}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(language === "fr" ? `Supprimer le projet "${project.name}" ?` : `Delete project "${project.name}"?`)) {
                                  try {
                                    // Supprimer dans creations_projects (si présent)
                                    await deleteCreationsProject(project.id);
                                    // Supprimer aussi dans album_metas et albums
                                    // (les projets issus de cat_mes_projets sont stockés là)
                                    if (project.id) {
                                      await db.album_metas.delete(project.id);
                                      await db.albums.delete(project.id);
                                    }
                                    setExistingProjects(prev => prev.filter(p => p.id !== project.id));
                                    toast.success(language === "fr" ? "Projet supprimé" : "Project deleted");
                                  } catch (err) {
                                    console.error('Erreur suppression projet:', err);
                                    toast.error(language === "fr" ? "Erreur lors de la suppression" : "Error deleting project");
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Library className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">{language === "fr" ? "Aucun projet existant" : "No existing projects"}</p>
                    <p className="text-sm mt-1">
                      {language === "fr" 
                        ? "Créez d'abord un projet dans la section Albums" 
                        : "First create a project in the Albums section"}
                    </p>
                  </div>
                )}
              </div>
              

            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <Button variant="outline" onClick={onClose}>
                {language === "fr" ? "Annuler" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modale d'aide pour créer un nouveau projet */}
      {/* Portail pour l'aperçu agrandi des vignettes — positionné à gauche de la colonne */}
      {hoveredThumbnail && createPortal(
        <div
          className="fixed pointer-events-none"
          style={{
            left: hoveredThumbnail.rect.left - 220,
            top: Math.max(8, hoveredThumbnail.rect.top + hoveredThumbnail.rect.height / 2 - 110),
            zIndex: 999999,
          }}
          onMouseEnter={() => setHoveredThumbnail(null)}
        >
          <div className="bg-white rounded-lg shadow-2xl border-2 border-purple-500 ring-4 ring-purple-400/50 p-1 animate-in zoom-in-50 duration-150">
            <img
              src={hoveredThumbnail.src}
              alt={hoveredThumbnail.name}
              className="max-w-[200px] max-h-[200px] object-contain rounded"
            />
            <div className="mt-1 bg-gray-900 text-white text-xs px-2 py-1 rounded text-center truncate max-w-[200px]">
              {hoveredThumbnail.name}
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Menu contextuel (clic droit sur élément) */}
      {contextMenu && createPortal(
        <div 
          className="fixed inset-0 z-[100]" 
          onClick={closeContextMenu}
          onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
        >
          <ContextMenuPositioned x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu}>
            {(() => {
              const element = canvasElements.find(el => el.id === contextMenu.elementId);
              if (!element) return null;
              const isInMultiSel = selectedElementIds.size > 1 && selectedElementIds.has(element.id);
              
              return (
                <>
                  {/* Retirer de la sélection (visible uniquement en multi-sélection) */}
                  {isInMultiSel && (
                    <>
                      <button
                        className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3"
                        onClick={() => {
                          setSelectedElementIds(prev => {
                            const next = new Set(prev);
                            next.delete(element.id);
                            if (next.size === 0) {
                              setSelectedElementId(null);
                              setActiveCanvasPhoto(null);
                            } else {
                              setSelectedElementId(Array.from(next)[0]);
                            }
                            return next;
                          });
                          closeContextMenu();
                        }}
                      >
                        <X className="w-4 h-4 text-blue-500" />
                        <span>{language === "fr" ? "Retirer de la s\u00e9lection" : "Remove from selection"}</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      {/* Supprimer la sélection entière */}
                      <button
                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3"
                        onClick={() => {
                          selectedElementIds.forEach(id => removeFromCanvas(id));
                          setSelectedElementIds(new Set());
                          setSelectedElementId(null);
                          setActiveCanvasPhoto(null);
                          closeContextMenu();
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{language === "fr" ? `Supprimer la s\u00e9lection (${selectedElementIds.size})` : `Delete selection (${selectedElementIds.size})`}</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                    </>
                  )}
                  {/* Verrouiller / Déverrouiller */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      updateCanvasElement(element.id, { locked: !element.locked });
                      closeContextMenu();
                    }}
                  >
                    {element.locked ? (
                      <><Unlock className="w-4 h-4 text-green-600" /><span>{language === "fr" ? "Déverrouiller" : "Unlock"}</span></>
                    ) : (
                      <><Lock className="w-4 h-4 text-orange-500" /><span>{language === "fr" ? "Verrouiller" : "Lock"}</span></>
                    )}
                  </button>
                  
                  <div className="border-t border-gray-100 my-1" />
                  
                  {/* Dupliquer */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      duplicateCanvasElement(element.id);
                      closeContextMenu();
                    }}
                  >
                    <Copy className="w-4 h-4 text-blue-500" />
                    <span>{language === "fr" ? "Dupliquer" : "Duplicate"}</span>
                  </button>

                  {/* Centrer horizontalement */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => { centerElementH(element.id); closeContextMenu(); }}
                  >
                    <Crosshair className="w-4 h-4 text-green-600" />
                    <span>{language === "fr" ? "Centrer horizontalement" : "Center horizontally"}</span>
                  </button>
                  {/* Centrer verticalement */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => { centerElementV(element.id); closeContextMenu(); }}
                  >
                    <Crosshair className="w-4 h-4 text-teal-600" />
                    <span>{language === "fr" ? "Centrer verticalement" : "Center vertically"}</span>
                  </button>
                  {/* Centrer sur la page (les deux axes) */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => { centerElement(element.id); closeContextMenu(); }}
                  >
                    <Crosshair className="w-4 h-4 text-blue-600" />
                    <span>{language === "fr" ? "Centrer sur la page" : "Center on page"}</span>
                  </button>

                  {/* Remplacer (passe-partout uniquement) */}
                  {element.name === "Passe-partout" && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-3"
                      onClick={() => {
                        // Supprimer l'élément existant et signaler à AssemblagePanel
                        // qu'il doit remplacer cet ID lors du prochain ajout
                        setReplaceTargetId(element.id);
                        toast.info(language === "fr" ? "Configurez le nouveau passe-partout puis cliquez Appliquer" : "Configure the new passe-partout then click Apply");
                        closeContextMenu();
                      }}
                    >
                      <RotateCcw className="w-4 h-4 text-purple-500" />
                      <span>{language === "fr" ? "Remplacer" : "Replace"}</span>
                    </button>
                  )}
                  
                  <div className="border-t border-gray-100 my-1" />

                  {/* Rotation +90° */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      updateCanvasElement(element.id, { rotation: ((element.rotation || 0) + 90) % 360 });
                      closeContextMenu();
                    }}
                  >
                    <RotateCcw className="w-4 h-4 text-green-600 scale-x-[-1]" />
                    <span>{language === "fr" ? "Rotation +90°" : "Rotate +90°"}</span>
                  </button>

                  {/* Rotation -90° */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      updateCanvasElement(element.id, { rotation: ((element.rotation || 0) - 90 + 360) % 360 });
                      closeContextMenu();
                    }}
                  >
                    <RotateCcw className="w-4 h-4 text-green-600" />
                    <span>{language === "fr" ? "Rotation -90°" : "Rotate -90°"}</span>
                  </button>

                  {/* Rotation 180° */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      updateCanvasElement(element.id, { rotation: ((element.rotation || 0) + 180) % 360 });
                      closeContextMenu();
                    }}
                  >
                    <RotateCcw className="w-4 h-4 text-teal-600" />
                    <span>{language === "fr" ? "Rotation 180°" : "Rotate 180°"}</span>
                  </button>

                  {/* Retourner horizontalement */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      updateCanvasElement(element.id, { flipX: !element.flipX });
                      closeContextMenu();
                    }}
                  >
                    <FlipHorizontal className="w-4 h-4 text-orange-500" />
                    <span>{language === "fr" ? "Retourner ⇔" : "Flip horizontal"}</span>
                  </button>
                  {/* Retourner verticalement */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      updateCanvasElement(element.id, { flipY: !element.flipY });
                      closeContextMenu();
                    }}
                  >
                    <FlipVertical className="w-4 h-4 text-orange-500" />
                    <span>{language === "fr" ? "Retourner ⇕" : "Flip vertical"}</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  
                  {/* Premier plan */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      bringToFront(element.id);
                      closeContextMenu();
                    }}
                  >
                    <ArrowUp className="w-4 h-4 text-purple-500" />
                    <span>{language === "fr" ? "Premier plan" : "Bring to front"}</span>
                  </button>
                  
                  {/* Arrière-plan */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                    onClick={() => {
                      sendToBack(element.id);
                      closeContextMenu();
                    }}
                  >
                    <ArrowDown className="w-4 h-4 text-purple-500" />
                    <span>{language === "fr" ? "Arrière-plan" : "Send to back"}</span>
                  </button>
                  
                  <div className="border-t border-gray-100 my-1" />
                  
                  {/* Envoyer vers le collecteur */}
                  {element.src && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-3"
                      onClick={() => {
                        const newItem: CollectorItem = {
                          id: `collector_${Date.now()}`,
                          type: 'detourage',
                          src: element.src!,
                          name: element.name || (language === 'fr' ? 'Pièce détourée' : 'Cutout piece'),
                          thumbnail: element.src!
                        };
                        setCollectorItems(prev => [...prev, newItem]);
                        toast.success(language === "fr" ? "Ajouté au collecteur" : "Added to collector");
                        closeContextMenu();
                      }}
                    >
                      <Layers className="w-4 h-4 text-purple-500" />
                      <span>{language === "fr" ? "Envoyer vers le collecteur" : "Send to collector"}</span>
                    </button>
                  )}
                  
                  {/* Envoyer vers le panier */}
                  {element.src && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-amber-50 flex items-center gap-3"
                      onClick={async () => {
                        try {
                          await addToCreationsBasket([{
                            photoUrl: element.src!,
                            thumbnail: element.src!,
                            albumId: currentProjectId || 'atelier',
                            albumName: currentProjectName || (language === 'fr' ? 'Atelier Créations' : 'Creations Workshop'),
                            photoTitle: element.name || 'Photo'
                          }]);
                          toast.success(language === "fr" ? "Ajouté au panier" : "Added to basket");
                        } catch (error) {
                          console.error('Erreur ajout au panier:', error);
                          toast.error(language === "fr" ? "Erreur lors de l'ajout" : "Error adding to basket");
                        }
                        closeContextMenu();
                      }}
                    >
                      <ShoppingBasket className="w-4 h-4 text-amber-500" />
                      <span>{language === "fr" ? "Envoyer vers le panier" : "Send to basket"}</span>
                    </button>
                  )}
                  
                  <div className="border-t border-gray-100 my-1" />
                  
                  {/* Alignement entre éléments (visible quand 2+ éléments sélectionnés) */}
                  {selectedElementIds.size >= 2 && (
                    <>
                      <div className="px-4 py-1 text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">
                        {language === 'fr' ? 'Aligner les éléments' : 'Align elements'}
                      </div>
                      <div className="grid grid-cols-3 gap-0.5 px-2 pb-1">
                        <button
                          className="px-2 py-1.5 text-xs rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 flex items-center gap-1"
                          title={language === 'fr' ? 'Aligner à gauche' : 'Align left'}
                          onClick={() => { alignSelected('left'); closeContextMenu(); }}
                        >
                          <span className="text-base leading-none">◧</span>
                          <span>{language === 'fr' ? 'Gauche' : 'Left'}</span>
                        </button>
                        <button
                          className="px-2 py-1.5 text-xs rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 flex items-center gap-1"
                          title={language === 'fr' ? 'Centrer horizontalement' : 'Center H'}
                          onClick={() => { alignSelected('centerH'); closeContextMenu(); }}
                        >
                          <span className="text-base leading-none">↔</span>
                          <span>{language === 'fr' ? 'Centre H' : 'Center H'}</span>
                        </button>
                        <button
                          className="px-2 py-1.5 text-xs rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 flex items-center gap-1"
                          title={language === 'fr' ? 'Aligner à droite' : 'Align right'}
                          onClick={() => { alignSelected('right'); closeContextMenu(); }}
                        >
                          <span className="text-base leading-none">◦</span>
                          <span>{language === 'fr' ? 'Droite' : 'Right'}</span>
                        </button>
                        <button
                          className="px-2 py-1.5 text-xs rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 flex items-center gap-1"
                          title={language === 'fr' ? 'Aligner en haut' : 'Align top'}
                          onClick={() => { alignSelected('top'); closeContextMenu(); }}
                        >
                          <span className="text-base leading-none">▤</span>
                          <span>{language === 'fr' ? 'Haut' : 'Top'}</span>
                        </button>
                        <button
                          className="px-2 py-1.5 text-xs rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 flex items-center gap-1"
                          title={language === 'fr' ? 'Centrer verticalement' : 'Center V'}
                          onClick={() => { alignSelected('centerV'); closeContextMenu(); }}
                        >
                          <span className="text-base leading-none">↕</span>
                          <span>{language === 'fr' ? 'Centre V' : 'Center V'}</span>
                        </button>
                        <button
                          className="px-2 py-1.5 text-xs rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 flex items-center gap-1"
                          title={language === 'fr' ? 'Aligner en bas' : 'Align bottom'}
                          onClick={() => { alignSelected('bottom'); closeContextMenu(); }}
                        >
                          <span className="text-base leading-none">▪</span>
                          <span>{language === 'fr' ? 'Bas' : 'Bottom'}</span>
                        </button>
                      </div>
                      <div className="border-t border-gray-100 my-1" />
                    </>
                  )}

                  {/* Grouper (visible quand 2+ éléments sélectionnés) */}
                  {selectedElementIds.size >= 2 && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-3"
                      onClick={() => {
                        handleGroupElements();
                        closeContextMenu();
                      }}
                    >
                      <Layers className="w-4 h-4 text-purple-500" />
                      <span>{language === "fr" ? `Grouper (${selectedElementIds.size})` : `Group (${selectedElementIds.size})`}</span>
                    </button>
                  )}
                  
                  {/* Dégrouper (visible quand l'élément fait partie d'un groupe) */}
                  {element.groupId && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 flex items-center gap-3"
                      onClick={() => {
                        handleUngroupElements();
                        closeContextMenu();
                      }}
                    >
                      <Layers className="w-4 h-4 text-orange-500" />
                      <span>{language === "fr" ? "D\u00e9grouper" : "Ungroup"}</span>
                    </button>
                  )}
                  


                  <div className="border-t border-gray-100 my-1" />
                  
                  {/* Supprimer */}
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3"
                    onClick={() => {
                      removeFromCanvas(element.id);
                      closeContextMenu();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{language === "fr" ? "Supprimer" : "Delete"}</span>
                  </button>
                </>
              );
            })()}
          </ContextMenuPositioned>
        </div>,
        document.body
      )}
      
      {/* Menu contextuel (clic droit sur zone vide du canvas) */}
      {canvasContextMenu && createPortal(
        <div 
          className="fixed inset-0 z-[100]" 
          onClick={() => setCanvasContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setCanvasContextMenu(null); }}
        >
          <div 
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
            style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ajouter une photo directement sur le canvas */}
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
              onClick={() => {
                // Ouvrir le sélecteur de fichier pour ajouter une photo DIRECTEMENT sur le canvas
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = async (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files.length > 0) {
                    for (const file of Array.from(files)) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const src = event.target?.result as string;
                        // Ajouter la photo DIRECTEMENT sur le canvas
                        addToCanvas(src, file.name);
                        toast.success(language === "fr" ? `Photo "${file.name}" ajoutée au canvas` : `Photo "${file.name}" added to canvas`);
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                };
                input.click();
                setCanvasContextMenu(null);
              }}
            >
              <Plus className="w-4 h-4 text-green-600" />
              <span>{language === "fr" ? "Ajouter nouvelle photo" : "Add new photo"}</span>
            </button>
            
            <div className="border-t border-gray-100 my-1" />
            
            {/* Importer depuis le panier directement sur le canvas */}
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
              onClick={async () => {
                // Importer les photos du panier DIRECTEMENT sur le canvas
                const basket = await getCreationsBasket();
                if (basket.length > 0) {
                  for (const item of basket) {
                    addToCanvas(item.photoUrl, item.photoTitle || 'Photo');
                  }
                  toast.success(language === "fr" ? `${basket.length} photo(s) ajoutée(s) au canvas` : `${basket.length} photo(s) added to canvas`);
                } else {
                  toast.info(language === "fr" ? "Le panier est vide" : "Basket is empty");
                }
                setCanvasContextMenu(null);
              }}
            >
              <ShoppingBasket className="w-4 h-4 text-blue-500" />
              <span>{language === "fr" ? "Importer depuis le panier" : "Import from basket"}</span>
            </button>
            
            <div className="border-t border-gray-100 my-1" />
            
            {/* Coller une image directement sur le canvas */}
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
              onClick={async () => {
                try {
                  // Essayer d'abord avec l'API Clipboard moderne
                  const clipboardItems = await navigator.clipboard.read();
                  let imageFound = false;
                  for (const item of clipboardItems) {
                    const imageType = item.types.find(t => t.startsWith('image/'));
                    if (imageType) {
                      const blob = await item.getType(imageType);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const src = event.target?.result as string;
                        // Ajouter DIRECTEMENT sur le canvas
                        addToCanvas(src, language === 'fr' ? 'Image collée' : 'Pasted image');
                        toast.success(language === "fr" ? "Image collée sur le canvas" : "Image pasted to canvas");
                      };
                      reader.readAsDataURL(blob);
                      imageFound = true;
                      break;
                    }
                  }
                  if (!imageFound) {
                    toast.error(language === "fr" ? "Aucune image dans le presse-papiers" : "No image in clipboard");
                  }
                } catch (err) {
                  // Fallback: essayer avec l'événement paste
                  toast.error(language === "fr" ? "Impossible de coller l'image (utilisez Ctrl+V sur le canvas)" : "Cannot paste image (use Ctrl+V on canvas)");
                }
                setCanvasContextMenu(null);
              }}
            >
              <Image className="w-4 h-4 text-purple-500" />
              <span>{language === "fr" ? "Coller une image" : "Paste image"}</span>
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {showNewProjectHelp && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[3200]">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {language === "fr" ? "Nouveau projet" : "New project"}
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                {language === "fr"
                  ? "Donnez un nom à votre nouveau projet de création"
                  : "Give a name to your new creation project"}
              </p>
            </div>

            {/* Contenu */}
            <div className="px-6 py-5">
              <Label htmlFor="newProjectNameInput" className="text-sm font-medium text-gray-700 mb-2 block">
                {language === "fr" ? "Nom du projet" : "Project name"}
              </Label>
              <Input
                id="newProjectNameInput"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNewProject();
                  if (e.key === 'Escape') { setShowNewProjectHelp(false); setNewProjectName(''); }
                }}
                placeholder={language === "fr" ? "Ex: Mon collage vacances..." : "Ex: My vacation collage..."}
                className="w-full"
                autoFocus
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowNewProjectHelp(false); setNewProjectName(''); }}
              >
                {language === "fr" ? "Annuler" : "Cancel"}
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                onClick={handleCreateNewProject}
                disabled={!newProjectName.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                {language === "fr" ? "Créer le projet" : "Create project"}
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Modale d'aperçu SVG laser avant téléchargement */}
      {svgPreviewModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSvgPreviewModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col max-w-2xl w-full mx-4 overflow-hidden"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  {language === 'fr' ? 'Aperçu SVG laser' : 'Laser SVG preview'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{svgPreviewModal.filename}</p>
              </div>
              <button
                onClick={() => setSvgPreviewModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                aria-label="Fermer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Aperçu SVG */}
            <div className="flex-1 overflow-auto p-4 bg-gray-50 flex items-center justify-center" style={{ minHeight: 0 }}>
              <div
                className="bg-white border border-gray-200 rounded shadow-sm"
                style={{ maxWidth: '100%', maxHeight: '60vh', overflow: 'auto' }}
                dangerouslySetInnerHTML={{ __html: svgPreviewModal.svgContent }}
              />
            </div>
            {/* Pied de modale */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-white">
              <p className="text-xs text-gray-500">
                {language === 'fr'
                  ? 'Compatible LightBurn, RDWorks, LaserGRBL'
                  : 'Compatible with LightBurn, RDWorks, LaserGRBL'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSvgPreviewModal(null)}
                  className="px-4 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([svgPreviewModal.svgContent], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = svgPreviewModal.filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setSvgPreviewModal(null);
                    toast.success(
                      language === 'fr'
                        ? `SVG laser téléchargé : ${svgPreviewModal.filename}`
                        : `Laser SVG downloaded: ${svgPreviewModal.filename}`
                    );
                  }}
                  className="px-4 py-1.5 text-xs rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {language === 'fr' ? 'Télécharger' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
