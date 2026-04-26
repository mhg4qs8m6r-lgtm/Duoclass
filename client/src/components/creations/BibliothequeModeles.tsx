/**
 * BibliothequeModeles – affiche les modèles partagés depuis PostgreSQL.
 * Admin peut supprimer des modèles ; tous les users peuvent les utiliser.
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { X, Trash2 } from "lucide-react";
import CrispThumbnail from "@/components/ui/CrispThumbnail";

const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  "passe-partout": { fr: "Passe-partout", en: "Mat frames" },
  "pele-mele":     { fr: "Pêle-mêle",    en: "Collage layouts" },
  "cadres":        { fr: "Cadres",        en: "Frames" },
  "bordures":      { fr: "Bordures",      en: "Borders" },
};

interface BibliothequeModelesProps {
  categories: string[];
  onSelectModele: (imageDataUrl: string, filename: string) => void;
}

export default function BibliothequeModeles({ categories, onSelectModele }: BibliothequeModelesProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: index, refetch, isLoading, isError } = trpc.sync.sharedModeles.getAll.useQuery(undefined, {
    staleTime: 30_000,
    retry: 2,
  });
  const deleteMut = trpc.sync.sharedModeles.delete.useMutation({
    onSuccess: () => refetch(),
  });
  const clearAllMut = trpc.sync.sharedModeles.clearAll.useMutation({
    onSuccess: () => { setConfirmClear(false); refetch(); },
  });

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMut.mutate({ id });
  };

  if (isLoading) {
    return (
      <p className="text-xs text-gray-400 italic text-center py-4">
        {language === "fr" ? "Chargement des modèles..." : "Loading templates..."}
      </p>
    );
  }

  if (isError || !index) {
    return (
      <p className="text-xs text-red-400 italic text-center py-4">
        {language === "fr"
          ? "Erreur de chargement des modèles — vérifiez la connexion"
          : "Failed to load templates — check connection"}
      </p>
    );
  }

  const visibleCats = categories.filter((c) => index[c] && index[c].length > 0);
  if (visibleCats.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic text-center py-4">
        {language === "fr"
          ? "Aucun modèle disponible"
          : "No templates available"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-end">
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">
                {language === "fr" ? "Vider toute la bibliothèque ?" : "Clear entire library?"}
              </span>
              <button
                onClick={() => clearAllMut.mutate()}
                disabled={clearAllMut.isPending}
                className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {language === "fr" ? "Confirmer" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                {language === "fr" ? "Annuler" : "Cancel"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
              title={language === "fr" ? "Vider tous les modèles" : "Clear all templates"}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {language === "fr" ? "Vider tout" : "Clear all"}
            </button>
          )}
        </div>
      )}
      {visibleCats.map((cat) => (
        <div key={cat}>
          {visibleCats.length > 1 && (
            <p className="text-xs font-medium text-gray-500 mb-1">
              {CATEGORY_LABELS[cat]?.[language] ?? cat}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {index[cat].map((item) => (
              <div key={item.id} className="relative group">
                {isAdmin && (
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="absolute top-0 right-0 z-10 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center transition-opacity shadow-sm hover:bg-red-600"
                    title={language === "fr" ? "Supprimer ce modèle" : "Delete this template"}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onSelectModele(item.imageData, item.filename)}
                  className="w-full flex flex-col items-center gap-1 rounded-lg border border-gray-300 bg-white p-2 hover:border-purple-400 hover:shadow-md transition-all"
                  title={item.filename}
                >
                  <div className="w-full aspect-square rounded border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                    <CrispThumbnail
                      src={item.imageData}
                      alt={item.filename}
                      className="w-full h-full object-contain rounded"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-purple-500">
                    {item.filename.split(".").pop()?.toUpperCase() ?? "PNG"}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
