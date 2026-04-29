import { app, BrowserWindow } from "electron";
import path from "path";
import crypto from "crypto";

// ─── Paths Electron (set BEFORE server modules are imported) ──────────────────
// server/db.ts and server/local-storage.ts read these env vars lazily (on first
// request), so setting them here is safe even though imports are hoisted.
if (app.isPackaged) {
  process.env.NODE_ENV = "production";
  process.env.SQLITE_PATH = path.join(app.getPath("userData"), "duoclass.db");
  process.env.UPLOAD_DIR = path.join(app.getPath("userData"), "uploads");
}

// Generate a session secret if none is provided (dev convenience).
// In production, set JWT_SECRET in the OS environment or a .env beside the binary.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
}

// ─── Server ───────────────────────────────────────────────────────────────────
// Imported after env vars are set so lazy inits in db.ts / local-storage.ts
// pick up the correct paths on first use.
import { startServer } from "../server/_core/index";

// ─── Window ───────────────────────────────────────────────────────────────────
const PRELOAD_PATH = path.join(__dirname, "preload.js");

let mainWindow: BrowserWindow | null = null;

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

  await mainWindow.loadURL(`http://localhost:${port}`);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
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
