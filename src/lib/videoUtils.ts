/**
 * Utilitaires pour la gestion des vidéos dans PhotoClass
 */

// Formats vidéo acceptés
export const VIDEO_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi'];

/**
 * Vérifie si un fichier est une vidéo
 */
export function isVideoFile(file: File): boolean {
  // Vérifier par type MIME
  if (VIDEO_FORMATS.includes(file.type)) {
    return true;
  }
  // Vérifier par extension
  const fileName = file.name.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => fileName.endsWith(ext));
}

/**
 * Vérifie si un type MIME est une vidéo
 */
export function isVideoMimeType(mimeType: string): boolean {
  return VIDEO_FORMATS.includes(mimeType) || mimeType.startsWith('video/');
}

/**
 * Extrait une vignette d'une vidéo à un timestamp donné
 * @param videoFile Le fichier vidéo
 * @param timeInSeconds Le moment où capturer la vignette (défaut: 1 seconde)
 * @returns Promise<string> URL data de la vignette en base64
 */
export function extractVideoThumbnail(videoFile: File, timeInSeconds: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    
    video.onloadedmetadata = () => {
      // S'assurer que le timestamp est valide
      const seekTime = Math.min(timeInSeconds, video.duration * 0.1); // Max 10% de la durée
      video.currentTime = seekTime;
    };
    
    video.onseeked = () => {
      // Définir la taille du canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Dessiner la frame sur le canvas
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convertir en base64
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Nettoyer
        URL.revokeObjectURL(videoUrl);
        
        resolve(thumbnailUrl);
      } else {
        reject(new Error('Impossible de créer le contexte canvas'));
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Erreur lors du chargement de la vidéo'));
    };
  });
}

/**
 * Extrait la durée d'une vidéo
 * @param videoFile Le fichier vidéo
 * @returns Promise<number> Durée en secondes
 */
export function getVideoDuration(videoFile: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(videoUrl);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Erreur lors du chargement de la vidéo'));
    };
  });
}

/**
 * Formate une durée en secondes en format lisible (MM:SS ou HH:MM:SS)
 * @param seconds Durée en secondes
 * @returns String formatée
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Traite un fichier vidéo et retourne les métadonnées
 * @param videoFile Le fichier vidéo
 * @returns Promise avec vignette, durée et URL
 */
export async function processVideoFile(videoFile: File): Promise<{
  thumbnailUrl: string;
  duration: number;
  videoUrl: string;
  format: string;
}> {
  // Extraire la vignette et la durée en parallèle
  const [thumbnailUrl, duration] = await Promise.all([
    extractVideoThumbnail(videoFile),
    getVideoDuration(videoFile)
  ]);
  
  // Créer une URL blob pour la lecture
  const videoUrl = URL.createObjectURL(videoFile);
  
  // Déterminer le format
  const extension = videoFile.name.split('.').pop()?.toUpperCase() || 'VIDEO';
  
  return {
    thumbnailUrl,
    duration,
    videoUrl,
    format: extension
  };
}

/**
 * Convertit une vidéo en base64 pour le stockage
 * ATTENTION: Les vidéos peuvent être très lourdes !
 * @param videoFile Le fichier vidéo
 * @returns Promise<string> URL data en base64
 */
export function videoToBase64(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsDataURL(videoFile);
  });
}

/**
 * Vérifie si la taille de la vidéo est acceptable pour le stockage local
 * @param videoFile Le fichier vidéo
 * @param maxSizeMB Taille maximale en MB (défaut: 50MB)
 * @returns boolean
 */
export function isVideoSizeAcceptable(videoFile: File, maxSizeMB: number = 50): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return videoFile.size <= maxSizeBytes;
}

/**
 * Retourne la taille du fichier formatée
 * @param bytes Taille en bytes
 * @returns String formatée (ex: "12.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
