// Pont minimal entre l'interface et le processus principal.
const { contextBridge, ipcRenderer, webFrame, webUtils } = require('electron');

contextBridge.exposeInMainWorld('clap', {
  info: () => ipcRenderer.invoke('app:info'),
  checkUpdates: () => ipcRenderer.send('update:check'),
  installUpdate: () => ipcRenderer.send('update:install'),
  onUpdate: cb => { ipcRenderer.on('update', (_e, payload) => cb(payload)); },

  saveProject: data => ipcRenderer.invoke('project:save', data),
  openProject: p => ipcRenderer.invoke('project:open', p || null),
  stat: p => ipcRenderer.invoke('file:stat', p),
  pathForFile: file => { try { return webUtils.getPathForFile(file) || null; } catch { return null; } },
  pickBackground: () => ipcRenderer.invoke('settings:background'),
  setZoom: f => webFrame.setZoomFactor(f),

  probe: p => ipcRenderer.invoke('media:probe', p),
  audio: opts => ipcRenderer.invoke('media:audio', opts),
  cancelAudio: () => ipcRenderer.send('media:cancel'),
  onAudioProgress: cb => { const h = (_e, f) => cb(f); ipcRenderer.on('media:progress', h); return () => ipcRenderer.removeListener('media:progress', h); },
  pickMedia: kind => ipcRenderer.invoke('dialog:media', kind),
  libraryList: cat => ipcRenderer.invoke('library:list', cat),
  libraryGet: id => ipcRenderer.invoke('library:get', id),
  libraryPickRoot: () => ipcRenderer.invoke('library:pickRoot'),
});
