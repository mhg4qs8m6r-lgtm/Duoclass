/**
 * Base de données IndexedDB (Dexie) côté client.
 * Toutes les photos, albums, catégories et projets créations sont stockés ici.
 */
import Dexie, { type Table } from 'dexie';
import type { PhotoFrame, AlbumMeta, Category, CategoryMediaType, Album } from '@/types/photo';
import { addToSyncQueue } from './syncService';

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
  /** Type du projet : Projet libre, Passe-partout modèle, Pêle-mêle modèle, etc. */
  projectType?: string;
  /** Catégorie du projet : en_cours, finis */
  projectCategory?: string;
  /** Timestamp du dernier envoi dans l'appli (sharedModeles) */
  sentToAppAt?: number;
  /** ID du modèle partagé correspondant (sharedModeles.id) */
  sentToAppModeleId?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CollecteurItem {
  id: string;
  photoUrl: string;
  name: string;
  thumbnail?: string;
  albumId?: string;
  albumName?: string;
  projectId?: string;
  widthCm?: number;
  heightCm?: number;
  addedAt: number;
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
  creations_projects!: Table<CreationsProject, string>;
  bibliotheque_items!: Table<BibliothequeItemDB, string>;
  collecteur!: Table<CollecteurItem, string>;

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
    // v3 : ajout de la table collecteur
    this.version(3).stores({
      album_metas: 'id, title, type, series, createdAt, categoryId',
      album_data: 'id, updatedAt',
      albums: 'id, title, type, series, createdAt, categoryId',
      categories: 'id, label, accessType',
      settings: 'id',
      creations_basket: 'id, addedAt, dateAdded',
      creations_projects: 'id, name, createdAt, updatedAt',
      bibliotheque_items: 'id, category, addedAt',
      collecteur: 'id, addedAt, projectId',
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
        id: 'cat_mes_projets',
        label: 'MES PROJETS',
        color: '#F59E0B',
        series: 'photoclass',
        accessType: 'standard',
        mediaType: 'mixed',
        isDefault: true,
      },
      {
        id: 'cat_creations',
        label: 'CRÉATIONS',
        color: '#8B5CF6',
        series: 'creations' as any,
        accessType: 'standard',
        mediaType: 'mixed',
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

    // Albums fixes de la section Créations (non effaçables)
    const creationsAlbums: AlbumMeta[] = [
      { id: 'album_creations_cliparts', title: 'Cliparts', type: 'standard', series: 'photoclass', createdAt: Date.now(), categoryId: 'cat_creations' },
      { id: 'album_creations_modeles_passe_partout', title: 'Modèles passe-partout', type: 'standard', series: 'photoclass', createdAt: Date.now(), categoryId: 'cat_creations' },
      { id: 'album_creations_modeles_pele_mele', title: 'Modèles pêle-mêle', type: 'standard', series: 'photoclass', createdAt: Date.now(), categoryId: 'cat_creations' },
      { id: 'album_creations_projets_en_cours', title: 'Projets en cours', type: 'standard', series: 'photoclass', createdAt: Date.now(), categoryId: 'cat_creations' },
      { id: 'album_creations_collages_finis', title: 'Collages finis', type: 'standard', series: 'photoclass', createdAt: Date.now(), categoryId: 'cat_creations' },
      { id: 'album_creations_montages_finis', title: 'Montages finis', type: 'standard', series: 'photoclass', createdAt: Date.now(), categoryId: 'cat_creations' },
      { id: 'album_creations_stickers', title: 'Stickers', type: 'standard', series: 'photoclass', createdAt: Date.now(), categoryId: 'cat_creations' },
      { id: 'album_creations_puzzle', title: 'Puzzle', type: 'standard', series: 'photoclass', createdAt: Date.now(), categoryId: 'cat_creations' },
    ];

    for (const album of creationsAlbums) {
      const exists = await db.album_metas.get(album.id);
      if (!exists) {
        await db.album_metas.put(album);
      }
    }
  } catch (err) {
    console.warn('[DB] initCategories error:', err);
  }
}

// ─── Helpers Collecteur ─────────────────────────────────────────────────────────

export async function addToCollecteur(
  items: Omit<CollecteurItem, 'id' | 'addedAt'> | Omit<CollecteurItem, 'id' | 'addedAt'>[],
): Promise<CollecteurItem[]> {
  const rawArray = Array.isArray(items) ? items : [items];
  const added: CollecteurItem[] = [];
  for (const raw of rawArray) {
    const newItem: CollecteurItem = {
      ...raw,
      id: `collecteur_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      addedAt: Date.now(),
    };
    await db.collecteur.put(newItem);
    added.push(newItem);
  }
  console.log("[DB] collecteur après ajout:", await db.collecteur.toArray());
  return added;
}

export async function removeFromCollecteur(id: string): Promise<void> {
  await db.collecteur.delete(id);
}

export async function clearCollecteur(): Promise<void> {
  await db.collecteur.clear();
}

export async function getCollecteur(): Promise<CollecteurItem[]> {
  return db.collecteur.orderBy('addedAt').toArray();
}

// ─── Helpers projets créations ─────────────────────────────────────────────────

export async function getAllCreationsProjects(): Promise<CreationsProject[]> {
  return db.creations_projects.orderBy('updatedAt').reverse().toArray();
}

export async function getCreationsProject(id: string): Promise<CreationsProject | undefined> {
  return db.creations_projects.get(id);
}

/** Sérialise un projet pour la sync serveur (inclut les items collecteur associés) */
async function projectToSyncData(p: CreationsProject) {
  // Récupérer les items collecteur liés à ce projet
  const collecteurItems = await db.collecteur.where('projectId').equals(p.id).toArray();
  return {
    localId: p.id,
    name: p.name,
    canvasElements: JSON.stringify(p.canvasElements ?? []),
    canvasData: p.canvasData ? JSON.stringify(p.canvasData) : undefined,
    photos: p.photos ? JSON.stringify(p.photos) : undefined,
    canvasFormat: p.canvasFormat,
    canvasFormatWidth: p.canvasFormatWidth,
    canvasFormatHeight: p.canvasFormatHeight,
    thumbnail: p.thumbnail,
    projectType: p.projectType,
    projectCategory: p.projectCategory,
    collecteurData: collecteurItems.length > 0 ? JSON.stringify(collecteurItems) : undefined,
  };
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
  addToSyncQueue({ entityType: 'project', action: 'create', data: await projectToSyncData(project) });
  return project;
}

export async function updateCreationsProject(
  projectOrId: string | CreationsProject,
  updates?: Partial<CreationsProject>,
): Promise<void> {
  if (typeof projectOrId === 'string') {
    await db.creations_projects.update(projectOrId, { ...updates, updatedAt: Date.now() });
    const updated = await db.creations_projects.get(projectOrId);
    if (updated) addToSyncQueue({ entityType: 'project', action: 'update', data: await projectToSyncData(updated) });
  } else {
    const full = { ...projectOrId, updatedAt: Date.now() };
    await db.creations_projects.put(full);
    addToSyncQueue({ entityType: 'project', action: 'update', data: await projectToSyncData(full) });
  }
}

export async function deleteCreationsProject(id: string): Promise<void> {
  // Supprimer le projet
  await db.creations_projects.delete(id);
  // Supprimer les items du collecteur associés à ce projet
  const collecteurItems = await db.collecteur.where('projectId').equals(id).toArray();
  if (collecteurItems.length > 0) {
    await db.collecteur.bulkDelete(collecteurItems.map(item => item.id));
  }
  // Nettoyer le localStorage auto-save s'il concerne ce projet
  try {
    const autoSave = localStorage.getItem('creations-atelier-autosave');
    if (autoSave) {
      const parsed = JSON.parse(autoSave);
      if (parsed.projectId === id) {
        localStorage.removeItem('creations-atelier-autosave');
      }
    }
  } catch {}
  addToSyncQueue({ entityType: 'project', action: 'delete', data: { localId: id } });
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

// ─── Helpers Bibliothèque (avec sync serveur) ───────────────────────────────

function biblioToSyncData(item: BibliothequeItemDB) {
  return {
    localId: item.id,
    category: item.category,
    type: item.type,
    name: item.name,
    url: item.url,
    thumbnail: item.thumbnail,
    fullImage: item.fullImage,
    sourcePhotoId: item.sourcePhotoId,
    addedAt: item.addedAt,
  };
}

export async function addBibliothequeItem(item: BibliothequeItemDB): Promise<void> {
  await db.bibliotheque_items.add(item);
  addToSyncQueue({ entityType: 'bibliotheque', action: 'create', data: biblioToSyncData(item) });
}

export async function deleteBibliothequeItemSync(id: string): Promise<void> {
  await db.bibliotheque_items.delete(id);
  addToSyncQueue({ entityType: 'bibliotheque', action: 'delete', data: { localId: id } });
}

export async function getAllBibliothequeItems(): Promise<BibliothequeItemDB[]> {
  return db.bibliotheque_items.toArray();
}
