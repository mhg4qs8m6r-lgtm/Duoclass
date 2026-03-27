import { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { useLocation } from "wouter";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock, HelpCircle, Plus, X, Trash2, Camera, Video, Layers } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { db, AlbumMeta, Category } from "../db";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from '@/contexts/LanguageContext';

// Types pour les albums (adapté pour l'affichage)
type AlbumDisplay = AlbumMeta;

// Composant pour afficher la pastille de couleur et l'icône de type de média
// Le paramètre series permet de ne pas afficher l'icône vidéo dans ClassPapiers
const CategoryDot = ({ categoryId, series }: { categoryId: string; series?: string }) => {
  const category = useLiveQuery(() => db.categories.get(categoryId));
  if (!category) return null;
  
  // Ne pas afficher l'icône vidéo dans ClassPapiers
  const showVideoIcon = series !== 'classpapiers';
  
  return (
    <div className="flex items-center gap-0.5 mr-1 shrink-0">
      <div 
        className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" 
        style={{ backgroundColor: category.color }}
        title={category.label}
      />
      {/* Icône de type de média - seulement pour PhotoClass */}
      {showVideoIcon && category.mediaType === 'videos' && (
        <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/icon-video-projector_fb85e945.png" alt="Videos" className="w-4 h-4" title="Videos" />
      )}
      {category.mediaType === 'photos' && (
        <Camera className="w-3 h-3 text-blue-500" />
      )}
      {category.mediaType === 'mixed' && (
        <Layers className="w-3 h-3 text-green-500" />
      )}
    </div>
  );
};

// Hook pour récupérer le nom de la catégorie
const useCategoryLabel = (categoryId: string | undefined) => {
  const category = useLiveQuery(() => categoryId ? db.categories.get(categoryId) : undefined, [categoryId]);
  return category?.label || '';
};

// Composant pour afficher le contenu de l'album avec tooltip personnalisé
const AlbumContent = ({ album, onDelete }: { album: AlbumDisplay; onDelete?: () => void }) => {
  const { language } = useLanguage();
  const rawCategoryLabel = useCategoryLabel(album.categoryId);
  const categoryLabel = language === 'en' ? (() => {
    const upper = rawCategoryLabel.toUpperCase();
    if (upper === 'NON CLASSEE' || upper === 'NON CLASSÉE' || upper === 'NON CLASSÉES') return 'UNCATEGORIZED';
    if (upper.includes('MES PROJETS')) return upper.replace('MES PROJETS CRÉATIONS', 'MY CREATION PROJECTS').replace('MES PROJETS', 'MY PROJECTS');
    return rawCategoryLabel;
  })() : rawCategoryLabel;
  const displayTitle = language === 'en' ? (() => {
    const lower = album.title.toLowerCase();
    if (lower === 'non classées' || lower === 'non classees' || lower === 'non classée') return 'Uncategorized';
    return album.title;
  })() : album.title;
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  
  return (
    <>
      <div 
        className="absolute inset-0 flex items-center px-1.5"
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPosition({
            top: rect.top - 8,
            left: rect.left + rect.width / 2
          });
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Pastille de couleur de catégorie */}
        {album.categoryId && (
          <CategoryDot categoryId={album.categoryId} series={album.series} />
        )}
        
        {/* Titre de l'album uniquement */}
        <span className="font-bold text-gray-900 text-sm truncate flex-1 min-w-0 mr-1">
          {displayTitle}
        </span>
        
        {/* Espace réservé pour le bouton de suppression (toujours présent pour uniformiser la largeur) */}
        <div className="w-5 shrink-0"></div>
      </div>
      
      {/* Tooltip personnalisé - rendu via portail pour éviter overflow:hidden */}
      {showTooltip && categoryLabel && ReactDOM.createPortal(
        <div 
          className="fixed bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-xl pointer-events-none w-[180px] text-center"
          style={{
            zIndex: 9999,
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <span className="font-semibold">{categoryLabel}</span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
        </div>,
        document.body
      )}
    </>
  );
};

  // Composant Slot (Emplacement d'album)
const AlbumSlot = ({ 
  index, 
  album, 
  isSelected, 
  onClick, 
  onDelete,
  isSecure = false,
  series
}: { 
  index: number; 
  album?: AlbumDisplay; 
  isSelected: boolean; 
  onClick: () => void;
  onDelete?: () => void;
  isSecure?: boolean;
  series?: "photoclass" | "classpapiers";
}) => {
  const { language } = useLanguage();
  // Récupérer la couleur personnalisée
  const secureBorderColor = localStorage.getItem("secureBorderColor") || "#A855F7";

  return (
    <div className="flex items-center gap-2 mb-2 group">
      {/* Numéro ou Case à cocher (visuel seulement) */}
      <div 
        className="w-6 flex justify-center shrink-0 -mr-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          if (album) onClick();
        }}
      >
        {album ? (
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-400 hover:border-blue-400 hover:bg-blue-100 hover:scale-110"}`}>
            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition-all duration-200" />
        )}
      </div>

      {/* Numéro d'index (si présent) */}
      <div className="w-5 text-sm font-bold text-gray-500 shrink-0 text-center -mr-1">
        {index > 0 ? index : ""}
      </div>

      {/* Cadre de l'album */}
      <div 
        style={
          album && isSecure && !isSelected 
            ? { borderColor: secureBorderColor, backgroundColor: `${secureBorderColor}15` } 
            : {}
        }
        onClick={() => album && onClick()}
        className={`
          flex-1 h-10 border-2 rounded-md relative overflow-hidden transition-all cursor-pointer
          ${album 
            ? isSelected 
              ? "border-blue-500 bg-blue-50 shadow-sm" 
              : isSecure 
                ? "shadow-sm" // La couleur de bordure est gérée via style inline
                : "border-black bg-white shadow-sm" 
            : "border-gray-300 bg-gray-100 shadow-inner"
          }
        `}
      >
          {album ? (
          <AlbumContent album={album} onDelete={onDelete} />
        ) : (
          <span className="text-gray-300 italic text-xs"></span>
        )}
        
        {/* Petit cadenas si sécurisé */}
        {isSecure && (
          <div 
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 rounded-full p-0.5 shadow-sm border"
            style={{ borderColor: `${secureBorderColor}40` }}
          >
            <Lock className="w-4 h-4" style={{ color: secureBorderColor }} />
          </div>
        )}

        {/* Bouton de suppression (visible au survol) */}
        {album && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-full text-red-500 z-30 bg-white shadow-sm border border-gray-200"
            title={language === 'fr' ? "Supprimer l'album" : 'Delete album'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        )}
        
        {/* Masque pour le mode invité (sécurité supplémentaire visuelle) */}
        {isSecure && (
          <div className="hidden guest-hidden-overlay absolute inset-0 bg-gray-100 z-50 flex items-center justify-center">
            <span className="text-xs text-gray-400">{language === "fr" ? "Masqué" : "Hidden"}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  // Fonction pour traduire les labels de catégories et albums par défaut
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
  const { login, isAuthenticated } = useAuth();

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  
  // État pour la modale de sécurité (accès aux albums sécurisés)
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [password, setPassword] = useState("");
  const [targetSecureAlbumId, setTargetSecureAlbumId] = useState<string | null>(null);
  
  // État pour le déverrouillage global (Mode Admin)
  const [showAdminUnlockModal, setShowAdminUnlockModal] = useState(false);
  const [adminUnlockPassword, setAdminUnlockPassword] = useState("");

  const handleAdminUnlock = () => {
    if (adminUnlockPassword === masterCode) {
      login();
      setShowAdminUnlockModal(false);
      setAdminUnlockPassword("");
      toast.success(language === "fr" ? "Mode Administrateur activé" : "Administrator mode enabled");
    } else {
      toast.error(language === "fr" ? "Code incorrect" : "Incorrect code");
    }
  };
  
  // Handler pour les actions toolbar
  const handleToolbarAction = (action: string | null) => {
    if (!action) return;
  };

  // État pour la suppression d'album
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const confirmQuit = () => {
    if (dontAskAgain) {
      localStorage.setItem("duoclass_quit_confirm_disabled", "true");
    }
    window.close();
  };
  
  // Récupération des albums et catégories depuis IndexedDB
  const albums = useLiveQuery(() => db.album_metas.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const masterCodeSetting = useLiveQuery(() => db.settings.get('master_code'));
  const masterCode = masterCodeSetting?.value || '000000';
  
  // État pour le filtrage par catégorie
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null); // null = Tout voir
  
  // État pour tracker la section active
  const [activeSection, setActiveSection] = useState<{ series: string; type: string } | null>(null);
  
  // Helper: Get categories filtered by active section
  // Exclure les catégories "vidéos" de ClassPapiers (elles ne sont valides que pour PhotoClass)
  const categoriesWithAlbums = activeSection 
    ? categories.filter(cat => {
        // Filtre de base par série et type d'accès
        if (cat.series !== activeSection.series || cat.accessType !== activeSection.type) return false;
        
        // Si c'est ClassPapiers, exclure les catégories de type "vidéos"
        if (activeSection.series === 'classpapiers' && cat.mediaType === 'videos') return false;
        
        return true;
      })
    : categories;
  
  // État pour la création rapide de catégorie
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#000000");

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const id = uuidv4();
    await db.categories.add({
      id,
      label: newCategoryName.trim(),
      color: newCategoryColor,
      isDefault: false,
      accessType: 'standard' // Default to standard for quick creation from Home
    });
    setNewCategoryName("");
    setIsCreatingCategory(false);
    toast.success(language === "fr" ? "Catégorie ajoutée" : "Category added");
  };

  // Fonction pour supprimer une catégorie (sauf NON CLASSEE)
  const handleDeleteCategory = async (categoryId: string) => {
    const category = await db.categories.get(categoryId);
    if (!category) return;
    
    // Empêcher la suppression de "NON CLASSEE"
    if (category.label === "NON CLASSEE") {
      toast.error(language === "fr" ? "La catégorie 'NON CLASSEE' ne peut pas être supprimée" : "The 'NOT CLASSIFIED' category cannot be deleted");
      return;
    }
    
    try {
      await db.categories.delete(categoryId);
      toast.success(language === 'fr' ? `Catégorie "${category.label}" supprimée` : `Category "${category.label}" deleted`);
      // Si cette catégorie était sélectionnée comme filtre, on réinitialise
      if (activeCategoryFilter === categoryId) {
        setActiveCategoryFilter(null);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(language === "fr" ? "Erreur lors de la suppression de la catégorie" : "Error deleting category");
    }
  };

  const handleDeleteAlbum = async () => {
    if (!albumToDelete) return;
    
    try {
      const album = await db.album_metas.get(albumToDelete);
      
      // Vérifier si c'est l'album "Non classées" (album système)
      if (album?.title === "Non classées" || albumToDelete.includes('_nc')) {
        toast.error(language === "fr" ? "L'album language === 'fr' ? 'Non classées' : 'Uncategorized' est un album système et ne peut pas être supprimé." : "The 'Not classified' album is a system album and cannot be deleted.");
        setShowDeleteConfirm(false);
        setAlbumToDelete(null);
        return;
      }
      if (album?.type === "secure") {
        // Si déjà en mode Admin, pas besoin de redemander le code
        if (isAuthenticated || deletePassword === masterCode) {
          if (!isAuthenticated) {
            login(); // Activer le mode admin global si pas encore authentifié
          }
          await db.albums.delete(albumToDelete);
          await db.album_metas.delete(albumToDelete);
          toast.success(language === "fr" ? "Album supprimé avec succès" : "Album deleted successfully");
        } else {
          toast.error(language === "fr" ? "Code Maître incorrect" : "Incorrect Master Code");
        }
      } else {
        // Pour les albums libres, on demande juste une confirmation explicite via la modale
        await db.albums.delete(albumToDelete);
        await db.album_metas.delete(albumToDelete);
        toast.success(language === "fr" ? "Album supprimé avec succès" : "Album deleted successfully");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(language === "fr" ? "Erreur lors de la suppression de l'album" : "Error deleting album");
    }
    setShowDeleteConfirm(false);
    setDeletePassword("");
    setAlbumToDelete(null);
    // Si l'album supprimé était sélectionné, on désélectionne
    if (selectedAlbumId === albumToDelete) {
      setSelectedAlbumId(null);
    }
  };

  // Helpers pour filtrer les albums par colonne
  const getAlbums = (series: "photoclass" | "classpapiers", type: "standard" | "secure") => {
    // Filtrer les albums par série et type
    let filtered = albums
      .filter((a: AlbumMeta) => {
        if (a.series !== series) return false;
        
        // Si on demande la colonne "standard" (Libre)
        if (type === "standard") {
          return a.type === "standard" || a.type === "unclassified";
        }
        
        // Si on demande la colonne "secure" (Sécurisé)
        if (type === "secure") {
          // Si non authentifié (mode invité par défaut), on ne montre pas les albums sécurisés
          if (!isAuthenticated) return false;
          return a.type === "secure";
        }
        
        return false;
      });

    // Appliquer le filtre de catégorie si actif
    if (activeCategoryFilter) {
      // On garde l'album s'il correspond à la catégorie OU si c'est un album "Non classées" (type unclassified)
      filtered = filtered.filter(a => a.categoryId === activeCategoryFilter || a.type === "unclassified");
    }

    // Tri : 
    // 1. L'album "Non classées" toujours en premier
    // 2. Si "Tout voir" (pas de filtre) -> Tri par couleur (catégorie) puis par date
    // 3. Si Filtre actif -> Tri par date uniquement
    filtered.sort((a: AlbumMeta, b: AlbumMeta) => {
      // "Non classées" toujours en premier
      const aIsNonClassees = a.title === "Non classées" || a.type === "unclassified" || a.id.includes('_nc');
      const bIsNonClassees = b.title === "Non classées" || b.type === "unclassified" || b.id.includes('_nc');
      if (aIsNonClassees && !bIsNonClassees) return -1;
      if (!aIsNonClassees && bIsNonClassees) return 1;
      
      if (!activeCategoryFilter) {
        // Tri par catégorie d'abord
        const catA = a.categoryId || 'cat_nc_photo'; // Default to NON CLASSEE
        const catB = b.categoryId || 'cat_nc_photo';
        if (catA !== catB) return catA.localeCompare(catB);
      }
      // Puis par date
      return a.createdAt - b.createdAt;
    });
      
    // Éliminer les doublons basés sur l'ID (au cas où)
    const uniqueAlbums = Array.from(new Map(filtered.map(item => [item.id, item])).values());
    
    return uniqueAlbums;
  };

  const getUnclassified = (series: "photoclass" | "classpapiers") => {
    // On cherche l'album "Non classées" spécifique à la série
    // Note: Il n'y a plus de distinction secure/non-secure pour "Non classées" dans la DB pour l'instant,
    // mais l'interface en demande deux. On va filtrer par type si nécessaire.
    // Pour l'instant, on suppose un seul "Non classées" par série, ou on adapte la logique.
    // MAIS: La maquette montre "Non classées" dans la colonne libre ET dans la colonne sécurisée.
    // Est-ce le MÊME album ou deux différents ?
    // Logiquement, ce sont deux albums différents : un pour les photos en vrac libres, un pour les photos en vrac sécurisées.
    // Donc on filtre aussi par type.
    return albums.find((a: AlbumMeta) => a.series === series && a.type === "unclassified");
  };
  
  // Helper spécifique pour récupérer le "Non classées" sécurisé vs standard s'ils existent distinctement
  // Si on n'a pas encore créé les deux versions en base, on peut adapter.
  // Pour l'instant, AdminAlbum permet de créer "Non classées" avec un type.
  const getUnclassifiedByType = (series: "photoclass" | "classpapiers", type: "standard" | "secure") => {
     // Chercher l'album "Non classées" par titre et série
     // Pour la colonne standard (libre), on cherche les albums avec type="standard" ou type="unclassified"
     // Pour la colonne secure, on cherche les albums avec type="secure"
     
     return albums.find((a: AlbumMeta) => 
       a.series === series && 
       a.title === "Non classées" &&
       (type === "standard" ? (a.type === "standard" || a.type === "unclassified") : a.type === type)
     );
  };

  const handleAlbumClick = (album: AlbumMeta) => {
    if (album.type === "secure") {
      // Si déjà authentifié en admin, on ouvre directement
      if (isAuthenticated) {
        if (album.series === "photoclass") {
          setLocation(`/photoclass/${album.id}`);
        } else {
          setLocation(`/classpapiers/${album.id}`);
        }
      } else {
        // Sinon on demande le code
        setTargetSecureAlbumId(album.id);
        setShowSecurityModal(true);
      }
    } else {
      // Navigation directe pour les albums libres
      if (album.series === "photoclass") {
        setLocation(`/photoclass/${album.id}`);
      } else {
        setLocation(`/classpapiers/${album.id}`);
      }
    }
  };

  const handleSecureAccess = () => {
    if (!targetSecureAlbumId) return;
    
    // Vérification avec le Code Maître unique
    if (password === masterCode) {
      login(); // Activer le mode admin global
      // setSelectedAlbumId(targetSecureAlbumId); // Plus besoin de sélectionner
      setShowSecurityModal(false);
      setPassword("");
      toast.success(language === "fr" ? "Accès autorisé" : "Access granted");
      
      // Ouverture automatique de l'album
      const album = albums.find(a => a.id === targetSecureAlbumId);
      if (album) {
        if (album.series === "photoclass") {
          setLocation(`/photoclass/${targetSecureAlbumId}`);
        } else {
          setLocation(`/classpapiers/${targetSecureAlbumId}`);
        }
      }
    } else {
      toast.error(language === "fr" ? "Code Maître incorrect" : "Incorrect Master Code");
    }
  };

  const handleEnter = () => {
    if (selectedAlbumId) {
      const album = albums.find(a => a.id === selectedAlbumId);
      if (album) {
        if (album.series === "photoclass") {
          setLocation(`/photoclass/${selectedAlbumId}`);
        } else {
          setLocation(`/classpapiers/${selectedAlbumId}`);
        }
      }
    } else {
      toast.error(language === "fr" ? "Veuillez sélectionner un album" : "Please select an album");
    }
  };

  // Rendu des slots vides pour compléter la grille à 6 ou 7 éléments
  const renderEmptySlots = (count: number, startIndex: number) => {
    return Array.from({ length: Math.max(0, count) }).map((_, i) => (
      <AlbumSlot 
        key={`empty-${startIndex + i}`} 
        index={startIndex + i} 
        isSelected={false} 
        onClick={() => {}} 
      />
    ));
  };

  return (
    <MainLayout onToolbarAction={handleToolbarAction}>
      <div className="flex flex-col h-full items-center justify-center p-4 relative">
        
        {/* Barre de couleur pour indiquer la section active */}
        {activeSection && (
          <div className="absolute top-0 left-0 right-0 h-1 z-20" style={{
            backgroundColor: 
              activeSection.series === 'photoclass' && activeSection.type === 'standard' ? '#dcfce7' :
              activeSection.series === 'photoclass' && activeSection.type === 'secure' ? '#e9d5ff' :
              activeSection.series === 'classpapiers' && activeSection.type === 'standard' ? '#dbeafe' :
              activeSection.series === 'classpapiers' && activeSection.type === 'secure' ? '#fee2e2' :
              '#f3f4f6'
          }} />
        )}
        
        {/* <h1 className="text-3xl font-bold text-blue-900 mb-2 absolute -top-1">{language === "fr" ? "Sélection d'album" : "Album selection"}</h1> */ }

        {/* Barre de Filtres Catégories / Avertissement Admin */}
        <div className="absolute top-2 w-full max-w-[95%] z-10 flex items-start gap-2">
          <div className={`w-full rounded-xl border shadow-sm p-2 transition-all ${
            isAuthenticated 
              ? 'bg-orange-100/90 border-orange-300' 
              : 'bg-white/80 backdrop-blur-sm border-gray-200'
          }`}>
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {/* Message d'avertissement Admin (Visible seulement si connecté) */}
              {isAuthenticated && (
                <div className="flex items-center gap-2 text-orange-800 font-semibold text-sm">
                  <Lock className="w-4 h-4 text-orange-600" />
                  <span>{language === "fr" ? "Attention, vous êtes en mode \"Administrateur\", n'oubliez pas de revenir en libre" : "Warning, you are in \"Administrator\" mode, don't forget to switch back to free mode"}</span>
                </div>
              )}
              
              {/* Bouton Mode Admin (Visible seulement si non connecté) */}
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdminUnlockModal(true)}
                  className="rounded-full px-4 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 mr-2 font-medium h-8"
                >
                  <Lock className="w-3 h-3 mr-2" />
                  Mode Admin
                </Button>
              )}

              {activeSection && isAuthenticated && (
                <>
                  <button
                    onClick={() => setActiveCategoryFilter(null)}
                    className={`px-3 py-1 rounded-full text-sm font-bold border transition-all ${
                      activeCategoryFilter === null 
                        ? "bg-black text-white border-black shadow-md scale-105" 
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {language === "fr" ? "Afficher toutes les catégories" : "Show all categories"}
                  </button>
                  {categoriesWithAlbums.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveCategoryFilter(activeCategoryFilter === cat.id ? null : cat.id)}
                        className={`px-3 py-1 rounded-full text-sm font-bold border transition-all flex items-center gap-2 ${
                          activeCategoryFilter === cat.id 
                            ? "text-white shadow-md scale-105" 
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}
                        style={{
                          backgroundColor: activeCategoryFilter === cat.id ? cat.color : undefined,
                          borderColor: activeCategoryFilter === cat.id ? cat.color : undefined,
                        }}
                      >
                        <div 
                          className={`w-2 h-2 rounded-full ${activeCategoryFilter === cat.id ? "bg-white" : ""}`}
                          style={{ backgroundColor: activeCategoryFilter === cat.id ? undefined : cat.color }}
                        />
                        {translateLabel(cat.label)}
                        {cat.accessType === 'secure' && (
                          <Lock className={`w-3 h-3 ${activeCategoryFilter === cat.id ? "text-white" : "text-purple-600"}`} />
                        )}
                      </button>
                      {/* Icône corbeille en mode Admin (sauf pour NON CLASSEE) */}
                      {isAuthenticated && cat.label !== "NON CLASSEE" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id);
                          }}
                          className="p-1 rounded-full hover:bg-red-100 transition-colors"
                          title={language === 'fr' ? `Supprimer la catégorie "${cat.label}"` : `Delete category "${translateLabel(cat.label)}"`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          

        </div>

        <div className="flex gap-4 w-full max-w-full items-start justify-center mt-32">
          
          {/* Section PhotoClass */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-cyan-500">PhotoClass</h2>
            
            <div className="flex gap-2">
              {/* Colonne Albums libres */}
              <Card className={`w-64 p-3 shadow-lg rounded-xl transition-all ${
                activeSection?.series === 'photoclass' && activeSection?.type === 'standard'
                  ? 'bg-green-50/80 border-2 border-green-400'
                  : 'bg-white/90 border-2 border-gray-200'
              }`}>
                <div className={`border-2 rounded-full py-1 px-2 mb-3 text-center font-bold text-base shadow-sm transition-all cursor-pointer ${
                  activeSection?.series === 'photoclass' && activeSection?.type === 'standard'
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : 'bg-white border-black hover:bg-green-50'
                }`}
                onClick={() => setActiveSection({ series: 'photoclass', type: 'standard' })}
                >
                  Albums libres
                </div>
                
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {/* Album Non classées (toujours en premier) */}
                  {(() => {
                    const unclassified = getUnclassifiedByType("photoclass", "standard");
                    return (
                      <AlbumSlot 
                        index={0} 
                        album={unclassified} 
                        isSelected={selectedAlbumId === unclassified?.id}
                        onClick={() => unclassified && handleAlbumClick(unclassified)}
                      />
                    );
                  })()}

                  {/* Liste des albums libres standards */}
                  {getAlbums("photoclass", "standard")
                    .filter(a => a.type !== "unclassified" && a.title !== "Non classées")
                    .map((album, i) => (
                      <AlbumSlot 
                        key={album.id} 
                        index={i + 1} 
                        album={album} 
                        isSelected={selectedAlbumId === album.id}
                        onClick={() => handleAlbumClick(album)}
                        onDelete={() => {
                          setAlbumToDelete(album.id);
                          setShowDeleteConfirm(true);
                        }}
                      />
                  ))}
                  
                  {/* Slots vides pour compléter (Total 6 slots incluant "Non classées") */}
                  {renderEmptySlots(
                    Math.max(0, 5 - getAlbums("photoclass", "standard").filter(a => a.type !== "unclassified" && a.title !== "Non classées").length), 
                    getAlbums("photoclass", "standard").filter(a => a.type !== "unclassified" && a.title !== "Non classées").length + 1
                  )}
                </div>
              </Card>

              {/* Colonne Albums sécurisés - Visible uniquement en mode Admin */}
              {isAuthenticated && (
                <Card className={`w-64 p-3 shadow-lg rounded-xl transition-all ${
                  activeSection?.series === 'photoclass' && activeSection?.type === 'secure'
                    ? 'bg-purple-50/80 border-2 border-purple-400'
                    : 'bg-white/90 border-2 border-gray-200'
                }`}>
                  <div className={`border-2 rounded-lg py-1 px-2 mb-3 text-center font-bold text-base shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeSection?.series === 'photoclass' && activeSection?.type === 'secure'
                      ? 'bg-purple-100 border-purple-500 text-purple-800'
                      : 'bg-white border-black hover:bg-purple-50'
                  }`}
                  onClick={() => setActiveSection({ series: 'photoclass', type: 'secure' })}
                  >
                    <Lock className="w-4 h-4" />
                    {language === "fr" ? "Albums sécurisés" : "Secure albums"}
                  </div>
                  
                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {/* Liste des albums sécurisés */}
                    {getAlbums("photoclass", "secure")
                      .map((album, i) => (
                        <AlbumSlot 
                          key={album.id} 
                          index={i + 1} 
                          album={album} 
                          isSelected={selectedAlbumId === album.id}
                          onClick={() => handleAlbumClick(album)}
                          onDelete={() => {
                            setAlbumToDelete(album.id);
                            setShowDeleteConfirm(true);
                          }}
                          isSecure={true}
                        />
                    ))}

                    {/* Slots vides (Total 6 slots) */}
                    {renderEmptySlots(
                      Math.max(0, 6 - getAlbums("photoclass", "secure").length), 
                      getAlbums("photoclass", "secure").length + 1
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Espace central vide (anciennement bouton OK) */}
          <div className="self-center pt-12 px-2 w-16">
            {/* Bouton OK supprimé pour navigation directe */}
          </div>

          {/* Section Documents */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-purple-500">{language === 'fr' ? 'Documents' : 'Documents'}</h2>
            
            <div className="flex gap-2">
              {/* Colonne Albums libres (ClassPapiers) */}
              <Card className={`w-64 p-3 shadow-lg rounded-xl transition-all ${
                activeSection?.series === 'classpapiers' && activeSection?.type === 'standard'
                  ? 'bg-blue-50/80 border-2 border-blue-400'
                  : 'bg-white/90 border-2 border-gray-200'
              }`}>
                <div className={`border-2 rounded-full py-1 px-2 mb-3 text-center font-bold text-base shadow-sm transition-all cursor-pointer ${
                  activeSection?.series === 'classpapiers' && activeSection?.type === 'standard'
                    ? 'bg-blue-100 border-blue-500 text-blue-800'
                    : 'bg-white border-black hover:bg-blue-50'
                }`}
                onClick={() => setActiveSection({ series: 'classpapiers', type: 'standard' })}
                >
                  Albums libres
                </div>
                
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {/* Album Non classées (toujours en premier, sans corbeille) */}
                  {(() => {
                    const unclassified = getUnclassifiedByType("classpapiers", "standard");
                    return (
                      <AlbumSlot 
                        index={0} 
                        album={unclassified} 
                        isSelected={selectedAlbumId === unclassified?.id}
                        onClick={() => unclassified && handleAlbumClick(unclassified)}
                      />
                    );
                  })()}

                  {/* Liste des albums libres (ClassPapiers) - sans Non classées */}
                  {getAlbums("classpapiers", "standard")
                    .filter(a => a.type !== "unclassified" && a.title !== "Non classées")
                    .map((album, i) => (
                      <AlbumSlot 
                        key={album.id} 
                        index={i + 1} 
                        album={album} 
                        isSelected={selectedAlbumId === album.id}
                        onClick={() => handleAlbumClick(album)}
                        onDelete={() => {
                          setAlbumToDelete(album.id);
                          setShowDeleteConfirm(true);
                        }}
                        isSecure={false}
                      />
                  ))}

                  {/* Slots vides pour compléter (Total 6 slots incluant Non classées) */}
                  {renderEmptySlots(
                    Math.max(0, 5 - getAlbums("classpapiers", "standard").filter(a => a.type !== "unclassified" && a.title !== "Non classées").length), 
                    getAlbums("classpapiers", "standard").filter(a => a.type !== "unclassified" && a.title !== "Non classées").length + 1
                  )}
                </div>
              </Card>

              {/* Colonne Albums sécurisés (ClassPapiers) - Visible uniquement en mode Admin */}
              {isAuthenticated && (
                <Card className={`w-64 p-3 shadow-lg rounded-xl transition-all ${
                  activeSection?.series === 'classpapiers' && activeSection?.type === 'secure'
                    ? 'bg-red-50/80 border-2 border-red-400'
                    : 'bg-white/90 border-2 border-gray-200'
                }`}>
                  <div className={`border-2 rounded-lg py-1 px-2 mb-3 text-center font-bold text-base shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeSection?.series === 'classpapiers' && activeSection?.type === 'secure'
                      ? 'bg-red-100 border-red-500 text-red-800'
                      : 'bg-white border-black hover:bg-red-50'
                  }`}
                  onClick={() => setActiveSection({ series: 'classpapiers', type: 'secure' })}
                  >
                    <Lock className="w-4 h-4" />
                    {language === "fr" ? "Albums sécurisés" : "Secure albums"}
                  </div>
                  
                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {/* Liste des albums sécurisés (ClassPapiers) */}
                    {getAlbums("classpapiers", "secure")
                      .map((album, i) => (
                        <AlbumSlot 
                          key={album.id} 
                          index={i + 1} 
                          album={album} 
                          isSelected={selectedAlbumId === album.id}
                          onClick={() => handleAlbumClick(album)}
                          onDelete={() => {
                            setAlbumToDelete(album.id);
                            setShowDeleteConfirm(true);
                          }}
                          isSecure={true}
                        />
                    ))}

                    {/* Slots vides */}
                    {renderEmptySlots(
                      Math.max(0, 6 - getAlbums("classpapiers", "secure").length), 
                      getAlbums("classpapiers", "secure").length + 1
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>

        </div>

        {/* Boutons Footer */}
        <div className="absolute bottom-0 right-8 translate-y-1/2">
          {localStorage.getItem("duoclass_quit_confirm_disabled") === "true" ? (
            <Button 
              variant="ghost" 
              className="text-xl font-bold text-black hover:bg-transparent hover:scale-105 transition-transform"
              onClick={() => window.close()}
            >
              Quitter
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-xl font-bold text-black hover:bg-transparent hover:scale-105 transition-transform"
                >
                  Quitter
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{language === "fr" ? "Êtes-vous sûr de vouloir quitter ?" : "Are you sure you want to leave?"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vous allez quitter l'application.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-center space-x-2 py-4">
                  <Checkbox 
                    id="dont-ask-home" 
                    checked={dontAskAgain}
                    onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
                  />
                  <label
                    htmlFor="dont-ask-home"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Ne plus demander
                  </label>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{language === 'fr' ? 'Annuler' : 'Cancel'}</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmQuit}>{language === 'fr' ? 'Confirmer' : 'Confirm'}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Modale de mot de passe pour album sécurisé */}
        <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{language === "fr" ? "Album Sécurisé" : "Secure Album"}</DialogTitle>
              <DialogDescription>
                {language === "fr" ? <>Veuillez entrer votre <strong>Code Maître</strong> pour accéder à cet album.</> : <>Please enter your <strong>Master Code</strong> to access this album.</>}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  {language === "fr" ? "Code Maître" : "Master Code"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  className="col-span-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ex: 000000"
                  onKeyDown={(e) => e.key === 'Enter' && handleSecureAccess()}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleSecureAccess}>{language === "fr" ? "Valider" : "Validate"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Modale de déverrouillage global (Mode Admin) */}
      <Dialog open={showAdminUnlockModal} onOpenChange={setShowAdminUnlockModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              {language === "fr" ? "Mode Administrateur" : "Administrator Mode"}
            </DialogTitle>
            <DialogDescription>
              {language === "fr" ? "Saisissez le code maître pour déverrouiller les albums sécurisés et les paramètres." : "Enter the master code to unlock secure albums and settings."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-code">{language === "fr" ? "Code Maître" : "Master Code"}</Label>
              <Input
                id="admin-code"
                type="password"
                value={adminUnlockPassword}
                onChange={(e) => setAdminUnlockPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminUnlock()}
                placeholder="••••••"
                className="text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminUnlockModal(false)}>{language === "fr" ? "Annuler" : "Cancel"}</Button>
            <Button onClick={handleAdminUnlock} className="bg-purple-600 hover:bg-purple-700">{language === "fr" ? "Déverrouiller" : "Unlock"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale de confirmation de suppression */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">{language === "fr" ? "Supprimer l'album" : "Delete album"}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p className="text-gray-700 font-medium">
                  {language === "fr" ? "Attention : La suppression entraînera la disparition de toutes les photos/documents contenus dans cet album." : "Warning: Deletion will remove all photos/documents in this album."}
                </p>
                <p>
                  {language === "fr" ? "Cette action est irréversible. Seul l'administrateur peut supprimer un album." : "This action is irreversible. Only the administrator can delete an album."}
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              
              {/* Si c'est un album sécurisé et qu'on n'est PAS en mode Admin, on demande le Code Maître */}
              {albumToDelete && albums.find(a => a.id === albumToDelete)?.type === "secure" && !isAuthenticated && (
                <div className="grid gap-2">
                  <Label htmlFor="delete-password">{language === "fr" ? "Code Maître requis :" : "Master Code required:"}</Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder={language === "fr" ? "Code Maître" : "Master Code"}
                  />
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>{language === "fr" ? "Annuler" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAlbum} className="bg-red-600 hover:bg-red-700">{language === "fr" ? "Supprimer définitivement" : "Delete permanently"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>

    </MainLayout>
  );
}
