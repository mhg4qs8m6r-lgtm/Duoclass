/**
 * PeleMelePanel.tsx
 * Panneau latéral pour créer et éditer un pêle-mêle (papier percé).
 *
 * Architecture 4 couches :
 *   Couche 4 — décorations (cliparts, bordures)
 *   Couche 3 — papier percé (couleur/image + trous découpés)
 *   Couche 2 — photos (visibles uniquement à travers les trous)
 *   Couche 1 — fond blanc de la page
 */

import { useState } from "react";
import {
  Square,
  Circle,
  RectangleHorizontal,
  Heart,
  Star,
  Diamond,
  Trash2,
  Plus,
  Palette,
  Image as ImageIcon,
} from "lucide-react";

// ── Types exportés ────────────────────────────────────────────────────────────

export interface HoleDescriptor {
  id: string;
  shape: "rect" | "square" | "round" | "oval" | "arch" | "heart" | "star" | "diamond";
  x: number;       // cm depuis le coin haut-gauche de la page
  y: number;       // cm
  w: number;       // cm largeur
  h: number;       // cm hauteur
  rotation: number; // degrés (0 par défaut)
}

export interface PeleMelePaperState {
  color: string;          // couleur du papier ex. "#f3e8d2"
  imageUrl?: string;      // image de fond optionnelle (semis floral, etc.)
  holes: HoleDescriptor[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PeleMelePanelProps {
  language: "fr" | "en";
  paper: PeleMelePaperState | null;
  selectedHoleId: string | null;
  /** Crée (ou recrée) le fond percé avec la couleur donnée */
  onCreatePaper: (color: string) => void;
  /** Supprime le fond percé (et toutes ses photos) */
  onRemovePaper: () => void;
  /** Change la couleur du papier existant */
  onSetPaperColor: (color: string) => void;
  /** Change l'image de fond du papier (null = supprimer) */
  onSetPaperImage: (imageUrl: string | null) => void;
  /** Ajoute un trou centré sur la page avec la forme donnée */
  onAddHole: (shape: HoleDescriptor["shape"]) => void;
  /** Supprime un trou par son id */
  onRemoveHole: (holeId: string) => void;
  /** Sélectionne un trou (pour le repositionner dans le canvas) */
  onSelectHole: (holeId: string | null) => void;
}

// ── Données des formes disponibles ────────────────────────────────────────────

const HOLE_SHAPES: Array<{
  id: HoleDescriptor["shape"];
  labelFr: string;
  labelEn: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "rect",    labelFr: "Rectangle", labelEn: "Rectangle", icon: RectangleHorizontal },
  { id: "square",  labelFr: "Carré",     labelEn: "Square",    icon: Square },
  { id: "round",   labelFr: "Cercle",    labelEn: "Circle",    icon: Circle },
  { id: "oval",    labelFr: "Ovale",     labelEn: "Oval",      icon: Circle },
  { id: "arch",    labelFr: "Arche",     labelEn: "Arch",      icon: RectangleHorizontal },
  { id: "heart",   labelFr: "Cœur",      labelEn: "Heart",     icon: Heart },
  { id: "star",    labelFr: "Étoile",    labelEn: "Star",      icon: Star },
  { id: "diamond", labelFr: "Losange",   labelEn: "Diamond",   icon: Diamond },
];

const DEFAULT_PAPER_COLOR = "#f0e6d3";

// ── Composant ─────────────────────────────────────────────────────────────────

export function PeleMelePanel({
  language,
  paper,
  selectedHoleId,
  onCreatePaper,
  onRemovePaper,
  onSetPaperColor,
  onSetPaperImage,
  onAddHole,
  onRemoveHole,
  onSelectHole,
}: PeleMelePanelProps) {
  const fr = language === "fr";
  const [newHoleShape, setNewHoleShape] = useState<HoleDescriptor["shape"]>("rect");
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState(paper?.imageUrl ?? "");

  return (
    <div className="space-y-4 p-1">

      {/* ── Section : papier (seulement si un fond percé existe) ── */}
      {paper && <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
          <Palette size={12} />
          {fr ? "Fond du papier" : "Paper background"}
        </h4>

        {/* Couleur */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 flex-1">{fr ? "Couleur" : "Color"}</span>
          <input
            type="color"
            value={paper.color}
            onChange={(e) => onSetPaperColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
          />
          <input
            type="text"
            value={paper.color}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onSetPaperColor(e.target.value);
            }}
            className="w-20 text-xs border border-gray-300 rounded px-1 py-1 font-mono"
          />
        </div>

        {/* Image de fond */}
        <div className="space-y-1">
          <button
            onClick={() => setShowImageInput((v) => !v)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <ImageIcon size={12} />
            {fr
              ? paper.imageUrl ? "Changer l'image" : "Ajouter une image de fond"
              : paper.imageUrl ? "Change image" : "Add background image"}
          </button>

          {paper.imageUrl && (
            <button
              onClick={() => onSetPaperImage(null)}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <Trash2 size={11} />
              {fr ? "Supprimer l'image" : "Remove image"}
            </button>
          )}

          {showImageInput && (
            <div className="flex gap-1">
              <input
                type="text"
                placeholder={fr ? "URL de l'image…" : "Image URL…"}
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 text-xs border border-gray-300 rounded px-1 py-1"
              />
              <button
                onClick={() => {
                  onSetPaperImage(imageUrlInput.trim() || null);
                  setShowImageInput(false);
                }}
                className="text-xs bg-blue-600 text-white px-2 rounded hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* Supprimer le fond */}
        <button
          onClick={onRemovePaper}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
        >
          <Trash2 size={12} />
          {fr ? "Supprimer le fond percé" : "Remove perforated paper"}
        </button>
      </div>}

      {/* ── Section : ajouter un trou ── */}
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {fr ? "Ajouter un trou" : "Add a hole"}
        </h4>

        {/* Grille de sélection de forme */}
        <div className="grid grid-cols-4 gap-1">
          {HOLE_SHAPES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setNewHoleShape(s.id)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded border text-xs transition-colors ${
                  newHoleShape === s.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-400 text-gray-600"
                }`}
                title={fr ? s.labelFr : s.labelEn}
              >
                <Icon size={16} />
                <span className="text-[9px] leading-tight">{fr ? s.labelFr : s.labelEn}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onAddHole(newHoleShape)}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors"
        >
          <Plus size={14} />
          {fr ? "Ajouter ce trou" : "Add this hole"}
        </button>
      </div>

      {/* ── Section : liste des trous ── */}
      {paper && paper.holes.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {fr ? `Trous (${paper.holes.length})` : `Holes (${paper.holes.length})`}
          </h4>

          <div className="space-y-1">
            {paper.holes.map((hole, idx) => {
              const shape = HOLE_SHAPES.find((s) => s.id === hole.shape);
              const Icon = shape?.icon ?? Square;
              const isSelected = selectedHoleId === hole.id;
              return (
                <div
                  key={hole.id}
                  className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                  onClick={() => onSelectHole(isSelected ? null : hole.id)}
                >
                  <Icon size={14} className="text-gray-500 shrink-0" />
                  <span className="flex-1 text-xs text-gray-700">
                    {fr ? (shape?.labelFr ?? hole.shape) : (shape?.labelEn ?? hole.shape)}
                    {" "}<span className="text-gray-400">#{idx + 1}</span>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {hole.w.toFixed(1)}×{hole.h.toFixed(1)} cm
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveHole(hole.id);
                    }}
                    className="text-red-400 hover:text-red-600 shrink-0"
                    title={fr ? "Supprimer ce trou" : "Delete this hole"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Aide photos ── */}
      <div className="border-t border-gray-200 pt-3">
        <p className="text-[10px] text-gray-400 italic leading-snug">
          {fr
            ? "Glissez vos photos depuis vos albums vers les trous pour les recadrer à l'intérieur."
            : "Drag your photos from albums into the holes to crop them inside."}
        </p>
      </div>
    </div>
  );
}
