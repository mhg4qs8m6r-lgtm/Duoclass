import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { db, AlbumMeta, addToCreationsBasket, removeFromCreationsBasket, clearCreationsBasket, CreationsBasketItem, MODELES_STICKERS_ALBUM_ID } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Plus, Image, X, GripVertical, Trash2, Pencil, ShoppingBasket, Upload } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/MainLayout';
import AlbumCreationQuestionnaire from '@/components/AlbumCreationQuestionnaire';
import CreationsAtelierV2 from '@/components/creations/CreationsAtelierV2';
import { useLanguage } from '@/contexts/LanguageContext';

interface AlbumWithSeries extends AlbumMeta {
  series: 'photoclass' | 'classpapiers';
}

export default function Albums() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [showCreationsModal, setShowCreationsModal] = useState(false);
  const [creationsProjectId, setCreationsProjectId] = useState<string | undefined>(undefined);
  const [creationsProjectName, setCreationsProjectName] = useState<string>("Nouveau projet");
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<string | null>(null);
  const [selectedDocCategory, setSelectedDocCategory] = useState<string | null>(null);
  const [unlockedCategories, setUnlockedCategories] = useState<string[]>([]);
  const [passwordInput, setPasswordInput] = useState('');
  const [categoryToUnlock, setCategoryToUnlock] = useState<any>(null);
  
  // États pour le drag-and-drop
  const [draggedAlbum, setDraggedAlbum] = useState<AlbumMeta | null>(null);
  const [draggedAlbumType, setDraggedAlbumType] = useState<'photo' | 'doc' | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // États pour la suppression
  const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'album'; item: any; categoryType: 'photo' | 'doc' } | null>(null);

  // États pour renommer un album
  const [albumToRename, setAlbumToRename] = useState<AlbumMeta | null>(null);
  const [newAlbumName, setNewAlbumName] = useState('');

  // États pour la modale panier
  const [showBasketModal, setShowBasketModal] = useState(false);
  const [basketDragOver, setBasketDragOver] = useState(false);

  // Récupérer les catégories et albums
  const categories = useLiveQuery(() => db.categories.toArray());
  const albums = useLiveQuery(() => db.album_metas.toArray());

  // Items du panier
  const basketItems = useLiveQuery(() => db.creations_basket.orderBy('dateAdded').reverse().toArray(), []) || [];

  // Fonction pour traduire les labels de catégories et albums par défaut
  const translateLabel = (label: string): string => {
    if (language === 'en') {
      // Normaliser : supprimer les accents pour la comparaison
      const upper = label.toUpperCase();
      const normalized = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized === 'NON CLASSEE' || normalized === 'NON CLASSEES') return 'UNCATEGORIZED';
      if (normalized.includes('MES PROJETS CREATIONS') || normalized.includes('MES PROJETS CREATIONS')) return 'MY CREATION PROJECTS';
      if (normalized === 'MES PROJETS') return 'MY PROJECTS';
      if (normalized === 'MES COLLAGES') return 'MY COLLAGES';
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

  // Fonction pour trier avec "NON CLASSEE" en premier, puis "MES PROJETS" en second, puis "MES COLLAGES" en troisième
  const sortWithNonClasseeFirst = (items: any[], labelField: string = 'label') => {
    return [...items].sort((a, b) => {
      const aIsNonClassee = a[labelField]?.toUpperCase().includes('NON CLASSEE') || a[labelField]?.toUpperCase().includes(language === 'fr' ? 'NON CLASSÉES' : 'UNCATEGORIZED');
      const bIsNonClassee = b[labelField]?.toUpperCase().includes('NON CLASSEE') || b[labelField]?.toUpperCase().includes('NON CLASSÉES');
      const aIsMesProjets = a[labelField]?.toUpperCase() === 'MES PROJETS' || a.id === 'cat_mes_projets';
      const bIsMesProjets = b[labelField]?.toUpperCase() === 'MES PROJETS' || b.id === 'cat_mes_projets';
      const aIsMesCollages = a[labelField]?.toUpperCase().includes('MES COLLAGES') || a.id === 'cat_mes_collages';
      const bIsMesCollages = b[labelField]?.toUpperCase().includes('MES COLLAGES') || b.id === 'cat_mes_collages';
      
      // NON CLASSEE toujours en premier
      if (aIsNonClassee && !bIsNonClassee) return -1;
      if (!aIsNonClassee && bIsNonClassee) return 1;
      
      // MES PROJETS en second (juste après NON CLASSEE)
      if (aIsMesProjets && !bIsMesProjets && !bIsNonClassee) return -1;
      if (!aIsMesProjets && bIsMesProjets && !aIsNonClassee) return 1;
      
      // MES COLLAGES en troisième (juste après MES PROJETS)
      if (aIsMesCollages && !bIsMesCollages && !bIsNonClassee && !bIsMesProjets) return -1;
      if (!aIsMesCollages && bIsMesCollages && !aIsNonClassee && !aIsMesProjets) return 1;
      
      return 0;
    });
  };

  // Fonction pour trier les albums avec "Non classées" en premier
  /**
   * Trie les albums : Modèles Stickers en premier, puis Non classées, puis les autres.
   */
  const sortAlbumsWithNonClasseesFirst = (items: AlbumMeta[]) => {
    return [...items].sort((a, b) => {
      // Modèles Stickers toujours en tête de liste
      const aIsStickers = a.id === MODELES_STICKERS_ALBUM_ID;
      const bIsStickers = b.id === MODELES_STICKERS_ALBUM_ID;
      if (aIsStickers && !bIsStickers) return -1;
      if (!aIsStickers && bIsStickers) return 1;
      // Puis Non classées
      const aIsNonClassee = a.title?.toLowerCase().includes(language === 'fr' ? 'non classées' : 'uncategorized') || a.title?.toLowerCase().includes('non classee');
      const bIsNonClassee = b.title?.toLowerCase().includes('non classées') || b.title?.toLowerCase().includes('non classee');
      if (aIsNonClassee && !bIsNonClassee) return -1;
      if (!aIsNonClassee && bIsNonClassee) return 1;
      return 0;
    });
  };

  // Filtrer les catégories par type de média (exclure les catégories privées)
  // {t('albums.photosVideos')} : uniquement les catégories PhotoClass standard
  const photoCategories = sortWithNonClasseeFirst(
    categories?.filter(c => 
      c.accessType !== 'secure' &&
      c.series === 'photoclass'
    ) || []
  );

  // Documents : uniquement les catégories ClassPapiers standard
  const docCategories = sortWithNonClasseeFirst(
    categories?.filter(c => 
      c.accessType !== 'secure' &&
      c.series === 'classpapiers'
    ) || []
  );

  // Sélectionner automatiquement la première catégorie si aucune n'est sélectionnée
  useEffect(() => {
    if (photoCategories.length > 0 && !selectedPhotoCategory) {
      setSelectedPhotoCategory(photoCategories[0].id);
    }
    if (docCategories.length > 0 && !selectedDocCategory) {
      setSelectedDocCategory(docCategories[0].id);
    }
  }, [photoCategories, docCategories, selectedPhotoCategory, selectedDocCategory]);

  /**
   * Réparation automatique : synchronise les titres des entrées album_metas
   * de la catégorie MES PROJETS CRÉATIONS avec les noms réels des projets
   * stockés dans creations_projects.
   *
   * Ce mécanisme corrige les entrées créées avec un nom incorrect (ex: "Nouveau projet")
   * avant le correctif de handleCreateNewProject.
   */
  useEffect(() => {
    const repairProjectNames = async () => {
      try {
        const projectAlbums = await db.album_metas
          .where('categoryId')
          .equals('cat_mes_projets')
          .toArray();

        for (const albumMeta of projectAlbums) {
          // Ignorer l'album système MES PROJETS CRÉATIONS lui-même
          if (albumMeta.id === 'album_mes_projets') continue;

          const project = await db.creations_projects.get(albumMeta.id);
          if (project && project.name && project.name !== albumMeta.title) {
            console.log(
              `[Albums] Réparation nom : "${albumMeta.title}" → "${project.name}" (id: ${albumMeta.id})`
            );
            await db.album_metas.update(albumMeta.id, { title: project.name });
          }
        }
      } catch (err) {
        console.error('[Albums] Erreur réparation noms projets:', err);
      }
    };

    repairProjectNames();
  }, []);

  // Albums filtrés par catégorie sélectionnée (triés avec Non classées en premier)
  const photoAlbums = sortAlbumsWithNonClasseesFirst(
    albums?.filter(a => a.categoryId === selectedPhotoCategory) || []
  );
  const docAlbums = sortAlbumsWithNonClasseesFirst(
    albums?.filter(a => a.categoryId === selectedDocCategory) || []
  );

  // Obtenir la catégorie sélectionnée pour afficher sa couleur dans les albums
  const selectedPhotoCategoryData = categories?.find(c => c.id === selectedPhotoCategory);
  const selectedDocCategoryData = categories?.find(c => c.id === selectedDocCategory);

  // Ouvrir un album - comportement différent selon la catégorie
  // Les albums de MES PROJETS CRÉATIONS ouvrent directement l'Atelier
  // Les autres albums ouvrent la page PhotoClass normale
  const handleOpenAlbum = (album: AlbumMeta, type: 'photo' | 'doc') => {
    // L'album "Modèles Stickers" est un album système : ouvrir la page PhotoClass normale
    // pour permettre d'y ajouter/gérer les images de stickers.
    if (album.id === MODELES_STICKERS_ALBUM_ID) {
      setLocation(`/photoclass/${album.id}`);
      return;
    }
    // Les autres albums de MES PROJETS CRÉATIONS ouvrent l'Atelier Créations
    if (album.categoryId === 'cat_mes_projets') {
      setCreationsProjectId(album.id);
      setCreationsProjectName(album.title);
      setShowCreationsModal(true);
    } else {
      // Comportement normal : ouvrir la page PhotoClass
      setLocation(`/photoclass/${album.id}`);
    }
  };

  // Sélectionner une catégorie (avec vérification du mot de passe si personnelle)
  const handleSelectCategory = (category: any, type: 'photo' | 'doc') => {
    if (category.isPersonal && !unlockedCategories.includes(category.id)) {
      setCategoryToUnlock({ ...category, type });
      setPasswordInput('');
    } else {
      if (type === 'photo') {
        setSelectedPhotoCategory(category.id);
      } else {
        setSelectedDocCategory(category.id);
      }
    }
  };

  // Valider le mot de passe
  const handleUnlockCategory = () => {
    if (passwordInput === categoryToUnlock?.personalPassword) {
      setUnlockedCategories([...unlockedCategories, categoryToUnlock.id]);
      if (categoryToUnlock.type === 'photo') {
        setSelectedPhotoCategory(categoryToUnlock.id);
      } else {
        setSelectedDocCategory(categoryToUnlock.id);
      }
      setCategoryToUnlock(null);
      setPasswordInput('');
      toast.success(t('toast.categoryUnlocked'));
    } else {
      toast.error(t('toast.wrongPassword'));
    }
  };

  // === SUPPRESSION ===
  
  // Vérifier si une catégorie est protégée (NON CLASSEE, MES PROJETS CRÉATIONS, MES COLLAGES)
  const isProtectedCategory = (category: any) => {
    const label = category.label?.toUpperCase() || '';
    return label.includes('NON CLASSEE') || 
           label.includes('NON CLASSÉES') || 
           label.includes('MES PROJETS') ||
           label.includes('MES COLLAGES') ||
           category.id === 'cat_mes_projets' ||
           category.id === 'cat_mes_collages';
  };
  
  // Alias pour compatibilité
  const isNonClasseeCategory = isProtectedCategory;

  // Vérifier si un album est protégé (Non classées ou Mes Collages)
  /**
   * Retourne true si l'album est un album système protégé (non supprimable, non déplaçable).
   * Inclut : Non classées, Mes Collages, et Modèles Stickers.
   */
  const isNonClasseesAlbum = (album: AlbumMeta) => {
    return album.title?.toLowerCase().includes('non classées') ||
           album.title?.toLowerCase().includes('non classee') ||
           album.id === 'album_mes_collages' ||
           album.id === MODELES_STICKERS_ALBUM_ID;
  };

  // Supprimer une catégorie
  const handleDeleteCategory = async () => {
    if (!itemToDelete || itemToDelete.type !== 'category') return;
    
    const category = itemToDelete.item;
    
    try {
      // Supprimer tous les albums de cette catégorie
      const albumsToDelete = albums?.filter(a => a.categoryId === category.id) || [];
      for (const album of albumsToDelete) {
        await db.albums.delete(album.id);
        await db.album_metas.delete(album.id);
      }
      
      // Supprimer la catégorie
      await db.categories.delete(category.id);
      
      toast.success(t('toast.categoryDeleted'));
      
      // Réinitialiser la sélection si c'était la catégorie sélectionnée
      if (itemToDelete.categoryType === 'photo' && selectedPhotoCategory === category.id) {
        setSelectedPhotoCategory(null);
      } else if (itemToDelete.categoryType === 'doc' && selectedDocCategory === category.id) {
        setSelectedDocCategory(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(t('toast.deleteError'));
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
      
      toast.success(t('toast.albumDeleted'));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(t('toast.deleteError'));
    }
    
    setItemToDelete(null);
  };

  // Renommer un album
  const handleRenameAlbum = async () => {
    if (!albumToRename || !newAlbumName.trim()) return;
    
    try {
      await db.album_metas.update(albumToRename.id, { title: newAlbumName.trim() });
      toast.success(t('toast.albumRenamed') || language === 'fr' ? 'Album renommé' : 'Album renamed');
    } catch (error) {
      console.error('Erreur lors du renommage:', error);
      toast.error(t('toast.renameError') || 'Erreur lors du renommage');
    }
    
    setAlbumToRename(null);
    setNewAlbumName('');
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
    const sourceCategory = categories?.find(c => c.id === draggedAlbum.categoryId);
    
    try {
      // Mettre à jour la catégorie de l'album
      await db.album_metas.update(draggedAlbum.id, {
        categoryId: targetCategoryId
      });
      
      toast.success(t('toast.albumMoved'), { duration: 3000 });
      
      // Sélectionner la catégorie cible pour voir l'album déplacé
      if (categoryType === 'photo') {
        setSelectedPhotoCategory(targetCategoryId);
      } else {
        setSelectedDocCategory(targetCategoryId);
      }
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      toast.error(t('toast.moveError'));
    }
    
    setDraggedAlbum(null);
    setDraggedAlbumType(null);
  };

  // Callback quand un album est créé
  const handleAlbumCreated = () => {
    // Rafraîchir automatiquement via useLiveQuery
  };

  // Compter les albums par catégorie
  const getAlbumCount = (categoryId: string) => {
    return albums?.filter(a => a.categoryId === categoryId).length || 0;
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

  // Handler pour les actions toolbar
  const handleToolbarAction = (action: string | null) => {
    if (!action) return;
    
    // Créations est accessible directement depuis la page Albums
    if (action === 'creations') {
      setShowCreationsModal(true);
      return;
    }
    
    // Panier ouvre la modale panier
    if (action === 'panier') {
      setShowBasketModal(true);
      return;
    }
    
    // Les autres actions nécessitent d'être dans un album
    toast.info(t('toast.selectAlbumFirst'), {
      description: t('toast.selectAlbumFirstDesc')
    });
  };

  return (
    <MainLayout title={t('albums.title')} onToolbarAction={handleToolbarAction}>
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200/50 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Image className="text-blue-600" size={28} />
              {t('albums.title')}
            </h1>
            {!showCreationForm && (
              <Button
                onClick={() => setShowCreationForm(true)}
                className="flex flex-col items-center justify-start gap-1 bg-orange-400 hover:bg-orange-500 text-white font-semibold pt-4 pb-3 px-6 min-w-[200px]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus size={18} />
                  <span>{t('albums.createCategory')}</span>
                </div>
                <span className="text-xs font-normal">{language === "fr" ? "projet création" : "creation project"}</span>
              </Button>
            )}
            {showCreationForm && (
              <Button
                onClick={() => setShowCreationForm(false)}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              >
                <X size={20} />
                {t('common.close')}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {showCreationForm ? (
            // Afficher le formulaire de création intégré
            <div className="p-6 h-full">
              <AlbumCreationQuestionnaire onAlbumCreated={handleAlbumCreated} />
            </div>
          ) : (
            // Vue avec 2 colonnes : Photos & Documents
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Colonne Photos/Vidéos */}
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2 border-b pb-3">
                  <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-camera_63528184.png" alt="Photos" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  {t('albums.photosVideos')}
                </h2>
                
                {/* En-têtes des sous-colonnes */}
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="text-sm font-semibold text-gray-500 text-center">{t('albums.categories')}</div>
                  <div className="text-sm font-semibold text-gray-500 text-center">{t('albums.title')}</div>
                </div>
                
                {/* Contenu avec catégories et albums */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Zone A - Catégories avec radio coloré (zones de drop) */}
                  <div className="space-y-2 border-r pr-4">
                    {photoCategories.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">{t('albums.noCategory')}</p>
                    ) : (
                      photoCategories.map(category => (
                        <div
                          key={category.id}
                          onClick={() => handleSelectCategory(category, 'photo')}
                          onDragOver={(e) => handleDragOver(e, category.id, 'photo')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category.id, 'photo')}
                          className={`rounded-lg cursor-pointer transition-all duration-200 p-3 flex items-center gap-2 ${
                            selectedPhotoCategory === category.id
                              ? 'bg-blue-100 border-2 border-blue-400'
                              : dragOverCategory === category.id && draggedAlbumType === 'photo'
                              ? 'bg-blue-200 border-2 border-blue-500 border-dashed scale-105'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {/* Bouton radio coloré */}
                          <div 
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                            style={{ 
                              borderColor: category.color || '#9CA3AF',
                              backgroundColor: selectedPhotoCategory === category.id ? (category.color || '#9CA3AF') : 'transparent'
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
                          {category.isPersonal && (
                            <Lock 
                              size={14} 
                              className={`flex-shrink-0 ${unlockedCategories.includes(category.id) ? 'text-green-500' : 'text-red-500'}`} 
                            />
                          )}
                          {/* Bouton supprimer (sauf pour Non classée) */}
                          {!isNonClasseeCategory(category) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'category', item: category, categoryType: 'photo' });
                              }}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title={t('albums.deleteCategory')}
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
                      <p className="text-gray-400 text-center py-4 text-sm">{t('albums.noAlbum')}</p>
                    ) : (
                      photoAlbums.map(album => (
                        <div
                          key={album.id}
                          draggable={!isNonClasseesAlbum(album)}
                          onDragStart={(e) => handleDragStart(e, album, 'photo')}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleOpenAlbum(album, 'photo')}
                          className={`rounded-lg cursor-pointer transition-all duration-200 p-3 flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 ${
                            !isNonClasseesAlbum(album) ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${draggedAlbum?.id === album.id ? 'opacity-50' : ''}`}
                          title={!isNonClasseesAlbum(album) ? t('albums.dragToMove') : ''}
                        >
                          {!isNonClasseesAlbum(album) && (
                            <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
                          )}
                          {/* Bouton radio coloré identique à la catégorie */}
                          <div 
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                            style={{ 
                              borderColor: selectedPhotoCategoryData?.color || '#9CA3AF',
                              backgroundColor: selectedPhotoCategoryData?.color || '#9CA3AF'
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <span className="font-medium text-gray-800 text-sm truncate flex-1">{translateAlbumTitle(album.title)}</span>
                          {/* Icône à droite selon le type de la catégorie */}
                          {selectedPhotoCategoryData && getCategoryIcon(selectedPhotoCategoryData, 16)}
                          {/* Bouton renommer (sauf pour Non classées) */}
                          {!isNonClasseesAlbum(album) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAlbumToRename(album);
                                setNewAlbumName(album.title || '');
                              }}
                              className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                              title={t('albums.renameAlbum') || 'Renommer'}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {/* Bouton supprimer (sauf pour Non classées) */}
                          {!isNonClasseesAlbum(album) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'album', item: album, categoryType: 'photo' });
                              }}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title={t('albums.deleteAlbum')}
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
                  {t('albums.documents')}
                </h2>
                
                {/* En-têtes des sous-colonnes */}
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="text-sm font-semibold text-gray-500 text-center">{t('albums.categories')}</div>
                  <div className="text-sm font-semibold text-gray-500 text-center">{t('albums.title')}</div>
                </div>
                
                {/* Contenu avec catégories et albums */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Zone A - Catégories avec radio coloré (zones de drop) */}
                  <div className="space-y-2 border-r pr-4">
                    {docCategories.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">{t('albums.noCategory')}</p>
                    ) : (
                      docCategories.map(category => (
                        <div
                          key={category.id}
                          onClick={() => handleSelectCategory(category, 'doc')}
                          onDragOver={(e) => handleDragOver(e, category.id, 'doc')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category.id, 'doc')}
                          className={`rounded-lg cursor-pointer transition-all duration-200 p-3 flex items-center gap-2 ${
                            selectedDocCategory === category.id
                              ? 'bg-green-100 border-2 border-green-400'
                              : dragOverCategory === category.id && draggedAlbumType === 'doc'
                              ? 'bg-green-200 border-2 border-green-500 border-dashed scale-105'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {/* Bouton radio coloré */}
                          <div 
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                            style={{ 
                              borderColor: category.color || '#9CA3AF',
                              backgroundColor: selectedDocCategory === category.id ? (category.color || '#9CA3AF') : 'transparent'
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
                          {category.isPersonal && (
                            <Lock 
                              size={14} 
                              className={`flex-shrink-0 ${unlockedCategories.includes(category.id) ? 'text-green-500' : 'text-red-500'}`} 
                            />
                          )}
                          {/* Bouton supprimer (sauf pour Non classée) */}
                          {!isNonClasseeCategory(category) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'category', item: category, categoryType: 'doc' });
                              }}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title={t('albums.deleteCategory')}
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
                      <p className="text-gray-400 text-center py-4 text-sm">{t('albums.noAlbum')}</p>
                    ) : (
                      docAlbums.map(album => (
                        <div
                          key={album.id}
                          draggable={!isNonClasseesAlbum(album)}
                          onDragStart={(e) => handleDragStart(e, album, 'doc')}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleOpenAlbum(album, 'doc')}
                          className={`rounded-lg cursor-pointer transition-all duration-200 p-3 flex items-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 ${
                            !isNonClasseesAlbum(album) ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${draggedAlbum?.id === album.id ? 'opacity-50' : ''}`}
                          title={!isNonClasseesAlbum(album) ? t('albums.dragToMove') : ''}
                        >
                          {!isNonClasseesAlbum(album) && (
                            <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
                          )}
                          {/* Bouton radio coloré identique à la catégorie */}
                          <div 
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                            style={{ 
                              borderColor: selectedDocCategoryData?.color || '#9CA3AF',
                              backgroundColor: selectedDocCategoryData?.color || '#9CA3AF'
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <span className="font-medium text-gray-800 text-sm truncate flex-1">{translateAlbumTitle(album.title)}</span>
                          {/* Icône livre à droite */}
                          {selectedDocCategoryData && getCategoryIcon(selectedDocCategoryData, 16)}
                          {/* Bouton renommer (sauf pour Non classées) */}
                          {!isNonClasseesAlbum(album) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAlbumToRename(album);
                                setNewAlbumName(album.title || '');
                              }}
                              className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                              title={t('albums.renameAlbum') || 'Renommer'}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {/* Bouton supprimer (sauf pour Non classées) */}
                          {!isNonClasseesAlbum(album) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: 'album', item: album, categoryType: 'doc' });
                              }}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title={t('albums.deleteAlbum')}
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

        {/* Dialog pour déverrouiller une catégorie personnelle */}
        <Dialog open={!!categoryToUnlock} onOpenChange={() => setCategoryToUnlock(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="text-red-500" size={24} />
                {t('albums.protectedCategory')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                {t('albums.categoryProtectedMsg').replace('{category}', categoryToUnlock?.label || '')}
              </p>
              <div>
                <Label>{t('albums.password4digits')}</Label>
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleUnlockCategory()}
                  placeholder="****"
                  maxLength={4}
                  className="mt-1 text-center text-xl tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCategoryToUnlock(null)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleUnlockCategory} className="flex-1 bg-blue-500 hover:bg-blue-600">
                  {t('privateAlbums.unlock')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation de suppression */}
        <Dialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 size={24} />
                {t('albums.confirmDelete')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {itemToDelete?.type === 'category' ? (
                <>
                  <p className="text-gray-600">
                    {t('albums.confirmDeleteCategory').replace('{category}', itemToDelete.item.label)}
                  </p>
                  <p className="text-red-500 text-sm">
                    ⚠️ {t('albums.allAlbumsWillBeDeleted')}
                  </p>
                </>
              ) : (
                <p className="text-gray-600">
                  {t('albums.confirmDeleteAlbum').replace('{album}', itemToDelete?.item.title || '')}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setItemToDelete(null)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={itemToDelete?.type === 'category' ? handleDeleteCategory : handleDeleteAlbum} 
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de renommage d'album */}
        <Dialog open={!!albumToRename} onOpenChange={() => { setAlbumToRename(null); setNewAlbumName(''); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Pencil size={24} />
                {t('albums.renameAlbum') || 'Renommer l\'album'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newAlbumName">{t('albums.newName') || 'Nouveau nom'}</Label>
                <Input
                  id="newAlbumName"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder={t('albums.enterNewName') || 'Entrez le nouveau nom'}
                  className="mt-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newAlbumName.trim()) {
                      handleRenameAlbum();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setAlbumToRename(null); setNewAlbumName(''); }} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleRenameAlbum}
                  disabled={!newAlbumName.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  {t('common.save') || 'Enregistrer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* MODALE PANIER - Persistante avec croix de fermeture + drag-drop depuis le bureau */}
      <Dialog open={showBasketModal} onOpenChange={(open) => { if (!open) setShowBasketModal(false); }}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          {/* Header avec croix de fermeture */}
          <div className="flex items-center justify-between pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBasket className="w-5 h-5 text-amber-600" />
              {language === 'fr' ? `Panier Créations (${basketItems.length})` : `Creations Basket (${basketItems.length})`}
            </DialogTitle>
            <button
              onClick={() => setShowBasketModal(false)}
              className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
              title={language === 'fr' ? 'Fermer' : 'Close'}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Zone de contenu avec drag-drop */}
          <div
            className={`flex-1 overflow-y-auto py-4 relative ${
              basketDragOver ? 'ring-2 ring-amber-400 ring-dashed rounded-lg bg-amber-50/50' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (e.dataTransfer.types.includes('Files')) {
                e.dataTransfer.dropEffect = 'copy';
                setBasketDragOver(true);
              }
            }}
            onDragLeave={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                setBasketDragOver(false);
              }
            }}
            onDrop={async (e) => {
              e.preventDefault();
              setBasketDragOver(false);
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
              if (files.length === 0) {
                toast.error(language === 'fr' ? 'Aucune image trouvée' : 'No images found');
                return;
              }
              // Lire tous les fichiers en dataURL
              const photosToAdd: Omit<CreationsBasketItem, 'id' | 'dateAdded'>[] = [];
              for (const file of files) {
                const dataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => resolve(ev.target?.result as string);
                  reader.readAsDataURL(file);
                });
                photosToAdd.push({
                  photoUrl: dataUrl,
                  thumbnail: dataUrl,
                  photoTitle: file.name,
                  albumId: 'desktop-import',
                  albumName: language === 'fr' ? 'Import Bureau' : 'Desktop Import',
                });
              }
              const { added, duplicates } = await addToCreationsBasket(photosToAdd);
              if (added.length > 0) {
                toast.success(language === 'fr' ? `${added.length} photo(s) ajoutée(s) au panier` : `${added.length} photo(s) added to basket`);
              }
              if (duplicates.length > 0) {
                toast.info(language === 'fr' ? `${duplicates.length} doublon(s) ignoré(s)` : `${duplicates.length} duplicate(s) skipped`);
              }
            }}
          >
            {/* Overlay drag-drop */}
            {basketDragOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-50/80 z-10 rounded-lg border-2 border-dashed border-amber-400">
                <Upload className="w-10 h-10 text-amber-500 mb-2" />
                <p className="text-amber-700 font-medium">
                  {language === 'fr' ? 'Déposez vos photos ici' : 'Drop your photos here'}
                </p>
              </div>
            )}

            {basketItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBasket className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{language === 'fr' ? 'Le panier est vide' : 'Basket is empty'}</p>
                <p className="text-sm mt-1">{language === 'fr' ? 'Glissez des photos depuis le bureau ou ajoutez-les depuis un album' : 'Drag photos from desktop or add them from an album'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {basketItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={item.thumbnail || item.photoUrl}
                        alt={item.photoTitle || 'Photo'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (item.id) {
                          await removeFromCreationsBasket(item.id);
                          toast.info(language === 'fr' ? 'Photo retirée du panier' : 'Photo removed from basket');
                        }
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                      title={language === 'fr' ? 'Retirer' : 'Remove'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-[10px] text-gray-500 truncate mt-1 text-center">{item.photoTitle}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer avec actions */}
          {basketItems.length > 0 && (
            <div className="flex justify-between items-center pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await clearCreationsBasket();
                  toast.info(language === 'fr' ? 'Panier vidé' : 'Basket cleared');
                }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {language === 'fr' ? 'Vider' : 'Clear'}
              </Button>
              <span className="text-sm text-gray-500">
                {basketItems.length} {language === 'fr' ? 'photo(s)' : 'photo(s)'}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODALE CRÉATIONS / ATELIER - Nouvelle version avec 4 zones */}
      <CreationsAtelierV2
        isOpen={showCreationsModal}
        onClose={() => {
          setShowCreationsModal(false);
          setCreationsProjectId(undefined);
          setCreationsProjectName("Nouveau projet");
        }}
        projectId={creationsProjectId}
        projectName={creationsProjectName}
        onSaveProject={(projectData) => {
          console.log('[Albums] Sauvegarde du projet:', projectData);
          // La sauvegarde est gérée dans le composant via IndexedDB
        }}
      />
    </MainLayout>
  );
}
