import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { db, Category, AlbumData, AlbumMeta, createCreationsProject } from "../db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Lock, Camera, Video, Layers, FileText } from "lucide-react";
import { CategoryMediaType } from "../db";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

interface AlbumCreationQuestionnaireProps {
  onAlbumCreated: () => void;
  defaultAccessType?: "standard" | "secure";
  /** 'albums' = colonnes Catégorie + Album uniquement ; 'atelier' = colonne Projet uniquement */
  mode?: 'albums' | 'atelier';
}

export default function AlbumCreationQuestionnaire({ onAlbumCreated, defaultAccessType = "standard", mode = 'albums' }: AlbumCreationQuestionnaireProps) {
  const { t, language } = useLanguage();
  // Form state
  const [albumName, setAlbumName] = useState("");
  const [accessType, setAccessType] = useState<"standard" | "secure">(defaultAccessType);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [series, setSeries] = useState<"photoclass" | "classpapiers">("photoclass");
  const [contentType, setContentType] = useState<"photos" | "videos" | "documents">("photos");
  
  // New category input for quick creation
  const [newCategoryNameQuick, setNewCategoryNameQuick] = useState("");
  const [newCategoryColorQuick, setNewCategoryColorQuick] = useState("#3B82F6");
  const [newCategoryMediaType, setNewCategoryMediaType] = useState<CategoryMediaType>('photos');
  
  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  // États pour le nouveau projet
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCategory] = useState<'en_cours' | 'finis'>('en_cours');
  const [newProjectType, setNewProjectType] = useState("Projet libre");

  // Get all categories
  const allCategories = useLiveQuery(() => db.categories.toArray()) || [];
  
  // Get all albums for tooltip display
  const allAlbums = useLiveQuery(() => db.album_metas.toArray()) || [];
  
  // Helper function to get albums for a category
  const getAlbumsForCategory = (categoryId: string) => {
    return allAlbums.filter(album => album.categoryId === categoryId);
  };
  
  // State for tooltip
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  
  // Filter categories based on current selections
  // Utiliser mediaType au lieu de series pour le filtrage
  // Trier pour mettre NON CLASSEE en premier
  const filteredCategories = allCategories
    .filter(cat => {
      // Filtre par type d acces
      if (cat.accessType !== accessType) return false;
      
      // Filtre par type de contenu base sur mediaType
      if (contentType === 'documents') {
        // Pour Documents : afficher uniquement les categories de type documents
        return cat.mediaType === 'documents';
      } else {
        // Pour Photos/Videos : afficher les categories photos, videos, mixed (pas documents)
        return cat.mediaType !== 'documents';
      }
    })
    .sort((a, b) => {
      // NON CLASSEE toujours en premier
      if (a.label === "NON CLASSEE") return -1;
      if (b.label === "NON CLASSEE") return 1;
      return 0;
    });
  
  // Get selected category info
  const selectedCategory = allCategories.find(c => c.id === selectedCategoryId);

  // Réinitialiser la catégorie sélectionnée quand on change de série ou de type d'accès
  useEffect(() => {
    setSelectedCategoryId("");
  }, [series, accessType]);

  // Synchroniser le mediaType de la nouvelle catégorie avec le contentType sélectionné
  useEffect(() => {
    if (contentType === 'documents') {
      setNewCategoryMediaType('documents');
    } else if (contentType === 'videos') {
      setNewCategoryMediaType('videos');
    } else {
      setNewCategoryMediaType('photos');
    }
  }, [contentType]);

  // Handle creating new category from quick input
  const handleCreateNewCategoryQuick = async () => {
    if (!newCategoryNameQuick.trim()) {
      toast.error(language === "fr" ? "Veuillez entrer un nom pour la catégorie" : "Please enter a category name");
      return;
    }

    try {
      const id = uuidv4();
      // Déterminer automatiquement la série en fonction du type de média
      // Documents -> classpapiers, Photos/Vidéos/Mixte -> photoclass
      const categorySeries = newCategoryMediaType === 'documents' ? 'classpapiers' : 'photoclass';
      
      const newCategory: Category = {
        id,
        label: newCategoryNameQuick.trim(),
        color: newCategoryColorQuick,
        isDefault: false,
        accessType: accessType,
        series: categorySeries,
        mediaType: newCategoryMediaType,
        iconUrl: newCategoryMediaType === 'videos' ? 'https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-video-projector_fb85e945.png' : undefined,
      };
      
      await db.categories.add(newCategory);
      setSelectedCategoryId(id);
      setNewCategoryNameQuick("");
      setNewCategoryColorQuick("#3B82F6");
      setNewCategoryMediaType('photos');
      toast.success(language === "fr" ? "Catégorie créée et sélectionnée" : "Category created and selected");
    } catch (error) {
      console.error("Erreur création catégorie:", error);
      toast.error(language === "fr" ? "Erreur lors de la création de la catégorie" : "Error creating category");
    }
  };

  // Handle deleting category - show confirmation first
  const handleDeleteCategory = (categoryId: string) => {
    const category = allCategories.find(c => c.id === categoryId);
    
    // Catégories protégées : NON CLASSEE, MES PROJETS, MES COLLAGES
    const label = category?.label?.toUpperCase() || '';
    const isProtected = label.includes('NON CLASSEE') ||
                        label.includes('NON CLASSÉES') ||
                        label.includes('MES PROJETS') ||
                        label.includes('MES COLLAGES') ||
                        category?.id === 'cat_mes_projets' ||
                        category?.id === 'cat_mes_collages' ||
                        category?.isDefault === true;

    if (isProtected) {
      toast.error(language === "fr" ? "Cette catégorie système ne peut pas être supprimée" : "This system category cannot be deleted");
      return;
    }
    
    setCategoryToDelete(categoryId);
    setDeleteConfirmed(false);
    setShowDeleteConfirmation(true);
  };

  // Confirm deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirmed || !categoryToDelete) {
      toast.error(language === "fr" ? "Veuillez confirmer la suppression" : "Please confirm deletion");
      return;
    }

    try {
      // First, get all albums with this category from albums_meta
      const albumMetasToDelete = await db.album_metas.where('categoryId').equals(categoryToDelete).toArray();
      const albumIds = albumMetasToDelete.map(a => a.id);
      
      // Delete album metadata
      await db.album_metas.where('categoryId').equals(categoryToDelete).delete();
      
      // Delete album data
      for (const albumId of albumIds) {
        await db.albums.delete(albumId);
      }
      
      // Delete the category
      await db.categories.delete(categoryToDelete);
      
      setShowDeleteConfirmation(false);
      setCategoryToDelete(null);
      setDeleteConfirmed(false);
      setSelectedCategoryId("");
      toast.success(language === "fr" ? "Catégorie et contenu supprimés" : "Category and content deleted");
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast.error(language === "fr" ? "Erreur lors de la suppression" : "Error during deletion");
    }
  };

  // Handle creating album
  const handleCreateAlbum = async () => {
    if (!albumName.trim()) {
      toast.error(language === "fr" ? "Veuillez entrer un nom pour l'album" : "Please enter an album name");
      return;
    }

    if (!selectedCategoryId) {
      toast.error(language === "fr" ? "Veuillez sélectionner une catégorie" : "Please select a category");
      return;
    }

    try {
      const id = uuidv4();
      const now = Date.now();
      
      // Create album data (photos/frames)
      const newAlbumData: AlbumData = {
        id,
        frames: [],
        updatedAt: now,
      };
      
      // Create album metadata
      const newAlbumMeta: AlbumMeta = {
        id,
        title: albumName.trim(),
        type: accessType === 'standard' ? 'standard' : 'secure',
        series: series,
        createdAt: now,
        categoryId: selectedCategoryId,
      };

      await db.albums.add(newAlbumData);
      await db.album_metas.add(newAlbumMeta);
      setAlbumName("");
      setAccessType("standard");
      setSelectedCategoryId("");
      setSeries("photoclass");
      toast.success(language === "fr" ? "Album créé avec succès" : "Album created successfully");
      onAlbumCreated();
    } catch (error) {
      console.error("Erreur création album:", error);
      toast.error(language === "fr" ? "Erreur lors de la création de l'album" : "Error creating album");
    }
  };

  // Créer un nouveau projet
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error(language === "fr" ? "Veuillez entrer un nom pour le projet" : "Please enter a project name");
      return;
    }
    try {
      const project = await createCreationsProject(newProjectName.trim());
      // Stocker la catégorie (en_cours) et le type du projet
      await db.creations_projects.update(project.id, { projectCategory: newProjectCategory, projectType: newProjectType });
      toast.success(language === "fr" ? "Projet créé avec succès" : "Project created successfully");
      setNewProjectName("");
      setNewProjectType("Projet libre");
      onAlbumCreated();
    } catch (error) {
      console.error("Erreur création projet:", error);
      toast.error(language === "fr" ? "Erreur lors de la création du projet" : "Error creating project");
    }
  };

  // Traduire le label de catégorie (MES PROJETS → Projets finis)
  const translateCategoryLabel = (label: string): string => {
    const upper = label.toUpperCase();
    const normalized = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes('MES PROJETS')) {
      return language === 'fr' ? 'PROJETS FINIS' : 'FINISHED PROJECTS';
    }
    return label;
  };

  return (
    <div className="flex gap-4 h-full">
      {mode !== 'atelier' && (<>
      {/* LEFT SIDE - 1/3 - CATEGORY MANAGEMENT (FILTERED) */}
      <div className="w-1/3 flex flex-col gap-3 overflow-y-auto pr-2">
        {/* QUICK CREATE NEW CATEGORY */}
        <div className="bg-white p-3 rounded-lg border-2 border-dashed border-blue-300">
          <h2 className="text-lg font-bold text-gray-800 mb-2">{language === "fr" ? "Création nouvelle catégorie" : "Create new category"}</h2>
          
          <div className="space-y-2">
            {/* Name input */}
            <Input 
              value={newCategoryNameQuick}
              onChange={(e) => setNewCategoryNameQuick(e.target.value)}
              placeholder={language === "fr" ? "Nom de la catégorie..." : "Category name..."}
              className="h-8 text-sm"
            />

            {/* Type de média selector - Change aussi la série automatiquement */}
            <div className="flex gap-1">
              <button
                onClick={() => { setNewCategoryMediaType('photos'); setSeries('photoclass'); setContentType('photos'); }}
                className={`flex-1 p-1.5 rounded border text-xs transition flex items-center justify-center gap-1 ${
                  newCategoryMediaType === 'photos'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white hover:border-blue-300 text-gray-600'
                }`}
                title={t('common.categoryPhotos')}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Photos' : 'Photos'}</span>
              </button>
              {/* Bouton Vidéos */}
              <button
                onClick={() => { setNewCategoryMediaType('videos'); setSeries('photoclass'); setContentType('videos'); }}
                className={`flex-1 p-1.5 rounded border text-xs transition flex items-center justify-center gap-1 ${
                  newCategoryMediaType === 'videos'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 bg-white hover:border-purple-300 text-gray-600'
                }`}
                title={t('common.categoryVideos')}
              >
                <Video className="w-3.5 h-3.5" />
                <span>{language === "fr" ? "Vidéos" : "Videos"}</span>
              </button>
              <button
                onClick={() => { setNewCategoryMediaType('documents'); setSeries('classpapiers'); setContentType('documents'); }}
                className={`flex-1 p-1.5 rounded border text-xs transition flex items-center justify-center gap-1 ${
                  newCategoryMediaType === 'documents'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-300 bg-white hover:border-emerald-300 text-gray-600'
                }`}
                title={t('common.categoryDocuments')}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Documents' : 'Documents'}</span>
              </button>
              <button
                onClick={() => { setNewCategoryMediaType('mixed'); setSeries('photoclass'); setContentType('photos'); }}
                className={`flex-1 p-1.5 rounded border text-xs transition flex items-center justify-center gap-1 ${
                  newCategoryMediaType === 'mixed'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white hover:border-green-300 text-gray-600'
                }`}
                title={t('common.categoryMixed')}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === "fr" ? "Mixte" : "Mixed"}</span>
              </button>
            </div>

            {/* Color picker + Create button */}
            <div className="flex gap-2">
              <input 
                type="color"
                value={newCategoryColorQuick}
                onChange={(e) => setNewCategoryColorQuick(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border border-gray-300 flex-shrink-0"
              />
              <Button 
                onClick={handleCreateNewCategoryQuick}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
              >
                {language === "fr" ? "Créer" : "Create"}
              </Button>
            </div>
          </div>
        </div>

        {/* FILTERED CATEGORIES LIST */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 flex-1 flex flex-col overflow-hidden">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            {language === "fr" ? "Catégories" : "Categories"} {contentType === 'documents' ? '📄 Documents' : '📸 Photos & Vidéos'} {accessType === 'secure' ? (language === "fr" ? '(Sécurisées)' : '(Secure)') : ''}
          </p>
          
          {/* Categories list */}
          <div className="flex-1 overflow-y-auto space-y-1 relative">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => {
                const categoryAlbums = getAlbumsForCategory(cat.id);
                return (
                  <div key={cat.id} className="relative">
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({
                          top: rect.top,
                          left: rect.right + 10
                        });
                        setHoveredCategoryId(cat.id);
                      }}
                      onMouseLeave={() => setHoveredCategoryId(null)}
                      className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-sm transition ${
                        selectedCategoryId === cat.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={selectedCategoryId === cat.id}
                        onChange={() => setSelectedCategoryId(cat.id)}
                        className="w-3.5 h-3.5"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="flex-1 truncate text-xs font-medium">{translateCategoryLabel(cat.label)}</span>
                      <span className="text-[10px] text-gray-400">({categoryAlbums.length})</span>
                      {cat.mediaType === 'videos' && (
                        <span title={language === 'fr' ? 'Catégorie vidéos' : 'Video category'}>🎥</span>
                      )}
                      {cat.accessType === 'secure' && cat.label !== 'NON CLASSEE' && (
                        <Lock className="w-3 h-3 text-red-500" />
                      )}
                      {/* Bouton supprimer masqué pour les catégories NON CLASSEE (non effaçables) */}
                      {!cat.isDefault && cat.label !== 'NON CLASSEE' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoryToDelete(cat.id);
                            setShowDeleteConfirmation(true);
                          }}
                          className="p-0.5 rounded hover:bg-red-100 text-red-500"
                          title={t('common.deleteCategory')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">
                {language === "fr" ? "Aucune catégorie pour cette sélection" : "No category for this selection"}
              </p>
            )}
          </div>
        </div>
        
        {/* Tooltip for category albums - rendered via portal */}
        {hoveredCategoryId && ReactDOM.createPortal(
          <div
            className="fixed bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-[9999] max-w-xs"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            {(() => {
              const albums = getAlbumsForCategory(hoveredCategoryId);
              if (albums.length === 0) {
                return <span className="italic text-gray-300">{language === "fr" ? "Aucun album dans cette catégorie" : "No album in this category"}</span>;
              }
              return (
                <div className="space-y-0.5">
                  <div className="font-semibold border-b border-gray-700 pb-1 mb-1">{language === 'fr' ? 'Albums :' : 'Albums:'}</div>
                  {albums.map(album => (
                    <div key={album.id} className="truncate">• {album.title}</div>
                  ))}
                </div>
              );
            })()}
          </div>,
          document.body
        )}
      </div>

      {/* DIVIDER - Decorative separator with golden circles pattern */}
      <div className="flex items-stretch justify-center px-3 py-2">
        <img 
          src="/images/separator-decorative.png" 
          alt="" 
          className="w-8 object-cover"
          style={{ height: '100%', minHeight: '450px' }}
        />
      </div>

      {/* CENTER - ALBUM CREATION FORM */}
      <div className="w-1/3 flex flex-col gap-3 overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800">{language === "fr" ? "Créer un nouvel album" : "Create a new album"}</h2>

        {/* a) Type de contenu - Icônes visuelles */}
        <div>
          <Label className="text-sm font-semibold text-gray-700">{language === "fr" ? "a) Type de contenu" : "a) Content type"}</Label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => { setSeries('photoclass'); setContentType('photos'); }}
              className={`flex-1 p-3 rounded-lg border-2 transition flex flex-col items-center gap-1 ${
                contentType === 'photos'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-blue-300'
              }`}
            >
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-camera_63528184.png" alt="Photos" className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <span className="hidden text-3xl">📷</span>
              <div className="text-xs font-medium text-gray-700">Photos</div>
            </button>
            <button
              onClick={() => { setSeries('photoclass'); setContentType('videos'); }}
              className={`flex-1 p-3 rounded-lg border-2 transition flex flex-col items-center gap-1 ${
                contentType === 'videos'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 bg-white hover:border-purple-300'
              }`}
            >
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-video-projector_fb85e945.png" alt={language === "fr" ? "Vidéos" : "Videos"} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <span className="hidden text-3xl">🎦</span>
              <div className="text-xs font-medium text-gray-700">{language === "fr" ? "Vidéos" : "Videos"}</div>
            </button>
            <button
              onClick={() => { setSeries('classpapiers'); setContentType('documents'); }}
              className={`flex-1 p-3 rounded-lg border-2 transition flex flex-col items-center gap-1 ${
                contentType === 'documents'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-white hover:border-green-300'
              }`}
            >
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-book_a3b5c06e.png" alt="Documents" className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <span className="hidden text-3xl">📖</span>
              <div className="text-xs font-medium text-gray-700">Documents</div>
            </button>
          </div>
        </div>

       {/* b) Catégorie - Display selected or invitation */}
        <div>
          <Label className="text-sm font-semibold text-gray-700">{language === "fr" ? "b) Catégorie" : "b) Category"}</Label>
          <div className="mt-1 p-3 rounded-lg border border-gray-300 bg-gray-50 min-h-10 flex items-center">
            {selectedCategory ? (
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded-full border border-gray-300"
                  style={{ backgroundColor: selectedCategory.color }}
                />
                <span className="font-medium text-gray-800">{selectedCategory.label}</span>
              </div>
            ) : (
              <span className="text-gray-500 italic">{language === "fr" ? "Sélectionnez une catégorie ou créez-en une nouvelle" : "Select a category or create a new one"}</span>
            )}
            {selectedCategory && selectedCategory.accessType === 'secure' && (
              <Lock className="w-4 h-4 text-purple-600 ml-2" />
            )}
          </div>
        </div>

        {/* c) Nom de l'album */}
        <div>
          <Label className="text-sm font-semibold text-gray-700">{language === "fr" ? "c) Nom de l'album" : "c) Album name"}</Label>
          <Input 
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            placeholder="Ex: Vacances 2024"
            className="mt-1 h-8 text-sm"
          />
        </div>

        {/* Create buttons - at bottom */}
        <div className="flex gap-3 mt-4">
          <Button 
            onClick={handleCreateAlbum}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 w-auto px-6"
          >
            {language === "fr" ? "✓ Créer l'album" : "✓ Create album"}
          </Button>
          {selectedCategory?.id === 'cat_mes_projets' && (
            <Button 
              onClick={handleCreateAlbum}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold h-9 w-auto px-6"
            >
              {language === "fr" ? "ou le projet" : "or project"}
            </Button>
          )}
        </div>
      </div>

      </>)}

      {mode !== 'albums' && (<>
      {/* RIGHT SIDE - NOUVEAU PROJET */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pl-2">
        <h2 className="text-lg font-bold text-gray-800">{language === "fr" ? "Nouveau Projet" : "New Project"}</h2>

        {/* Nom du projet */}
        <div>
          <Label className="text-sm font-semibold text-gray-700">{language === "fr" ? "Nom :" : "Name:"}</Label>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder={language === "fr" ? "Mon projet..." : "My project..."}
            className="mt-1 h-8 text-sm border border-gray-300 rounded-md"
          />
        </div>

        {/* Destination du projet */}
        <div>
          <Label className="text-sm font-semibold text-gray-700">{language === "fr" ? "Destination :" : "Destination:"}</Label>
          <div className="mt-1 flex flex-col gap-1.5">
            <label
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-purple-100 border border-purple-400"
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: '#8B5CF6',
                  backgroundColor: '#8B5CF6'
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <span className="text-sm text-gray-700">{language === "fr" ? "Projet en cours" : "Work in progress"}</span>
            </label>
          </div>
        </div>

        {/* Type de projet */}
        <div>
          <Label className="text-sm font-semibold text-gray-700">{language === "fr" ? "Que voulez-vous faire ?" : "What do you want to do?"}</Label>
          <select
            value={newProjectType}
            onChange={(e) => setNewProjectType(e.target.value)}
            className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Projet libre">{language === "fr" ? "Projet libre" : "Free project"}</option>
            <option value="Collage">{language === "fr" ? "Collage" : "Collage"}</option>
            <option value="Passe-partout modèle">{language === "fr" ? "Passe-partout modèle" : "Mat frame template"}</option>
            <option value="Montage photos/Passe-partout">{language === "fr" ? "Montage photos/Passe-partout" : "Photo montage/Mat frame"}</option>
            <option value="Pêle-mêle modèle">{language === "fr" ? "Pêle-mêle modèle" : "Photo montage template"}</option>
            <option value="Montage photos/Pêle-mêle">{language === "fr" ? "Montage photos/Pêle-mêle" : "Photo montage/Collage"}</option>
            <option value="Page de stickers">{language === "fr" ? "Page de stickers" : "Sticker page"}</option>
            <option value="Puzzle">{language === "fr" ? "Puzzle" : "Puzzle"}</option>
          </select>
        </div>

        {/* Bouton créer le projet */}
        <div className="mt-4">
          <Button
            onClick={handleCreateProject}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold h-9 w-full"
          >
            {language === "fr" ? "Créer le projet" : "Create project"}
          </Button>
        </div>
      </div>
      </>)}

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">{language === "fr" ? "⚠️ Suppression Irréversible" : "⚠️ Irreversible Deletion"}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 mt-3">
              <p className="font-semibold mb-2">{language === "fr" ? "Attention ! En supprimant cette catégorie :" : "Warning! By deleting this category:"}</p>
              <p className="text-sm">{language === "fr" ? "✗ Tous les albums de cette catégorie seront supprimés" : "✗ All albums in this category will be deleted"}</p>
              <p className="text-sm">{language === "fr" ? "✗ Tous les photos/documents seront supprimés" : "✗ All photos/documents will be deleted"}</p>
              <p className="text-sm">{language === "fr" ? "✗ Cette action est irréversible" : "✗ This action is irreversible"}</p>
              <p className="text-sm mt-3 font-semibold">{language === "fr" ? "Veuillez déplacer les informations que vous souhaitez conserver avant suppression définitive." : "Please move the information you wish to keep before permanent deletion."}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <input 
              type="checkbox"
              checked={deleteConfirmed}
              onChange={(e) => setDeleteConfirmed(e.target.checked)}
              id="deleteConfirm"
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="deleteConfirm" className="text-xs text-gray-700 cursor-pointer">
              {language === "fr" ? "Je comprends que cette action est irréversible" : "I understand this action is irreversible"}
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{language === "fr" ? "Annuler" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={!deleteConfirmed}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {language === "fr" ? "Supprimer définitivement" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
