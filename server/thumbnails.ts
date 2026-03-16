/**
 * Service de gestion des miniatures sur S3
 * Les miniatures sont stockées sur le serveur pour permettre la prévisualisation
 * sans avoir besoin des photos originales (qui restent en local)
 */

import { storagePut, storageGet } from './local-storage';

/**
 * Génère le chemin S3 pour une miniature
 */
export function getThumbnailPath(userId: number, photoLocalId: string): string {
  return `thumbnails/${userId}/${photoLocalId}.jpg`;
}

/**
 * Upload une miniature vers S3
 * @param userId - ID de l'utilisateur
 * @param photoLocalId - ID local de la photo
 * @param thumbnailData - Données de la miniature (base64 ou Buffer)
 * @returns URL de la miniature ou null en cas d'erreur
 */
export async function uploadThumbnail(
  userId: number,
  photoLocalId: string,
  thumbnailData: Buffer | Uint8Array | string
): Promise<{ url: string; key: string } | null> {
  try {
    const path = getThumbnailPath(userId, photoLocalId);
    
    // Si les données sont en base64, les convertir en Buffer
    let data: Buffer | Uint8Array | string = thumbnailData;
    if (typeof thumbnailData === 'string' && thumbnailData.startsWith('data:image')) {
      // Extraire les données base64 de l'URL data
      const base64Data = thumbnailData.split(',')[1];
      data = Buffer.from(base64Data, 'base64');
    }
    
    const result = await storagePut(path, data, 'image/jpeg');
    
    return {
      url: result.url,
      key: result.key,
    };
  } catch (error) {
    console.error('[Thumbnails] Failed to upload thumbnail:', error);
    return null;
  }
}

/**
 * Récupère l'URL d'une miniature depuis S3
 * @param userId - ID de l'utilisateur
 * @param photoLocalId - ID local de la photo
 * @returns URL de la miniature ou null si non trouvée
 */
export async function getThumbnailUrl(
  userId: number,
  photoLocalId: string
): Promise<string | null> {
  try {
    const path = getThumbnailPath(userId, photoLocalId);
    const result = await storageGet(path);
    return result.url;
  } catch (error) {
    console.error('[Thumbnails] Failed to get thumbnail URL:', error);
    return null;
  }
}

/**
 * Upload plusieurs miniatures en batch
 * @param userId - ID de l'utilisateur
 * @param thumbnails - Liste des miniatures à uploader
 * @returns Résultats de l'upload
 */
export async function uploadThumbnailsBatch(
  userId: number,
  thumbnails: Array<{ photoLocalId: string; data: Buffer | Uint8Array | string }>
): Promise<Array<{ photoLocalId: string; url: string | null; key: string | null; error?: string }>> {
  const results = await Promise.all(
    thumbnails.map(async (thumb) => {
      try {
        const result = await uploadThumbnail(userId, thumb.photoLocalId, thumb.data);
        if (result) {
          return {
            photoLocalId: thumb.photoLocalId,
            url: result.url,
            key: result.key,
          };
        }
        return {
          photoLocalId: thumb.photoLocalId,
          url: null,
          key: null,
          error: 'Upload failed',
        };
      } catch (error) {
        return {
          photoLocalId: thumb.photoLocalId,
          url: null,
          key: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );
  
  return results;
}
