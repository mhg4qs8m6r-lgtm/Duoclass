import { useState } from 'react';
import { removeBackground } from '@imgly/background-removal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles } from 'lucide-react';
import QuitConfirmModal from '@/components/QuitConfirmModal';
import { useLanguage } from '@/contexts/LanguageContext';

// Types pour les fonctions de retouche
type RetouchFunction = {
  id: number;
  name: string;
  nameEn: string;
  category: string;
  categoryEn: string;
};

// Liste des 12 fonctions de retouche
const retouchFunctions: RetouchFunction[] = [
  // Amélioration et qualité
  { id: 1, name: "Qualité, netteté, couleurs", nameEn: "Quality, sharpness, colors", category: "Amélioration et qualité", categoryEn: "Enhancement and quality" },
  { id: 2, name: "Agrandissement d'image", nameEn: "Image enlargement", category: "Amélioration et qualité", categoryEn: "Enhancement and quality" },
  { id: 3, name: "Correction yeux rouges", nameEn: "Red eye correction", category: "Amélioration et qualité", categoryEn: "Enhancement and quality" },
  // Nettoyage et composition
  { id: 4, name: "Suppression d'objets", nameEn: "Object removal", category: "Nettoyage et composition", categoryEn: "Cleaning and composition" },
  { id: 5, name: "Suppression d'arrière plan", nameEn: "Background removal", category: "Nettoyage et composition", categoryEn: "Cleaning and composition" },
  { id: 6, name: "Flou d'arrière plan", nameEn: "Background blur", category: "Nettoyage et composition", categoryEn: "Cleaning and composition" },
  { id: 7, name: "Remplissage génératif", nameEn: "Generative fill", category: "Nettoyage et composition", categoryEn: "Cleaning and composition" },
  // Restauration et colorisation
  { id: 8, name: "Restaur. vieilles photos", nameEn: "Old photo restoration", category: "Restauration et colorisation", categoryEn: "Restoration and colorization" },
  { id: 9, name: "Photo NB / couleur", nameEn: "B&W / color photo", category: "Restauration et colorisation", categoryEn: "Restoration and colorization" },
  // Cadrage et redressement
  { id: 10, name: "Cadrage intelligent", nameEn: "Smart cropping", category: "Cadrage et redressement", categoryEn: "Framing and straightening" },
  { id: 11, name: "Rotation intelligente", nameEn: "Smart rotation", category: "Cadrage et redressement", categoryEn: "Framing and straightening" },
  // Créativité
  { id: 12, name: "Transform. artistique", nameEn: "Artistic transform", category: "Créativité", categoryEn: "Creativity" },
];

// Grouper les fonctions par catégorie
const categories = [
  { fr: "Amélioration et qualité", en: "Enhancement and quality" },
  { fr: "Nettoyage et composition", en: "Cleaning and composition" },
  { fr: "Restauration et colorisation", en: "Restoration and colorization" },
  { fr: "Cadrage et redressement", en: "Framing and straightening" },
  { fr: "Créativité", en: "Creativity" },
];

interface RetouchePhotoProps {
  imageUrl: string;
  imageTitle: string;
  imageComments: string;
  albumId: string;
  frameId: number;
  onSaveAsCopy: (newImageUrl: string, newTitle: string) => void;
  onClose: () => void;
}

export default function RetouchePhoto({ 
  imageUrl, 
  imageTitle, 
  imageComments,
  albumId,
  frameId,
  onSaveAsCopy, 
  onClose 
}: RetouchePhotoProps) {
  const { language } = useLanguage();
  // États
  const [selectedFunction, setSelectedFunction] = useState<number | null>(null);
  const [originalPhoto] = useState<string>(imageUrl);
  const [retouchedPhoto, setRetouchedPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState(imageTitle);
  const [comments, setComments] = useState(imageComments);
  const [isSelected, setIsSelected] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEnlargedOriginal, setShowEnlargedOriginal] = useState(false);
  const [showEnlargedRetouched, setShowEnlargedRetouched] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);

  // Appliquer la retouche (traitement local uniquement)
  const applyRetouch = async () => {
    if (!selectedFunction) {
      toast.info(language === "fr" ? "Veuillez sélectionner une fonction de retouche" : "Please select an editing function");
      return;
    }

    setIsProcessing(true);
    const functionName = retouchFunctions.find(f => f.id === selectedFunction)?.name;
    toast.loading(`Application de "${functionName}"...`, { id: 'retouch' });

    try {
      await applyLocalRetouch();
    } catch (error) {
      console.error("Erreur retouche:", error);
      toast.error(language === "fr" ? "Erreur lors de la retouche" : "Retouch error", { id: 'retouch' });
      setIsProcessing(false);
    }
  };

  // Fonctions nécessitant une API IA (non disponibles en mode nomade)
  // Note: La fonction 5 (Suppression d'arrière-plan) utilise maintenant @imgly/background-removal
  const AI_REQUIRED_FUNCTIONS = [4, 6, 7, 8];

  // Traitement local (fallback)
  const applyLocalRetouch = async () => {
    const functionName = retouchFunctions.find(f => f.id === selectedFunction)?.name;
    
    // Vérifier si la fonction nécessite une API IA
    if (selectedFunction && AI_REQUIRED_FUNCTIONS.includes(selectedFunction)) {
      toast.error(
        language === 'fr'
          ? `"${functionName}" nécessite une connexion Internet et une API IA. Cette fonctionnalité sera disponible dans une prochaine version.`
          : `"${functionName}" requires an Internet connection and an AI API. This feature will be available in a future version.`,
        { id: 'retouch', duration: 5000 }
      );
      setIsProcessing(false);
      return;
    }
    
    // Traitement spécial pour la suppression d'arrière-plan (fonction 5)
    if (selectedFunction === 5) {
      try {
        toast.loading(language === 'fr' ? 'Suppression de l\'arrière-plan en cours... (cela peut prendre quelques secondes)' : 'Removing background... (this may take a few seconds)', { id: 'retouch' });
        
        // Convertir l'URL de l'image en Blob
        const response = await fetch(originalPhoto);
        const blob = await response.blob();
        
        // Utiliser @imgly/background-removal avec CDN officiel pour les modèles ONNX/WASM
        const resultBlob = await removeBackground(blob, {
          // Charger depuis le CDN officiel pour éviter de bundler les fichiers WASM (~25 MB)
          publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
          progress: (key, current, total) => {
            if (key === 'compute:inference') {
              const percent = Math.round((current / total) * 100);
              toast.loading(`Traitement IA en cours... ${percent}%`, { id: 'retouch' });
            }
          }
        });
        
        // Convertir le résultat en Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const resultUrl = reader.result as string;
          setRetouchedPhoto(resultUrl);
          toast.success(language === 'fr' ? 'Arrière-plan supprimé avec succès !' : 'Background removed successfully!', { id: 'retouch' });
          setIsProcessing(false);
        };
        reader.readAsDataURL(resultBlob);
        return;
      } catch (error) {
        console.error('Erreur suppression arrière-plan:', error);
        toast.error(language === 'fr' ? 'Erreur lors de la suppression de l\'arrière-plan' : 'Error removing background', { id: 'retouch' });
        setIsProcessing(false);
        return;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        // Dessiner l'image d'abord
        ctx.drawImage(img, 0, 0);
        
        // Obtenir les données de pixels pour les traitements avancés
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        switch (selectedFunction) {
          case 1: // Qualité, netteté, couleurs - Amélioration globale
            for (let i = 0; i < data.length; i += 4) {
              // Augmenter le contraste et la saturation
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Contraste
              const factor = 1.15;
              data[i] = Math.min(255, Math.max(0, ((r - 128) * factor) + 128));
              data[i + 1] = Math.min(255, Math.max(0, ((g - 128) * factor) + 128));
              data[i + 2] = Math.min(255, Math.max(0, ((b - 128) * factor) + 128));
              
              // Saturation
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              const satFactor = 1.2;
              data[i] = Math.min(255, Math.max(0, gray + satFactor * (data[i] - gray)));
              data[i + 1] = Math.min(255, Math.max(0, gray + satFactor * (data[i + 1] - gray)));
              data[i + 2] = Math.min(255, Math.max(0, gray + satFactor * (data[i + 2] - gray)));
            }
            ctx.putImageData(imageData, 0, 0);
            break;
            
          case 2: // Agrandissement d'image (simulation avec netteté)
            // Appliquer un léger sharpening
            ctx.filter = 'contrast(1.08) brightness(1.02)';
            ctx.drawImage(img, 0, 0);
            break;
            
          case 3: // Correction yeux rouges
            // Réduire les rouges intenses
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Détecter les pixels rouges (yeux rouges)
              if (r > 100 && r > g * 1.5 && r > b * 1.5) {
                // Réduire le rouge et augmenter les autres
                const avg = (g + b) / 2;
                data[i] = Math.min(255, avg * 0.8);
                data[i + 1] = Math.min(255, g * 1.1);
                data[i + 2] = Math.min(255, b * 1.1);
              }
            }
            ctx.putImageData(imageData, 0, 0);
            break;
            
          case 9: // Photo NB / couleur - Colorisation ou N&B
            // Convertir en niveaux de gris avec contraste amélioré
            for (let i = 0; i < data.length; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              // Appliquer un contraste
              const contrast = 1.2;
              const adjusted = ((gray - 128) * contrast) + 128;
              const final = Math.min(255, Math.max(0, adjusted));
              data[i] = final;
              data[i + 1] = final;
              data[i + 2] = final;
            }
            ctx.putImageData(imageData, 0, 0);
            break;
            
          case 10: // Cadrage intelligent - Recadrage centré 16:9
            const targetRatio = 16 / 9;
            const currentRatio = canvas.width / canvas.height;
            let cropX = 0, cropY = 0, cropW = canvas.width, cropH = canvas.height;
            
            if (currentRatio > targetRatio) {
              // Image trop large, rogner les côtés
              cropW = canvas.height * targetRatio;
              cropX = (canvas.width - cropW) / 2;
            } else {
              // Image trop haute, rogner haut/bas
              cropH = canvas.width / targetRatio;
              cropY = (canvas.height - cropH) / 2;
            }
            
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropW;
            croppedCanvas.height = cropH;
            const croppedCtx = croppedCanvas.getContext('2d');
            if (croppedCtx) {
              croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
              const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.92);
              setRetouchedPhoto(croppedUrl);
              toast.success(language === 'fr' ? `"${functionName}" appliqué - Format 16:9` : `"${functionName}" applied - 16:9 format`, { id: 'retouch' });
              setIsProcessing(false);
              return;
            }
            break;
            
          case 11: // Rotation intelligente - Rotation 90°
            const rotatedCanvas = document.createElement('canvas');
            rotatedCanvas.width = canvas.height;
            rotatedCanvas.height = canvas.width;
            const rotatedCtx = rotatedCanvas.getContext('2d');
            if (rotatedCtx) {
              rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
              rotatedCtx.rotate(Math.PI / 2);
              rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
              const rotatedUrl = rotatedCanvas.toDataURL('image/jpeg', 0.92);
              setRetouchedPhoto(rotatedUrl);
              toast.success(language === 'fr' ? `"${functionName}" appliqué - Rotation 90°` : `"${functionName}" applied - 90° rotation`, { id: 'retouch' });
              setIsProcessing(false);
              return;
            }
            break;
            
          case 12: // Transformation artistique - Effet peinture
            // Effet posterisation + saturation
            const levels = 6;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.round(data[i] / (256 / levels)) * (256 / levels);
              data[i + 1] = Math.round(data[i + 1] / (256 / levels)) * (256 / levels);
              data[i + 2] = Math.round(data[i + 2] / (256 / levels)) * (256 / levels);
              
              // Augmenter la saturation
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              const satFactor = 1.5;
              data[i] = Math.min(255, Math.max(0, gray + satFactor * (data[i] - gray)));
              data[i + 1] = Math.min(255, Math.max(0, gray + satFactor * (data[i + 1] - gray)));
              data[i + 2] = Math.min(255, Math.max(0, gray + satFactor * (data[i + 2] - gray)));
            }
            ctx.putImageData(imageData, 0, 0);
            break;
            
          default:
            // Pas de traitement
            break;
        }
        
        const newImageUrl = canvas.toDataURL('image/jpeg', 0.92);
        setRetouchedPhoto(newImageUrl);
        toast.success(language === 'fr' ? `"${functionName}" appliqué avec succès` : `"${functionName}" applied successfully`, { id: 'retouch' });
      }
      setIsProcessing(false);
    };

    img.onerror = () => {
      toast.error(language === "fr" ? "Erreur lors du traitement de l'image" : "Error processing image", { id: 'retouch' });
      setIsProcessing(false);
    };

    img.src = originalPhoto;
  };

  // Enregistrer comme copie avec suffixe _ret
  const handleSave = () => {
    if (!retouchedPhoto) {
      toast.error(language === "fr" ? "Aucune photo retouchée à enregistrer" : "No edited photo to save");
      return;
    }
    
    // Créer le nouveau titre avec suffixe _ret
    const baseName = title.replace(/_ret\d*$/, ''); // Enlever les suffixes existants
    const newTitle = `${baseName}_ret`;
    
    onSaveAsCopy(retouchedPhoto, newTitle);
  };

  // Nouvelle retouche
  const handleNewRetouch = () => {
    setRetouchedPhoto(null);
    setSelectedFunction(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-6 py-2 flex items-center justify-between shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-gray-800">{language === 'fr' ? 'Retouche Photo' : 'Photo Retouch'}</h1>
        <Button
          variant="destructive"
          onClick={() => setShowQuitModal(true)}
          className="shadow-lg"
        >
          Quitter
        </Button>
      </div>

      {/* Contenu principal - pas de scroll */}
      <div className="flex-1 flex min-h-0">
        {/* Panneau gauche - Fonctions de retouche */}
        <div className="w-64 bg-white border-r flex flex-col shrink-0">
          <div className="flex-1 p-3 space-y-2 overflow-hidden">
            {categories.map((category) => (
              <div key={category.fr} className="space-y-1">
                <h3 className="font-semibold text-gray-700 text-xs border-b pb-1">
                  {language === "fr" ? category.fr : category.en}
                </h3>
                <div className="space-y-0.5 pl-1">
                  {retouchFunctions
                    .filter(f => f.category === category.fr)
                    .map((func) => (
                      <label 
                        key={func.id}
                        className={`flex items-center gap-1.5 p-1 rounded cursor-pointer transition-colors text-xs ${
                          selectedFunction === func.id 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="retouchFunction"
                          checked={selectedFunction === func.id}
                          onChange={() => {
                                          setSelectedFunction(func.id);
                                          // Lancer automatiquement le traitement après sélection
                                          setTimeout(() => {
                                            const btn = document.getElementById('apply-retouch-btn');
                                            if (btn) btn.click();
                                          }, 100);
                                        }}
                          className="w-3 h-3 text-blue-600"
                        />
                        <span>{func.id}) {language === "fr" ? func.name : func.nameEn}</span>
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bouton Retour en bas */}
          <div className="p-3 border-t shrink-0">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full gap-2 h-8 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </div>
        </div>

        {/* Panneau droit - Photos côte à côte */}
        <div className="flex-1 flex flex-col p-4 min-h-0">
          <h2 className="text-center font-semibold text-gray-700 mb-2 shrink-0">
            Photo de l'album
          </h2>
          
          {/* Zone des deux photos côte à côte */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Photo originale */}
            <div className="flex-1 flex flex-col min-h-0">
              <p className="text-center text-sm text-gray-500 mb-2 shrink-0">Photo originale</p>
              
              <div className="flex-1 flex flex-col min-h-0">
                <div 
                  className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white cursor-pointer flex items-center justify-center min-h-0"
                  onDoubleClick={() => setShowEnlargedOriginal(true)}
                  title={language === 'fr' ? 'Double-clic pour agrandir' : 'Double-click to enlarge'}
                >
                  {originalPhoto ? (
                    <img 
                      src={originalPhoto} 
                      alt="Photo originale" 
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400">{language === 'fr' ? 'Aucune photo' : 'No photos'}</div>
                  )}
                </div>
                
                {/* Titre et commentaires */}
                <div className="mt-2 space-y-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={isSelected} 
                      onCheckedChange={(checked) => setIsSelected(checked as boolean)}
                    />
                    <Input 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Titre"
                      className="flex-1 h-7 text-sm"
                    />
                  </div>
                  <Textarea 
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Commentaires"
                    className="text-sm resize-none h-12"
                  />
                </div>

                {/* Info et bouton caché */}
                <div className="flex flex-col items-center gap-1 mt-2 shrink-0">
                  <span className="text-xs text-gray-500">{language === "fr" ? "Photo sélectionnée dans PhotoClass" : "Photo selected in PhotoClass"}</span>
                  <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200">{language === 'fr' ? '⚠️ Les fonctions ne se cumulent pas. Pour cumuler, enregistrez puis relancez.' : '⚠️ Functions do not stack. To combine, save then reapply.'}</span>
                  <Button 
                    id="apply-retouch-btn"
                    onClick={applyRetouch}
                    disabled={!selectedFunction || isProcessing}
                    className="hidden"
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
            </div>

            {/* Photo retouchée */}
            <div className="flex-1 flex flex-col min-h-0">
              <p className="text-center text-sm text-gray-500 mb-2 shrink-0">{language === "fr" ? language === "fr" ? "Photo retouchée" : "Edited photo" : "Edited photo"}</p>
              
              <div className="flex-1 flex flex-col min-h-0">
                <div 
                  className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white cursor-pointer flex items-center justify-center min-h-0"
                  onDoubleClick={() => retouchedPhoto && setShowEnlargedRetouched(true)}
                  title="Double-clic pour agrandir"
                >
                  {retouchedPhoto ? (
                    <img 
                      src={retouchedPhoto} 
                      alt={language === 'fr' ? 'Photo retouchée' : 'Retouched photo'} 
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 text-center text-sm">
                      {language === 'fr' ? <>La photo retouchée<br/>apparaîtra ici</> : <>The retouched photo<br/>will appear here</>}
                    </div>
                  )}
                </div>

                {/* Bouton Nouvelle retouche - rapproché */}
                <div className="flex items-center justify-center gap-2 mt-2 shrink-0">
                  <span className="text-xs text-gray-500">{language === 'fr' ? 'Double-clic pour agrandir' : 'Double-click to enlarge'}</span>
                  <button 
                    onClick={handleNewRetouch}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-sm"
                    title={language === 'fr' ? 'Nouvelle retouche' : 'New retouch'}
                  >
                    <Sparkles className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-600">{language === 'fr' ? 'Nouvelle retouche' : 'New retouch'}</span>
                  </button>
                </div>

                {/* Bouton Enregistrer */}
                <div className="flex items-center justify-center gap-2 mt-2 shrink-0">
                  <span className="text-xs text-gray-600">{language === 'fr' ? "Enregistrer comme copie dans l'album" : 'Save as copy in album'}</span>
                  <Button 
                    onClick={handleSave}
                    disabled={!retouchedPhoto}
                    className="h-7 text-sm px-4"
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal agrandissement photo originale */}
      {showEnlargedOriginal && originalPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setShowEnlargedOriginal(false)}
        >
          <img 
            src={originalPhoto} 
            alt="Photo originale agrandie" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Modal agrandissement photo retouchée */}
      {showEnlargedRetouched && retouchedPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setShowEnlargedRetouched(false)}
        >
          <img 
            src={retouchedPhoto} 
           alt={language === "fr" ? "Photo retouchée agrandie" : "Enlarged edited photo"}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* MODALE CONFIRMATION QUITTER */}
      <QuitConfirmModal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        onSaveAndQuit={() => {
          // Sauvegarder la photo retouchée si elle existe
          if (retouchedPhoto) {
            const baseName = title.replace(/_ret\d*$/, '');
            const newTitle = `${baseName}_ret`;
            onSaveAsCopy(retouchedPhoto, newTitle);
            toast.success(language === 'fr' ? 'Photo retouchée sauvegardée' : 'Edited photo saved');
          }
          onClose();
        }}
      />
    </div>
  );
}
