/**
 * Service de contrôle parental avec NSFW.js
 * Analyse les images localement dans le navigateur.
 * Les photos ne quittent jamais l'ordinateur de l'utilisateur.
 *
 * Note d'architecture : nsfwjs et TensorFlow.js sont chargés dynamiquement
 * depuis CDN pour éviter de les bundler dans le build principal (~37 MB économisés).
 * Le chargement est paresseux (lazy) : uniquement déclenché lors de la première
 * utilisation du contrôle parental.
 */

// URL du bundle nsfwjs depuis CDN officiel
const NSFWJS_CDN_URL =
  "https://cdn.jsdelivr.net/npm/nsfwjs@4.1.0/dist/nsfwjs.min.js";

// Types pour les résultats d'analyse
export interface NSFWResult {
  isInappropriate: boolean;
  confidence: number;
  categories: {
    drawing: number;
    hentai: number;
    neutral: number;
    porn: number;
    sexy: number;
  };
  blockedReason?: string;
}

// Niveaux de contrôle parental
export type ParentalControlLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Seuils selon le niveau de contrôle
const THRESHOLDS: Record<ParentalControlLevel, { porn: number; sexy: number; hentai: number }> = {
  0: { porn: 1.1, sexy: 1.1, hentai: 1.1 }, // Désactivé (seuils impossibles à atteindre)
  1: { porn: 0.9, sexy: 1.1, hentai: 0.9 }, // Très permissif
  2: { porn: 0.7, sexy: 0.9, hentai: 0.7 }, // Permissif
  3: { porn: 0.5, sexy: 0.7, hentai: 0.5 }, // Modéré
  4: { porn: 0.3, sexy: 0.5, hentai: 0.3 }, // Strict
  5: { porn: 0.2, sexy: 0.3, hentai: 0.2 }, // Très strict
};

// Type minimal pour l'API nsfwjs exposée par le bundle CDN
interface NsfwjsModule {
  load: (modelOrUrl?: string, options?: Record<string, unknown>) => Promise<NsfwjsModel>;
}

interface NsfwjsModel {
  classify: (
    image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    topk?: number
  ) => Promise<Array<{ className: string; probability: number }>>;
}

// État interne du service (singleton)
let model: NsfwjsModel | null = null;
let isLoading = false;
let loadPromise: Promise<NsfwjsModel> | null = null;
let scriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;

/**
 * Charge le script nsfwjs depuis CDN (une seule fois).
 * Le bundle expose `window.nsfwjs` comme variable globale.
 */
function loadNsfwjsScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();

  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    // Vérifier si déjà disponible globalement (ex : chargé via <script> tag)
    if (typeof (window as unknown as Record<string, unknown>).nsfwjs !== "undefined") {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = NSFWJS_CDN_URL;
    script.async = true;

    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };

    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Impossible de charger la bibliothèque de détection NSFW depuis CDN"));
    };

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Charge le modèle NSFW.js (une seule fois).
 * Déclenche le chargement du script CDN si nécessaire.
 */
export async function loadNSFWModel(): Promise<NsfwjsModel> {
  if (model) return model;

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      // Étape 1 : charger le script CDN si nécessaire
      await loadNsfwjsScript();

      // Étape 2 : récupérer l'objet nsfwjs depuis window
      const nsfwjsLib = (window as unknown as Record<string, unknown>).nsfwjs as NsfwjsModule;
      if (!nsfwjsLib || typeof nsfwjsLib.load !== "function") {
        throw new Error("La bibliothèque nsfwjs n'est pas disponible après le chargement du script");
      }

      // Étape 3 : charger le modèle (utilise le modèle par défaut MobileNetV2)
      const loadedModel = await nsfwjsLib.load();
      model = loadedModel;
      isLoading = false;
      return model;
    } catch (error) {
      isLoading = false;
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Analyse une image et retourne si elle est inappropriée selon le niveau de contrôle.
 */
export async function analyzeImage(
  imageElement: HTMLImageElement,
  controlLevel: ParentalControlLevel
): Promise<NSFWResult> {
  // Si le contrôle est désactivé, retourner OK directement sans charger le modèle
  if (controlLevel === 0) {
    return {
      isInappropriate: false,
      confidence: 0,
      categories: { drawing: 0, hentai: 0, neutral: 1, porn: 0, sexy: 0 },
    };
  }

  const nsfwModel = await loadNSFWModel();
  const predictions = await nsfwModel.classify(imageElement);

  // Convertir les prédictions en objet structuré
  const categories = {
    drawing: 0,
    hentai: 0,
    neutral: 0,
    porn: 0,
    sexy: 0,
  };

  for (const pred of predictions) {
    const key = pred.className.toLowerCase() as keyof typeof categories;
    if (key in categories) {
      categories[key] = pred.probability;
    }
  }

  // Évaluer selon les seuils du niveau de contrôle
  const thresholds = THRESHOLDS[controlLevel];
  let isInappropriate = false;
  let blockedReason = "";
  let maxConfidence = 0;

  if (categories.porn >= thresholds.porn) {
    isInappropriate = true;
    blockedReason = "Contenu pornographique détecté";
    maxConfidence = Math.max(maxConfidence, categories.porn);
  }

  if (categories.hentai >= thresholds.hentai) {
    isInappropriate = true;
    blockedReason = blockedReason || "Contenu hentai/anime adulte détecté";
    maxConfidence = Math.max(maxConfidence, categories.hentai);
  }

  if (categories.sexy >= thresholds.sexy) {
    isInappropriate = true;
    blockedReason = blockedReason || "Contenu suggestif détecté";
    maxConfidence = Math.max(maxConfidence, categories.sexy);
  }

  return {
    isInappropriate,
    confidence: maxConfidence,
    categories,
    blockedReason: isInappropriate ? blockedReason : undefined,
  };
}

/**
 * Analyse une image à partir d'une URL base64 ou d'un fichier.
 */
export async function analyzeImageFromSource(
  source: string | File,
  controlLevel: ParentalControlLevel
): Promise<NSFWResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      try {
        const result = await analyzeImage(img, controlLevel);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Impossible de charger l'image pour analyse"));
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Vérifie si le modèle est chargé en mémoire.
 */
export function isModelLoaded(): boolean {
  return model !== null;
}

/**
 * Précharge le modèle en arrière-plan (optionnel, pour améliorer la réactivité).
 */
export function preloadModel(): void {
  loadNSFWModel().catch((err) => {
    console.warn("[nsfwService] Préchargement du modèle échoué :", err);
  });
}
