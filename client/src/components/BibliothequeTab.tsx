import { useState } from "react";
import { 
  Scissors, 
  Image as ImageIcon, 
  Smile, 
  Circle, 
  Frame, 
  Palette, 
  Upload,
  Trash2,
  Plus,
  Search,
  GripVertical,
  SquareDashed,
  Type,
  Waves,
  CornerDownRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { BibliothequeItem, CollageElement } from "./CreationsAtelier";
import { toast } from "sonner";

interface BibliothequeTabProps {
  items: BibliothequeItem[];
  onRemove: (id: string) => void;
  onAddToCollage: (element: CollageElement) => void;
}

// Catégories de la bibliothèque
const categories = [
  { id: "detourage", label: { fr: "Mes Détourages", en: "My Cutouts" }, icon: Scissors },
  { id: "clipart", label: { fr: "Cliparts", en: "Cliparts" }, icon: ImageIcon },
  { id: "emotion", label: { fr: "Émotions", en: "Emotions" }, icon: Smile },
  { id: "masque", label: { fr: "Masques", en: "Masks" }, icon: Circle },
  { id: "cadre", label: { fr: "Cadres", en: "Frames" }, icon: Frame },
  { id: "bordure", label: { fr: "Bordures", en: "Borders" }, icon: SquareDashed },
  { id: "lettre", label: { fr: "Lettres", en: "Letters" }, icon: Type },
  { id: "frise", label: { fr: "Frises", en: "Friezes" }, icon: Waves },
  { id: "coin", label: { fr: "Coins", en: "Corners" }, icon: CornerDownRight },
  { id: "arrierePlan", label: { fr: "Arrière-plans", en: "Backgrounds" }, icon: Palette },
  { id: "import", label: { fr: "Mes Imports", en: "My Imports" }, icon: Upload },
];

// Éléments fournis par défaut (émotions, cliparts, etc.)
// Éléments par défaut pour les bordures de cadres
const defaultBordures = [
  { id: "bordure_1", name: "Bordure classique", src: "/themes/bordures-cadres/5bfa3a5b25677143ff53de8dbf5c06e0.jpg" },
  { id: "bordure_2", name: "Bordure ornementale", src: "/themes/bordures-cadres/6993e03de6eabd41107447c52d3e83db.jpg" },
  { id: "bordure_3", name: "Bordure vintage", src: "/themes/bordures-cadres/7728b7aed75425389f30efef45692dcf.jpg" },
  { id: "bordure_4", name: "Bordure florale", src: "/themes/bordures-cadres/bf7077a6715792862859ad8c4633a941.jpg" },
  { id: "bordure_5", name: "Bordure florale 2", src: "/themes/bordures-cadres/bf7077a6715792862859ad8c4633a941-2.jpg" },
  { id: "bordure_6", name: "Bordure décorative", src: "/themes/bordures-cadres/e118ccd8d0aeabfdb6f45b19065c1f88.jpg" },
];

// Éléments par défaut pour les lettres décoratives
const defaultLettres = [
  { id: "lettre_1", name: "Lettres fantaisie", src: "/themes/lettres-decoratives/8e7f1b9078798648628dca4c5b7d549a.jpg" },
];

// Éléments par défaut pour les masques
const defaultMasques = [
  { id: "masque_1", name: "Formes géométriques", src: "/mise-en-page/masques/formes-geometriques.png" },
  { id: "masque_cercle", name: "Cercle", src: "/mise-en-page/masques/individuelles/masque-cercle.png" },
  { id: "masque_ovale", name: "Ovale", src: "/mise-en-page/masques/individuelles/masque-ovale.png" },
  { id: "masque_coeur", name: "Cœur", src: "/mise-en-page/masques/individuelles/masque-coeur.png" },
  { id: "masque_etoile", name: "Étoile 6 branches", src: "/mise-en-page/masques/individuelles/masque-etoile-6.png" },
  { id: "masque_etoile_5", name: "Étoile 5 branches", src: "/mise-en-page/masques/individuelles/masque-etoile-5.png" },
  { id: "masque_triangle", name: "Triangle", src: "/mise-en-page/masques/individuelles/masque-triangle.png" },
  { id: "masque_rectangle", name: "Rectangle", src: "/mise-en-page/masques/individuelles/masque-rectangle.png" },
  { id: "masque_hexagone", name: "Hexagone", src: "/mise-en-page/masques/individuelles/masque-hexagone.png" },
  { id: "masque_pentagone", name: "Pentagone", src: "/mise-en-page/masques/individuelles/masque-pentagone.png" },
  { id: "masque_octogone", name: "Octogone", src: "/mise-en-page/masques/individuelles/masque-octogone.png" },
  { id: "masque_losange", name: "Losange", src: "/mise-en-page/masques/individuelles/masque-losange.png" },
  { id: "masque_goutte", name: "Goutte", src: "/mise-en-page/masques/individuelles/masque-goutte.png" },
  { id: "masque_feuille", name: "Feuille", src: "/mise-en-page/masques/individuelles/masque-feuille.png" },
  { id: "masque_trapeze", name: "Trapèze", src: "/mise-en-page/masques/individuelles/masque-trapeze.png" },
  { id: "masque_parallelogramme", name: "Parallélogramme", src: "/mise-en-page/masques/individuelles/masque-parallelogramme.png" },
  { id: "masque_demi_cercle", name: "Demi-cercle", src: "/mise-en-page/masques/individuelles/masque-demi-cercle.png" },
  { id: "masque_nuage", name: "Nuage", src: "/mise-en-page/masques/individuelles/masque-nuage.png" },
  { id: "masque_bulle", name: "Bulle de dialogue", src: "/mise-en-page/masques/individuelles/masque-bulle.png" },
  { id: "masque_fleche", name: "Flèche", src: "/mise-en-page/masques/individuelles/masque-fleche.png" },
  { id: "masque_croix", name: "Croix", src: "/mise-en-page/masques/individuelles/masque-croix.png" },
  // Masques avec contours progressifs (effet de fondu)
  { id: "masque_cercle_progressif", name: "Cercle progressif", src: "/mise-en-page/masques/individuelles/masque-cercle-progressif.png" },
  { id: "masque_ovale_progressif", name: "Ovale progressif", src: "/mise-en-page/masques/individuelles/masque-ovale-progressif.png" },
  { id: "masque_rectangle_progressif", name: "Rectangle progressif", src: "/mise-en-page/masques/individuelles/masque-rectangle-progressif.png" },
  { id: "masque_coeur_progressif", name: "Cœur progressif", src: "/mise-en-page/masques/individuelles/masque-coeur-progressif.png" },
];

// Éléments par défaut pour les frises
const defaultFrises = [
  { id: "frise_1", name: "Frise dentelle", src: "/themes/frises-decoratives/0b320dc1ee9a60f80918db3133b01bce.jpg" },
  { id: "frise_2", name: "Frise ornementale", src: "/themes/frises-decoratives/8bf4c42c97f15f3f010d46b90774192a.jpg" },
];

// Éléments par défaut pour les coins
const defaultCoins = [
  { id: "coin_1", name: "Coin floral", src: "/themes/coins-decoratifs/0efa3afddb482d098c30dbf62b11a6a6.jpg" },
  { id: "coin_2", name: "Coin classique", src: "/themes/coins-decoratifs/5687f40b30a7501580329c5c7a774df0.jpg" },
  { id: "coin_3", name: "Coin ornemental", src: "/themes/coins-decoratifs/e00cc3b8772022ef34b291ff637affa6.jpg" },
];

const defaultEmotions = [
  { id: "emoji_smile", name: "😊", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iI0ZGRDkzRCIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjQiIHI9IjQiIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSI0NCIgY3k9IjI0IiByPSI0IiBmaWxsPSIjMzMzIi8+PHBhdGggZD0iTTE2IDQwIFEzMiA1MiA0OCA0MCIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48L3N2Zz4=" },
  { id: "emoji_heart", name: "❤️", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cGF0aCBkPSJNMzIgNTZDMTYgNDQgNCAxMiAzMiAxMkM2MCAxMiA0OCA0NCAzMiA1NloiIGZpbGw9IiNFODFFNjMiLz48L3N2Zz4=" },
  { id: "emoji_star", name: "⭐", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cG9seWdvbiBwb2ludHM9IjMyLDQgNDAsMjQgNjQsMjQgNDQsMzggNTIsNjAgMzIsNDYgMTIsNjAgMjAsMzggMCwyNCAxNiwyNCIgZmlsbD0iI0ZGQzEwNyIvPjwvc3ZnPg==" },
  { id: "emoji_thumbsup", name: "👍", src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cGF0aCBkPSJNMjAgNTZWMjhoMTJWOGwxNiAxNnY0MGgtMjhaIiBmaWxsPSIjRkZDQTI4Ii8+PC9zdmc+" },
];

export default function BibliothequeTab({
  items,
  onRemove,
  onAddToCollage,
}: BibliothequeTabProps) {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("detourage");
  const [searchQuery, setSearchQuery] = useState("");

  // Helper pour créer des items de bibliothèque à partir d'éléments par défaut
  const createDefaultItems = (defaults: { id: string; name: string; src: string }[], type: string): BibliothequeItem[] => {
    return defaults.map(e => ({
      id: e.id,
      type: type as BibliothequeItem['type'],
      name: e.name,
      thumbnail: e.src,
      fullImage: e.src,
      createdAt: 0,
    }));
  };

  // Filtrer les éléments par catégorie
  const getItemsForCategory = (categoryId: string): BibliothequeItem[] => {
    const userItems = items.filter(item => item.type === categoryId);
    
    // Retourner les éléments par défaut + les imports de l'utilisateur selon la catégorie
    switch (categoryId) {
      case "emotion":
        return [...createDefaultItems(defaultEmotions, "emotion"), ...userItems];
      case "bordure":
        return [...createDefaultItems(defaultBordures, "bordure"), ...userItems];
      case "lettre":
        return [...createDefaultItems(defaultLettres, "lettre"), ...userItems];
      case "masque":
        return [...createDefaultItems(defaultMasques, "masque"), ...userItems];
      case "frise":
        return [...createDefaultItems(defaultFrises, "frise"), ...userItems];
      case "coin":
        return [...createDefaultItems(defaultCoins, "coin"), ...userItems];
      default:
        return userItems;
    }
  };

  // Filtrer par recherche
  const filteredItems = getItemsForCategory(activeCategory).filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ajouter un élément au collage
  const handleAddToCollage = (item: BibliothequeItem) => {
    const element: CollageElement = {
      id: `element_${Date.now()}`,
      type: "image",
      src: item.fullImage,
      x: 100,
      y: 100,
      width: 150,
      height: 150,
      rotation: 0,
      zIndex: 1,
      opacity: 1,
    };
    onAddToCollage(element);
    toast.success(language === "fr" ? "Ajouté au collage !" : "Added to collage!");
  };

  // Importer un fichier
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/svg+xml,image/jpeg";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const newItem: BibliothequeItem = {
          id: `import_${Date.now()}`,
          type: "import",
          name: file.name,
          thumbnail: base64,
          fullImage: base64,
          createdAt: Date.now(),
        };
        // Note: L'ajout se fait via le parent
        toast.info(language === "fr" ? "Import en cours..." : "Importing...");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="h-full flex">
      {/* Sidebar des catégories */}
      <div className="w-48 bg-gray-50 border-r p-3 flex flex-col gap-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
              activeCategory === cat.id
                ? "bg-purple-100 text-purple-700 font-medium"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <cat.icon className="w-4 h-4" />
            <span className="text-sm">{cat.label[language as "fr" | "en"]}</span>
          </button>
        ))}

        <div className="mt-auto pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleImport}
          >
            <Upload className="w-4 h-4" />
            {language === "fr" ? "Importer" : "Import"}
          </Button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col p-4">
        {/* Barre de recherche */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={language === "fr" ? "Rechercher..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-gray-500">
            {filteredItems.length} {language === "fr" ? "éléments" : "items"}
          </span>
        </div>

        {/* Grille des éléments */}
        <div className="flex-1 overflow-auto">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-white border rounded-lg p-2 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleAddToCollage(item)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("bibliotheque-item", JSON.stringify(item));
                  }}
                >
                  {/* Miniature */}
                  <div 
                    className="aspect-square rounded-md overflow-hidden mb-2 flex items-center justify-center"
                    style={{ background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 50% / 10px 10px" }}
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain"
                      style={{ filter: 'contrast(200%) brightness(0.8)' }}
                      draggable={false}
                    />
                  </div>

                  {/* Nom */}
                  <p className="text-xs text-center text-gray-600 truncate">{item.name}</p>

                  {/* Actions au survol */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCollage(item);
                      }}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                      title={language === "fr" ? "Ajouter au collage" : "Add to collage"}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    {(item.createdAt ?? 0) > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(item.id);
                        }}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        title={language === "fr" ? "Supprimer" : "Delete"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Indicateur drag */}
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-50 transition-opacity">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
              <p>{language === "fr" ? "Aucun élément dans cette catégorie" : "No items in this category"}</p>
              {activeCategory === "detourage" && (
                <p className="text-sm mt-2">
                  {language === "fr" 
                    ? (language === 'fr' ? "Utilisez l'onglet Détourage pour créer des éléments" : "Use the Cutout tab to create elements") 
                    : "Use the Cutout tab to create elements"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-700">
            {language === "fr"
              ? (language === 'fr' ? "💡 Cliquez sur un élément pour l'ajouter au collage, ou glissez-le directement sur le canevas." : "💡 Click on an element to add it to the collage, or drag it directly onto the canvas.")
              : "💡 Click an item to add it to the collage, or drag it directly onto the canvas."}
          </p>
        </div>
      </div>
    </div>
  );
}
