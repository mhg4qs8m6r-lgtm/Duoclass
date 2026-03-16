// Bibliothèque de bordures décoratives pour le livre photo

import { DecorativeBorder } from '@/types/photoBook';

// Bordures prédéfinies (SVG inline pour éviter les dépendances externes)
// Ces bordures sont générées en SVG et peuvent être utilisées directement

// Générateur d'ID unique
const generateId = () => Math.random().toString(36).substr(2, 9);

// Fonction pour créer un SVG de bordure simple
const createSimpleBorderSVG = (
  strokeColor: string,
  strokeWidth: number,
  cornerRadius: number = 0,
  pattern: 'solid' | 'dashed' | 'dotted' | 'double' = 'solid'
): string => {
  const dashArray = pattern === 'dashed' ? '10,5' : pattern === 'dotted' ? '2,4' : 'none';
  const doubleStroke = pattern === 'double' ? `
    <rect x="8" y="8" width="84" height="84" rx="${cornerRadius}" 
          fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth/2}" />
  ` : '';
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="2" y="2" width="96" height="96" rx="${cornerRadius}" 
            fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
            ${dashArray !== 'none' ? `stroke-dasharray="${dashArray}"` : ''} />
      ${doubleStroke}
    </svg>
  `)}`;
};

// Fonction pour créer une bordure avec coins décoratifs
const createCornerBorderSVG = (color: string, style: 'ornate' | 'simple' | 'art-deco'): string => {
  let cornerPath = '';
  
  if (style === 'ornate') {
    cornerPath = `
      <path d="M5,5 Q15,5 15,15 M5,5 Q5,15 15,15" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M95,5 Q85,5 85,15 M95,5 Q95,15 85,15" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M5,95 Q15,95 15,85 M5,95 Q5,85 15,85" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M95,95 Q85,95 85,85 M95,95 Q95,85 85,85" stroke="${color}" stroke-width="2" fill="none"/>
      <circle cx="5" cy="5" r="2" fill="${color}"/>
      <circle cx="95" cy="5" r="2" fill="${color}"/>
      <circle cx="5" cy="95" r="2" fill="${color}"/>
      <circle cx="95" cy="95" r="2" fill="${color}"/>
    `;
  } else if (style === 'art-deco') {
    cornerPath = `
      <path d="M5,20 L5,5 L20,5" stroke="${color}" stroke-width="3" fill="none"/>
      <path d="M80,5 L95,5 L95,20" stroke="${color}" stroke-width="3" fill="none"/>
      <path d="M95,80 L95,95 L80,95" stroke="${color}" stroke-width="3" fill="none"/>
      <path d="M20,95 L5,95 L5,80" stroke="${color}" stroke-width="3" fill="none"/>
      <line x1="5" y1="10" x2="10" y2="5" stroke="${color}" stroke-width="1"/>
      <line x1="90" y1="5" x2="95" y2="10" stroke="${color}" stroke-width="1"/>
      <line x1="95" y1="90" x2="90" y2="95" stroke="${color}" stroke-width="1"/>
      <line x1="10" y1="95" x2="5" y2="90" stroke="${color}" stroke-width="1"/>
    `;
  } else {
    cornerPath = `
      <path d="M5,15 L5,5 L15,5" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M85,5 L95,5 L95,15" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M95,85 L95,95 L85,95" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M15,95 L5,95 L5,85" stroke="${color}" stroke-width="2" fill="none"/>
    `;
  }
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      ${cornerPath}
    </svg>
  `)}`;
};

// Fonction pour créer une bordure florale simplifiée
const createFloralBorderSVG = (color: string, intensity: 'light' | 'medium' | 'heavy'): string => {
  const petalCount = intensity === 'light' ? 4 : intensity === 'medium' ? 8 : 12;
  let florals = '';
  
  // Coins floraux
  const flowerCorner = (cx: number, cy: number, size: number) => `
    <circle cx="${cx}" cy="${cy}" r="${size}" fill="${color}" opacity="0.3"/>
    <circle cx="${cx}" cy="${cy}" r="${size * 0.6}" fill="${color}" opacity="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="${size * 0.3}" fill="${color}"/>
  `;
  
  florals += flowerCorner(8, 8, 6);
  florals += flowerCorner(92, 8, 6);
  florals += flowerCorner(8, 92, 6);
  florals += flowerCorner(92, 92, 6);
  
  if (intensity !== 'light') {
    // Milieux des côtés
    florals += flowerCorner(50, 5, 4);
    florals += flowerCorner(50, 95, 4);
    florals += flowerCorner(5, 50, 4);
    florals += flowerCorner(95, 50, 4);
  }
  
  // Lignes décoratives
  florals += `
    <line x1="15" y1="5" x2="85" y2="5" stroke="${color}" stroke-width="1" opacity="0.5"/>
    <line x1="15" y1="95" x2="85" y2="95" stroke="${color}" stroke-width="1" opacity="0.5"/>
    <line x1="5" y1="15" x2="5" y2="85" stroke="${color}" stroke-width="1" opacity="0.5"/>
    <line x1="95" y1="15" x2="95" y2="85" stroke="${color}" stroke-width="1" opacity="0.5"/>
  `;
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      ${florals}
    </svg>
  `)}`;
};

// Fonction pour créer une bordure vintage
const createVintageBorderSVG = (color: string): string => {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <!-- Cadre extérieur -->
      <rect x="2" y="2" width="96" height="96" fill="none" stroke="${color}" stroke-width="1"/>
      <!-- Cadre intérieur -->
      <rect x="5" y="5" width="90" height="90" fill="none" stroke="${color}" stroke-width="2"/>
      <!-- Coins décoratifs -->
      <path d="M5,5 L15,5 L15,8 L8,8 L8,15 L5,15 Z" fill="${color}"/>
      <path d="M95,5 L85,5 L85,8 L92,8 L92,15 L95,15 Z" fill="${color}"/>
      <path d="M5,95 L15,95 L15,92 L8,92 L8,85 L5,85 Z" fill="${color}"/>
      <path d="M95,95 L85,95 L85,92 L92,92 L92,85 L95,85 Z" fill="${color}"/>
    </svg>
  `)}`;
};

// Fonction pour créer une bordure élégante dorée
const createElegantBorderSVG = (): string => {
  const gold = '#D4AF37';
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <!-- Cadre principal -->
      <rect x="3" y="3" width="94" height="94" fill="none" stroke="${gold}" stroke-width="2"/>
      <rect x="6" y="6" width="88" height="88" fill="none" stroke="${gold}" stroke-width="1"/>
      <!-- Ornements des coins -->
      <path d="M3,20 C3,10 10,3 20,3" stroke="${gold}" stroke-width="2" fill="none"/>
      <path d="M80,3 C90,3 97,10 97,20" stroke="${gold}" stroke-width="2" fill="none"/>
      <path d="M97,80 C97,90 90,97 80,97" stroke="${gold}" stroke-width="2" fill="none"/>
      <path d="M20,97 C10,97 3,90 3,80" stroke="${gold}" stroke-width="2" fill="none"/>
      <!-- Détails -->
      <circle cx="10" cy="10" r="2" fill="${gold}"/>
      <circle cx="90" cy="10" r="2" fill="${gold}"/>
      <circle cx="10" cy="90" r="2" fill="${gold}"/>
      <circle cx="90" cy="90" r="2" fill="${gold}"/>
    </svg>
  `)}`;
};

// Bordures prédéfinies
export const PREDEFINED_BORDERS: DecorativeBorder[] = [
  // === BORDURES CLASSIQUES ===
  {
    id: 'classic-black',
    name: 'Classique noir',
    category: 'classic',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#000000', 3, 0, 'solid'),
    isBuiltIn: true,
  },
  {
    id: 'classic-white',
    name: 'Classique blanc',
    category: 'classic',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#FFFFFF', 3, 0, 'solid'),
    isBuiltIn: true,
  },
  {
    id: 'classic-gold',
    name: 'Classique doré',
    category: 'classic',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#D4AF37', 3, 0, 'solid'),
    isBuiltIn: true,
  },
  {
    id: 'classic-silver',
    name: 'Classique argenté',
    category: 'classic',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#C0C0C0', 3, 0, 'solid'),
    isBuiltIn: true,
  },
  {
    id: 'classic-double-black',
    name: 'Double noir',
    category: 'classic',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#000000', 4, 0, 'double'),
    isBuiltIn: true,
  },
  {
    id: 'classic-double-gold',
    name: 'Double doré',
    category: 'classic',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#D4AF37', 4, 0, 'double'),
    isBuiltIn: true,
  },

  // === BORDURES MODERNES ===
  {
    id: 'modern-rounded',
    name: 'Moderne arrondi',
    category: 'modern',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#333333', 2, 10, 'solid'),
    isBuiltIn: true,
  },
  {
    id: 'modern-dashed',
    name: 'Moderne pointillé',
    category: 'modern',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#666666', 2, 0, 'dashed'),
    isBuiltIn: true,
  },
  {
    id: 'modern-dotted',
    name: 'Moderne à points',
    category: 'modern',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#999999', 2, 0, 'dotted'),
    isBuiltIn: true,
  },
  {
    id: 'modern-thin',
    name: 'Moderne fin',
    category: 'modern',
    type: 'frame',
    imageUrl: createSimpleBorderSVG('#1A1A1A', 1, 0, 'solid'),
    isBuiltIn: true,
  },

  // === BORDURES AVEC COINS ===
  {
    id: 'corner-simple',
    name: 'Coins simples',
    category: 'classic',
    type: 'frame',
    imageUrl: createCornerBorderSVG('#000000', 'simple'),
    isBuiltIn: true,
  },
  {
    id: 'corner-ornate',
    name: 'Coins ornés',
    category: 'elegant',
    type: 'frame',
    imageUrl: createCornerBorderSVG('#D4AF37', 'ornate'),
    isBuiltIn: true,
  },
  {
    id: 'corner-artdeco',
    name: 'Art Déco',
    category: 'vintage',
    type: 'frame',
    imageUrl: createCornerBorderSVG('#8B4513', 'art-deco'),
    isBuiltIn: true,
  },

  // === BORDURES FLORALES ===
  {
    id: 'floral-light-pink',
    name: 'Floral léger rose',
    category: 'floral',
    type: 'frame',
    imageUrl: createFloralBorderSVG('#E91E63', 'light'),
    isBuiltIn: true,
  },
  {
    id: 'floral-medium-gold',
    name: 'Floral moyen doré',
    category: 'floral',
    type: 'frame',
    imageUrl: createFloralBorderSVG('#D4AF37', 'medium'),
    isBuiltIn: true,
  },
  {
    id: 'floral-heavy-green',
    name: 'Floral riche vert',
    category: 'floral',
    type: 'frame',
    imageUrl: createFloralBorderSVG('#2E7D32', 'heavy'),
    isBuiltIn: true,
  },
  {
    id: 'floral-light-blue',
    name: 'Floral léger bleu',
    category: 'floral',
    type: 'frame',
    imageUrl: createFloralBorderSVG('#1976D2', 'light'),
    isBuiltIn: true,
  },

  // === BORDURES VINTAGE ===
  {
    id: 'vintage-brown',
    name: 'Vintage marron',
    category: 'vintage',
    type: 'frame',
    imageUrl: createVintageBorderSVG('#8B4513'),
    isBuiltIn: true,
  },
  {
    id: 'vintage-sepia',
    name: 'Vintage sépia',
    category: 'vintage',
    type: 'frame',
    imageUrl: createVintageBorderSVG('#704214'),
    isBuiltIn: true,
  },
  {
    id: 'vintage-black',
    name: 'Vintage noir',
    category: 'vintage',
    type: 'frame',
    imageUrl: createVintageBorderSVG('#1A1A1A'),
    isBuiltIn: true,
  },

  // === BORDURES ÉLÉGANTES ===
  {
    id: 'elegant-gold',
    name: 'Élégant doré',
    category: 'elegant',
    type: 'frame',
    imageUrl: createElegantBorderSVG(),
    isBuiltIn: true,
  },

  // === BORDURES DE CADRES SUPPLÉMENTAIRES (Images) ===
  {
    id: 'frame-greek-pattern',
    name: 'Motif grecque',
    category: 'classic',
    type: 'frame',
    imageUrl: '/mise-en-page/bordures-cadres/bf7077a6715792862859ad8c4633a941.jpg',
    isBuiltIn: true,
  },
  {
    id: 'frame-greek-pattern-2',
    name: 'Motif grecque 2',
    category: 'classic',
    type: 'frame',
    imageUrl: '/mise-en-page/bordures-cadres/bf7077a6715792862859ad8c4633a941-2.jpg',
    isBuiltIn: true,
  },
  {
    id: 'frame-ornate-1',
    name: 'Orné 1',
    category: 'elegant',
    type: 'frame',
    imageUrl: '/mise-en-page/bordures-cadres/e118ccd8d0aeabfdb6f45b19065c1f88.jpg',
    isBuiltIn: true,
  },
  {
    id: 'frame-ornate-2',
    name: 'Orné 2',
    category: 'elegant',
    type: 'frame',
    imageUrl: '/mise-en-page/bordures-cadres/6993e03de6eabd41107447c52d3e83db.jpg',
    isBuiltIn: true,
  },
  {
    id: 'frame-ornate-3',
    name: 'Orné 3',
    category: 'vintage',
    type: 'frame',
    imageUrl: '/mise-en-page/bordures-cadres/7728b7aed75425389f30efef45692dcf.jpg',
    isBuiltIn: true,
  },
  {
    id: 'frame-ornate-4',
    name: 'Orné 4',
    category: 'floral',
    type: 'frame',
    imageUrl: '/mise-en-page/bordures-cadres/5bfa3a5b25677143ff53de8dbf5c06e0.jpg',
    isBuiltIn: true,
  },

  // === BORDURES DE PAGE ===
  {
    id: 'page-simple-black',
    name: 'Page simple noir',
    category: 'classic',
    type: 'page',
    imageUrl: createSimpleBorderSVG('#000000', 2, 0, 'solid'),
    isBuiltIn: true,
  },
  {
    id: 'page-elegant-gold',
    name: 'Page élégante dorée',
    category: 'elegant',
    type: 'page',
    imageUrl: createElegantBorderSVG(),
    isBuiltIn: true,
  },
  {
    id: 'page-vintage',
    name: 'Page vintage',
    category: 'vintage',
    type: 'page',
    imageUrl: createVintageBorderSVG('#8B4513'),
    isBuiltIn: true,
  },
  {
    id: 'page-floral',
    name: 'Page florale',
    category: 'floral',
    type: 'page',
    imageUrl: createFloralBorderSVG('#D4AF37', 'medium'),
    isBuiltIn: true,
  },
];

// Fonction pour obtenir une bordure par ID
export const getBorderById = (id: string): DecorativeBorder | undefined => {
  return PREDEFINED_BORDERS.find(b => b.id === id);
};

// Fonction pour obtenir les bordures par catégorie
export const getBordersByCategory = (category: DecorativeBorder['category']): DecorativeBorder[] => {
  return PREDEFINED_BORDERS.filter(b => b.category === category);
};

// Fonction pour obtenir les bordures par type
export const getBordersByType = (type: DecorativeBorder['type']): DecorativeBorder[] => {
  return PREDEFINED_BORDERS.filter(b => b.type === type);
};

// Fonction pour créer une bordure personnalisée à partir d'une image
export const createCustomBorder = (
  name: string,
  imageUrl: string,
  type: DecorativeBorder['type'] = 'frame'
): DecorativeBorder => {
  return {
    id: generateId(),
    name,
    category: 'custom',
    type,
    imageUrl,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
  };
};

// Catégories de bordures pour l'UI
export const BORDER_CATEGORIES = [
  { id: 'classic', label: 'Classique', icon: '🖼️' },
  { id: 'modern', label: 'Moderne', icon: '◻️' },
  { id: 'floral', label: 'Floral', icon: '🌸' },
  { id: 'vintage', label: 'Vintage', icon: '📜' },
  { id: 'elegant', label: 'Élégant', icon: '✨' },
  { id: 'custom', label: 'Personnalisé', icon: '➕' },
];
