// Types pour l'éditeur de livre photo

// Forme de base pour un cadre
export interface FrameShape {
  id: string;
  type: 'rectangle' | 'square' | 'circle' | 'oval' | 'portrait' | 'landscape';
  label: string;
  icon: string; // Emoji ou nom d'icône
  aspectRatio?: number; // Pour les formes avec ratio fixe
}

// Position et dimensions d'un cadre sur la page
export interface FramePosition {
  x: number; // Pourcentage de la largeur (0-100)
  y: number; // Pourcentage de la hauteur (0-100)
  width: number; // Pourcentage de la largeur
  height: number; // Pourcentage de la hauteur
  rotation?: number; // Degrés
  zIndex?: number;
}

// Cadre avec photo
export interface PhotoFrame {
  id: string;
  shape: FrameShape['type'];
  position: FramePosition;
  photoId?: string; // ID de la photo placée
  photoUrl?: string; // URL de la photo
  photoTitle?: string; // Titre de la photo
  borderId?: string; // ID de la bordure appliquée
  // Ajustements de la photo dans le cadre
  photoOffset?: { x: number; y: number };
  photoScale?: number;
  isLocked?: boolean; // Cadre figé (non modifiable)
}

// Types de chemins pour le texte courbé
export type CurvedTextPathType = 'arc' | 'circle' | 'wave' | 'heart' | 'spiral';

// Texte courbé (SVG textPath)
export interface CurvedText {
  id: string;
  position: FramePosition;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  pathType: CurvedTextPathType; // Type de chemin
  curveDirection: 'top' | 'bottom'; // Arc au-dessus ou en-dessous (pour arc)
  curveRadius: number; // Rayon de courbure en pourcentage (0-200)
  isLocked?: boolean;
}

// Options de chemins disponibles
export const CURVED_TEXT_PATH_OPTIONS: { type: CurvedTextPathType; label: string; icon: string }[] = [
  { type: 'arc', label: 'Arc', icon: '⌒' },
  { type: 'circle', label: 'Cercle', icon: '○' },
  { type: 'wave', label: 'Vague', icon: '∿' },
  { type: 'heart', label: 'Cœur', icon: '♥' },
  { type: 'spiral', label: 'Spirale', icon: '@' },
];

// Zone de texte libre
export interface TextBox {
  id: string;
  position: FramePosition;
  text: string;
  fontFamily: string;
  fontSize: number; // en pixels
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  padding?: number;
  isLocked?: boolean;
}

// Bordure décorative
export interface DecorativeBorder {
  id: string;
  name: string;
  category: 'floral' | 'classic' | 'modern' | 'vintage' | 'elegant' | 'custom';
  type: 'frame' | 'page'; // Bordure pour photo ou pour page entière
  imageUrl: string; // URL de l'image de bordure (PNG avec transparence)
  thumbnailUrl?: string;
  isBuiltIn: boolean; // Prédéfinie ou ajoutée par l'utilisateur
  createdAt?: string;
}

// Template de page prédéfini
export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  frames: Omit<PhotoFrame, 'photoId' | 'photoUrl' | 'photoTitle'>[]; // Cadres sans photos
  backgroundColor?: string;
  backgroundImage?: string;
  pageBorderId?: string; // Bordure de page optionnelle
  isBuiltIn: boolean;
  category: 'simple' | 'collage' | 'artistic' | 'combined' | 'custom';
  decorativeElements?: Array<{
    type: 'corner' | 'frieze' | 'border';
    url: string;
    position: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    rotation?: number;
  }>;
}

// Page du livre avec contenu
export interface BookPage {
  id: string;
  pageNumber: number;
  templateId?: string;
  frames: PhotoFrame[];
  textBoxes?: TextBox[]; // Zones de texte libres
  curvedTexts?: CurvedText[]; // Textes courbés
  backgroundColor: string;
  backgroundImage?: string;
  backgroundTexture?: 'none' | 'paper' | 'linen' | 'parchment' | 'kraft';
  pageBorderId?: string;
  title?: string;
  subtitle?: string;
  isLocked: boolean; // Structure figée
}

// Configuration du livre
export interface BookConfig {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  format: 'A4' | 'A5' | 'square' | 'landscape';
  theme: 'classic' | 'modern' | 'vintage' | 'elegant' | 'minimal';
  coverPhotoId?: string;
  coverPhotoUrl?: string;
}

// État complet de l'éditeur
export interface PhotoBookEditorState {
  config: BookConfig;
  pages: BookPage[];
  currentPageIndex: number;
  selectedFrameId: string | null;
  selectedTextBoxId: string | null;
  selectedCurvedTextId: string | null;
  availablePhotos: {
    id: string;
    url: string;
    title?: string;
    used: boolean;
  }[];
  borders: DecorativeBorder[];
  templates: PageTemplate[];
  isDirty: boolean; // Modifications non sauvegardées
  mode: 'edit' | 'preview' | 'arrange'; // Mode d'édition
}

// Actions de l'éditeur
export type PhotoBookAction =
  | { type: 'SET_CONFIG'; payload: Partial<BookConfig> }
  | { type: 'ADD_PAGE'; payload?: { templateId?: string; afterIndex?: number } }
  | { type: 'DELETE_PAGE'; payload: { pageIndex: number } }
  | { type: 'DUPLICATE_PAGE'; payload: { pageIndex: number } }
  | { type: 'MOVE_PAGE'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SELECT_PAGE'; payload: { pageIndex: number } }
  | { type: 'UPDATE_PAGE'; payload: { pageIndex: number; updates: Partial<BookPage> } }
  | { type: 'ADD_FRAME'; payload: { pageIndex: number; frame: PhotoFrame } }
  | { type: 'UPDATE_FRAME'; payload: { pageIndex: number; frameId: string; updates: Partial<PhotoFrame> } }
  | { type: 'DELETE_FRAME'; payload: { pageIndex: number; frameId: string } }
  | { type: 'SELECT_FRAME'; payload: { frameId: string | null } }
  | { type: 'PLACE_PHOTO'; payload: { pageIndex: number; frameId: string; photoId: string; photoUrl: string; photoTitle?: string } }
  | { type: 'REMOVE_PHOTO'; payload: { pageIndex: number; frameId: string } }
  | { type: 'APPLY_BORDER'; payload: { pageIndex: number; frameId: string; borderId: string } }
  | { type: 'APPLY_PAGE_BORDER'; payload: { pageIndex: number; borderId: string } }
  | { type: 'LOCK_PAGE'; payload: { pageIndex: number } }
  | { type: 'UNLOCK_PAGE'; payload: { pageIndex: number } }
  | { type: 'APPLY_TEMPLATE'; payload: { pageIndex: number; templateId: string } }
  | { type: 'LOCK_FRAME'; payload: { pageIndex: number; frameId: string } }
  | { type: 'UNLOCK_FRAME'; payload: { pageIndex: number; frameId: string } }
  | { type: 'UNLOCK_ALL_FRAMES'; payload: { pageIndex: number } }
  | { type: 'ADD_BORDER'; payload: { border: DecorativeBorder } }
  | { type: 'DELETE_BORDER'; payload: { borderId: string } }
  | { type: 'SAVE_TEMPLATE'; payload: { template: PageTemplate } }
  | { type: 'SET_MODE'; payload: { mode: PhotoBookEditorState['mode'] } }
  | { type: 'MARK_SAVED' }
  | { type: 'RESET' }
  // Actions zones de texte
  | { type: 'ADD_TEXTBOX'; payload: { pageIndex: number; textBox: TextBox } }
  | { type: 'UPDATE_TEXTBOX'; payload: { pageIndex: number; textBoxId: string; updates: Partial<TextBox> } }
  | { type: 'DELETE_TEXTBOX'; payload: { pageIndex: number; textBoxId: string } }
  | { type: 'SELECT_TEXTBOX'; payload: { textBoxId: string | null } }
  // Actions textes courbés
  | { type: 'ADD_CURVED_TEXT'; payload: { pageIndex: number; curvedText: CurvedText } }
  | { type: 'UPDATE_CURVED_TEXT'; payload: { pageIndex: number; curvedTextId: string; updates: Partial<CurvedText> } }
  | { type: 'DELETE_CURVED_TEXT'; payload: { pageIndex: number; curvedTextId: string } }
  | { type: 'SELECT_CURVED_TEXT'; payload: { curvedTextId: string | null } };

// Dimensions en mm pour l'export PDF
export const PAGE_DIMENSIONS: Record<BookConfig['format'], { width: number; height: number }> = {
  'A4': { width: 210, height: 297 },
  'A5': { width: 148, height: 210 },
  'square': { width: 200, height: 200 },
  'landscape': { width: 297, height: 210 },
};

// Formes disponibles pour les cadres
export const AVAILABLE_SHAPES: FrameShape[] = [
  { id: 'rect', type: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'square', type: 'square', label: 'Carré', icon: '□', aspectRatio: 1 },
  { id: 'circle', type: 'circle', label: 'Cercle', icon: '○', aspectRatio: 1 },
  { id: 'oval', type: 'oval', label: 'Ovale', icon: '⬭' },
  { id: 'portrait', type: 'portrait', label: 'Portrait', icon: '▯', aspectRatio: 0.75 },
  { id: 'landscape', type: 'landscape', label: 'Paysage', icon: '▭', aspectRatio: 1.5 },
];

// Thèmes de couleurs
export const BOOK_THEMES: Record<BookConfig['theme'], {
  background: string;
  text: string;
  accent: string;
  coverBg: string;
}> = {
  'classic': {
    background: '#FDF8F0',
    text: '#2C1810',
    accent: '#8B4513',
    coverBg: '#800020',
  },
  'modern': {
    background: '#FFFFFF',
    text: '#1A1A1A',
    accent: '#0066CC',
    coverBg: '#1A1A1A',
  },
  'vintage': {
    background: '#F5E6D3',
    text: '#4A3728',
    accent: '#8B7355',
    coverBg: '#4A3728',
  },
  'elegant': {
    background: '#1A1A1A',
    text: '#F5F5F5',
    accent: '#D4AF37',
    coverBg: '#0A0A0A',
  },
  'minimal': {
    background: '#FAFAFA',
    text: '#333333',
    accent: '#666666',
    coverBg: '#E0E0E0',
  },
};

// Textures de fond disponibles
export const BACKGROUND_TEXTURES = [
  { id: 'none', label: 'Aucune', preview: '' },
  { id: 'paper', label: 'Papier', preview: '📄' },
  { id: 'linen', label: 'Lin', preview: '🧵' },
  { id: 'parchment', label: 'Parchemin', preview: '📜' },
  { id: 'kraft', label: 'Kraft', preview: '📦' },
];
