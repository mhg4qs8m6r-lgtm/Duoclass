import { useState, useCallback, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseFaceDetectionReturn {
  isLoading: boolean;
  isModelLoaded: boolean;
  error: string | null;
  faces: FaceBox[];
  loadModels: () => Promise<void>;
  detectFaces: (imageElement: HTMLImageElement | HTMLCanvasElement) => Promise<FaceBox[]>;
  createFaceMask: (
    imageElement: HTMLImageElement | HTMLCanvasElement,
    faceBox: FaceBox,
    padding?: number,
    shape?: 'circle' | 'oval' | 'rectangle'
  ) => string | null;
}

export function useFaceDetection(): UseFaceDetectionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faces, setFaces] = useState<FaceBox[]>([]);
  const modelLoadedRef = useRef(false);

  const loadModels = useCallback(async () => {
    if (modelLoadedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Charger le modèle TinyFaceDetector (léger et rapide)
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      modelLoadedRef.current = true;
      setIsModelLoaded(true);
    } catch (err) {
      console.error('Erreur lors du chargement des modèles:', err);
      setError('Impossible de charger les modèles de détection de visage');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const detectFaces = useCallback(async (
    imageElement: HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceBox[]> => {
    if (!modelLoadedRef.current) {
      await loadModels();
    }

    setIsLoading(true);
    setError(null);

    try {
      // Détecter tous les visages dans l'image
      const detections = await faceapi.detectAllFaces(
        imageElement,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        })
      );

      const faceBoxes: FaceBox[] = detections.map(detection => ({
        x: detection.box.x,
        y: detection.box.y,
        width: detection.box.width,
        height: detection.box.height
      }));

      setFaces(faceBoxes);
      return faceBoxes;
    } catch (err) {
      console.error('Erreur lors de la détection des visages:', err);
      setError('Erreur lors de la détection des visages');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [loadModels]);

  const createFaceMask = useCallback((
    imageElement: HTMLImageElement | HTMLCanvasElement,
    faceBox: FaceBox,
    padding: number = 50,
    shape: 'circle' | 'oval' | 'rectangle' = 'oval'
  ): string | null => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Calculer les dimensions avec padding
      const paddedWidth = faceBox.width + padding * 2;
      const paddedHeight = faceBox.height + padding * 2;
      const paddedX = Math.max(0, faceBox.x - padding);
      const paddedY = Math.max(0, faceBox.y - padding);

      // Pour un cercle/ovale, on veut un carré/rectangle centré sur le visage
      let finalWidth: number, finalHeight: number, finalX: number, finalY: number;

      if (shape === 'circle') {
        // Carré pour le cercle
        const size = Math.max(paddedWidth, paddedHeight);
        finalWidth = size;
        finalHeight = size;
        finalX = faceBox.x + faceBox.width / 2 - size / 2;
        finalY = faceBox.y + faceBox.height / 2 - size / 2;
      } else {
        // Ovale ou rectangle
        finalWidth = paddedWidth;
        finalHeight = paddedHeight * 1.2; // Un peu plus haut pour inclure le front
        finalX = paddedX;
        finalY = paddedY - padding * 0.3;
      }

      // S'assurer qu'on ne dépasse pas les bords de l'image
      const imgWidth = imageElement instanceof HTMLImageElement 
        ? imageElement.naturalWidth 
        : imageElement.width;
      const imgHeight = imageElement instanceof HTMLImageElement 
        ? imageElement.naturalHeight 
        : imageElement.height;

      finalX = Math.max(0, Math.min(finalX, imgWidth - finalWidth));
      finalY = Math.max(0, Math.min(finalY, imgHeight - finalHeight));
      finalWidth = Math.min(finalWidth, imgWidth - finalX);
      finalHeight = Math.min(finalHeight, imgHeight - finalY);

      canvas.width = finalWidth;
      canvas.height = finalHeight;

      // Créer le masque selon la forme
      ctx.save();
      
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(finalWidth / 2, finalHeight / 2, finalWidth / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      } else if (shape === 'oval') {
        ctx.beginPath();
        ctx.ellipse(
          finalWidth / 2,
          finalHeight / 2,
          finalWidth / 2,
          finalHeight / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.closePath();
        ctx.clip();
      }
      // Pour rectangle, pas de clip nécessaire

      // Dessiner la portion de l'image
      ctx.drawImage(
        imageElement,
        finalX,
        finalY,
        finalWidth,
        finalHeight,
        0,
        0,
        finalWidth,
        finalHeight
      );

      ctx.restore();

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Erreur lors de la création du masque:', err);
      return null;
    }
  }, []);

  return {
    isLoading,
    isModelLoaded,
    error,
    faces,
    loadModels,
    detectFaces,
    createFaceMask
  };
}

export default useFaceDetection;
