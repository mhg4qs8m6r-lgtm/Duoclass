import { useState, useEffect } from "react";
import { Sticker, Heart, Star, Smile, PartyPopper, Gift, Cake, Sun, Cloud, Music, Camera, Coffee, Pizza } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface StickersToolsPanelProps {
  onSelectSticker: (src: string, name: string) => void;
}

type StickerCategory = "emotions" | "fetes" | "nature" | "objets" | "textes";

export default function StickersToolsPanel({
  onSelectSticker,
}: StickersToolsPanelProps) {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<StickerCategory>("emotions");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Catégories de stickers
  const categories = [
    { id: "emotions", label: language === "fr" ? "Émotions" : "Emotions", icon: Smile },
    { id: "fetes", label: language === "fr" ? "Fêtes" : "Celebrations", icon: PartyPopper },
    { id: "nature", label: "Nature", icon: Sun },
    { id: "objets", label: language === "fr" ? "Objets" : "Objects", icon: Camera },
    { id: "textes", label: "Textes", icon: Sticker },
  ];
  
  // Stickers par catégorie (chemins vers les fichiers existants)
  const stickers: Record<string, { src: string; name: string }[]> = {
    emotions: [
      { src: "/stickers/emotions/happy.png", name: "Happy" },
      { src: "/stickers/emotions/love.png", name: "Love" },
      { src: "/stickers/emotions/cool.png", name: "Cool" },
      { src: "/stickers/emotions/wow.png", name: "Wow" },
      { src: "/stickers/emotions/laugh.png", name: "Laugh" },
      { src: "/stickers/emotions/wink.png", name: "Wink" },
    ],
    fetes: [
      { src: "/stickers/fetes/birthday.png", name: "Anniversaire" },
      { src: "/stickers/fetes/christmas.png", name: "Noël" },
      { src: "/stickers/fetes/newyear.png", name: "Nouvel An" },
      { src: "/stickers/fetes/halloween.png", name: "Halloween" },
      { src: "/stickers/fetes/easter.png", name: "Pâques" },
      { src: "/stickers/fetes/valentine.png", name: "Saint-Valentin" },
    ],
    nature: [
      { src: "/stickers/nature/sun.png", name: "Soleil" },
      { src: "/stickers/nature/cloud.png", name: "Nuage" },
      { src: "/stickers/nature/flower.png", name: "Fleur" },
      { src: "/stickers/nature/tree.png", name: "Arbre" },
      { src: "/stickers/nature/star.png", name: "Étoile" },
      { src: "/stickers/nature/moon.png", name: "Lune" },
    ],
    objets: [
      { src: "/stickers/objets/camera.png", name: "Appareil photo" },
      { src: "/stickers/objets/music.png", name: "Musique" },
      { src: "/stickers/objets/coffee.png", name: "Café" },
      { src: "/stickers/objets/gift.png", name: "Cadeau" },
      { src: "/stickers/objets/heart.png", name: "Cœur" },
      { src: "/stickers/objets/balloon.png", name: "Ballon" },
    ],
    textes: [
      { src: "/stickers/textes/merci.png", name: "Merci" },
      { src: "/stickers/textes/bravo.png", name: "Bravo" },
      { src: "/stickers/textes/love.png", name: "Love" },
      { src: "/stickers/textes/wow.png", name: "Wow" },
      { src: "/stickers/textes/super.png", name: "Super" },
      { src: "/stickers/textes/cool.png", name: "Cool" },
    ],
  };
  
  // Filtrer les stickers par recherche
  const getFilteredStickers = () => {
    const categoryStickers = stickers[activeCategory] || [];
    if (!searchQuery) return categoryStickers;
    
    return categoryStickers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  const filteredStickers = getFilteredStickers();
  
  return (
    <div className="space-y-3">
      {/* Recherche */}
      <Input
        placeholder={language === "fr" ? "Rechercher un sticker..." : "Search sticker..."}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="text-sm"
      />
      
      {/* Catégories */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? "default" : "outline"}
            size="sm"
            className={`text-xs gap-1 ${activeCategory === cat.id ? "bg-purple-500" : ""}`}
            onClick={() => setActiveCategory(cat.id as StickerCategory)}
          >
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </Button>
        ))}
      </div>
      
      {/* Grille de stickers */}
      <ScrollArea className="h-[250px]">
        <div className="grid grid-cols-3 gap-2">
          {filteredStickers.map((sticker, index) => (
            <div
              key={`${sticker.name}-${index}`}
              className="aspect-square bg-white rounded border shadow-sm cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all p-2 flex items-center justify-center"
              onClick={() => onSelectSticker(sticker.src, sticker.name)}
              title={sticker.name}
            >
              <img
                src={sticker.src}
                alt={sticker.name}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  // Afficher une icône par défaut si l'image n'existe pas
                  (e.target as HTMLImageElement).style.display = "none";
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="text-gray-400 text-center text-xs">${sticker.name}</div>`;
                  }
                }}
              />
            </div>
          ))}
          
          {filteredStickers.length === 0 && (
            <div className="col-span-3 text-center text-gray-400 text-xs py-8">
              {language === "fr" 
                ? "Aucun sticker trouvé"
                : "No sticker found"}
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Info */}
      <p className="text-[10px] text-gray-500 text-center">
        {language === "fr" 
          ? "Cliquez sur un sticker pour l'ajouter au collecteur"
          : "Click a sticker to add it to the collector"}
      </p>
    </div>
  );
}
