import { app, BrowserWindow, globalShortcut, session } from "electron";
import path from "path";
import crypto from "crypto";

// ─── Paths Electron (set BEFORE server modules are imported) ──────────────────
// server/db.ts and server/local-storage.ts read these env vars lazily (on first
// request), so setting them here is safe even though imports are hoisted.
// Toujours stocker dans userData (packaged ou dev), jamais dans le CWD.
process.env.SQLITE_PATH ??= path.join(app.getPath("userData"), "duoclass.db");
process.env.UPLOAD_DIR  ??= path.join(app.getPath("userData"), "uploads");
if (app.isPackaged) {
  process.env.NODE_ENV = "production";
}

// Generate a session secret if none is provided (dev convenience).
// In production, set JWT_SECRET in the OS environment or a .env beside the binary.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
}

// ─── Server ───────────────────────────────────────────────────────────────────
// Uses electron/server.ts (no Vite dependency) instead of server/_core/index.ts.
// server/_core/index.ts imports vite which is ESM-only and cannot be require()'d
// from a CJS bundle.
import { startServer } from "./server";

// ─── Window ───────────────────────────────────────────────────────────────────
const PRELOAD_PATH = path.join(__dirname, "preload.cjs");

let mainWindow: BrowserWindow | null = null;

/** Attend que le serveur Express réponde (max 10s, polling 200ms). */
async function waitForServer(port: number): Promise<void> {
  const url = `http://localhost:${port}/`;
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  console.warn("[Electron] Server did not respond in 10s — loading anyway.");
}

async function createWindow(port: number): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await waitForServer(port);
  await mainWindow.loadURL(`http://localhost:${port}/albums`);

  // Raccourci DevTools : Cmd+Shift+I (toujours disponible, packagé ou non)
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    mainWindow?.webContents.toggleDevTools();
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Vider le cache HTTP Chromium au démarrage pour que les rebuilds Vite
  // soient toujours chargés (évite les fichiers JS/CSS périmés en mémoire).
  await session.defaultSession.clearCache();

  const port = await startServer();
  await createWindow(port);

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(port);
    }
  });
}).catch(console.error);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
