/**
 * Serveur Express pour Electron — sans dépendance à Vite.
 * Sert le build statique produit par `vite build` (dist/public/).
 * Importé uniquement par electron/main.ts.
 */
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { getUploadRoot } from "../server/local-storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function startServer(): Promise<number> {
  if (!process.env.JWT_SECRET) {
    console.error("[Electron] FATAL: JWT_SECRET not set. Auth will not work.");
  }

  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/uploads", express.static(getUploadRoot()));

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  // Serve the Vite build. In the CJS bundle __dirname = dist/electron/,
  // so dist/electron/../public = dist/public/.
  const distPath = path.join(__dirname, "..", "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `[Electron] Build not found at ${distPath}. Run "pnpm vite build" first.`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  return new Promise(resolve => {
    server.listen(port, () => {
      console.log(`[Electron] Server running on http://localhost:${port}/`);
      resolve(port);
    });
  });
}
