import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Trash2, HelpCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useLanguage } from '@/contexts/LanguageContext';

interface DuplicateItem {
  id: string;
  src: string;
  name: string;
  date?: string;
}

interface DuplicateValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateItem[];
  onFinish: (decisions: Record<string, 'keep' | 'delete'>) => void;
}

export function DuplicateValidationModal({
  isOpen,
  onClose,
  duplicates,
  onFinish
}: DuplicateValidationModalProps) {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, 'keep' | 'delete'>>({});

  const currentItem = duplicates[currentIndex];
  const totalItems = duplicates.length;
  const progress = ((currentIndex + 1) / totalItems) * 100;

  const handleDecision = (decision: 'keep' | 'delete') => {
    setDecisions(prev => ({ ...prev, [currentItem.id]: decision }));
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    onFinish(decisions);
    onClose();
  };

  if (!currentItem) return null;

  const currentDecision = decisions[currentItem.id];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0 bg-white/95 backdrop-blur-sm border-2 border-blue-500/20 shadow-2xl">
        
        {/* Header Section */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">📸</span>
            </div>
            <h2 className="text-2xl font-bold text-orange-800">{language === 'fr' ? 'Validation des Photos Détectées' : 'Detected Photos Validation'}</h2>
          </div>

          {/* Info Box */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 text-center shadow-sm">
            <h3 className="text-cyan-800 font-bold text-lg mb-1">
              Photo {currentIndex + 1} sur {totalItems}
            </h3>
            <p className="text-cyan-700 text-sm">
              {language === 'fr' ? 'Cette photo a été détectée comme doublon potentiel. Souhaitez-vous la conserver ou la supprimer ?' : 'This photo was detected as a potential duplicate. Do you want to keep or delete it?'}
            </p>
          </div>
        </div>

        {/* Main Content - Image */}
        <div className="flex-1 flex items-center justify-center p-4 bg-slate-50/50 min-h-0">
          <div className="relative group">
            <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 transform transition-transform duration-300 hover:scale-105">
              <img 
                src={currentItem.src} 
                alt={language === 'fr' ? 'Doublon détecté' : 'Duplicate detected'} 
                className="max-h-[30vh] object-contain rounded-lg"
              />
              {currentDecision && (
                <div className={cn(
                  "absolute top-4 right-4 p-2 rounded-full shadow-lg animate-in zoom-in",
                  currentDecision === 'keep' ? "bg-green-500 text-white" : "bg-red-500 text-white"
                )}>
                  {currentDecision === 'keep' ? <Check size={20} /> : <Trash2 size={20} />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="p-6 pt-2 bg-white border-t border-slate-100">
          {/* Decision Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-4 text-amber-800 font-semibold">
              <HelpCircle size={20} />
              <span>{language === 'fr' ? 'Que souhaitez-vous faire avec cette photo ?' : 'What would you like to do with this photo?'}</span>
            </div>
            
            <div className="flex justify-center gap-8">
              <button
                onClick={() => handleDecision('keep')}
                className={cn(
                  "flex flex-col items-center gap-2 px-8 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95",
                  currentDecision === 'keep' 
                    ? "bg-green-100 border-green-500 shadow-inner" 
                    : "bg-white border-green-200 hover:border-green-400 hover:bg-green-50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl shadow-md transition-colors",
                  currentDecision === 'keep' ? "bg-green-600" : "bg-green-500"
                )}>
                  ✓
                </div>
                <span className="font-bold text-green-800">{language === 'fr' ? 'Garder' : 'Keep'}</span>
              </button>

              <button
                onClick={() => handleDecision('delete')}
                className={cn(
                  "flex flex-col items-center gap-2 px-8 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95",
                  currentDecision === 'delete' 
                    ? "bg-red-100 border-red-500 shadow-inner" 
                    : "bg-white border-red-200 hover:border-red-400 hover:bg-red-50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl shadow-md transition-colors",
                  currentDecision === 'delete' ? "bg-red-600" : "bg-red-500"
                )}>
                  🗑
                </div>
                <span className="font-bold text-red-800">{language === 'fr' ? 'Supprimer' : 'Delete'}</span>
              </button>
            </div>
          </div>

          {/* Navigation & Progress */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="gap-2"
            >
              <ArrowLeft size={16} /> {language === 'fr' ? 'Précédent' : 'Previous'}
            </Button>
            
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <Button 
              variant="outline" 
              onClick={handleNext}
              disabled={currentIndex === totalItems - 1}
              className="gap-2"
            >
              {language === 'fr' ? 'Suivant' : 'Next'} <ArrowRight size={16} />
            </Button>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-700">
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleFinish}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-cyan-200"
            >
              {language === 'fr' ? 'Terminer' : 'Finish'}
            </Button>
          </div>
        </div>

        {/* Quit Button (Absolute) */}
        <div className="absolute -bottom-16 right-0">
          <Button 
            variant="destructive" 
            onClick={onClose}
            className="shadow-lg border-2 border-white"
          >
            {language === 'fr' ? 'Quitter' : 'Quit'}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
