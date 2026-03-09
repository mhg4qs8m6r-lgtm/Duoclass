import { db } from '../db';
import { PhotoFrame } from '../types/photo';

export interface DuplicateGroup {
  fileName: string;
  photos: DuplicatePhoto[];
}

export interface DuplicatePhoto {
  id: string; // Format: "albumId-frameId"
  frameId: number;
  albumId: string;
  albumName: string;
  photoUrl: string;
  originalName: string;
  size?: number;
}

/**
 * Détecte tous les doublons dans tous les albums
 * Un doublon est défini comme une photo ayant le même originalName
 */
export async function detectAllDuplicates(): Promise<DuplicateGroup[]> {
  try {
    // Récupérer tous les albums
    const allAlbums = await db.albums.toArray();
    const allAlbumsMeta = await db.album_metas.toArray();
    
    // Map pour accéder rapidement aux métadonnées des albums
    const albumMetaMap = new Map(allAlbumsMeta.map(meta => [meta.id, meta]));
    
    // Map pour regrouper les photos par nom de fichier
    const photosByName = new Map<string, DuplicatePhoto[]>();
    
    // Parcourir tous les albums et toutes les photos
    for (const album of allAlbums) {
      const albumMeta = albumMetaMap.get(album.id);
      if (!albumMeta) continue;
      
      for (const frame of (album.frames ?? [])) {
        // Ignorer les frames sans photo
        if (!frame.photoUrl) continue;
        
        // Utiliser title comme clé de détection (c'est le nom du fichier affiché)
        const fileName = frame.title || frame.originalName || `photo-${frame.id}`;
        
        const duplicatePhoto: DuplicatePhoto = {
          id: `${album.id}-${frame.id}`,
          frameId: frame.id,
          albumId: album.id,
          albumName: albumMeta.title,
          photoUrl: frame.photoUrl,
          originalName: fileName,
          size: frame.size
        };
        
        // Ajouter à la map groupée par nom de fichier
        const existing = photosByName.get(fileName) || [];
        existing.push(duplicatePhoto);
        photosByName.set(fileName, existing);
      }
    }
    
    // Filtrer pour ne garder que les groupes avec au moins 2 photos (doublons)
    const duplicateGroups: DuplicateGroup[] = [];
    
    photosByName.forEach((photos, fileName) => {
      if (photos.length >= 2) {
        duplicateGroups.push({
          fileName,
          photos
        });
      }
    });
    
    // Trier par nombre de doublons (du plus grand au plus petit)
    duplicateGroups.sort((a, b) => b.photos.length - a.photos.length);
    
    return duplicateGroups;
  } catch (error) {
    console.error('Erreur lors de la détection des doublons:', error);
    return [];
  }
}

/**
 * Supprime une photo spécifique d'un album
 */
export async function deletePhoto(albumId: string, frameId: number): Promise<boolean> {
  try {
    const album = await db.albums.get(albumId);
    if (!album) {
      console.error(`Album ${albumId} non trouvé`);
      return false;
    }
    
    // Filtrer pour supprimer la frame
    const updatedFrames = (album.frames ?? []).filter(frame => frame.id !== frameId);
    
    // Mettre à jour l'album
    await db.albums.update(albumId, {
      frames: updatedFrames,
      updatedAt: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression de la photo ${frameId} de l'album ${albumId}:`, error);
    return false;
  }
}

/**
 * Supprime plusieurs photos en batch
 */
export async function deleteMultiplePhotos(deletions: Array<{ albumId: string; frameId: number }>): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (const { albumId, frameId } of deletions) {
    const result = await deletePhoto(albumId, frameId);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  
  return { success, failed };
}
