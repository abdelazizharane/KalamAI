// Minimal preload — contextIsolation is on, so this runs in a sandboxed context.
// Expose only what the renderer strictly needs from Electron's native layer.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  onFullscreen: (cb) => ipcRenderer.on("fullscreen-change", (_e, v) => cb(v)),
});
