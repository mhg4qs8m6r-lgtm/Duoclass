import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { db, AlbumMeta, getAllCreationsProjects, deleteCreationsProject, CreationsProject } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/MainLayout';
import AlbumCreationQuestionnaire from '@/components/AlbumCreationQuestionnaire';
import CreationsAtelierV2 from '@/components/creations/CreationsAtelierV2';
import { useLanguage } from '@/contexts/LanguageContext';

// Albums Créations à créer dans IndexedDB s'ils n'existent pas encore
const CREATIONS_ALBUMS_DEFAULTS: { id: string; title: string }[] = [
  { id: 'album_creations_bordures', title: 'Bordures' },
  { id: 'album_creations_cadres', title: 'Cadres' },
  { id: 'album_creations_filets', title: 'Filets' },
];

export default function Atelier() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [showCreationsModal, setShowCreationsModal] = useState(false);
  const [creationsProjectId, setCreationsProjectId] = useState<string | undefined>(undefined);
  const [creationsProjectName, setCreationsProjectName] = useState<string>("Nouveau projet");

  const [selectedCategory, setSelectedCategory] = useState<string | null>('cat_mes_projets');
  const [selectedProjectCategory, setSelectedProjectCategory] = useState<'en_cours' | 'finis' | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<CreationsProject | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);

  // Récupérer les catégories et albums depuis IndexedDB
  const categories = useLiveQuery(() => db.categories.toArray());
  const albums = useLiveQuery(() => db.album_metas.toArray());

  // Récupérer les projets créations
  const creationsProjects = useLiveQuery(() => getAllCreationsProjects(), []) || [];

  // Créer les albums manquants au montage
  useEffect(() => {
    (async () => {
      for (const def of CREATIONS_ALBUMS_DEFAULTS) {
        const exists = await db.album_metas.get(def.id);
        if (!exists) {
          await db.album_metas.put({
            id: def.id,
            title: def.title,
            type: 'standard',
            series: 'photoclass',
            createdAt: Date.now(),
            categoryId: 'cat_creations',
          });
        }
      }
    })();
  }, []);

  // Catégories de l'Atelier : "Images projets" (cat_mes_projets) uniquement
  // (CRÉATIONS est désormais accessible depuis Albums)
  const atelierCategories = (categories || []).filter(c => {
    if (c.id === 'cat_mes_projets') return true;
    return false;
  });

  // Traduire les labels de catégories
  const translateLabel = (label: string): string => {
    const normalized = label.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes('MES PROJETS')) {
      return language === 'fr' ? 'Images projets' : 'Project Images';
    }
    if (normalized.includes('CREATIONS') || normalized.includes('CRÉATIONS')) {
      return language === 'fr' ? 'Créations' : 'Creations';
    }
    if (language === 'en') {
      if (normalized === 'NON CLASSEE' || normalized === 'NON CLASSEES') return 'UNCATEGORIZED';
      return label;
    }
    return label;
  };

  // Albums de la catégorie sélectionnée
  const displayedAlbums = selectedCategory
    ? (albums || []).filter(a => a.categoryId === selectedCategory)
    : [];

  // Compter les albums par catégorie
  const getAlbumCount = (categoryId: string) => {
    return (albums || []).filter(a => a.categoryId === categoryId).length;
  };

  // Ouvrir un album
  const handleOpenAlbum = (album: AlbumMeta) => {
    setLocation(`/photoclass/${album.id}`);
  };

  // Supprimer un projet créations
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteCreationsProject(projectToDelete.id);
      toast.success(language === 'fr' ? 'Projet supprimé' : 'Project deleted');
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la suppression' : 'Delete error');
    }
    setProjectToDelete(null);
  };

  // Supprimer une catégorie et ses albums associés
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      // Supprimer les albums de cette catégorie
      const albumsToDelete = (albums || []).filter(a => a.categoryId === categoryToDelete.id);
      for (const album of albumsToDelete) {
        await db.album_metas.delete(album.id);
      }
      // Supprimer la catégorie
      await db.categories.delete(categoryToDelete.id);
      // Réinitialiser la sélection si c'était la catégorie sélectionnée
      if (selectedCategory === categoryToDelete.id) {
        setSelectedCategory(null);
      }
      toast.success(language === 'fr' ? 'Catégorie supprimée' : 'Category deleted');
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la suppression' : 'Delete error');
    }
    setCategoryToDelete(null);
  };

  return (
    <MainLayout title={language === 'fr' ? 'Atelier' : 'Workshop'}>
      {/* Bandeau Atelier */}
      <div className="bg-emerald-500 text-white flex items-center justify-end gap-3 py-2 px-4 text-sm font-medium -mx-6 -mt-6 mb-4">
        {showCreationForm && (
          <button
            className="bg-white text-emerald-700 hover:bg-emerald-100 font-semibold py-1.5 px-4 rounded transition-colors text-sm"
            onClick={() => setShowCreationForm(false)}
          >
            ← {language === 'fr' ? 'Retour' : 'Back'}
          </button>
        )}
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-1.5 px-4 rounded transition-colors text-sm"
          onClick={() => setShowCreationForm(true)}
        >
          + {language === 'fr' ? "Créer un nouveau projet" : "Create a new project"}
        </button>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto">
        {showCreationForm ? (
          <div className="p-6 h-full">
            <AlbumCreationQuestionnaire onAlbumCreated={() => setShowCreationForm(false)} mode="atelier" />
          </div>
        ) : (
          /* 4 colonnes : Catégorie | Projets (finis) | Catégorie | Projets (liste) */
          <div className="grid grid-cols-4 gap-0" style={{ width: '100%' }}>

            {/* Colonne 1 — Catégorie (Projets finis) */}
            <div className="p-3 min-w-0">
              <h2 className="text-base font-medium mb-3 text-gray-800 border-b pb-2 text-center">
                {language === 'fr' ? 'Catégorie' : 'Category'}
              </h2>
              <div className="space-y-2 flex flex-col items-center">
                <div
                  onClick={() => setSelectedCategory('cat_mes_projets')}
                  className={`w-full max-w-[180px] rounded-lg cursor-pointer transition-all duration-200 px-3 py-1.5 flex items-center h-10 ${
                    selectedCategory === 'cat_mes_projets'
                      ? 'bg-purple-100 border-2 border-purple-400'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span className="font-normal text-gray-800 text-sm flex-1 break-words">
                    {language === 'fr' ? 'Projets finis' : 'Finished projects'}
                  </span>
                </div>
              </div>
            </div>

            {/* Colonne 2 — Projets (Images projets / albums) */}
            <div className="p-3 min-w-0 border-l">
              <h2 className="text-base font-medium mb-3 text-gray-800 border-b pb-2 text-center">
                {language === 'fr' ? 'Projets' : 'Projects'}
              </h2>
              <div className="space-y-2 flex flex-col items-center">
                {/* Images projets (albums de cat_mes_projets) */}
                {selectedCategory === 'cat_mes_projets' ? (
                  displayedAlbums.length === 0 ? (
                    <div className="w-full max-w-[180px] rounded-lg px-3 py-1.5 flex items-center h-10 bg-gray-50 border border-gray-200">
                      <span className="font-normal text-gray-800 text-sm flex-1 break-words">
                        {language === 'fr' ? 'Images projets' : 'Project images'}
                      </span>
                    </div>
                  ) : (
                    displayedAlbums.map(album => (
                      <div
                        key={album.id}
                        onClick={() => handleOpenAlbum(album)}
                        className="w-full max-w-[180px] rounded-lg cursor-pointer transition-all duration-200 px-2 py-1.5 flex items-center gap-2 h-10 bg-purple-50 hover:bg-purple-100 border border-purple-200"
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <span className="font-normal text-gray-800 text-sm break-words flex-1">{album.title}</span>
                      </div>
                    ))
                  )
                ) : (
                  <p className="text-gray-400 text-center py-4 text-sm">
                    {language === 'fr' ? 'Sélectionnez une catégorie' : 'Select a category'}
                  </p>
                )}
              </div>
            </div>

            {/* Colonne 3 — Catégorie (Projets en cours / Projets finis) */}
            <div className="p-3 min-w-0 border-l">
              <h2 className="text-base font-medium mb-3 text-gray-800 border-b pb-2 text-center">
                {language === 'fr' ? 'Catégorie' : 'Category'}
              </h2>
              <div className="space-y-2 flex flex-col items-center">
                <div
                  onClick={() => setSelectedProjectCategory('en_cours')}
                  className={`w-full max-w-[180px] rounded-lg cursor-pointer transition-all duration-200 px-2 py-1.5 flex items-center gap-2 h-10 ${
                    selectedProjectCategory === 'en_cours'
                      ? 'bg-purple-100 border-2 border-purple-400'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: '#8B5CF6',
                      backgroundColor: selectedProjectCategory === 'en_cours' ? '#8B5CF6' : 'transparent'
                    }}
                  >
                    {selectedProjectCategory === 'en_cours' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-normal text-gray-800 text-sm flex-1 break-words">
                    {language === 'fr' ? 'Projets en cours' : 'Current projects'}
                    <span className="text-gray-400 ml-1">({creationsProjects.filter(p => (p.projectCategory || 'en_cours') === 'en_cours').length})</span>
                  </span>
                </div>
                <div
                  onClick={() => setSelectedProjectCategory('finis')}
                  className={`w-full max-w-[180px] rounded-lg cursor-pointer transition-all duration-200 px-2 py-1.5 flex items-center gap-2 h-10 ${
                    selectedProjectCategory === 'finis'
                      ? 'bg-purple-100 border-2 border-purple-400'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: '#8B5CF6',
                      backgroundColor: selectedProjectCategory === 'finis' ? '#8B5CF6' : 'transparent'
                    }}
                  >
                    {selectedProjectCategory === 'finis' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-normal text-gray-800 text-sm flex-1 break-words">
                    {language === 'fr' ? 'Projets finis' : 'Finished projects'}
                    <span className="text-gray-400 ml-1">({creationsProjects.filter(p => p.projectCategory === 'finis').length})</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Colonne 4 — Projets (liste) */}
            <div className="p-3 min-w-0 border-l">
              <h2 className="text-base font-medium mb-3 text-gray-800 border-b pb-2 text-center">
                {language === 'fr' ? 'Projets' : 'Projects'}
              </h2>
              <div className="space-y-2 flex flex-col items-center">
                {!selectedProjectCategory ? (
                  <p className="text-gray-400 text-center py-4 text-sm">
                    {language === 'fr' ? 'Sélectionnez une catégorie' : 'Select a category'}
                  </p>
                ) : (() => {
                  const filteredProjects = creationsProjects.filter(p =>
                    (p.projectCategory || 'en_cours') === selectedProjectCategory
                  );
                  return filteredProjects.length === 0 ? (
                    <p className="text-gray-400 text-center py-4 text-sm">
                      {language === 'fr' ? 'Aucun projet' : 'No project'}
                    </p>
                  ) : (
                    filteredProjects.map(project => (
                      <div
                        key={project.id}
                        onClick={() => {
                          setCreationsProjectId(project.id);
                          setCreationsProjectName(project.name);
                          setShowCreationsModal(true);
                        }}
                        className="w-full max-w-[180px] rounded-lg cursor-pointer transition-all duration-200 px-2 py-1.5 flex items-center gap-2 h-10 bg-purple-50 hover:bg-purple-100 border border-purple-200"
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <span className="font-normal text-gray-800 text-sm break-words flex-1">{project.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project);
                          }}
                          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          title={language === 'fr' ? 'Supprimer le projet' : 'Delete project'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  );
                })()}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 size={24} />
              {t('common.delete')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {language === 'fr'
                ? `Supprimer le projet « ${projectToDelete?.name} » ?`
                : `Delete project "${projectToDelete?.name}"?`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setProjectToDelete(null)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleDeleteProject}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression de catégorie */}
      <Dialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 size={24} />
              {t('common.delete')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {language === 'fr'
                ? `Supprimer la catégorie « ${categoryToDelete ? translateLabel(categoryToDelete.label) : ''} » et tous ses albums ?`
                : `Delete category "${categoryToDelete ? translateLabel(categoryToDelete.label) : ''}" and all its albums?`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCategoryToDelete(null)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleDeleteCategory}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODALE CRÉATIONS / ATELIER */}
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
          console.log('[Atelier] Sauvegarde du projet:', projectData);
        }}
      />
    </MainLayout>
  );
}
