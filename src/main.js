// Processus principal : fenêtre, protocoles (interface et fichiers locaux), projets, fermeture protégée, mises à jour.
const { app, BrowserWindow, protocol, net, ipcMain, shell, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');

const RENDERER = path.join(__dirname, 'renderer');
const MEDIA = {
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', ogv: 'video/ogg', avi: 'video/x-msvideo',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
};
const extOf = p => path.extname(p).slice(1).toLowerCase();

// app:// sert l'interface ; clapfile:// lit les vidéos et images locales (avec plages d'octets pour la lecture)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  { scheme: 'clapfile', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
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

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
  // les modifications non enregistrées sont gérées par l'interface (beforeunload annule la fermeture et pose la question)
  win.on('closed', () => { win = null; });
}

function serveRenderer() {
  protocol.handle('app', req => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(RENDERER, decodeURIComponent(pathname)));
    if (!file.startsWith(RENDERER + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  protocol.handle('clapfile', async req => {
    const p = new URL(req.url).searchParams.get('p');
    const type = p && path.isAbsolute(p) && MEDIA[extOf(p)];
    if (!type) return new Response(null, { status: 403 });
    let size;
    try { size = (await fs.promises.stat(p)).size; } catch { return new Response(null, { status: 404 }); }
    const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
    if (!m) return new Response(Readable.toWeb(fs.createReadStream(p)), { headers: { ...base, 'Content-Length': String(size) } });
    let start = m[1] ? +m[1] : size - +m[2], end = m[1] && m[2] ? +m[2] : size - 1;
    end = Math.min(end, size - 1);
    if (!(start >= 0 && start <= end)) return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${size}` } });
    return new Response(Readable.toWeb(fs.createReadStream(p, { start, end })), {
      status: 206,
      headers: { ...base, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` },
    });
  });
}

/* ---------- projets et fichiers ---------- */
const PROJECT_FILTERS = [{ name: 'Projet Clap', extensions: ['clap'] }, { name: 'JSON', extensions: ['json'] }];

ipcMain.handle('project:save', async (_e, { path: p, name, content }) => {
  if (!p) {
    const r = await dialog.showSaveDialog(win, { defaultPath: (name || 'Projet') + '.clap', filters: PROJECT_FILTERS });
    if (r.canceled || !r.filePath) return null;
    p = r.filePath;
  }
  await fs.promises.writeFile(p, content, 'utf8');
  return p;
});

ipcMain.handle('project:open', async (_e, p) => {
  if (!p) {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: PROJECT_FILTERS });
    if (r.canceled || !r.filePaths[0]) return null;
    p = r.filePaths[0];
  }
  if (!/\.(clap|json)$/i.test(p)) return { error: 'type', path: p };
  try { return { path: p, content: await fs.promises.readFile(p, 'utf8') }; } catch { return { error: 'missing', path: p }; }
});

ipcMain.handle('file:stat', async (_e, p) => {
  try { const s = await fs.promises.stat(p); return s.isFile() ? { size: s.size } : null; } catch { return null; }
});

// image de fond choisie dans les paramètres : copiée dans le dossier de l'application
ipcMain.handle('settings:background', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const dir = app.getPath('userData');
  for (const f of await fs.promises.readdir(dir)) if (f.startsWith('background.')) await fs.promises.rm(path.join(dir, f), { force: true });
  const dest = path.join(dir, 'background.' + extOf(r.filePaths[0]));
  await fs.promises.copyFile(r.filePaths[0], dest);
  return dest;
});

/* ---------- mises à jour ---------- */
const sendUpdate = payload => { if (win && !win.isDestroyed()) win.webContents.send('update', payload); };
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on('update-available', i => sendUpdate({ state: 'available', version: i.version }));
autoUpdater.on('update-not-available', () => sendUpdate({ state: 'none' }));
autoUpdater.on('download-progress', p => sendUpdate({ state: 'progress', percent: p.percent }));
autoUpdater.on('update-downloaded', i => sendUpdate({ state: 'downloaded', version: i.version }));
autoUpdater.on('error', err => { console.warn('Mise à jour :', err?.message || err); sendUpdate({ state: 'error' }); });

// lancée par l'interface (au démarrage si le paramètre est actif, ou à la demande)
ipcMain.on('update:check', () => {
  if (!app.isPackaged) { sendUpdate({ state: 'dev' }); return; }
  autoUpdater.checkForUpdates().catch(() => {});
});
ipcMain.on('update:install', () => setImmediate(() => autoUpdater.quitAndInstall(false, true)));
ipcMain.handle('app:info', () => ({ version: app.getVersion(), packaged: app.isPackaged }));

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  serveRenderer();
  createWindow();
});
app.on('window-all-closed', () => app.quit());
