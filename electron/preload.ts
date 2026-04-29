import { contextBridge, ipcRenderer } from "electron";

// Expose a minimal API to the renderer process.
// Only add what the renderer actually needs — keeps the attack surface small.
contextBridge.exposeInMainWorld("electronAPI", {
  /** App version from package.json */
  getVersion: (): string => process.env.npm_package_version ?? "0.0.0",

  /** Host platform: 'darwin' | 'win32' | 'linux' */
  getPlatform: (): NodeJS.Platform => process.platform,

  /** Send a message to the main process (fire-and-forget) */
  send: (channel: string, data?: unknown): void => {
    ipcRenderer.send(channel, data);
  },

  /** Invoke a main-process handler and await the result */
  invoke: (channel: string, data?: unknown): Promise<unknown> => {
    return ipcRenderer.invoke(channel, data);
  },
});
