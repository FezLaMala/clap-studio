// Pont minimal entre l'interface et le processus principal.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clap', {
  info: () => ipcRenderer.invoke('app:info'),
  checkUpdates: () => ipcRenderer.send('update:check'),
  installUpdate: () => ipcRenderer.send('update:install'),
  onUpdate: cb => { ipcRenderer.on('update', (_e, payload) => cb(payload)); },
});
