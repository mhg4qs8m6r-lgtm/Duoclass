import MainLayout from "@/components/MainLayout";
import { FileText, HelpCircle, BookOpen, Video, Copy, Mail, Keyboard, Book, Download, Scale, Shield } from "lucide-react";
import { KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { DuplicateValidationModal } from "@/components/DuplicateValidationModal";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { detectAllDuplicates, deleteMultiplePhotos, DuplicateGroup } from "@/lib/duplicateDetection";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import QuitConfirmModal from "@/components/QuitConfirmModal";

// Composant Visionneuse PDF (Réutilisé de ClassPapiers)
const PdfViewer = ({ url, title, onClose }: { url: string, title: string, onClose: () => void }) => {
  const { t } = useLanguage();
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full flex flex-col p-0">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
          <iframe src={url} className="w-full h-full border-none rounded shadow-lg" title={title} />
        </div>
        <DialogFooter className="p-4 border-t shrink-0">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Contenu du guide Livre Photo (intégré directement)
const PHOTO_BOOK_GUIDE_CONTENT = `
## Introduction

L'éditeur de livre photo de DuoClass permet de créer des présentations numériques élégantes et des livres photo imprimables au format PDF. Cette fonctionnalité est accessible depuis la barre d'outils de PhotoClass lorsque vous êtes dans un album contenant au moins 2 photos.

## Prérequis d'accès

- Être dans **PhotoClass** (pas ClassPapiers)
- Avoir ouvert un album contenant des photos
- L'album doit contenir **au moins 2 photos**
- Seules les images sont prises en compte (les vidéos sont exclues)

## Configuration du livre

### Formats disponibles
- **A4** : 210 × 297 mm (standard, polyvalent)
- **A5** : 148 × 210 mm (compact, portable)
- **Carré** : 200 × 200 mm (moderne, Instagram)
- **Paysage** : 297 × 210 mm (photos panoramiques)

### Thèmes de couleurs
- **Classique** : Fond crème, texte brun, couverture bordeaux
- **Moderne** : Fond blanc, texte noir, accent bleu
- **Vintage** : Fond beige, tons taupe et brun
- **Élégant** : Fond noir, texte blanc, accents dorés
- **Minimal** : Tons gris sobres

## Templates de pages (21 disponibles)

### Templates simples (1 photo)
- 1 Photo pleine page
- 1 Photo centrée
- 1 Portrait centré
- 1 Paysage centré
- 1 Photo ronde

### Templates 2 photos
- 2 Photos côte à côte
- 2 Photos superposées
- 2 Photos asymétriques
- 2 Photos en diagonale

### Templates 3 photos
- 3 Photos en ligne
- 3 Photos en colonne
- 1 Grande + 2 Petites
- Pyramide

### Templates 4+ photos
- Grille 2×2
- Mosaïque
- Bande horizontale
- Quatre coins
- Croix (5 photos)
- Grille 3×2 (6 photos)

### Templates artistiques
- Style Polaroid
- Photos éparpillées
- Pellicule photo
- Page vierge

## Bordures décoratives (26 disponibles)

- **Classiques** : Noir, blanc, doré, argenté, double
- **Modernes** : Arrondi, pointillé, à points, fin
- **Coins décoratifs** : Simples, ornés, Art Déco
- **Florales** : Rose, doré, vert, bleu
- **Vintage** : Marron, sépia, noir
- **Élégantes** : Doré avec ornements

## Manipulation des cadres

### Sélection et déplacement
Cliquez sur un cadre pour le sélectionner. Un cadre sélectionné affiche :
- Un contour bleu avec décalage
- 8 poignées de redimensionnement
- 1 poignée de rotation (cercle vert)

### Redimensionnement
Utilisez les 8 poignées (coins et milieux) pour ajuster les dimensions.
Taille minimale : 10% de la page.

### Rotation
- **Rotation libre** : Déplacez la poignée verte
- **Rotation par 15°** : Maintenez **Shift** enfoncé
- L'angle s'affiche au-dessus du cadre

### Verrouillage
- **Verrouillage de page** : Fige tous les cadres
- **Verrouillage de cadre** : Fige un cadre individuel

## Glisser-déposer des photos

1. Cliquez sur une photo dans la bibliothèque
2. Faites glisser vers le cadre souhaité
3. Le cadre s'illumine en vert
4. Relâchez pour déposer

## Mode Présentation Numérique

### Transitions disponibles
- **Fondu** : Fondu enchaîné
- **Glissement** : Défilement horizontal
- **Zoom** : Effet de zoom
- **Page tournée** : Rotation 3D réaliste

### Contrôles
- **← →** : Page précédente/suivante
- **Espace** : Page suivante
- **P** : Lecture/Pause
- **F** : Plein écran

## Génération PDF

L'éditeur génère un PDF haute qualité avec :
- Couverture stylisée (titre, sous-titre, auteur, date)
- Pages avec bordures et ombres portées
- Numérotation élégante
`;

// Composant pour afficher le guide Livre Photo
const PhotoBookGuideModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { t } = useLanguage();
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Book className="w-5 h-5 text-indigo-500" />
            Guide de l'Éditeur de Livre Photo
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="prose prose-sm max-w-none">
            {PHOTO_BOOK_GUIDE_CONTENT.split('\n\n').map((paragraph, idx) => {
              // Titres H2
              if (paragraph.startsWith('## ')) {
                return (
                  <h2 key={idx} className="text-lg font-bold text-indigo-700 mt-6 mb-3 border-b border-indigo-200 pb-1">
                    {paragraph.replace('## ', '')}
                  </h2>
                );
              }
              // Titres H3
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-md font-semibold text-indigo-600 mt-4 mb-2">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              // Listes
              if (paragraph.includes('\n- ')) {
                const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                return (
                  <ul key={idx} className="list-disc list-inside space-y-1 text-gray-700 text-sm mb-3">
                    {items.map((item, itemIdx) => (
                      <li key={itemIdx} dangerouslySetInnerHTML={{ 
                        __html: item.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                      }} />
                    ))}
                  </ul>
                );
              }
              // Paragraphes normaux
              if (paragraph.trim()) {
                return (
                  <p key={idx} className="text-gray-700 text-sm mb-3" dangerouslySetInnerHTML={{ 
                    __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                  }} />
                );
              }
              return null;
            })}
          </div>
        </ScrollArea>
        
        <DialogFooter className="shrink-0 mt-4">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Utilitaires() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [viewedDoc, setViewedDoc] = useState<{ url: string, title: string } | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showPhotoBookGuide, setShowPhotoBookGuide] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);
  const [flatDuplicates, setFlatDuplicates] = useState<Array<{ id: string; src: string; name: string; date?: string }>>([]);

  // Fonction pour charger les doublons réels
  const loadDuplicates = async () => {
    setIsLoadingDuplicates(true);
    try {
      const groups = await detectAllDuplicates();
      setDuplicateGroups(groups);
      
      // Convertir les groupes en format plat pour le modal
      const flat = groups.flatMap(group => 
        group.photos.map(photo => ({
          id: photo.id,
          src: photo.photoUrl,
          name: photo.originalName,
          date: `Album: ${photo.albumName}`
        }))
      );
      setFlatDuplicates(flat);
      
      if (groups.length === 0) {
        toast.success(language === 'fr' ? 'Aucun doublon détecté !' : 'No duplicates detected!');
      } else {
        const totalDuplicates = groups.reduce((sum, g) => sum + g.photos.length, 0);
        toast.info(
          language === 'fr' 
            ? `${totalDuplicates} doublons détectés dans ${groups.length} groupes` 
            : `${totalDuplicates} duplicates detected in ${groups.length} groups`
        );
        setShowDuplicateModal(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des doublons:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la détection des doublons' : 'Error detecting duplicates');
    } finally {
      setIsLoadingDuplicates(false);
    }
  };

  const helpResources = [
    {
      title: t('help.duplicateValidation'),
      description: t('help.duplicateDesc'),
      icon: <Copy className="w-6 h-6 text-red-500" />,
      action: t('help.manage'),
      color: "bg-red-50 border-red-200 hover:bg-red-100",
      onClick: () => loadDuplicates()
    },
    {
      title: t('help.quickStart'),
      description: t('help.quickStartDesc'),
      icon: <Video className="w-6 h-6 text-blue-500" />,
      action: t('help.view'),
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100"
    },
    {
      title: language === 'fr' ? "Guide Complet PDF" : "Complete PDF Guide",
      description: language === 'fr' 
        ? language === "fr" ? "Téléchargez le guide complet de DuoClass au format PDF (modifiable)" : "Download the complete DuoClass guide in PDF format (editable)" 
        : "Download the complete DuoClass guide in PDF format (editable)",
      icon: <Download className="w-6 h-6 text-orange-500" />,
      action: language === 'fr' ? "Télécharger" : "Download",
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
      downloadUrl: "/help/DuoClass-Guide-Complet.pdf"
    },
    {
      title: t('help.userManual'),
      description: t('help.userManualDesc'),
      icon: <BookOpen className="w-6 h-6 text-green-500" />,
      action: t('help.read'),
      color: "bg-green-50 border-green-200 hover:bg-green-100",
      url: "/assets/docs/manuel-utilisateur.pdf"
    },

    {
      title: t('help.shortcuts'),
      description: t('help.shortcutsDesc'),
      icon: <Keyboard className="w-6 h-6 text-purple-500" />,
      action: t('help.view'),
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
      onClick: () => setShowShortcutsModal(true)
    },
    {
      title: t('help.techSupportTitle'),
      description: t('help.techSupportDesc'),
      icon: <Mail className="w-6 h-6 text-rose-500" />,
      action: t('help.email'),
      color: "bg-rose-50 border-rose-200 hover:bg-rose-100",
      email: "contact@duoclass.fr"
    }
  ];

  // Ressources légales
  const legalResources = [
    {
      title: language === 'fr' ? "Conditions Générales d'Utilisation" : "Terms of Service",
      description: language === 'fr' 
        ? language === "fr" ? "Règles d'utilisation de l'application DuoClass" : "DuoClass application terms of use" 
        : "Rules for using the DuoClass application",
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      action: language === 'fr' ? "Consulter" : "View",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
      route: "/cgu"
    },
    {
      title: language === 'fr' ? "Mentions Légales" : "Legal Notice",
      description: language === 'fr' 
        ? language === "fr" ? "Informations légales sur l'éditeur et l'hébergeur" : "Legal information about the publisher and host" 
        : "Legal information about the publisher and host",
      icon: <Scale className="w-6 h-6 text-indigo-600" />,
      action: language === 'fr' ? "Consulter" : "View",
      color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
      route: "/mentions-legales"
    },
    {
      title: language === 'fr' ? "Politique de Confidentialité" : "Privacy Policy",
      description: language === 'fr' 
        ? language === "fr" ? "Protection de vos données personnelles (RGPD)" : "Protection of your personal data (GDPR)" 
        : "Protection of your personal data (GDPR)",
      icon: <Shield className="w-6 h-6 text-green-600" />,
      action: language === 'fr' ? "Consulter" : "View",
      color: "bg-green-50 border-green-200 hover:bg-green-100",
      route: "/politique-confidentialite"
    }
  ];

  return (
    <MainLayout title={t('help.title')} className="no-scroll">
      <div className="h-full flex flex-col p-4">
        
        <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
          
          {/* En-tête compact */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">{t('help.docCenter')}</h2>
            <p className="text-gray-600 text-sm">
              {t('help.description')}
              {t('help.techSupport')} <span className="font-bold text-blue-600">{t('help.adminInfosLicense')}</span>
            </p>
          </div>

          {/* Grille de ressources - 3 colonnes, plus compacte */}
          <div className="grid grid-cols-3 gap-3">
            {helpResources.map((resource, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-3 ${resource.color}`}
                onClick={() => {
                  if (resource.onClick) {
                    resource.onClick();
                  } else if (resource.downloadUrl) {
                    // Téléchargement du PDF
                    const link = document.createElement('a');
                    link.href = resource.downloadUrl;
                    link.download = 'DuoClass-Guide-Complet.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } else if (resource.email) {
                    window.location.href = `mailto:${resource.email}?subject=Support DuoClass`;
                  } else if (resource.url) {
                    alert(t('help.fileNotAvailable'));
                  } else {
                    alert(t('help.comingSoon'));
                  }
                }}
              >
                <div className="p-2 rounded-full shrink-0">
                  {resource.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-800 truncate">{resource.title}</h3>
                  <p className="text-gray-600 text-xs truncate">{resource.description}</p>
                </div>
                <Button variant="outline" size="sm" className="hover:bg-gray-50 text-xs px-2 py-1 h-auto shrink-0">
                  {resource.action}
                </Button>
              </div>
            ))}
          </div>

          {/* Section Informations Légales */}
          <div className="mt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              {language === 'fr' ? 'Informations Légales' : 'Legal Information'}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Lien de téléchargement du PDF guide */}
              <div 
                className="p-3 rounded-lg border-2 bg-yellow-50 border-yellow-200 hover:bg-yellow-100 transition-all cursor-pointer flex items-center gap-3"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/GUIDE_UTILISATION.pdf';
                  link.download = 'DuoClass-Guide-Complet.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <div className="p-2 rounded-full shrink-0">
                  <Download className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-800 truncate">{language === 'fr' ? 'Guide Complet PDF' : 'Complete PDF Guide'}</h3>
                  <p className="text-gray-600 text-xs truncate">{language === 'fr' ? 'Télécharger le guide' : 'Download the guide'}</p>
                </div>
                <Button variant="outline" size="sm" className="hover:bg-gray-50 text-xs px-2 py-1 h-auto shrink-0">
                  {language === 'fr' ? 'Télécharger' : 'Download'}
                </Button>
              </div>
              {legalResources.map((resource, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-3 ${resource.color}`}
                  onClick={() => setLocation(resource.route)}
                >
                  <div className="p-2 rounded-full shrink-0">
                    {resource.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-800 truncate">{resource.title}</h3>
                    <p className="text-gray-600 text-xs truncate">{resource.description}</p>
                  </div>
                  <Button variant="outline" size="sm" className="hover:bg-gray-50 text-xs px-2 py-1 h-auto shrink-0">
                    {resource.action}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Duplicate Validation Modal */}
          <DuplicateValidationModal
            isOpen={showDuplicateModal}
            onClose={() => setShowDuplicateModal(false)}
            duplicates={flatDuplicates}
            onFinish={async (decisions) => {
              setShowDuplicateModal(false);
              
              // Préparer la liste des photos à supprimer
              const toDelete = Object.entries(decisions)
                .filter(([_, action]) => action === 'delete')
                .map(([id, _]) => {
                  const [albumId, frameIdStr] = id.split('-');
                  return { albumId, frameId: parseInt(frameIdStr) };
                });
              
              if (toDelete.length === 0) {
                toast.info(language === 'fr' ? 'Aucune photo à supprimer' : 'No photos to delete');
                return;
              }
              
              // Supprimer les photos
              toast.info(language === 'fr' ? `Suppression de ${toDelete.length} photos...` : `Deleting ${toDelete.length} photos...`);
              const result = await deleteMultiplePhotos(toDelete);
              
              if (result.success > 0) {
                toast.success(
                  language === 'fr' 
                    ? `${result.success} photo(s) supprimée(s) avec succès` 
                    : `${result.success} photo(s) deleted successfully`
                );
              }
              
              if (result.failed > 0) {
                toast.error(
                  language === 'fr' 
                    ? `Échec de la suppression de ${result.failed} photo(s)` 
                    : `Failed to delete ${result.failed} photo(s)`
                );
              }
              
              // Recharger les doublons pour voir s'il en reste
              setTimeout(() => loadDuplicates(), 1000);
            }}
          />

          {/* Visionneuse PDF */}
          {viewedDoc && (
            <PdfViewer 
              url={viewedDoc.url} 
              title={viewedDoc.title} 
              onClose={() => setViewedDoc(null)} 
            />
          )}

          {/* Note de bas de page - plus compacte */}
          <div className="bg-blue-100 p-2 rounded-lg text-center text-blue-800 text-xs border border-blue-200 mt-3">
            💡 <strong>{t('help.didYouKnow')}</strong> {t('help.contextualHelp')}
          </div>

        </div>
      </div>

      {/* BOUTON QUITTER (en bas à droite) */}
      <Button
        variant="destructive"
        onClick={() => setShowQuitModal(true)}
        className="fixed bottom-4 right-4 z-40 shadow-lg"
      >
        Quitter
      </Button>

      {/* MODALE CONFIRMATION QUITTER */}
      <QuitConfirmModal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
      />

      {/* MODALE GUIDE LIVRE PHOTO */}
      <PhotoBookGuideModal
        isOpen={showPhotoBookGuide}
        onClose={() => setShowPhotoBookGuide(false)}
      />

      {/* MODALE RACCOURCIS CLAVIER */}
      <Dialog open={showShortcutsModal} onOpenChange={setShowShortcutsModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Keyboard className="w-5 h-5 text-purple-500" />
              Raccourcis Clavier
              <span className="text-xs font-normal text-gray-500 ml-2">(Mac : Cmd au lieu de Ctrl)</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4">
            {KEYBOARD_SHORTCUTS.map((category, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <h3 className="font-bold text-sm text-purple-700 mb-2 border-b border-purple-200 pb-1">{category.category}</h3>
                <div className="space-y-1">
                  {category.shortcuts.map((shortcut, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 truncate mr-2">{shortcut.description}</span>
                      <div className="flex gap-0.5 shrink-0">
                        {shortcut.keys.map((key, kIdx) => (
                          <span key={kIdx} className="flex items-center">
                            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono shadow-sm">
                              {key}
                            </kbd>
                            {kIdx < shortcut.keys.length - 1 && <span className="text-gray-400 text-[10px]">+</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="mt-2">
            <Button size="sm" onClick={() => setShowShortcutsModal(false)}>{language === 'fr' ? 'Fermer' : 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
