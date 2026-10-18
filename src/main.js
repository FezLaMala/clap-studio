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
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml',
  srt: 'text/plain', vtt: 'text/vtt', json: 'application/json', txt: 'text/plain', clap: 'application/json',
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

/* ---------- audio : ffmpeg lit la piste voulue, sur la plage voulue, avec une vraie progression ---------- */
const { spawn } = require('node:child_process');
const ffmpegPath = () => { try { return require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked'); } catch { return null; } };
const VIDEO_FILTERS = [{ name: 'Médias', extensions: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'ogv', 'srt', 'vtt', 'json', 'txt', 'clap', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'] }];

// nom lisible d'une piste à partir de son « handler_name » / « title » (Medal, OBS, Discord…)
function trackLabel(meta, i) {
  const s = (meta || '').toLowerCase();
  if (/voice|voix|mic/.test(s)) return 'voice';
  if (/application|game|jeu|pc|desktop|system/.test(s)) return 'game';
  if (/(^|:)all|tout|mix/.test(s)) return 'all';
  return meta ? meta.replace(/^\d+:/, '') : `#${i + 1}`;
}
// liste des pistes audio (ffmpeg -i écrit la description du fichier sur stderr)
ipcMain.handle('media:probe', async (_e, p) => {
  const ff = ffmpegPath(); if (!ff || !p || !path.isAbsolute(p)) return null;
  const err = await new Promise(res => { let s = ''; const c = spawn(ff, ['-hide_banner', '-i', p], { windowsHide: true }); c.stderr.on('data', d => { s += d; }); c.on('close', () => res(s)); c.on('error', () => res('')); });
  const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(err), audio = [];
  const blocks = err.split(/\n(?=\s*Stream #)/);
  for (const b of blocks) {
    if (!/Stream #\d+:\d+.*Audio:/.test(b.split('\n')[0])) continue;
    const meta = /(?:title|handler_name)\s*:\s*(.+)/.exec(b)?.[1]?.trim() || '';
    audio.push({ index: audio.length, label: trackLabel(meta, audio.length), raw: meta, isDefault: /\(default\)/.test(b.split('\n')[0]) });
  }
  return { duration: dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : 0, audio };
});
// audio mono 16 kHz en flottants (format attendu par Whisper) ; progression envoyée au fil de la lecture
let audioJob = null;
ipcMain.handle('media:audio', async (e, { path: p, track = 0, start = 0, end = 0 }) => {
  const ff = ffmpegPath(); if (!ff || !p || !path.isAbsolute(p)) return { error: 'ffmpeg' };
  const args = ['-hide_banner', '-nostdin'];
  if (start > 0) args.push('-ss', String(start));
  if (end > start) args.push('-to', String(end));
  args.push('-i', p, '-map', `0:a:${Math.max(0, track | 0)}?`, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1');
  const span = end > start ? end - start : 0;
  return new Promise(resolve => {
    const c = spawn(ff, args, { windowsHide: true }); audioJob = c;
    const parts = []; let err = '', total = span, last = 0;
    c.stdout.on('data', d => parts.push(d));
    c.stderr.on('data', d => {
      err += d; if (err.length > 20000) err = err.slice(-8000);
      if (!total) { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(err); if (m) total = Math.max(0, +m[1] * 3600 + +m[2] * 60 + +m[3] - start); }
      const t = /time=(\d+):(\d+):([\d.]+)/g; let m, got = null; while ((m = t.exec(String(d)))) got = +m[1] * 3600 + +m[2] * 60 + +m[3];
      if (got != null && total && Date.now() - last > 100) { last = Date.now(); e.sender.send('media:progress', Math.min(1, got / total)); }
    });
    c.on('error', () => resolve({ error: 'ffmpeg' }));
    c.on('close', code => {
      audioJob = null;
      if (code !== 0 && !parts.length) return resolve({ error: /does not contain any stream|matches no streams/.test(err) ? 'noaudio' : 'decode' });
      const buf = Buffer.concat(parts);
      resolve({ data: new Uint8Array(buf.buffer, buf.byteOffset, buf.length - (buf.length % 4)) });
    });
  });
});
ipcMain.on('media:cancel', () => { try { audioJob?.kill(); } catch {} });

// sélecteur natif (champ « Nom du fichier » vide, dossier vidéos par défaut)
ipcMain.handle('dialog:media', async (_e, kind) => {
  const filters = kind === 'image' ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'] }] : VIDEO_FILTERS;
  const r = await dialog.showOpenDialog(win, { defaultPath: app.getPath('videos') + path.sep, properties: ['openFile', ...(kind === 'image' ? [] : ['multiSelections'])], filters });
  if (r.canceled) return [];
  return Promise.all(r.filePaths.map(async p => { try { return { path: p, size: (await fs.promises.stat(p)).size }; } catch { return null; } })).then(l => l.filter(Boolean));
});

/* ---------- bibliothèque Brawlhalla : images du jeu installé et rendus du Studio WaveDash ---------- */
const BH_DEFAULT = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Brawlhalla';
let bhRoot = null;
function brawlRoot() {
  if (bhRoot && fs.existsSync(path.join(bhRoot, 'Game.swz'))) return bhRoot;
  const saved = path.join(app.getPath('userData'), 'brawlhalla-path.txt');
  for (const p of [fs.existsSync(saved) ? fs.readFileSync(saved, 'utf8').trim() : '', BH_DEFAULT]) if (p && fs.existsSync(path.join(p, 'Game.swz'))) return (bhRoot = p);
  return null;
}
const studioRenders = () => path.join(app.getPath('appData'), 'WaveDash', 'studio', 'renders');
const LIB_CATS = {
  emotes: ['sprites/AutoGenerated/Sprites_Emojis', /\.png$/i],
  banners: ['sprites/AutoGenerated/Sprites_Emote', /a_Flag1a_.*\.png$/i],
  avatars: ['sprites/AutoGenerated/Sprites_Avatars', /\.png$/i],
  backgrounds: ['mapArt/Backgrounds', /\.(jpe?g|png)$/i],
  images: ['images', /\.(jpe?g|png)$/i],
};
function walk(dir, re, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, d.name); if (d.isDirectory()) walk(p, re, out); else if (re.test(d.name)) out.push(p); }
  return out;
}
const libCache = new Map();
ipcMain.handle('library:list', async (_e, cat) => {
  if (cat === 'renders') {
    const dir = studioRenders(); if (!fs.existsSync(dir)) return { items: [] };
    const items = [];
    for (const id of fs.readdirSync(dir)) {
      try { const m = JSON.parse(fs.readFileSync(path.join(dir, id, 'render.json'), 'utf8')); items.push({ id: 'r:' + id, name: m.label, thumb: path.join(dir, id, m.files[Math.floor(m.files.length / 2)]), frames: m.frames, created: m.created }); } catch {}
    }
    return { items: items.sort((a, b) => b.created - a.created) };
  }
  const root = brawlRoot(); if (!root) return { missing: true, items: [] };
  const def = LIB_CATS[cat]; if (!def) return { items: [] };
  if (!libCache.has(cat)) libCache.set(cat, walk(path.join(root, def[0]), def[1]).sort());
  return { items: libCache.get(cat).map(p => ({ id: 'g:' + path.relative(root, p), name: path.basename(p).replace(/^a_|\.\w+$/g, '').replace(/_/g, ' '), thumb: p })) };
});
// image prête à insérer (data URL) ; un rendu animé du Studio devient un PNG animé
ipcMain.handle('library:get', async (_e, id) => {
  const mime = p => (/\.png$/i.test(p) ? 'image/png' : 'image/jpeg');
  if (typeof id !== 'string') return null;
  if (id.startsWith('g:')) {
    const root = brawlRoot(); if (!root) return null;
    const p = path.resolve(root, id.slice(2)); if (!p.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(p)) return null;
    return { name: path.basename(p), data: `data:${mime(p)};base64,${(await fs.promises.readFile(p)).toString('base64')}` };
  }
  if (id.startsWith('r:')) {
    const dir = path.resolve(studioRenders(), id.slice(2)); if (!dir.startsWith(path.resolve(studioRenders()) + path.sep)) return null;
    let m; try { m = JSON.parse(fs.readFileSync(path.join(dir, 'render.json'), 'utf8')); } catch { return null; }
    if (m.frames <= 1) return { name: m.label, data: `data:image/png;base64,${(await fs.promises.readFile(path.join(dir, m.files[0]))).toString('base64')}` };
    const ff = ffmpegPath(), out = path.join(app.getPath('temp'), `clap-render-${id.slice(2)}.png`);
    if (!ff) return null;
    await new Promise(r => { const c = spawn(ff, ['-y', '-framerate', '24', '-i', path.join(dir, 'frame_%04d.png'), '-plays', '0', '-f', 'apng', out], { windowsHide: true }); c.on('close', r); c.on('error', r); });
    if (!fs.existsSync(out)) return null;
    return { name: m.label, data: `data:image/png;base64,${(await fs.promises.readFile(out)).toString('base64')}` };
  }
  return null;
});
ipcMain.handle('library:pickRoot', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  const p = r.filePaths[0]; if (r.canceled || !p || !fs.existsSync(path.join(p, 'Game.swz'))) return false;
  fs.writeFileSync(path.join(app.getPath('userData'), 'brawlhalla-path.txt'), p); bhRoot = p; libCache.clear(); return true;
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
