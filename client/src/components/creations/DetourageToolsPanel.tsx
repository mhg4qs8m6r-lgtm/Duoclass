import { useState, useRef, useEffect } from "react";
import { Wand2, Hand, Lasso, Hexagon, Spline, Sparkles, User, Eraser, Undo, Redo, Check, X, ZoomIn, ZoomOut, Move, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
 * Convertit n'importe quelle source d'image en Blob de manière robuste.
 * Stratégie : utiliser un élément <img> invisible + canvas pour toujours obtenir un PNG propre.
 * Cette approche fonctionne avec data URLs, blob URLs, et HTTP URLs.
 */
function imageSourceToBlob(src: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    console.log('[DetourageV6] imageSourceToBlob called, src type:', 
      src.startsWith('data:') ? 'data URL' : 
      src.startsWith('blob:') ? 'blob URL' : 
      src.startsWith('http') ? 'HTTP URL' : 'unknown',
      'length:', src.length
    );

    // Méthode directe pour data URLs : conversion binaire sans canvas
    if (src.startsWith('data:')) {
      try {
        console.log('[DetourageV6] Converting data URL directly to blob...');
        const commaIndex = src.indexOf(',');
        if (commaIndex === -1) throw new Error('Invalid data URL: no comma found');
        
        const header = src.substring(0, commaIndex);
        const base64Data = src.substring(commaIndex + 1);
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        console.log('[DetourageV6] Data URL → Blob success, size:', blob.size, 'type:', mimeType);
        resolve(blob);
        return;
      } catch (e: any) {
        console.warn('[DetourageV6] Data URL direct conversion failed:', e.message, '- falling back to canvas');
      }
    }

    // Méthode pour blob URLs : XMLHttpRequest (plus fiable que fetch sur Safari)
    if (src.startsWith('blob:')) {
      console.log('[DetourageV6] Trying XMLHttpRequest for blob URL...');
      const xhr = new XMLHttpRequest();
      xhr.open('GET', src, true);
      xhr.responseType = 'blob';
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 0) {
          const blob = xhr.response as Blob;
          console.log('[DetourageV6] XHR blob URL success, size:', blob.size, 'type:', blob.type);
          resolve(blob);
        } else {
          console.warn('[DetourageV6] XHR failed with status:', xhr.status, '- falling back to canvas');
          fallbackToCanvas(src, resolve, reject);
        }
      };
      xhr.onerror = () => {
        console.warn('[DetourageV6] XHR error - falling back to canvas');
        fallbackToCanvas(src, resolve, reject);
      };
      xhr.send();
      return;
    }

    // Méthode pour HTTP URLs : fetch standard
    if (src.startsWith('http')) {
      console.log('[DetourageV6] Fetching HTTP URL...');
      fetch(src)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.blob();
        })
        .then(blob => {
          console.log('[DetourageV6] HTTP fetch success, size:', blob.size, 'type:', blob.type);
          resolve(blob);
        })
        .catch(e => {
          console.warn('[DetourageV6] HTTP fetch failed:', e.message, '- falling back to canvas');
          fallbackToCanvas(src, resolve, reject);
        });
      return;
    }

    // Fallback pour tout autre type
    console.log('[DetourageV6] Unknown src type, trying canvas fallback...');
    fallbackToCanvas(src, resolve, reject);
  });
}

/**
 * Fallback : charge l'image dans un <img> invisible, la dessine sur un canvas, et exporte en PNG blob.
 */
function fallbackToCanvas(src: string, resolve: (blob: Blob) => void, reject: (err: Error) => void) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get canvas 2d context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('[DetourageV6] Canvas fallback success, size:', blob.size);
            resolve(blob);
          } else {
            reject(new Error('canvas.toBlob returned null'));
          }
        },
        'image/png'
      );
    } catch (e: any) {
      reject(new Error('Canvas fallback failed: ' + e.message));
    }
  };
  img.onerror = () => {
    reject(new Error('Failed to load image for canvas fallback'));
  };
  img.src = src;
}

/**
 * Essaie aussi de trouver l'image dans le DOM par son data-element-id
 * et de la convertir en blob via canvas.
 */
function getImageFromDOM(elementId: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const imgEl = document.querySelector(`img[data-element-id="${elementId}"]`) as HTMLImageElement;
    if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) {
      console.log('[DetourageV6] Image not found in DOM for elementId:', elementId);
      resolve(null);
      return;
    }
    
    console.log('[DetourageV6] Found image in DOM, src type:', 
      imgEl.src.startsWith('data:') ? 'data URL' : 
      imgEl.src.startsWith('blob:') ? 'blob URL' : 'HTTP URL',
      'naturalWidth:', imgEl.naturalWidth, 'naturalHeight:', imgEl.naturalHeight
    );
    
    // Essayer d'utiliser le src de l'image DOM
    imageSourceToBlob(imgEl.src)
      .then(blob => resolve(blob))
      .catch(() => resolve(null));
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mode principal : Automatique ou Manuel
  const [mode, setMode] = useState<DetourageMode>("auto");
  
  // Outil manuel sélectionné (visible uniquement en mode manuel)
  const [manualTool, setManualTool] = useState<ManualTool>("polygon");
  
  // Options
  const [tolerance, setTolerance] = useState(30);
  const [smoothing, setSmoothing] = useState(true);
  const [brushSize, setBrushSize] = useState(10);
  const [feather, setFeather] = useState(2);
  
  // État du détourage
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetourageResult, setLastDetourageResult] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>("");
  
  // (notification au parent déplacée dans handleModeChange / handleManualToolChange)
  
  // Modes principaux
  const mainModes = [
    { id: "auto", label: language === "fr" ? "Automatique (IA)" : "Automatic (AI)", icon: Sparkles },
    { id: "manual", label: "Manuel", icon: Hand },
  ];
  
  // Outils manuels (visibles uniquement en mode manuel)
  const manualTools = [
    { id: "lasso", label: "Lasso", icon: Lasso },
    { id: "polygon", label: language === "fr" ? "Point par point" : "Point by point", icon: Hexagon },
    { id: "bezier", label: language === "fr" ? "Bézier" : "Bezier", icon: Spline },
    { id: "wand", label: language === "fr" ? "Baguette" : "Magic Wand", icon: Wand2 },
    { id: "face", label: "Visage", icon: User },
  ];
  
  // Lancer le détourage automatique
  const handleAutoDetourage = async () => {
    console.log('[DetourageV6] === handleAutoDetourage START ===');
    console.log('[DetourageV6] activePhoto:', activePhoto ? (activePhoto.substring(0, 80) + '...') : 'null');
    console.log('[DetourageV6] selectedElementId:', selectedElementId);
    
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
    // Sauvegarder l'image originale pour permettre "Recommencer"
    setOriginalImage(activePhoto);
    
    try {
      toast.info(language === "fr" ? "Détourage en cours... Cela peut prendre 30-60 secondes." : "Processing... This may take 30-60 seconds.");
      
      // Étape 1 : Obtenir le blob de l'image
      let imageBlob: Blob | null = null;
      
      // Essayer d'abord avec activePhoto (la source de l'image)
      try {
        imageBlob = await imageSourceToBlob(activePhoto);
      } catch (e: any) {
        console.warn('[DetourageV6] imageSourceToBlob failed:', e.message);
      }
      
      // Si ça échoue, essayer via le DOM
      if (!imageBlob || imageBlob.size === 0) {
        console.log('[DetourageV6] Trying DOM fallback...');
        imageBlob = await getImageFromDOM(selectedElementId);
      }
      
      if (!imageBlob || imageBlob.size === 0) {
        throw new Error(language === 'fr' ? "Impossible de récupérer les données de l'image" : 'Unable to retrieve image data');
      }
      
      console.log('[DetourageV6] Got image blob, size:', imageBlob.size, 'type:', imageBlob.type);

      // Étape 2 : Détourage local avec @imgly/background-removal (pas de serveur)
      setProgressMessage(language === "fr" ? "Traitement IA en cours..." : "AI processing...");

      const resultBlob = await removeBackground(imageBlob, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        progress: (key, current, total) => {
          const percent = Math.round((current / total) * 100);
          setProgressMessage(
            language === "fr" ? `Traitement IA... ${percent}%` : `AI processing... ${percent}%`
          );
        },
      });

      // Convertir le résultat en data URL
      const resultUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(resultBlob);
      });

      setProgressMessage(language === "fr" ? "Application du résultat..." : "Applying result...");

      // Appliquer directement le détourage sur l'élément sélectionné
      if (onApplyDetourageToElement && selectedElementId) {
        onApplyDetourageToElement(selectedElementId, resultUrl);
        setLastDetourageResult(resultUrl);
        toast.success(language === "fr" ? "Détourage appliqué avec succès !" : "Cutout applied successfully!");
      }
    } catch (error: any) {
      console.error('[DetourageV6] Error:', error);
      toast.error(language === "fr" 
        ? `Erreur lors du détourage: ${error.message || 'Erreur inconnue'}` 
        : `Cutout error: ${error.message || 'Unknown error'}`);
      setOriginalImage(null);
    } finally {
      setIsProcessing(false);
      setProgressMessage("");
    }
  };
  
  // Recommencer - restaurer l'image originale
  const handleRecommencer = () => {
    if (originalImage && selectedElementId && onApplyDetourageToElement) {
      onApplyDetourageToElement(selectedElementId, originalImage);
      setLastDetourageResult(null);
      setOriginalImage(null);
      toast.info(language === "fr" ? "Image originale restaurée" : "Original image restored");
    }
  };
  
  const handleModeChange = (newMode: DetourageMode) => {
    setMode(newMode);
    setLastDetourageResult(null);
    setOriginalImage(null);
    // Notifier le parent : mode seul, sans tool (le tool sera envoyé au clic sur l'outil)
    onModeChange?.(newMode, null);
  };

  const handleManualToolChange = (tool: ManualTool) => {
    setManualTool(tool);
    if (mode === "manual") {
      onModeChange?.(mode, tool);
    }
  };
  
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
      
      {/* Sélection du mode principal : Automatique ou Manuel */}
      <div>
        <Label className="text-xs font-medium text-gray-600 mb-2 block">
          {language === "fr" ? "Mode de détourage" : "Cutout mode"}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {mainModes.map((m) => (
            <Button
              key={m.id}
              variant={mode === m.id ? "default" : "outline"}
              size="sm"
              className={`justify-start gap-2 text-xs ${mode === m.id ? "bg-purple-500 hover:bg-purple-600" : ""}`}
              onClick={() => handleModeChange(m.id as DetourageMode)}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Outils manuels - UNIQUEMENT visible en mode Manuel */}
      {mode === "manual" && (
        <div className="space-y-2 pt-2 border-t border-green-200 bg-green-50/50 -mx-4 px-4 py-3">
          <Label className="text-xs font-medium text-green-700 mb-2 block">
            {language === "fr" ? "Outil de sélection" : "Selection tool"}
          </Label>
          <div className="grid grid-cols-2 gap-1">
            {manualTools.map((tool) => (
              <Button
                key={tool.id}
                variant={manualTool === tool.id ? "default" : "outline"}
                size="sm"
                className={`justify-start gap-2 text-xs ${manualTool === tool.id ? "bg-green-500 hover:bg-green-600" : "bg-white"}`}
                onClick={() => handleManualToolChange(tool.id as ManualTool)}
              >
                <tool.icon className="w-3 h-3" />
                {tool.label}
              </Button>
            ))}
          </div>
          
          {/* Message d'instruction pour le mode manuel */}
          <div className="text-xs text-green-700 bg-green-100 rounded p-2 mt-2">
            {manualTool === "polygon" && (language === "fr" 
              ? "Cliquez point par point sur l'image pour tracer le contour. Cliquez sur le premier point (vert) pour fermer."
              : "Click point by point on the image to trace the outline. Click the first point (green) to close.")}
            {manualTool === "lasso" && (language === "fr"
              ? "Maintenez le clic et tracez un contour continu autour de l'élément."
              : "Hold click and draw a continuous outline around the element.")}
            {manualTool === "bezier" && (language === "fr"
              ? "Placez des points pour créer des courbes lisses. Double-clic pour fermer."
              : "Place points to create smooth curves. Double-click to close.")}
            {manualTool === "wand" && (language === "fr"
              ? "Cliquez sur une zone de couleur similaire pour la sélectionner."
              : "Click on a similar color area to select it.")}
            {manualTool === "face" && (language === "fr"
              ? "Détection automatique des visages dans l'image."
              : "Automatic face detection in the image.")}
          </div>
        </div>
      )}
      
      {/* Options selon le mode/outil */}
      <div className="space-y-3 pt-2 border-t">
        {/* Tolérance (pour baguette magique) */}
        {mode === "manual" && manualTool === "wand" && (
          <div>
            <Label className="text-xs text-gray-600">
              {language === "fr" ? "Tolérance" : "Tolerance"}: {tolerance}
            </Label>
            <Slider
              value={[tolerance]}
              onValueChange={([v]) => setTolerance(v)}
              min={0}
              max={100}
              step={1}
              className="mt-1"
            />
          </div>
        )}
        
        {/* Contour progressif */}
        <div>
          <Label className="text-xs text-gray-600">
            {language === "fr" ? "Contour progressif" : "Feather"}: {feather}px
          </Label>
          <Slider
            value={[feather]}
            onValueChange={([v]) => setFeather(v)}
            min={0}
            max={20}
            step={1}
            className="mt-1"
          />
        </div>
        
        {/* Lissage */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-600">
            {language === "fr" ? "Lissage" : "Smoothing"}
          </Label>
          <Switch checked={smoothing} onCheckedChange={setSmoothing} />
        </div>
      </div>
      
      {/* Actions - SIMPLIFIÉ */}
      <div className="space-y-2 pt-2 border-t">
        {mode === "auto" && (
          <>
            {/* Bouton principal de détourage */}
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
            
            {/* Barre de progression */}
            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            )}
            
            {/* Bouton Recommencer - visible seulement après un détourage */}
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
            
            {/* Message d'aide */}
            {selectedElementId && !isProcessing && !lastDetourageResult && (
              <p className="text-xs text-gray-500 text-center">
                {language === "fr" 
                  ? "Le détourage sera appliqué directement sur l'image sélectionnée"
                  : "Cutout will be applied directly to the selected image"}
              </p>
            )}
          </>
        )}
        
        {mode === "manual" && selectedElementId && (
          <div className="text-xs text-blue-600 text-center py-2 bg-blue-50 rounded border border-blue-200">
            {language === "fr" 
              ? "Cliquez sur l'image dans le canvas pour commencer le tracé"
              : "Click on the image in the canvas to start tracing"}
          </div>
        )}
        
        {mode === "manual" && !selectedElementId && (
          <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 rounded">
            {language === "fr" 
              ? "Sélectionnez d'abord une image sur le canvas"
              : "First select an image on the canvas"}
          </div>
        )}
      </div>
    </div>
  );
}
