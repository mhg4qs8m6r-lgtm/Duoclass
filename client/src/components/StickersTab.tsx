import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Cake, Heart, Palmtree, Star, Gift, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface StickersTabProps {
  onAddSticker: (stickerUrl: string, name: string) => void;
}

// Définition des stickers par catégorie
const STICKERS = {
  anniversaire: [
    { id: "ann1", name: "Gâteau anniversaire", url: "/stickers/anniversaire/gateau-anniversaire.png" },
    { id: "ann2", name: "Birthday Girl", url: "/stickers/anniversaire/birthday-girl.png" },
    { id: "ann3", name: "Pack stickers", url: "/stickers/anniversaire/stickers-pack.jpg" },
  ],
  mariage: [
    { id: "mar1", name: "Icônes mariage", url: "/stickers/mariage/wedding-icons.jpg" },
    { id: "mar2", name: "Bundle mariage", url: "/stickers/mariage/wedding-bundle.jpg" },
    { id: "mar3", name: "Illustrations mariage", url: "/stickers/mariage/wedding-illustrations.jpg" },
  ],
  vacances: [
    { id: "vac1", name: "Plage tropicale", url: "/stickers/vacances/beach-tropical.jpg" },
    { id: "vac2", name: "Stickers été", url: "/stickers/vacances/summer-stickers.jpg" },
  ],
};

// Emojis/symboles intégrés (SVG inline)
const EMOJI_STICKERS = [
  { id: "emoji1", name: "Étoile", emoji: "⭐", color: "#FFD700" },
  { id: "emoji2", name: "Cœur", emoji: "❤️", color: "#FF0000" },
  { id: "emoji3", name: "Soleil", emoji: "☀️", color: "#FFA500" },
  { id: "emoji4", name: "Lune", emoji: "🌙", color: "#C0C0C0" },
  { id: "emoji5", name: "Fleur", emoji: "🌸", color: "#FFB6C1" },
  { id: "emoji6", name: "Papillon", emoji: "🦋", color: "#87CEEB" },
  { id: "emoji7", name: "Arc-en-ciel", emoji: "🌈", color: "#FF69B4" },
  { id: "emoji8", name: "Feu d'artifice", emoji: "🎆", color: "#9400D3" },
  { id: "emoji9", name: "Ballon", emoji: "🎈", color: "#FF4500" },
  { id: "emoji10", name: "Cadeau", emoji: "🎁", color: "#DC143C" },
  { id: "emoji11", name: "Confetti", emoji: "🎊", color: "#FF1493" },
  { id: "emoji12", name: "Champagne", emoji: "🍾", color: "#228B22" },
  { id: "emoji13", name: "Gâteau", emoji: "🎂", color: "#8B4513" },
  { id: "emoji14", name: "Couronne", emoji: "👑", color: "#FFD700" },
  { id: "emoji15", name: "Diamant", emoji: "💎", color: "#00CED1" },
  { id: "emoji16", name: "Feuille", emoji: "🍃", color: "#32CD32" },
  { id: "emoji17", name: "Flocon", emoji: "❄️", color: "#ADD8E6" },
  { id: "emoji18", name: "Flamme", emoji: "🔥", color: "#FF4500" },
  { id: "emoji19", name: "Éclair", emoji: "⚡", color: "#FFD700" },
  { id: "emoji20", name: "Musique", emoji: "🎵", color: "#4B0082" },
];

export default function StickersTab({ onAddSticker }: StickersTabProps) {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("anniversaire");

  const categories = [
    { id: "anniversaire", label: language === "fr" ? "Anniversaire" : "Birthday", icon: Cake },
    { id: "mariage", label: language === "fr" ? "Mariage" : "Wedding", icon: Heart },
    { id: "vacances", label: language === "fr" ? "Vacances" : "Vacation", icon: Palmtree },
    { id: "emojis", label: "Emojis", icon: Star },
  ];

  // Créer un SVG à partir d'un emoji
  const createEmojiSvg = (emoji: string, size: number = 100) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${size * 0.8}">${emoji}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const handleAddSticker = (url: string, name: string) => {
    onAddSticker(url, name);
    toast.success(language === "fr" ? `"${name}" ajouté au collage` : `"${name}" added to collage`);
  };

  const handleAddEmoji = (emoji: string, name: string) => {
    const svgUrl = createEmojiSvg(emoji, 120);
    onAddSticker(svgUrl, name);
    toast.success(language === "fr" ? `"${name}" ajouté au collage` : `"${name}" added to collage`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* En-tête */}
      <div className="p-4 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
        <div className="flex items-center gap-2 mb-2">
          <PartyPopper className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-800">
            {language === "fr" ? "Stickers thématiques" : "Themed Stickers"}
          </h3>
        </div>
        <p className="text-sm text-gray-500">
          {language === "fr" 
            ? "Cliquez sur un sticker pour l'ajouter à votre composition"
            : "Click on a sticker to add it to your composition"}
        </p>
      </div>

      {/* Onglets de catégories */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mx-4 mt-4">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-1 text-xs">
              <cat.icon className="w-3 h-3" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-hidden">
          {/* Anniversaire */}
          <TabsContent value="anniversaire" className="h-full m-0 p-4">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {STICKERS.anniversaire.map((sticker) => (
                  <div
                    key={sticker.id}
                    onClick={() => handleAddSticker(sticker.url, sticker.name)}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all overflow-hidden group"
                  >
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Mariage */}
          <TabsContent value="mariage" className="h-full m-0 p-4">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {STICKERS.mariage.map((sticker) => (
                  <div
                    key={sticker.id}
                    onClick={() => handleAddSticker(sticker.url, sticker.name)}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-pink-400 hover:bg-pink-50 cursor-pointer transition-all overflow-hidden group"
                  >
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Vacances */}
          <TabsContent value="vacances" className="h-full m-0 p-4">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {STICKERS.vacances.map((sticker) => (
                  <div
                    key={sticker.id}
                    onClick={() => handleAddSticker(sticker.url, sticker.name)}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 cursor-pointer transition-all overflow-hidden group"
                  >
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Emojis */}
          <TabsContent value="emojis" className="h-full m-0 p-4">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-5 md:grid-cols-8 gap-3">
                {EMOJI_STICKERS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAddEmoji(item.emoji, item.name)}
                    className="aspect-square rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all flex items-center justify-center text-3xl hover:scale-125"
                    title={item.name}
                  >
                    {item.emoji}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
