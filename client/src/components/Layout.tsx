import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Search,
  Home,
  Image as ImageIcon,
  FileText,
  Settings,
  Wrench,
  Camera,
  Smartphone,
  Lock,
  Unlock,
  LogOut
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import TrialBanner from "@/components/TrialBanner";
import InstallPWA from "@/components/InstallPWA";
import HelpPanel from "@/components/HelpPanel";

// Définition des actions possibles de la toolbar
export type ToolbarAction = 
  | "importer" 
  | "ajouter" 
  | "classer" 
  | "supprimer" 
  | "retouches" 
  | "convertir" 
  | "exporter" 
  | "imprimer"
  | "diaporama"
  | "creations";

// Mode d'affichage des vignettes
export type DisplayMode = "normal" | "half" | "twothirds";

// Labels pour les modes d'affichage
export const displayModeLabels = (lang: string = 'fr'): Record<DisplayMode, string> => ({
  normal: "Normal",
  half: lang === 'fr' ? "Vignette 1/2" : "Thumbnail 1/2",
  twothirds: lang === 'fr' ? "Vignette 2/3" : "Thumbnail 2/3"
});

// Facteurs de réduction pour chaque mode
export const displayModeFactors: Record<DisplayMode, number> = {
  normal: 1,
  half: 0.5,
  twothirds: 2/3
};

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  activeSeries?: "photoclass" | "classpapiers" | null;
  // Callback pour notifier le parent (la page) qu'une action a été cliquée
  onToolbarAction?: (action: ToolbarAction | string | null) => void;
  // Callback pour le changement de zoom
  onZoomChange?: (value: number | number[]) => void;
  // Valeur actuelle du zoom (contrôlée par la page si nécessaire)
  zoomValue?: number | number[];
  // Props supplémentaires pour la compatibilité
  setZoomLevel?: (level: number) => void;
  zoomLevel?: number;
  hiddenActions?: ToolbarAction[];
  // Actions désactivées (affichées en grisé avec tooltip)
  disabledActions?: { action: ToolbarAction; tooltip: string }[];
  // Mode d'affichage des vignettes
  displayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  // Classe CSS supplémentaire pour le conteneur de contenu
  className?: string;
  // ID de l'album actuellement sélectionné (pour filtrer le panier)
  currentAlbumId?: string;
}

export default function Layout(props: LayoutProps) {
  const { 
    children, 
    title, 
    activeSeries,
    onToolbarAction,
    onZoomChange,
    zoomValue,
    hiddenActions = [],
    disabledActions = [],
    displayMode = "normal",
    onDisplayModeChange,
    className,
    currentAlbumId
  } = props;
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { t, language } = useLanguage();
  // État local du zoom si non contrôlé par le parent
  const [localZoom, setLocalZoom] = useState([0]);
  
  // État pour le panneau d'aide contextuelle
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // States pour les couleurs personnalisées (réactifs aux changements)
  const [customColors, setCustomColors] = useState({
    bgColor: localStorage.getItem('custom_color_background'),
    textColor: localStorage.getItem('custom_color_text'),
    borderColor: localStorage.getItem('custom_color_lines'),
    sidebarColor: localStorage.getItem('custom_color_sidebar'),
    sidebarTextColor: localStorage.getItem('custom_color_sidebar_text'),
    bgTexture: localStorage.getItem('custom_background_texture'),
    workareaColor: localStorage.getItem('custom_workarea_color'),
  });
  
  // Écouter les changements de localStorage (pour mise à jour en temps réel)
  useEffect(() => {
    const handleStorageChange = () => {
      setCustomColors({
        bgColor: localStorage.getItem('custom_color_background'),
        textColor: localStorage.getItem('custom_color_text'),
        borderColor: localStorage.getItem('custom_color_lines'),
        sidebarColor: localStorage.getItem('custom_color_sidebar'),
        sidebarTextColor: localStorage.getItem('custom_color_sidebar_text'),
        bgTexture: localStorage.getItem('custom_background_texture'),
        workareaColor: localStorage.getItem('custom_workarea_color'),
      });
    };
    
    // Écouter l'événement storage (pour les changements depuis d'autres onglets)
    window.addEventListener('storage', handleStorageChange);
    
    // Écouter un événement personnalisé pour les changements dans le même onglet
    window.addEventListener('themeChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChanged', handleStorageChange);
    };
  }, []);
  
  // Normalisation du zoomValue pour le Slider (qui attend un tableau)
  // Si zoomValue est fourni (contrôlé), on l'utilise, sinon on utilise localZoom
  const currentZoom = zoomValue !== undefined 
    ? (Array.isArray(zoomValue) ? zoomValue : [zoomValue]) 
    : localZoom;

  const handleZoomChange = (val: number[]) => {
    setLocalZoom(val);
    if (onZoomChange) onZoomChange(val[0]);
    // Support pour setZoomLevel passé directement
    // @ts-ignore
    if (props.setZoomLevel) props.setZoomLevel(val[0]);
  };

  // Appliquer les couleurs personnalisées au chargement
  useEffect(() => {
    const colorLines = localStorage.getItem('custom_color_lines');
    const colorBackground = localStorage.getItem('custom_color_background');
    const colorText = localStorage.getItem('custom_color_text');
    const colorSidebar = localStorage.getItem('custom_color_sidebar');
    const colorSidebarText = localStorage.getItem('custom_color_sidebar_text');
    const backgroundTexture = localStorage.getItem('custom_background_texture');
    const workareaColor = localStorage.getItem('custom_workarea_color');
    
    if (colorLines) {
      document.documentElement.style.setProperty('--custom-border-color', colorLines);
    }
    if (colorBackground) {
      document.documentElement.style.setProperty('--custom-bg-color', colorBackground);
    }
    if (colorText) {
      document.documentElement.style.setProperty('--custom-text-color', colorText);
    }
    if (colorSidebar) {
      document.documentElement.style.setProperty('--custom-sidebar-color', colorSidebar);
    }
    if (colorSidebarText) {
      document.documentElement.style.setProperty('--custom-sidebar-text-color', colorSidebarText);
    }
    if (backgroundTexture) {
      document.documentElement.style.setProperty('--custom-bg-texture', `url(${backgroundTexture})`);
    }
    if (workareaColor) {
      document.documentElement.style.setProperty('--custom-workarea-color', workareaColor);
    }
  }, []);

  // Utiliser les couleurs du state (réactif)
  const customBgColor = customColors.bgColor;
  const customTextColor = customColors.textColor;
  const customBorderColor = customColors.borderColor;
  const customSidebarColor = customColors.sidebarColor;
  const customSidebarTextColor = customColors.sidebarTextColor;
  const customBgTexture = customColors.bgTexture;
  const customWorkareaColor = customColors.workareaColor;

  // Sidebar navigation items (traduits)
  const sidebarItems = [
    { id: "albums", label: t('sidebar.albums'), icon: ImageIcon, path: "/albums", img: "/assets/icons/sidebar/PhotoClass.png" },
    { id: "albums-prives", label: t('sidebar.privateAlbums'), icon: Lock, path: "/albums-prives", img: "/assets/icons/sidebar/PhotoClass.png" },
    { id: "parametres", label: t('sidebar.settings'), icon: Settings, path: "/parametres", img: "/assets/icons/sidebar/parametres.png" },
    { id: "themes", label: t('sidebar.themes'), icon: Settings, path: "/themes", img: "/assets/icons/sidebar/parametres.png" },
    { id: "aide", label: t('sidebar.help'), icon: Wrench, path: "/aide", img: "/assets/icons/sidebar/Utilitaires.png" },
    { id: "utilitaires", label: t('sidebar.utilities'), icon: Wrench, path: "/utilitaires", img: "/assets/icons/sidebar/Utilitaires.png" },
  ];

  // Toolbar items (traduits)
  const toolbarItems: { id: ToolbarAction, label: string, sublabel?: string, tooltip?: string }[] = [
    { id: "importer", label: t('toolbar.import'), sublabel: t('toolbar.add') },
    { id: "supprimer", label: t('toolbar.delete') },
    { id: "retouches", label: t('toolbar.photoEdit') },
    { id: "creations", label: t('toolbar.creations') },
    { id: "convertir", label: t('toolbar.convert') },
    { id: "exporter", label: t('toolbar.email') },
    { id: "imprimer", label: t('toolbar.print') },
    { id: "diaporama", label: t('toolbar.slideshow') },
  ];

  return (
    <div 
      data-outer-container
      className="flex items-center justify-center min-h-screen p-5 font-sans"
      style={{ 
        backgroundColor: customBgColor || '#f3f4f6',
        backgroundImage: customBgTexture ? `url(${customBgTexture})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat'
      }}
    >
      {/* Main App Window - Resizable */}
      <div 
        data-main-window
        className="w-[1400px] h-[800px] min-w-[1024px] min-h-[600px] rounded-xl shadow-2xl overflow-auto flex flex-col relative resize"
        style={{ 
          backgroundColor: 'white',
          borderWidth: '4px',
          borderStyle: 'solid',
          borderColor: customBorderColor || '#1d4ed8'
        }}
      >
        
        {/* Header (70px) */}
        <header 
          className="h-[70px] bg-gradient-to-b from-blue-100 to-indigo-100 border-b-2 flex items-center justify-between px-4 shrink-0 relative"
          style={{ borderColor: customBorderColor || '#e5e7eb' }}
        >
          {/* Window Controls & Logo Section (Left) */}
          <div className="flex items-center gap-4 w-[350px]">
            {/* Window Controls (Mac-style) */}
            <div className="flex gap-2 shrink-0">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-600 hover:bg-red-600 cursor-pointer shadow-sm" title={t('common.close')}></div>
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-500 hover:bg-yellow-500 cursor-pointer shadow-sm" title={t('common.minimize')}></div>
              <div className="w-3.5 h-3.5 rounded-full bg-green-500 border border-green-600 hover:bg-green-600 cursor-pointer shadow-sm" title={t('common.maximize')}></div>
            </div>

            <div className="flex items-center gap-3">
              <img 
                src="/assets/logo-duoclass.png" 
                alt="DuoClass Logo" 
                className="w-[55px] h-[55px] object-contain shrink-0"
                draggable={false}
              />
              <div className="flex flex-col">
                <div className="text-xl font-semibold text-blue-700 leading-tight">DuoClass</div>
                <div className="text-[10px] text-gray-600 font-light whitespace-nowrap">{t('app.subtitle')}</div>
              </div>
            </div>
          </div>

          {/* Center Title */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <div className="bg-white px-8 py-1 shadow-sm min-w-[200px] text-center relative">
              <h1 className="text-3xl font-bold text-[#00AEEF] whitespace-nowrap">
                {location.startsWith('/photoclass') ? 'PhotoClass' : 
                 location.startsWith('/classpapiers') ? 'Documents' : 
                 title}
              </h1>
              {/* Indicateur Admin supprimé du titre */}
            </div>
          </div>

          {/* Right Section: Admin + Help + Avatar + Language */}
          <div className="flex items-center gap-3 w-[350px] justify-end">
            {/* Indicateur utilisateur + Bouton Déconnexion */}
            {isAuthenticated && (
              <div className={`flex items-center gap-2 mr-1 px-4 py-2 rounded-full shadow-sm ${
                user?.role === 'admin'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                {user?.role === 'admin' && (
                  <div className="flex items-center gap-1" title={t('common.adminMode')}>
                    <Unlock className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Admin</span>
                    <div className="h-4 w-px bg-green-300 mx-1"></div>
                  </div>
                )}
                {user?.name && (
                  <span className="text-xs font-medium text-gray-600 max-w-[100px] truncate">{user.name}</span>
                )}
                <button
                  onClick={logout}
                  className="w-[24px] h-[24px] bg-red-100 border border-red-300 rounded-full flex items-center justify-center shadow-sm hover:bg-red-200 hover:shadow-md transition-all"
                  title={language === 'fr' ? 'Se déconnecter' : 'Log out'}
                >
                  <LogOut className="w-3 h-3 text-red-600" />
                </button>
              </div>
            )}

            {/* Help Button */}
            <button 
              className="w-[40px] h-[40px] bg-[#90EE90] rounded-full flex items-center justify-center shadow-sm hover:bg-[#7FD87F] hover:shadow-md transition-all"
              title={t('common.help')}
              onClick={() => setIsHelpOpen(true)}
            >
              <span className="text-lg">👍</span>
            </button>

            {/* Avatar */}
            <div 
              className="w-[50px] h-[50px] bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:border-primary hover:shadow-md transition-all cursor-pointer shrink-0 overflow-hidden"
              style={{
                backgroundImage: localStorage.getItem('user_avatar') ? `url(${localStorage.getItem('user_avatar')})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!localStorage.getItem('user_avatar') && (
                <span className="text-xs font-medium text-gray-600">Avatar</span>
              )}
            </div>

            {/* Bouton Installer PWA */}
            <InstallPWA />

            {/* Language Selector - à l'extrême droite */}
            <LanguageSelector />
          </div>
        </header>

        {/* Trial Banner - Affichée uniquement pendant la période d'essai */}
        <TrialBanner />

        {/* Toolbar (50px) */}
        <div 
          className="h-[50px] bg-white border-b-2 flex items-center justify-around px-4 gap-2 shrink-0"
          style={{ borderColor: customBorderColor || '#e5e7eb' }}
        >
          {/* Mode Affichage Button */}
          <div className="relative group">
            <button 
              className="flex flex-col items-center justify-center px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-all active:translate-y-[1px] min-w-[70px]"
            >
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                {t('toolbar.display')}
              </span>
              <span className="text-[10px] font-medium text-gray-500 text-center leading-tight">
                {displayModeLabels(language)[displayMode]}
              </span>
            </button>
            {/* Menu déroulant */}
            <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[120px]">
              {(Object.keys(displayModeLabels(language)) as DisplayMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onDisplayModeChange && onDisplayModeChange(mode)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors first:rounded-t-md last:rounded-b-md ${
                    displayMode === mode ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  {displayModeLabels(language)[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Size Slider Button */}
          <div className="flex flex-row items-center gap-2 border-2 border-gray-300 rounded-lg px-3 py-1 bg-gray-50 min-w-[120px]">
            <div className="flex flex-col items-center justify-center w-full">
              <span className="text-xs font-semibold text-gray-700 leading-none mb-1">{t('toolbar.size')}</span>
              <Slider 
                defaultValue={[0]} 
                max={100} 
                min={0} 
                step={10} 
                value={currentZoom}
                onValueChange={handleZoomChange}
                className="w-[60px] h-2 cursor-pointer"
                inverted={false} // Direction normale : gauche = petit (0), droite = grand (100)
              />
            </div>
          </div>

          {/* Other Toolbar Buttons */}
          {toolbarItems.filter(item => !hiddenActions.includes(item.id)).map((item) => {
            // Vérifier si l'action est désactivée
            const disabledInfo = disabledActions.find(d => d.action === item.id);
            const isDisabled = !!disabledInfo;
            
            const buttonContent = (
              <button 
                onClick={() => !isDisabled && onToolbarAction && onToolbarAction(item.id)}
                className={`flex flex-col items-center justify-center px-4 py-3 transition-all min-w-[80px] min-h-[48px] touch-manipulation ${
                  isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:bg-blue-50 hover:text-blue-700 rounded-md active:translate-y-[1px]'
                }`}
                disabled={isDisabled}
              >
                <span className={`text-xs font-semibold text-center leading-tight ${
                  isDisabled ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className={`text-[10px] font-medium text-center leading-tight ${
                    isDisabled ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {item.sublabel}
                  </span>
                )}
              </button>
            );
            
            // Si désactivé, envelopper avec Tooltip de shadcn/ui
            if (isDisabled) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      {buttonContent}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-800 text-white border-gray-800">
                    {disabledInfo.tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            // Si l'item a un tooltip d'aide (comme Livre Photo), l'afficher au survol
            if (item.tooltip) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      {buttonContent}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-blue-600 text-white border-blue-600 max-w-[200px] text-center">
                    {item.tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return <div key={item.id}>{buttonContent}</div>;
          })}
          
        </div>

        {/* Main Content Container */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          
          {/* Resize Handle (Visual Only) */}
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 pointer-events-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full text-gray-400">
              <path d="M21 15L15 21M21 8L8 21" />
            </svg>
          </div>

          {/* Sidebar (80px) */}
          <aside 
            className="w-[90px] bg-primary flex flex-col py-2 gap-2 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)] shrink-0 overflow-y-auto no-scrollbar"
            style={{ backgroundColor: customSidebarColor || undefined }}
          >
            {sidebarItems.map((item) => {
              // Détermine si l'élément est actif en fonction de l'URL ou de la série sélectionnée
              // Support des sous-routes (ex: /photoclass/xxx doit activer /photoclass)
              // Correction: on vérifie si location commence par le path de l'item (sauf pour root '/')
              let isActive = false;
              if (item.path === '/') {
                isActive = location === '/';
              } else {
                isActive = location.startsWith(item.path);
              }
              
              // Surcharge pour la page d'accueil si une série est sélectionnée
              if (location === "/" && activeSeries) {
                if (item.id === "photoclass" && activeSeries === "photoclass") isActive = true;
                if (item.id === "classpapiers" && activeSeries === "classpapiers") isActive = true;
                // Désactive l'accueil si une série est active
                if (item.id === "accueil") isActive = false;
              }

              return (
                <Link key={item.id} href={item.path}>
                  <div 
                    className={cn(
                      "w-full min-h-[64px] flex flex-col items-center justify-center px-2 py-4 transition-all border-l-4 border-transparent hover:bg-white/10 hover:border-white cursor-pointer touch-manipulation active:bg-white/20",
                      isActive && "bg-white/20 border-l-yellow-400"
                    )}
                  >
                    <span 
                      className="text-[12px] font-medium text-white text-center leading-tight break-words w-full"
                      style={{ color: customSidebarTextColor || undefined }}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </aside>

          {/* Content Area */}
          <main 
            data-content-area
            className="flex-1 flex flex-col relative overflow-auto min-h-0"
            style={{ 
              color: customTextColor || undefined,
              backgroundColor: customWorkareaColor || 'transparent'
            }}
          >
            {/* Dynamic Content - Allow scrolling for pages that need it, unless no-scroll class is passed */}
            <div
              className={`flex-1 p-6 relative flex flex-col ${className === 'no-scroll' ? '' : 'overflow-auto'}`}
              style={{ 
                color: customTextColor || undefined,
                // Appliquer la couleur de texte à tous les éléments enfants via CSS custom property
                ['--custom-text-color' as string]: customTextColor || 'inherit'
              }}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Panneau d'aide contextuelle */}
      <HelpPanel 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        currentPath={location}
      />
    </div>
  );
}
