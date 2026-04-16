import { useState, useEffect, useRef, useCallback } from "react";
import { Folder, Image, Frame, Square, Circle, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { db, BibliothequeItemDB, addBibliothequeItem, deleteBibliothequeItemSync } from "@/db";
import { toast } from "sonner";

interface BibliothequeToolsPanelProps {
  onSelectItem: (src: string, name: string) => void;
}

type BibliothequeCategory = "cliparts" | "cadres" | "masques" | "arriereplan" | "mes-elements";

export default function BibliothequeToolsPanel({
  onSelectItem,
}: BibliothequeToolsPanelProps) {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<BibliothequeCategory>("cliparts");
  const [userItems, setUserItems] = useState<BibliothequeItemDB[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Charger les éléments de l'utilisateur
  useEffect(() => {
    const loadUserItems = async () => {
      const items = await db.bibliotheque_items.toArray();
      setUserItems(items);
    };
    loadUserItems();
  }, []);
  
  // Catégories de la bibliothèque
  const categories = [
    { id: "cliparts", label: "Cliparts", icon: Image },
    { id: "cadres", label: "Cadres", icon: Frame },
    { id: "masques", label: "Masques", icon: Circle },
    { id: "arriereplan", label: language === "fr" ? "Arrière-plans" : "Backgrounds", icon: Square },
    { id: "mes-elements", label: language === "fr" ? "Mes éléments" : "My elements", icon: Folder },
  ];
  
  // Éléments par catégorie (pas d'éléments statiques pré-installés, tout vient de l'import utilisateur)
  const staticItems: Record<string, { src: string; name: string }[]> = {
    cliparts: [],
    cadres: [],
    masques: [],
    arriereplan: [],
  };

  // Mapping catégorie active → type BibliothequeItemDB
  const categoryToType: Record<BibliothequeCategory, BibliothequeItemDB["type"]> = {
    "cliparts": "clipart",
    "cadres": "cadre",
    "masques": "masque",
    "arriereplan": "arrierePlan",
    "mes-elements": "import",
  };

  const categoryLabels: Record<BibliothequeCategory, { fr: string; en: string }> = {
    "cliparts": { fr: "Cliparts", en: "Cliparts" },
    "cadres": { fr: "Cadres", en: "Frames" },
    "masques": { fr: "Masques", en: "Masks" },
    "arriereplan": { fr: "Arrière-plans", en: "Backgrounds" },
    "mes-elements": { fr: "Mes éléments", en: "My elements" },
  };

  // --- Import de fichiers (glisser-déposer ou bouton) ---
  const importFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => 
      f.type.startsWith("image/") || f.name.match(/\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i)
    );
    
    if (imageFiles.length === 0) {
      toast.error(language === "fr" ? "Aucune image trouvée dans les fichiers" : "No images found in files");
      return;
    }

    const targetType = categoryToType[activeCategory];
    const targetLabel = language === "fr" ? categoryLabels[activeCategory].fr : categoryLabels[activeCategory].en;

    let imported = 0;
    for (const file of imageFiles) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Créer une miniature (max 150px)
        const thumbnail = await new Promise<string>((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxSize = 150;
            const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });

        const itemName = file.name.replace(/\.[^/.]+$/, "");
        const catMap: Record<BibliothequeCategory, BibliothequeItemDB['category']> = {
          'cliparts': 'cliparts',
          'cadres': 'cadres',
          'masques': 'masques',
          'arriereplan': 'arriere-plans',
          'mes-elements': 'mes-elements',
        };
        const newItem: BibliothequeItemDB = {
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          category: catMap[activeCategory],
          type: targetType,
          name: itemName,
          url: thumbnail,
          thumbnail,
          fullImage: dataUrl,
          addedAt: Date.now(),
          createdAt: Date.now(),
        };

        await addBibliothequeItem(newItem);
        setUserItems(prev => [...prev, newItem]);
        imported++;
      } catch (err) {
        console.error("Erreur import fichier:", file.name, err);
      }
    }

    if (imported > 0) {
      toast.success(
        language === "fr"
          ? `${imported} élément(s) importé(s) dans "${targetLabel}"`
          : `${imported} item(s) imported to "${targetLabel}"`
      );
    }
  }, [language, activeCategory]);

  // --- Gestionnaires de drag & drop ---
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      importFiles(e.dataTransfer.files);
    }
  }, [importFiles]);

  // Suppression d'un élément utilisateur (mes-elements)
  const handleDeleteUserItem = async (item: BibliothequeItemDB, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = language === "fr"
      ? `Supprimer "${item.name}" de votre bibliothèque ?`
      : `Delete "${item.name}" from your library?`;
    if (window.confirm(confirmMsg)) {
      try {
        await deleteBibliothequeItemSync(item.id!);
        setUserItems(prev => prev.filter(i => i.id !== item.id));
        toast.success(language === "fr" ? "Élément supprimé" : "Item deleted");
      } catch (err) {
        console.error("Erreur suppression élément bibliothèque:", err);
        toast.error(language === "fr" ? "Erreur lors de la suppression" : "Error deleting item");
      }
    }
  };

  // Suppression d'un élément statique
  const [hiddenStaticItems, setHiddenStaticItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("duoclass_hidden_biblio_items");
      if (stored) setHiddenStaticItems(JSON.parse(stored));
    } catch {}
  }, []);

  const handleDeleteStaticItem = (itemSrc: string, itemName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = language === "fr"
      ? `Masquer "${itemName}" de la bibliothèque ?`
      : `Hide "${itemName}" from the library?`;
    if (window.confirm(confirmMsg)) {
      const updated = [...hiddenStaticItems, itemSrc];
      setHiddenStaticItems(updated);
      localStorage.setItem("duoclass_hidden_biblio_items", JSON.stringify(updated));
      toast.success(language === "fr" ? "Élément masqué" : "Item hidden");
    }
  };
  
  // Obtenir les éléments de la catégorie active
  const getCurrentItems = () => {
    // Éléments utilisateur de cette catégorie
    const targetType = categoryToType[activeCategory];
    const userCatItems = userItems
      .filter(item => item.type === targetType)
      .map(item => ({
        src: item.fullImage,
        thumbnail: item.thumbnail || item.fullImage,
        name: item.name,
        isUser: true,
        dbItem: item,
      }));

    if (activeCategory === "mes-elements") {
      // "Mes éléments" montre aussi tous les imports sans catégorie spécifique
      const allImports = userItems
        .filter(item => item.type === "import")
        .map(item => ({
          src: item.fullImage,
          thumbnail: item.thumbnail || item.fullImage,
          name: item.name,
          isUser: true,
          dbItem: item,
        }));
      return allImports;
    }

    // Éléments statiques + éléments utilisateur de cette catégorie
    const items = staticItems[activeCategory] || [];
    const staticFiltered = items
      .filter(item => !hiddenStaticItems.includes(item.src))
      .map(item => ({
        ...item,
        thumbnail: item.src,
        isUser: false,
        dbItem: undefined as BibliothequeItemDB | undefined,
      }));
    
    return [...staticFiltered, ...userCatItems];
  };
  
  const currentItems = getCurrentItems();
  
  return (
    <div
      className="space-y-3 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Overlay de drag & drop */}
      {isDragging && (
        <div className="absolute inset-0 bg-purple-100/90 border-2 border-dashed border-purple-500 rounded-lg z-50 flex flex-col items-center justify-center gap-2">
          <Upload className="w-10 h-10 text-purple-500 animate-bounce" />
          <p className="text-sm font-medium text-purple-700">
            {language === "fr" ? "Déposez vos images ici" : "Drop your images here"}
          </p>
          <p className="text-xs text-purple-500">
            PNG, JPG, SVG, GIF, WebP
          </p>
        </div>
      )}

      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            importFiles(e.target.files);
            e.target.value = ""; // Reset pour permettre le re-import du même fichier
          }
        }}
      />

      {/* Onglets de catégories */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? "default" : "outline"}
            size="sm"
            className={`text-xs gap-1 ${activeCategory === cat.id ? "bg-purple-500" : ""}`}
            onClick={() => setActiveCategory(cat.id as BibliothequeCategory)}
          >
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Bouton importer (visible dans toutes les catégories) */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs gap-1 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-500"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-3.5 h-3.5" />
        {language === "fr" 
          ? `Importer dans "${categoryLabels[activeCategory].fr}"...`
          : `Import to "${categoryLabels[activeCategory].en}"...`}
      </Button>
      
      {/* Grille d'éléments */}
      <ScrollArea className="h-[300px]">
        <div className="grid grid-cols-3 gap-2">
          {currentItems.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="relative group bg-white rounded border shadow-sm cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all p-1 flex items-center justify-center" style={{ height: '80px' }}
              onClick={() => onSelectItem(item.src ?? '', item.name)}
              title={item.name}
            >
              <img
                src={item.thumbnail || item.src}
                alt={item.name}
                className="w-full h-full object-contain"
                style={{ filter: 'contrast(200%) brightness(0.8)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/placeholder.png";
                }}
              />
              {/* Nom de l'élément */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity rounded-b">
                {item.name}
              </div>
              {/* Bouton supprimer au survol */}
              <button
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
                title={language === "fr" ? "Supprimer" : "Delete"}
                onClick={(e) => {
                  if (item.isUser && item.dbItem) {
                    handleDeleteUserItem(item.dbItem, e);
                  } else {
                    handleDeleteStaticItem(item.src ?? '', item.name, e);
                  }
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          {currentItems.length === 0 && activeCategory === "mes-elements" && (
            <div className="col-span-3 text-center text-gray-400 text-xs py-6">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>{language === "fr" ? "Aucun élément importé" : "No imported items"}</p>
              <p className="text-[10px] mt-1">
                {language === "fr" 
                  ? "Glissez des images depuis votre bureau ou cliquez sur \"Importer\"" 
                  : "Drag images from your desktop or click \"Import\""}
              </p>
            </div>
          )}

          {currentItems.length === 0 && activeCategory !== "mes-elements" && (
            <div className="col-span-3 text-center text-gray-400 text-xs py-8">
              {language === "fr" 
                ? "Aucun élément dans cette catégorie"
                : "No items in this category"}
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Info */}
      <p className="text-[10px] text-gray-500 text-center">
        {language === "fr" 
          ? "Glissez des fichiers depuis le bureau ou cliquez pour ajouter"
          : "Drag files from desktop or click to add"}
      </p>
    </div>
  );
}
