import { app, BrowserWindow, globalShortcut, session, ipcMain, shell, Menu } from "electron";
import path from "path";
import crypto from "crypto";
import os from "os";
import fs from "fs";

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

  // Menu contextuel natif : Copier/Coller pour les champs de saisie,
  // pas de menu par défaut ailleurs (supprime "Voir image", etc.)
  mainWindow.webContents.on("context-menu", (event, params) => {
    event.preventDefault();
    if (params.isEditable || params.selectionText) {
      const menuItems: Electron.MenuItemConstructorOptions[] = [];
      if (params.selectionText) {
        menuItems.push({ label: "Couper", role: "cut", enabled: params.isEditable });
        menuItems.push({ label: "Copier", role: "copy" });
      }
      if (params.isEditable) {
        menuItems.push({ label: "Coller", role: "paste" });
        menuItems.push({ label: "Tout sélectionner", role: "selectAll" });
      }
      if (menuItems.length > 0) {
        Menu.buildFromTemplate(menuItems).popup();
      }
    }
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.handle("open-pdf", async (_event, urlOrData: string) => {
  try {
    const tempPath = path.join(os.tmpdir(), "duoclass_preview.pdf");
    if (urlOrData.startsWith("data:application/pdf;base64,")) {
      const base64 = urlOrData.replace("data:application/pdf;base64,", "");
      fs.writeFileSync(tempPath, Buffer.from(base64, "base64"));
    } else {
      const response = await fetch(urlOrData);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(tempPath, buffer);
    }
    await shell.openPath(tempPath);
    return { ok: true };
  } catch (err) {
    console.error("[open-pdf]", err);
    return { ok: false, error: String(err) };
  }
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Vider le cache HTTP Chromium au démarrage pour que les rebuilds Vite
  // soient toujours chargés (évite les fichiers JS/CSS périmés en mémoire).
  await session.defaultSession.clearCache();

  // Rediriger tous les téléchargements vers le Bureau macOS
  session.defaultSession.on('will-download', (_event, item) => {
    const desktopPath = path.join(os.homedir(), 'Desktop', item.getFilename());
    item.setSavePath(desktopPath);
  });

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
