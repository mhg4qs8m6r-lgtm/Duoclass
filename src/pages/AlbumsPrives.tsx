import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { db, AlbumMeta } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Lock, Shield, X, GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/MainLayout';
import AlbumCreationQuestionnaire from '@/components/AlbumCreationQuestionnaire';
import StorageGauge from '@/components/StorageGauge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AlbumsPrives() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const translateLabel = (label: string): string => {
    if (language === 'en') {
      const upper = label.toUpperCase();
      if (upper === 'NON CLASSEE' || upper === 'NON CLASSÉE' || upper === 'NON CLASSÉES') return 'UNCATEGORIZED';
      if (upper.includes('MES PROJETS')) return upper.replace('MES PROJETS CRÉATIONS', 'MY CREATION PROJECTS').replace('MES PROJETS', 'MY PROJECTS');
      return label;
    }
    return label;
  };
  const translateAlbumTitle = (title: string): string => {
    if (language === 'en') {
      const lower = title.toLowerCase();
      if (lower === 'non classées' || lower === 'non classees' || lower === 'non classée') return 'Uncategorized';
      return title;
    }
    return title;
  };
  
  const [passwordInput, setPasswordInput] = useState('');
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [creationType, setCreationType] = useState<'category' | 'album'>('category');
  const [categoryName, setCategoryName] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<string | null>(null);
  const [selectedDocCategory, setSelectedDocCategory] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photos' | 'documents'>('photos');
  const [selectedCategoryForAlbum, setSelectedCategoryForAlbum] = useState('');

  // États pour le drag-and-drop
  const [draggedAlbum, setDraggedAlbum] = useState<AlbumMeta | null>(null);
  const [draggedAlbumType, setDraggedAlbumType] = useState<'photo' | 'doc' | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // États pour la suppression
  const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'album'; item: any; categoryType: 'photo' | 'doc' } | null>(null);

  // Récupérer le Code Maître (même que pour Administration)
  const masterCodeSetting = useLiveQuery(() => db.settings.get('master_code'));
  const masterCode = masterCodeSetting?.value || '000000';

  // Récupérer les catégories et albums privés
  const allCategories = useLiveQuery(() => db.categories.toArray());
  const allAlbums = useLiveQuery(() => db.album_metas.toArray());

  // Fonction pour trier avec "NON CLASSEE" en premier
  const sortWithNonClasseeFirst = (items: any[], labelField: string = 'label') => {
    return [...items].sort((a, b) => {
      const aIsNonClassee = a[labelField]?.toUpperCase().includes('NON CLASSEE') || a[labelField]?.toUpperCase().includes(language === 'fr' ? 'NON CLASSÉES' : 'UNCATEGORIZED');
      const bIsNonClassee = b[labelField]?.toUpperCase().includes('NON CLASSEE') || b[labelField]?.toUpperCase().includes('NON CLASSÉES');
      if (aIsNonClassee && !bIsNonClassee) return -1;
      if (!aIsNonClassee && bIsNonClassee) return 1;
      return 0;
    });
  };

  // Fonction pour trier les albums avec "Non classées" en premier
  const sortAlbumsWithNonClasseesFirst = (items: AlbumMeta[]) => {
    return [...items].sort((a, b) => {
      const aIsNonClassee = a.title?.toLowerCase().includes(language === 'fr' ? 'non classées' : 'uncategorized') || a.title?.toLowerCase().includes('non classee');
      const bIsNonClassee = b.title?.toLowerCase().includes('non classées') || b.title?.toLowerCase().includes('non classee');
      if (aIsNonClassee && !bIsNonClassee) return -1;
      if (!aIsNonClassee && bIsNonClassee) return 1;
      return 0;
    });
  };

  // Filtrer uniquement les catégories/albums privés (accessType = 'secure')
  const categories = allCategories?.filter(c => c.accessType === 'secure') || [];
  
  // Catégories Photos & Documents privées (triées avec Non classée en premier)
  const photoCategories = sortWithNonClasseeFirst(
    categories.filter(c => c.series === 'photoclass')
  );
  const docCategories = sortWithNonClasseeFirst(
    categories.filter(c => c.series === 'classpapiers')
  );

  // Albums filtrés par catégorie sélectionnée (triés avec Non classées en premier)
  const photoAlbums = sortAlbumsWithNonClasseesFirst(
    allAlbums?.filter(a => a.categoryId === selectedPhotoCategory) || []
  );
  const docAlbums = sortAlbumsWithNonClasseesFirst(
    allAlbums?.filter(a => a.categoryId === selectedDocCategory) || []
  );

  // Obtenir la catégorie sélectionnée pour afficher sa couleur dans les albums
  const selectedPhotoCategoryData = categories?.find(c => c.id === selectedPhotoCategory);
  const selectedDocCategoryData = categories?.find(c => c.id === selectedDocCategory);

  // Sélectionner automatiquement la première catégorie si aucune n'est sélectionnée
  useEffect(() => {
    if (isAuthenticated) {
      if (photoCategories.length > 0 && !selectedPhotoCategory) {
        setSelectedPhotoCategory(photoCategories[0].id);
      }
      if (docCategories.length > 0 && !selectedDocCategory) {
        setSelectedDocCategory(docCategories[0].id);
      }
    }
  }, [photoCategories, docCategories, selectedPhotoCategory, selectedDocCategory, isAuthenticated]);

  // Vérifier le Code Maître
  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) {
      toast.error(language === 'fr' ? 'Veuillez entrer le Code Maître' : 'Please enter the Master Code');
      return;
    }

    if (passwordInput === masterCode) {
      setIsAuthenticated(true);
      // Stocker l'accès aux albums privés dans sessionStorage pour UniversalAlbumPage
      sessionStorage.setItem('private_albums_access', 'true');
      toast.success(language === 'fr' ? 'Accès autorisé' : 'Access granted');
    } else {
      toast.error(language === 'fr' ? 'Code Maître incorrect' : 'Incorrect Master Code');
      setPasswordInput('');
    }
  };

  // Créer une catégorie privée
  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error(language === 'fr' ? 'Veuillez entrer un nom de catégorie' : 'Please enter a category name');
      return;
    }

    try {
      const series = mediaType === 'photos' ? 'photoclass' : 'classpapiers';
      const newCategory = {
        id: `cat_sec_${Date.now()}`,
        label: categoryName,
        color: '#EF4444',
        mediaType: mediaType as any,
        series: series as 'photoclass' | 'classpapiers',
        accessType: 'secure' as const,
      };

      await db.categories.add(newCategory);
      toast.success(language === 'fr' ? 'Catégorie créée avec succès' : 'Category created successfully');
      setCategoryName('');
      setShowCreationForm(false);
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur lors de la création de la catégorie' : 'Error creating category');
      console.error(error);
    }
  };

  // Créer un album privé
  const handleCreateAlbum = async () => {
    if (!albumName.trim() || !selectedCategoryForAlbum) {
      toast.error(language === 'fr' ? 'Veuillez entrer un nom d\'album et sélectionner une catégorie' : 'Please enter an album name and select a category');
      return;
    }

    try {
      const cat = categories.find(c => c.id === selectedCategoryForAlbum);
      const newAlbum: AlbumMeta = {
        id: `album_sec_${Date.now()}`,
        title: albumName,
        categoryId: selectedCategoryForAlbum,
        series: cat?.series || 'photoclass',
        type: 'secure',
        createdAt: Date.now(),
      };

      await db.album_metas.add(newAlbum);
      await db.albums.add({ id: newAlbum.id, frames: [], updatedAt: Date.now() });
      toast.success(language === 'fr' ? 'Album créé avec succès' : 'Album created successfully');
      setAlbumName('');
      setSelectedCategoryForAlbum('');
      setShowCreationForm(false);
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur lors de la création de l\'album' : 'Error creating album');
      console.error(error);
    }
  };

  // Ouvrir un album (utiliser photoclass pour tous les types car classpapiers a été retiré)
  const handleOpenAlbum = (album: AlbumMeta, type: 'photo' | 'doc') => {
    setLocation(`/photoclass/${album.id}`);
  };

  // Fonction pour fermer l'application
  const handleCloseApp = () => {
    try {
      window.close();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      alert("Pour fermer l'application, veuillez fermer cet onglet manuellement.");
    }, 100);
  };

  // Callback quand un album est créé
  const handleAlbumCreated = () => {
    // Rafraîchir automatiquement via useLiveQuery
  };

  // === SUPPRESSION ===
  
  // Vérifier si une catégorie est "Non classée" (protégée)
  const isNonClasseeCategory = (category: any) => {
    return category.label?.toUpperCase().includes('NON CLASSEE') || category.label?.toUpperCase().includes('NON CLASSÉES');
  };

  // Vérifier si un album est "Non classées" (protégé)
  const isNonClasseesAlbum = (album: AlbumMeta) => {
    return album.title?.toLowerCase().includes('non classées') || album.title?.toLowerCase().includes('non classee');
  };

  // Supprimer une catégorie
  const handleDeleteCategory = async () => {
    if (!itemToDelete || itemToDelete.type !== 'category') return;
    
    const category = itemToDelete.item;
    
    try {
      // Supprimer tous les albums de cette catégorie
      const albumsToDelete = allAlbums?.filter(a => a.categoryId === category.id) || [];
      for (const album of albumsToDelete) {
        await db.albums.delete(album.id);
        await db.album_metas.delete(album.id);
      }
      
      // Supprimer la catégorie
      await db.categories.delete(category.id);
      
      toast.success(language === 'fr' ? `Catégorie "${category.label}" supprimée` : `Category "${category.label}" deleted`);
      
      // Réinitialiser la sélection si c'était la catégorie sélectionnée
      if (itemToDelete.categoryType === 'photo' && selectedPhotoCategory === category.id) {
        setSelectedPhotoCategory(null);
      } else if (itemToDelete.categoryType === 'doc' && selectedDocCategory === category.id) {
        setSelectedDocCategory(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la suppression de la catégorie' : 'Error deleting category');
    }
    
    setItemToDelete(null);
  };

  // Supprimer un album
  const handleDeleteAlbum = async () => {
    if (!itemToDelete || itemToDelete.type !== 'album') return;
    
    const album = itemToDelete.item;
    
    try {
      await db.albums.delete(album.id);
      await db.album_metas.delete(album.id);
      
      toast.success(language === 'fr' ? `Album "${album.title}" supprimé` : `Album "${album.title}" deleted`);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la suppression de l\'album' : 'Error deleting album');
    }
    
    setItemToDelete(null);
  };

  // === DRAG AND DROP ===
  
  // Début du drag d'un album
  const handleDragStart = (e: React.DragEvent, album: AlbumMeta, type: 'photo' | 'doc') => {
    setDraggedAlbum(album);
    setDraggedAlbumType(type);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', album.id);
    
    // Style visuel pour l'élément draggé
    const target = e.target as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  };
  
  // Fin du drag
  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedAlbum(null);
    setDraggedAlbumType(null);
    setDragOverCategory(null);
  };
  
  // Survol d'une catégorie pendant le drag
  const handleDragOver = (e: React.DragEvent, categoryId: string, categoryType: 'photo' | 'doc') => {
    e.preventDefault();
    
    // Vérifier que le type correspond (on ne peut pas déplacer un album photo vers documents et vice-versa)
    if (draggedAlbumType !== categoryType) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    // Ne pas permettre de déposer sur la catégorie actuelle
    if (draggedAlbum?.categoryId === categoryId) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(categoryId);
  };
  
  // Sortie de la zone de drop
  const handleDragLeave = (e: React.DragEvent) => {
    // Vérifier qu'on quitte vraiment la catégorie (pas juste un élément enfant)
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverCategory(null);
    }
  };
  
  // Déposer l'album sur une catégorie
  const handleDrop = async (e: React.DragEvent, targetCategoryId: string, categoryType: 'photo' | 'doc') => {
    e.preventDefault();
    setDragOverCategory(null);
    
    if (!draggedAlbum || draggedAlbumType !== categoryType) {
      return;
    }
    
    // Ne pas permettre de déposer sur la catégorie actuelle
    if (draggedAlbum.categoryId === targetCategoryId) {
      return;
    }
    
    // Trouver la catégorie cible pour le nom
    const targetCategory = categories?.find(c => c.id === targetCategoryId);
    
    try {
      // Mettre à jour la catégorie de l'album
      await db.album_metas.update(draggedAlbum.id, {
        categoryId: targetCategoryId
      });
      
      toast.success(
        language === 'fr' 
          ? `Album "${draggedAlbum.title}" déplacé vers "${targetCategory?.label || language === 'fr' ? 'la catégorie' : 'the category'}"`
          : `Album "${draggedAlbum.title}" moved to "${targetCategory?.label || 'the category'}"`,
        { duration: 3000 }
      );
      
      // Sélectionner la catégorie cible pour voir l'album déplacé
      if (categoryType === 'photo') {
        setSelectedPhotoCategory(targetCategoryId);
      } else {
        setSelectedDocCategory(targetCategoryId);
      }
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      toast.error(language === 'fr' ? 'Erreur lors du déplacement de l\'album' : 'Error moving album');
    }
    
    setDraggedAlbum(null);
    setDraggedAlbumType(null);
  };

  // Compter les albums par catégorie
  const getAlbumCount = (categoryId: string) => {
    return allAlbums?.filter(a => a.categoryId === categoryId).length || 0;
  };

  // Obtenir l'icône appropriée pour une catégorie (images PNG comme dans le formulaire de création)
  // Pas d'icône pour "Non classé" car peut contenir les 3 types
  const getCategoryIcon = (category: any, size: number = 18) => {
    // Pas d'icône pour Non classé
    if (category.label?.toUpperCase().includes('NON CLASSEE') || category.label?.toUpperCase().includes('NON CLASSÉES')) {
      return null;
    }
    if (category.mediaType === 'documents') {
      return (
        <img 
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-book_a3b5c06e.png" 
          alt="Documents" 
          className="flex-shrink-0 object-contain"
          style={{ width: size, height: size }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      );
    } else if (category.mediaType === 'videos') {
      return (
        <img 
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-video-projector_fb85e945.png" 
          alt={language === "fr" ? "Vidéos" : "Videos"} 
          className="flex-shrink-0 object-contain"
          style={{ width: size, height: size }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      );
    } else {
      return (
        <img 
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-camera_63528184.png" 
          alt="Photos" 
          className="flex-shrink-0 object-contain"
          style={{ width: size, height: size }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout title={language === "fr" ? "Albums Privés" : "Private Albums"}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="rounded-2xl p-8 max-w-md w-full mx-4 relative border-2 border-gray-200/50">
            {/* Bouton X pour revenir */}
            <button
              onClick={() => setLocation('/albums')}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title={language === 'fr' ? 'Retour aux Albums' : 'Back to Albums'}
            >
              <X size={20} className="text-gray-600" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-red-600" size={40} />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{language === "fr" ? "Albums Privés" : "Private Albums"}</h1>
              <p className="text-gray-500 mt-2">{language === "fr" ? "Entrez le Code Maître pour accéder aux albums privés" : "Enter the Master Code to access private albums"}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="font-medium">{language === "fr" ? "Code Maître" : "Master Code"}</Label>
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder={language === "fr" ? "Code Maître (ex: 000000)" : "Master Code (e.g. 000000)"}
                  className="mt-1 text-center text-xl tracking-widest"
                  autoFocus
                />
              </div>
              <Button
                onClick={handlePasswordSubmit}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
              >
                <Lock size={18} className="mr-2" />
                {language === "fr" ? "Déverrouiller" : "Unlock"}
              </Button>
              
              {/* Bouton Fermer en bas */}
              <Button
                variant="outline"
                onClick={handleCloseApp}
                className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 mt-4"
              >
                {language === "fr" ? "Fermer" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Handler pour les actions toolbar - affiche un message car aucun album n'est ouvert
  const handleToolbarAction = (action: string | null) => {
    if (action) {
      toast.info(language === "fr" ? "Sélectionnez un album pour rendre les actions opérationnelles" : "Select an album to enable actions", {
        description: language === "fr" ? "Cliquez sur un album dans la liste pour accéder aux fonctionnalités." : "Click on an album in the list to access features."
      });
    }
  };

  return (
    <MainLayout title={language === "fr" ? "Albums Privés" : "Private Albums"} onToolbarAction={handleToolbarAction}>
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200/50 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="text-red-600" size={28} />
                {language === "fr" ? "Albums Privés" : "Private Albums"}
              </h1>
              {/* Jauge de stockage */}
              <StorageGauge compact className="flex-1 max-w-xs" />
            </div>
            <div className="flex gap-2">
              {!showCreationForm && (
                <Button
                  onClick={() => setShowCreationForm(true)}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600"
                >
                  <Plus size={20} />
                  {language === "fr" ? "Créer catégorie/album" : "Create category/album"}
                </Button>
              )}
              {showCreationForm && (
                <Button
                  onClick={() => setShowCreationForm(false)}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold"
                >
                  <X size={20} />
                  {language === "fr" ? "Fermer" : "Close"}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setIsAuthenticated(false);
                  setPasswordInput('');
                  // Supprimer l'accès aux albums privés
                  sessionStorage.removeItem('private_albums_access');
                }}
              >
                Quitter
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {showCreationForm ? (
            // Utiliser le même formulaire que dans Albums, mais avec accessType=secure par défaut
            <div className="p-6 h-full">
              <AlbumCreationQuestionnaire onAlbumCreated={handleAlbumCreated} defaultAccessType="secure" />
            </div>
          ) : (
            // Vue avec 2 colonnes : Photos & Documents
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Colonne Photos/Vidéos */}
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2 border-b pb-3">
                  <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-camera_63528184.png" alt="Photos" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  {language === "fr" ? "Photos & Vidéos" : "Photos & Videos"}
                </h2>
                
                {/* En-têtes des sous-colonnes */}
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="text-sm font-semibold text-gray-500 text-center">{language === "fr" ? "Catégories" : "Categories"}</div>
                  <div className="text-sm font-semibold text-gray-500 text-center">{language === 'fr' ? 'Albums' : 'Albums'}</div>
                </div>
                
                {/* Contenu avec catégories et albums */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Zone A - Catégories avec radio coloré (zones de drop) */}
                  <div className="space-y-2 border-r pr-4">
                    {photoCategories.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">{language === "fr" ? "Aucune catégorie" : "No category"}</p>
                    ) : (
                      photoCategories.map(category => (
                        <div
                          key={category.id}
                          onClick={() => setSelectedPhotoCategory(category.id)}
                          onDragOver={(e) => handleDragOver(e, category.id, 'photo')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category.id, 'photo')}
                          className={`rounded-lg cursor-pointer transition-all duration-200 p-3 flex items-center gap-2 ${
                            selectedPhotoCategory === category.id
                              ? 'bg-red-100 border-2 border-red-400'
                              : dragOverCategory === category.id && draggedAlbumType === 'photo'
                              ? 'bg-red-200 border-2 border-red-500 border-dashed scale-105'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {/* Bouton radio coloré */}
                          <div 
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                            style={{ 
                              borderColor: category.color || '#EF4444',
                              backgroundColor: selectedPhotoCategory === category.id ? (category.color || '#EF4444') : 'transparent'
                            }}
                          >
                            {selectedPhotoCategory === category.id && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="font-medium text-gray-800 text-sm flex-1 truncate">
                            {translateLabel(category.label)}
                            <span className="text-gray-400 ml-1">({getAlbumCount(category.id)})</span>
                          </span>
                          {/* Icône à droite selon le type */}
                          {getCategoryIcon(category, 18)}
                          {/* Bouton supprimer (sauf pour Non classée) */}
                          {!isNonClasseeCategory(category) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'category', item: category, categoryType: 'photo' });
                              }}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title={language === "fr" ? "Supprimer cette catégorie" : "Delete this category"}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Zone B - Albums de la catégorie sélectionnée (draggables) */}
                  <div className="space-y-2 pl-2">
                    {photoAlbums.length === 0 ? (
                      <p className="text-gray-400 text-center py-4 text-sm">{language === 'fr' ? 'Aucun album' : 'No albums'}</p>
                    ) : (
                      photoAlbums.map(album => (
                        <div
                          key={album.id}
                          draggable={!isNonClasseesAlbum(album)}
                          onDragStart={(e) => handleDragStart(e, album, 'photo')}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleOpenAlbum(album, 'photo')}
                          className={`rounded-lg cursor-pointer transition-all duration-200 p-3 flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 ${
                            !isNonClasseesAlbum(album) ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${draggedAlbum?.id === album.id ? 'opacity-50' : ''}`}
                          title={!isNonClasseesAlbum(album) ? language === 'fr' ? 'Glissez pour déplacer vers une autre catégorie' : 'Drag to move to another category' : ''}
                        >
                          {!isNonClasseesAlbum(album) && (
                            <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
                          )}
                          {/* Bouton radio coloré identique à la catégorie */}
                          <div 
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                            style={{ 
                              borderColor: selectedPhotoCategoryData?.color || '#EF4444',
                              backgroundColor: selectedPhotoCategoryData?.color || '#EF4444'
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <span className="font-medium text-gray-800 text-sm truncate flex-1">{translateAlbumTitle(album.title)}</span>
                          {/* Icône à droite selon le type de la catégorie */}
                          {selectedPhotoCategoryData && getCategoryIcon(selectedPhotoCategoryData, 16)}
                          {/* Bouton supprimer (sauf pour Non classées) */}
                          {!isNonClasseesAlbum(album) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'album', item: album, categoryType: 'photo' });
                              }}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title={language === 'fr' ? 'Supprimer cet album' : 'Delete this album'}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Colonne Documents */}
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2 border-b pb-3">
                  <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-book_a3b5c06e.png" alt="Documents" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  Documents
                </h2>
                
                {/* En-têtes des sous-colonnes */}
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="text-sm font-semibold text-gray-500 text-center">{language === "fr" ? "Catégories" : "Categories"}</div>
                  <div className="text-sm font-semibold text-gray-500 text-center">{language === 'fr' ? 'Albums' : 'Albums'}</div>
                </div>
                
                {/* Contenu avec catégories et albums */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Zone A - Catégories avec radio coloré (zones de drop) */}
                  <div className="space-y-2 border-r pr-4">
                    {docCategories.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">{language === "fr" ? "Aucune catégorie" : "No category"}</p>
                    ) : (
                      docCategories.map(category => (
                        <div
                          key={category.id}
                          onClick={() => setSelectedDocCategory(category.id)}
                          onDragOver={(e) => handleDragOver(e, category.id, 'doc')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category.id, 'doc')}
                          className={`rounded-lg cursor-pointer transition-all duration-200 p-3 flex items-center gap-2 ${
                            selectedDocCategory === category.id
                              ? 'bg-red-100 border-2 border-red-400'
                              : dragOverCategory === category.id && draggedAlbumType === 'doc'
                              ? 'bg-red-200 border-2 border-red-500 border-dashed scale-105'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {/* Bouton radio coloré */}
                          <div 
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                            style={{ 
                              borderColor: category.color || '#EF4444',
                              backgroundColor: selectedDocCategory === category.id ? (category.color || '#EF4444') : 'transparent'
                            }}
                          >
                            {selectedDocCategory === category.id && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="font-medium text-gray-800 text-sm flex-1 truncate">
                            {translateLabel(category.label)}
                            <span className="text-gray-400 ml-1">({getAlbumCount(category.id)})</span>
                          </span>
                          {/* Icône livre à droite */}
                          {getCategoryIcon(category, 18)}
                          {/* Bouton supprimer (sauf pour Non classée) */}
                          {!isNonClasseeCategory(category) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'category', item: category, categoryType: 'doc' });
                              }}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title={language === "fr" ? "Supprimer cette catégorie" : "Delete this category"}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Zone B - Albums de la catégorie sélectionnée (draggables) */}
                  <div className="space-y-2 pl-2">
                    {docAlbums.length === 0 ? (
                      <p className="text-gray-400 text-center py-4 text-sm">{language === 'fr' ? 'Aucun album' : 'No albums'}</p>
                    ) : (
                      docAlbums.map(album => (
                        <div
                          key={album.id}
                          draggable={!isNonClasseesAlbum(album)}
                          onDragStart={(e) => handleDragStart(e, album, 'doc')}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleOpenAlbum(album, 'doc')}
                          className={`rounded-lg cursor-pointer transition-all duration-200 p-3 flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 ${
                            !isNonClasseesAlbum(album) ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${draggedAlbum?.id === album.id ? 'opacity-50' : ''}`}
                          title={!isNonClasseesAlbum(album) ? 'Glissez pour déplacer vers une autre catégorie' : ''}
                        >
                          {!isNonClasseesAlbum(album) && (
                            <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
                          )}
                          {/* Bouton radio coloré identique à la catégorie */}
                          <div 
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                            style={{ 
                              borderColor: selectedDocCategoryData?.color || '#EF4444',
                              backgroundColor: selectedDocCategoryData?.color || '#EF4444'
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <span className="font-medium text-gray-800 text-sm truncate flex-1">{translateAlbumTitle(album.title)}</span>
                          {/* Icône livre à droite */}
                          {selectedDocCategoryData && getCategoryIcon(selectedDocCategoryData, 16)}
                          {/* Bouton supprimer (sauf pour Non classées) */}
                          {!isNonClasseesAlbum(album) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'album', item: album, categoryType: 'doc' });
                              }}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title={language === 'fr' ? 'Supprimer cet album' : 'Delete this album'}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog de confirmation de suppression */}
        <Dialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 size={24} />
                {language === "fr" ? "Confirmer la suppression" : "Confirm deletion"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {itemToDelete?.type === 'category' ? (
                <>
                  <p className="text-gray-600">
                    {language === "fr" ? <>Êtes-vous sûr de vouloir supprimer la catégorie <strong>"{itemToDelete.item.label}"</strong> ?</> : <>Are you sure you want to delete the category <strong>"{itemToDelete.item.label}"</strong>?</>}
                  </p>
                  <p className="text-red-500 text-sm">
                    {language === "fr" ? "⚠️ Tous les albums de cette catégorie seront également supprimés." : "⚠️ All albums in this category will also be deleted."}
                  </p>
                </>
              ) : (
                <p className="text-gray-600">
                  {language === "fr" ? <>Êtes-vous sûr de vouloir supprimer l'album <strong>"{itemToDelete?.item.title}"</strong> ?</> : <>Are you sure you want to delete the album <strong>"{itemToDelete?.item.title}"</strong>?</>}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setItemToDelete(null)} className="flex-1">
                  {language === "fr" ? "Annuler" : "Cancel"}
                </Button>
                <Button 
                  onClick={itemToDelete?.type === 'category' ? handleDeleteCategory : handleDeleteAlbum} 
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {language === "fr" ? "Supprimer" : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
