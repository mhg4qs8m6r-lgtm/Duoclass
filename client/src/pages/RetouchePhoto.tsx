import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { removeBackground } from '@imgly/background-removal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Loader2, Check, X } from 'lucide-react';
import QuitConfirmModal from '@/components/QuitConfirmModal';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type RetouchFunction = {
  id: number;
  name: string;
  nameEn: string;
  category: string;
  categoryEn: string;
};

type CropRatio = 'free' | '1:1' | '4:3' | '3:2' | '16:9';
type DragMode = 'none' | 'move' | 'nw' | 'ne' | 'sw' | 'se';

// ─── Constantes ──────────────────────────────────────────────────────────────
const GROUP1_IDS = [1, 2, 3, 4, 5, 6, 7];
const GROUP2_IDS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const retouchFunctions: RetouchFunction[] = [
  // Groupe 1 — Amélioration
  { id: 1, name: "Qualité, netteté, couleurs", nameEn: "Quality, sharpness, colors", category: "Amélioration", categoryEn: "Enhancement" },
  { id: 2, name: "Agrandissement d'image", nameEn: "Image enlargement", category: "Amélioration", categoryEn: "Enhancement" },
  { id: 3, name: "Correction yeux rouges", nameEn: "Red eye correction", category: "Amélioration", categoryEn: "Enhancement" },
  { id: 4, name: "Luminosité", nameEn: "Brightness", category: "Amélioration", categoryEn: "Enhancement" },
  { id: 5, name: "Réduction du bruit", nameEn: "Noise reduction", category: "Amélioration", categoryEn: "Enhancement" },
  { id: 6, name: "Correction de l'exposition", nameEn: "Exposure correction", category: "Amélioration", categoryEn: "Enhancement" },
  { id: 7, name: "Recadrage", nameEn: "Crop", category: "Amélioration", categoryEn: "Enhancement" },
  // Groupe 2 — Effets artistiques
  { id: 8,  name: "Noir & Blanc", nameEn: "Black & White", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 9,  name: "Sépia", nameEn: "Sepia", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 10, name: "Vintage", nameEn: "Vintage", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 11, name: "Aquarelle", nameEn: "Watercolor", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 12, name: "Peinture à l'huile", nameEn: "Oil painting", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 13, name: "Dessin au trait", nameEn: "Line drawing", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 14, name: "Sketch / Crayon", nameEn: "Sketch / Pencil", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 15, name: "Gravure", nameEn: "Engraving", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 16, name: "Pop Art", nameEn: "Pop Art", category: "Effets artistiques", categoryEn: "Artistic effects" },
  { id: 17, name: "HDR", nameEn: "HDR", category: "Effets artistiques", categoryEn: "Artistic effects" },
  // Groupe 3 — Nettoyage
  { id: 18, name: "Suppression d'arrière-plan", nameEn: "Background removal", category: "Nettoyage", categoryEn: "Cleaning" },
  // Groupe 4 — Restauration
  { id: 19, name: "Photo NB / couleur", nameEn: "B&W / color photo", category: "Restauration", categoryEn: "Restoration" },
];

const categories = [
  { fr: "Amélioration", en: "Enhancement" },
  { fr: "Effets artistiques", en: "Artistic effects" },
  { fr: "Nettoyage", en: "Cleaning" },
  { fr: "Restauration", en: "Restoration" },
];

const CROP_RATIOS: { label: string; value: CropRatio }[] = [
  { label: 'Libre', value: 'free' },
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '3:2', value: '3:2' },
  { label: '16:9', value: '16:9' },
];

// ─── Fonctions de traitement d'image (Groupe 1 — construites à neuf) ─────────

/** Charge une image depuis une URL/dataURL et retourne un HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Crée un canvas à partir d'une image chargée */
function imageToCanvas(img: HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

/** Box blur séparable (horizontal puis vertical) */
function boxBlur(src: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const tmp = new Uint8ClampedArray(src);
  const out = new Uint8ClampedArray(src);
  const d = radius * 2 + 1;
  // Passe horizontale
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0, count = 0;
      for (let dx = 0; dx <= radius; dx++) {
        sum += src[(y * w + dx) * 4 + c];
        count++;
      }
      tmp[(y * w) * 4 + c] = sum / count;
      for (let x = 1; x < w; x++) {
        const addX = x + radius, remX = x - radius - 1;
        if (addX < w) { sum += src[(y * w + addX) * 4 + c]; count++; }
        if (remX >= 0) { sum -= src[(y * w + remX) * 4 + c]; count--; }
        tmp[(y * w + x) * 4 + c] = sum / count;
      }
    }
  }
  // Passe verticale
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0, count = 0;
      for (let dy = 0; dy <= radius; dy++) {
        sum += tmp[(dy * w + x) * 4 + c];
        count++;
      }
      out[x * 4 + c] = sum / count;
      for (let y = 1; y < h; y++) {
        const addY = y + radius, remY = y - radius - 1;
        if (addY < h) { sum += tmp[(addY * w + x) * 4 + c]; count++; }
        if (remY >= 0) { sum -= tmp[(remY * w + x) * 4 + c]; count--; }
        out[(y * w + x) * 4 + c] = sum / count;
      }
    }
  }
  return out;
}

/** 1. Qualité, netteté, couleurs — amélioration automatique globale */
async function processAutoEnhance(src: string): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx } = imageToCanvas(img);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width, h = canvas.height;

  // a) Auto-levels : étirer l'histogramme (2e et 98e percentiles)
  const histo = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histo[lum]++;
  }
  const totalPixels = w * h;
  const lo2 = totalPixels * 0.02, hi98 = totalPixels * 0.98;
  let cumul = 0, lo = 0, hi = 255;
  for (let i = 0; i < 256; i++) { cumul += histo[i]; if (cumul >= lo2) { lo = i; break; } }
  cumul = 0;
  for (let i = 0; i < 256; i++) { cumul += histo[i]; if (cumul >= hi98) { hi = i; break; } }
  if (hi <= lo) { hi = lo + 1; }
  const range = hi - lo;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, Math.max(0, ((data[i] - lo) / range) * 255));
    data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - lo) / range) * 255));
    data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - lo) / range) * 255));
  }

  // b) Contraste léger (1.12)
  const cf = 1.12;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, Math.max(0, (data[i] - 128) * cf + 128));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * cf + 128));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * cf + 128));
  }

  // c) Saturation boost (1.18)
  const sf = 1.18;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i]     = Math.min(255, Math.max(0, gray + sf * (data[i] - gray)));
    data[i + 1] = Math.min(255, Math.max(0, gray + sf * (data[i + 1] - gray)));
    data[i + 2] = Math.min(255, Math.max(0, gray + sf * (data[i + 2] - gray)));
  }

  // d) Unsharp mask (netteté) : original + 0.5 * (original - blur)
  ctx.putImageData(imageData, 0, 0);
  const sharpData = ctx.getImageData(0, 0, w, h);
  const blurred = boxBlur(sharpData.data, w, h, 2);
  const amount = 0.5;
  for (let i = 0; i < sharpData.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = sharpData.data[i + c];
      const diff = orig - blurred[i + c];
      sharpData.data[i + c] = Math.min(255, Math.max(0, orig + amount * diff));
    }
  }
  ctx.putImageData(sharpData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** 2. Agrandissement d'image — upscale ×2 avec interpolation haute qualité + netteté */
async function processUpscale(src: string): Promise<string> {
  const img = await loadImage(src);
  const w2 = img.naturalWidth * 2, h2 = img.naturalHeight * 2;
  const canvas = document.createElement('canvas');
  canvas.width = w2;
  canvas.height = h2;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w2, h2);

  // Léger unsharp mask pour compenser le flou de l'upscale
  const imageData = ctx.getImageData(0, 0, w2, h2);
  const blurred = boxBlur(imageData.data, w2, h2, 1);
  const amount = 0.35;
  for (let i = 0; i < imageData.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = imageData.data[i + c];
      imageData.data[i + c] = Math.min(255, Math.max(0, orig + amount * (orig - blurred[i + c])));
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** 3. Correction yeux rouges — détection HSL des pixels rouges et désaturation */
async function processRedEye(src: string): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx } = imageToCanvas(img);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const delta = max - min;
    if (delta === 0) continue;
    // Teinte (hue)
    let hue = 0;
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = ((hue * 60) + 360) % 360;
    // Saturation
    const lightness = (max + min) / 2;
    const sat = delta / (255 - Math.abs(2 * lightness - 255));
    // Détecter rouge vif : hue [0,25] ou [340,360], sat > 0.4, lightness [40,200]
    const isRed = (hue <= 25 || hue >= 340) && sat > 0.4 && lightness > 40 && lightness < 200 && r > 80;
    if (isRed) {
      // Remplacer le rouge par la moyenne de G et B (aspect naturel gris-brun)
      const avg = Math.round((g + b) / 2);
      data[i] = Math.min(255, Math.round(avg * 0.85));
      data[i + 1] = Math.min(255, Math.round(g * 1.05));
      data[i + 2] = Math.min(255, Math.round(b * 1.05));
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** 4. Luminosité — ajuster la luminosité pixel par pixel */
async function processBrightness(src: string, value: number): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx } = imageToCanvas(img);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // value de -100 à +100, mappé à -128 à +128
  const offset = Math.round(value * 1.28);
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, Math.max(0, data[i] + offset));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + offset));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + offset));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** 5. Réduction du bruit — filtre médian 3×3 */
async function processDenoise(src: string): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx } = imageToCanvas(img);
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const result = new Uint8ClampedArray(data);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const vals: number[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            vals.push(data[((y + dy) * w + (x + dx)) * 4 + c]);
          }
        }
        // Tri rapide pour 9 éléments (insertion sort)
        for (let a = 1; a < 9; a++) {
          const key = vals[a];
          let b = a - 1;
          while (b >= 0 && vals[b] > key) { vals[b + 1] = vals[b]; b--; }
          vals[b + 1] = key;
        }
        result[(y * w + x) * 4 + c] = vals[4]; // médiane
      }
      result[(y * w + x) * 4 + 3] = data[(y * w + x) * 4 + 3]; // alpha inchangé
    }
  }
  ctx.putImageData(new ImageData(result, w, h), 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** 6. Correction de l'exposition — correction gamma */
async function processExposure(src: string, gamma: number): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx } = imageToCanvas(img);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // Table de lookup pour performance
  const lut = new Uint8Array(256);
  const invGamma = 1.0 / gamma;
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.min(255, Math.max(0, Math.round(255 * Math.pow(i / 255, invGamma))));
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** 7. Recadrage — découper selon un rectangle (en % de l'image) */
async function processCrop(
  src: string,
  crop: { x: number; y: number; w: number; h: number }
): Promise<string> {
  const img = await loadImage(src);
  const nw = img.naturalWidth, nh = img.naturalHeight;
  const sx = Math.round(crop.x / 100 * nw);
  const sy = Math.round(crop.y / 100 * nh);
  const sw = Math.round(crop.w / 100 * nw);
  const sh = Math.round(crop.h / 100 * nh);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, sw);
  canvas.height = Math.max(1, sh);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/jpeg', 0.92);
}

// ─── Effets artistiques (Groupe 2 — construits à neuf) ───────────────────────

type ArtisticId = 'noir-blanc' | 'sepia' | 'vintage' | 'aquarelle' | 'peinture' | 'trait' | 'sketch' | 'gravure' | 'popart' | 'hdr';

async function processArtistic(src: string, effect: ArtisticId): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx } = imageToCanvas(img);
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  switch (effect) {
    case 'noir-blanc': {
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      break;
    }
    case 'sepia': {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        data[i]     = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
      break;
    }
    case 'vintage': {
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = Math.min(255, data[i] * 1.08 + 18);
        data[i + 1] = Math.min(255, data[i + 1] * 0.92 + 8);
        data[i + 2] = Math.min(255, data[i + 2] * 0.78 + 5);
        // Léger fondu (réduction contraste)
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i]     = data[i] * 0.85 + gray * 0.15;
        data[i + 1] = data[i + 1] * 0.85 + gray * 0.15;
        data[i + 2] = data[i + 2] * 0.85 + gray * 0.15;
      }
      break;
    }
    case 'aquarelle': {
      // Aquarelle réaliste : flou fort multi-passe + contours préservés + couleurs diffusées
      // 1) Flou progressif (3 passes de box blur pour approcher un Gaussien)
      let blurred = boxBlur(data, w, h, 6);
      blurred = boxBlur(blurred, w, h, 6);
      blurred = boxBlur(blurred, w, h, 4);

      // 2) Détection des contours (Sobel) pour préserver les bords
      const grayOrig = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        grayOrig[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      }
      const edges = new Float32Array(w * h);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const gx = -grayOrig[idx - w - 1] + grayOrig[idx - w + 1]
                    - 2 * grayOrig[idx - 1] + 2 * grayOrig[idx + 1]
                    - grayOrig[idx + w - 1] + grayOrig[idx + w + 1];
          const gy = -grayOrig[idx - w - 1] - 2 * grayOrig[idx - w] - grayOrig[idx - w + 1]
                    + grayOrig[idx + w - 1] + 2 * grayOrig[idx + w] + grayOrig[idx + w + 1];
          edges[idx] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 180);
        }
      }

      // 3) Mélange : zones plates → très floues (aquarelle), bords → plus nets
      for (let i = 0; i < w * h; i++) {
        const pi = i * 4;
        const edgeStrength = edges[i];
        // Plus le bord est fort, plus on garde l'original (bord aquarelle visible)
        const blendBlur = 1 - edgeStrength * 0.7;
        for (let c = 0; c < 3; c++) {
          data[pi + c] = data[pi + c] * (1 - blendBlur) + blurred[pi + c] * blendBlur;
        }
      }

      // 4) Légère quantification des couleurs (aspect pigments)
      const qLevels = 24;
      const qStep = 256 / qLevels;
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          data[i + c] = Math.round(data[i + c] / qStep) * qStep;
        }
      }

      // 5) Saturation douce + éclaircissement (papier blanc qui transparaît)
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const sf = 1.35;
        data[i]     = Math.min(255, Math.max(0, gray + sf * (data[i] - gray) + 12));
        data[i + 1] = Math.min(255, Math.max(0, gray + sf * (data[i + 1] - gray) + 12));
        data[i + 2] = Math.min(255, Math.max(0, gray + sf * (data[i + 2] - gray) + 12));
      }

      // 6) Assombrir légèrement les contours (trait au pinceau)
      for (let i = 0; i < w * h; i++) {
        const pi = i * 4;
        const e = edges[i];
        if (e > 0.15) {
          const darken = 1 - e * 0.45;
          data[pi]     *= darken;
          data[pi + 1] *= darken;
          data[pi + 2] *= darken;
        }
      }
      break;
    }
    case 'peinture': {
      // Peinture à l'huile : Kuwahara-like filter (moyenne de la zone la plus homogène)
      // Simule les coups de pinceau qui suivent les zones de couleur uniforme
      const radius = 5;
      const result = new Uint8ClampedArray(data);

      for (let y = radius; y < h - radius; y++) {
        for (let x = radius; x < w - radius; x++) {
          const pi = (y * w + x) * 4;
          // Diviser le voisinage en 4 quadrants
          let bestVar = Infinity;
          let bestR = 0, bestG = 0, bestB = 0;

          for (let qy = 0; qy < 2; qy++) {
            for (let qx = 0; qx < 2; qx++) {
              let sumR = 0, sumG = 0, sumB = 0;
              let sumR2 = 0, sumG2 = 0, sumB2 = 0;
              let count = 0;
              const startY = qy === 0 ? y - radius : y;
              const endY   = qy === 0 ? y : y + radius;
              const startX = qx === 0 ? x - radius : x;
              const endX   = qx === 0 ? x : x + radius;

              for (let sy = startY; sy <= endY; sy++) {
                for (let sx = startX; sx <= endX; sx++) {
                  const si = (sy * w + sx) * 4;
                  const r = data[si], g = data[si + 1], b = data[si + 2];
                  sumR += r; sumG += g; sumB += b;
                  sumR2 += r * r; sumG2 += g * g; sumB2 += b * b;
                  count++;
                }
              }

              const meanR = sumR / count, meanG = sumG / count, meanB = sumB / count;
              const variance = (sumR2 / count - meanR * meanR)
                             + (sumG2 / count - meanG * meanG)
                             + (sumB2 / count - meanB * meanB);

              if (variance < bestVar) {
                bestVar = variance;
                bestR = meanR; bestG = meanG; bestB = meanB;
              }
            }
          }

          result[pi]     = bestR;
          result[pi + 1] = bestG;
          result[pi + 2] = bestB;
        }
      }

      // Appliquer le résultat Kuwahara
      for (let i = 0; i < data.length; i++) data[i] = result[i];

      // Saturation boost pour couleurs huile vives
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const sf = 1.3;
        data[i]     = Math.min(255, Math.max(0, gray + sf * (data[i] - gray)));
        data[i + 1] = Math.min(255, Math.max(0, gray + sf * (data[i + 1] - gray)));
        data[i + 2] = Math.min(255, Math.max(0, gray + sf * (data[i + 2] - gray)));
      }

      // Léger contraste pour renforcer la texture
      const cf = 1.12;
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = Math.min(255, Math.max(0, (data[i] - 128) * cf + 128));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * cf + 128));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * cf + 128));
      }
      break;
    }
    case 'trait': {
      // Détection de contours (Sobel simplifié) → dessin au trait noir sur fond blanc
      const grayData = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        grayData[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      }
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const gx = -grayData[idx - w - 1] + grayData[idx - w + 1]
                    - 2 * grayData[idx - 1] + 2 * grayData[idx + 1]
                    - grayData[idx + w - 1] + grayData[idx + w + 1];
          const gy = -grayData[idx - w - 1] - 2 * grayData[idx - w] - grayData[idx - w + 1]
                    + grayData[idx + w - 1] + 2 * grayData[idx + w] + grayData[idx + w + 1];
          const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
          const v = 255 - mag; // Inverser : traits noirs sur fond blanc
          const pi = idx * 4;
          data[pi] = data[pi + 1] = data[pi + 2] = v;
        }
      }
      break;
    }
    case 'sketch': {
      // Négatif flou + blend dodge → effet crayon
      const grayArr = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i += 4) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        grayArr[i] = grayArr[i + 1] = grayArr[i + 2] = g;
        grayArr[i + 3] = 255;
      }
      // Négatif flou
      const inverted = new Uint8ClampedArray(grayArr.length);
      for (let i = 0; i < grayArr.length; i += 4) {
        inverted[i] = 255 - grayArr[i];
        inverted[i + 1] = 255 - grayArr[i + 1];
        inverted[i + 2] = 255 - grayArr[i + 2];
        inverted[i + 3] = 255;
      }
      const blurredInv = boxBlur(inverted, w, h, 10);
      // Color dodge blend
      for (let i = 0; i < data.length; i += 4) {
        const base = grayArr[i];
        const blend = blurredInv[i];
        const v = blend === 255 ? 255 : Math.min(255, (base * 256) / (256 - blend));
        data[i] = data[i + 1] = data[i + 2] = v;
      }
      break;
    }
    case 'gravure': {
      // Lignes horizontales dont l'épaisseur varie avec la luminosité
      const lineSpacing = 4;
      for (let y = 0; y < h; y++) {
        const linePhase = y % lineSpacing;
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const threshold = (gray / 255) * lineSpacing;
          const v = linePhase < threshold ? 255 : 0;
          data[idx] = data[idx + 1] = data[idx + 2] = v;
        }
      }
      break;
    }
    case 'popart': {
      // Postérisation forte (4 niveaux) + saturation extrême
      const levels = 4;
      const step = 256 / levels;
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = Math.round(data[i] / step) * step;
        data[i + 1] = Math.round(data[i + 1] / step) * step;
        data[i + 2] = Math.round(data[i + 2] / step) * step;
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const sf = 2.0;
        data[i]     = Math.min(255, Math.max(0, gray + sf * (data[i] - gray)));
        data[i + 1] = Math.min(255, Math.max(0, gray + sf * (data[i + 1] - gray)));
        data[i + 2] = Math.min(255, Math.max(0, gray + sf * (data[i + 2] - gray)));
      }
      break;
    }
    case 'hdr': {
      // Tone mapping local : renforcer les détails dans les ombres et hautes lumières
      const blurred = boxBlur(data, w, h, 15);
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          const orig = data[i + c], local = blurred[i + c];
          // Rehausser le contraste local
          const detail = orig - local;
          data[i + c] = Math.min(255, Math.max(0, orig + detail * 1.5));
        }
        // Saturation boost
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i]     = Math.min(255, Math.max(0, gray + 1.3 * (data[i] - gray)));
        data[i + 1] = Math.min(255, Math.max(0, gray + 1.3 * (data[i + 1] - gray)));
        data[i + 2] = Math.min(255, Math.max(0, gray + 1.3 * (data[i + 2] - gray)));
      }
      break;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

// ─── Composant principal ─────────────────────────────────────────────────────

interface RetouchePhotoProps {
  imageUrl: string;
  imageTitle: string;
  imageComments: string;
  albumId: string;
  frameId: number;
  onSaveAsCopy: (newImageUrl: string, newTitle: string) => void;
  onClose: () => void;
}

export default function RetouchePhoto({
  imageUrl,
  imageTitle,
  imageComments,
  albumId,
  frameId,
  onSaveAsCopy,
  onClose,
}: RetouchePhotoProps) {
  const { language } = useLanguage();
  const fr = language === 'fr';

  // ── État général ──
  const [selectedFunction, setSelectedFunction] = useState<number | null>(null);
  const [originalPhoto] = useState<string>(imageUrl);
  const [retouchedPhoto, setRetouchedPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState(imageTitle);
  const [comments, setComments] = useState(imageComments);
  const [isSelected, setIsSelected] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);

  // ── État Groupe 1 : avant/après ──
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [comparisonPos, setComparisonPos] = useState(50);
  const comparisonRef = useRef<HTMLDivElement>(null);

  // ── État luminosité (slider) ──
  const [brightnessVal, setBrightnessVal] = useState(0);

  // ── État exposition (slider) ──
  const [exposureVal, setExposureVal] = useState(1.0);

  // ── État recadrage ──
  const [crop, setCrop] = useState({ x: 5, y: 5, w: 90, h: 90 });
  const [cropRatio, setCropRatio] = useState<CropRatio>('free');
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const dragModeRef = useRef<DragMode>('none');
  const dragStartRef = useRef<{ mx: number; my: number; crop: typeof crop } | null>(null);

  // ── Helpers ──
  const isGroup1 = selectedFunction !== null && GROUP1_IDS.includes(selectedFunction);
  const isGroup2 = selectedFunction !== null && GROUP2_IDS.includes(selectedFunction);
  const isInteractiveGroup = isGroup1 || isGroup2;
  const isSliderEffect = selectedFunction === 4 || selectedFunction === 6;
  const isCropEffect = selectedFunction === 7;
  const isAutoEffect = isInteractiveGroup && !isSliderEffect && !isCropEffect;

  // Reset l'état Groupe 1 quand on change d'effet
  const resetGroup1State = useCallback(() => {
    setPreviewUrl(null);
    setComparisonPos(50);
    setBrightnessVal(0);
    setExposureVal(1.0);
    setCrop({ x: 5, y: 5, w: 90, h: 90 });
    setCropRatio('free');
  }, []);

  // ── Traitement auto pour Groupes 1 & 2 ──
  const processAutoEffect = useCallback(async (funcId: number) => {
    setIsProcessing(true);
    try {
      let result: string;
      switch (funcId) {
        // Groupe 1
        case 1: result = await processAutoEnhance(originalPhoto); break;
        case 2: result = await processUpscale(originalPhoto); break;
        case 3: result = await processRedEye(originalPhoto); break;
        case 5: result = await processDenoise(originalPhoto); break;
        // Groupe 2 — Effets artistiques
        case 8:  result = await processArtistic(originalPhoto, 'noir-blanc'); break;
        case 9:  result = await processArtistic(originalPhoto, 'sepia'); break;
        case 10: result = await processArtistic(originalPhoto, 'vintage'); break;
        case 11: result = await processArtistic(originalPhoto, 'aquarelle'); break;
        case 12: result = await processArtistic(originalPhoto, 'peinture'); break;
        case 13: result = await processArtistic(originalPhoto, 'trait'); break;
        case 14: result = await processArtistic(originalPhoto, 'sketch'); break;
        case 15: result = await processArtistic(originalPhoto, 'gravure'); break;
        case 16: result = await processArtistic(originalPhoto, 'popart'); break;
        case 17: result = await processArtistic(originalPhoto, 'hdr'); break;
        default: return;
      }
      setPreviewUrl(result);
    } catch (err) {
      console.error('Erreur traitement:', err);
      toast.error(fr ? 'Erreur lors du traitement' : 'Processing error');
    } finally {
      setIsProcessing(false);
    }
  }, [originalPhoto, fr]);

  // Lancer le traitement quand un effet auto est sélectionné
  useEffect(() => {
    if (isAutoEffect && selectedFunction) {
      processAutoEffect(selectedFunction);
    }
  }, [selectedFunction, isAutoEffect, processAutoEffect]);

  // ── Sélection d'un effet ──
  const handleSelectFunction = (funcId: number) => {
    resetGroup1State();
    setSelectedFunction(funcId);

    // Pour les effets hors Groupes 1 & 2, auto-trigger l'ancien comportement
    if (!GROUP1_IDS.includes(funcId) && !GROUP2_IDS.includes(funcId)) {
      setTimeout(() => applyLegacyRetouch(funcId), 100);
    }
  };

  // ── Appliquer (Groupe 1) ──
  const handleApplyGroup1 = async () => {
    if (!selectedFunction) return;

    if (isSliderEffect) {
      setIsProcessing(true);
      try {
        let result: string;
        if (selectedFunction === 4) {
          result = await processBrightness(originalPhoto, brightnessVal);
        } else {
          result = await processExposure(originalPhoto, exposureVal);
        }
        setRetouchedPhoto(result);
        toast.success(fr ? 'Effet appliqué' : 'Effect applied');
      } catch {
        toast.error(fr ? 'Erreur' : 'Error');
      } finally {
        setIsProcessing(false);
      }
    } else if (isCropEffect) {
      setIsProcessing(true);
      try {
        const result = await processCrop(originalPhoto, crop);
        setRetouchedPhoto(result);
        toast.success(fr ? 'Recadrage appliqué' : 'Crop applied');
      } catch {
        toast.error(fr ? 'Erreur' : 'Error');
      } finally {
        setIsProcessing(false);
      }
    } else if (previewUrl) {
      setRetouchedPhoto(previewUrl);
      const funcName = retouchFunctions.find(f => f.id === selectedFunction)?.[fr ? 'name' : 'nameEn'];
      toast.success(fr ? `"${funcName}" appliqué` : `"${funcName}" applied`);
    }
    resetGroup1State();
    setSelectedFunction(null);
  };

  // ── Annuler (Groupe 1) ──
  const handleCancelGroup1 = () => {
    resetGroup1State();
    setSelectedFunction(null);
  };

  // ── Comparison slider mouse/touch ──
  const handleComparisonPointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    const el = comparisonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setComparisonPos(x);
  }, []);

  const onComparisonDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleComparisonPointer(e);
  }, [handleComparisonPointer]);

  const onComparisonMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleComparisonPointer(e);
  }, [handleComparisonPointer]);

  // ── Crop tool mouse events ──
  const getCropContainerRect = () => cropContainerRef.current?.getBoundingClientRect();

  const onCropPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragModeRef.current = mode;
    dragStartRef.current = { mx: e.clientX, my: e.clientY, crop: { ...crop } };
  }, [crop]);

  const onCropPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragModeRef.current === 'none' || !dragStartRef.current) return;
    const rect = getCropContainerRect();
    if (!rect) return;
    const dx = ((e.clientX - dragStartRef.current.mx) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.my) / rect.height) * 100;
    const s = dragStartRef.current.crop;
    const mode = dragModeRef.current;

    let nx = s.x, ny = s.y, nw = s.w, nh = s.h;

    if (mode === 'move') {
      nx = Math.max(0, Math.min(100 - s.w, s.x + dx));
      ny = Math.max(0, Math.min(100 - s.h, s.y + dy));
    } else if (mode === 'se') {
      nw = Math.max(5, Math.min(100 - s.x, s.w + dx));
      nh = Math.max(5, Math.min(100 - s.y, s.h + dy));
    } else if (mode === 'sw') {
      const newX = Math.max(0, s.x + dx);
      nw = Math.max(5, s.w - (newX - s.x));
      nx = s.x + s.w - nw;
      nh = Math.max(5, Math.min(100 - s.y, s.h + dy));
    } else if (mode === 'ne') {
      nw = Math.max(5, Math.min(100 - s.x, s.w + dx));
      const newY = Math.max(0, s.y + dy);
      nh = Math.max(5, s.h - (newY - s.y));
      ny = s.y + s.h - nh;
    } else if (mode === 'nw') {
      const newX = Math.max(0, s.x + dx);
      nw = Math.max(5, s.w - (newX - s.x));
      nx = s.x + s.w - nw;
      const newY = Math.max(0, s.y + dy);
      nh = Math.max(5, s.h - (newY - s.y));
      ny = s.y + s.h - nh;
    }

    // Contrainte de ratio
    if (cropRatio !== 'free') {
      const ratioMap: Record<string, number> = { '1:1': 1, '4:3': 4/3, '3:2': 3/2, '16:9': 16/9 };
      const targetRatio = ratioMap[cropRatio] || 1;
      // Ajuster la hauteur au ratio
      const imgRect = getCropContainerRect();
      if (imgRect) {
        const aspectCorrection = imgRect.width / imgRect.height;
        const correctedH = (nw / targetRatio) * aspectCorrection;
        if (mode === 'nw' || mode === 'ne') {
          ny = ny + nh - correctedH;
        }
        nh = correctedH;
        if (ny < 0) { ny = 0; }
        if (ny + nh > 100) { nh = 100 - ny; nw = (nh * targetRatio) / aspectCorrection; }
      }
    }

    setCrop({ x: nx, y: ny, w: nw, h: nh });
  }, [cropRatio]);

  const onCropPointerUp = useCallback(() => {
    dragModeRef.current = 'none';
    dragStartRef.current = null;
  }, []);

  // ── Sauvegarde ──
  const handleSave = () => {
    if (!retouchedPhoto) {
      toast.error(fr ? 'Aucune photo retouchée à enregistrer' : 'No edited photo to save');
      return;
    }
    const baseName = title.replace(/_ret\d*$/, '');
    onSaveAsCopy(retouchedPhoto, `${baseName}_ret`);
  };

  const handleNewRetouch = () => {
    setRetouchedPhoto(null);
    setSelectedFunction(null);
    resetGroup1State();
  };

  // ── Ancien traitement (groupes 2-5) ──
  const applyLegacyRetouch = async (funcId: number) => {
    const functionName = retouchFunctions.find(f => f.id === funcId)?.[fr ? 'name' : 'nameEn'];
    setIsProcessing(true);
    toast.loading(`${fr ? 'Application de' : 'Applying'} "${functionName}"...`, { id: 'retouch' });

    // Suppression d'arrière-plan
    if (funcId === 18) {
      try {
        toast.loading(fr ? "Suppression de l'arrière-plan..." : 'Removing background...', { id: 'retouch' });
        const blob = await new Promise<Blob>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext('2d')!.drawImage(img, 0, 0);
            c.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = originalPhoto;
        });
        const resultBlob = await removeBackground(blob, {
          publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
          progress: (key, current, total) => {
            if (key === 'compute:inference') {
              toast.loading(`${fr ? 'Traitement IA' : 'AI processing'}... ${Math.round((current / total) * 100)}%`, { id: 'retouch' });
            }
          },
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRetouchedPhoto(reader.result as string);
          toast.success(fr ? 'Arrière-plan supprimé !' : 'Background removed!', { id: 'retouch' });
          setIsProcessing(false);
        };
        reader.readAsDataURL(resultBlob);
        return;
      } catch (err) {
        console.error(err);
        toast.error(fr ? "Erreur suppression arrière-plan" : 'Background removal error', { id: 'retouch' });
        setIsProcessing(false);
        return;
      }
    }

    // Autres fonctions legacy
    await new Promise(r => setTimeout(r, 500));
    try {
      const img = await loadImage(originalPhoto);
      const { canvas, ctx } = imageToCanvas(img);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      switch (funcId) {
        case 19: { // Photo NB / couleur
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const c = 1.2;
            const v = Math.min(255, Math.max(0, (gray - 128) * c + 128));
            data[i] = data[i + 1] = data[i + 2] = v;
          }
          ctx.putImageData(imageData, 0, 0);
          break;
        }
      }

      setRetouchedPhoto(canvas.toDataURL('image/jpeg', 0.92));
      toast.success(fr ? `"${functionName}" appliqué` : `"${functionName}" applied`, { id: 'retouch' });
    } catch {
      toast.error(fr ? 'Erreur lors du traitement' : 'Processing error', { id: 'retouch' });
    }
    setIsProcessing(false);
  };

  // ── CSS filter pour le preview live des sliders ──
  const liveFilterStyle = useMemo(() => {
    if (selectedFunction === 4) return { filter: `brightness(${1 + brightnessVal / 100})` };
    if (selectedFunction === 6) return { filter: `brightness(${exposureVal})` };
    return {};
  }, [selectedFunction, brightnessVal, exposureVal]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-6 py-2 flex items-center justify-between shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-gray-800">{fr ? 'Retouche Photo' : 'Photo Retouch'}</h1>
        <Button variant="destructive" onClick={() => setShowQuitModal(true)} className="shadow-lg">
          {fr ? 'Quitter' : 'Quit'}
        </Button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ── Panneau gauche — liste des effets ── */}
        <div className="w-64 bg-white border-r flex flex-col shrink-0">
          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {categories.map(category => (
              <div key={category.fr} className="space-y-1">
                <h3 className="font-semibold text-gray-700 text-xs border-b pb-1">
                  {fr ? category.fr : category.en}
                </h3>
                <div className="space-y-0.5 pl-1">
                  {retouchFunctions
                    .filter(f => f.category === category.fr)
                    .map(func => (
                      <label
                        key={func.id}
                        className={`flex items-center gap-1.5 p-1 rounded cursor-pointer transition-colors text-xs ${
                          selectedFunction === func.id
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="retouchFunction"
                          checked={selectedFunction === func.id}
                          onChange={() => handleSelectFunction(func.id)}
                          className="w-3 h-3 text-blue-600"
                        />
                        <span>{fr ? func.name : func.nameEn}</span>
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t shrink-0">
            <Button variant="outline" onClick={onClose} className="w-full gap-2 h-8 text-sm">
              <ArrowLeft className="w-4 h-4" />
              {fr ? 'Retour' : 'Back'}
            </Button>
          </div>
        </div>

        {/* ── Panneau droit ── */}
        <div className="flex-1 flex flex-col p-4 min-h-0 overflow-auto">

          {/* ============================================================= */}
          {/* CAS 1 : Effet Groupe 1 sélectionné → UI avant/après           */}
          {/* ============================================================= */}
          {isInteractiveGroup && selectedFunction !== null && (
            <div className="flex-1 flex flex-col min-h-0 gap-3">
              <h2 className="text-center font-semibold text-gray-700 shrink-0">
                {retouchFunctions.find(f => f.id === selectedFunction)?.[fr ? 'name' : 'nameEn']}
              </h2>

              {/* ── Auto effects (1, 2, 3, 5) : comparaison avant/après ── */}
              {isAutoEffect && (
                <div className="flex-1 flex flex-col items-center min-h-0">
                  {isProcessing ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                      <p className="text-sm text-gray-500">{fr ? 'Traitement en cours...' : 'Processing...'}</p>
                    </div>
                  ) : previewUrl ? (
                    <>
                      {/* Slider de comparaison */}
                      <div
                        ref={comparisonRef}
                        className="relative flex-1 w-full max-w-3xl overflow-hidden rounded-lg border border-gray-300 cursor-ew-resize select-none"
                        onPointerDown={onComparisonDown}
                        onPointerMove={onComparisonMove}
                      >
                        {/* Image avant (fond) */}
                        <img src={originalPhoto} alt="Avant" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                        {/* Image après (clippée) */}
                        <div
                          className="absolute inset-0"
                          style={{ clipPath: `inset(0 ${100 - comparisonPos}% 0 0)` }}
                        >
                          <img src={previewUrl} alt="Après" className="w-full h-full object-contain" draggable={false} />
                        </div>
                        {/* Ligne de séparation */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                          style={{ left: `${comparisonPos}%` }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-300">
                            <span className="text-gray-500 text-xs font-bold">⇔</span>
                          </div>
                        </div>
                        {/* Labels */}
                        <span className="absolute top-2 left-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded pointer-events-none">
                          {fr ? 'AVANT' : 'BEFORE'}
                        </span>
                        <span className="absolute top-2 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded pointer-events-none">
                          {fr ? 'APRÈS' : 'AFTER'}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* ── Slider effects (4=luminosité, 6=exposition) ── */}
              {isSliderEffect && (
                <div className="flex-1 flex flex-col items-center min-h-0 gap-3">
                  {/* Aperçu avec filtre CSS live */}
                  <div className="relative flex-1 w-full max-w-3xl overflow-hidden rounded-lg border border-gray-300 flex items-center justify-center bg-gray-900">
                    <img
                      src={originalPhoto}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain transition-all duration-75"
                      style={liveFilterStyle}
                      draggable={false}
                    />
                    <span className="absolute top-2 left-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded pointer-events-none">
                      {fr ? 'APERÇU EN DIRECT' : 'LIVE PREVIEW'}
                    </span>
                  </div>

                  {/* Slider */}
                  <div className="w-full max-w-md shrink-0">
                    {selectedFunction === 4 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{fr ? 'Luminosité' : 'Brightness'}</span>
                          <span className="font-mono">{brightnessVal > 0 ? '+' : ''}{brightnessVal}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={brightnessVal}
                          onChange={e => setBrightnessVal(Number(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>-100</span>
                          <span>0</span>
                          <span>+100</span>
                        </div>
                      </div>
                    )}
                    {selectedFunction === 6 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{fr ? 'Exposition (gamma)' : 'Exposure (gamma)'}</span>
                          <span className="font-mono">{exposureVal.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={30}
                          max={300}
                          value={Math.round(exposureVal * 100)}
                          onChange={e => setExposureVal(Number(e.target.value) / 100)}
                          className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>{fr ? 'Sombre' : 'Dark'}</span>
                          <span>1.00</span>
                          <span>{fr ? 'Clair' : 'Bright'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Crop tool (7=recadrage) ── */}
              {isCropEffect && (
                <div className="flex-1 flex flex-col items-center min-h-0 gap-3">
                  {/* Zone de recadrage */}
                  <div
                    ref={cropContainerRef}
                    className="relative flex-1 w-full max-w-3xl overflow-hidden rounded-lg border border-gray-300 bg-gray-900 flex items-center justify-center select-none"
                    onPointerMove={onCropPointerMove}
                    onPointerUp={onCropPointerUp}
                  >
                    <img src={originalPhoto} alt="Crop" className="max-w-full max-h-full object-contain" draggable={false} />
                    {/* Overlay sombre */}
                    <div className="absolute inset-0">
                      {/* Parties sombres (hors crop) via clip-path polygon */}
                      <div
                        className="absolute inset-0 bg-black/60 pointer-events-none"
                        style={{
                          clipPath: `polygon(
                            0% 0%, 100% 0%, 100% 100%, 0% 100%,
                            0% ${crop.y}%,
                            ${crop.x}% ${crop.y}%,
                            ${crop.x}% ${crop.y + crop.h}%,
                            ${crop.x + crop.w}% ${crop.y + crop.h}%,
                            ${crop.x + crop.w}% ${crop.y}%,
                            0% ${crop.y}%
                          )`,
                        }}
                      />
                      {/* Cadre du crop (zone claire) */}
                      <div
                        className="absolute border-2 border-white cursor-move"
                        style={{
                          left: `${crop.x}%`,
                          top: `${crop.y}%`,
                          width: `${crop.w}%`,
                          height: `${crop.h}%`,
                        }}
                        onPointerDown={e => onCropPointerDown(e, 'move')}
                      >
                        {/* Grille des tiers */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
                        </div>
                        {/* Poignées de coin */}
                        {(['nw', 'ne', 'sw', 'se'] as const).map(corner => (
                          <div
                            key={corner}
                            className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-sm z-10"
                            style={{
                              top: corner.startsWith('n') ? -8 : undefined,
                              bottom: corner.startsWith('s') ? -8 : undefined,
                              left: corner.endsWith('w') ? -8 : undefined,
                              right: corner.endsWith('e') ? -8 : undefined,
                              cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
                            }}
                            onPointerDown={e => onCropPointerDown(e, corner)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sélecteur de ratio */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-600 font-medium">{fr ? 'Ratio :' : 'Ratio:'}</span>
                    {CROP_RATIOS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setCropRatio(r.value)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cropRatio === r.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Boutons Appliquer / Annuler ── */}
              <div className="flex items-center justify-center gap-4 shrink-0 py-2">
                <Button
                  variant="outline"
                  onClick={handleCancelGroup1}
                  className="gap-2 min-w-[120px]"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                  {fr ? 'Annuler' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleApplyGroup1}
                  className="gap-2 min-w-[120px] bg-green-600 hover:bg-green-700"
                  disabled={isProcessing || (isAutoEffect && !previewUrl)}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {fr ? 'Appliquer' : 'Apply'}
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* CAS 2 : Pas d'effet Groupe 1 → vue classique (côte à côte)    */}
          {/* ============================================================= */}
          {!isInteractiveGroup && (
            <>
              <h2 className="text-center font-semibold text-gray-700 mb-2 shrink-0">
                {fr ? "Photo de l'album" : 'Album photo'}
              </h2>

              <div className="flex-1 flex gap-4 min-h-0">
                {/* Photo originale */}
                <div className="flex-1 flex flex-col min-h-0">
                  <p className="text-center text-sm text-gray-500 mb-2 shrink-0">
                    {fr ? 'Photo originale' : 'Original photo'}
                  </p>
                  <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center min-h-0">
                    {originalPhoto ? (
                      <img src={originalPhoto} alt="Original" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-gray-400">{fr ? 'Aucune photo' : 'No photo'}</div>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 shrink-0">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={isSelected} onCheckedChange={c => setIsSelected(c as boolean)} />
                      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre" className="flex-1 h-7 text-sm" />
                    </div>
                    <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Commentaires" className="text-sm resize-none h-12" />
                  </div>

                  <div className="flex flex-col items-center gap-1 mt-2 shrink-0">
                    <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200">
                      {fr ? '⚠️ Les fonctions ne se cumulent pas. Pour cumuler, enregistrez puis relancez.' : '⚠️ Functions do not stack. Save then reapply to combine.'}
                    </span>
                  </div>
                </div>

                {/* Photo retouchée */}
                <div className="flex-1 flex flex-col min-h-0">
                  <p className="text-center text-sm text-gray-500 mb-2 shrink-0">
                    {fr ? 'Photo retouchée' : 'Edited photo'}
                  </p>
                  <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center min-h-0">
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-500">{fr ? 'Traitement...' : 'Processing...'}</p>
                      </div>
                    ) : retouchedPhoto ? (
                      <img src={retouchedPhoto} alt={fr ? 'Photo retouchée' : 'Edited photo'} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-gray-400 text-center text-sm">
                        {fr ? <>La photo retouchée<br />apparaîtra ici</> : <>The edited photo<br />will appear here</>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-2 shrink-0">
                    <button onClick={handleNewRetouch} className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-sm">
                      <Sparkles className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-600">{fr ? 'Nouvelle retouche' : 'New retouch'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-2 shrink-0">
                    <span className="text-xs text-gray-600">{fr ? "Enregistrer comme copie dans l'album" : 'Save as copy in album'}</span>
                    <Button onClick={handleSave} disabled={!retouchedPhoto} className="h-7 text-sm px-4">
                      {fr ? 'Enregistrer' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal quitter */}
      <QuitConfirmModal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        onSaveAndQuit={() => {
          if (retouchedPhoto) {
            const baseName = title.replace(/_ret\d*$/, '');
            onSaveAsCopy(retouchedPhoto, `${baseName}_ret`);
            toast.success(fr ? 'Photo retouchée sauvegardée' : 'Edited photo saved');
          }
          onClose();
        }}
      />
    </div>
  );
}
