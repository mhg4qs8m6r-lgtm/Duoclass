/**
 * Couche de stockage unifiée : S3 (prod) ou disque local (dev/fallback)
 * L'interface storagePut / storageGet / storageDelete est identique dans les deux cas.
 * La sélection se fait automatiquement selon la présence des variables AWS_*.
 */

import fs from "fs/promises";
import path from "path";

// ─── Détection du backend ───────────────────────────────────────────────────

const S3_CONFIGURED =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_REGION &&
  !!process.env.AWS_S3_BUCKET;

const S3_BUCKET = process.env.AWS_S3_BUCKET ?? "";
const S3_REGION = process.env.AWS_REGION ?? "eu-north-1";

// URL publique de base pour les objets S3 (path-style évite les problèmes de DNS wildcard)
function s3PublicUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

// ─── Helpers S3 (importés dynamiquement pour ne pas crasher si SDK absent) ──

async function getS3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// ─── Disque local ────────────────────────────────────────────────────────────

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function absPath(relKey: string): string {
  return path.join(UPLOAD_ROOT, normalizeKey(relKey));
}

// ─── Interface publique ───────────────────────────────────────────────────────

/**
 * Stocke un fichier.
 * Retourne { key, url } — url est une URL publique complète (S3) ou un chemin relatif (/uploads/…).
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  // ── Convertir en Buffer une seule fois ──
  let buf: Buffer;
  if (Buffer.isBuffer(data)) {
    buf = data;
  } else if (data instanceof Uint8Array) {
    buf = Buffer.from(data);
  } else if (typeof data === "string" && data.startsWith("data:")) {
    // data-URI : extraire la partie base64
    const b64 = data.split(",")[1] ?? "";
    buf = Buffer.from(b64, "base64");
  } else {
    buf = Buffer.from(data as string, "utf-8");
  }

  if (S3_CONFIGURED) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buf,
        ContentType: contentType,
      })
    );
    console.log(`[storage] S3 PUT ${key}`);
    return { key, url: s3PublicUrl(key) };
  }

  // Disque local
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

  if (S3_CONFIGURED) {
    return { key, url: s3PublicUrl(key) };
  }

  const dest = absPath(key);
  await fs.access(dest);
  return { key, url: `/uploads/${key}` };
}

/**
 * Supprime un fichier.
 */
export async function storageDelete(relKey: string): Promise<boolean> {
  const key = normalizeKey(relKey);

  try {
    if (S3_CONFIGURED) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await getS3Client();
      await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      console.log(`[storage] S3 DELETE ${key}`);
      return true;
    }

    const dest = absPath(key);
    await fs.unlink(dest);
    return true;
  } catch {
    return false;
  }
}

/** Chemin racine des uploads locaux (pour Express static en mode local) */
export function getUploadRoot(): string {
  return UPLOAD_ROOT;
}

/** true si le backend actif est S3 */
export function isS3Enabled(): boolean {
  return S3_CONFIGURED;
}
