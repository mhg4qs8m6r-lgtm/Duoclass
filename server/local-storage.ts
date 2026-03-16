/**
 * Stockage local sur disque — remplacement du stockage S3/Forge
 * Interface identique à l'ancien storage.ts : storagePut / storageGet
 */

import fs from "fs/promises";
import path from "path";

/** Répertoire racine des uploads (configurable via UPLOAD_DIR) */
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/** Garantit l'existence du répertoire parent */
async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

/** Chemin absolu sur disque pour une clé relative */
function absPath(relKey: string): string {
  return path.join(UPLOAD_ROOT, normalizeKey(relKey));
}

/**
 * Écrit un fichier sur le disque local.
 * Retourne { key, url } où url = chemin relatif servable via Express static.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const dest = absPath(key);
  await ensureDir(dest);

  let buf: Buffer;
  if (Buffer.isBuffer(data)) {
    buf = data;
  } else if (data instanceof Uint8Array) {
    buf = Buffer.from(data);
  } else {
    // string — soit base64 data-URI, soit texte brut
    buf = Buffer.from(data, "utf-8");
  }

  await fs.writeFile(dest, buf);

  return { key, url: `/uploads/${key}` };
}

/**
 * Retourne l'URL locale d'un fichier existant.
 * Lève une erreur si le fichier n'existe pas.
 */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const dest = absPath(key);

  // Vérifier que le fichier existe
  await fs.access(dest);

  return { key, url: `/uploads/${key}` };
}

/**
 * Supprime un fichier du disque local (nettoyage optionnel).
 */
export async function storageDelete(relKey: string): Promise<boolean> {
  try {
    const dest = absPath(normalizeKey(relKey));
    await fs.unlink(dest);
    return true;
  } catch {
    return false;
  }
}

/** Retourne le chemin racine des uploads (utile pour Express static) */
export function getUploadRoot(): string {
  return UPLOAD_ROOT;
}
