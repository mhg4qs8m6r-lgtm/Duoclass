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
  /** Backward compat — alias de isBlocked */
  isInappropriate: boolean;
  /** Import refusé (niveaux 3-5 selon catégorie) */
  isBlocked: boolean;
  /** Avertissement affiché, import toujours possible (niveaux 1-2) */
  isWarning: boolean;
  confidence: number;
  categories: {
    drawing: number;
    hentai: number;
    neutral: number;
    porn: number;
    sexy: number;
  };
  blockedReason?: string;
  warningReason?: string;
}

// Niveaux de contrôle parental
export type ParentalControlLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Seuils par niveau : warn = avertissement (import possible), block = refus
interface LevelThresholds {
  warn:  { porn: number; sexy: number; hentai: number };
  block: { porn: number; sexy: number; hentai: number };
  /** Niveau 5 : filtrage positif — seules neutral+drawing acceptées */
  positiveFilter?: boolean;
}

const THRESHOLDS: Record<ParentalControlLevel, LevelThresholds> = {
  // Niveau 0 — Désactivé : aucune analyse
  0: {
    warn:  { porn: 1.1, sexy: 1.1, hentai: 1.1 },
    block: { porn: 1.1, sexy: 1.1, hentai: 1.1 },
  },
  // Niveau 1 — Analyse + avertissement, import toujours possible
  1: {
    warn:  { porn: 0.7, sexy: 0.85, hentai: 0.7 },
    block: { porn: 1.1, sexy: 1.1,  hentai: 1.1 },
  },
  // Niveau 2 — Contenu sexy détecté : avertissement, import toujours possible
  2: {
    warn:  { porn: 0.7, sexy: 0.7, hentai: 0.7 },
    block: { porn: 1.1, sexy: 1.1, hentai: 1.1 },
  },
  // Niveau 3 — Sexy → refusé ; ambigu/suggestif → avertissement
  3: {
    warn:  { porn: 0.35, sexy: 0.35, hentai: 0.35 },
    block: { porn: 0.5,  sexy: 0.65, hentai: 0.5  },
  },
  // Niveau 4 — Contenu explicite (porn, hentai) refusé ; sexy → avertissement
  4: {
    warn:  { porn: 1.1, sexy: 0.3, hentai: 1.1 },
    block: { porn: 0.3, sexy: 0.5, hentai: 0.3 },
  },
  // Niveau 5 — Très strict : seules neutral et drawing acceptées
  5: {
    warn:  { porn: 1.1, sexy: 1.1, hentai: 1.1 }, // non utilisé (positiveFilter)
    block: { porn: 1.1, sexy: 1.1, hentai: 1.1 }, // non utilisé (positiveFilter)
    positiveFilter: true,
  },
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
      await loadNsfwjsScript();

      const nsfwjsLib = (window as unknown as Record<string, unknown>).nsfwjs as NsfwjsModule;
      if (!nsfwjsLib || typeof nsfwjsLib.load !== "function") {
        throw new Error("La bibliothèque nsfwjs n'est pas disponible après le chargement du script");
      }

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
 * Analyse une image et retourne isBlocked / isWarning selon le niveau de contrôle.
 *
 * - isBlocked  : import refusé définitivement (niveaux 3-5 selon catégorie)
 * - isWarning  : avertissement visible, import toujours possible (niveaux 1-2)
 * - isInappropriate : alias de isBlocked (backward compat ParentalControlModal)
 */
export async function analyzeImage(
  imageElement: HTMLImageElement,
  controlLevel: ParentalControlLevel
): Promise<NSFWResult> {
  // Niveau 0 : désactivé
  if (controlLevel === 0) {
    return {
      isInappropriate: false,
      isBlocked: false,
      isWarning: false,
      confidence: 0,
      categories: { drawing: 0, hentai: 0, neutral: 1, porn: 0, sexy: 0 },
    };
  }

  const nsfwModel = await loadNSFWModel();
  const predictions = await nsfwModel.classify(imageElement);

  const categories = { drawing: 0, hentai: 0, neutral: 0, porn: 0, sexy: 0 };
  for (const pred of predictions) {
    const key = pred.className.toLowerCase() as keyof typeof categories;
    if (key in categories) categories[key] = pred.probability;
  }

  const thresholds = THRESHOLDS[controlLevel];

  // ── Niveau 5 : filtrage positif ──────────────────────────────────────────
  if (thresholds.positiveFilter) {
    const dominant = (Object.entries(categories) as [keyof typeof categories, number][])
      .reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    const isBlocked = dominant !== "neutral" && dominant !== "drawing";
    return {
      isInappropriate: isBlocked,
      isBlocked,
      isWarning: false,
      confidence: isBlocked ? Math.max(categories.porn, categories.sexy, categories.hentai) : 0,
      categories,
      blockedReason: isBlocked
        ? "Contenu non neutre détecté (niveau très strict — seules les images neutres et illustrations sont acceptées)"
        : undefined,
    };
  }

  // ── Niveaux 1-4 : seuils warn + block ───────────────────────────────────
  let isBlocked = false;
  let isWarning = false;
  let blockedReason = "";
  let warningReason = "";
  let maxConfidence = 0;

  // Vérifier les seuils de blocage en premier
  if (categories.porn >= thresholds.block.porn) {
    isBlocked = true;
    blockedReason = "Contenu pornographique détecté";
    maxConfidence = Math.max(maxConfidence, categories.porn);
  }
  if (categories.hentai >= thresholds.block.hentai) {
    isBlocked = true;
    blockedReason = blockedReason || "Contenu hentai/anime adulte détecté";
    maxConfidence = Math.max(maxConfidence, categories.hentai);
  }
  if (categories.sexy >= thresholds.block.sexy) {
    isBlocked = true;
    blockedReason = blockedReason || "Contenu suggestif explicite détecté";
    maxConfidence = Math.max(maxConfidence, categories.sexy);
  }

  // Vérifier les seuils d'avertissement (seulement si pas déjà bloqué)
  if (!isBlocked) {
    if (categories.porn >= thresholds.warn.porn) {
      isWarning = true;
      warningReason = "Contenu potentiellement inapproprié détecté";
      maxConfidence = Math.max(maxConfidence, categories.porn);
    }
    if (categories.hentai >= thresholds.warn.hentai) {
      isWarning = true;
      warningReason = warningReason || "Contenu animé adulte potentiel détecté";
      maxConfidence = Math.max(maxConfidence, categories.hentai);
    }
    if (categories.sexy >= thresholds.warn.sexy) {
      isWarning = true;
      warningReason = warningReason || "Contenu suggestif détecté";
      maxConfidence = Math.max(maxConfidence, categories.sexy);
    }
  }

  return {
    isInappropriate: isBlocked, // backward compat
    isBlocked,
    isWarning,
    confidence: maxConfidence,
    categories,
    blockedReason: isBlocked ? blockedReason : undefined,
    warningReason: isWarning ? warningReason : undefined,
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
