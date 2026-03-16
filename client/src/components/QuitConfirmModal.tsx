import { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface QuitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndQuit?: () => void; // Callback optionnel pour sauvegarder avant de quitter
}

export default function QuitConfirmModal({ isOpen, onClose, onSaveAndQuit }: QuitConfirmModalProps) {
  const [, setLocation] = useLocation();
  const [saveChoice, setSaveChoice] = useState<'oui' | 'non' | null>(null);

  const handleSaveChoice = (choice: 'oui' | 'non') => {
    setSaveChoice(choice);
  };

  const handleQuit = () => {
    if (saveChoice === 'oui' && onSaveAndQuit) {
      // Sauvegarder puis quitter
      onSaveAndQuit();
    }
    // Quitter vers l'accueil
    setLocation('/');
    onClose();
    setSaveChoice(null);
  };

  const handleClose = () => {
    onClose();
    setSaveChoice(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-0 border-2 border-cyan-400 rounded-lg overflow-hidden">
        <div className="bg-white p-6">
          {/* Ligne Sauvegarde de la session */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <span className="text-cyan-500 font-semibold text-lg">
              Sauvegarde de la session :
            </span>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSaveChoice('oui')}
                className={`px-6 py-2 border-2 font-semibold transition-all ${
                  saveChoice === 'oui' 
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-600' 
                    : 'border-cyan-400 text-cyan-500 hover:bg-cyan-50'
                }`}
              >
                OUI
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSaveChoice('non')}
                className={`px-6 py-2 border-2 font-semibold transition-all ${
                  saveChoice === 'non' 
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-600' 
                    : 'border-cyan-400 text-cyan-500 hover:bg-cyan-50'
                }`}
              >
                NON
              </Button>
            </div>
          </div>

          {/* Ligne Quitter */}
          <div className="flex items-center justify-between">
            <span className="text-cyan-500 font-semibold text-lg">
              Quitter
            </span>
            <Button
              variant="outline"
              onClick={handleQuit}
              disabled={saveChoice === null}
              className={`px-8 py-2 border-2 font-semibold transition-all ${
                saveChoice !== null
                  ? 'border-cyan-400 text-cyan-500 hover:bg-cyan-50'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
            >
              OK
            </Button>
          </div>

          {/* Message d'aide si aucun choix */}
          {saveChoice === null && (
            <p className="text-xs text-gray-500 text-center mt-4">
              Veuillez d'abord choisir OUI ou NON pour la sauvegarde
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
