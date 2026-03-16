// Templates de pages prédéfinis pour le livre photo

import { PageTemplate, PhotoFrame } from '@/types/photoBook';

// Générateur d'ID unique
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper pour créer un cadre
const createFrame = (
  shape: PhotoFrame['shape'],
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number = 1
): Omit<PhotoFrame, 'photoId' | 'photoUrl' | 'photoTitle'> => ({
  id: generateId(),
  shape,
  position: { x, y, width, height, zIndex },
});

// Templates prédéfinis
export const PREDEFINED_TEMPLATES: PageTemplate[] = [
  // === TEMPLATES SIMPLES ===
  {
    id: 'single-full',
    name: '1 Photo pleine page',
    description: 'Une seule photo occupant toute la page',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('rectangle', 5, 5, 90, 90),
    ],
  },
  {
    id: 'single-centered',
    name: '1 Photo centrée',
    description: 'Une photo centrée avec marges',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('rectangle', 15, 15, 70, 70),
    ],
  },
  {
    id: 'single-portrait',
    name: '1 Portrait centré',
    description: 'Un cadre portrait au centre',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('portrait', 25, 10, 50, 80),
    ],
  },
  {
    id: 'single-landscape',
    name: '1 Paysage centré',
    description: 'Un cadre paysage au centre',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('landscape', 10, 25, 80, 50),
    ],
  },
  {
    id: 'single-circle',
    name: '1 Photo ronde',
    description: 'Une photo dans un cadre circulaire',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('circle', 20, 15, 60, 70),
    ],
  },

  // === TEMPLATES 2 PHOTOS ===
  {
    id: 'duo-horizontal',
    name: '2 Photos côte à côte',
    description: 'Deux photos alignées horizontalement',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('rectangle', 5, 20, 43, 60),
      createFrame('rectangle', 52, 20, 43, 60),
    ],
  },
  {
    id: 'duo-vertical',
    name: '2 Photos superposées',
    description: 'Deux photos alignées verticalement',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('rectangle', 15, 5, 70, 43),
      createFrame('rectangle', 15, 52, 70, 43),
    ],
  },
  {
    id: 'duo-asymmetric',
    name: '2 Photos asymétriques',
    description: 'Une grande et une petite photo',
    category: 'collage',
    isBuiltIn: true,
    frames: [
      createFrame('rectangle', 5, 5, 60, 70, 1),
      createFrame('square', 55, 55, 40, 40, 2),
    ],
  },
  {
    id: 'duo-diagonal',
    name: '2 Photos en diagonale',
    description: 'Disposition en diagonale',
    category: 'artistic',
    isBuiltIn: true,
    frames: [
      createFrame('rectangle', 5, 5, 50, 50, 1),
      createFrame('rectangle', 45, 45, 50, 50, 2),
    ],
  },

  // === TEMPLATES 3 PHOTOS ===
  {
    id: 'trio-row',
    name: '3 Photos en ligne',
    description: 'Trois photos alignées horizontalement',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('square', 3, 30, 30, 40),
      createFrame('square', 35, 30, 30, 40),
      createFrame('square', 67, 30, 30, 40),
    ],
  },
  {
    id: 'trio-column',
    name: '3 Photos en colonne',
    description: 'Trois photos alignées verticalement',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('landscape', 15, 3, 70, 28),
      createFrame('landscape', 15, 35, 70, 28),
      createFrame('landscape', 15, 67, 70, 28),
    ],
  },
  {
    id: 'trio-featured',
    name: '1 Grande + 2 Petites',
    description: 'Une photo principale et deux secondaires',
    category: 'collage',
    isBuiltIn: true,
    frames: [
      createFrame('rectangle', 5, 5, 60, 90, 1),
      createFrame('square', 68, 5, 27, 43),
      createFrame('square', 68, 52, 27, 43),
    ],
  },
  {
    id: 'trio-pyramid',
    name: 'Pyramide',
    description: 'Disposition en pyramide',
    category: 'artistic',
    isBuiltIn: true,
    frames: [
      createFrame('square', 30, 5, 40, 45),
      createFrame('square', 5, 55, 43, 40),
      createFrame('square', 52, 55, 43, 40),
    ],
  },

  // === TEMPLATES 4 PHOTOS ===
  {
    id: 'quad-grid',
    name: 'Grille 2x2',
    description: 'Quatre photos en grille',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('square', 5, 5, 43, 43),
      createFrame('square', 52, 5, 43, 43),
      createFrame('square', 5, 52, 43, 43),
      createFrame('square', 52, 52, 43, 43),
    ],
  },
  {
    id: 'quad-mosaic',
    name: 'Mosaïque',
    description: 'Disposition en mosaïque variée',
    category: 'collage',
    isBuiltIn: true,
    frames: [
      createFrame('rectangle', 5, 5, 55, 55, 1),
      createFrame('square', 63, 5, 32, 35),
      createFrame('landscape', 63, 43, 32, 25),
      createFrame('landscape', 5, 63, 90, 32),
    ],
  },
  {
    id: 'quad-strip',
    name: 'Bande horizontale',
    description: 'Quatre photos en bande',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('portrait', 3, 20, 22, 60),
      createFrame('portrait', 27, 20, 22, 60),
      createFrame('portrait', 51, 20, 22, 60),
      createFrame('portrait', 75, 20, 22, 60),
    ],
  },
  {
    id: 'quad-corners',
    name: 'Quatre coins',
    description: 'Photos dans les coins avec espace central',
    category: 'artistic',
    isBuiltIn: true,
    frames: [
      createFrame('square', 5, 5, 35, 35),
      createFrame('square', 60, 5, 35, 35),
      createFrame('square', 5, 60, 35, 35),
      createFrame('square', 60, 60, 35, 35),
    ],
  },

  // === TEMPLATES 5+ PHOTOS ===
  {
    id: 'penta-cross',
    name: 'Croix (5 photos)',
    description: 'Cinq photos en forme de croix',
    category: 'artistic',
    isBuiltIn: true,
    frames: [
      createFrame('square', 35, 5, 30, 28),
      createFrame('square', 5, 36, 28, 28),
      createFrame('square', 36, 36, 28, 28),
      createFrame('square', 67, 36, 28, 28),
      createFrame('square', 35, 67, 30, 28),
    ],
  },
  {
    id: 'hexa-grid',
    name: 'Grille 3x2',
    description: 'Six photos en grille',
    category: 'simple',
    isBuiltIn: true,
    frames: [
      createFrame('square', 3, 5, 30, 43),
      createFrame('square', 35, 5, 30, 43),
      createFrame('square', 67, 5, 30, 43),
      createFrame('square', 3, 52, 30, 43),
      createFrame('square', 35, 52, 30, 43),
      createFrame('square', 67, 52, 30, 43),
    ],
  },

  // === TEMPLATES ARTISTIQUES ===
  {
    id: 'polaroid-single',
    name: 'Style Polaroid',
    description: 'Photo avec bordure style Polaroid',
    category: 'artistic',
    isBuiltIn: true,
    backgroundColor: '#F5F5F5',
    frames: [
      createFrame('square', 20, 10, 60, 55),
    ],
  },
  {
    id: 'scattered',
    name: 'Photos éparpillées',
    description: 'Effet de photos posées sur une table',
    category: 'artistic',
    isBuiltIn: true,
    frames: [
      { ...createFrame('rectangle', 10, 15, 35, 40, 1), position: { x: 10, y: 15, width: 35, height: 40, rotation: -5, zIndex: 1 } },
      { ...createFrame('rectangle', 40, 10, 35, 40, 2), position: { x: 40, y: 10, width: 35, height: 40, rotation: 8, zIndex: 2 } },
      { ...createFrame('rectangle', 25, 50, 35, 40, 3), position: { x: 25, y: 50, width: 35, height: 40, rotation: -3, zIndex: 3 } },
    ],
  },
  {
    id: 'filmstrip',
    name: 'Pellicule photo',
    description: 'Style pellicule de film',
    category: 'artistic',
    isBuiltIn: true,
    backgroundColor: '#1A1A1A',
    frames: [
      createFrame('square', 8, 25, 25, 50),
      createFrame('square', 37, 25, 25, 50),
      createFrame('square', 66, 25, 25, 50),
    ],
  },

  // === PAGE VIERGE ===
  {
    id: 'blank',
    name: 'Page vierge',
    description: 'Page vide pour création libre',
    category: 'custom',
    isBuiltIn: true,
    frames: [],
  },

  // === TEMPLATES COMBINÉS (avec frises, coins, bordures) ===
  {
    id: 'combined-elegant',
    name: 'Élégant avec coins',
    description: 'Photo centrée avec ornements de coins',
    category: 'combined',
    isBuiltIn: true,
    backgroundColor: '#FFFEF5',
    frames: [
      createFrame('rectangle', 20, 20, 60, 60),
    ],
    decorativeElements: [
      { type: 'corner', url: '/mise-en-page/coins/e00cc3b8772022ef34b291ff637affa6.jpg', position: 'top-left', rotation: 0 },
      { type: 'corner', url: '/mise-en-page/coins/e00cc3b8772022ef34b291ff637affa6.jpg', position: 'top-right', rotation: 90 },
      { type: 'corner', url: '/mise-en-page/coins/e00cc3b8772022ef34b291ff637affa6.jpg', position: 'bottom-right', rotation: 180 },
      { type: 'corner', url: '/mise-en-page/coins/e00cc3b8772022ef34b291ff637affa6.jpg', position: 'bottom-left', rotation: 270 },
    ],
  },
  {
    id: 'combined-framed',
    name: 'Encadré avec frises',
    description: 'Photo avec frises décoratives haut et bas',
    category: 'combined',
    isBuiltIn: true,
    backgroundColor: '#F8F6F0',
    frames: [
      createFrame('rectangle', 10, 20, 80, 60),
    ],
    decorativeElements: [
      { type: 'frieze', url: '/mise-en-page/frises/0b320dc1ee9a60f80918db3133b01bce.jpg', position: 'top' },
      { type: 'frieze', url: '/mise-en-page/frises/0b320dc1ee9a60f80918db3133b01bce.jpg', position: 'bottom' },
    ],
  },
  {
    id: 'combined-royal',
    name: 'Royal complet',
    description: 'Frises + coins + bordure dorée',
    category: 'combined',
    isBuiltIn: true,
    backgroundColor: '#FDF8E8',
    frames: [
      createFrame('rectangle', 15, 18, 70, 64),
    ],
    decorativeElements: [
      { type: 'frieze', url: '/mise-en-page/frises/0b320dc1ee9a60f80918db3133b01bce.jpg', position: 'top' },
      { type: 'frieze', url: '/mise-en-page/frises/0b320dc1ee9a60f80918db3133b01bce.jpg', position: 'bottom' },
      { type: 'corner', url: '/mise-en-page/coins/5687f40b30a7501580329c5c7a774df0.jpg', position: 'top-left', rotation: 0 },
      { type: 'corner', url: '/mise-en-page/coins/5687f40b30a7501580329c5c7a774df0.jpg', position: 'top-right', rotation: 90 },
      { type: 'corner', url: '/mise-en-page/coins/5687f40b30a7501580329c5c7a774df0.jpg', position: 'bottom-right', rotation: 180 },
      { type: 'corner', url: '/mise-en-page/coins/5687f40b30a7501580329c5c7a774df0.jpg', position: 'bottom-left', rotation: 270 },
    ],
  },
  {
    id: 'combined-duo',
    name: 'Duo décoré',
    description: 'Deux photos avec coins floraux',
    category: 'combined',
    isBuiltIn: true,
    backgroundColor: '#FEFEFE',
    frames: [
      createFrame('rectangle', 8, 20, 40, 60),
      createFrame('rectangle', 52, 20, 40, 60),
    ],
    decorativeElements: [
      { type: 'corner', url: '/mise-en-page/coins/0efa3afddb482d098c30dbf62b11a6a6.jpg', position: 'top-left', rotation: 0 },
      { type: 'corner', url: '/mise-en-page/coins/0efa3afddb482d098c30dbf62b11a6a6.jpg', position: 'top-right', rotation: 90 },
      { type: 'corner', url: '/mise-en-page/coins/0efa3afddb482d098c30dbf62b11a6a6.jpg', position: 'bottom-right', rotation: 180 },
      { type: 'corner', url: '/mise-en-page/coins/0efa3afddb482d098c30dbf62b11a6a6.jpg', position: 'bottom-left', rotation: 270 },
    ],
  },
  {
    id: 'combined-trio-framed',
    name: 'Trio encadré',
    description: 'Trois photos avec frises ethniques',
    category: 'combined',
    isBuiltIn: true,
    backgroundColor: '#F5F0E8',
    frames: [
      createFrame('square', 5, 22, 28, 56),
      createFrame('square', 36, 22, 28, 56),
      createFrame('square', 67, 22, 28, 56),
    ],
    decorativeElements: [
      { type: 'frieze', url: '/mise-en-page/frises/c1b0b2e4f5a3d8e9f0a1b2c3d4e5f6a7.jpg', position: 'top' },
      { type: 'frieze', url: '/mise-en-page/frises/c1b0b2e4f5a3d8e9f0a1b2c3d4e5f6a7.jpg', position: 'bottom' },
    ],
  },
];

// Fonction pour obtenir un template par ID
export const getTemplateById = (id: string): PageTemplate | undefined => {
  return PREDEFINED_TEMPLATES.find(t => t.id === id);
};

// Fonction pour obtenir les templates par catégorie
export const getTemplatesByCategory = (category: PageTemplate['category']): PageTemplate[] => {
  return PREDEFINED_TEMPLATES.filter(t => t.category === category);
};

// Fonction pour créer une copie d'un template avec de nouveaux IDs
export const cloneTemplate = (template: PageTemplate): PageTemplate => {
  return {
    ...template,
    id: generateId(),
    frames: template.frames.map(frame => ({
      ...frame,
      id: generateId(),
    })),
  };
};

// Fonction pour créer une page à partir d'un template
export const createPageFromTemplate = (
  template: PageTemplate,
  pageNumber: number
): import('@/types/photoBook').BookPage => {
  return {
    id: generateId(),
    pageNumber,
    templateId: template.id,
    frames: template.frames.map(frame => ({
      ...frame,
      id: generateId(),
    })),
    backgroundColor: template.backgroundColor || '#FFFFFF',
    backgroundImage: template.backgroundImage,
    backgroundTexture: 'none',
    pageBorderId: template.pageBorderId,
    isLocked: false,
  };
};
