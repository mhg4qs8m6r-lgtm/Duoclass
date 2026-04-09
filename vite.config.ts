import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import modelesIndexPlugin from "./vite-plugin-modeles-index";

const plugins = [react(), tailwindcss(), jsxLocPlugin(), modelesIndexPlugin()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: [
        "nsfwjs",
        "@tensorflow/tfjs",
        "@tensorflow/tfjs-core",
        "@tensorflow/tfjs-backend-webgl",
        "@tensorflow/tfjs-backend-cpu",
        "@tensorflow/tfjs-converter",
        "@tensorflow/tfjs-layers",
      ],
    },
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  server: {
    host: true,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
