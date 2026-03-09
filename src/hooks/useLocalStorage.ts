import { useState, useEffect, useCallback } from 'react';
import { db, AlbumMeta, AlbumData } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';

// Limite de stockage : 500 Mo en octets
export const STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 Mo
export const STORAGE_WARNING_THRESHOLD = 0.8; // Alerte à 80%

export interface StorageInfo {
  usedBytes: number;
  limitBytes: number;
  usedPercentage: number;
  remainingBytes: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
  formattedUsed: string;
  formattedLimit: string;
  formattedRemaining: string;
}

/**
 * Formate une taille en octets en une chaîne lisible
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 o';
  
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estime la taille d'une chaîne base64 en octets
 */
function estimateBase64Size(base64String: string): number {
  if (!base64String) return 0;
  
  // Retirer le préfixe data:image/...;base64, s'il existe
  const base64Data = base64String.includes(',') 
    ? base64String.split(',')[1] 
    : base64String;
  
  if (!base64Data) return 0;
  
  // La taille réelle est environ 3/4 de la longueur de la chaîne base64
  const padding = (base64Data.match(/=+$/) || [''])[0].length;
  return Math.floor((base64Data.length * 3) / 4) - padding;
}

/**
 * Calcule la taille totale d'un album (frames avec photos/vidéos)
 */
async function calculateAlbumSize(albumId: string): Promise<number> {
  try {
    const albumData = await db.albums.get(albumId);
    if (!albumData || !albumData.frames) return 0;
    
    let totalSize = 0;
    
    for (const frame of albumData.frames) {
      // Utiliser la taille stockée si disponible
      if (frame.size && typeof frame.size === 'number') {
        totalSize += frame.size;
      } else {
        // Sinon, estimer à partir du base64
        if (frame.photoUrl) {
          totalSize += estimateBase64Size(frame.photoUrl);
        }
        if (frame.videoUrl) {
          totalSize += estimateBase64Size(frame.videoUrl);
        }
        if (frame.thumbnailUrl) {
          totalSize += estimateBase64Size(frame.thumbnailUrl);
        }
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error(`Erreur lors du calcul de la taille de l'album ${albumId}:`, error);
    return 0;
  }
}

/**
 * Hook pour gérer le stockage local des albums privés
 */
export function usePrivateAlbumsStorage(): StorageInfo & { 
  refresh: () => Promise<void>;
  canAddBytes: (bytes: number) => boolean;
} {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    usedBytes: 0,
    limitBytes: STORAGE_LIMIT_BYTES,
    usedPercentage: 0,
    remainingBytes: STORAGE_LIMIT_BYTES,
    isNearLimit: false,
    isAtLimit: false,
    formattedUsed: '0 o',
    formattedLimit: formatBytes(STORAGE_LIMIT_BYTES),
    formattedRemaining: formatBytes(STORAGE_LIMIT_BYTES),
  });

  // Récupérer les albums privés (type = 'secure')
  const secureAlbums = useLiveQuery(() => 
    db.album_metas.where('type').equals('secure').toArray()
  );

  const calculateStorage = useCallback(async () => {
    if (!secureAlbums) return;
    
    let totalUsed = 0;
    
    for (const album of secureAlbums) {
      const albumSize = await calculateAlbumSize(album.id);
      totalUsed += albumSize;
    }
    
    const usedPercentage = (totalUsed / STORAGE_LIMIT_BYTES) * 100;
    const remainingBytes = Math.max(0, STORAGE_LIMIT_BYTES - totalUsed);
    
    setStorageInfo({
      usedBytes: totalUsed,
      limitBytes: STORAGE_LIMIT_BYTES,
      usedPercentage,
      remainingBytes,
      isNearLimit: usedPercentage >= STORAGE_WARNING_THRESHOLD * 100,
      isAtLimit: totalUsed >= STORAGE_LIMIT_BYTES,
      formattedUsed: formatBytes(totalUsed),
      formattedLimit: formatBytes(STORAGE_LIMIT_BYTES),
      formattedRemaining: formatBytes(remainingBytes),
    });
  }, [secureAlbums]);

  useEffect(() => {
    calculateStorage();
  }, [calculateStorage]);

  const refresh = useCallback(async () => {
    await calculateStorage();
  }, [calculateStorage]);

  const canAddBytes = useCallback((bytes: number): boolean => {
    return (storageInfo.usedBytes + bytes) <= STORAGE_LIMIT_BYTES;
  }, [storageInfo.usedBytes]);

  return {
    ...storageInfo,
    refresh,
    canAddBytes,
  };
}

/**
 * Calcule la taille d'un fichier avant import
 */
export function getFileSize(file: File): number {
  return file.size;
}

/**
 * Vérifie si un fichier peut être ajouté sans dépasser la limite
 */
export async function canAddFile(file: File): Promise<boolean> {
  const secureAlbums = await db.album_metas.where('type').equals('secure').toArray();
  
  let totalUsed = 0;
  for (const album of secureAlbums) {
    totalUsed += await calculateAlbumSize(album.id);
  }
  
  return (totalUsed + file.size) <= STORAGE_LIMIT_BYTES;
}

/**
 * Vérifie si plusieurs fichiers peuvent être ajoutés sans dépasser la limite
 */
export async function canAddFiles(files: File[]): Promise<{ 
  canAdd: boolean; 
  totalSize: number;
  currentUsed: number;
  wouldExceedBy: number;
}> {
  const secureAlbums = await db.album_metas.where('type').equals('secure').toArray();
  
  let currentUsed = 0;
  for (const album of secureAlbums) {
    currentUsed += await calculateAlbumSize(album.id);
  }
  
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const wouldTotal = currentUsed + totalSize;
  const canAdd = wouldTotal <= STORAGE_LIMIT_BYTES;
  const wouldExceedBy = canAdd ? 0 : wouldTotal - STORAGE_LIMIT_BYTES;
  
  return {
    canAdd,
    totalSize,
    currentUsed,
    wouldExceedBy,
  };
}
