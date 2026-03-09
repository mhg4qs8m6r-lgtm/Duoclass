import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Square, Download, X, Image as ImageIcon, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PreviewFile {
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
  selected: boolean;
}

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onImport: (files: File[]) => void;
  isPhoto: boolean;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  onClose,
  files,
  onImport,
  isPhoto
}) => {
  const { language } = useLanguage();
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && files.length > 0) {
      setLoading(true);
      loadPreviews();
    }
  }, [isOpen, files]);

  const loadPreviews = async () => {
    const previews: PreviewFile[] = await Promise.all(
      files.map(async (file) => {
        let preview = '';
        
        if (file.type.startsWith('image/')) {
          preview = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        } else if (file.type === 'application/pdf') {
          // Pour les PDF, on utilise une icône
          preview = 'pdf';
        }

        return {
          file,
          preview,
          name: file.name,
          size: file.size,
          type: file.type,
          selected: true // Sélectionné par défaut
        };
      })
    );

    setPreviewFiles(previews);
    setLoading(false);
  };

  const toggleSelection = (index: number) => {
    setPreviewFiles(prev => prev.map((pf, i) => 
      i === index ? { ...pf, selected: !pf.selected } : pf
    ));
  };

  const selectAll = () => {
    setPreviewFiles(prev => prev.map(pf => ({ ...pf, selected: true })));
  };

  const deselectAll = () => {
    setPreviewFiles(prev => prev.map(pf => ({ ...pf, selected: false })));
  };

  const handleImport = () => {
    const selectedFiles = previewFiles.filter(pf => pf.selected).map(pf => pf.file);
    if (selectedFiles.length > 0) {
      onImport(selectedFiles);
    }
  };

  const selectedCount = previewFiles.filter(pf => pf.selected).length;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center text-lg flex items-center justify-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            {language === 'fr' ? `Prévisualisation - ${files.length} ${isPhoto ? 'photo(s)' : 'document(s)'} trouvé(s)` : `Preview - ${files.length} ${isPhoto ? 'photo(s)' : 'document(s)'} found`}
          </DialogTitle>
        </DialogHeader>

        {/* Barre d'outils */}
        <div className="flex items-center justify-between px-2 py-2 bg-gray-50 rounded-lg">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAll}
              className="gap-1"
            >
              <CheckSquare className="w-4 h-4" />
              {language === 'fr' ? 'Tout sélectionner' : 'Select all'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={deselectAll}
              className="gap-1"
            >
              <Square className="w-4 h-4" />
              {language === 'fr' ? 'Tout désélectionner' : 'Deselect all'}
            </Button>
          </div>
          <span className="text-sm text-gray-600 font-medium">
            {selectedCount} / {previewFiles.length} {language === 'fr' ? 'sélectionné(s)' : 'selected'}
          </span>
        </div>

        {/* Grille de prévisualisation */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-500">{language === 'fr' ? 'Chargement des aperçus...' : 'Loading previews...'}</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {previewFiles.map((pf, index) => (
                <div 
                  key={index}
                  onClick={() => toggleSelection(index)}
                  className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                    pf.selected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="absolute top-1 left-1 z-10">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      pf.selected ? 'bg-blue-500' : 'bg-white border border-gray-300'
                    }`}>
                      {pf.selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Aperçu */}
                  <div className="aspect-square flex items-center justify-center bg-gray-100">
                    {pf.preview === 'pdf' ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-10 h-10 text-red-500" />
                        <span className="text-xs text-red-500 font-bold mt-1">PDF</span>
                      </div>
                    ) : pf.preview ? (
                      <img 
                        src={pf.preview} 
                        alt={pf.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-gray-400" />
                    )}
                  </div>

                  {/* Nom du fichier */}
                  <div className="p-1 bg-white">
                    <p className="text-[10px] text-gray-600 truncate" title={pf.name}>
                      {pf.name}
                    </p>
                    <p className="text-[9px] text-gray-400">
                      {formatFileSize(pf.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center border-t pt-4">
          <Button variant="outline" onClick={onClose} className="gap-1">
            <X className="w-4 h-4" />
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={selectedCount === 0}
            className="gap-1 bg-blue-500 hover:bg-blue-600"
          >
            <Download className="w-4 h-4" />
            {language === 'fr' ? 'Importer' : 'Import'} {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportPreviewModal;
