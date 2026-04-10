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
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/db";
import { toast } from "sonner";
import BibliothequeModeles from "./BibliothequeModeles";

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
  onGenerateFullPagePuzzle?: (cols: number, rows: number, showNumbers?: boolean, transparent?: boolean, numberSize?: 'small' | 'medium' | 'large', cutStyle?: 'classique' | 'geometrique' | 'enfant', showBorder?: boolean) => void;
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
  /** Si fourni, seules les sections dont l'id est dans cette liste sont affichées */
  visibleSections?: SectionId[];
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
  /** Catégories de modèles à afficher dans les sections passe-partout / pêle-mêle */
  modelesCategories?: string[] | null;
  /** Callback quand l'utilisateur sélectionne un modèle */
  onSelectModele?: (url: string, filename: string) => void;
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
        <path d={openingPath} fill="none" stroke="#000000" strokeWidth="4" />
        {/* Contour extérieur */}
        <rect x={0.5} y={0.5} width={SVG_W - 1} height={safeH - 1} fill="none" stroke="#000000" strokeWidth="4" />
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
  const [activeSection, setActiveSection] = useState<"shape" | "pattern" | null>(null);


  const toggleSection = (section: "shape" | "pattern") => {
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



    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-section : Effets photo
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Sous-section : Effets photo — supprimée (les effets sont dans RetouchePhoto.tsx)
// ---------------------------------------------------------------------------

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

type PuzzleCutStyleLocal = 'classique' | 'geometrique' | 'enfant';

/**
 * Génère le path SVG d'une pièce de puzzle avec encoches.
 * Dupliqué de buildPuzzlePath (sans offset ox/oy).
 * 3 styles : classique (col+tête), geometrique (arc A), enfant (arc A large).
 */
function buildPuzzlePathLocal(
  w: number,
  h: number,
  edges: { top: number; right: number; bottom: number; left: number },
  cutStyle: PuzzleCutStyleLocal = 'classique',
  showBorder: boolean = true,
  _edgeSeeds?: { top: number; right: number; bottom: number; left: number }
): string {
  const { top, right, bottom, left } = edges;
  const lm = (isFlat: boolean) => (!showBorder && isFlat) ? 'M' : 'L';

  // ── CLASSIQUE — Col droit (L) + tête ronde (C), forme sucette/champignon ──
  if (cutStyle === 'classique') {
    const base = Math.min(w, h);
    const neckW = base * 0.073, headR = base * 0.182;
    const neckH = base * 0.10, apexH = neckH + headR, k = 0.55;
    const pcx = w / 2, pcy = h / 2;
    const s: string[] = [];
    s.push('M0,0');
    if (top === 0) { s.push(`${lm(true)}${w},0`); }
    else {
      const d = top, cx = pcx, cy = 0;
      s.push(`L${cx - neckW},${cy}`); s.push(`L${cx - neckW},${cy - d * neckH}`);
      s.push(`C${cx - headR},${cy - d * neckH} ${cx - headR * k},${cy - d * apexH} ${cx},${cy - d * apexH}`);
      s.push(`C${cx + headR * k},${cy - d * apexH} ${cx + headR},${cy - d * neckH} ${cx + neckW},${cy - d * neckH}`);
      s.push(`L${cx + neckW},${cy}`); s.push(`L${w},0`);
    }
    if (right === 0) { s.push(`${lm(true)}${w},${h}`); }
    else {
      const d = right, cx = w, cy = pcy;
      s.push(`L${cx},${cy - neckW}`); s.push(`L${cx + d * neckH},${cy - neckW}`);
      s.push(`C${cx + d * neckH},${cy - headR} ${cx + d * apexH},${cy - headR * k} ${cx + d * apexH},${cy}`);
      s.push(`C${cx + d * apexH},${cy + headR * k} ${cx + d * neckH},${cy + headR} ${cx + d * neckH},${cy + neckW}`);
      s.push(`L${cx},${cy + neckW}`); s.push(`L${w},${h}`);
    }
    if (bottom === 0) { s.push(`${lm(true)}0,${h}`); }
    else {
      const d = bottom, cx = pcx, cy = h;
      s.push(`L${cx + neckW},${cy}`); s.push(`L${cx + neckW},${cy + d * neckH}`);
      s.push(`C${cx + headR},${cy + d * neckH} ${cx + headR * k},${cy + d * apexH} ${cx},${cy + d * apexH}`);
      s.push(`C${cx - headR * k},${cy + d * apexH} ${cx - headR},${cy + d * neckH} ${cx - neckW},${cy + d * neckH}`);
      s.push(`L${cx - neckW},${cy}`); s.push(`L0,${h}`);
    }
    if (left === 0) { if (showBorder) s.push('L0,0'); }
    else {
      const d = left, cx = 0, cy = pcy;
      s.push(`L${cx},${cy + neckW}`); s.push(`L${cx - d * neckH},${cy + neckW}`);
      s.push(`C${cx - d * neckH},${cy + headR} ${cx - d * apexH},${cy + headR * k} ${cx - d * apexH},${cy}`);
      s.push(`C${cx - d * apexH},${cy - headR * k} ${cx - d * neckH},${cy - headR} ${cx - d * neckH},${cy - neckW}`);
      s.push(`L${cx},${cy - neckW}`); s.push('L0,0');
    }
    return s.join(' ');
  }

  // ── GÉOMÉTRIQUE — Demi-cercles parfaits (SVG arc A) ──
  if (cutStyle === 'geometrique') {
    const nr = Math.min(w, h) * 0.15;
    const pcx = w / 2, pcy = h / 2;
    const s: string[] = [];
    s.push('M0,0');
    if (top === 0) { s.push(`${lm(true)}${w},0`); }
    else { s.push(`L${pcx - nr},0`); s.push(`A${nr},${nr} 0 0,${top > 0 ? 0 : 1} ${pcx + nr},0`); s.push(`L${w},0`); }
    if (right === 0) { s.push(`${lm(true)}${w},${h}`); }
    else { s.push(`L${w},${pcy - nr}`); s.push(`A${nr},${nr} 0 0,${right > 0 ? 0 : 1} ${w},${pcy + nr}`); s.push(`L${w},${h}`); }
    if (bottom === 0) { s.push(`${lm(true)}0,${h}`); }
    else { s.push(`L${pcx + nr},${h}`); s.push(`A${nr},${nr} 0 0,${bottom > 0 ? 0 : 1} ${pcx - nr},${h}`); s.push(`L0,${h}`); }
    if (left === 0) { if (showBorder) s.push('L0,0'); }
    else { s.push(`L0,${pcy + nr}`); s.push(`A${nr},${nr} 0 0,${left > 0 ? 0 : 1} 0,${pcy - nr}`); s.push('L0,0'); }
    return s.join(' ');
  }

  // ── ENFANT — Comme Géométrique mais demi-cercles plus grands (rayon 25 %) ──
  {
    const nr = Math.min(w, h) * 0.25;
    const pcx = w / 2, pcy = h / 2;
    const s: string[] = [];
    s.push('M0,0');
    if (top === 0) { s.push(`${lm(true)}${w},0`); }
    else { s.push(`L${pcx - nr},0`); s.push(`A${nr},${nr} 0 0,${top > 0 ? 0 : 1} ${pcx + nr},0`); s.push(`L${w},0`); }
    if (right === 0) { s.push(`${lm(true)}${w},${h}`); }
    else { s.push(`L${w},${pcy - nr}`); s.push(`A${nr},${nr} 0 0,${right > 0 ? 0 : 1} ${w},${pcy + nr}`); s.push(`L${w},${h}`); }
    if (bottom === 0) { s.push(`${lm(true)}0,${h}`); }
    else { s.push(`L${pcx + nr},${h}`); s.push(`A${nr},${nr} 0 0,${bottom > 0 ? 0 : 1} ${pcx - nr},${h}`); s.push(`L0,${h}`); }
    if (left === 0) { if (showBorder) s.push('L0,0'); }
    else { s.push(`L0,${pcy + nr}`); s.push(`A${nr},${nr} 0 0,${left > 0 ? 0 : 1} 0,${pcy - nr}`); s.push('L0,0'); }
    return s.join(' ');
  }
}

/**
 * Génère une grille de pièces de puzzle avec encoches compatibles (tenon/mortaise alternés).
 * Retourne un tableau de { path, x, y } pour chaque pièce.
 */
function buildPuzzleGridPaths(
  cols: number,
  rows: number,
  svgW: number,
  svgH: number,
  cutStyle: PuzzleCutStyleLocal = 'classique',
  showBorder: boolean = true
): Array<{ path: string; x: number; y: number }> {
  const cellW = svgW / cols;
  const cellH = svgH / rows;
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
      const eSeeds = {
        top:    r === 0        ? 0 : (r - 1) * 100 + c,
        bottom: r === rows - 1 ? 0 : r * 100 + c,
        left:   c === 0        ? 0 : r * 100 + (c - 1) + 5000,
        right:  c === cols - 1 ? 0 : r * 100 + c + 5000,
      };
      const path = buildPuzzlePathLocal(cellW, cellH, edges, cutStyle, showBorder, eSeeds);
      pieces.push({ path, x, y });
    }
  }
  return pieces;
}

interface PuzzleSectionProps {
  canvasFormat: CanvasFormat;
  canvasOpenings?: Array<{ id: string; shape: string; openingColor: string; validated: boolean; name: string }>;
  onGenerateFullPagePuzzle?: (cols: number, rows: number, showNumbers?: boolean, transparent?: boolean, numberSize?: 'small' | 'medium' | 'large', cutStyle?: 'classique' | 'geometrique' | 'enfant', showBorder?: boolean) => void;
  onExportLaserSVG?: () => void;
}

function PuzzleSection({ canvasFormat, canvasOpenings, onGenerateFullPagePuzzle, onExportLaserSVG }: PuzzleSectionProps) {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const [puzzlePieceCount, setPuzzlePieceCount] = useState<number>(16);
  const [showPuzzleNumbers, setShowPuzzleNumbers] = useState<boolean>(false);
  const [puzzleNumberSize, setPuzzleNumberSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [puzzleCutStyle, setPuzzleCutStyle] = useState<PuzzleCutStyleLocal>('classique');
  const [puzzleShowBorder, setPuzzleShowBorder] = useState<boolean>(true);

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
    () => buildPuzzleGridPaths(cols, rows, innerW, innerH, puzzleCutStyle, puzzleShowBorder),
    [cols, rows, innerW, innerH, puzzleCutStyle, puzzleShowBorder]
  );

  return (
    <div className="space-y-3">
      {/* Description */}
      <p className="text-xs text-gray-500 italic">
        {fr
          ? "Générateur de gabarit puzzle SVG pour découpe laser. Choisissez le nombre de pièces, générez, puis exportez."
          : "SVG puzzle template generator for laser cutting. Choose piece count, generate, then export."}
      </p>

      {/* S\u00e9lecteur du nombre de pi\u00e8ces */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-1.5">
          {fr ? "Nombre de pi\u00e8ces" : "Number of pieces"}
        </p>
        <div className="flex flex-wrap gap-1">
          {(puzzleCutStyle === 'enfant'
            ? [4, 6, 9] as const
            : PUZZLE_PIECE_COUNTS_SECTION
          ).map(n => (
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

      {/* Modèle de découpe */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-1.5">
          {fr ? "Modèle de découpe" : "Cut style"}
        </p>
        <div className="grid grid-cols-3 gap-1">
          {([
            { id: 'classique' as const,   labelFr: 'Classique',   labelEn: 'Classic',     descFr: 'Vrai puzzle traditionnel',     descEn: 'Traditional puzzle' },
            { id: 'geometrique' as const, labelFr: 'Géométrique', labelEn: 'Geometric',   descFr: 'Demi-cercles symétriques',     descEn: 'Round symmetric notches' },
            { id: 'enfant' as const,      labelFr: 'Enfant',      labelEn: 'Kids',        descFr: 'Grandes pièces arrondies',     descEn: 'Large rounded pieces' },
          ]).map(style => (
            <button
              key={style.id}
              className={`px-2 py-1.5 rounded text-left border transition-colors ${
                puzzleCutStyle === style.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
              }`}
              onClick={() => {
                setPuzzleCutStyle(style.id);
                if (style.id === 'enfant' && puzzlePieceCount > 9) setPuzzlePieceCount(9);
              }}
            >
              <span className="text-xs font-medium block">{fr ? style.labelFr : style.labelEn}</span>
              <span className={`text-[10px] block ${puzzleCutStyle === style.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                {fr ? style.descFr : style.descEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Toggle bordure extérieure */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">
            {fr ? "Bordure extérieure" : "Outer border"}
          </span>
          <span className="text-xs text-gray-400 italic">
            {fr ? "Cadre autour du puzzle" : "Frame around the puzzle"}
          </span>
        </div>
        <button
          role="switch"
          aria-checked={puzzleShowBorder}
          onClick={() => setPuzzleShowBorder(v => !v)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            puzzleShowBorder ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              puzzleShowBorder ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
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
                fill="none"
                stroke="#4338ca"
                strokeWidth={0.5}
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

      {/* Bouton Générer */}
      <button
        className="w-full py-2 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
        onClick={() => {
          if (onGenerateFullPagePuzzle) {
            onGenerateFullPagePuzzle(cols, rows, showPuzzleNumbers, true, puzzleNumberSize, puzzleCutStyle, puzzleShowBorder);
          }
        }}
      >
        {fr ? `Générer le puzzle (${puzzlePieceCount} pièces)` : `Generate puzzle (${puzzlePieceCount} pieces)`}
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
            ? (fr ? 'Télécharger le SVG de découpe laser' : 'Download laser cut SVG')
            : (fr ? "Générez le puzzle d'abord" : 'Generate the puzzle first')
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {fr
          ? (canvasOpenings && canvasOpenings.length > 0
              ? `Télécharger SVG laser (${canvasOpenings.length} pièce${canvasOpenings.length > 1 ? 's' : ''})`
              : 'Télécharger SVG laser')
          : (canvasOpenings && canvasOpenings.length > 0
              ? `Download laser SVG (${canvasOpenings.length} piece${canvasOpenings.length > 1 ? 's' : ''})`
              : 'Download laser SVG')}
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
export type SectionId =
  | "passe-partout"
  | "montage-pp"
  | "pelemele-modele"
  | "montage-pelemele"
  | "collage"
  | "texte"
  | "puzzle";

interface SectionDef {
  id: SectionId;
  labelFr: string;
  labelEn: string;
  icon: React.ElementType;
}

const SECTIONS: SectionDef[] = [
  { id: "passe-partout",    labelFr: "Passe-partout modèle",        labelEn: "Mat frame template",        icon: Frame              },
  { id: "montage-pp",       labelFr: "Montage / Passe-partout",     labelEn: "Montage / Mat frame",       icon: Frame              },
  { id: "pelemele-modele",  labelFr: "Pêle-mêle modèle",           labelEn: "Photo collage template",    icon: RectangleHorizontal },
  { id: "montage-pelemele", labelFr: "Montage / Pêle-mêle",        labelEn: "Montage / Collage",         icon: RectangleHorizontal },
  { id: "collage",          labelFr: "Collage",                     labelEn: "Collage",                   icon: Square              },
  { id: "texte",            labelFr: "Texte & Typographie",         labelEn: "Text & Typography",         icon: Type                },
  { id: "puzzle",           labelFr: "Puzzle",                      labelEn: "Puzzle",                    icon: Puzzle              },
];

export default function AssemblagePanel(props: AssemblagePanelProps) {
  const { language } = useLanguage();
  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  const toggle = (id: SectionId) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const filteredSections = props.visibleSections
    ? SECTIONS.filter((s) => props.visibleSections!.includes(s.id))
    : SECTIONS;

  return (
    <div className="space-y-1">
      {filteredSections.map((section) => {
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
                {(section.id === "passe-partout" || section.id === "montage-pp") && (
                  <>
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
                    {section.id === "passe-partout" && props.onSelectModele && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <BibliothequeModeles
                          categories={["passe-partout"]}
                          onSelectModele={props.onSelectModele}
                        />
                      </div>
                    )}
                  </>
                )}
                {section.id === "pelemele-modele" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 italic">
                      {language === "fr"
                        ? "Créez une disposition vierge de pêle-mêle avec plusieurs ouvertures de formes variées."
                        : "Create a blank collage layout with multiple openings of various shapes."}
                    </p>
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
                    {props.onSelectModele && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <BibliothequeModeles
                          categories={["pele-mele"]}
                          onSelectModele={props.onSelectModele}
                        />
                      </div>
                    )}
                  </div>
                )}
                {section.id === "montage-pelemele" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 italic">
                      {language === "fr"
                        ? "Disposition pêle-mêle avec photos. Glissez vos photos dans les ouvertures."
                        : "Collage layout with photos. Drag your photos into the openings."}
                    </p>
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
                  </div>
                )}
                {section.id === "collage" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 italic">
                      {language === "fr"
                        ? "Composition libre. Glissez des photos sur le canvas et disposez-les comme vous le souhaitez."
                        : "Free composition. Drag photos onto the canvas and arrange them as you like."}
                    </p>
                  </div>
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
