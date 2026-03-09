import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, X, Copy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DuplicateDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  newPhoto: { file: File, preview: string };
  existingPhoto: { url: string, title: string, date?: string };
  onKeepBoth: () => void;
  onReplace: () => void;
  onIgnore: () => void;
}

const DuplicateDetectionModal: React.FC<DuplicateDetectionModalProps> = ({
  isOpen,
  onClose,
  newPhoto,
  existingPhoto,
  onKeepBoth,
  onReplace,
  onIgnore
}) => {
  const { language } = useLanguage();
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-4 border-amber-500 rounded-xl shadow-2xl">
        {/* Header Ambre Alerte */}
        <div className="bg-amber-500 p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{language === "fr" ? "Doublon Détecté" : "Duplicate Detected"}</h2>
              <p className="text-amber-100 text-sm">{language === "fr" ? "Cette photo semble déjà exister dans votre album" : "This photo seems to already exist in your album"}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-white hover:bg-amber-600 rounded-full w-10 h-10"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Corps Principal : Comparaison */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50">
          
          {/* Photo Existante (Gauche) */}
          <div className="flex-1 p-6 flex flex-col items-center border-r border-gray-200">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 mb-4 font-bold text-gray-600">
              {language === "fr" ? "DÉJÀ DANS L'ALBUM" : "ALREADY IN ALBUM"}
            </div>
            <div className="flex-1 w-full bg-white p-4 rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
              <img 
                src={existingPhoto.url} 
                alt={language === "fr" ? "Photo existante" : "Existing photo"} 
                className="max-w-full max-h-[400px] object-contain rounded"
              />
              <div className="mt-4 text-center">
                <p className="font-bold text-gray-800">{existingPhoto.title}</p>
                <p className="text-sm text-gray-500">{existingPhoto.date || language === 'fr' ? 'Date inconnue' : 'Unknown date'}</p>
              </div>
              {/* Overlay grisé pour montrer qu'elle est "ancienne" */}
              <div className="absolute inset-0 bg-gray-900/5 pointer-events-none" />
            </div>
          </div>

          {/* Nouvelle Photo (Droite) */}
          <div className="flex-1 p-6 flex flex-col items-center">
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full shadow-sm border border-blue-200 mb-4 font-bold">
              {language === "fr" ? "NOUVELLE PHOTO" : "NEW PHOTO"}
            </div>
            <div className="flex-1 w-full bg-white p-4 rounded-xl shadow-md border-2 border-blue-400 flex flex-col items-center justify-center relative overflow-hidden">
              <img 
                src={newPhoto.preview} 
                alt={language === "fr" ? "Nouvelle photo" : "New photo"} 
                className="max-w-full max-h-[400px] object-contain rounded"
              />
              <div className="mt-4 text-center">
                <p className="font-bold text-gray-800">{newPhoto.file.name}</p>
                <p className="text-sm text-gray-500">{(newPhoto.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              {/* Badge NEW */}
              <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                {language === "fr" ? "NOUVEAU" : "NEW"}
              </div>
            </div>
          </div>

        </div>

        {/* Footer : Actions */}
        <div className="bg-white p-6 border-t border-gray-200 shrink-0">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6">
            
            <button
              onClick={onIgnore}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200">
                <X className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-gray-700">{language === "fr" ? "Ignorer" : "Ignore"}</span>
                <span className="text-xs text-gray-500">{language === "fr" ? "Ne pas importer" : "Do not import"}</span>
              </div>
            </button>

            <button
              onClick={onReplace}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-blue-700">{language === "fr" ? "Remplacer" : "Replace"}</span>
                <span className="text-xs text-blue-500">{language === "fr" ? "Mettre à jour l'ancienne" : "Update the old one"}</span>
              </div>
            </button>

            <button
              onClick={onKeepBoth}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200">
                <Copy className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-green-700">{language === "fr" ? "Garder les deux" : "Keep both"}</span>
                <span className="text-xs text-green-500">{language === "fr" ? "Créer une copie" : "Create a copy"}</span>
              </div>
            </button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateDetectionModal;
