/**
 * Page Thèmes - Sélection des thèmes de l'interface DuoClass
 * Version avec Color Picker et système d'onglets pour les textures
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, RotateCcw, Palette, Save, Trash2, Play, X, FolderOpen, Type } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BASE_COLORS, COLOR_PALETTE } from "@/lib/colorPalette";

// Couleurs rapides pour le texte
const TEXT_COLORS = [
  { id: 'noir', name: 'Noir', color: '#000000' },
  { id: 'blanc', name: 'Blanc', color: '#FFFFFF' },
  { id: 'gris', name: 'Gris', color: '#6B7280' },
  { id: 'bleu', name: 'Bleu', color: '#2563EB' },
];

// Catégories de textures avec leurs fichiers
const TEXTURE_CATEGORIES = [
  {
    id: 'existantes',
    name: 'Classiques',
    textures: [
      { id: 'none', name: 'Aucune', file: null, color: '#E5E7EB' },
      { id: 'cuir-croco', name: 'Cuir Croco', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/LDxLcDhrhZmESUYf.jpg' },
      { id: 'moire-bleu', name: 'Moiré Bleu', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/awNPSsJrKCUGaWer.jpg' },
      { id: 'moire-vert', name: 'Moiré Vert', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/lwrrYFNrNgjlcdef.jpg' },
      { id: 'moire-rouge', name: 'Moiré Rouge', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/ERsnuLSRATIFlSsI.jpg' },
      { id: 'moire-rose', name: 'Moiré Rose', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/JwYtSXejxVnxBPNl.webp' },
      { id: 'marbre-bleu', name: 'Marbre Bleu', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/TFWsQjVuQUeKXVYT.png' },
      { id: 'marbre-beige', name: 'Marbre Beige', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/SbywqCncKeXtbkce.png' },
      { id: 'metal-rouille', name: 'Métal Rouillé', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/HjTIdtTwqXOoudnC.png' },
      { id: 'or', name: 'Or', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/uiiMXtuZfOAlarGI.png' },
      { id: 'bambou', name: 'Bambou', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/muGfMVduEkAulqEW.png' },
      { id: 'flammes', name: 'Flammes', file: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663160465265/fHBrhiQEzzHTXLzA.png' },
    ]
  },
  {
    id: 'ecossais',
    name: 'Écossais',
    textures: [] as { id: string; name: string; file: string }[]
  },
  {
    id: 'marbre',
    name: 'Marbre',
    textures: [] as { id: string; name: string; file: string }[]
  },
  {
    id: 'panneaux-bois',
    name: 'Bois Décor',
    textures: [] as { id: string; name: string; file: string }[]
  },
  {
    id: 'pierre',
    name: 'Pierre',
    textures: [] as { id: string; name: string; file: string }[]
  },
  {
    id: 'tissus',
    name: 'Tissus',
    textures: [] as { id: string; name: string; file: string }[]
  },
  {
    id: 'divers',
    name: 'Divers',
    textures: [] as { id: string; name: string; file: string }[]
  },
];

// Type pour les configurations sauvegardées
interface SavedConfig {
  id: string;
  name: string;
  sidebarColor: string;
  textColor: string;
  textureId: string;
  workareaColor: string;
  createdAt: string;
}

export default function Themes() {
  const { t } = useLanguage();
  
  // États pour les couleurs personnalisées
  const [sidebarColor, setSidebarColor] = useState(
    localStorage.getItem('custom_color_sidebar') || '#2563EB'
  );
  const [textColor, setTextColor] = useState(
    localStorage.getItem('custom_color_sidebar_text') || '#FFFFFF'
  );
  const [workareaColor, setWorkareaColor] = useState(
    localStorage.getItem('custom_workarea_color') || 'transparent'
  );
  const [selectedTexture, setSelectedTexture] = useState(
    localStorage.getItem('duoclass_texture') || 'none'
  );
  const [activeTextureCategory, setActiveTextureCategory] = useState('existantes');
  
  // États pour la sauvegarde de configurations
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState('');
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [showConfigList, setShowConfigList] = useState(false);
  
  // État pour les textures chargées dynamiquement
  const [textureCategories, setTextureCategories] = useState(TEXTURE_CATEGORIES);
  
  // État pour la prévisualisation de texture agrandie
  const [previewTexture, setPreviewTexture] = useState<{id: string; name: string; file?: string; color?: string} | null>(null);

  // Charger les textures dynamiquement au démarrage
  useEffect(() => {
    const loadTextures = async () => {
      const categories = [...TEXTURE_CATEGORIES];
      
      // Charger les textures de chaque catégorie depuis le dossier public
      const categoryFolders: Record<string, string> = {
        'ecossais': '/textures/ecossais/',
        'marbre': '/textures/marbre/',
        'panneaux-bois': '/textures/panneaux-bois/',
        'pierre': '/textures/pierre/',
        'tissus': '/textures/tissus/',
        'divers': '/textures/divers/',
      };
      
      // Pour chaque catégorie, on génère les textures à partir des fichiers connus
      // (Dans une vraie app, on ferait un appel API pour lister les fichiers)
      // Liste complète de toutes les textures disponibles
      // Liste complète des textures avec noms explicites
      const textureFilesWithNames: Record<string, { file: string; name: string }[]> = {
        'ecossais': [
          { file: 'Ecossais1.jpg', name: 'Écossais 1' },
          { file: 'Ecossais2.jpg', name: 'Écossais 2' },
          { file: 'Ecossais3.jpg', name: 'Écossais 3' },
          { file: 'Ecossais4.jpg', name: 'Écossais 4' },
          { file: 'Ecossais5.jpg', name: 'Écossais 5' },
          { file: 'Ecossais6.jpg', name: 'Écossais 6' },
          { file: 'Ecossais7.jpg', name: 'Écossais 7' },
          { file: 'Ecossai8.jpg', name: 'Écossais 8' },
          { file: 'Ecossais9.jpg', name: 'Écossais 9' },
        ],
        'marbre': [
          { file: 'Marbre1.jpg', name: 'Marbre 1' },
          { file: 'Marbre2.jpg', name: 'Marbre 2' },
          { file: 'Marbre3.jpg', name: 'Marbre 3' },
          { file: 'Marbre4.jpg', name: 'Marbre 4' },
          { file: 'Marbre5.jpg', name: 'Marbre 5' },
          { file: 'Marbre6.jpg', name: 'Marbre 6' },
          { file: 'marbre7.jpg', name: 'Marbre 7' },
          { file: 'marbre8.jpg', name: 'Marbre 8' },
          { file: 'Marbre9.jpg', name: 'Marbre 9' },
          { file: 'marbre10.jpg', name: 'Marbre 10' },
          { file: 'marbre11.jpg', name: 'Marbre 11' },
          { file: 'Marbre12.jpg', name: 'Marbre 12' },
        ],
        'panneaux-bois': [
          { file: 'Bois1.jpg', name: 'Bois 1' },
          { file: 'Bois2.jpg', name: 'Bois 2' },
          { file: 'Bois3.jpg', name: 'Bois 3' },
          { file: 'Bois4.jpg', name: 'Bois 4' },
          { file: 'Bois5.jpg', name: 'Bois 5' },
          { file: 'Bois6.jpg', name: 'Bois 6' },
          { file: 'Bois7.jpg', name: 'Bois 7' },
          { file: 'Bois8.jpg', name: 'Bois 8' },
          { file: 'Bois9.jpg', name: 'Bois 9' },
          { file: 'Bois10.jpg', name: 'Bois 10' },
          { file: 'Bois11.jpg', name: 'Bois 11' },
          { file: 'Bois12.jpg', name: 'Bois 12' },
          { file: 'Bois13.jpg', name: 'Bois 13' },
          { file: 'Bois14.jpg', name: 'Bois 14' },
          { file: 'Bois15.jpg', name: 'Bois 15' },
          { file: 'Bois16.jpg', name: 'Bois 16' },
          { file: 'Bois17.jpg', name: 'Bois 17' },
          { file: 'Bois18.jpg', name: 'Bois 18' },
          { file: 'Bois19.jpg', name: 'Bois 19' },
          { file: 'Bois20.jpg', name: 'Bois 20' },
          { file: 'Bois21.jpg', name: 'Bois 21' },
          { file: 'Bois22.jpg', name: 'Bois 22' },
          { file: 'bois23.jpg', name: 'Bois 23' },
          { file: 'Bois24.jpg', name: 'Bois 24' },
          { file: 'Bois25.jpg', name: 'Bois 25' },
          { file: 'Bois26.jpg', name: 'Bois 26' },
          { file: 'bois27.jpg', name: 'Bois 27' },
        ],
        'pierre': [
          { file: 'Pierre1.jpg', name: 'Pierre 1' },
          { file: 'Pierre2.jpg', name: 'Pierre 2' },
          { file: 'Pierre3.jpg', name: 'Pierre 3' },
          { file: 'Pierre4.jpg', name: 'Pierre 4' },
          { file: 'Pierre5.jpg', name: 'Pierre 5' },
          { file: 'Pierre6.jpg', name: 'Pierre 6' },
          { file: 'Pierre7.jpg', name: 'Pierre 7' },
          { file: 'Pierre8.jpg', name: 'Pierre 8' },
          { file: 'Pierre9.jpg', name: 'Pierre 9' },
        ],
        'tissus': [
          { file: 'Tissus1.jpg', name: 'Tissus 1' },
          { file: 'Tissus2.jpg', name: 'Tissus 2' },
          { file: 'Tissus3.jpg', name: 'Tissus 3' },
          { file: 'Tissus4.jpg', name: 'Tissus 4' },
          { file: 'Tissus5.jpg', name: 'Tissus 5' },
          { file: 'Tissus6.jpg', name: 'Tissus 6' },
          { file: 'Tissus7.jpg', name: 'Tissus 7' },
          { file: 'Tissus8.jpg', name: 'Tissus 8' },
          { file: 'Tissus9.jpg', name: 'Tissus 9' },
          { file: 'Tissus10.jpg', name: 'Tissus 10' },
        ],

        'divers': [
          { file: 'Bambou1.jpg', name: 'Bambou' },
          { file: 'Flamme1.jpg', name: 'Flamme' },
          { file: 'Lezard1.jpg', name: 'Lézard' },
          { file: 'Cuir1.jpg', name: 'Cuir 1' },
          { file: 'Cuir2.jpg', name: 'Cuir 2' },
          { file: 'marbre1.jpg', name: 'Marbre Divers' },
          { file: 'Or1.jpg', name: 'Or' },
          { file: 'Moire1.jpg', name: 'Moiré 1' },
          { file: 'Moire2.jpg', name: 'Moiré 2' },
          { file: 'Moire3.jpg', name: 'Moiré 3' },
          { file: 'Moire4.jpg', name: 'Moiré 4' },
        ],
      };
      
      for (const cat of categories) {
        if (categoryFolders[cat.id] && textureFilesWithNames[cat.id]) {
          cat.textures = textureFilesWithNames[cat.id].map((item, index) => ({
            id: `${cat.id}-${index}`,
            name: item.name,
            file: categoryFolders[cat.id] + item.file,
          }));
        }
      }
      
      setTextureCategories(categories);
    };
    
    loadTextures();
  }, []);

  // Charger les configurations sauvegardées au démarrage
  useEffect(() => {
    const stored = localStorage.getItem('duoclass_saved_configs_v2');
    if (stored) {
      try {
        setSavedConfigs(JSON.parse(stored));
      } catch (e) {
        console.error('Erreur lors du chargement des configurations:', e);
      }
    }
  }, []);

  // Fonction pour appliquer les couleurs immédiatement
  const applyColors = (sidebar: string, text: string, textureId: string, workarea: string) => {
    localStorage.setItem('custom_color_sidebar', sidebar);
    localStorage.setItem('custom_color_sidebar_text', text);
    localStorage.setItem('custom_workarea_color', workarea);
    localStorage.setItem('duoclass_texture', textureId);
    
    // Trouver la texture sélectionnée
    let textureFile: string | null = null;
    for (const cat of textureCategories) {
      const texture = cat.textures.find(t => t.id === textureId);
      if (texture && texture.file) {
        textureFile = texture.file;
        break;
      }
    }
    
    if (textureFile) {
      localStorage.setItem('custom_background_texture', textureFile);
    } else {
      localStorage.removeItem('custom_background_texture');
    }
    
    window.dispatchEvent(new Event('themeChanged'));
  };

  // Gestionnaires de clic
  const handleSidebarColorClick = (color: string) => {
    setSidebarColor(color);
    applyColors(color, textColor, selectedTexture, workareaColor);
  };

  const handleTextColorClick = (color: string) => {
    setTextColor(color);
    applyColors(sidebarColor, color, selectedTexture, workareaColor);
  };

  const handleTextureClick = (textureId: string) => {
    setSelectedTexture(textureId);
    applyColors(sidebarColor, textColor, textureId, workareaColor);
  };

  const handleWorkareaColorClick = (color: string) => {
    setWorkareaColor(color);
    applyColors(sidebarColor, textColor, selectedTexture, color);
  };

  // Réinitialiser aux valeurs par défaut
  const handleReset = () => {
    setSidebarColor('#2563EB');
    setTextColor('#FFFFFF');
    setSelectedTexture('none');
    setWorkareaColor('transparent');
    
    localStorage.removeItem('custom_color_sidebar');
    localStorage.removeItem('custom_color_sidebar_text');
    localStorage.removeItem('custom_background_texture');
    localStorage.removeItem('custom_workarea_color');
    localStorage.setItem('duoclass_texture', 'none');
    
    window.dispatchEvent(new Event('themeChanged'));
    toast.success(t('toast.themeReset'));
  };

  // Sauvegarder la configuration actuelle
  const handleSaveConfig = () => {
    if (!configName.trim()) {
      toast.error(t('themes.enterConfigName'));
      return;
    }

    const newConfig: SavedConfig = {
      id: Date.now().toString(),
      name: configName.trim(),
      sidebarColor,
      textColor,
      textureId: selectedTexture,
      workareaColor,
      createdAt: new Date().toLocaleDateString('fr-FR'),
    };

    const updatedConfigs = [...savedConfigs, newConfig];
    setSavedConfigs(updatedConfigs);
    localStorage.setItem('duoclass_saved_configs_v2', JSON.stringify(updatedConfigs));
    
    setConfigName('');
    setShowSaveDialog(false);
    toast.success(t('themes.configSaved'));
  };

  // Appliquer une configuration sauvegardée
  const handleApplyConfig = (config: SavedConfig) => {
    setSidebarColor(config.sidebarColor);
    setTextColor(config.textColor);
    setSelectedTexture(config.textureId);
    setWorkareaColor(config.workareaColor);
    applyColors(config.sidebarColor, config.textColor, config.textureId, config.workareaColor);
    toast.success(t('themes.configApplied'));
  };

  // Supprimer une configuration sauvegardée
  const handleDeleteConfig = (configId: string) => {
    const updatedConfigs = savedConfigs.filter(c => c.id !== configId);
    setSavedConfigs(updatedConfigs);
    localStorage.setItem('duoclass_saved_configs_v2', JSON.stringify(updatedConfigs));
    toast.success(t('themes.configDeleted'));
  };

  return (
    <MainLayout title={t('sidebar.themes')}>
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">{t('themes.title')}</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowConfigList(!showConfigList)}
            className={cn(showConfigList && "bg-blue-100")}
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            {t('themes.myConfigs')} ({savedConfigs.length})
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSaveDialog(true)}
            className="bg-green-50 hover:bg-green-100 border-green-300"
          >
            <Save className="w-4 h-4 mr-1" />
            {t('themes.saveConfig')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            {t('themes.reset')}
          </Button>
        </div>
      </div>

      {/* Dialog de sauvegarde */}
      {showSaveDialog && (
        <div className="mb-4 p-4 rounded-lg border-2 border-green-300">
          <div className="flex items-center gap-2 mb-3">
            <Save className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">{t('themes.saveConfig')}</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t('themes.configNamePlaceholder')}
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveConfig()}
            />
            <Button onClick={handleSaveConfig} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-1" />
              {t('themes.save')}
            </Button>
            <Button variant="outline" onClick={() => { setShowSaveDialog(false); setConfigName(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Liste des configurations sauvegardées */}
      {showConfigList && savedConfigs.length > 0 && (
        <div className="mb-4 p-4 rounded-lg border-2 border-blue-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">{t('themes.mySavedConfigs')}</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowConfigList(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {savedConfigs.map((config) => (
              <div 
                key={config.id} 
                className="flex items-center justify-between p-2 bg-gray-50 rounded border hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: config.sidebarColor }} />
                  <span className="font-medium text-gray-800">{config.name}</span>
                  <span className="text-xs text-gray-400">- {config.createdAt}</span>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleApplyConfig(config)}
                    className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-100"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {t('themes.applyConfig')}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDeleteConfig(config.id)}
                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message si pas de configurations */}
      {showConfigList && savedConfigs.length === 0 && (
        <div className="mb-4 p-4 rounded-lg border-2 border-blue-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">{t('themes.mySavedConfigs')}</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowConfigList(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-gray-500 text-sm">{t('themes.noConfigs')}</p>
        </div>
      )}

      {/* Contenu principal - 3 colonnes */}
      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Colonne 1: Color Picker pour la barre latérale */}
        <div className="p-3 flex flex-col overflow-hidden">
          <h2 className="text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            1. Couleur de l'interface
          </h2>
          
          {/* Prévisualisation de la couleur actuelle */}
          <div className="mb-3 p-2 rounded border bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-8 h-8 rounded border-2 border-gray-300"
                style={{ backgroundColor: sidebarColor }}
              />
              <div className="flex-1">
                <div className="text-xs text-gray-500">Couleur actuelle</div>
                <div className="font-mono text-sm">{sidebarColor}</div>
              </div>
            </div>
            
            {/* Sélecteur de couleur natif */}
            <input
              type="color"
              value={sidebarColor}
              onChange={(e) => handleSidebarColorClick(e.target.value)}
              className="w-full h-8 cursor-pointer rounded border"
            />
          </div>
          
          {/* Palette de couleurs */}
          <ScrollArea className="flex-1">
            {/* Couleurs de base (cercles) */}
            <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-gray-200">
              {BASE_COLORS.map((color, index) => (
                <button
                  key={`base-${index}`}
                  onClick={() => handleSidebarColorClick(color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                    sidebarColor === color ? "ring-2 ring-blue-500 ring-offset-1" : "border-gray-300"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            
            {/* Grille de couleurs pastels (13 colonnes) */}
            <div className="grid grid-cols-13 gap-0.5">
              {COLOR_PALETTE.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleSidebarColorClick(color)}
                  className={cn(
                    "w-5 h-5 rounded-sm border transition-all hover:scale-110",
                    sidebarColor === color ? "ring-2 ring-blue-500 ring-offset-1" : "border-gray-200"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </ScrollArea>
          
          {/* Options de couleur de texte */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">Couleur du texte</span>
            </div>
            <div className="flex gap-2">
              {TEXT_COLORS.map((tc) => (
                <button
                  key={tc.id}
                  onClick={() => handleTextColorClick(tc.color)}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded border text-xs font-medium transition-all",
                    textColor === tc.color 
                      ? "ring-2 ring-blue-500 border-blue-500" 
                      : "border-gray-200 hover:border-gray-400"
                  )}
                  style={{ 
                    backgroundColor: tc.color === '#FFFFFF' ? '#F3F4F6' : tc.color,
                    color: tc.color === '#FFFFFF' || tc.color === '#FFFF00' ? '#000' : '#FFF'
                  }}
                >
                  {tc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne 2: Textures avec onglets */}
        <div className="p-3 flex flex-col overflow-hidden">
          <h2 className="text-sm font-medium mb-2 text-gray-700">2. {t('themes.texture')}</h2>
          
          <Tabs value={activeTextureCategory} onValueChange={setActiveTextureCategory} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-4 h-auto mb-2">
              {textureCategories.slice(0, 4).map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs py-1 px-1">
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsList className="grid grid-cols-3 h-auto mb-2">
              {textureCategories.slice(4).map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs py-1 px-1">
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div 
                id="texture-scroll-container"
                className="flex-1 overflow-y-auto max-h-[350px] pr-2" 
                style={{ 
                  scrollbarWidth: 'auto', 
                  scrollbarColor: '#3B82F6 #E5E7EB',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
              {textureCategories.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="mt-0 data-[state=active]:block">
                  <div className="grid grid-cols-4 gap-1 pb-4">
                    {cat.textures.map((texture) => (
                      <div
                        key={texture.id}
                        className="group relative"
                      >
                        <button
                          onClick={() => handleTextureClick(texture.id)}
                          onDoubleClick={() => setPreviewTexture(texture as any)}
                          className={cn(
                            "relative p-0.5 rounded border-2 transition-all text-left w-full",
                            selectedTexture === texture.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                          )}
                        >
                          {selectedTexture === texture.id && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center z-10">
                              <Check className="w-2 h-2 text-white" />
                            </div>
                          )}
                          <div
                            className="w-full h-8 rounded bg-cover bg-center"
                            style={{
                              backgroundColor: (texture as any).color || '#E5E7EB',
                              backgroundImage: texture.file ? `url(${texture.file})` : 'none',
                            }}
                          />
                        </button>
                        {/* Tooltip au survol */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                          {texture.name}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Indicateur de scroll cliquable */}
                  {cat.textures.length > 16 && (
                    <button 
                      onClick={() => {
                        const container = document.getElementById('texture-scroll-container');
                        if (container) {
                          container.scrollBy({ top: 150, behavior: 'smooth' });
                        }
                      }}
                      className="w-full text-center text-base text-blue-600 font-bold mt-2 py-2 bg-blue-100 hover:bg-blue-200 rounded cursor-pointer transition-colors border-2 border-blue-300"
                    >
                      ↓ Voir {cat.textures.length - 16} autres textures ↓
                    </button>
                  )}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>

        {/* Colonne 3: Color Picker pour le fond de zone de travail */}
        <div className="p-3 flex flex-col overflow-hidden">
          <h2 className="text-sm font-medium mb-2 text-gray-700">3. {t('themes.workarea')}</h2>
          
          {/* Prévisualisation de la couleur actuelle */}
          <div className="mb-3 p-2 rounded border bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-8 h-8 rounded border-2 border-gray-300"
                style={{ 
                  backgroundColor: workareaColor === 'transparent' ? '#FFF' : workareaColor,
                  backgroundImage: workareaColor === 'transparent' 
                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                    : 'none',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                }}
              />
              <div className="flex-1">
                <div className="text-xs text-gray-500">Couleur actuelle</div>
                <div className="font-mono text-sm">{workareaColor}</div>
              </div>
            </div>
            
            {/* Bouton transparent */}
            <button
              onClick={() => handleWorkareaColorClick('transparent')}
              className={cn(
                "w-full py-1.5 mb-2 rounded border text-xs font-medium transition-all",
                workareaColor === 'transparent' 
                  ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-gray-400"
              )}
            >
              Transparent
            </button>
            
            {/* Sélecteur de couleur natif */}
            <input
              type="color"
              value={workareaColor === 'transparent' ? '#FFFFFF' : workareaColor}
              onChange={(e) => handleWorkareaColorClick(e.target.value)}
              className="w-full h-8 cursor-pointer rounded border"
            />
          </div>
          
          {/* Palette de couleurs */}
          <ScrollArea className="flex-1">
            {/* Couleurs de base (cercles) */}
            <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-gray-200">
              {BASE_COLORS.map((color, index) => (
                <button
                  key={`base-work-${index}`}
                  onClick={() => handleWorkareaColorClick(color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                    workareaColor === color ? "ring-2 ring-blue-500 ring-offset-1" : "border-gray-300"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            
            {/* Grille de couleurs pastels (13 colonnes) */}
            <div className="grid grid-cols-13 gap-0.5">
              {COLOR_PALETTE.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleWorkareaColorClick(color)}
                  className={cn(
                    "w-5 h-5 rounded-sm border transition-all hover:scale-110",
                    workareaColor === color ? "ring-2 ring-blue-500 ring-offset-1" : "border-gray-200"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {/* Modale de prévisualisation de texture */}
      {previewTexture && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPreviewTexture(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-4 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">{previewTexture.name}</h3>
              <button 
                onClick={() => setPreviewTexture(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div 
              className="w-full h-64 rounded-lg bg-cover bg-center border-2 border-gray-200"
              style={{
                backgroundColor: previewTexture.color || '#E5E7EB',
                backgroundImage: previewTexture.file ? `url(${previewTexture.file})` : 'none',
              }}
            />
            <div className="flex gap-2 mt-4">
              <Button 
                className="flex-1"
                onClick={() => {
                  handleTextureClick(previewTexture.id);
                  setPreviewTexture(null);
                }}
              >
                <Check className="w-4 h-4 mr-2" />
                Appliquer cette texture
              </Button>
              <Button 
                variant="outline"
                onClick={() => setPreviewTexture(null)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
