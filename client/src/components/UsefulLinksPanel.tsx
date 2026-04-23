/**
 * UsefulLinksPanel — panneau "Adresses Utiles"
 * Admin : formulaire CRUD avec tags (cases à cocher)
 * User  : lecture seule, filtre par tag, grille 2 colonnes (1 col mobile)
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_TAGS = [
  { value: "atelier-creations", labelFr: "Atelier Créations", labelEn: "Creations Workshop" },
  { value: "albums-photos", labelFr: "Albums / Photos", labelEn: "Albums / Photos" },
  { value: "assemblage", labelFr: "Assemblage", labelEn: "Assembly" },
  { value: "calques", labelFr: "Calques", labelEn: "Layers" },
  { value: "divers", labelFr: "Divers", labelEn: "Misc" },
];

interface UsefulLinksPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function UsefulLinksPanel({ open, onClose }: UsefulLinksPanelProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: links, refetch, isLoading } = trpc.sync.usefulLinks.getAll.useQuery(undefined, {
    staleTime: 30_000,
    enabled: open,
  });
  const createMut = trpc.sync.usefulLinks.create.useMutation({ onSuccess: () => refetch() });
  const updateMut = trpc.sync.usefulLinks.update.useMutation({ onSuccess: () => refetch() });
  const deleteMut = trpc.sync.usefulLinks.delete.useMutation({ onSuccess: () => refetch() });

  // Filtre par tag (user)
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Formulaire admin
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormTitle("");
    setFormDesc("");
    setFormUrl("");
    setFormTags([]);
  };

  const openEdit = (link: { id: number; title: string; description: string; url: string; tags: unknown }) => {
    setEditId(link.id);
    setFormTitle(link.title);
    setFormDesc(link.description);
    setFormUrl(link.url);
    setFormTags(Array.isArray(link.tags) ? link.tags as string[] : []);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formUrl.trim()) {
      toast.error(language === "fr" ? "Titre et URL requis" : "Title and URL required");
      return;
    }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, title: formTitle, description: formDesc, url: formUrl, tags: formTags });
        toast.success(language === "fr" ? "Lien modifié" : "Link updated");
      } else {
        const result = await createMut.mutateAsync({ title: formTitle, description: formDesc, url: formUrl, tags: formTags });
        if (!result.success) {
          toast.error(language === "fr" ? "Échec — vérifiez la base de données" : "Failed — check database");
          return;
        }
        toast.success(language === "fr" ? "Lien ajouté" : "Link added");
      }
      resetForm();
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMut.mutateAsync({ id });
    toast.success(language === "fr" ? "Lien supprimé" : "Link deleted");
  };

  const toggleTag = (tag: string) => {
    setFormTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const filtered = links?.filter((l) => {
    if (!activeTag) return true;
    return Array.isArray(l.tags) && (l.tags as string[]).includes(activeTag);
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            {language === "fr" ? "Adresses Utiles" : "Useful Links"}
          </DialogTitle>
        </DialogHeader>

        {/* Filtres par tag */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              !activeTag ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {language === "fr" ? "Tous" : "All"}
          </button>
          {AVAILABLE_TAGS.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTag(activeTag === t.value ? null : t.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTag === t.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {language === "fr" ? t.labelFr : t.labelEn}
            </button>
          ))}
        </div>

        {/* Bouton ajouter (admin) */}
        {isAdmin && !showForm && (
          <Button size="sm" className="gap-1 mb-3" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            {language === "fr" ? "Ajouter un lien" : "Add a link"}
          </Button>
        )}

        {/* Formulaire admin */}
        {isAdmin && showForm && (
          <div className="border rounded-lg p-4 mb-3 bg-gray-50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">{editId ? (language === "fr" ? "Modifier" : "Edit") : (language === "fr" ? "Nouveau lien" : "New link")}</span>
              <button onClick={resetForm}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div>
              <Label className="text-xs">{language === "fr" ? "Titre" : "Title"} *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="ex: Tutoriel DuoClass" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder={language === "fr" ? "Courte description..." : "Short description..."} />
            </div>
            <div>
              <Label className="text-xs">URL *</Label>
              <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((t) => (
                  <label key={t.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formTags.includes(t.value)}
                      onChange={() => toggleTag(t.value)}
                      className="rounded border-gray-300"
                    />
                    {language === "fr" ? t.labelFr : t.labelEn}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                {editId
                  ? (language === "fr" ? "Enregistrer" : "Save")
                  : (language === "fr" ? "Envoyer dans l'appli" : "Send to app")}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>
                {language === "fr" ? "Annuler" : "Cancel"}
              </Button>
            </div>
          </div>
        )}

        {/* Liste des liens */}
        {isLoading ? (
          <p className="text-xs text-gray-400 italic text-center py-4">
            {language === "fr" ? "Chargement..." : "Loading..."}
          </p>
        ) : !filtered || filtered.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-8">
            {language === "fr" ? "Aucune adresse utile" : "No useful links"}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((link) => (
              <div
                key={link.id}
                className="group border rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0"
                  >
                    <h3 className="text-sm font-semibold text-blue-700 hover:underline truncate">
                      {link.title}
                    </h3>
                    {link.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{link.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1 truncate">{link.url}</p>
                  </a>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEdit(link)} className="p-1 hover:bg-gray-100 rounded" title="Modifier">
                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(link.id)} className="p-1 hover:bg-red-50 rounded" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
                {Array.isArray(link.tags) && (link.tags as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(link.tags as string[]).map((tag) => {
                      const def = AVAILABLE_TAGS.find((t) => t.value === tag);
                      return (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500">
                          {def ? (language === "fr" ? def.labelFr : def.labelEn) : tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
