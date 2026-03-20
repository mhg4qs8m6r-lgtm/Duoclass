/**
 * AssemblagePanel - panneau unifié de l'onglet Assemblage de l'Atelier Créations.
 *
 * Remplace les 4 anciens panneaux séparés (Bibliothèque, Effets, Mise en page, Stickers)
 * par un accordéon à 4 sections distinctes :
 *   1. Passe-partout   - formes d'ouverture + habillage du fond
 *   2. Cadres & Bordures - import + application sur photo sélectionnée
 *   3. Cliparts & Stickers - import bureau + URL web + placement canvas
 *   4. Effets photo    - traitements réels via canvas 2D
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Frame,
  Image,
  Sparkles,
  Sticker,
  ChevronDown,
  ChevronRight,
  Upload,
  Link,
  Trash2,
  Circle,
  Square,
  RectangleHorizontal,
  Minus,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  RefreshCw,
  Puzzle,
  FolderOpen,
  Spline,
  CheckCircle,
  RotateCcw,
  X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { db, BibliothequeItemDB, MODELES_STICKERS_ALBUM_ID } from "@/db";
import type { PhotoFrame } from "@/types/photo";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Format du canvas transmis par le parent pour dimensionner les passe-partout */
export interface CanvasFormat {
  width: number;   // cm
  height: number;  // cm
  label: string;
}

/** Forme d'ouverture d'un passe-partout */
export type PassePartoutShape = "rect" | "square" | "round" | "oval" | "arch" | "puzzle" | "heart" | "star" | "diamond" | "hexagon" | "line";

/** Données d'un passe-partout à ajouter au canvas */
export interface PassePartoutData {
  shape: PassePartoutShape;
  borderWidthCm: number;
  borderColor: string;
  patternSrc: string | null;   // data-URL ou URL distante du motif de fond
  patternOpacity: number;      // 0-100 : opacité du motif par-dessus la couleur de fond
  formatWidth: number;
  formatHeight: number;
  /** Largeur de l'ouverture en cm (indépendante de borderWidthCm pour l'ovale) */
  openingWidthCm?: number;
  /** Hauteur de l'ouverture en cm (indépendante de borderWidthCm pour l'ovale) */
  openingHeightCm?: number;
  /** Cible de la couleur : 'exterieur' (bordure) ou 'interieur' (ouverture) */
  colorTarget?: "interieur" | "exterieur";
  /** Cible du motif : 'exterieur' (bordure) ou 'interieur' (ouverture) */
  patternTarget?: "interieur" | "exterieur";
}

export interface TextElementProps {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontBold: boolean;
  fontItalic: boolean;
  fontUnderline: boolean;
  textAlign: "left" | "center" | "right";
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface AssemblagePanelProps {
  /** Format papier courant du canvas */
  canvasFormat: CanvasFormat;
  /** Photo actuellement sélectionnée sur le canvas (src) */
  activeCanvasPhoto: string | null;
  /** Ajoute un élément image directement sur le canvas */
  onAddToCanvas: (src: string, name: string) => void;
  /** Applique un effet à la photo sélectionnée et met à jour son src */
  onApplyEffect: (newSrc: string) => void;
  /** Ajoute un passe-partout au canvas */
  onAddPassePartout: (data: PassePartoutData) => void;
  /** Remplace le passe-partout existant (supprime l'ancien puis ajoute le nouveau) */
  onReplacePassePartout?: (data: PassePartoutData) => void;
  /** Remplace uniquement la couleur de fond en conservant la découpe et le motif existants */
  onReplaceColorOnly?: (newColor: string, newTarget: "exterieur" | "interieur") => void;
  /** Remplace uniquement le motif en conservant la découpe et la couleur existantes */
  onReplacePatternOnly?: (newPatternSrc: string, newOpacity: number, newTarget: "exterieur" | "interieur") => void;
  /** Indique si un passe-partout existe déjà sur le canvas */
  hasExistingPassePartout?: boolean;
  /** Ajoute un élément texte sur le canvas */
  onAddTextToCanvas: (textProps: TextElementProps) => void;
  /** Élément texte actuellement sélectionné sur le canvas (pour édition depuis le panneau) */
  selectedTextElement?: (TextElementProps & { id: string }) | null;
  /** Met à jour un élément texte existant sur le canvas */
  onUpdateTextElement?: (id: string, textProps: TextElementProps) => void;
  // --- Nouvelle génération : découpes interactives ---
  /** Ajoute une découpe interactive sur le canvas avec une couleur d'ouverture */
  onAddOpening?: (shape: 'rect' | 'square' | 'round' | 'oval' | 'arch' | 'puzzle' | 'heart' | 'star' | 'diamond' | 'hexagon' | 'line', color: string, extraParams?: { starBranches?: number; heartDepth?: number }) => void;
  /** Valide la découpe en cours de positionnement */
  onValidateOpening?: () => void;
  /** Supprime une découpe par son ID */
  onDeleteOpening?: (id: string) => void;
  /** Applique une couleur à une ou plusieurs découpes sélectionnées */
  onApplyColorToOpenings?: (color: string, targetIds: string[]) => void;
  /** Génère l'image PNG finale à partir de toutes les découpes validées */
  onGenerateFromOpenings?: (bgColor: string, patternSrc: string | null, patternOpacity: number) => void;
  /** Liste des découpes actuellement sur le canvas */
  canvasOpenings?: Array<{ id: string; shape: string; openingColor: string; validated: boolean; name: string }>;
  /** ID de la découpe en cours de positionnement (non validée) */
  activeOpeningId?: string | null;
  /** ID de l'élément canvas actuellement sélectionné */
  selectedCanvasElementId?: string | null;
  /** Applique un gabarit multi-ouvertures (place toutes les découpes validées en une fois) */
  onApplyTemplate?: (openings: Array<{ shape: 'rect' | 'square' | 'round' | 'oval' | 'arch' | 'puzzle' | 'heart' | 'star'; xFrac: number; yFrac: number; wFrac: number; hFrac: number }>) => void;
  /** Retourne les formes actuelles du canvas en coordonnées fractionnaires pour sauvegarde */
  onGetCurrentShapes?: () => Array<{ shape: string; xFrac: number; yFrac: number; wFrac: number; hFrac: number }> | null;
  onGenerateFullPagePuzzle?: (cols: number, rows: number, showNumbers?: boolean, transparent?: boolean, numberSize?: 'small' | 'medium' | 'large') => void;
  /** Génère et télécharge le SVG de découpe laser (périmètre + ouvertures) */
  onExportLaserSVG?: () => void;
  /** Ajoute un fond (rectangle plein, sans découpe) au canvas */
  onAddBackground?: (patternSrc: string | null, patternOpacity: number, bgColor: string) => void;
  /** Indique si un fond (Fond) existe déjà sur le canvas */
  hasExistingBackground?: boolean;
  /** Supprime le fond existant du canvas */
  onRemoveBackground?: () => void;
  /**
   * Éléments image actuellement sur le canvas (stickers, cliparts, photos).
   * Utilisé pour calculer les contours offset et générer le SVG de découpe.
   */
  canvasImageElements?: Array<{
    id: string;
    name?: string;
    x: number;       // cm depuis le bord gauche du format
    y: number;       // cm depuis le bord haut du format
    width: number;   // cm
    height: number;  // cm
    rotation: number; // degrés
  }>;
  /** Génère et télécharge le SVG des contours offset des stickers sélectionnés */
  onExportStickerContoursSVG?: (offsetMm: number, elementIds: string[], useRealContour?: boolean, alphaThreshold?: number) => void;
  /**
   * Applique la mise en page bin-packing au canvas :
   * déplace chaque élément vers sa nouvelle position calculée.
   */
  onApplyBinPackLayout?: (placements: Array<{ id: string; x: number; y: number }>) => void;
  /**
   * Duplique un élément existant du canvas N fois,
   * en plaçant chaque copie aux coordonnées précalculées (en cm).
   */
  onDuplicateElement?: (sourceId: string, copies: Array<{ x: number; y: number; name: string }>, removeOriginal?: boolean) => void;
  /**
   * Transmet les données d'overlay du contour offset sticker au canvas.
   * null = effacer l'overlay.
   */
  onStickerOverlayChange?: (overlay: {
    elementId: string;
    offsetMm: number;
    showCropMarks: boolean;
    /** Nombre de passes de lissage gaussien (1=brut, 10=très lissé). Défaut : 3. */
    gaussPasses?: number;
  } | null) => void;
  /**
   * Valeur contrôlée des croix de repérage (pilotée par le parent).
   * Séparée de onStickerOverlayChange pour éviter tout couplage avec le toggle b.
   */
  stickerCropMarks?: boolean;
  /** Callback quand l'utilisateur bascule le toggle c (Croix de repérage). */
  onStickerCropMarksChange?: (value: boolean) => void;
  /** Affiche un rectangle fin représentant le cadre extérieur du format (Passe-partout). */
  showFormatBorder?: boolean;
  /** Callback quand l'utilisateur bascule le toggle "Afficher cadre extérieur". */
  onShowFormatBorderChange?: (value: boolean) => void;
  /** Liste des filets configurés (traits fins concentriques autour des ouvertures). */
  filets?: FiletConfig[];
  /** Callback quand la liste des filets change. */
  onFiletsChange?: (filets: FiletConfig[]) => void;
  // ── Éditeur de segments ──────────────────────────────────────────────────
  /** true = une shape éligible est sélectionnée sur le canvas */
  segmentEditorActive?: boolean;
  /** true = tous les segments sont actuellement arrondis */
  segmentsRounded?: boolean;
  /** Bascule arrondi/droit sur tous les segments de la forme sélectionnée */
  onRoundAllSegments?: () => void;
  /** true = le mode édition de nœuds est actif (segments individuels cliquables) */
  isNodeEditMode?: boolean;
  /** Active/désactive le mode édition de nœuds */
  onToggleNodeEditMode?: () => void;
  /** Index du segment sélectionné (null = aucun) */
  selectedSegmentIndex?: number | null;
  /** Arrondir le segment sélectionné vers l'intérieur (concave) */
  onRoundSegmentConcave?: () => void;
  /** Arrondir le segment sélectionné vers l'extérieur (convexe) */
  onRoundSegmentConvex?: () => void;
  /** Supprimer le segment sélectionné (ouvre la forme) */
  onDeleteSegment?: () => void;
  /** Redresser le segment sélectionné (le remettre en ligne droite) */
  onStraightenSegment?: () => void;
  /** Mode découpe par ligne actif */
  isCutMode?: boolean;
  /** Bascule le mode découpe par ligne */
  onToggleCutMode?: () => void;
  /** true = le mode tracé libre de ligne est actif (cliquer-glisser sur le canvas) */
  isLineDrawMode?: boolean;
  /** Active/désactive le mode tracé libre de ligne */
  onToggleLineDrawMode?: () => void;
  /** true = une forme 'line' est sélectionnée sur le canvas */
  lineSelected?: boolean;
  /** true = la ligne sélectionnée est actuellement arrondie (courbe de Bézier) */
  lineIsRounded?: boolean;
  /** Bascule arrondi/droit sur la ligne sélectionnée */
  onRoundLine?: () => void;
  /** Nombre de segments tracés dans la chaîne en cours (0 = aucun) */
  lineChainCount?: number;
  /** Couleur CSS du prochain segment de ligne à tracer */
  lineColor?: string;
  /** Callback quand l'utilisateur change la couleur de ligne */
  onLineColorChange?: (color: string) => void;
  /** Épaisseur du trait de ligne en px (1–5) */
  lineStrokeWidth?: number;
  /** Callback quand l'utilisateur change l'épaisseur */
  onLineStrokeWidthChange?: (width: number) => void;
}

// ---------------------------------------------------------------------------
// Type FiletConfig : un filet est un trait fin concentrique autour des ouvertures
// ---------------------------------------------------------------------------

/**
 * Décrit un filet (trait fin concentrique) autour des ouvertures du passe-partout.
 * L'offset est la distance en mm entre le bord de l'ouverture et le filet.
 * L'épaisseur est la largeur du trait en mm (0.3 – 2 mm).
 * Maximum 5 mm d'offset pour rester dans la marge du passe-partout.
 */
export interface FiletConfig {
  /** Identifiant unique du filet (clé React) */
  id: string;
  /** Distance entre le bord de l'ouverture et le filet, en mm (0 – 5) */
  offsetMm: number;
  /** Épaisseur du trait en mm (0.3 – 2) */
  thicknessMm: number;
  /** Couleur CSS du filet (ex. "#1a1a1a", "#c8a96e") */
  color: string;
}

// ---------------------------------------------------------------------------
// Sous-section : Passe-partout
// ---------------------------------------------------------------------------

const SHAPES: { id: PassePartoutShape; labelFr: string; labelEn: string }[] = [
  { id: "rect",   labelFr: "Rectangle",  labelEn: "Rectangle" },
  { id: "square", labelFr: "Carré",      labelEn: "Square"    },
  { id: "round",  labelFr: "Rond",       labelEn: "Round"     },
  { id: "oval",   labelFr: "Ovale",      labelEn: "Oval"      },
  { id: "arch",   labelFr: "Arche",      labelEn: "Arch"      },
  { id: "heart",   labelFr: "Cœur",     labelEn: "Heart"    },
  { id: "star",    labelFr: "Étoile",    labelEn: "Star"     },
  { id: "diamond", labelFr: "Losange",   labelEn: "Diamond"  },
  { id: "hexagon", labelFr: "Hexagone",  labelEn: "Hexagon"  },
  { id: "line",    labelFr: "Ligne",      labelEn: "Line"      },
];

// ---------------------------------------------------------------------------
// Composant : mini-croquis SVG du passe-partout
// ---------------------------------------------------------------------------

interface PassePartoutPreviewProps {
  shape: PassePartoutShape;
  /** Couleur de la zone active */
  activeColor: string;
  /** Cible active : intérieur ou extérieur */
  target: "interieur" | "exterieur";
  /** Ratio largeur/hauteur du format (ex: 10/15 = 0.667) */
  formatRatio: number;
  /** Ratio largeur/hauteur de l'ouverture */
  openingRatio: number;
  /** Fraction de la bordure par rapport au format (0-0.5) */
  borderFraction: number;
}

function PassePartoutPreview({
  shape,
  activeColor,
  target,
  formatRatio,
  openingRatio,
  borderFraction,
}: PassePartoutPreviewProps) {
  // Dimensions du croquis en pixels SVG
  const SVG_W = 120;
  const SVG_H = formatRatio > 0 ? Math.round(SVG_W / formatRatio) : 80;
  const safeH = Math.min(SVG_H, 160); // éviter un croquis trop haut

  // Dimensions de l'ouverture dans le croquis
  const pad = borderFraction * SVG_W;
  const innerW = Math.max(4, SVG_W - pad * 2);
  const innerH = Math.max(4, safeH - (borderFraction * safeH) * 2);
  const innerX = (SVG_W - innerW) / 2;
  const innerY = (safeH - innerH) / 2;

  // Couleurs des deux zones
  // Quand cible = extérieur : fond (outer) prend la couleur active, ouverture (inner) reste gris clair
  // Quand cible = intérieur : ouverture (inner) prend la couleur active, fond (outer) reste gris clair
  const outerFill = target === "exterieur" ? activeColor : "#d1d5db";
  const innerFill = target === "interieur" ? activeColor : "#f3f4f6";

  // Chemin de l'ouverture selon la forme
  const openingPath = useMemo(() => {
    const cx = innerX + innerW / 2;
    const cy = innerY + innerH / 2;
    const rx = innerW / 2;
    const ry = innerH / 2;
    switch (shape) {
      case "round": {
        // Cercle : rayon = min(rx, ry) pour forcer un vrai cercle
        const r = Math.min(rx, ry);
        return `M ${cx - r} ${cy} a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 ${-r * 2} 0`;
      }
      case "oval":
        // Ellipse : utilise pleinement rx et ry
        return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 1 ${rx * 2} 0 a ${rx} ${ry} 0 1 1 ${-rx * 2} 0`;
      case "arch": {
        const r = rx;
        return `M ${innerX} ${innerY + innerH} L ${innerX} ${innerY + r} A ${r} ${r} 0 0 1 ${innerX + innerW} ${innerY + r} L ${innerX + innerW} ${innerY + innerH} Z`;
      }
      case "square": {
        // Carré : côté = min(innerW, innerH), centré
        const side = Math.min(innerW, innerH);
        const sx = innerX + (innerW - side) / 2;
        const sy = innerY + (innerH - side) / 2;
        return `M ${sx} ${sy} h ${side} v ${side} h ${-side} Z`;
      }
      case "heart": {
        // Cœur : deux arcs de Bézier cubiques
        const hx = cx, hy = cy;
        const hw = rx, hh = ry;
        return [
          `M ${hx} ${hy + hh * 0.35}`,
          `C ${hx} ${hy - hh * 0.05} ${hx - hw * 1.1} ${hy - hh * 0.6} ${hx - hw} ${hy - hh * 0.25}`,
          `C ${hx - hw * 0.9} ${hy - hh * 0.85} ${hx - hw * 0.1} ${hy - hh * 0.85} ${hx} ${hy - hh * 0.25}`,
          `C ${hx + hw * 0.1} ${hy - hh * 0.85} ${hx + hw * 0.9} ${hy - hh * 0.85} ${hx + hw} ${hy - hh * 0.25}`,
          `C ${hx + hw * 1.1} ${hy - hh * 0.6} ${hx} ${hy - hh * 0.05} ${hx} ${hy + hh * 0.35}`,
          `C ${hx} ${hy + hh * 0.7} ${hx - hw * 0.6} ${hy + hh * 0.9} ${hx} ${hy + hh}`,
          `C ${hx + hw * 0.6} ${hy + hh * 0.9} ${hx} ${hy + hh * 0.7} ${hx} ${hy + hh * 0.35} Z`,
        ].join(' ');
      }
      case "star": {
        // Étoile à 5 branches
        const pts: string[] = [];
        const outerR = Math.min(rx, ry);
        const innerR = outerR * 0.42;
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          pts.push(`${i === 0 ? 'M' : 'L'} ${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`);
        }
        return pts.join(' ') + ' Z';
      }
      case "rect":
      default:
        return `M ${innerX} ${innerY} h ${innerW} v ${innerH} h ${-innerW} Z`;
    }
  }, [shape, innerX, innerY, innerW, innerH]);

  return (
    <div className="flex flex-col items-center gap-1 my-2">
      <svg
        width={SVG_W}
        height={safeH}
        viewBox={`0 0 ${SVG_W} ${safeH}`}
        className="rounded border border-gray-300 shadow-sm"
        style={{ display: "block" }}
      >
        {/* Zone extérieure (fond) */}
        <rect x={0} y={0} width={SVG_W} height={safeH} fill={outerFill} />
        {/* Zone intérieure (ouverture) */}
        <path d={openingPath} fill={innerFill} />
        {/* Contour de l'ouverture */}
        <path d={openingPath} fill="none" stroke="#9ca3af" strokeWidth="0.8" />
        {/* Contour extérieur */}
        <rect x={0.5} y={0.5} width={SVG_W - 1} height={safeH - 1} fill="none" stroke="#d1d5db" strokeWidth="1" />
      </svg>
      <p className="text-xs text-gray-400 italic">
        {target === "exterieur" ? "Extérieur coloré" : "Intérieur coloré"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-section : Passe-partout
// ---------------------------------------------------------------------------

function PassePartoutSection({
  canvasFormat,
  onAddPassePartout,
  onReplacePassePartout,
  onReplaceColorOnly,
  onReplacePatternOnly,
  hasExistingPassePartout,
  onAddOpening,
  onValidateOpening,
  onDeleteOpening,
  onApplyColorToOpenings,
  onGenerateFromOpenings,
  canvasOpenings,
  activeOpeningId,
  selectedCanvasElementId,
  onApplyTemplate,
  onGetCurrentShapes,
  onGenerateFullPagePuzzle,
  onExportLaserSVG,
  onAddBackground,
  hasExistingBackground,
  onRemoveBackground,
  showFormatBorder,
  onShowFormatBorderChange,
  filets,
  onFiletsChange,
  segmentEditorActive,
  segmentsRounded,
  onRoundAllSegments,
  isNodeEditMode,
  onToggleNodeEditMode,
  selectedSegmentIndex,
  onRoundSegmentConcave,
  onRoundSegmentConvex,
  onDeleteSegment,
  onStraightenSegment,
  isCutMode,
  onToggleCutMode,
  isLineDrawMode,
  onToggleLineDrawMode,
  lineSelected,
  lineIsRounded,
  onRoundLine,
  lineChainCount = 0,
  lineColor = '#000000',
  onLineColorChange,
  lineStrokeWidth = 0.5,
  onLineStrokeWidthChange,
}: Pick<AssemblagePanelProps, "canvasFormat" | "onAddPassePartout" | "onReplacePassePartout" | "onReplaceColorOnly" | "onReplacePatternOnly" | "hasExistingPassePartout" | "onAddOpening" | "onValidateOpening" | "onDeleteOpening" | "onApplyColorToOpenings" | "onGenerateFromOpenings" | "canvasOpenings" | "activeOpeningId" | "selectedCanvasElementId" | "onApplyTemplate" | "onGetCurrentShapes" | "onGenerateFullPagePuzzle" | "onExportLaserSVG" | "onAddBackground" | "hasExistingBackground" | "onRemoveBackground" | "showFormatBorder" | "onShowFormatBorderChange" | "filets" | "onFiletsChange" | "segmentEditorActive" | "segmentsRounded" | "onRoundAllSegments" | "isNodeEditMode" | "onToggleNodeEditMode" | "selectedSegmentIndex" | "onRoundSegmentConcave" | "onRoundSegmentConvex" | "onDeleteSegment" | "onStraightenSegment" | "isCutMode" | "onToggleCutMode" | "isLineDrawMode" | "onToggleLineDrawMode" | "lineSelected" | "lineIsRounded" | "onRoundLine" | "lineChainCount" | "lineColor" | "onLineColorChange" | "lineStrokeWidth" | "onLineStrokeWidthChange">) {
  const { language } = useLanguage();

  // --- Section active : accordéon exclusif ---
  const [activeSection, setActiveSection] = useState<"shape" | "pattern" | "template" | null>(null);
  const [filetsOpen, setFiletsOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const toggleSection = (section: "shape" | "pattern" | "template") => {
    // Si on clique sur la section déjà active → la fermer (toggle)
    // Si on clique sur une autre section → l'ouvrir directement (sans passer par null)
    setActiveSection((prev) => (prev === section ? null : section));
  };
  // Ouvrir automatiquement la section B quand une ligne est sélectionnée
  // (pour que les boutons Arrondir et Éditer les segments soient visibles)
  useEffect(() => {
    if (lineSelected) {
      setActiveSection("shape");
    }
  }, [lineSelected]);

  // Modèles personnalisés sauvegardés par l'utilisateur (persistés en localStorage)
  const [customTemplates, setCustomTemplates] = useState<Array<{
    id: string;
    label: string;
    openings: Array<{ shape: string; xFrac: number; yFrac: number; wFrac: number; hFrac: number }>;
  }>>(() => {
    try {
      const saved = localStorage.getItem("duoclass-custom-templates");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const saveCustomTemplates = (templates: typeof customTemplates) => {
    setCustomTemplates(templates);
    localStorage.setItem("duoclass-custom-templates", JSON.stringify(templates));
  };

  // Modèles prédéfinis masqués par l'utilisateur
  const [hiddenBuiltinIds, setHiddenBuiltinIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("duoclass-hidden-builtin-templates");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const hideBuiltinTemplate = (id: string) => {
    const next = [...hiddenBuiltinIds, id];
    setHiddenBuiltinIds(next);
    localStorage.setItem("duoclass-hidden-builtin-templates", JSON.stringify(next));
  };

  // --- Forme & dimensions ---
  const [shape, setShape] = useState<PassePartoutShape>("rect");
  /** Nombre de branches de l'étoile (3–8) */
  const [starBranches, setStarBranches] = useState(5);
  /** Profondeur de l'encoche du cœur (0–100) */
  const [heartDepth, setHeartDepth] = useState(50);
  const [borderWidth, setBorderWidth] = useState(2);
  const [openingW, setOpeningW] = useState(() => Math.max(1, canvasFormat.width - 4));
  const [openingH, setOpeningH] = useState(() => Math.max(1, canvasFormat.height - 4));

  // Quand la forme passe à "carré", forcer openingH = openingW (côté le plus petit)
  useEffect(() => {
    if (shape === "square") {
      const side = Math.min(openingW, openingH, maxOpeningW, maxOpeningH);
      setOpeningW(side);
      setOpeningH(side);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);

  // Dimensions maximales de l'ouverture : format moins la bordure des deux côtés
  // On laisse au minimum 1 cm de bordure de chaque côté (2 cm au total)
  const maxOpeningW = Math.max(1, canvasFormat.width - borderWidth * 2);
  const maxOpeningH = Math.max(1, canvasFormat.height - borderWidth * 2);

  useEffect(() => {
    // Quand le format ou la bordure change, recalculer les dimensions de l'ouverture
    // en s'assurant qu'elles ne dépassent pas le nouveau maximum
    setOpeningW((prev) => Math.min(prev, Math.max(1, canvasFormat.width - borderWidth * 2)));
    setOpeningH((prev) => Math.min(prev, Math.max(1, canvasFormat.height - borderWidth * 2)));
  }, [canvasFormat.width, canvasFormat.height, borderWidth]);

  // --- Confirmation visuelle ---
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showConfirmation = useCallback((label: string) => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setLastApplied(label);
    confirmTimerRef.current = setTimeout(() => setLastApplied(null), 3000);
  }, []);

  useEffect(() => () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
  }, []);

  // --- Action 1 : Couleur ---
  const [colorTarget, setColorTarget] = useState<"interieur" | "exterieur">("exterieur");
  const [borderColor, setBorderColor] = useState("#ffffff");

  // --- Couleur de l'ouverture (section B) ---
  // Initialisée à blanc opaque pour éviter tout problème de transparence
  const [openingColor, setOpeningColor] = useState<string>("#ffffff");

  const handleApplyColor = () => {
    onAddPassePartout({
      shape,
      borderWidthCm: borderWidth,
      borderColor,
      patternSrc: null,
      patternOpacity: 100,
      formatWidth: canvasFormat.width,
      formatHeight: canvasFormat.height,
      openingWidthCm: openingW,
      openingHeightCm: openingH,
      colorTarget,
    });
    showConfirmation(fr ? "Couleur appliquée" : "Color applied");
  };

  // --- Action 2 : Motif ---
  const [patternTarget, setPatternTarget] = useState<"interieur" | "exterieur">("exterieur");
  const [patternUrl, setPatternUrl] = useState("");
  const [patternSrc, setPatternSrc] = useState<string | null>(null);
  const [patternOpacity, setPatternOpacity] = useState(80);
  const [isLoadingPattern, setIsLoadingPattern] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePatternFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPatternSrc(reader.result as string);
      toast.success(language === "fr" ? "Motif chargé" : "Pattern loaded");
    };
    reader.readAsDataURL(file);
  }, [language]);

  const handlePatternUrl = useCallback(async () => {
    if (!patternUrl.trim()) return;
    setIsLoadingPattern(true);
    try {
      const response = await fetch(patternUrl, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setPatternSrc(reader.result as string);
        toast.success(language === "fr" ? "Motif chargé depuis l'URL" : "Pattern loaded from URL");
      };
      reader.readAsDataURL(blob);
    } catch {
      toast.error(
        language === "fr"
          ? "Impossible de charger l'image. Vérifiez l'URL ou les droits CORS."
          : "Cannot load image. Check the URL or CORS permissions."
      );
    } finally {
      setIsLoadingPattern(false);
    }
  }, [patternUrl, language]);

  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const frLocal = language === 'fr';

  const handleApplyBgColor = () => {
    if (onAddBackground) {
      onAddBackground(null, 100, bgColor);
      showConfirmation(frLocal ? 'Couleur de fond appliquée' : 'Background color applied');
    }
  };

  const handleApplyPattern = () => {
    if (!patternSrc) {
      toast.error(language === "fr" ? "Chargez d'abord un motif" : "Load a pattern first");
      return;
    }
    if (onAddBackground) {
      // Nouveau handler : fond plein sans découpe, taille = format exact
      onAddBackground(patternSrc, patternOpacity, "transparent");
    } else {
      // Fallback ancien système
      onAddPassePartout({
        shape,
        borderWidthCm: borderWidth,
        borderColor: "transparent",
        patternSrc,
        patternOpacity,
        formatWidth: canvasFormat.width,
        formatHeight: canvasFormat.height,
        openingWidthCm: openingW,
        openingHeightCm: openingH,
        patternTarget,
      });
    }
    showConfirmation(fr ? "Fond appliqué" : "Background applied");
  };

  const fr = language === "fr";

  // Ratios pour le mini-croquis
  const formatRatio = canvasFormat.height > 0 ? canvasFormat.width / canvasFormat.height : 1;
  const openingRatio = openingH > 0 ? openingW / openingH : 1;
  const borderFraction = canvasFormat.width > 0 ? borderWidth / canvasFormat.width : 0.15;

  // Couleur active pour le croquis : couleur choisie si couleur, sinon gris motif
  return (
    <div className="space-y-3">


      {/* ======================================================
           BOÎTTE C - Motif / Papier peint (FOND - toujours en arrière-plan)
      ====================================================== */}
      <div className={`border rounded-lg overflow-hidden transition-all ${
        activeSection === "pattern"
          ? "border-pink-400 shadow-sm"
          : "border-gray-200"
      }`}>
        {/* En-tête cliquable */}
        <button
          className={`relative z-10 w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            activeSection === "pattern"
              ? "bg-pink-600 text-white"
              : "bg-gray-50 text-gray-700 hover:bg-pink-50"
          }`}
          onClick={() => toggleSection("pattern")}
        >
          <span className="text-xs font-bold">
            {fr ? "A - Fond / Papier peint" : "A - Background / Wallpaper"}
          </span>
          <span className="text-xs opacity-70">{activeSection === "pattern" ? "▲" : "▼"}</span>
        </button>

        {/* Contenu dépliable */}
        {activeSection === "pattern" && (
          <div className="p-3 space-y-3 bg-white">

            {/* Note : fond toujours en arrière-plan */}
            <p className="text-xs text-gray-500 italic">
              {fr
                ? "Le fond est placé automatiquement en arrière-plan du cadre, sous toutes les découpes. Sa taille correspond exactement au format choisi."
                : "The background is automatically placed behind all openings. Its size matches the chosen format exactly."}
            </p>

            {/* Indicateur + bouton supprimer si un fond est déjà appliqué */}
            {hasExistingBackground && (
              <div className="flex items-center justify-between gap-2 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
                <span className="text-xs text-pink-700 font-medium">
                  {fr ? "✓ Fond appliqué" : "✓ Background applied"}
                </span>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:text-red-800 bg-white border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                  onClick={() => {
                    onRemoveBackground?.();
                    showConfirmation(fr ? 'Fond supprimé' : 'Background removed');
                  }}
                >
                  <span className="flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                    {fr ? "Supprimer le fond" : "Remove background"}
                  </span>
                </button>
              </div>
            )}

            {/* Couleur unie de fond */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">
                {fr ? "1 - Couleur unie" : "1 - Solid color"}
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-9 h-9 rounded border border-gray-300 cursor-pointer p-0.5"
                    title={fr ? 'Choisir la couleur de fond' : 'Choose background color'}
                  />
                </div>
                <Button
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs h-9"
                  onClick={handleApplyBgColor}
                >
                  {fr ? "Appliquer la couleur" : "Apply color"}
                </Button>

              </div>
            </div>

            {/* Séparateur */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-200" />
              <span>{fr ? "ou" : "or"}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Motif / Image */}
            <Label className="text-xs font-semibold text-gray-700">
              {fr ? "2 - Motif / Image" : "2 - Pattern / Image"}
            </Label>

            <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3 h-3" />
              {fr ? "Importer (Finder / Explorateur)" : "Import (Finder / Explorer)"}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePatternFile(f); e.target.value = ""; }}
            />

            {patternSrc && (
              <div className="space-y-2">
                <div className="relative">
                  <img src={patternSrc} alt="Motif" className="w-full h-16 object-cover rounded border border-gray-200" />
                  <button onClick={() => setPatternSrc(null)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-red-500 hover:text-red-700">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">
                    {fr ? `Opacité : ${patternOpacity}%` : `Opacity: ${patternOpacity}%`}
                  </Label>
                  <Slider value={[patternOpacity]} onValueChange={([v]) => setPatternOpacity(v)} min={10} max={100} step={5} className="mt-1" />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs" onClick={handleApplyPattern} disabled={!patternSrc}>
                {fr ? "Appliquer le fond" : "Apply background"}
              </Button>

            </div>
          </div>
        )}
      </div>

      {/* ======================================================
           BOÎTTE A - Forme de l'ouverture
      ====================================================== */}
      <div className={`border rounded-lg overflow-hidden transition-all ${
        activeSection === "shape"
          ? "border-purple-400 shadow-sm"
          : "border-gray-200"
      }`}>
        {/* En-tête cliquable */}
        <button
          className={`relative z-10 w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            activeSection === "shape"
              ? "bg-purple-600 text-white"
              : "bg-gray-50 text-gray-700 hover:bg-purple-50"
          }`}
          onClick={() => toggleSection("shape")}>
          <span className="text-xs font-bold">
            {fr ? "B - Forme de l'ouverture" : "B - Opening shape"}
          </span>
          <span className="text-xs opacity-70">{activeSection === "shape" ? "▲" : "▼"}</span>
        </button>

        {/* Contenu dépliable */}
        {activeSection === "shape" && (
          <div className="p-3 space-y-3 bg-white">

            {/* Sélecteur de couleur - toujours actif */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-600 flex-1">
                {fr ? "Couleur de l'ouverture" : "Opening color"}
              </Label>
              <input
                type="color"
                value={openingColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setOpeningColor(newColor);
                  // Mettre à jour la couleur de la forme sélectionnée en temps réel
                  const targetId = selectedCanvasElementId || activeOpeningId;
                  if (targetId && onApplyColorToOpenings) {
                    onApplyColorToOpenings(newColor, [targetId]);
                  }
                }}
                className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                title={fr ? "Choisir la couleur de l'ouverture" : "Choose opening color"}
              />
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                title={fr ? "Supprimer la couleur" : "Remove color"}
                onClick={() => {
                  setOpeningColor('#ffffff');
                  const targetId = selectedCanvasElementId || activeOpeningId;
                  if (targetId && onApplyColorToOpenings) {
                    onApplyColorToOpenings('transparent', [targetId]);
                  }
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Options avancées : branches étoile et profondeur cœur */}
            {shape === 'star' && (
              <div className="space-y-1 bg-purple-50 rounded-lg p-2">
                <Label className="text-xs text-purple-700 font-semibold">
                  {fr ? `Branches : ${starBranches}` : `Branches: ${starBranches}`}
                </Label>
                <Slider value={[starBranches]} onValueChange={([v]) => setStarBranches(v)} min={3} max={8} step={1} className="mt-1" />
              </div>
            )}
            {shape === 'heart' && (
              <div className="space-y-1 bg-purple-50 rounded-lg p-2">
                <Label className="text-xs text-purple-700 font-semibold">
                  {fr ? `Profondeur de l'encoche : ${heartDepth}%` : `Notch depth: ${heartDepth}%`}
                </Label>
                <Slider value={[heartDepth]} onValueChange={([v]) => setHeartDepth(v)} min={0} max={100} step={5} className="mt-1" />
              </div>
            )}

            {/* Grille de formes : toujours cliquables */}
            <div className="grid grid-cols-3 gap-1.5">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    s.id === 'line' && isLineDrawMode
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-400'
                  }`}
                  onClick={() => {
                    setShape(s.id);
                    if (s.id === 'line') {
                      // La ligne utilise un mode tracé libre (cliquer-glisser sur le canvas)
                      onToggleLineDrawMode?.();
                    } else if (onAddOpening) {
                      // Garantir une couleur opaque, jamais transparent
                      const safeColor = openingColor && openingColor !== 'transparent' ? openingColor : '#ffffff';
                      onAddOpening(
                        s.id as 'rect' | 'square' | 'round' | 'oval' | 'arch' | 'heart' | 'star' | 'diamond' | 'hexagon' | 'line',
                        safeColor,
                        { starBranches, heartDepth }
                      );
                    }
                  }}
                  title={fr ? `Placer une découpe ${s.labelFr}` : `Place a ${s.labelEn} opening`}
                >
                  <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    {s.id === 'rect'   && <rect x="4" y="8" width="24" height="16" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />}
                    {s.id === 'square' && <rect x="8" y="8" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />}
                    {s.id === 'round'  && <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" fill="none" />}
                    {s.id === 'oval'   && <ellipse cx="16" cy="16" rx="12" ry="8" stroke="currentColor" strokeWidth="2" fill="none" />}
                    {s.id === 'arch'   && <path d="M6 26 Q6 6 16 6 Q26 6 26 26 Z" stroke="currentColor" strokeWidth="2" fill="none" />}
                    {s.id === 'heart'  && <path d="M16 24 C16 24 6 17 6 11 C6 7.7 8.7 6 11.5 6 C13.5 6 15 7 16 8.5 C17 7 18.5 6 20.5 6 C23.3 6 26 7.7 26 11 C26 17 16 24 16 24 Z" stroke="currentColor" strokeWidth="2" fill="none" />}
                    {s.id === 'star'   && (() => {
                      const pts: string[] = [];
                      for (let i = 0; i < 10; i++) {
                        const a = (i * Math.PI) / 5 - Math.PI / 2;
                        const r = i % 2 === 0 ? 12 : 5;
                        pts.push(`${i === 0 ? 'M' : 'L'} ${16 + r * Math.cos(a)} ${16 + r * Math.sin(a)}`);
                      }
                      return <path d={pts.join(' ') + ' Z'} stroke="currentColor" strokeWidth="2" fill="none" />;
                    })()}
                    {s.id === 'diamond' && <path d="M16 4 L28 16 L16 28 L4 16 Z" stroke="currentColor" strokeWidth="2" fill="none" />}
                    {s.id === 'hexagon' && (() => {
                      const hpts: string[] = [];
                      for (let i = 0; i < 6; i++) {
                        const a = (i * Math.PI) / 3 - Math.PI / 6;
                        hpts.push(`${i === 0 ? 'M' : 'L'} ${16 + 12 * Math.cos(a)} ${16 + 12 * Math.sin(a)}`);
                      }
                      return <path d={hpts.join(' ') + ' Z'} stroke="currentColor" strokeWidth="2" fill="none" />;
                    })()}
                    {s.id === 'line' && <line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
                  </svg>
                  <span>{fr ? s.labelFr : s.labelEn}</span>
                </button>
              ))}
            </div>
            {/* ── Contrôles outil Ligne : couleur, épaisseur, indicateur segments ────────── */}
            {isLineDrawMode && (
              <div className="mt-3 space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                {/* Indicateur du nombre de segments dans la chaîne */}
                {lineChainCount > 0 && (
                  <div className="flex items-center justify-between text-xs text-orange-700 font-medium">
                    <span className="flex items-center gap-1">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                        <polyline points="2,8 6,4 10,12 14,8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {fr ? 'Chaîne en cours' : 'Chain in progress'}
                    </span>
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {lineChainCount} {fr ? (lineChainCount > 1 ? 'segments' : 'segment') : (lineChainCount > 1 ? 'segments' : 'segment')}
                    </span>
                  </div>
                )}
                {/* Sélecteur de couleur */}
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-orange-700 font-medium">{fr ? 'Couleur' : 'Color'}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={lineColor}
                      onChange={e => onLineColorChange?.(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-orange-300 p-0.5 bg-white"
                      title={fr ? 'Couleur de la ligne' : 'Line color'}
                    />
                    <span className="text-xs text-orange-600 font-mono">{lineColor}</span>
                  </div>
                </div>
                {/* Slider d'épaisseur */}
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-orange-700 font-medium">{fr ? 'Épaisseur' : 'Width'}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.5}
                      max={5}
                      step={0.5}
                      value={lineStrokeWidth}
                      onChange={e => onLineStrokeWidthChange?.(Number(e.target.value))}
                      className="w-24 accent-orange-500"
                      title={fr ? `Épaisseur : ${lineStrokeWidth} px` : `Width: ${lineStrokeWidth} px`}
                    />
                    <span className="text-xs text-orange-600 font-mono w-8 text-right">{lineStrokeWidth} px</span>
                  </div>
                </div>
                <p className="text-xs text-orange-500 italic">
                  {fr
                    ? 'Cliquer-glisser sur le canvas pour tracer. Échap pour annuler.'
                    : 'Click-drag on canvas to draw. Esc to cancel.'}
                </p>
              </div>
            )}
            {/* Bouton "Arrondir la ligne" supprimé — doublon avec le menu flottant sur le canvas */}

          </div>
        )}
      </div>
      {/* ========================================================
           BOÎTTE D - Modèles pré-dessinés
      ====================================================== */}
      <div className={`border rounded-lg overflow-hidden transition-all ${
        activeSection === "template"
          ? "border-indigo-400 shadow-sm"
          : "border-gray-200"
      }`}>
        {/* En-tête cliquable */}
        <button
          className={`relative z-10 w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            activeSection === "template"
              ? "bg-indigo-600 text-white"
              : "bg-gray-50 text-gray-700 hover:bg-indigo-50"
          }`}
          onClick={() => setActiveSection(prev => prev === "template" ? null : "template")}
        >
          <span className="text-xs font-bold">
            {fr ? "D - Modèles pré-dessinés" : "D - Pre-built templates"}
          </span>
          <span className="text-xs opacity-70">{activeSection === "template" ? "▲" : "▼"}</span>
        </button>

        {/* Contenu dépliable */}
        {activeSection === "template" && (
          <div className="p-3 space-y-2 bg-white">
            <p className="text-xs text-gray-500 italic">
              {fr
                ? "Cliquez sur un modèle pour ajouter les découpes sur le canvas (les formes existantes sont conservées)."
                : "Click a template to add openings to the canvas (existing shapes are kept)."}
            </p>

            {/* Bouton sauvegarder le montage actuel comme modèle */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-xs text-indigo-600 font-medium"
              onClick={() => {
                const shapes = onGetCurrentShapes?.();
                if (!shapes || shapes.length === 0) {
                  toast.error(fr ? "Aucune forme sur le canvas à sauvegarder" : "No shapes on canvas to save");
                  return;
                }
                const label = prompt(fr ? "Nom du modèle :" : "Template name:", fr ? `Mon modèle (${shapes.length} formes)` : `My template (${shapes.length} shapes)`);
                if (!label) return;
                const newTemplate = {
                  id: `custom-${Date.now()}`,
                  label,
                  openings: shapes,
                };
                saveCustomTemplates([...customTemplates, newTemplate]);
                toast.success(fr ? "Modèle sauvegardé !" : "Template saved!");
              }}
            >
              + {fr ? "Sauvegarder le montage actuel" : "Save current layout"}
            </button>

            {([
              {
                id: "single", labelFr: "1 photo", labelEn: "1 photo",
                openings: [{ shape: "rect" as const, xFrac: 0.1, yFrac: 0.1, wFrac: 0.8, hFrac: 0.8 }],
              },
              {
                id: "duo-h", labelFr: "2 photos côte à côte", labelEn: "2 photos side by side",
                openings: [
                  { shape: "rect" as const, xFrac: 0.05, yFrac: 0.1, wFrac: 0.42, hFrac: 0.8 },
                  { shape: "rect" as const, xFrac: 0.53, yFrac: 0.1, wFrac: 0.42, hFrac: 0.8 },
                ],
              },
              {
                id: "duo-v", labelFr: "2 photos superposées", labelEn: "2 photos stacked",
                openings: [
                  { shape: "rect" as const, xFrac: 0.1, yFrac: 0.05, wFrac: 0.8, hFrac: 0.42 },
                  { shape: "rect" as const, xFrac: 0.1, yFrac: 0.53, wFrac: 0.8, hFrac: 0.42 },
                ],
              },
              {
                id: "trio", labelFr: "3 photos (triptyque)", labelEn: "3 photos (triptych)",
                openings: [
                  { shape: "rect" as const, xFrac: 0.05, yFrac: 0.05, wFrac: 0.9, hFrac: 0.5 },
                  { shape: "rect" as const, xFrac: 0.05, yFrac: 0.6, wFrac: 0.42, hFrac: 0.35 },
                  { shape: "rect" as const, xFrac: 0.53, yFrac: 0.6, wFrac: 0.42, hFrac: 0.35 },
                ],
              },
              {
                id: "quad", labelFr: "4 photos (grille 2×2)", labelEn: "4 photos (2×2 grid)",
                openings: [
                  { shape: "rect" as const, xFrac: 0.05, yFrac: 0.05, wFrac: 0.42, hFrac: 0.42 },
                  { shape: "rect" as const, xFrac: 0.53, yFrac: 0.05, wFrac: 0.42, hFrac: 0.42 },
                  { shape: "rect" as const, xFrac: 0.05, yFrac: 0.53, wFrac: 0.42, hFrac: 0.42 },
                  { shape: "rect" as const, xFrac: 0.53, yFrac: 0.53, wFrac: 0.42, hFrac: 0.42 },
                ],
              },
              {
                id: "duo-round", labelFr: "Diptyque rond", labelEn: "Round diptych",
                openings: [
                  { shape: "round" as const, xFrac: 0.05, yFrac: 0.2, wFrac: 0.4, hFrac: 0.6 },
                  { shape: "round" as const, xFrac: 0.55, yFrac: 0.2, wFrac: 0.4, hFrac: 0.6 },
                ],
              },
            ] as const).filter(tpl => !hiddenBuiltinIds.includes(tpl.id)).map((tpl) => (
              <div key={tpl.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  className="flex-1 flex items-center gap-3 px-3 py-2 rounded border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
                  onClick={() => {
                    if (onApplyTemplate) {
                      onApplyTemplate(tpl.openings.map(o => ({ ...o })));
                    }
                  }}
                >
                  <svg width="40" height="30" viewBox="0 0 100 75" className="flex-shrink-0 border border-gray-200 rounded bg-gray-50">
                    {tpl.openings.map((op, i) => {
                      const x = op.xFrac * 100;
                      const y = op.yFrac * 75;
                      const w = op.wFrac * 100;
                      const h = op.hFrac * 75;
                      if (op.shape === 'round') {
                        return <ellipse key={i} cx={x + w/2} cy={y + h/2} rx={w/2} ry={h/2} fill="#6366f1" opacity={0.7} />;
                      }
                      return <rect key={i} x={x} y={y} width={w} height={h} fill="#6366f1" opacity={0.7} rx={2} />;
                    })}
                  </svg>
                  <span className="text-xs text-gray-700">{fr ? tpl.labelFr : tpl.labelEn}</span>
                </button>
                <button
                  type="button"
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title={fr ? "Masquer ce modèle" : "Hide this template"}
                  onClick={() => hideBuiltinTemplate(tpl.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Modèles personnalisés */}
            {customTemplates.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span>{fr ? "Mes modèles" : "My templates"}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                {customTemplates.map((tpl) => (
                  <div key={tpl.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      className="flex-1 flex items-center gap-3 px-3 py-2 rounded border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
                      onClick={() => {
                        if (onApplyTemplate) {
                          onApplyTemplate(tpl.openings.map(o => ({ ...o })) as any);
                        }
                      }}
                    >
                      <svg width="40" height="30" viewBox="0 0 100 75" className="flex-shrink-0 border border-gray-200 rounded bg-gray-50">
                        {tpl.openings.map((op, i) => {
                          const x = op.xFrac * 100, y = op.yFrac * 75, w = op.wFrac * 100, h = op.hFrac * 75;
                          if (op.shape === 'round') return <ellipse key={i} cx={x + w/2} cy={y + h/2} rx={w/2} ry={h/2} fill="#6366f1" opacity={0.7} />;
                          if (op.shape === 'oval') return <ellipse key={i} cx={x + w/2} cy={y + h/2} rx={w/2} ry={h/2} fill="#6366f1" opacity={0.7} />;
                          return <rect key={i} x={x} y={y} width={w} height={h} fill="#6366f1" opacity={0.7} rx={2} />;
                        })}
                      </svg>
                      <span className="text-xs text-gray-700">{tpl.label}</span>
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title={fr ? "Supprimer ce modèle" : "Delete this template"}
                      onClick={() => saveCustomTemplates(customTemplates.filter(t => t.id !== tpl.id))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Rubrique Filets : traits fins concentriques autour des ouvertures     */}
      {/* ------------------------------------------------------------------ */}
      <div className={`border rounded-lg overflow-hidden transition-all ${
        filetsOpen ? "border-amber-400 shadow-sm" : "border-gray-200"
      }`}>
        <button
          type="button"
          className={`relative z-10 w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            filetsOpen
              ? "bg-amber-600 text-white"
              : "bg-gray-50 text-gray-700 hover:bg-amber-50"
          }`}
          onClick={() => setFiletsOpen(v => !v)}
        >
          <span className="text-xs font-bold">
            {fr ? `E - Filets${(filets?.length ?? 0) > 0 ? ` (${filets!.length})` : ''}` : `E - Rules${(filets?.length ?? 0) > 0 ? ` (${filets!.length})` : ''}`}
          </span>
          <span className="text-xs opacity-70">{filetsOpen ? "▲" : "▼"}</span>
        </button>

        {filetsOpen && (
          <div className="p-3 space-y-2 bg-white">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-400 italic">
                {fr ? 'Traits fins autour des découpes' : 'Fine lines around openings'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if ((filets?.length ?? 0) >= 3) {
                    toast.error(fr ? 'Maximum 3 filets' : 'Maximum 3 rules');
                    return;
                  }
                  const newFilet: FiletConfig = {
                    id: `filet-${Date.now()}`,
                    offsetMm: (filets?.length ?? 0) === 0 ? 2 : Math.min(5, ((filets?.[filets.length - 1]?.offsetMm ?? 2) + 1.5)),
                    thicknessMm: 0.5,
                    color: '#1a1a1a',
                  };
                  onFiletsChange?.([...(filets ?? []), newFilet]);
                }}
                className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:text-amber-800 border border-amber-200 rounded px-2 py-0.5 bg-amber-50 hover:bg-amber-100 transition-colors"
                title={fr ? 'Ajouter un filet' : 'Add a rule'}
              >
                <Plus className="w-3 h-3" />
                {fr ? 'Ajouter' : 'Add'}
              </button>
            </div>

            {(!filets || filets.length === 0) && (
              <p className="text-[10px] text-gray-400 italic text-center py-1">
                {fr ? 'Aucun filet — cliquez sur Ajouter' : 'No rules — click Add'}
              </p>
            )}

            {(filets ?? []).map((filet, idx) => (
              <div key={filet.id} className="bg-gray-50 rounded border border-gray-200 p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-600">
                    {fr ? `Filet ${idx + 1}` : `Rule ${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onFiletsChange?.((filets ?? []).filter(f => f.id !== filet.id))}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title={fr ? 'Supprimer ce filet' : 'Remove this rule'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="mb-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] text-gray-500">{fr ? 'Décalage' : 'Offset'}</label>
                    <span className="text-[10px] font-mono text-amber-600">{filet.offsetMm.toFixed(1)} mm</span>
                  </div>
                  <Slider
                    min={0} max={5} step={0.1}
                    value={[filet.offsetMm]}
                    onValueChange={([v]) => onFiletsChange?.(
                      (filets ?? []).map(f => f.id === filet.id ? { ...f, offsetMm: v } : f)
                    )}
                    className="h-1.5"
                  />
                </div>

                <div className="mb-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] text-gray-500">{fr ? 'Épaisseur' : 'Thickness'}</label>
                    <span className="text-[10px] font-mono text-amber-600">{filet.thicknessMm.toFixed(1)} mm</span>
                  </div>
                  <Slider
                    min={0.3} max={2} step={0.1}
                    value={[filet.thicknessMm]}
                    onValueChange={([v]) => onFiletsChange?.(
                      (filets ?? []).map(f => f.id === filet.id ? { ...f, thicknessMm: v } : f)
                    )}
                    className="h-1.5"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500">{fr ? 'Couleur' : 'Color'}</label>
                  <input
                    type="color"
                    value={filet.color}
                    onChange={e => onFiletsChange?.(
                      (filets ?? []).map(f => f.id === filet.id ? { ...f, color: e.target.value } : f)
                    )}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
                    title={fr ? 'Choisir la couleur du filet' : 'Choose rule color'}
                  />
                  <span className="text-[10px] font-mono text-gray-400">{filet.color}</span>
                </div>
              </div>
            ))}

            {/* Séparateur */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              {/* Toggle : Afficher cadre extérieur */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-700">
                    {fr ? "Cadre extérieur" : "Outer frame"}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {fr ? "(limite du format)" : "(format boundary)"}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!showFormatBorder}
                  onClick={() => onShowFormatBorderChange?.(!showFormatBorder)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showFormatBorder ? "bg-amber-500" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    showFormatBorder ? "translate-x-4.5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              {/* Bouton SVG de découpe */}
              <div className="mt-2">
                {(() => {
                  const hasOpenings = !!(canvasOpenings && canvasOpenings.length > 0);
                  const openingCount = canvasOpenings?.length ?? 0;
                  const labelFr = hasOpenings
                    ? `Télécharger SVG découpe (${openingCount} ouverture${openingCount > 1 ? "s" : ""})`
                    : "Télécharger SVG découpe";
                  const labelEn = hasOpenings
                    ? `Download cut SVG (${openingCount} opening${openingCount > 1 ? "s" : ""})`
                    : "Download cut SVG";
                  const titleFr = hasOpenings
                    ? `Télécharger le SVG de découpe (${openingCount} ouverture${openingCount > 1 ? "s" : ""}${showFormatBorder ? " + cadre extérieur" : ""})`
                    : "Ajoutez des ouvertures pour activer l’export SVG";
                  const titleEn = hasOpenings
                    ? `Download cut SVG (${openingCount} opening${openingCount > 1 ? "s" : ""}${showFormatBorder ? " + outer frame" : ""})`
                    : "Add openings to enable SVG export";
                  return (
                    <button
                      type="button"
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded border text-xs font-semibold transition-colors ${
                        hasOpenings
                          ? "border-amber-400 bg-amber-600 text-white hover:bg-amber-700"
                          : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={!hasOpenings}
                      onClick={() => {
                        if (hasOpenings && onExportLaserSVG) onExportLaserSVG();
                      }}
                      title={fr ? titleFr : titleEn}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>
                        {fr ? labelFr : labelEn}
                        {showFormatBorder
                          ? <span className="ml-1 font-bold text-amber-200">{fr ? "+ cadre" : "+ frame"}</span>
                          : <span className="ml-1 line-through text-amber-300 opacity-60">{fr ? "+ cadre" : "+ frame"}</span>
                        }
                      </span>
                    </button>
                  );
                })()}
                <p className="text-[10px] text-gray-400 text-center mt-1">{fr ? "Compatible LightBurn, RDWorks, LaserGRBL" : "Compatible with LightBurn, RDWorks, LaserGRBL"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section F - Format                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className={`border rounded-lg overflow-hidden transition-all ${
        formatOpen ? "border-slate-400 shadow-sm" : "border-gray-200"
      }`}>
        <button
          type="button"
          className={`relative z-10 w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            formatOpen
              ? "bg-slate-600 text-white"
              : "bg-gray-50 text-gray-700 hover:bg-slate-50"
          }`}
          onClick={() => setFormatOpen(v => !v)}
        >
          <span className="text-xs font-bold">
            {fr ? `F - Format (${canvasFormat.label})` : `F - Format (${canvasFormat.label})`}
          </span>
          <span className="text-xs opacity-70">{formatOpen ? "▲" : "▼"}</span>
        </button>

        {formatOpen && (
          <div className="p-3 space-y-2 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{fr ? "Format actif" : "Active format"}</span>
              <span className="text-xs font-semibold text-slate-700">{canvasFormat.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{fr ? "Dimensions" : "Dimensions"}</span>
              <span className="text-xs font-mono text-slate-600">{canvasFormat.width} × {canvasFormat.height} cm</span>
            </div>
            <p className="text-[10px] text-gray-400 italic">
              {fr
                ? "Pour changer le format ou l'orientation, utilisez les contrôles en haut de la barre d'outils."
                : "To change the format or orientation, use the controls at the top of the toolbar."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-section : Cadres & Bordures
// ---------------------------------------------------------------------------

function CadresBorduresSection({
  onAddToCanvas,
}: Pick<AssemblagePanelProps, "onAddToCanvas">) {
  const { language } = useLanguage();
  const [userFrames, setUserFrames] = useState<BibliothequeItemDB[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [urlValue, setUrlValue] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  useEffect(() => {
    db.bibliotheque_items
      .where("type")
      .equals("cadre")
      .toArray()
      .then(setUserFrames);
  }, []);

  const importImageAsFrame = useCallback(
    async (dataUrl: string, name: string) => {
      const thumb = await new Promise<string>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const max = 150;
          const r = Math.min(max / img.width, max / img.height, 1);
          c.width = img.width * r;
          c.height = img.height * r;
          c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });

      const itemId = `cadre_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const item: BibliothequeItemDB = {
        id: itemId,
        category: 'cadres',
        type: "cadre",
        name,
        url: thumb,
        thumbnail: thumb,
        fullImage: dataUrl,
        addedAt: Date.now(),
        createdAt: Date.now(),
      };
      await db.bibliotheque_items.add(item);
      setUserFrames((prev) => [...prev, item]);
      toast.success(language === "fr" ? `Cadre "${name}" ajouté` : `Frame "${name}" added`);
    },
    [language]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        await importImageAsFrame(dataUrl, file.name.replace(/\.[^/.]+$/, ""));
      }
    },
    [importImageAsFrame]
  );

  const handleUrlImport = useCallback(async () => {
    if (!urlValue.trim()) return;
    setIsLoadingUrl(true);
    try {
      const res = await fetch(urlValue, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const name = urlValue.split("/").pop()?.replace(/\?.*$/, "") || "cadre";
      await importImageAsFrame(dataUrl, name);
      setUrlValue("");
    } catch {
      toast.error(
        language === "fr"
          ? "Impossible de charger l'image. Vérifiez l'URL."
          : "Cannot load image. Check the URL."
      );
    } finally {
      setIsLoadingUrl(false);
    }
  }, [urlValue, importImageAsFrame, language]);

  const handleDelete = async (item: BibliothequeItemDB, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(language === "fr" ? `Supprimer "${item.name}" ?` : `Delete "${item.name}"?`)) return;
    await db.bibliotheque_items.delete(item.id!);
    setUserFrames((prev) => prev.filter((f) => f.id !== item.id));
    toast.success(language === "fr" ? "Cadre supprimé" : "Frame deleted");
  };

  return (
    <div className="space-y-3">
      {/* Import depuis le bureau */}
      <div
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
          isDragging ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-300"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounterRef.current++;
          if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCounterRef.current--;
          if (dragCounterRef.current === 0) setIsDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          dragCounterRef.current = 0;
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
        <p className="text-xs text-gray-500">
          {language === "fr"
            ? "Glissez un cadre ici ou cliquez pour importer"
            : "Drop a frame here or click to import"}
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Import depuis une URL */}
      <div className="flex gap-1">
        <Input
          ref={urlInputRef}
          placeholder={language === "fr" ? "URL d'un cadre..." : "Frame URL..."}
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          className="text-xs h-8"
          onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
        />
        <Button
          variant="outline"
          size="sm"
          className="px-2 h-8"
          onClick={handleUrlImport}
          disabled={isLoadingUrl || !urlValue.trim()}
        >
          <Link className="w-3 h-3" />
        </Button>
      </div>

      {/* Grille des cadres importés */}
      {userFrames.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          {language === "fr" ? "Aucun cadre importé" : "No frames imported yet"}
        </p>
      ) : (
        <ScrollArea className="h-[200px]">
          <div className="grid grid-cols-3 gap-2">
            {userFrames.map((frame) => (
              <div
                key={frame.id}
                className="relative aspect-square bg-gray-50 rounded border border-gray-200 cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all overflow-hidden group"
                onClick={() => onAddToCanvas(frame.fullImage ?? frame.url ?? '', frame.name)}
                title={frame.name}
              >
                <img
                  src={frame.thumbnail || frame.fullImage}
                  alt={frame.name}
                  className="w-full h-full object-contain p-1"
                />
                <button
                  onClick={(e) => handleDelete(frame, e)}
                  className="absolute top-0.5 right-0.5 bg-white rounded-full p-0.5 shadow text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-section : Cliparts & Stickers
// ---------------------------------------------------------------------------

function StickerPlannerSection({
  onAddToCanvas,
  canvasImageElements,
  onExportStickerContoursSVG,
  canvasFormat,
  onApplyBinPackLayout,
  onDuplicateElement,
  onStickerOverlayChange,
  stickerCropMarks = false,
  onStickerCropMarksChange,
}: Pick<AssemblagePanelProps, "onAddToCanvas" | "canvasImageElements" | "onExportStickerContoursSVG" | "canvasFormat" | "onApplyBinPackLayout" | "onDuplicateElement" | "onStickerOverlayChange" | "stickerCropMarks" | "onStickerCropMarksChange">) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  /** Photos de l'album "Modèles Stickers" */
  const [stickerAlbumPhotos, setStickerAlbumPhotos] = useState<PhotoFrame[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Étapes validées
  const [stepBValidated, setStepBValidated] = useState(false);
  const [stepDValidated, setStepDValidated] = useState(false);
  // Étape b : offset contour
  const [offsetMm, setOffsetMm] = useState<number>(3);
  // Lissage gaussien : nombre de passes (1 = contour brut, 10 = très lissé)
  const [gaussPasses, setGaussPasses] = useState<number>(3);
  // Étape c : crop marks
  // showCropMarks est une prop contrôlée depuis le parent (stickerCropMarks).
  // Cela évite tout couplage avec le toggle b et tout problème de timing React.
  const showCropMarks = stickerCropMarks;
  const setShowCropMarks = (v: boolean) => onStickerCropMarksChange?.(v);

  // Étape d : nombre de stickers
  const [stickerCount, setStickerCount] = useState<number>(8);
  // Modèle sélectionné (un seul à la fois)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  // Compatibilité avec les fonctions existantes (bin-packing utilise selectedStickerIds)
  const selectedStickerIds = useMemo(
    () => (selectedModelId ? new Set([selectedModelId]) : new Set<string>()),
    [selectedModelId]
  );
  const alphaThreshold = 30; // valeur fixe, simplifiée
  const useRealContour = true; // toujours actif pour les PNG détourés

  /**
   * Calcule les rectangles offset (en mm) pour l'aperçu temps réel.
   * Coordonnées normalisées dans l'espace du format (0..formatW mm, 0..formatH mm).
   */
  const previewOffsetRects = useMemo(() => {
    if (!canvasImageElements || selectedStickerIds.size === 0) return [];
    const offsetCm = offsetMm / 10;
    return canvasImageElements
      .filter(el => selectedStickerIds.has(el.id))
      .map(el => ({
        id: el.id,
        name: el.name,
        cx: (el.x + el.width / 2) * 10,
        cy: (el.y + el.height / 2) * 10,
        w: (el.width + 2 * offsetCm) * 10,
        h: (el.height + 2 * offsetCm) * 10,
        rot: el.rotation || 0,
        rr: Math.min(offsetMm, (el.width + 2 * offsetCm) * 10 * 0.4, (el.height + 2 * offsetCm) * 10 * 0.4),
        // Bbox originale (sans offset) pour comparaison visuelle
        ox: el.x * 10,
        oy: el.y * 10,
        ow: el.width * 10,
        oh: el.height * 10,
      }));
  }, [canvasImageElements, selectedStickerIds, offsetMm]);

  /**
   * Calcule la mise en page bin-packing (Shelf-First) des éléments sélectionnés
   * avec leur offset appliqué, sur le format courant.
   * Retourne les nouvelles positions (en cm) pour chaque élément.
   */
  const binPackResult = useMemo(() => {
    if (!canvasImageElements || !canvasFormat || selectedStickerIds.size === 0) return null;
    const offsetCm = offsetMm / 10;
    const GAP_CM = offsetCm; // espacement = offset pour que les contours ne se touchent pas
    const fW = canvasFormat.width;
    const fH = canvasFormat.height;

    // Éléments à placer (triés par hauteur décroissante pour Shelf-First)
    const items = canvasImageElements
      .filter(el => selectedStickerIds.has(el.id))
      .map(el => ({
        id: el.id,
        name: el.name,
        w: el.width + 2 * offsetCm + GAP_CM, // largeur avec offset + gap
        h: el.height + 2 * offsetCm + GAP_CM,
        origW: el.width,
        origH: el.height,
      }))
      .sort((a, b) => b.h - a.h);

    // Algorithme Shelf-First (Next Fit Decreasing Height)
    const placements: Array<{ id: string; name?: string; x: number; y: number; w: number; h: number }> = [];
    let shelfX = GAP_CM;
    let shelfY = GAP_CM;
    let shelfH = 0;

    for (const item of items) {
      if (item.w > fW || item.h > fH) continue; // trop grand pour le format
      if (shelfX + item.w > fW) {
        // Nouvelle rangée
        shelfY += shelfH + GAP_CM;
        shelfX = GAP_CM;
        shelfH = 0;
      }
      if (shelfY + item.h > fH) break; // plus de place
      placements.push({
        id: item.id,
        name: item.name,
        x: shelfX + offsetCm,
        y: shelfY + offsetCm,
        w: item.origW,
        h: item.origH,
      });
      shelfX += item.w;
      shelfH = Math.max(shelfH, item.h);
    }
    return placements;
  }, [canvasImageElements, canvasFormat, selectedStickerIds, offsetMm]);

  /** Charge les photos de l'album "Modèles Stickers" depuis IndexedDB. */
  useEffect(() => {
    db.albums.get(MODELES_STICKERS_ALBUM_ID).then((albumData) => {
      if (albumData?.frames) {
        setStickerAlbumPhotos(albumData.frames.filter((f) => f.photoUrl));
      }
    });
  }, []);

  /**
   * Importe une image (data-URL) dans l'album "Modèles Stickers" (IndexedDB).
   * Génère une miniature 150 px et ajoute la frame dans l'album.
   */
  const importImageToStickerAlbum = useCallback(
    async (dataUrl: string, name: string) => {
      const thumbnailUrl = await new Promise<string>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const max = 150;
          const r = Math.min(max / img.width, max / img.height, 1);
          c.width = img.width * r;
          c.height = img.height * r;
          c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
      const newFrame: PhotoFrame = {
        id: Date.now(),
        title: name,
        isSelected: false,
        format: "sticker",
        photoUrl: dataUrl,
        thumbnailUrl,
        mediaType: "photo",
        createdAt: Date.now(),
      };
      const albumData = (await db.albums.get(MODELES_STICKERS_ALBUM_ID)) ?? {
        id: MODELES_STICKERS_ALBUM_ID,
        frames: [],
      };
      albumData.frames = [...(albumData.frames ?? []), newFrame];
      await db.albums.put(albumData);
      setStickerAlbumPhotos((prev) => [...prev, newFrame]);
      toast.success(
        language === "fr"
          ? `"${name}" ajouté aux Modèles Stickers`
          : `"${name}" added to Sticker Models`
      );
    },
    [language]
  );

  /** Lit les fichiers sélectionnés/déposés et les importe dans l'album Modèles Stickers. */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        await importImageToStickerAlbum(dataUrl, file.name.replace(/\.[^/.]+$/, ""));
      }
    },
    [importImageToStickerAlbum]
  );

  /** Supprime une photo de l'album Modèles Stickers. */
  const handleDeleteStickerPhoto = async (frame: PhotoFrame, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        language === "fr" ? `Supprimer "${frame.title}" ?` : `Delete "${frame.title}"?`
      )
    )
      return;
    const albumData = await db.albums.get(MODELES_STICKERS_ALBUM_ID);
    if (albumData) {
      albumData.frames = (albumData.frames ?? []).filter((f) => f.id !== frame.id);
      await db.albums.put(albumData);
    }
    setStickerAlbumPhotos((prev) => prev.filter((f) => f.id !== frame.id));
  };

  const filteredStickerPhotos = stickerAlbumPhotos.filter((f) =>
    !searchQuery || (f.title ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Modèle actif sur le canvas (premier élément si aucun sélectionné manuellement)
  const activeCanvasModel = canvasImageElements?.[0] ?? null;

  // Stabiliser l'ID du modèle actif pour éviter les boucles infinies.
  // canvasImageElements est recréé à chaque rendu du parent (nouvelle référence d'objet),
  // ce qui rendrait activeCanvasModel instable comme dépendance de useEffect.
  // On n'utilise que l'ID (primitif stable) comme dépendance.
  const activeCanvasModelId = activeCanvasModel?.id ?? null;

  // Pas de useEffect pour synchroniser l'overlay : on appelle onStickerOverlayChange
  // directement dans chaque handler (toggle b, toggle c, slider offset) avec les valeurs
  // courantes lues depuis le state React au moment du clic.
  // Cela évite tout problème de timing entre useEffects et garantit que showCropMarks
  // est toujours la valeur réelle au moment de l'appel.
  //
  // Helper pour propager l'overlay contour (toggle b + slider offset) au parent.
  // showCropMarks est géré séparément via onStickerCropMarksChange (toggle c).
  // Cela garantit zéro couplage entre toggle b et toggle c.
  const syncOverlay = useCallback((
    overrides: Partial<{ elementId: string | null; offsetMm: number; stepBValidated: boolean; gaussPasses: number }> = {}
  ) => {
    if (!onStickerOverlayChange) return;
    const eid = overrides.elementId !== undefined ? overrides.elementId : activeCanvasModelId;
    const off = overrides.offsetMm !== undefined ? overrides.offsetMm : offsetMm;
    const sbv = overrides.stepBValidated !== undefined ? overrides.stepBValidated : stepBValidated;
    const gp  = overrides.gaussPasses !== undefined ? overrides.gaussPasses : gaussPasses;
    if (eid && sbv) {
      // showCropMarks est passé pour compatibilité du type, mais le parent l'ignore.
      onStickerOverlayChange({ elementId: eid, offsetMm: off, showCropMarks: false, gaussPasses: gp });
    } else {
      onStickerOverlayChange(null);
    }
  }, [onStickerOverlayChange, activeCanvasModelId, offsetMm, stepBValidated, gaussPasses]);

  // Calcul du nombre max de stickers pouvant tenir sur le format
  const maxFit = useMemo(() => {
    if (!activeCanvasModel || !canvasFormat) return 0;
    const offsetCm = offsetMm / 10;
    const GAP = 0.1;
    const itemW = activeCanvasModel.width + 2 * offsetCm + GAP;
    const itemH = activeCanvasModel.height + 2 * offsetCm + GAP;
    if (itemW <= 0 || itemH <= 0) return 0;
    const cols = Math.floor(canvasFormat.width / itemW);
    const rows = Math.floor(canvasFormat.height / itemH);
    return Math.max(0, cols * rows);
  }, [activeCanvasModel, canvasFormat, offsetMm]);

  // Calcul bin-packing pour l'étape e (utilise selectedStickerIds = {selectedModelId})
  const planResult = useMemo(() => {
    if (!activeCanvasModel || !canvasFormat) return null;
    const offsetCm = offsetMm / 10;
    const GAP = 0.1;
    const fW = canvasFormat.width;
    const fH = canvasFormat.height;
    const itemW = activeCanvasModel.width + 2 * offsetCm + GAP;
    const itemH = activeCanvasModel.height + 2 * offsetCm + GAP;
    if (itemW > fW || itemH > fH) return null;
    const placements: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
    let shelfX = GAP;
    let shelfY = GAP;
    let shelfH = 0;
    for (let i = 0; i < stickerCount; i++) {
      if (shelfX + itemW > fW) { shelfY += shelfH + GAP; shelfX = GAP; shelfH = 0; }
      if (shelfY + itemH > fH) break;
      placements.push({ id: activeCanvasModel.id, x: shelfX + offsetCm, y: shelfY + offsetCm, w: activeCanvasModel.width, h: activeCanvasModel.height });
      shelfX += itemW;
      shelfH = Math.max(shelfH, itemH);
    }
    return placements;
  }, [activeCanvasModel, canvasFormat, offsetMm, stickerCount]);

  // Étape courante (pour le style actif)
  const currentStep = !activeCanvasModel ? 'a' : !selectedModelId ? 'b' : 'done';

  return (
    <div className="space-y-4">

      {/* ÉTAPE a : Import du modèle (sans en-tête) */}
      <div className={`space-y-2 rounded-lg p-2 transition-colors ${currentStep === 'a' ? 'bg-purple-50 border border-purple-200' : 'border border-transparent'}`}>
        {activeCanvasModel && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
            <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
            <span className="truncate max-w-[160px]">{activeCanvasModel.name}</span>
          </div>
        )}

        {/* Zone drag-and-drop depuis le bureau */}
        <div
          className={`border-2 border-dashed rounded-lg px-3 py-2 text-center transition-colors ${
            isDragging ? "border-purple-400 bg-purple-50" : "border-gray-300 bg-gray-50"
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            dragCounterRef.current++;
            if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            dragCounterRef.current--;
            if (dragCounterRef.current === 0) setIsDragging(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            dragCounterRef.current = 0;
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
        >
          <p className="text-xs text-gray-600 font-medium">
            {fr ? "Glissez une image depuis le bureau" : "Drag an image from the desktop"}
          </p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
        />
        {/* Séparateur OU */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium px-1">{fr ? "OU" : "OR"}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        {/* Zone album Modèles Stickers — compacte */}
        <div className="rounded border border-purple-200 bg-purple-50 px-2 py-1.5 text-xs text-purple-800 leading-snug">
          {fr
            ? <><strong>Album Modèles Stickers</strong> → sélectionnez un sticker, ajoutez-le au panier, puis glissez-le sur le canvas.</>
            : <><strong>Sticker Models album</strong> → select a sticker, add to basket, then drag onto canvas.</>}
        </div>
      </div>

      {/* ÉTAPES b, c, d : Paramètres de la planche — chaque ligne a son toggle OK */}
      <div className={`space-y-1 rounded-lg p-2 border ${!activeCanvasModel ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>

        {/* b — Contour de découpe */}
        <div className="flex items-center gap-2 py-1">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">b</span>
          <span className="text-xs font-semibold text-gray-800 flex-1">{fr ? 'Contour' : 'Contour'}</span>
          <span className="text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{offsetMm} mm</span>
          {/* Toggle OK */}
          <button
            role="switch"
            aria-checked={stepBValidated}
            disabled={!activeCanvasModel}
            onClick={() => {
              if (!activeCanvasModel) return;
              const next = !stepBValidated;
              setStepBValidated(next);
              // Propager immédiatement avec la nouvelle valeur de stepBValidated.
              // On passe next explicitement car setStepBValidated est asynchrone.
              syncOverlay({ stepBValidated: next });
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              stepBValidated ? 'bg-green-500' : activeCanvasModel ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${stepBValidated ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {/* Slider offset — toujours visible pour permettre l'ajustement en temps réel */}
        <div className="pb-1">
          <input type="range" min={1} max={15} step={0.5} value={offsetMm}
            onChange={(e) => {
              const next = Number(e.target.value);
              setOffsetMm(next);
              // Propager immédiatement avec le nouvel offsetMm.
              syncOverlay({ offsetMm: next });
            }}
            className="w-full accent-purple-600" disabled={!activeCanvasModel} />
          <div className="flex justify-between text-xs text-gray-400"><span>1 mm</span><span>15 mm</span></div>
        </div>
        {/* Slider lissage — contrôle le nombre de passes gaussiennes (1=brut, 10=très lissé) */}
        <div className="pb-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-gray-600 flex-1">{fr ? 'Lissage contour' : 'Contour smoothing'}</span>
            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{gaussPasses}</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={gaussPasses}
            onChange={(e) => {
              const next = Number(e.target.value);
              setGaussPasses(next);
              // Propager immédiatement : le recalcul alpha tracing se déclenchera
              // car gaussPasses est inclus dans overlayKey (dépendance du useEffect).
              syncOverlay({ gaussPasses: next });
            }}
            className="w-full accent-purple-600" disabled={!activeCanvasModel} />
          <div className="flex justify-between text-xs text-gray-400"><span>{fr ? 'Brut' : 'Raw'}</span><span>{fr ? 'Très lissé' : 'Very smooth'}</span></div>
        </div>

        {/* c — Croix de repérage */}
        <div className="flex items-center gap-2 py-1 border-t border-gray-100">
          <span className={`flex-shrink-0 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center ${showCropMarks ? 'bg-green-500' : 'bg-purple-600'}`}>c</span>
          <span className="text-xs font-semibold text-gray-800 flex-1">{fr ? 'Croix de repérage' : 'Registration marks'}</span>
          {/* Toggle OK */}
          <button
            role="switch"
            aria-checked={showCropMarks}
            disabled={!activeCanvasModel}
            onClick={() => {
              const next = !showCropMarks;
              // setShowCropMarks appelle onStickerCropMarksChange(next) dans le parent.
              // Aucun couplage avec syncOverlay (toggle b).
              setShowCropMarks(next);
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              showCropMarks ? 'bg-green-500' : activeCanvasModel ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${showCropMarks ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* d — Nombre de stickers */}
        <div className="flex items-center gap-2 py-1 border-t border-gray-100">
          <span className={`flex-shrink-0 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center ${stepDValidated ? 'bg-green-500' : 'bg-purple-600'}`}>d</span>
          <span className="text-xs font-semibold text-gray-800 flex-1">{fr ? 'Nb stickers' : 'Nb stickers'}</span>
          <span className="text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
            {stickerCount}{maxFit > 0 ? `/${maxFit}` : ''}
          </span>
          {/* Toggle OK */}
          <button
            role="switch"
            aria-checked={stepDValidated}
            disabled={!activeCanvasModel || !stepBValidated}
            onClick={() => {
              if (!activeCanvasModel || !stepBValidated) return;
              const next = !stepDValidated;
              setStepDValidated(next);
              if (next && planResult && planResult.length > 0 && onDuplicateElement) {
                onDuplicateElement(
                  activeCanvasModel.id,
                  planResult.map((p, i) => ({ x: p.x, y: p.y, name: `${activeCanvasModel.name || 'sticker'}_${i + 1}` })),
                  true
                );
                toast.success(fr
                  ? `${planResult.length} sticker${planResult.length > 1 ? 's' : ''} placé${planResult.length > 1 ? 's' : ''} sur le canvas`
                  : `${planResult.length} sticker${planResult.length > 1 ? 's' : ''} placed on canvas`);
              }
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              stepDValidated ? 'bg-green-500' : (activeCanvasModel && stepBValidated) ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${stepDValidated ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {/* Slider nb stickers — visible seulement si non validé */}
        {!stepDValidated && (
          <div className="pb-1">
            <input type="range" min={1} max={Math.max(maxFit, 1)} step={1} value={stickerCount}
              onChange={(e) => setStickerCount(Number(e.target.value))}
              className="w-full accent-purple-600" disabled={!activeCanvasModel || !stepBValidated} />
            <div className="flex justify-between text-xs text-gray-400"><span>1</span><span>{Math.max(maxFit, 1)}</span></div>
          </div>
        )}
      </div>
      {/* ÉTAPE e : Télécharger SVG */}
      <div className={`space-y-2 rounded-lg p-2 border ${
        !activeCanvasModel ? 'border-gray-100 opacity-50' : 'border-transparent'
      }`}>
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">e</span>
          <span className="text-xs font-semibold text-gray-800">{fr ? 'Télécharger SVG de découpe' : 'Download cut SVG'}</span>
        </div>
        <button
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded border text-xs font-semibold transition-colors ${
            activeCanvasModel
              ? 'border-purple-400 bg-purple-600 text-white hover:bg-purple-700'
              : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
          disabled={!activeCanvasModel}
          onClick={() => {
            if (!activeCanvasModel || !onExportStickerContoursSVG) return;
            // Exporter TOUS les éléments image du canvas (modèle + copies bin-packing)
            const allIds = canvasImageElements?.map(el => el.id) ?? [activeCanvasModel.id];
            onExportStickerContoursSVG(offsetMm, allIds, true, 30);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {fr ? 'Télécharger SVG laser' : 'Download laser SVG'}
        </button>
        <p className="text-xs text-gray-400 text-center">{fr ? 'Compatible LightBurn, RDWorks, LaserGRBL' : 'Compatible with LightBurn, RDWorks, LaserGRBL'}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-section : Effets photo
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Sous-section : Effets photo
// ---------------------------------------------------------------------------

type EffectId =
  | "noir-blanc"
  | "sepia"
  | "vintage"
  | "vivid"
  | "froid"
  | "chaud"
  | "flou"
  | "contraste"
  | "luminosite";

interface EffectDef {
  id: EffectId;
  labelFr: string;
  labelEn: string;
}

const EFFECTS: EffectDef[] = [
  { id: "noir-blanc",  labelFr: "Noir & Blanc",      labelEn: "Black & White"  },
  { id: "sepia",       labelFr: "Sépia",              labelEn: "Sepia"          },
  { id: "vintage",     labelFr: "Vintage",            labelEn: "Vintage"        },
  { id: "vivid",       labelFr: "Couleurs vives",     labelEn: "Vivid"          },
  { id: "froid",       labelFr: "Tons froids",        labelEn: "Cool tones"     },
  { id: "chaud",       labelFr: "Tons chauds",        labelEn: "Warm tones"     },
  { id: "flou",        labelFr: "Flou artistique",    labelEn: "Artistic blur"  },
  { id: "contraste",   labelFr: "Contraste fort",     labelEn: "High contrast"  },
  { id: "luminosite",  labelFr: "Luminosité",         labelEn: "Brightness"     },
];

/**
 * Applique un effet à une image via canvas 2D et retourne le data-URL résultant.
 * Tous les traitements sont réalisés côté client, sans appel serveur.
 */
function applyEffectToImage(
  src: string,
  effectId: EffectId,
  intensity: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const t = intensity / 100; // facteur 0..1

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        switch (effectId) {
          case "noir-blanc": {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = r + (gray - r) * t;
            g = g + (gray - g) * t;
            b = b + (gray - b) * t;
            break;
          }
          case "sepia": {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const sr = gray * 1.08;
            const sg = gray * 0.88;
            const sb = gray * 0.62;
            r = r + (Math.min(255, sr) - r) * t;
            g = g + (Math.min(255, sg) - g) * t;
            b = b + (Math.min(255, sb) - b) * t;
            break;
          }
          case "vintage": {
            r = r + (Math.min(255, r * 1.1 + 20) - r) * t;
            g = g + (g * 0.95 - g) * t;
            b = b + (b * 0.8 - b) * t;
            break;
          }
          case "vivid": {
            const avg = (r + g + b) / 3;
            r = r + (Math.min(255, avg + (r - avg) * 1.5) - r) * t;
            g = g + (Math.min(255, avg + (g - avg) * 1.5) - g) * t;
            b = b + (Math.min(255, avg + (b - avg) * 1.5) - b) * t;
            break;
          }
          case "froid": {
            r = r + (r * 0.85 - r) * t;
            b = b + (Math.min(255, b * 1.15) - b) * t;
            break;
          }
          case "chaud": {
            r = r + (Math.min(255, r * 1.15) - r) * t;
            b = b + (b * 0.85 - b) * t;
            break;
          }
          case "contraste": {
            const factor = 1 + t * 1.5;
            r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
            g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
            b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
            break;
          }
          case "luminosite": {
            const boost = t * 80;
            r = Math.min(255, r + boost);
            g = Math.min(255, g + boost);
            b = Math.min(255, b + boost);
            break;
          }
          case "flou":
            // Le flou est appliqué via filter CSS, pas pixel par pixel
            break;
        }

        data[i]     = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      if (effectId === "flou") {
        // Flou via filtre CSS sur un canvas intermédiaire
        const blurCanvas = document.createElement("canvas");
        blurCanvas.width = canvas.width;
        blurCanvas.height = canvas.height;
        const blurCtx = blurCanvas.getContext("2d")!;
        const blurPx = Math.round(t * 8);
        blurCtx.filter = `blur(${blurPx}px)`;
        blurCtx.drawImage(img, 0, 0);
        resolve(blurCanvas.toDataURL("image/jpeg", 0.92));
        return;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function EffetsPhotoSection({
  activeCanvasPhoto,
  onApplyEffect,
}: Pick<AssemblagePanelProps, "activeCanvasPhoto" | "onApplyEffect">) {
  const { language } = useLanguage();
  const [selectedEffect, setSelectedEffect] = useState<EffectId | null>(null);
  const [intensity, setIntensity] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Générer un aperçu dès que l'effet ou l'intensité change
  useEffect(() => {
    if (!activeCanvasPhoto || !selectedEffect) {
      setPreviewSrc(null);
      return;
    }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(async () => {
      try {
        const result = await applyEffectToImage(activeCanvasPhoto, selectedEffect, intensity);
        setPreviewSrc(result);
      } catch {
        setPreviewSrc(null);
      }
    }, 300);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [activeCanvasPhoto, selectedEffect, intensity]);

  const handleApply = async () => {
    if (!activeCanvasPhoto) {
      toast.error(
        language === "fr"
          ? "Sélectionnez d'abord une photo sur le canvas"
          : "First select a photo on the canvas"
      );
      return;
    }
    if (!selectedEffect) {
      toast.error(language === "fr" ? "Choisissez un effet" : "Choose an effect");
      return;
    }
    setIsProcessing(true);
    try {
      const result = await applyEffectToImage(activeCanvasPhoto, selectedEffect, intensity);
      onApplyEffect(result);
      toast.success(language === "fr" ? "Effet appliqué" : "Effect applied");
    } catch {
      toast.error(language === "fr" ? "Erreur lors de l'application" : "Error applying effect");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      {!activeCanvasPhoto && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
          {language === "fr"
            ? "Sélectionnez une photo sur le canvas pour appliquer un effet."
            : "Select a photo on the canvas to apply an effect."}
        </div>
      )}

      {/* Grille des effets */}
      <div className="grid grid-cols-2 gap-1">
        {EFFECTS.map((eff) => (
          <Button
            key={eff.id}
            variant={selectedEffect === eff.id ? "default" : "outline"}
            size="sm"
            className={`text-xs justify-start ${selectedEffect === eff.id ? "bg-purple-600 text-white" : ""}`}
            onClick={() => setSelectedEffect(eff.id)}
          >
            {language === "fr" ? eff.labelFr : eff.labelEn}
          </Button>
        ))}
      </div>

      {/* Intensité */}
      {selectedEffect && (
        <div className="pt-2 border-t space-y-1">
          <Label className="text-xs text-gray-600">
            {language === "fr" ? `Intensité : ${intensity}%` : `Intensity: ${intensity}%`}
          </Label>
          <Slider
            value={[intensity]}
            onValueChange={([v]) => setIntensity(v)}
            min={10}
            max={100}
            step={5}
          />
        </div>
      )}

      {/* Aperçu */}
      {previewSrc && (
        <div className="pt-2 border-t">
          <Label className="text-xs text-gray-600 mb-1 block">
            {language === "fr" ? "Aperçu" : "Preview"}
          </Label>
          <img
            src={previewSrc}
            alt="preview"
            className="w-full rounded border border-gray-200 max-h-32 object-contain"
          />
        </div>
      )}

      {/* Bouton Appliquer */}
      <Button
        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
        onClick={handleApply}
        disabled={isProcessing || !activeCanvasPhoto || !selectedEffect}
      >
        {isProcessing
          ? (language === "fr" ? "Application..." : "Applying...")
          : (language === "fr" ? "Appliquer l'effet" : "Apply effect")}
      </Button>
    </div>
  );
}

/// ---------------------------------------------------------------------------
// Sous-section : Texte & Typographie
// ---------------------------------------------------------------------------
const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "Playfair Display",
  "Libre Baskerville",
  "Cinzel",
  "Dancing Script",
  "Great Vibes",
  "Pacifico",
  "Lobster",
  "Georgia",
  "Arial",
  "Times New Roman",
  "Courier New",
];

function TexteSection({
  onAddTextToCanvas,
  selectedTextElement,
  onUpdateTextElement,
}: Pick<AssemblagePanelProps, "onAddTextToCanvas" | "selectedTextElement" | "onUpdateTextElement">) {
  const { language } = useLanguage();
  const fr = language === "fr";
  const [text, setText] = useState(fr ? "Mon texte" : "My text");
  const [fontFamily, setFontFamily] = useState("Playfair Display");
  const [fontSize, setFontSize] = useState(36);
  const [fontColor, setFontColor] = useState("#1a1a1a");
  const [fontBold, setFontBold] = useState(false);
  const [fontItalic, setFontItalic] = useState(false);
  const [fontUnderline, setFontUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  // Contour
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  // Ombre
  const [shadowColor, setShadowColor] = useState("rgba(0,0,0,0.5)");
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowOffsetX, setShadowOffsetX] = useState(2);
  const [shadowOffsetY, setShadowOffsetY] = useState(2);

  // Synchronisation avec l'élément texte sélectionné sur le canvas
  const prevSelectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedTextElement && selectedTextElement.id !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedTextElement.id;
      setText(selectedTextElement.text);
      setFontFamily(selectedTextElement.fontFamily);
      setFontSize(selectedTextElement.fontSize);
      setFontColor(selectedTextElement.fontColor);
      setFontBold(selectedTextElement.fontBold);
      setFontItalic(selectedTextElement.fontItalic);
      setFontUnderline(selectedTextElement.fontUnderline);
      setTextAlign(selectedTextElement.textAlign);
      setStrokeColor(selectedTextElement.strokeColor);
      setStrokeWidth(selectedTextElement.strokeWidth);
      setShadowColor(selectedTextElement.shadowColor);
      setShadowBlur(selectedTextElement.shadowBlur);
      setShadowOffsetX(selectedTextElement.shadowOffsetX);
      setShadowOffsetY(selectedTextElement.shadowOffsetY);
    } else if (!selectedTextElement) {
      prevSelectedIdRef.current = null;
    }
  }, [selectedTextElement]);

  const currentProps = (): TextElementProps => ({
    text, fontFamily, fontSize, fontColor, fontBold, fontItalic, fontUnderline,
    textAlign, strokeColor, strokeWidth, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY,
  });

  const handleAdd = () => {
    if (!text.trim()) return;
    if (selectedTextElement && onUpdateTextElement) {
      // Mode édition : mettre à jour l'élément existant
      onUpdateTextElement(selectedTextElement.id, currentProps());
      return;
    }
    onAddTextToCanvas({
      text,
      fontFamily,
      fontSize,
      fontColor,
      fontBold,
      fontItalic,
      fontUnderline,
      textAlign,
      strokeColor,
      strokeWidth,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
    });
  };

  const previewStyle: React.CSSProperties = {
    fontFamily,
    fontSize: Math.min(fontSize, 32),
    color: fontColor,
    fontWeight: fontBold ? "bold" : "normal",
    fontStyle: fontItalic ? "italic" : "normal",
    textDecoration: fontUnderline ? "underline" : "none",
    textAlign,
    WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : undefined,
    textShadow: shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0
      ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`
      : undefined,
    wordBreak: "break-word",
    lineHeight: 1.3,
  };

  return (
    <div className="space-y-4">
      {/* Zone de saisie */}
      <div>
        <Label className="text-xs font-semibold text-gray-700 block mb-1">
          {fr ? "Texte" : "Text"}
        </Label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder={fr ? "Saisissez votre texte..." : "Enter your text..."}
        />
      </div>

      {/* Police */}
      <div>
        <Label className="text-xs font-semibold text-gray-700 block mb-1">
          {fr ? "Police" : "Font"}
        </Label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          style={{ fontFamily }}
        >
          {GOOGLE_FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      {/* Taille + Couleur */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-gray-600 block mb-1">
            {fr ? `Taille : ${fontSize}pt` : `Size: ${fontSize}pt`}
          </Label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFontSize((s) => Math.max(8, s - 2))}
              className="w-6 h-6 flex items-center justify-center border rounded text-gray-600 hover:bg-gray-100"
            ><Minus className="w-3 h-3" /></button>
            <input
              type="number"
              min={8} max={200}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs text-center w-0"
            />
            <button
              onClick={() => setFontSize((s) => Math.min(200, s + 2))}
              className="w-6 h-6 flex items-center justify-center border rounded text-gray-600 hover:bg-gray-100"
            ><Plus className="w-3 h-3" /></button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-600 block mb-1">
            {fr ? "Couleur" : "Color"}
          </Label>
          <input
            type="color"
            value={fontColor}
            onChange={(e) => setFontColor(e.target.value)}
            className="w-full h-8 rounded cursor-pointer border border-gray-300"
          />
        </div>
      </div>

      {/* Mise en forme */}
      <div>
        <Label className="text-xs font-semibold text-gray-700 block mb-1">
          {fr ? "Mise en forme" : "Formatting"}
        </Label>
        <div className="flex gap-1">
          {/* Gras */}
          <button
            onClick={() => setFontBold((b) => !b)}
            title={fr ? "Gras" : "Bold"}
            className={`flex-1 py-1.5 border rounded flex items-center justify-center transition-colors ${
              fontBold ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          ><Bold className="w-4 h-4" /></button>
          {/* Italique */}
          <button
            onClick={() => setFontItalic((i) => !i)}
            title={fr ? "Italique" : "Italic"}
            className={`flex-1 py-1.5 border rounded flex items-center justify-center transition-colors ${
              fontItalic ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          ><Italic className="w-4 h-4" /></button>
          {/* Souligné */}
          <button
            onClick={() => setFontUnderline((u) => !u)}
            title={fr ? "Souligné" : "Underline"}
            className={`flex-1 py-1.5 border rounded flex items-center justify-center transition-colors ${
              fontUnderline ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          ><Underline className="w-4 h-4" /></button>
          <div className="w-px bg-gray-200 mx-0.5" />
          {/* Alignement */}
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setTextAlign(a)}
              title={a === "left" ? (fr ? "Gauche" : "Left") : a === "center" ? (fr ? "Centre" : "Center") : (fr ? "Droite" : "Right")}
              className={`flex-1 py-1.5 border rounded flex items-center justify-center transition-colors ${
                textAlign === a ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {a === "left" ? <AlignLeft className="w-4 h-4" /> : a === "center" ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Contour */}
      <div className="border rounded-lg p-3 space-y-2 bg-blue-50/40">
        <Label className="text-xs font-bold text-blue-700 block">
          {fr ? "Contour du texte" : "Text stroke"}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-600">{fr ? "Couleur" : "Color"}</Label>
            <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)}
              className="w-full h-7 rounded cursor-pointer border border-gray-300 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">{fr ? `Épaisseur : ${strokeWidth}px` : `Width: ${strokeWidth}px`}</Label>
            <Slider value={[strokeWidth]} onValueChange={([v]) => setStrokeWidth(v)} min={0} max={8} step={0.5} className="mt-2" />
          </div>
        </div>
      </div>

      {/* Ombre */}
      <div className="border rounded-lg p-3 space-y-2 bg-amber-50/40">
        <Label className="text-xs font-bold text-amber-700 block">
          {fr ? "Ombre portée" : "Drop shadow"}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-600">{fr ? "Couleur" : "Color"}</Label>
            <input type="color" value={shadowColor.startsWith("rgba") ? "#000000" : shadowColor}
              onChange={(e) => setShadowColor(e.target.value)}
              className="w-full h-7 rounded cursor-pointer border border-gray-300 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">{fr ? `Flou : ${shadowBlur}px` : `Blur: ${shadowBlur}px`}</Label>
            <Slider value={[shadowBlur]} onValueChange={([v]) => setShadowBlur(v)} min={0} max={20} step={1} className="mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-600">{fr ? `Décalage X : ${shadowOffsetX}px` : `Offset X: ${shadowOffsetX}px`}</Label>
            <Slider value={[shadowOffsetX]} onValueChange={([v]) => setShadowOffsetX(v)} min={-20} max={20} step={1} className="mt-2" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">{fr ? `Décalage Y : ${shadowOffsetY}px` : `Offset Y: ${shadowOffsetY}px`}</Label>
            <Slider value={[shadowOffsetY]} onValueChange={([v]) => setShadowOffsetY(v)} min={-20} max={20} step={1} className="mt-2" />
          </div>
        </div>
      </div>

      {/* Aperçu */}
      <div className="border rounded-lg p-3 bg-gray-50 min-h-[60px] flex items-center justify-center">
        <span style={previewStyle}>{text || (fr ? "Aperçu..." : "Preview...")}</span>
      </div>

      {/* Bannière mode édition */}
      {selectedTextElement && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          {fr ? "Mode édition - modifiez les paramètres puis cliquez Mettre à jour" : "Edit mode - change settings then click Update"}
        </div>
      )}
      {/* Bouton Ajouter / Mettre à jour */}
      <Button
        className={`w-full text-white text-sm gap-2 ${
          selectedTextElement
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-purple-600 hover:bg-purple-700"
        }`}
        onClick={handleAdd}
        disabled={!text.trim()}
      >
        <Type className="w-4 h-4" />
        {selectedTextElement
          ? (fr ? "✓ Mettre à jour le texte" : "✓ Update text")
          : (fr ? "Ajouter le texte au canvas" : "Add text to canvas")
        }
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant : PuzzleSection
// ---------------------------------------------------------------------------

const PUZZLE_PIECE_COUNTS_SECTION = [9, 16, 25, 36, 48, 64, 100] as const;

/**
 * Génère le path SVG d'une pièce de puzzle avec vraies encoches Bézier.
 * Identique à buildPuzzlePath dans CreationsAtelierV2 (dupliqué pour éviter une dépendance circulaire).
 */
function buildPuzzlePathLocal(
  w: number,
  h: number,
  edges: { top: number; right: number; bottom: number; left: number }
): string {
  const nr = Math.min(w, h) * 0.20;
  const pcx = w / 2, pcy = h / 2;
  const { top, right, bottom, left } = edges;
  const segs: string[] = [];
  segs.push(`M0,0`);
  if (top === 0) {
    segs.push(`L${w},0`);
  } else {
    const d = top;
    segs.push(`L${pcx - nr},0`);
    segs.push(`C${pcx - nr},${-d * nr * 0.5} ${pcx - nr * 0.5},${-d * nr * 1.3} ${pcx},${-d * nr * 1.3}`);
    segs.push(`C${pcx + nr * 0.5},${-d * nr * 1.3} ${pcx + nr},${-d * nr * 0.5} ${pcx + nr},0`);
    segs.push(`L${w},0`);
  }
  if (right === 0) {
    segs.push(`L${w},${h}`);
  } else {
    const d = right;
    segs.push(`L${w},${pcy - nr}`);
    segs.push(`C${w + d * nr * 0.5},${pcy - nr} ${w + d * nr * 1.3},${pcy - nr * 0.5} ${w + d * nr * 1.3},${pcy}`);
    segs.push(`C${w + d * nr * 1.3},${pcy + nr * 0.5} ${w + d * nr * 0.5},${pcy + nr} ${w},${pcy + nr}`);
    segs.push(`L${w},${h}`);
  }
  if (bottom === 0) {
    segs.push(`L0,${h}`);
  } else {
    const d = bottom;
    segs.push(`L${pcx + nr},${h}`);
    segs.push(`C${pcx + nr},${h + d * nr * 0.5} ${pcx + nr * 0.5},${h + d * nr * 1.3} ${pcx},${h + d * nr * 1.3}`);
    segs.push(`C${pcx - nr * 0.5},${h + d * nr * 1.3} ${pcx - nr},${h + d * nr * 0.5} ${pcx - nr},${h}`);
    segs.push(`L0,${h}`);
  }
  if (left === 0) {
    segs.push(`Z`);
  } else {
    const d = left;
    segs.push(`L0,${pcy + nr}`);
    segs.push(`C${-d * nr * 0.5},${pcy + nr} ${-d * nr * 1.3},${pcy + nr * 0.5} ${-d * nr * 1.3},${pcy}`);
    segs.push(`C${-d * nr * 1.3},${pcy - nr * 0.5} ${-d * nr * 0.5},${pcy - nr} 0,${pcy - nr}`);
    segs.push(`Z`);
  }
  return segs.join(' ');
}

/**
 * Génère une grille de pièces de puzzle avec encoches compatibles (tenon/mortaise alternés).
 * Retourne un tableau de { path, x, y } pour chaque pièce.
 */
function buildPuzzleGridPaths(
  cols: number,
  rows: number,
  svgW: number,
  svgH: number
): Array<{ path: string; x: number; y: number }> {
  const cellW = svgW / cols;
  const cellH = svgH / rows;
  // Pré-calculer les encoches : chaque bord partagé a une direction fixée aléatoirement mais cohérente
  // hEdges[r][c] = direction du bord horizontal entre rangée r et r+1 pour colonne c
  // vEdges[r][c] = direction du bord vertical entre colonne c et c+1 pour rangée r
  const hEdges: number[][] = Array.from({ length: rows - 1 }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ((r * cols + c) % 2 === 0 ? 1 : -1))
  );
  const vEdges: number[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols - 1 }, (_, c) => ((r + c) % 2 === 0 ? 1 : -1))
  );

  const pieces: Array<{ path: string; x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      const edges = {
        top:    r === 0          ? 0 : -hEdges[r - 1][c],
        bottom: r === rows - 1  ? 0 :  hEdges[r][c],
        left:   c === 0         ? 0 : -vEdges[r][c - 1],
        right:  c === cols - 1  ? 0 :  vEdges[r][c],
      };
      const path = buildPuzzlePathLocal(cellW, cellH, edges);
      pieces.push({ path, x, y });
    }
  }
  return pieces;
}

interface PuzzleSectionProps {
  canvasFormat: CanvasFormat;
  canvasOpenings?: Array<{ id: string; shape: string; openingColor: string; validated: boolean; name: string }>;
  onGenerateFullPagePuzzle?: (cols: number, rows: number, showNumbers?: boolean, transparent?: boolean, numberSize?: 'small' | 'medium' | 'large') => void;
  onExportLaserSVG?: () => void;
}

function PuzzleSection({ canvasFormat, canvasOpenings, onGenerateFullPagePuzzle, onExportLaserSVG }: PuzzleSectionProps) {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const [puzzlePieceCount, setPuzzlePieceCount] = useState<number>(16);
  const [showPuzzleNumbers, setShowPuzzleNumbers] = useState<boolean>(false);
  const [puzzleNumberSize, setPuzzleNumberSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [puzzleTransparent, setPuzzleTransparent] = useState<boolean>(false);

  const getPuzzleGrid = (count: number) => {
    const ratio = canvasFormat ? canvasFormat.width / canvasFormat.height : 1;
    let bestCols = 1, bestRows = count;
    let bestDiff = Math.abs(bestCols / bestRows - ratio);
    for (let c = 1; c <= count; c++) {
      if (count % c === 0) {
        const r = count / c;
        const diff = Math.abs(c / r - ratio);
        if (diff < bestDiff) { bestDiff = diff; bestCols = c; bestRows = r; }
      }
    }
    return { cols: bestCols, rows: bestRows };
  };

  const { cols, rows } = getPuzzleGrid(puzzlePieceCount);
  // Dimensions de l'aperçu SVG — marge pour les encoches qui débordent
  const PREVIEW_W = 200, PREVIEW_H = 150;
  const MARGIN = 12; // px de marge pour les encoches
  const innerW = PREVIEW_W - MARGIN * 2;
  const innerH = PREVIEW_H - MARGIN * 2;
  const previewPieces = useMemo(
    () => buildPuzzleGridPaths(cols, rows, innerW, innerH),
    [cols, rows, innerW, innerH]
  );

  return (
    <div className="space-y-3">
      {/* Description */}
      <p className="text-xs text-gray-500 italic">
        {fr
          ? "Divisez la page en pi\u00e8ces de puzzle avec de vraies encoches. G\u00e9n\u00e9rez puis exportez en SVG pour la d\u00e9coupe laser."
          : "Divide the page into puzzle pieces with real interlocking tabs. Generate then export as SVG for laser cutting."}
      </p>

      {/* S\u00e9lecteur du nombre de pi\u00e8ces */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-1.5">
          {fr ? "Nombre de pi\u00e8ces" : "Number of pieces"}
        </p>
        <div className="flex flex-wrap gap-1">
          {PUZZLE_PIECE_COUNTS_SECTION.map(n => (
            <button
              key={n}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                puzzlePieceCount === n
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
              }`}
              onClick={() => setPuzzlePieceCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Aper\u00e7u puzzle avec vraies encoches B\u00e9zier */}
      <div className="flex flex-col items-center gap-1">
        <svg
          width={PREVIEW_W}
          height={PREVIEW_H}
          viewBox={`${-MARGIN} ${-MARGIN} ${PREVIEW_W} ${PREVIEW_H}`}
          className="border border-gray-200 rounded bg-gray-50 w-full"
          style={{ maxWidth: PREVIEW_W }}
          overflow="visible"
        >
          {previewPieces.map(({ path, x, y }, i) => (
            <g key={i} transform={`translate(${x},${y})`}>
              <path
                d={path}
                fill="#6366f1"
                fillOpacity={0.55}
                stroke="#4338ca"
                strokeWidth={0.8}
                strokeLinejoin="round"
              />
            </g>
          ))}
        </svg>
        <span className="text-xs text-gray-500">
          {fr ? `${cols} \u00d7 ${rows} = ${puzzlePieceCount} pi\u00e8ces` : `${cols} \u00d7 ${rows} = ${puzzlePieceCount} pieces`}
        </span>
      </div>

      {/* Toggle numérotation */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">
            {fr ? "Num\u00e9roter les pi\u00e8ces" : "Number the pieces"}
          </span>
          <span className="text-xs text-gray-400 italic">
            {fr ? "Utile pour les puzzles enfants" : "Useful for children's puzzles"}
          </span>
        </div>
        <button
          role="switch"
          aria-checked={showPuzzleNumbers}
          onClick={() => setShowPuzzleNumbers(v => !v)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            showPuzzleNumbers ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              showPuzzleNumbers ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Taille des numéros (visible si numérotation active) */}
      {showPuzzleNumbers && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-600">
            {fr ? "Taille des num\u00e9ros" : "Number size"}
          </span>
          <div className="flex gap-1">
            {(['small', 'medium', 'large'] as const).map(size => (
              <button
                key={size}
                onClick={() => setPuzzleNumberSize(size)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  puzzleNumberSize === size
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {size === 'small' ? (fr ? 'Petit' : 'Small') : size === 'medium' ? (fr ? 'Moyen' : 'Medium') : (fr ? 'Grand' : 'Large')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle mode vierge */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">
            {fr ? "\u{1FAB5} Mode vierge (bois)" : "\u{1FAB5} Blank mode (wood)"}
          </span>
          <span className="text-xs text-gray-400 italic">
            {fr ? "Contours seuls, sans remplissage" : "Outlines only, no fill"}
          </span>
        </div>
        <button
          role="switch"
          aria-checked={puzzleTransparent}
          onClick={() => setPuzzleTransparent(v => !v)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            puzzleTransparent ? 'bg-amber-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              puzzleTransparent ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Bouton Générer */}
      <button
        className="w-full py-2 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
        onClick={() => {
          if (onGenerateFullPagePuzzle) {
            onGenerateFullPagePuzzle(cols, rows, showPuzzleNumbers, puzzleTransparent, puzzleNumberSize);
          }
        }}
      >
        {fr ? `G\u00e9n\u00e9rer le puzzle (${puzzlePieceCount} pi\u00e8ces)` : `Generate puzzle (${puzzlePieceCount} pieces)`}
      </button>

      {/* Bouton SVG laser */}
      <button
        className={`w-full flex items-center justify-center gap-2 py-2 rounded border text-xs font-semibold transition-colors ${
          canvasOpenings && canvasOpenings.length > 0
            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
        onClick={() => {
          if (canvasOpenings && canvasOpenings.length > 0 && onExportLaserSVG) {
            onExportLaserSVG();
          }
        }}
        title={
          canvasOpenings && canvasOpenings.length > 0
            ? (fr ? 'T\u00e9l\u00e9charger le SVG de d\u00e9coupe laser' : 'Download laser cut SVG')
            : (fr ? "Ajoutez des ouvertures pour activer l'export SVG" : 'Add openings to enable SVG export')
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {fr
          ? (canvasOpenings && canvasOpenings.length > 0
              ? `T\u00e9l\u00e9charger SVG laser (${canvasOpenings.length} ouverture${canvasOpenings.length > 1 ? 's' : ''})`
              : 'T\u00e9l\u00e9charger SVG laser (aucune ouverture)')
          : (canvasOpenings && canvasOpenings.length > 0
              ? `Download laser SVG (${canvasOpenings.length} opening${canvasOpenings.length > 1 ? 's' : ''})`
              : 'Download laser SVG (no openings)')}
      </button>
      <p className="text-xs text-gray-400 text-center">
        {fr ? 'Compatible LightBurn, RDWorks, LaserGRBL' : 'Compatible with LightBurn, RDWorks, LaserGRBL'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal : AssemblagePanel
// ---------------------------------------------------------------------------
type SectionId = "passe-partout" | "cadres" | "cliparts" | "effets" | "texte" | "puzzle";

interface SectionDef {
  id: SectionId;
  labelFr: string;
  labelEn: string;
  icon: React.ElementType;
}

const SECTIONS: SectionDef[] = [
  { id: "passe-partout", labelFr: "Passe-partout",       labelEn: "Mat frames",         icon: Frame    },
  { id: "cadres",        labelFr: "Cadres & Bordures",   labelEn: "Frames & Borders",   icon: Image    },
  { id: "cliparts",      labelFr: "Cliparts & Stickers", labelEn: "Cliparts & Stickers",icon: Sticker  },
  { id: "effets",        labelFr: "Effets photo",        labelEn: "Photo effects",      icon: Sparkles },
  { id: "texte",         labelFr: "Texte & Typographie", labelEn: "Text & Typography",  icon: Type     },
  { id: "puzzle",        labelFr: "Puzzle",              labelEn: "Puzzle",             icon: Puzzle   },
];

export default function AssemblagePanel(props: AssemblagePanelProps) {
  const { language } = useLanguage();
  const [openSection, setOpenSection] = useState<SectionId | null>("passe-partout");

  const toggle = (id: SectionId) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-1">
      {SECTIONS.map((section) => {
        const isOpen = openSection !== null && openSection === section.id;
        const Icon = section.icon;
        return (
          <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* En-tête de section */}
            <button
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                isOpen
                  ? "bg-purple-600 text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => toggle(section.id)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">
                {language === "fr" ? section.labelFr : section.labelEn}
              </span>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
            </button>

            {/* Contenu de la section */}
            {isOpen && (
              <div className="p-3 bg-white">
                {section.id === "passe-partout" && (
                  <PassePartoutSection
                    canvasFormat={props.canvasFormat}
                    onAddPassePartout={props.onAddPassePartout}
                    onReplacePassePartout={props.onReplacePassePartout}
                    onReplaceColorOnly={props.onReplaceColorOnly}
                    onReplacePatternOnly={props.onReplacePatternOnly}
                    hasExistingPassePartout={props.hasExistingPassePartout}
                    onAddOpening={props.onAddOpening}
                    onValidateOpening={props.onValidateOpening}
                    onDeleteOpening={props.onDeleteOpening}
                    onApplyColorToOpenings={props.onApplyColorToOpenings}
                    onGenerateFromOpenings={props.onGenerateFromOpenings}
                    canvasOpenings={props.canvasOpenings}
                    activeOpeningId={props.activeOpeningId}
                    selectedCanvasElementId={props.selectedCanvasElementId}
                    onApplyTemplate={props.onApplyTemplate}
                    onGetCurrentShapes={props.onGetCurrentShapes}
                    onGenerateFullPagePuzzle={props.onGenerateFullPagePuzzle}
                    onExportLaserSVG={props.onExportLaserSVG}
                     onAddBackground={props.onAddBackground}
                     hasExistingBackground={props.hasExistingBackground}
                     onRemoveBackground={props.onRemoveBackground}
                     showFormatBorder={props.showFormatBorder}
                     onShowFormatBorderChange={props.onShowFormatBorderChange}
                     filets={props.filets}
                     onFiletsChange={props.onFiletsChange}
                     segmentEditorActive={props.segmentEditorActive}
                     segmentsRounded={props.segmentsRounded}
                     onRoundAllSegments={props.onRoundAllSegments}
                     isNodeEditMode={props.isNodeEditMode}
                     onToggleNodeEditMode={props.onToggleNodeEditMode}
                     selectedSegmentIndex={props.selectedSegmentIndex}
                     onRoundSegmentConcave={props.onRoundSegmentConcave}
                     onRoundSegmentConvex={props.onRoundSegmentConvex}
                     onDeleteSegment={props.onDeleteSegment}
                     onStraightenSegment={props.onStraightenSegment}
                    isCutMode={props.isCutMode}
                    onToggleCutMode={props.onToggleCutMode}
                    isLineDrawMode={props.isLineDrawMode}
                    onToggleLineDrawMode={props.onToggleLineDrawMode}
                    lineSelected={props.lineSelected}
                    lineIsRounded={props.lineIsRounded}
                    onRoundLine={props.onRoundLine}
                    lineChainCount={props.lineChainCount}
                    lineColor={props.lineColor}
                    onLineColorChange={props.onLineColorChange}
                    lineStrokeWidth={props.lineStrokeWidth}
                    onLineStrokeWidthChange={props.onLineStrokeWidthChange}
                   />
                )}
                {section.id === "cadres" && (
                  <CadresBorduresSection onAddToCanvas={props.onAddToCanvas} />
                )}
                {section.id === "cliparts" && (
                  <StickerPlannerSection
                    onAddToCanvas={props.onAddToCanvas}
                    canvasImageElements={props.canvasImageElements}
                    onExportStickerContoursSVG={props.onExportStickerContoursSVG}
                    canvasFormat={props.canvasFormat}
                    onApplyBinPackLayout={props.onApplyBinPackLayout}
                    onDuplicateElement={props.onDuplicateElement}
                    onStickerOverlayChange={props.onStickerOverlayChange}
                    stickerCropMarks={props.stickerCropMarks}
                    onStickerCropMarksChange={props.onStickerCropMarksChange}
                  />
                )}
                {section.id === "effets" && (
                  <EffetsPhotoSection
                    activeCanvasPhoto={props.activeCanvasPhoto}
                    onApplyEffect={props.onApplyEffect}
                  />
                )}
                {section.id === "texte" && (
                  <TexteSection
                    onAddTextToCanvas={props.onAddTextToCanvas}
                    selectedTextElement={props.selectedTextElement}
                    onUpdateTextElement={props.onUpdateTextElement}
                  />
                )}
                {section.id === "puzzle" && (
                  <PuzzleSection
                    canvasFormat={props.canvasFormat}
                    canvasOpenings={props.canvasOpenings}
                    onGenerateFullPagePuzzle={props.onGenerateFullPagePuzzle}
                    onExportLaserSVG={props.onExportLaserSVG}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
