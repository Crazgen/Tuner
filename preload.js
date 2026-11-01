const { contextBridge } = require('electron');

// Renderer runs with plain browser APIs (getUserMedia, AudioContext).
// Expose a tiny shell for future native hooks without giving full Node access.
contextBridge.exposeInMainWorld('tunerShell', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
});
