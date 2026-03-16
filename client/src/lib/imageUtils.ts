/**
 * Convertit un fichier ou un blob en chaîne Base64.
 * Utile pour stocker des images dans IndexedDB ou LocalStorage.
 */
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Compresse une image avant de la convertir en Base64 pour économiser de l'espace.
 * Redimensionne l'image si elle dépasse maxDimension.
 */
export const compressImage = async (file: File, maxDimension = 1200, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionnement proportionnel
        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Impossible de créer le contexte canvas"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Conversion en JPEG compressé
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Génère un hash simple à partir d'une chaîne (algorithme djb2).
 * Rapide et suffisant pour la détection de doublons.
 */
export const simpleHash = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

/**
 * Génère un hash unique pour une image basé sur son contenu Base64.
 * Utilise la LONGUEUR du contenu comme critère principal (très fiable après compression).
 * @param base64 - Chaîne Base64 de l'image
 * @returns Hash unique de l'image
 */
export const generateImageHash = (base64: string): string => {
  if (!base64) return '';
  
  // Extraire uniquement le contenu Base64 (sans le préfixe data:image/...)
  const base64Start = base64.indexOf('base64,');
  const content = base64Start !== -1 ? base64.substring(base64Start + 7) : base64;
  
  // La longueur du Base64 est un indicateur très fiable
  // car deux images identiques compressées de la même façon ont la même taille
  const len = content.length;
  
  // Prendre un échantillon du début (les 200 premiers caractères sont stables)
  const sampleStart = content.substring(0, Math.min(200, len));
  
  // Créer un hash basé sur la longueur et l'échantillon
  const lengthBucket = Math.floor(len / 100); // Arrondir à la centaine près
  const sampleHash = simpleHash(sampleStart);
  
  return `${lengthBucket}-${sampleHash}`;
};

/**
 * Vérifie si une image est un doublon en comparant son hash avec les hashs existants.
 * Utilise une comparaison avec tolérance pour les variations mineures.
 * @param newHash - Hash de la nouvelle image
 * @param existingHashes - Liste des hashs existants
 * @returns true si c'est un doublon, false sinon
 */
export const isDuplicateImage = (newHash: string, existingHashes: string[]): boolean => {
  if (!newHash || existingHashes.length === 0) return false;
  
  // Comparaison exacte d'abord
  if (existingHashes.includes(newHash)) return true;
  
  // Comparaison avec tolérance sur la longueur
  const [newLengthStr, newSampleHash] = newHash.split('-');
  const newLength = parseInt(newLengthStr, 10);
  
  for (const existingHash of existingHashes) {
    const [existingLengthStr, existingSampleHash] = existingHash.split('-');
    const existingLength = parseInt(existingLengthStr, 10);
    
    // Tolérance de 1% sur la longueur (pour les variations de compression)
    const tolerance = Math.max(newLength, existingLength) * 0.01;
    if (Math.abs(newLength - existingLength) <= tolerance) {
      // Si les longueurs sont proches, vérifier l'échantillon
      if (newSampleHash === existingSampleHash) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Compare deux chaînes Base64 pour déterminer si elles représentent la même image.
 * Utilise plusieurs critères pour une détection robuste.
 * @param base64A - Première chaîne Base64
 * @param base64B - Deuxième chaîne Base64
 * @returns true si les images sont identiques ou très similaires
 */
export const areImagesIdentical = (base64A: string, base64B: string): boolean => {
  if (!base64A || !base64B) return false;
  
  // Comparaison exacte
  if (base64A === base64B) return true;
  
  // Extraire le contenu sans préfixe
  const getContent = (b64: string) => {
    const start = b64.indexOf('base64,');
    return start !== -1 ? b64.substring(start + 7) : b64;
  };
  
  const contentA = getContent(base64A);
  const contentB = getContent(base64B);
  
  // Comparaison par longueur (tolérance 0.5%)
  const lenA = contentA.length;
  const lenB = contentB.length;
  const lenDiff = Math.abs(lenA - lenB);
  const maxLen = Math.max(lenA, lenB);
  
  if (lenDiff > maxLen * 0.005) {
    return false; // Trop différent en taille
  }
  
  // Comparaison des premiers 500 caractères (très fiable)
  const sampleA = contentA.substring(0, 500);
  const sampleB = contentB.substring(0, 500);
  
  return sampleA === sampleB;
};
