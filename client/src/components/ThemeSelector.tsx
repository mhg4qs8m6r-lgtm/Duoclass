/**
 * ThemeSelector - Sélecteur de thèmes pour DuoClass
 * Version: 2.0 - Mise à jour en temps réel sans rechargement
 * Date: 12/01/2026
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";

// Définition des 10 thèmes modernes
export const THEMES = [
  {
    id: 'classique',
    name: 'Classique DuoClass',
    description: 'Professionnel, familier',
    colors: {
      background: '#F3F4F6',
      sidebar: '#3B82F6',
      sidebarText: '#FFFFFF',
      border: '#1D4ED8',
      header: '#DBEAFE',
      text: '#1F2937',
      accent: '#00AEEF',
      workarea: '#FFFFFF',
    },
    preview: ['#3B82F6', '#F3F4F6', '#1D4ED8']
  },
  {
    id: 'nuit-etoilee',
    name: 'Nuit Étoilée',
    description: 'Dark mode élégant',
    colors: {
      background: '#0F172A',
      sidebar: '#1E293B',
      sidebarText: '#F1F5F9',
      border: '#8B5CF6',
      header: '#334155',
      text: '#F1F5F9',
      accent: '#A78BFA',
      workarea: '#1E293B',
    },
    preview: ['#1E293B', '#0F172A', '#8B5CF6']
  },
  {
    id: 'nordique',
    name: 'Nordique Minimaliste',
    description: 'Épuré, scandinave',
    colors: {
      background: '#FAFAFA',
      sidebar: '#475569', // Gris plus foncé pour meilleur contraste
      sidebarText: '#FFFFFF', // Texte blanc pour lisibilité
      border: '#94A3B8',
      header: '#FFFFFF',
      text: '#334155',
      accent: '#0EA5E9',
      workarea: '#FFFFFF',
    },
    preview: ['#475569', '#FAFAFA', '#94A3B8']
  },
  {
    id: 'foret',
    name: 'Forêt Enchantée',
    description: 'Nature, zen',
    colors: {
      background: '#FAF5F0',
      sidebar: '#047857',
      sidebarText: '#FFFFFF',
      border: '#065F46',
      header: '#D1FAE5',
      text: '#14532D',
      accent: '#84CC16',
      workarea: '#F5F5DC', // Beige sable
    },
    preview: ['#047857', '#FAF5F0', '#065F46']
  },
  {
    id: 'ocean',
    name: 'Océan Profond',
    description: 'Calme, inspirant',
    colors: {
      background: '#F0F9FF',
      sidebar: '#0369A1',
      sidebarText: '#FFFFFF',
      border: '#0C4A6E',
      header: '#BAE6FD',
      text: '#0F172A',
      accent: '#14B8A6',
      workarea: '#E0F2FE', // Bleu pastel
    },
    preview: ['#0369A1', '#F0F9FF', '#0C4A6E']
  },
  {
    id: 'soleil',
    name: 'Coucher de Soleil',
    description: 'Chaleureux, créatif',
    colors: {
      background: '#FFF7ED',
      sidebar: '#EA580C',
      sidebarText: '#FFFFFF',
      border: '#C2410C',
      header: '#FFEDD5',
      text: '#431407',
      accent: '#F43F5E',
      workarea: '#FEF3C7', // Jaune pastel
    },
    preview: ['#EA580C', '#FFF7ED', '#C2410C']
  },
  {
    id: 'lavande',
    name: 'Lavande Doux',
    description: 'Élégant, apaisant',
    colors: {
      background: '#FAF5FF',
      sidebar: '#7C3AED',
      sidebarText: '#FFFFFF',
      border: '#5B21B6',
      header: '#EDE9FE',
      text: '#3B0764',
      accent: '#D946EF',
      workarea: '#F3E8FF', // Violet pastel
    },
    preview: ['#7C3AED', '#FAF5FF', '#5B21B6']
  },
  {
    id: 'graphite',
    name: 'Graphite Pro',
    description: 'Professionnel, sobre',
    colors: {
      background: '#F9FAFB',
      sidebar: '#374151',
      sidebarText: '#FFFFFF',
      border: '#1F2937',
      header: '#E5E7EB',
      text: '#111827',
      accent: '#6366F1',
      workarea: '#F3F4F6', // Gris clair
    },
    preview: ['#374151', '#F9FAFB', '#1F2937']
  },
  {
    id: 'rose',
    name: 'Rose Poudré',
    description: 'Doux, moderne',
    colors: {
      background: '#FFF1F2',
      sidebar: '#E11D48',
      sidebarText: '#FFFFFF',
      border: '#BE123C',
      header: '#FFE4E6',
      text: '#4C0519',
      accent: '#FB7185',
      workarea: '#FCE7F3', // Rose pastel
    },
    preview: ['#E11D48', '#FFF1F2', '#BE123C']
  },
  {
    id: 'minuit-dore',
    name: 'Minuit Doré',
    description: 'Dark mode luxe',
    colors: {
      background: '#18181B',
      sidebar: '#27272A',
      sidebarText: '#FAFAF9',
      border: '#B45309',
      header: '#3F3F46',
      text: '#FAFAF9',
      accent: '#F59E0B',
      workarea: '#27272A',
    },
    preview: ['#27272A', '#18181B', '#B45309']
  },
];

// Textures de fond pour la zone extérieure
export const BACKGROUND_TEXTURES = [
  { id: 'none', name: 'Aucune', description: 'Couleur unie', image: null },
  { id: 'cuir-marron', name: 'Cuir Marron', description: 'Texture cuir classique', image: '/images/textures/cuir-marron.jpg' },
  { id: 'cuir-croco', name: 'Cuir Croco', description: 'Effet crocodile', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/LDxLcDhrhZmESUYf.jpg' },
  { id: 'moire-bleu', name: 'Moiré Bleu', description: 'Soie moirée bleue', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/awNPSsJrKCUGaWer.jpg' },
  { id: 'moire-vert', name: 'Moiré Vert', description: 'Soie moirée verte', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/lwrrYFNrNgjlcdef.jpg' },
  { id: 'moire-rouge', name: 'Moiré Rouge', description: 'Soie moirée rouge', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/ERsnuLSRATIFlSsI.jpg' },
  { id: 'moire-rose', name: 'Moiré Rose', description: 'Soie moirée rose', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/JwYtSXejxVnxBPNl.webp' },
  { id: 'marbre-bleu', name: 'Marbre Bleu', description: 'Marbre bleu océan', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/TFWsQjVuQUeKXVYT.png' },
  { id: 'marbre-beige', name: 'Marbre Beige', description: 'Marbre beige élégant', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/SbywqCncKeXtbkce.png' },
  { id: 'metal-rouille', name: 'Métal Rouillé', description: 'Texture métal oxydé', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/HjTIdtTwqXOoudnC.png' },
  { id: 'or', name: 'Or', description: 'Texture dorée luxueuse', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/uiiMXtuZfOAlarGI.png' },
  { id: 'bambou', name: 'Bambou', description: 'Bambou naturel', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/muGfMVduEkAulqEW.png' },
  { id: 'flammes', name: 'Flammes', description: 'Effet feu ardent', image: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/fHBrhiQEzzHTXLzA.png' },
];

// Fonds pastels pour la zone de travail
export const WORKAREA_COLORS = [
  { id: 'blanc', name: 'Blanc', color: '#FFFFFF' },
  { id: 'sable', name: 'Sable', color: '#F5F5DC' },
  { id: 'creme', name: 'Crème', color: '#FFFDD0' },
  { id: 'ivoire', name: 'Ivoire', color: '#FFFFF0' },
  { id: 'bleu-pastel', name: 'Bleu Pastel', color: '#E0F2FE' },
  { id: 'vert-pastel', name: 'Vert Pastel', color: '#DCFCE7' },
  { id: 'rose-pastel', name: 'Rose Pastel', color: '#FCE7F3' },
  { id: 'lavande-pastel', name: 'Lavande Pastel', color: '#F3E8FF' },
  { id: 'peche-pastel', name: 'Pêche Pastel', color: '#FFEDD5' },
  { id: 'gris-clair', name: 'Gris Clair', color: '#F3F4F6' },
];

// Thème par défaut
const DEFAULT_THEME_ID = 'classique';
const DEFAULT_TEXTURE_ID = 'none';
const DEFAULT_WORKAREA_ID = 'blanc';

interface ThemeSelectorProps {
  onThemeChange?: (themeId: string) => void;
}

export default function ThemeSelector({ onThemeChange }: ThemeSelectorProps) {
  const { t, language } = useLanguage();
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    return localStorage.getItem('duoclass_theme') || DEFAULT_THEME_ID;
  });
  const [selectedTexture, setSelectedTexture] = useState<string>(() => {
    return localStorage.getItem('duoclass_texture') || DEFAULT_TEXTURE_ID;
  });
  const [selectedWorkarea, setSelectedWorkarea] = useState<string>(() => {
    return localStorage.getItem('duoclass_workarea') || DEFAULT_WORKAREA_ID;
  });
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  // Appliquer le thème sélectionné au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('duoclass_theme') || DEFAULT_THEME_ID;
    const savedTexture = localStorage.getItem('duoclass_texture') || DEFAULT_TEXTURE_ID;
    const savedWorkarea = localStorage.getItem('duoclass_workarea') || DEFAULT_WORKAREA_ID;
    setSelectedTheme(savedTheme);
    setSelectedTexture(savedTexture);
    setSelectedWorkarea(savedWorkarea);
  }, []);

  // Fonction pour appliquer un thème visuellement (prévisualisation)
  const applyThemePreview = (themeId: string, textureId?: string, workareaId?: string) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    const texture = BACKGROUND_TEXTURES.find(t => t.id === (textureId || selectedTexture));
    const workarea = WORKAREA_COLORS.find(w => w.id === (workareaId || selectedWorkarea));

    const mainWindow = document.querySelector('[data-main-window]') as HTMLElement;
    const outerContainer = document.querySelector('[data-outer-container]') as HTMLElement;
    const contentArea = document.querySelector('[data-content-area]') as HTMLElement;
    const sidebar = document.querySelector('aside') as HTMLElement;

    if (mainWindow) mainWindow.style.borderColor = theme.colors.border;
    
    if (outerContainer) {
      if (texture && texture.image) {
        outerContainer.style.backgroundImage = `url(${texture.image})`;
        outerContainer.style.backgroundSize = 'cover';
        outerContainer.style.backgroundPosition = 'center';
        outerContainer.style.backgroundColor = 'transparent';
      } else {
        outerContainer.style.backgroundImage = 'none';
        outerContainer.style.backgroundColor = theme.colors.background;
      }
    }
    
    if (contentArea) {
      contentArea.style.color = theme.colors.text;
      if (workarea) {
        contentArea.style.backgroundColor = workarea.color;
      }
    }
    
    if (sidebar) {
      sidebar.style.backgroundColor = theme.colors.sidebar;
      // Appliquer la couleur du texte de la sidebar
      const sidebarLinks = sidebar.querySelectorAll('a, span, button');
      sidebarLinks.forEach(el => {
        (el as HTMLElement).style.color = theme.colors.sidebarText;
      });
    }
  };

  // Prévisualisation au survol
  const handleMouseEnter = (themeId: string) => {
    setPreviewTheme(themeId);
    applyThemePreview(themeId);
  };

  // Restaurer le thème sélectionné quand on quitte le survol
  const handleMouseLeave = () => {
    setPreviewTheme(null);
    const currentTheme = localStorage.getItem('duoclass_theme') || DEFAULT_THEME_ID;
    applyThemePreview(currentTheme);
  };

  // Sélectionner un thème (sans sauvegarder)
  const handleSelectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    setPreviewTheme(null);
    applyThemePreview(themeId);
  };

  // Sélectionner une texture
  const handleSelectTexture = (textureId: string) => {
    setSelectedTexture(textureId);
    applyThemePreview(selectedTheme, textureId, selectedWorkarea);
  };

  // Sélectionner un fond de zone de travail
  const handleSelectWorkarea = (workareaId: string) => {
    setSelectedWorkarea(workareaId);
    applyThemePreview(selectedTheme, selectedTexture, workareaId);
  };

  // Valider le choix avec OK
  const handleConfirm = () => {
    const theme = THEMES.find(t => t.id === selectedTheme);
    const texture = BACKGROUND_TEXTURES.find(t => t.id === selectedTexture);
    const workarea = WORKAREA_COLORS.find(w => w.id === selectedWorkarea);
    if (!theme) return;

    // Sauvegarder dans localStorage
    localStorage.setItem('duoclass_theme', selectedTheme);
    localStorage.setItem('duoclass_texture', selectedTexture);
    localStorage.setItem('duoclass_workarea', selectedWorkarea);
    localStorage.setItem('custom_color_lines', theme.colors.border);
    localStorage.setItem('custom_color_background', theme.colors.background);
    localStorage.setItem('custom_color_text', theme.colors.text);
    localStorage.setItem('custom_color_sidebar', theme.colors.sidebar);
    localStorage.setItem('custom_color_sidebar_text', theme.colors.sidebarText);
    localStorage.setItem('custom_color_header', theme.colors.header);
    if (texture?.image) {
      localStorage.setItem('custom_background_texture', texture.image);
    } else {
      localStorage.removeItem('custom_background_texture');
    }
    if (workarea) {
      localStorage.setItem('custom_workarea_color', workarea.color);
    }
    
    toast.success(language === 'fr' ? `Thème "${theme.name}" appliqué avec succès !` : `Theme "${theme.name}" applied successfully!`);
    
    if (onThemeChange) {
      onThemeChange(selectedTheme);
    }

    // Déclencher l'événement pour mettre à jour le Layout en temps réel
    window.dispatchEvent(new Event('themeChanged'));
  };

  // Réinitialiser au thème par défaut
  const handleReset = () => {
    setSelectedTheme(DEFAULT_THEME_ID);
    setSelectedTexture(DEFAULT_TEXTURE_ID);
    setSelectedWorkarea(DEFAULT_WORKAREA_ID);
    setPreviewTheme(null);
    
    // Supprimer les personnalisations
    localStorage.setItem('duoclass_theme', DEFAULT_THEME_ID);
    localStorage.setItem('duoclass_texture', DEFAULT_TEXTURE_ID);
    localStorage.setItem('duoclass_workarea', DEFAULT_WORKAREA_ID);
    localStorage.removeItem('custom_color_lines');
    localStorage.removeItem('custom_color_background');
    localStorage.removeItem('custom_color_text');
    localStorage.removeItem('custom_color_sidebar');
    localStorage.removeItem('custom_color_sidebar_text');
    localStorage.removeItem('custom_color_header');
    localStorage.removeItem('custom_background_texture');
    localStorage.removeItem('custom_workarea_color');
    
    toast.success(language === "fr" ? "Thème réinitialisé (Classique DuoClass)" : "Theme reset (Classic DuoClass)");
    
    // Déclencher l'événement pour mettre à jour le Layout en temps réel
    window.dispatchEvent(new Event('themeChanged'));
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Thèmes de couleurs */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{language === "fr" ? "1. Choisissez un thème de couleurs" : "1. Choose a color theme"}</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 hover:shadow-md",
                selectedTheme === theme.id 
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                  : "border-gray-200 hover:border-gray-300 bg-white",
                previewTheme === theme.id && previewTheme !== selectedTheme && "ring-2 ring-yellow-300"
              )}
              onClick={() => handleSelectTheme(theme.id)}
              onMouseEnter={() => handleMouseEnter(theme.id)}
              onMouseLeave={handleMouseLeave}
            >
              {selectedTheme === theme.id && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="flex gap-1">
                <div 
                  className="w-6 h-6 rounded-md shadow-sm border border-white/20" 
                  style={{ backgroundColor: theme.preview[0] }}
                  title={t('common.sidebar')}
                />
                <div 
                  className="w-6 h-6 rounded-md shadow-sm border border-gray-200" 
                  style={{ backgroundColor: theme.preview[1] }}
                  title={t('common.background')}
                />
                <div 
                  className="w-6 h-6 rounded-md shadow-sm border border-white/20" 
                  style={{ backgroundColor: theme.preview[2] }}
                  title={t('common.border')}
                />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-800 leading-tight">
                  {theme.name}
                </div>
                <div className="text-[10px] text-gray-500">
                  {theme.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 2: Textures de fond extérieur */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{language === "fr" ? "2. Texture de fond (zone extérieure)" : "2. Background texture (outer area)"}</h4>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {BACKGROUND_TEXTURES.map((texture) => (
            <button
              key={texture.id}
              className={cn(
                "relative p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1 hover:shadow-md",
                selectedTexture === texture.id 
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
              onClick={() => handleSelectTexture(texture.id)}
            >
              {selectedTexture === texture.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-2 h-2 text-white" />
                </div>
              )}
              <div 
                className="w-10 h-10 rounded-md shadow-sm border border-gray-200 overflow-hidden"
                style={texture.image ? {
                  backgroundImage: `url(${texture.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {
                  backgroundColor: '#F3F4F6'
                }}
              >
                {!texture.image && (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">∅</div>
                )}
              </div>
              <div className="text-[10px] font-medium text-gray-700 text-center leading-tight">
                {texture.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 3: Fond de la zone de travail */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{language === "fr" ? "3. Fond de la zone de travail" : "3. Work area background"}</h4>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {WORKAREA_COLORS.map((workarea) => (
            <button
              key={workarea.id}
              className={cn(
                "relative p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1 hover:shadow-md",
                selectedWorkarea === workarea.id 
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
              onClick={() => handleSelectWorkarea(workarea.id)}
            >
              {selectedWorkarea === workarea.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-2 h-2 text-white" />
                </div>
              )}
              <div 
                className="w-8 h-8 rounded-md shadow-sm border border-gray-300"
                style={{ backgroundColor: workarea.color }}
              />
              <div className="text-[9px] font-medium text-gray-700 text-center leading-tight">
                {workarea.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Info sur les sélections */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <div className="flex flex-wrap gap-4">
          <span>
            <span className="font-medium">{language === "fr" ? "Thème :" : "Theme:"}</span>{' '}
            <span className="text-blue-600 font-semibold">
              {THEMES.find(t => t.id === selectedTheme)?.name}
            </span>
          </span>
          <span>
            <span className="font-medium">{language === "fr" ? "Texture :" : "Texture:"}</span>{' '}
            <span className="text-purple-600 font-semibold">
              {BACKGROUND_TEXTURES.find(t => t.id === selectedTexture)?.name}
            </span>
          </span>
          <span>
            <span className="font-medium">{language === "fr" ? "Zone de travail :" : "Work area:"}</span>{' '}
            <span className="text-green-600 font-semibold">
              {WORKAREA_COLORS.find(w => w.id === selectedWorkarea)?.name}
            </span>
          </span>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-between items-center pt-2">
        <Button 
          variant="outline" 
          size="sm"
          className="text-gray-500 hover:text-red-600 hover:border-red-300"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {language === "fr" ? "Réinitialiser" : "Reset"}
        </Button>

        <Button 
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
          onClick={handleConfirm}
        >
          <Check className="w-4 h-4" />
          {language === "fr" ? "OK - Appliquer" : "OK - Apply"}
        </Button>
      </div>
    </div>
  );
}
