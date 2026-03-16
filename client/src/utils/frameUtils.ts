// Type pour le mode d'affichage
export type DisplayMode = "normal" | "half" | "twothirds";

// Facteurs de réduction pour chaque mode
export const displayModeFactors: Record<DisplayMode, number> = {
  normal: 1,
  half: 0.5,
  twothirds: 2/3
};

export const calculateFrameSize = (zoomLevel: number, displayMode: DisplayMode = "normal") => {
  // Formule unique et partagée pour la taille des cadres
  // zoomLevel est entre 0 et 100
  // Taille de base : 200px
  // Facteur de zoom réduit pour éviter un grossissement trop rapide
  // Ancien facteur : 3 (max 500px) -> Nouveau facteur : 1.5 (max 350px)
  const baseSize = 200 + (zoomLevel * 1.5);
  
  // Appliquer le facteur du mode d'affichage
  const factor = displayModeFactors[displayMode] || 1;
  return baseSize * factor;
};

export const FRAME_TITLE_HEIGHT = 40;
