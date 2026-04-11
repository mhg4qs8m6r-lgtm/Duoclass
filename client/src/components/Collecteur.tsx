import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CrispThumbnail from "@/components/ui/CrispThumbnail";

/** Un élément stocké dans le Collecteur */
export interface CollecteurItem {
  id: string;
  src: string;
  name: string;
  thumbnail?: string;
  widthCm?: number;
  heightCm?: number;
}

interface CollecteurProps {
  items: CollecteurItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

/**
 * Collecteur — organe indépendant affiché à droite dans l'Atelier.
 * Zone de réception d'éléments avec suppression individuelle (croix rouge)
 * et bouton « Vider » avec confirmation.
 */
export default function Collecteur({ items, onRemoveItem, onClearAll }: CollecteurProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex flex-col h-full border border-gray-300 bg-white rounded">
      {/* Titre */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-700">Collecteur</h3>
        {items.length > 0 && !showConfirm && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowConfirm(true)}
          >
            Vider
          </Button>
        )}
      </div>

      {/* Confirmation de vidage */}
      {showConfirm && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <p className="text-xs text-amber-800 mb-2">
            Êtes-vous sûr de vouloir vider le Collecteur ?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-6 px-3 text-xs"
              onClick={() => {
                onClearAll();
                setShowConfirm(false);
              }}
            >
              Oui
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-3 text-xs"
              onClick={() => setShowConfirm(false)}
            >
              Non
            </Button>
          </div>
        </div>
      )}

      {/* Zone d'éléments */}
      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-wrap gap-2 justify-center">
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", JSON.stringify({
                  src: item.src,
                  name: item.name,
                  widthCm: item.widthCm,
                  heightCm: item.heightCm,
                }));
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="relative bg-white rounded border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200 group w-28"
            >
              <CrispThumbnail
                src={item.thumbnail || item.src}
                alt={item.name}
                className="w-full h-auto object-contain rounded"
              />
              {/* Croix rouge suppression individuelle */}
              <button
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={() => onRemoveItem(item.id)}
                title="Supprimer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-8 px-4">
              Aucun élément
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
