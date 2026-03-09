import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save } from 'lucide-react';
import { PhotoFrame } from '@/types/photo';
import { useLanguage } from '@/contexts/LanguageContext';

interface PhotoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: PhotoFrame | null;
  onSave: (updatedPhoto: PhotoFrame) => void;
}

export default function PhotoDetailsModal({ isOpen, onClose, photo, onSave }: PhotoDetailsModalProps) {
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDate, setEditedDate] = useState('');
  const [editedComments, setEditedComments] = useState('');
  
  // Camera Metadata State
  const [editedCameraModel, setEditedCameraModel] = useState('');
  const [editedISO, setEditedISO] = useState('');
  const [editedAperture, setEditedAperture] = useState('');
  const [editedShutterSpeed, setEditedShutterSpeed] = useState('');
  const [editedFocalLength, setEditedFocalLength] = useState('');

  useEffect(() => {
    if (photo) {
      setEditedTitle(photo.title);
      setEditedDate(photo.date || '');
      setEditedComments(photo.comments || '');
      setEditedCameraModel(photo.cameraModel || '');
      setEditedISO(photo.iso || '');
      setEditedAperture(photo.aperture || '');
      setEditedShutterSpeed(photo.shutterSpeed || '');
      setEditedFocalLength(photo.focalLength || '');
    }
  }, [photo]);

  const handleSave = () => {
    if (photo) {
      onSave({
        ...photo,
        title: editedTitle,
        date: editedDate,
        comments: editedComments,
        cameraModel: editedCameraModel,
        iso: editedISO,
        aperture: editedAperture,
        shutterSpeed: editedShutterSpeed,
        focalLength: editedFocalLength
      });
      setIsEditing(false);
    }
  };

  if (!photo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{language === "fr" ? "Détails de la photo" : "Photo details"}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/5 rounded-lg flex items-center justify-center p-4 min-h-[300px]">
            {photo.photoUrl && (
              <img 
                src={photo.photoUrl} 
                alt={photo.title}
                className="max-w-full max-h-[500px] object-contain rounded shadow-sm"
              />
            )}
          </div>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Informations</h3>
                <Button 
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className={isEditing ? "bg-green-600 hover:bg-green-700" : "border-blue-200 text-blue-700 hover:bg-blue-50"}
                >
                  {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
                  {isEditing ? 'Enregistrer' : 'Modifier'}
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-500">Titre</Label>
                  {isEditing ? (
                    <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} />
                  ) : (
                    <p className="font-medium">{photo.title}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-gray-500">Date</Label>
                  {isEditing ? (
                    <Input value={editedDate} onChange={(e) => setEditedDate(e.target.value)} />
                  ) : (
                    <p className="font-medium">{photo.date || 'Non datée'}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-gray-500">Format</Label>
                  <p className="font-medium">{photo.format || 'JPG'}</p>
                </div>
              </div>
            </div>

            {/* Camera Metadata Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-md font-semibold text-gray-900">{language === 'fr' ? 'Données de prise de vue' : 'Shooting data'}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Appareil</Label>
                  {isEditing ? (
                    <Input value={editedCameraModel} onChange={(e) => setEditedCameraModel(e.target.value)} className="h-8 text-sm" placeholder="ex: Canon EOS R5" />
                  ) : (
                    <p className="font-medium text-sm">{photo.cameraModel || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">ISO</Label>
                  {isEditing ? (
                    <Input value={editedISO} onChange={(e) => setEditedISO(e.target.value)} className="h-8 text-sm" placeholder="ex: 100" />
                  ) : (
                    <p className="font-medium text-sm">{photo.iso || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Ouverture</Label>
                  {isEditing ? (
                    <Input value={editedAperture} onChange={(e) => setEditedAperture(e.target.value)} className="h-8 text-sm" placeholder="ex: f/2.8" />
                  ) : (
                    <p className="font-medium text-sm">{photo.aperture || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Vitesse</Label>
                  {isEditing ? (
                    <Input value={editedShutterSpeed} onChange={(e) => setEditedShutterSpeed(e.target.value)} className="h-8 text-sm" placeholder="ex: 1/200" />
                  ) : (
                    <p className="font-medium text-sm">{photo.shutterSpeed || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Focale</Label>
                  {isEditing ? (
                    <Input value={editedFocalLength} onChange={(e) => setEditedFocalLength(e.target.value)} className="h-8 text-sm" placeholder="ex: 50mm" />
                  ) : (
                    <p className="font-medium text-sm">{photo.focalLength || '-'}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-500">Commentaires</Label>
              {isEditing ? (
                <Textarea 
                  value={editedComments} 
                  onChange={(e) => setEditedComments(e.target.value)}
                  placeholder={language === 'fr' ? 'Ajouter un commentaire...' : 'Add a comment...'}
                  className="min-h-[100px]"
                />
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg min-h-[100px] text-sm text-gray-700">
                  {photo.comments || 'Aucun commentaire'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{language === 'fr' ? 'Fermer' : 'Close'}</Button>
          {isEditing && (
            <Button onClick={handleSave}>{language === 'fr' ? 'Enregistrer les modifications' : 'Save changes'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
