/**
 * Couche de stockage filesystem local.
 * Toutes les photos et miniatures sont stockées dans UPLOAD_DIR
 * (défini par electron/main.ts → app.getPath('userData')/uploads).
 */

import fs from "fs/promises";
import path from "path";

// Lazy: resolved at call time so electron/main.ts can set UPLOAD_DIR before
// the first request arrives.
function uploadRoot(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function absPath(relKey: string): string {
  return path.join(uploadRoot(), normalizeKey(relKey));
}

// ─── Interface publique ───────────────────────────────────────────────────────

/**
 * Stocke un fichier.
 * Retourne { key, url } — url est un chemin relatif servi par Express (/uploads/…).
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  let buf: Buffer;
  if (Buffer.isBuffer(data)) {
    buf = data;
  } else if (data instanceof Uint8Array) {
    buf = Buffer.from(data);
  } else if (typeof data === "string" && data.startsWith("data:")) {
    const b64 = data.split(",")[1] ?? "";
    buf = Buffer.from(b64, "base64");
  } else {
    buf = Buffer.from(data as string, "utf-8");
  }

  const dest = absPath(key);
  await ensureDir(dest);
  await fs.writeFile(dest, buf);
  console.log(`[storage] local PUT ${key}`);
  return { key, url: `/uploads/${key}` };
}

/**
 * Retourne l'URL d'un fichier existant (ne le télécharge pas).
 */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const dest = absPath(key);
  await fs.access(dest);
  return { key, url: `/uploads/${key}` };
}

/**
 * Supprime un fichier.
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

/** Chemin racine des uploads locaux (pour Express static). */
export function getUploadRoot(): string {
  return uploadRoot();
}
