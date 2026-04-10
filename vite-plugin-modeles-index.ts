/**
 * Vite plugin: auto-generates client/public/modeles/index.json
 * by scanning the subfolders for image/PDF files.
 *
 * Also watches ~/Desktop/DuoClass-Modeles/ and syncs any new file
 * into client/public/modeles/ automatically.
 * Papy can simply drop a PNG/SVG/JPEG/PDF on his Desktop folder
 * and it appears in the app without any manual step.
 *
 * Uses polling (every 2s) instead of fs.watch for macOS reliability.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Plugin, Connect } from "vite";

const MODELES_DIR = path.resolve(import.meta.dirname, "client/public/modeles");
const INDEX_PATH = path.join(MODELES_DIR, "index.json");
const DESKTOP_DIR = path.join(os.homedir(), "Desktop/DuoClass-Modeles");
const ROUTINE_DIR = path.join(os.homedir(), "Desktop/Routine-DuoClass-Modeles");
const CATEGORIES = ["passe-partout", "pele-mele", "cadres", "bordures"] as const;
const ALLOWED_EXT = new Set([".png", ".svg", ".pdf", ".jpg", ".jpeg", ".webp"]);

// ── Body reading helper ──────────────────────────────────────────────────────
// Express' json middleware consumes the stream and stores parsed JSON in req.body.
// When running inside Vite's middleware mode (after Express), we must check
// req.body first, otherwise fall back to reading the raw stream.

function readJsonBody(req: Connect.IncomingMessage): Promise<any> {
  // Already parsed by Express
  if ((req as any).body && typeof (req as any).body === "object") {
    return Promise.resolve((req as any).body);
  }
  // Fallback: read raw stream (standalone Vite dev server, or body not yet parsed)
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

// ── Index generation ─────────────────────────────────────────────────────────

function buildIndex(): Record<string, string[]> {
  const index: Record<string, string[]> = {};
  for (const cat of CATEGORIES) {
    const dir = path.join(MODELES_DIR, cat);
    if (!fs.existsSync(dir)) {
      index[cat] = [];
      continue;
    }
    index[cat] = fs
      .readdirSync(dir)
      .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "fr"));
  }
  return index;
}

function writeIndex() {
  const index = buildIndex();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n", "utf-8");
}

// ── Desktop → public sync ────────────────────────────────────────────────────

function ensureDesktopFolders() {
  for (const cat of CATEGORIES) {
    const dir = path.join(DESKTOP_DIR, cat);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/** Move files from Routine-DuoClass-Modeles → DuoClass-Modeles (the drop zone) */
function drainRoutineFolder() {
  if (!fs.existsSync(ROUTINE_DIR)) return;
  for (const cat of CATEGORIES) {
    const src = path.join(ROUTINE_DIR, cat);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(DESKTOP_DIR, cat);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      if (!ALLOWED_EXT.has(path.extname(file).toLowerCase())) continue;
      const srcFile = path.join(src, file);
      if (!fs.statSync(srcFile).isFile()) continue;
      fs.renameSync(srcFile, path.join(dest, file));
    }
  }
}

function syncCategory(cat: string): boolean {
  const src = path.join(DESKTOP_DIR, cat);
  const dest = path.join(MODELES_DIR, cat);
  if (!fs.existsSync(src)) return false;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  let changed = false;
  for (const file of fs.readdirSync(src)) {
    if (!ALLOWED_EXT.has(path.extname(file).toLowerCase())) continue;
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);

    const srcStat = fs.statSync(srcFile);
    if (!srcStat.isFile()) continue;
    if (fs.existsSync(destFile)) {
      const destStat = fs.statSync(destFile);
      if (srcStat.mtimeMs <= destStat.mtimeMs) continue;
    }
    fs.copyFileSync(srcFile, destFile);
    changed = true;
  }
  return changed;
}

function syncAll(): boolean {
  drainRoutineFolder();
  let changed = false;
  for (const cat of CATEGORIES) {
    if (syncCategory(cat)) changed = true;
  }
  return changed;
}

/** Decode a data-URL to a Buffer */
function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

// ── Plugin ───────────────────────────────────────────────────────────────────

export default function modelesIndexPlugin(): Plugin {
  return {
    name: "modeles-index",
    buildStart() {
      ensureDesktopFolders();
      syncAll();
      writeIndex();
    },
    configureServer(server) {
      ensureDesktopFolders();
      syncAll();
      writeIndex();

      // ── API: GET /api/modeles/index.json — always fresh ──────────────
      server.middlewares.use((req, res, next) => {
        if (req.method === "GET" && req.url === "/api/modeles/index.json") {
          syncAll();
          const index = buildIndex();
          fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n", "utf-8");
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-cache");
          res.end(JSON.stringify(index));
          return;
        }
        next();
      });

      // ── API: DELETE /api/modeles/:category/:filename ──────────────────
      server.middlewares.use((req, res, next) => {
        if (req.method !== "DELETE" || !req.url?.startsWith("/api/modeles/")) {
          return next();
        }
        const parts = req.url.replace("/api/modeles/", "").split("/");
        if (parts.length !== 2) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid path" }));
          return;
        }
        const [cat, filename] = parts.map(decodeURIComponent);
        if (!(CATEGORIES as readonly string[]).includes(cat)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid category" }));
          return;
        }
        if (filename.includes("/") || filename.includes("..")) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid filename" }));
          return;
        }
        const publicFile = path.join(MODELES_DIR, cat, filename);
        if (fs.existsSync(publicFile)) fs.unlinkSync(publicFile);
        const desktopFile = path.join(DESKTOP_DIR, cat, filename);
        if (fs.existsSync(desktopFile)) fs.unlinkSync(desktopFile);

        writeIndex();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      });

      // ── API: POST /api/modeles/:category — upload a new modele ────────
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || !req.url?.startsWith("/api/modeles/")) {
          return next();
        }
        const cat = decodeURIComponent(req.url.replace("/api/modeles/", "").replace(/\/$/, ""));
        if (!(CATEGORIES as readonly string[]).includes(cat)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid category" }));
          return;
        }
        try {
          const { filename, dataUrl } = await readJsonBody(req);
          if (!filename || !dataUrl || filename.includes("/") || filename.includes("..")) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid payload" }));
            return;
          }
          const buffer = dataUrlToBuffer(dataUrl);
          if (!buffer) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid dataUrl format" }));
            return;
          }
          const desktopDir = path.join(DESKTOP_DIR, cat);
          if (!fs.existsSync(desktopDir)) fs.mkdirSync(desktopDir, { recursive: true });
          fs.writeFileSync(path.join(desktopDir, filename), buffer);

          const publicDir = path.join(MODELES_DIR, cat);
          if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
          fs.writeFileSync(path.join(publicDir, filename), buffer);

          writeIndex();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Server error" }));
        }
      });

      // ── API: POST /api/save-to-desktop — save a file on Desktop ──────
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || req.url !== "/api/save-to-desktop") {
          return next();
        }
        try {
          const { filename, dataUrl } = await readJsonBody(req);
          if (!filename || !dataUrl || filename.includes("/") || filename.includes("..")) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid payload" }));
            return;
          }
          const buffer = dataUrlToBuffer(dataUrl);
          if (!buffer) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid dataUrl format" }));
            return;
          }
          const desktopPath = path.join(os.homedir(), "Desktop", filename);
          fs.writeFileSync(desktopPath, buffer);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, path: desktopPath }));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Server error" }));
        }
      });

      // ── Polling: sync Desktop → public every 2s ──────────────────────
      // Note: pas de full-reload HMR — BibliothequeModeles re-fetch l'index
      // toutes les 3s, donc les nouveaux fichiers apparaissent automatiquement
      // sans recharger la page (ce qui perdrait l'état du canvas).
      setInterval(() => {
        if (syncAll()) {
          writeIndex();
        }
      }, 2000);
    },
  };
}
