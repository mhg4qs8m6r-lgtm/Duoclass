/**
 * Base de données IndexedDB (Dexie) côté client.
 * Toutes les photos, albums, catégories, panier et projets créations sont stockés ici.
 */
import Dexie, { type Table } from 'dexie';
import type { PhotoFrame, AlbumMeta, Category, CategoryMediaType, Album } from '@/types/photo';

// ─── Re-exports de types ───────────────────────────────────────────────────────

export type { AlbumMeta, PhotoFrame, Category, CategoryMediaType, Album };

// ─── Types supplémentaires ─────────────────────────────────────────────────────

export interface AlbumData {
  id: string;
  photos?: PhotoFrame[];
  /** Alias pour photos (compatibilité avec les albums de collage) */
  frames?: PhotoFrame[];
  updatedAt: number;
}

export interface AlbumSettings {
  id?: string; // 'global' pour les paramètres globaux
  /** Clé générique pour les paramètres clé/valeur */
  key?: string;
  /** Valeur générique */
  value?: unknown;
  displayMode?: string;
  thumbnailSize?: number;
  themeColor?: string;
  backgroundTexture?: string;
  language?: string;
  defaultPhotoSort?: string;
  defaultSortOrder?: string;
  autoCreateThumbnails?: boolean;
  detectDuplicates?: boolean;
  readExifData?: boolean;
  [key: string]: unknown;
}

export interface CreationsBasketItem {
  id: string;
  photoUrl: string;
  title?: string;
  /** Titre de la photo (alias pour compatibilité) */
  photoTitle?: string;
  albumId?: string;
  /** Nom de l'album source */
  albumName?: string;
  /** Vignette de la photo */
  thumbnail?: string;
  addedAt?: number;
  /** Alias pour addedAt (compatibilité) */
  dateAdded?: number;
}

export interface CreationsProject {
  id: string;
  name: string;
  canvasElements: unknown[];
  /** Données sérialisées du canvas (alias pour canvasElements) */
  canvasData?: unknown;
  /** Photos associées au projet (format souple pour la sauvegarde auto) */
  photos?: Array<PhotoFrame | Record<string, unknown>>;
  canvasFormat?: string;
  canvasFormatWidth?: number;
  canvasFormatHeight?: number;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BibliothequeItemDB {
  id: string;
  /** Catégorie principale (ex : 'cliparts', 'cadres', 'masques', 'arriere-plans', 'mes-elements') */
  category: 'cliparts' | 'cadres' | 'masques' | 'arriere-plans' | 'mes-elements';
  /** Sous-type optionnel (ex : 'sticker', 'frame', 'mask') */
  type?: string;
  name: string;
  /** URL de la vignette (aperçu réduit) */
  url: string;
  /** URL de la vignette (alias pour compatibilité) */
  thumbnail?: string;
  /** URL de l'image pleine résolution */
  fullImage?: string;
  sourcePhotoId?: string;
  addedAt?: number;
  createdAt?: number;
  [key: string]: unknown;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

export const MODELES_STICKERS_ALBUM_ID = 'album_modeles_stickers';

// ─── Classe Dexie ──────────────────────────────────────────────────────────────

class DuoClassDB extends Dexie {
  album_metas!: Table<AlbumMeta, string>;
  album_data!: Table<AlbumData, string>;
  albums!: Table<Album, string>;
  categories!: Table<Category, string>;
  settings!: Table<AlbumSettings, string>;
  creations_basket!: Table<CreationsBasketItem, string>;
  creations_projects!: Table<CreationsProject, string>;
  bibliotheque_items!: Table<BibliothequeItemDB, string>;

  constructor() {
    super('DuoClassDB');
    this.version(1).stores({
      album_metas: 'id, title, type, series, createdAt, categoryId',
      album_data: 'id, updatedAt',
      albums: 'id, title, type, series, createdAt, categoryId',
      categories: 'id, label, accessType',
      settings: 'id',
      creations_basket: 'id, addedAt',
      creations_projects: 'id, name, createdAt, updatedAt',
      bibliotheque_items: 'id, category, addedAt',
    });
    // v2 : ajout de l'index dateAdded sur creations_basket (alias de addedAt)
    this.version(2).stores({
      album_metas: 'id, title, type, series, createdAt, categoryId',
      album_data: 'id, updatedAt',
      albums: 'id, title, type, series, createdAt, categoryId',
      categories: 'id, label, accessType',
      settings: 'id',
      creations_basket: 'id, addedAt, dateAdded',
      creations_projects: 'id, name, createdAt, updatedAt',
      bibliotheque_items: 'id, category, addedAt',
    });
  }
}

export const db = new DuoClassDB();

// ─── Helpers catégories ────────────────────────────────────────────────────────

/**
 * Initialise les catégories et albums système au premier lancement.
 */
export async function initCategories(): Promise<void> {
  try {
    // Album Modèles Stickers
    const existing = await db.album_metas.get(MODELES_STICKERS_ALBUM_ID);
    if (!existing) {
      await db.album_metas.put({
        id: MODELES_STICKERS_ALBUM_ID,
        title: 'Modèles Stickers',
        type: 'standard',
        series: 'photoclass',
        createdAt: Date.now(),
      });
    }

    // 4 catégories NON CLASSEE par défaut (si absentes)
    const defaultCategories: Category[] = [
      {
        id: 'cat_nc_photos',
        label: 'NON CLASSEE',
        color: '#9CA3AF',
        series: 'photoclass',
        accessType: 'standard',
        mediaType: 'mixed',
        isDefault: true,
      },
      {
        id: 'cat_nc_docs',
        label: 'NON CLASSEE',
        color: '#9CA3AF',
        series: 'classpapiers',
        accessType: 'standard',
        mediaType: 'documents',
        isDefault: true,
      },
      {
        id: 'cat_sec_nc_photos',
        label: 'NON CLASSEE',
        color: '#9CA3AF',
        series: 'photoclass',
        accessType: 'secure',
        mediaType: 'mixed',
        isDefault: true,
      },
      {
        id: 'cat_sec_nc_docs',
        label: 'NON CLASSEE',
        color: '#9CA3AF',
        series: 'classpapiers',
        accessType: 'secure',
        mediaType: 'documents',
        isDefault: true,
      },
    ];

    for (const cat of defaultCategories) {
      const exists = await db.categories.get(cat.id);
      if (!exists) {
        await db.categories.add(cat);
      }
    }
  } catch (err) {
    console.warn('[DB] initCategories error:', err);
  }
}

// ─── Helpers panier créations ──────────────────────────────────────────────────

export async function getCreationsBasket(): Promise<CreationsBasketItem[]> {
  return db.creations_basket.orderBy('addedAt').toArray();
}

export interface AddToBasketResult {
  added: CreationsBasketItem[];
  duplicates: CreationsBasketItem[];
}

/** Type accepté par addToCreationsBasket : objet partiel avec au moins photoUrl */
export type BasketInput = Omit<CreationsBasketItem, 'id' | 'addedAt' | 'dateAdded'> & {
  id?: string;
  addedAt?: number;
  dateAdded?: number;
};

export async function addToCreationsBasket(
  items:
    | Omit<CreationsBasketItem, 'id' | 'addedAt' | 'dateAdded'>
    | Omit<CreationsBasketItem, 'id' | 'addedAt' | 'dateAdded'>[]
    | Omit<CreationsBasketItem, 'id' | 'dateAdded'>
    | Omit<CreationsBasketItem, 'id' | 'dateAdded'>[]
    | Record<string, unknown>
    | Record<string, unknown>[],
): Promise<AddToBasketResult> {
  const rawArray = Array.isArray(items) ? items : [items];
  const added: CreationsBasketItem[] = [];
  const duplicates: CreationsBasketItem[] = [];
  for (const raw of rawArray) {
    const item = raw as Partial<CreationsBasketItem> & { photoUrl: string };
    const id = (item as CreationsBasketItem).id ?? `basket_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const existing = await db.creations_basket.get(id);
    if (existing) {
      duplicates.push(existing);
    } else {
      const newItem: CreationsBasketItem = {
        ...item,
        id,
        addedAt: (item as CreationsBasketItem).addedAt ?? Date.now(),
      } as CreationsBasketItem;
      await db.creations_basket.put(newItem);
      added.push(newItem);
    }
  }
  return { added, duplicates };
}

export async function removeFromCreationsBasket(id: string): Promise<void> {
  await db.creations_basket.delete(id);
}

export async function clearCreationsBasket(): Promise<void> {
  await db.creations_basket.clear();
}

// ─── Helpers projets créations ─────────────────────────────────────────────────

export async function getAllCreationsProjects(): Promise<CreationsProject[]> {
  return db.creations_projects.orderBy('updatedAt').reverse().toArray();
}

export async function getCreationsProject(id: string): Promise<CreationsProject | undefined> {
  return db.creations_projects.get(id);
}

export async function createCreationsProject(
  nameOrProject: string | CreationsProject,
  id?: string,
): Promise<CreationsProject> {
  const project: CreationsProject =
    typeof nameOrProject === 'string'
      ? {
          id: id ?? `project_${Date.now()}`,
          name: nameOrProject,
          canvasElements: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      : nameOrProject;
  await db.creations_projects.put(project);
  return project;
}

export async function updateCreationsProject(
  projectOrId: string | CreationsProject,
  updates?: Partial<CreationsProject>,
): Promise<void> {
  if (typeof projectOrId === 'string') {
    await db.creations_projects.update(projectOrId, { ...updates, updatedAt: Date.now() });
  } else {
    // Objet complet passé directement
    await db.creations_projects.put({ ...projectOrId, updatedAt: Date.now() });
  }
}

export async function deleteCreationsProject(id: string): Promise<void> {
  await db.creations_projects.delete(id);
}

/**
 * Sauvegarde un collage comme photo dans un album.
 */
export async function saveCollageToAlbum(
  dataUrl: string,
  name: string,
  albumId?: string,
): Promise<void> {
  const targetAlbumId = albumId ?? 'album_mes_collages';
  const albumData = await db.album_data.get(targetAlbumId);
  const newPhoto: PhotoFrame = {
    id: Date.now(),
    title: name,
    isSelected: false,
    format: 'jpg',
    photoUrl: dataUrl,
    originalName: `${name}.jpg`,
  };
  if (albumData) {
    await db.album_data.update(targetAlbumId, {
      photos: [...(albumData.photos ?? []), newPhoto],
      updatedAt: Date.now(),
    });
  } else {
    await db.album_data.put({
      id: targetAlbumId,
      photos: [newPhoto],
      updatedAt: Date.now(),
    });
  }
  // Créer/mettre à jour les métadonnées de l'album
  const meta = await db.album_metas.get(targetAlbumId);
  if (!meta) {
    await db.album_metas.put({
      id: targetAlbumId,
      title: 'Mes Collages',
      type: 'standard',
      series: 'photoclass',
      createdAt: Date.now(),
    });
  }
}
