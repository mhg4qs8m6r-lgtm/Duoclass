import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, RotateCcw, Check, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface EffetsTabProps {
  sourceImage: string | null;
  onApplyEffect: (imageData: string) => void;
}

// Définition des filtres artistiques
const artisticFilters = [
  { 
    id: "bd", 
    name: { fr: "BD / Comics", en: "Comics" },
    description: { fr: "Contours noirs, couleurs aplaties", en: "Black outlines, flat colors" },
    icon: "🎨"
  },
  { 
    id: "cinema", 
    name: { fr: "Cinéma", en: "Cinema" },
    description: { fr: "Grain de film, tons cinématographiques", en: "Film grain, cinematic tones" },
    icon: "🎬"
  },
  { 
    id: "retro", 
    name: { fr: "Rétro / Vintage", en: "Retro / Vintage" },
    description: { fr: "Couleurs délavées, vignette", en: "Faded colors, vignette" },
    icon: "📷"
  },
  { 
    id: "peinture", 
    name: { fr: "Peinture à l'huile", en: "Oil Painting" },
    description: { fr: "Coups de pinceau, texture toile", en: "Brush strokes, canvas texture" },
    icon: "🖼️"
  },
  { 
    id: "aquarelle", 
    name: { fr: "Aquarelle", en: "Watercolor" },
    description: { fr: "Couleurs diffuses, effet eau", en: "Diffuse colors, water effect" },
    icon: "💧"
  },
  { 
    id: "crayon", 
    name: { fr: "Crayon / Dessin", en: "Pencil / Sketch" },
    description: { fr: "Traits de crayon, esquisse", en: "Pencil strokes, sketch" },
    icon: "✏️"
  },
  { 
    id: "fusain", 
    name: { fr: "Fusain", en: "Charcoal" },
    description: { fr: "Noir et blanc contrasté", en: "High contrast black & white" },
    icon: "🖤"
  },
  { 
    id: "pastel", 
    name: { fr: "Pastel", en: "Pastel" },
    description: { fr: "Couleurs douces, texture craie", en: "Soft colors, chalk texture" },
    icon: "🌸"
  },
  { 
    id: "mosaique", 
    name: { fr: "Mosaïque / Pixel art", en: "Mosaic / Pixel art" },
    description: { fr: "Effet pixelisé rétro", en: "Retro pixelated effect" },
    icon: "🟦"
  },
  { 
    id: "gravure", 
    name: { fr: "Gravure", en: "Engraving" },
    description: { fr: "Lignes parallèles, effet ancien", en: "Parallel lines, antique effect" },
    icon: "📜"
  },
];

export default function EffetsTab({
  sourceImage,
  onApplyEffect,
}: EffetsTabProps) {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);

  // Charger l'image source
  useEffect(() => {
    if (sourceImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        setOriginalImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
        setPreviewImage(canvas.toDataURL());
      };
      img.src = sourceImage;
    }
  }, [sourceImage]);

  // Appliquer un filtre
  const applyFilter = async (filterId: string) => {
    if (!canvasRef.current || !originalImageData) return;

    setIsProcessing(true);
    setSelectedFilter(filterId);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Restaurer l'image originale
    ctx.putImageData(originalImageData, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Appliquer le filtre selon le type
    switch (filterId) {
      case "bd":
        // Effet BD : Posterisation + contours
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(data[i] / 64) * 64;     // R
          data[i + 1] = Math.round(data[i + 1] / 64) * 64; // G
          data[i + 2] = Math.round(data[i + 2] / 64) * 64; // B
        }
        break;

      case "cinema":
        // Effet cinéma : Teinte bleutée + contraste
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 0.9);     // R réduit
          data[i + 1] = Math.min(255, data[i + 1] * 0.95); // G légèrement réduit
          data[i + 2] = Math.min(255, data[i + 2] * 1.1);  // B augmenté
        }
        break;

      case "retro":
        // Effet rétro : Sépia + vignette
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
        break;

      case "peinture":
        // Effet peinture : Flou + saturation
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i] + (data[i] - avg) * 0.5;
          data[i + 1] = data[i + 1] + (data[i + 1] - avg) * 0.5;
          data[i + 2] = data[i + 2] + (data[i + 2] - avg) * 0.5;
        }
        break;

      case "aquarelle":
        // Effet aquarelle : Couleurs diffuses
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.1 + 20);
          data[i + 1] = Math.min(255, data[i + 1] * 1.1 + 20);
          data[i + 2] = Math.min(255, data[i + 2] * 1.1 + 20);
          data[i + 3] = Math.max(0, data[i + 3] - 30); // Légère transparence
        }
        break;

      case "crayon":
        // Effet crayon : Niveaux de gris + inversion partielle
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const inverted = 255 - gray;
          const blend = (gray + inverted) / 2;
          data[i] = data[i + 1] = data[i + 2] = blend;
        }
        break;

      case "fusain":
        // Effet fusain : Noir et blanc très contrasté
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const contrast = gray < 128 ? gray * 0.5 : 128 + (gray - 128) * 1.5;
          data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, contrast));
        }
        break;

      case "pastel":
        // Effet pastel : Couleurs adoucies
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 0.7 + 80);
          data[i + 1] = Math.min(255, data[i + 1] * 0.7 + 80);
          data[i + 2] = Math.min(255, data[i + 2] * 0.7 + 80);
        }
        break;

      case "mosaique":
        // Effet mosaïque : Pixelisation
        const blockSize = 10;
        for (let y = 0; y < canvas.height; y += blockSize) {
          for (let x = 0; x < canvas.width; x += blockSize) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            
            for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
              for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
                const i = ((y + dy) * canvas.width + (x + dx)) * 4;
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
              }
            }
          }
        }
        break;

      case "gravure":
        // Effet gravure : Lignes horizontales
        for (let i = 0; i < data.length; i += 4) {
          const y = Math.floor((i / 4) / canvas.width);
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const lineEffect = y % 3 === 0 ? 0.8 : 1;
          data[i] = data[i + 1] = data[i + 2] = gray * lineEffect;
        }
        break;
    }

    // Appliquer l'intensité
    if (intensity < 100 && originalImageData) {
      const origData = originalImageData.data;
      const factor = intensity / 100;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = origData[i] * (1 - factor) + data[i] * factor;
        data[i + 1] = origData[i + 1] * (1 - factor) + data[i + 1] * factor;
        data[i + 2] = origData[i + 2] * (1 - factor) + data[i + 2] * factor;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setPreviewImage(canvas.toDataURL());
    setIsProcessing(false);
  };

  // Réappliquer le filtre quand l'intensité change
  useEffect(() => {
    if (selectedFilter) {
      applyFilter(selectedFilter);
    }
  }, [intensity]);

  // Réinitialiser
  const handleReset = () => {
    if (canvasRef.current && originalImageData) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.putImageData(originalImageData, 0, 0);
        setPreviewImage(canvasRef.current.toDataURL());
      }
    }
    setSelectedFilter(null);
    setIntensity(100);
  };

  // Valider l'effet
  const handleApply = () => {
    if (previewImage) {
      onApplyEffect(previewImage);
      toast.success(language === "fr" ? "Effet appliqué !" : "Effect applied!");
    }
  };

  return (
    <div className="h-full flex">
      {/* Galerie des filtres */}
      <div className="w-80 bg-gray-50 border-r p-4 overflow-auto">
        <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {language === "fr" ? "Effets Artistiques" : "Artistic Effects"}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {artisticFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => applyFilter(filter.id)}
              disabled={!sourceImage || isProcessing}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedFilter === filter.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-white"
              } ${!sourceImage ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="text-2xl mb-1">{filter.icon}</div>
              <div className="text-sm font-medium text-gray-800">
                {filter.name[language as "fr" | "en"]}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {filter.description[language as "fr" | "en"]}
              </div>
            </button>
          ))}
        </div>

        {/* Contrôle d'intensité */}
        {selectedFilter && (
          <div className="mt-6 p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {language === "fr" ? "Intensité" : "Intensity"}: {intensity}%
              </span>
            </div>
            <Slider
              value={[intensity]}
              min={0}
              max={100}
              step={5}
              onValueChange={([value]) => setIntensity(value)}
            />
          </div>
        )}
      </div>

      {/* Zone de prévisualisation */}
      <div className="flex-1 flex flex-col p-6">
        {/* Barre d'actions */}
        <div className="flex items-center gap-3 mb-4">
          {selectedFilter && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {language === "fr" ? "Réinitialiser" : "Reset"}
              </Button>
              <Button size="sm" onClick={handleApply} className="bg-green-500 hover:bg-green-600">
                <Check className="w-4 h-4 mr-2" />
                {language === "fr" ? "Appliquer" : "Apply"}
              </Button>
            </>
          )}
        </div>

        {/* Prévisualisation */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden">
          {sourceImage ? (
            <div className="relative">
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[500px] rounded-lg shadow-lg"
                style={{ display: previewImage ? "none" : "block" }}
              />
              {previewImage && (
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-w-full max-h-[500px] rounded-lg shadow-lg"
                />
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-20">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>{language === "fr" ? "Aucune image à traiter" : "No image to process"}</p>
              <p className="text-sm mt-2">
                {language === "fr" 
                  ? (language === 'fr' ? "Exportez d'abord un collage ou sélectionnez une photo" : "First export a collage or select a photo") 
                  : "First export a collage or select a photo"}
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-700">
            {language === "fr"
              ? (language === 'fr' ? "💡 Cliquez sur un effet pour l'appliquer. Ajustez l'intensité avec le curseur, puis validez." : "💡 Click on an effect to apply it. Adjust the intensity with the slider, then validate.")
              : "💡 Click an effect to apply it. Adjust intensity with the slider, then confirm."}
          </p>
        </div>
      </div>
    </div>
  );
}
