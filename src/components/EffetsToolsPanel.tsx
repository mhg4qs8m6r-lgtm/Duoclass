import { useState } from "react";
import { Sparkles, Sun, Moon, Palette, Droplets, Zap, Camera, Film, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface EffetsToolsPanelProps {
  sourceImage: string | null;
  onApplyEffect: (result: string, name: string) => void;
}

type EffectType = "vintage" | "noir-blanc" | "sepia" | "pop-art" | "aquarelle" | "bd" | "hdr" | "vignette" | "flou";

export default function EffetsToolsPanel({
  sourceImage,
  onApplyEffect,
}: EffetsToolsPanelProps) {
  const { language } = useLanguage();
  const [selectedEffect, setSelectedEffect] = useState<EffectType | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Liste des effets disponibles
  const effects = [
    { id: "vintage", label: "Vintage", icon: Camera },
    { id: "noir-blanc", label: language === "fr" ? "Noir & Blanc" : "Black & White", icon: Moon },
    { id: "sepia", label: "Sépia", icon: Sun },
    { id: "pop-art", label: "Pop Art", icon: Palette },
    { id: "aquarelle", label: language === "fr" ? "Aquarelle" : "Watercolor", icon: Droplets },
    { id: "bd", label: "BD / Comic", icon: Zap },
    { id: "hdr", label: "HDR", icon: Sparkles },
    { id: "vignette", label: "Vignette", icon: Film },
    { id: "flou", label: language === "fr" ? "Flou artistique" : "Artistic Blur", icon: Brush },
  ];
  
  // Appliquer l'effet
  const handleApplyEffect = async () => {
    if (!sourceImage) {
      toast.error(language === "fr" ? "Sélectionnez d'abord une photo sur le canvas" : "First select a photo on the canvas");
      return;
    }
    
    if (!selectedEffect) {
      toast.error(language === "fr" ? "Sélectionnez un effet" : "Select an effect");
      return;
    }
    
    setIsProcessing(true);
    try {
      // Simuler le traitement (à remplacer par le vrai traitement)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Pour l'instant, on retourne la photo originale
      // TODO: Intégrer le vrai traitement d'effets
      const effectLabel = effects.find(e => e.id === selectedEffect)?.label || selectedEffect;
      onApplyEffect(sourceImage, `Photo - ${effectLabel}`);
      
      toast.success(language === "fr" ? "Effet appliqué" : "Effect applied");
    } catch (error) {
      toast.error(language === "fr" ? "Erreur lors de l'application de l'effet" : "Error applying effect");
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Message si pas de photo */}
      {!sourceImage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {language === "fr" 
            ? "Sélectionnez une photo sur le canvas pour appliquer un effet."
            : "Select a photo on the canvas to apply an effect."}
        </div>
      )}
      
      {/* Grille des effets */}
      <div>
        <Label className="text-xs font-medium text-gray-600 mb-2 block">
          {language === "fr" ? "Choisir un effet" : "Choose an effect"}
        </Label>
        <ScrollArea className="h-[200px]">
          <div className="grid grid-cols-2 gap-2">
            {effects.map((effect) => (
              <Button
                key={effect.id}
                variant={selectedEffect === effect.id ? "default" : "outline"}
                size="sm"
                className={`justify-start gap-2 text-xs h-auto py-2 ${selectedEffect === effect.id ? "bg-purple-500" : ""}`}
                onClick={() => setSelectedEffect(effect.id as EffectType)}
              >
                <effect.icon className="w-4 h-4" />
                {effect.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Intensité */}
      {selectedEffect && (
        <div className="pt-2 border-t">
          <Label className="text-xs text-gray-600">
            {language === "fr" ? "Intensité" : "Intensity"}: {intensity}%
          </Label>
          <Slider
            value={[intensity]}
            onValueChange={([v]) => setIntensity(v)}
            min={0}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>
      )}
      
      {/* Bouton appliquer */}
      <Button
        className="w-full gap-2 bg-purple-500 hover:bg-purple-600"
        onClick={handleApplyEffect}
        disabled={!sourceImage || !selectedEffect || isProcessing}
      >
        <Sparkles className="w-4 h-4" />
        {isProcessing 
          ? (language === "fr" ? "Application..." : "Applying...")
          : (language === "fr" ? "Appliquer l'effet" : "Apply effect")}
      </Button>
      
      {/* Info */}
      <p className="text-[10px] text-gray-500 text-center">
        {language === "fr" 
          ? "Le résultat sera ajouté au collecteur"
          : "The result will be added to the collector"}
      </p>
    </div>
  );
}
