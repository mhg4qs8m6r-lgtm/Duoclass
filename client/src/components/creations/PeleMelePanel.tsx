/**
 * PeleMelePanel.tsx
 * Panneau latéral pour créer et éditer un pêle-mêle (papier percé).
 *
 * Architecture 4 couches :
 *   Couche 4 — décorations (cliparts, bordures)
 *   Couche 3 — papier percé (couleur/image + trous découpés)
 *   Couche 2 — photos (visibles uniquement à travers les trous)
 *   Couche 1 — fond blanc de la page
 *
 * La couleur du papier est gérée par la section "A - Fond / Papier peint"
 * de AssemblagePanel (évite la redondance).
 */

import { useState } from "react";
import { Trash2, Image as ImageIcon } from "lucide-react";

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

// ── Données des formes (pour l'affichage de la liste des trous) ───────────────

const HOLE_SHAPES: Array<{
  id: HoleDescriptor["shape"];
  labelFr: string;
  labelEn: string;
}> = [
  { id: "rect",    labelFr: "Rectangle", labelEn: "Rectangle" },
  { id: "square",  labelFr: "Carré",     labelEn: "Square"    },
  { id: "round",   labelFr: "Cercle",    labelEn: "Circle"    },
  { id: "oval",    labelFr: "Ovale",     labelEn: "Oval"      },
  { id: "arch",    labelFr: "Arche",     labelEn: "Arch"      },
  { id: "heart",   labelFr: "Cœur",      labelEn: "Heart"     },
  { id: "star",    labelFr: "Étoile",    labelEn: "Star"      },
  { id: "diamond", labelFr: "Losange",   labelEn: "Diamond"   },
];

// ── Composant ─────────────────────────────────────────────────────────────────

export function PeleMelePanel({
  language,
  paper,
  selectedHoleId,
  onRemovePaper,
  onSetPaperImage,
  onRemoveHole,
  onSelectHole,
}: PeleMelePanelProps) {
  const fr = language === "fr";
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState(paper?.imageUrl ?? "");

  return (
    <div className="space-y-4 p-1">

      {/* ── Image de fond + Supprimer — seulement si le fond existe ── */}
      {paper && (
        <div className="space-y-2">
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

          <button
            onClick={onRemovePaper}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <Trash2 size={12} />
            {fr ? "Supprimer le fond percé" : "Remove perforated paper"}
          </button>
        </div>
      )}

      {/* ── Section : liste des trous ── */}
      {paper && paper.holes.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {fr ? `Trous (${paper.holes.length})` : `Holes (${paper.holes.length})`}
          </h4>

          <div className="space-y-1">
            {paper.holes.map((hole, idx) => {
              const shape = HOLE_SHAPES.find((s) => s.id === hole.shape);
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
