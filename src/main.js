// Processus principal : fenêtre, protocole app:// pour servir l'interface, mises à jour depuis GitHub Releases.
const { app, BrowserWindow, protocol, net, ipcMain, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');

const RENDERER = path.join(__dirname, 'renderer');

// app:// se comporte comme une origine https : cache du modèle Whisper, presse-papiers, etc.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#0a0a0b',
    title: 'Clap Studio',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#c4c4c8', height: 52 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // l'export vidéo doit continuer fenêtre réduite
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://clap/index.html');

  // liens externes dans le navigateur, jamais de navigation dans la fenêtre
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
  win.webContents.once('did-finish-load', checkForUpdates);
  win.on('closed', () => { win = null; });
}

function serveRenderer() {
  protocol.handle('app', req => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(RENDERER, decodeURIComponent(pathname)));
    if (!file.startsWith(RENDERER + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

/* ---------- mises à jour ---------- */
const sendUpdate = payload => { if (win && !win.isDestroyed()) win.webContents.send('update', payload); };
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on('update-available', i => sendUpdate({ state: 'available', version: i.version }));
autoUpdater.on('update-not-available', () => sendUpdate({ state: 'none' }));
autoUpdater.on('download-progress', p => sendUpdate({ state: 'progress', percent: p.percent }));
autoUpdater.on('update-downloaded', i => sendUpdate({ state: 'downloaded', version: i.version }));
autoUpdater.on('error', err => { console.warn('Mise à jour :', err?.message || err); sendUpdate({ state: 'error' }); });

function checkForUpdates() {
  // en développement il n'y a pas de app-update.yml : on ne vérifie que dans la version installée
  if (!app.isPackaged) { sendUpdate({ state: 'dev' }); return; }
  autoUpdater.checkForUpdates().catch(() => {});
}

ipcMain.handle('app:info', () => ({ version: app.getVersion(), packaged: app.isPackaged }));
ipcMain.on('update:check', checkForUpdates);
ipcMain.on('update:install', () => setImmediate(() => autoUpdater.quitAndInstall(false, true)));

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  serveRenderer();
  createWindow();
});
app.on('window-all-closed', () => app.quit());
