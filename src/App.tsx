import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import PhotoClass from "./pages/PhotoClass";
import Layout, { DisplayMode } from "./components/Layout";
import { useState, useEffect } from "react";
import Paiement from "@/pages/Paiement";
import PaiementSucces from "@/pages/PaiementSucces";
import Parametres from "@/pages/Parametres";
import Utilitaires from "@/pages/Utilitaires";
import Albums from "@/pages/Albums";
import AlbumsPrives from "@/pages/AlbumsPrives";
import Themes from "@/pages/Themes";
import Aide from "@/pages/Aide";
import Landing from "@/pages/Landing";
import AdminLicenses from "@/pages/AdminLicenses";
import MesLicences from "@/pages/MesLicences";
import CGU from "@/pages/CGU";
import MentionsLegales from "@/pages/MentionsLegales";
import PolitiqueConfidentialite from "@/pages/PolitiqueConfidentialite";
import Retractation from "@/pages/Retractation";
import Login from "@/pages/Login";
import { initCategories, db, AlbumMeta } from "./db";
import { cleanupAllExceptNonClassee } from "./lib/cleanupCategories";

function Router() {
  const [zoomLevel, setZoomLevel] = useState(0);
  const [toolbarAction, setToolbarAction] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("Album");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("normal");

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/accueil" component={() => { window.location.href = '/albums'; return null; }} />
      <Route path="/photoclass">
        <Layout 
          title={pageTitle} 
          zoomLevel={zoomLevel} 
          setZoomLevel={setZoomLevel}
          onToolbarAction={setToolbarAction}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        >
          <PhotoClass 
            zoomLevel={zoomLevel} 
            setZoomLevel={setZoomLevel}
            toolbarAction={toolbarAction}
            resetToolbarAction={() => setToolbarAction(null)}
            onTitleChange={setPageTitle}
            displayMode={displayMode}
          />
        </Layout>
      </Route>
      <Route path="/photoclass/:albumId">
        {(params) => (
          <Layout 
            title={pageTitle} 
            zoomLevel={zoomLevel} 
            setZoomLevel={setZoomLevel}
            onToolbarAction={setToolbarAction}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            currentAlbumId={params.albumId}
          >
            <PhotoClass 
              zoomLevel={zoomLevel} 
              setZoomLevel={setZoomLevel}
              toolbarAction={toolbarAction}
              resetToolbarAction={() => setToolbarAction(null)}
              onTitleChange={setPageTitle}
              displayMode={displayMode}
            />
          </Layout>
        )}
      </Route>
      <Route path="/workspace" component={Home} />
      
      {/* Routes principales */}
      <Route path="/paiement" component={Paiement} />
      <Route path="/paiement/succes" component={PaiementSucces} />
      <Route path="/parametres" component={Parametres} />
      <Route path="/utilitaires" component={Utilitaires} />
      <Route path="/albums" component={Albums} />
      <Route path="/albums-prives" component={AlbumsPrives} />
      <Route path="/themes" component={Themes} />
      <Route path="/aide" component={Aide} />
      <Route path="/admin/licenses" component={AdminLicenses} />
      <Route path="/mes-licences" component={MesLicences} />
      
      {/* Pages légales */}
      <Route path="/cgu" component={CGU} />
      <Route path="/mentions-legales" component={MentionsLegales} />
      <Route path="/politique-confidentialite" component={PolitiqueConfidentialite} />
      <Route path="/retractation" component={Retractation} />
      <Route path="/404" component={NotFound} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

const initDefaultAlbums = async () => {
  const albums = await db.album_metas.toArray();
  
  const hasPhotoClassDefault = albums.some(a => a.categoryId === 'cat_nc_photos' && a.type === 'standard');
  const hasClassPapiersDefault = albums.some(a => a.categoryId === 'cat_nc_docs' && a.type === 'standard');
  
  if (!hasPhotoClassDefault) {
    const photoClassAlbum: AlbumMeta = {
      id: 'album_nc_photos_default',
      title: 'Non classées',
      type: 'standard',
      series: 'photoclass',
      createdAt: Date.now(),
      categoryId: 'cat_nc_photos'
    };
    const existing = await db.album_metas.get('album_nc_photos_default');
    if (!existing) {
      await db.album_metas.add(photoClassAlbum);
      await db.albums.add({ id: photoClassAlbum.id, frames: [], updatedAt: Date.now() });
    }
  }
  
  if (!hasClassPapiersDefault) {
    const classPapiersAlbum: AlbumMeta = {
      id: 'album_nc_docs_default',
      title: 'Non classées',
      type: 'standard',
      series: 'classpapiers',
      createdAt: Date.now(),
      categoryId: 'cat_nc_docs'
    };
    const existing = await db.album_metas.get('album_nc_docs_default');
    if (!existing) {
      await db.album_metas.add(classPapiersAlbum);
      await db.albums.add({ id: classPapiersAlbum.id, frames: [], updatedAt: Date.now() });
    }
  }
  
  const allAlbums = await db.album_metas.toArray();
  const duplicatePhotoAlbums = allAlbums.filter(a => 
    a.title === 'Non classées' && 
    a.series === 'photoclass' && 
    a.type === 'standard' &&
    a.id !== 'album_nc_photos_default'
  );
  const duplicateDocAlbums = allAlbums.filter(a => 
    a.title === 'Non classées' && 
    a.series === 'classpapiers' && 
    a.type === 'standard' &&
    a.id !== 'album_nc_docs_default'
  );
  
  for (const dup of [...duplicatePhotoAlbums, ...duplicateDocAlbums]) {
    await db.album_metas.delete(dup.id);
    await db.albums.delete(dup.id);
  }
};

function App() {
  useEffect(() => {
    initCategories()
      .then(() => cleanupAllExceptNonClassee())
      .then(() => initDefaultAlbums());
  }, []);

  return (
    <ErrorBoundary>
      <LanguageProvider>
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster position="top-center" toastOptions={{ style: { marginTop: '50px' } }} />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
