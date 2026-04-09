/**
 * BibliothequeModeles – affiche les miniatures des modèles disponibles
 * dans client/public/modeles/<category>/.
 *
 * L'index est généré automatiquement par le plugin Vite (vite-plugin-modeles-index).
 * Quand Papy glisse un fichier dans un sous-dossier, il apparaît ici sans intervention.
 */
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X } from "lucide-react";
import CrispThumbnail from "@/components/ui/CrispThumbnail";

type ModelesIndex = Record<string, string[]>;

const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  "passe-partout": { fr: "Passe-partout", en: "Mat frames" },
  "pele-mele":     { fr: "Pêle-mêle",    en: "Collage layouts" },
  "cadres":        { fr: "Cadres",        en: "Frames" },
  "bordures":      { fr: "Bordures",      en: "Borders" },
};

interface BibliothequeModelesProps {
  /** Sous-dossier(s) à afficher (ex. ["passe-partout"] ou ["cadres","bordures"]) */
  categories: string[];
  /** Appelé quand l'utilisateur clique sur un modèle – reçoit l'URL publique du fichier */
  onSelectModele: (url: string, filename: string) => void;
}

export default function BibliothequeModeles({ categories, onSelectModele }: BibliothequeModelesProps) {
  const { language } = useLanguage();
  const [index, setIndex] = useState<ModelesIndex | null>(null);
  const [error, setError] = useState(false);

  const fetchIndex = useCallback(() => {
    fetch("/api/modeles/index.json")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data: ModelesIndex) => {
        setIndex(data);
        setError(false);
      })
      .catch(() => {
        // Fallback: try static file (production build)
        fetch("/modeles/index.json")
          .then((r) => r.json())
          .then((data: ModelesIndex) => setIndex(data))
          .catch(() => setError(true));
      });
  }, []);

  useEffect(() => {
    fetchIndex();
    // Re-fetch every 3s to pick up new files dropped by Papy
    const interval = setInterval(fetchIndex, 3000);
    return () => clearInterval(interval);
  }, [fetchIndex]);

  const handleDelete = async (cat: string, filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/modeles/${encodeURIComponent(cat)}/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      // Update local state immediately
      setIndex((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [cat]: prev[cat].filter((f) => f !== filename),
        };
      });
    } catch {
      // Silently fail — the watcher will resync anyway
    }
  };

  if (error || !index) return null;

  // Filtrer les catégories demandées qui ont au moins 1 fichier
  const visibleCats = categories.filter((c) => index[c] && index[c].length > 0);
  if (visibleCats.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic text-center py-4">
        {language === "fr"
          ? "Aucun modèle. Glissez des fichiers dans ~/Desktop/DuoClass-Modeles/"
          : "No templates. Drop files into ~/Desktop/DuoClass-Modeles/"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visibleCats.map((cat) => (
        <div key={cat}>
          {visibleCats.length > 1 && (
            <p className="text-xs font-medium text-gray-500 mb-1">
              {CATEGORY_LABELS[cat]?.[language] ?? cat}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {index[cat].map((filename) => {
              const url = `/modeles/${cat}/${filename}`;
              const ext = filename.split(".").pop()!.toUpperCase();
              const isPdf = ext === "PDF";
              return (
                <div key={filename} className="relative group">
                  {/* Bouton supprimer */}
                  <button
                    onClick={(e) => handleDelete(cat, filename, e)}
                    className="absolute top-0 right-0 z-10 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                    title={language === "fr" ? "Supprimer ce modèle" : "Delete this template"}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {/* Miniature */}
                  <button
                    onClick={() => onSelectModele(url, filename)}
                    className="w-full flex flex-col items-center gap-1 rounded-lg border border-gray-300 bg-white p-2 hover:border-purple-400 hover:shadow-md transition-all"
                    title={filename}
                  >
                    <div className="w-full aspect-square rounded border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                      {isPdf ? (
                        <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-purple-500">
                          <span className="text-2xl">📄</span>
                          <span className="text-[10px] leading-tight px-1 truncate w-full text-center">
                            {filename}
                          </span>
                        </div>
                      ) : (
                        <CrispThumbnail
                          src={url}
                          alt={filename}
                          className="w-full h-full rounded"
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 group-hover:text-purple-500">
                      {ext}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
