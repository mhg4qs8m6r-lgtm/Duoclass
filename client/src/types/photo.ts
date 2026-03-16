export type MediaType = 'photo' | 'video';

export interface PhotoFrame {
  id: number;
  title: string;
  isSelected: boolean;
  format: string;
  photoUrl: string | null;
  mediaType?: MediaType; // 'photo' ou 'video'
  videoUrl?: string | null; // URL de la vidéo originale (pour lecture)
  duration?: number; // Durée en secondes (pour les vidéos)
  thumbnailUrl?: string | null; // Vignette générée (pour les vidéos)
  rotation?: number; // Rotation de la photo (0, 90, 180, 270)
  originalName?: string; // Nom du fichier original (pour détection de doublons)
  size?: number; // Taille du fichier original en octets (pour détection de doublons)
  imageHash?: string; // Hash du contenu pour détection de doublons
  isVideo?: boolean; // Indicateur si c'est une vidéo (pour compatibilité Livre Photo)
  date?: string; // Date de la photo (pour affichage dans Livre Photo)
  [key: string]: any;
}

export type DisplayMode = "normal" | "half" | "twothirds";

export interface PhotoClassProps {
  zoomLevel?: number;
  setZoomLevel?: (level: number) => void;
  toolbarAction?: string | null;
  resetToolbarAction?: () => void;
  onTitleChange?: (title: string) => void;
  mode?: 'photo' | 'document';
  displayMode?: DisplayMode;
}

export interface AlbumMeta {
  id: string;
  title: string;
  type: "standard" | "secure" | "unclassified";
  series: "photoclass" | "classpapiers";
  createdAt: number;
  coverUrl?: string;
  password?: string;
  categoryId?: string;
}

export type CategoryMediaType = 'photos' | 'videos' | 'mixed' | 'documents';

export interface Category {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
  accessType: "standard" | "secure";
  mediaType?: CategoryMediaType; // Type de média de la catégorie
  iconUrl?: string; // URL d'une icône personnalisée
  /** Série associée (photoclass ou classpapiers) */
  series?: "photoclass" | "classpapiers";
}

export interface Album {
  id: string;
  title?: string;
  type?: "standard" | "secure" | "unclassified";
  series?: "photoclass" | "classpapiers";
  createdAt?: number;
  updatedAt?: number;
  coverUrl?: string;
  password?: string;
  categoryId?: string;
  count?: number;
  /** Photos/frames de l'album (pour les albums de collage) */
  frames?: PhotoFrame[];
  /** Nombre de doublons détectés */
  duplicates?: number;
}
