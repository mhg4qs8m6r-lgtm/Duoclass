import { useState } from "react";
import { Hand, Hexagon, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { removeBackground } from "@imgly/background-removal";

export type DetourageMode = "auto" | "manual";
export type ManualTool = "lasso" | "polygon" | "bezier" | "wand" | "face";

interface DetourageToolsPanelProps {
  activePhoto: string | null;
  selectedElementId: string | null;
  onDetourageComplete: (result: string, name: string) => void;
  onApplyDetourageToElement?: (elementId: string, detourageResult: string) => void;
  onModeChange?: (mode: DetourageMode, tool: ManualTool | null) => void;
}

/**
 * Convertit n'importe quelle source d'image en Blob.
 */
function imageSourceToBlob(src: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Data URL → conversion directe
    if (src.startsWith('data:')) {
      try {
        const commaIndex = src.indexOf(',');
        if (commaIndex === -1) throw new Error('Invalid data URL');
        const header = src.substring(0, commaIndex);
        const base64Data = src.substring(commaIndex + 1);
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        resolve(new Blob([bytes], { type: mimeType }));
        return;
      } catch (e: any) {
        // fallback ci-dessous
      }
    }

    // Blob URL → XHR
    if (src.startsWith('blob:')) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', src, true);
      xhr.responseType = 'blob';
      xhr.onload = () => (xhr.status === 200 || xhr.status === 0) ? resolve(xhr.response) : fallback();
      xhr.onerror = fallback;
      xhr.send();
      return;
    }

    // HTTP URL → fetch
    if (src.startsWith('http')) {
      fetch(src).then(r => r.blob()).then(resolve).catch(fallback);
      return;
    }

    fallback();

    function fallback() {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob null')), 'image/png');
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    }
  });
}

export default function DetourageToolsPanel({
  activePhoto,
  selectedElementId,
  onDetourageComplete,
  onApplyDetourageToElement,
  onModeChange,
}: DetourageToolsPanelProps) {
  const { language } = useLanguage();

  const [mode, setMode] = useState<DetourageMode>("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetourageResult, setLastDetourageResult] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("");

  // ─── Détourage automatique IA ─────────────────────────────────────────────
  const handleAutoDetourage = async () => {
    if (!activePhoto) {
      toast.error(language === "fr" ? "Sélectionnez d'abord une image sur le canvas" : "First select an image on the canvas");
      return;
    }
    if (!selectedElementId) {
      toast.error(language === "fr" ? "Cliquez sur une image dans la zone de travail" : "Click on an image in the work area");
      return;
    }

    setIsProcessing(true);
    setProgressMessage(language === "fr" ? "Préparation de l'image..." : "Preparing image...");
    setOriginalImage(activePhoto);

    try {
      toast.info(language === "fr" ? "Détourage en cours... Cela peut prendre 30-60 secondes." : "Processing... This may take 30-60 seconds.");

      const imageBlob = await imageSourceToBlob(activePhoto);
      if (!imageBlob || imageBlob.size === 0) {
        throw new Error(language === 'fr' ? "Impossible de récupérer les données de l'image" : 'Unable to retrieve image data');
      }

      setProgressMessage(language === "fr" ? "Traitement IA en cours..." : "AI processing...");

      const resultBlob = await removeBackground(imageBlob, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        progress: (_key, current, total) => {
          const percent = Math.round((current / total) * 100);
          setProgressMessage(language === "fr" ? `Traitement IA... ${percent}%` : `AI processing... ${percent}%`);
        },
      });

      const resultUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(resultBlob);
      });

      if (onApplyDetourageToElement && selectedElementId) {
        onApplyDetourageToElement(selectedElementId, resultUrl);
        setLastDetourageResult(resultUrl);
        toast.success(language === "fr" ? "Détourage appliqué avec succès !" : "Cutout applied successfully!");
      }
    } catch (error: any) {
      console.error('[Detourage] Error:', error);
      toast.error(language === "fr"
        ? `Erreur lors du détourage: ${error.message || 'Erreur inconnue'}`
        : `Cutout error: ${error.message || 'Unknown error'}`);
      setOriginalImage(null);
    } finally {
      setIsProcessing(false);
      setProgressMessage("");
    }
  };

  // ─── Recommencer ──────────────────────────────────────────────────────────
  const handleRecommencer = () => {
    if (originalImage && selectedElementId && onApplyDetourageToElement) {
      onApplyDetourageToElement(selectedElementId, originalImage);
      setLastDetourageResult(null);
      setOriginalImage(null);
      toast.info(language === "fr" ? "Image originale restaurée" : "Original image restored");
    }
  };

  // ─── Changement de mode ───────────────────────────────────────────────────
  const handleModeChange = (newMode: DetourageMode) => {
    setMode(newMode);
    setLastDetourageResult(null);
    setOriginalImage(null);
    onModeChange?.(newMode, null);
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Message si pas de photo sélectionnée */}
      {!selectedElementId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {language === "fr"
            ? "Cliquez sur une image dans la zone de travail pour la détourer."
            : "Click on an image in the work area to cut it out."}
        </div>
      )}

      {/* 3 boutons : Automatique, Manuel, Point par point */}
      <div>
        <Label className="text-xs font-medium text-gray-600 mb-2 block">
          {language === "fr" ? "Mode de détourage" : "Cutout mode"}
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {/* Automatique (IA) */}
          <Button
            variant={mode === "auto" ? "default" : "outline"}
            size="sm"
            className={`justify-start gap-2 text-xs ${mode === "auto" ? "bg-purple-500 hover:bg-purple-600" : ""}`}
            onClick={() => handleModeChange("auto")}
          >
            <Sparkles className="w-4 h-4" />
            {language === "fr" ? "Automatique (IA)" : "Automatic (AI)"}
          </Button>

          {/* Manuel (active le mode, n'ouvre rien) */}
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            className={`justify-start gap-2 text-xs ${mode === "manual" ? "bg-green-500 hover:bg-green-600" : ""}`}
            onClick={() => handleModeChange("manual")}
          >
            <Hand className="w-4 h-4" />
            {language === "fr" ? "Manuel" : "Manual"}
          </Button>

          {/* Point par point (ouvre TestCanvas) */}
          {mode === "manual" && (
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 text-xs bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              onClick={() => onModeChange?.("manual", "polygon")}
            >
              <Hexagon className="w-4 h-4" />
              {language === "fr" ? "Point par point" : "Point by point"}
            </Button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t">
        {mode === "auto" && (
          <>
            <Button
              className="w-full gap-2 bg-purple-500 hover:bg-purple-600"
              onClick={handleAutoDetourage}
              disabled={!selectedElementId || isProcessing}
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing
                ? (progressMessage || (language === "fr" ? "Détourage en cours..." : "Processing..."))
                : (language === "fr" ? "Détourer automatiquement" : "Auto cutout")}
            </Button>

            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            )}

            {lastDetourageResult && originalImage && (
              <Button
                variant="outline"
                className="w-full gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={handleRecommencer}
              >
                <RotateCcw className="w-4 h-4" />
                {language === "fr" ? "Recommencer (annuler le détourage)" : "Redo (cancel cutout)"}
              </Button>
            )}

            {selectedElementId && !isProcessing && !lastDetourageResult && (
              <p className="text-xs text-gray-500 text-center">
                {language === "fr"
                  ? "Le détourage sera appliqué directement sur l'image sélectionnée"
                  : "Cutout will be applied directly to the selected image"}
              </p>
            )}
          </>
        )}

        {mode === "manual" && (
          <div className="text-xs text-green-700 bg-green-50 rounded p-2 border border-green-200">
            {language === "fr"
              ? "Cliquez « Point par point » pour ouvrir l'outil de détourage précis dans un nouvel onglet."
              : "Click \"Point by point\" to open the precise cutout tool in a new tab."}
          </div>
        )}
      </div>
    </div>
  );
}
