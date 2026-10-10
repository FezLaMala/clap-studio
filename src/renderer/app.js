/* Clap Studio — éditeur de sous-titres (ex Clap Studio) + import, calage et vidéo incrustée (ex Clap Sync). */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const fmt = (t, ms = true) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t % 1) * 100); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + (ms ? '.' + String(c).padStart(2, '0') : ''); };
const parseT = v => { v = String(v).trim().replace(',', '.'); if (v.includes(':')) { const p = v.split(':').map(Number); if (p.some(isNaN)) return null; return p.reduce((a, x) => a * 60 + x, 0); } const n = parseFloat(v); return isNaN(n) ? null : n; };
const rgba = (hex, a) => { const n = parseInt(String(hex).slice(1), 16) || 0; return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const safeName = s => (String(s || '').replace(/[\\/:*?"<>|]+/g, '').trim() || 'clap').slice(0, 60);
const STEP = 0.05;
const NATIVE = window.clap || null; // pont exposé par l'application de bureau (preload)

/* ---------- icônes ---------- */
const ICO = {
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="7" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none"/>',
  prev: '<path d="M6 5v14"/><path d="M19 5l-9 7 9 7z"/>',
  next: '<path d="M18 5v14"/><path d="M5 5l9 7-9 7z"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  wand: '<path d="M4 20L16 8M14 4l1.5 2.5L18 8l-2.5 1.5L14 12l-1.5-2.5L10 8l2.5-1.5zM19 14l.8 1.2L21 16l-1.2.8L19 18l-.8-1.2L17 16l1.2-.8z"/>',
  fliph: '<path d="M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z"/>',
  flipv: '<path d="M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z"/>',
  reset: '<path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7M4 4v5h5"/>',
  split: '<path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>', right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  center: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  magnet: '<path d="M5 4v7a7 7 0 0014 0V4h-4v7a3 3 0 01-6 0V4z"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  alignL: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>', alignC: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>', alignR: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/>',
};
const ico = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICO[n] || ''}</svg>`;
const hydrateIcons = (root = document) => $$('[data-ic]', root).forEach(el => { el.outerHTML = ico(el.dataset.ic); });

/* ---------- textes ---------- */
const I18N = {
  fr: {
    import: 'Importer', auto: 'Sous-titres auto', export: 'Exporter', tabSubs: 'Sous-titres', tabStyle: 'Style',
    subs: 'Sous-titres', add: 'Ajouter', format: 'Format', orig: 'Original', dropHint: 'Glisse une vidéo ou des sous-titres ici', style: 'Style du texte',
    cut: 'Couper', removePart: 'Retirer la partie', restorePart: 'Réactiver la partie', addAtHead: 'Sous-titre ici', snap: 'Aimant', zoom: 'Zoom',
    tVideo: 'Vidéo', tAudio: 'Audio', tSubs: 'Sous-titres',
    shift: 'Décaler tout', alignFirst: '1er ici', tShifted: d => `Sous-titres décalés de ${d > 0 ? '+' : ''}${d.toFixed(2)} s`, tAligned: 'Premier sous-titre calé sur la tête de lecture',
    impTitle: 'Importer', impDesc: 'Ajoute une vidéo, un fichier de sous-titres (.srt, .vtt, .json) ou les deux à la fois. Tu peux aussi glisser les fichiers n\'importe où dans la fenêtre, ou coller le texte avec Ctrl+V.',
    impFiles: 'Choisir des fichiers', impFilesHint: 'Vidéo · SRT · WebVTT · JSON', pasteCode: 'Ou colle le contenu d\'un fichier de sous-titres', apply: 'Appliquer',
    tSubsLoaded: n => `${n} sous-titres importés`, tSubsBad: n => `Fichier de sous-titres illisible : ${n}`, tNoSubsIn: 'Aucun sous-titre lisible dans ce texte.', tPasteFirst: 'Colle d\'abord le contenu du fichier.',
    tMs: 'Les temps semblaient en millisecondes : convertis en secondes.', tUnknown: n => `Format non reconnu : ${n}`, noVideo: 'Sans vidéo', pasted: 'texte collé',
    genTitle: 'Sous-titres automatiques', genDesc: 'Clap écoute l\'audio et écrit ce qui est dit, avec le minutage (modèle Whisper exécuté sur ton ordinateur). Le premier lancement télécharge le modèle, il faut donc une connexion ; il reste ensuite en cache. Si tu colles un texte ci-dessous, il est utilisé à la place de la transcription.',
    genMode: 'Méthode', modeAi: 'Transcription IA (texte réel)', modeDetect: 'Détection de la parole seulement', genModel: 'Modèle', mTiny: 'Rapide (tiny, ~40 Mo)', mBase: 'Équilibré (base, ~75 Mo)', mSmall: 'Précis (small, ~250 Mo)',
    progTitle: 'Transcription en cours', progLoad: 'Chargement du modèle', progAudio: 'Lecture de l\'audio…', progRun: 'Transcription en cours', tAiFail: 'Transcription IA indisponible (modèle non téléchargeable ou audio illisible). Détection simple utilisée à la place.', tAiEmpty: 'Aucune parole reconnue. Détection simple utilisée à la place.',
    genLang: 'Langue parlée', genSens: 'Sensibilité', genReplace: 'Remplacer les sous-titres existants', genScript: 'Texte à répartir (facultatif, une ligne par sous-titre)',
    genGo: 'Générer', genDict: 'Dictée en direct', cancel: 'Annuler', close: 'Fermer', copy: 'Copier', save: 'Enregistrer',
    expDesc: 'Les parties retirées sont supprimées et les temps sont recalculés.', expProject: 'Projet', expVideo: 'Vidéo incrustée',
    expVideoDesc: 'Crée une copie de la vidéo avec les sous-titres gravés dans l\'image, sans les parties retirées. L\'enregistrement se fait en temps réel et le son est lu pendant l\'export : garde Clap ouvert jusqu\'à la fin.',
    expGo: 'Créer la vidéo', expStop: 'Arrêter', saveVideo: 'Enregistrer la vidéo', expNoVideo: 'Importe d\'abord une vidéo pour créer une version sous-titrée.', expReady: d => `Durée finale : ${d}`,
    expPrep: 'Préparation…', expRun: (a, b) => `Enregistrement ${a} / ${b}`, expCancelled: 'Export arrêté.', expDone: 'Vidéo prête', expDoneInfo: (mb, audio) => `${mb} Mo${audio ? '' : ' · sans son'}`,
    expFail: m => `L'export a échoué : ${m}`, expUnsupported: 'L\'export vidéo n\'est pas disponible ici.', expNothing: 'Toutes les parties sont retirées : rien à exporter.',
    emptyT: 'Aucun sous-titre', emptyD: 'Lance « Sous-titres auto », importe un fichier .srt, .vtt ou .json, ou ajoutes-en un à la tête de lecture.',
    sub: 'Sous-titre', newSub: 'Nouveau sous-titre', clip: 'Partie',
    presets: 'Styles rapides', applyAll: 'Appliquer à tous les sous-titres',
    gOpacity: 'Opacité', opacity: 'Opacité du texte', gText: 'Texte', font: 'Police', size: 'Taille', weight: 'Graisse', align: 'Alignement', italic: 'Italique', upper: 'MAJUSCULES',
    gColor: 'Couleurs', color: 'Couleur', stroke: 'Contour', strokeW: 'Épaisseur', bg: 'Fond', bgOp: 'Opacité du fond', shadow: 'Ombre / lueur', shadowColor: 'Couleur ombre',
    gPos: 'Position', posX: 'Horizontal', posY: 'Vertical', centerHint: 'Glisse le texte sur la scène, ou utilise les flèches (Maj = pas plus grand).',
    gShape: 'Forme', rot: 'Rotation', sx: 'Étendre (largeur)', sy: 'Aplatir (hauteur)', skew: 'Inclinaison', ls: 'Espacement', flipH: 'Retourner ↔', flipV: 'Retourner ↕', reset: 'Réinitialiser',
    gAnim: 'Apparition', anim: 'Animation', aNone: 'Aucune', aFade: 'Fondu', aPop: 'Pop', aSlide: 'Glissé', aBounce: 'Rebond',
    tLoaded: 'Vidéo chargée', tDemo: 'Clip de démonstration', tAnalyzing: 'Analyse de l\'audio…', tDone: n => `${n} sous-titres créés`, tNoAudio: 'Audio illisible : sous-titres répartis à intervalles réguliers.',
    tCopied: 'Copié dans le presse-papiers', tCopyFail: 'Copie impossible : sélectionne le texte et copie-le à la main.', tNoSR: 'La dictée vocale n\'est pas disponible ici.', tSRErr: 'Dictée interrompue (micro refusé ou indisponible).',
    tDictOn: 'Dictée en cours, lecture lancée', tDictOff: 'Dictée terminée', tBadVideo: 'Impossible de lire ce fichier vidéo (essaie MP4 ou WebM).', tCut: 'Vidéo coupée à la tête de lecture', tCutNone: 'Place la tête de lecture à l\'intérieur d\'une partie.',
    tRemoved: 'Partie retirée du montage', tRestored: 'Partie réactivée', tNoSeg: 'Clique d\'abord sur une partie de la vidéo.', tSplitSub: 'Sous-titre coupé en deux',
    info: (n, d) => `${n} · ${d}`,
    checkUpd: 'Rechercher des mises à jour', updChecking: 'Recherche de mises à jour…', updAvail: v => `Version ${v} disponible`, updDl: 'Téléchargement', updReady: v => `Version ${v} prête`,
    updReadyMsg: 'Redémarre Clap pour l\'installer.', later: 'Plus tard', restart: 'Redémarrer', updNone: 'Clap est à jour.', updDev: 'Mises à jour désactivées en mode développement.', updErr: 'Impossible de vérifier les mises à jour.',
    demo: ['Bienvenue dans Clap Studio', 'Les sous-titres se génèrent tout seuls…', 'Tu peux les éditer, les déplacer et les étirer.', 'Importe un .srt et cale-le en un clic.', 'Coupe ta vidéo en plusieurs parties sur la timeline.', 'Puis exporte en SRT, WebVTT ou en vidéo sous-titrée.'],
  },
  en: {
    import: 'Import', auto: 'Auto subtitles', export: 'Export', tabSubs: 'Subtitles', tabStyle: 'Style',
    subs: 'Subtitles', add: 'Add', format: 'Format', orig: 'Original', dropHint: 'Drop a video or subtitles here', style: 'Text style',
    cut: 'Cut', removePart: 'Remove part', restorePart: 'Restore part', addAtHead: 'Subtitle here', snap: 'Snap', zoom: 'Zoom',
    tVideo: 'Video', tAudio: 'Audio', tSubs: 'Subtitles',
    shift: 'Shift all', alignFirst: 'First here', tShifted: d => `Subtitles shifted by ${d > 0 ? '+' : ''}${d.toFixed(2)} s`, tAligned: 'First subtitle aligned to the playhead',
    impTitle: 'Import', impDesc: 'Add a video, a subtitle file (.srt, .vtt, .json) or both at once. You can also drop files anywhere in the window, or paste the text with Ctrl+V.',
    impFiles: 'Choose files', impFilesHint: 'Video · SRT · WebVTT · JSON', pasteCode: 'Or paste the content of a subtitle file', apply: 'Apply',
    tSubsLoaded: n => `${n} subtitles imported`, tSubsBad: n => `Unreadable subtitle file: ${n}`, tNoSubsIn: 'No readable subtitles in this text.', tPasteFirst: 'Paste the file content first.',
    tMs: 'Timings looked like milliseconds: converted to seconds.', tUnknown: n => `Unsupported format: ${n}`, noVideo: 'No video', pasted: 'pasted text',
    genTitle: 'Automatic subtitles', genDesc: 'Clap listens to the audio and writes what is said, with timings (Whisper model running on your computer). The first run downloads the model, so it needs a connection; it is cached afterwards. If you paste a text below, it is used instead of the transcription.',
    genMode: 'Method', modeAi: 'AI transcription (real text)', modeDetect: 'Speech detection only', genModel: 'Model', mTiny: 'Fast (tiny, ~40 MB)', mBase: 'Balanced (base, ~75 MB)', mSmall: 'Accurate (small, ~250 MB)',
    progTitle: 'Transcribing', progLoad: 'Loading the model', progAudio: 'Reading the audio…', progRun: 'Transcribing', tAiFail: 'AI transcription is not available (model could not be downloaded or audio unreadable). Plain detection used instead.', tAiEmpty: 'No speech recognized. Plain detection used instead.',
    genLang: 'Spoken language', genSens: 'Sensitivity', genReplace: 'Replace existing subtitles', genScript: 'Text to spread (optional, one line per subtitle)',
    genGo: 'Generate', genDict: 'Live dictation', cancel: 'Cancel', close: 'Close', copy: 'Copy', save: 'Save',
    expDesc: 'Removed parts are dropped and timings are recalculated.', expProject: 'Project', expVideo: 'Burned-in video',
    expVideoDesc: 'Creates a copy of the video with the subtitles burned into the picture, without the removed parts. Recording happens in real time and the sound plays during the export: keep Clap open until it finishes.',
    expGo: 'Create video', expStop: 'Stop', saveVideo: 'Save video', expNoVideo: 'Import a video first to create a subtitled version.', expReady: d => `Final duration: ${d}`,
    expPrep: 'Preparing…', expRun: (a, b) => `Recording ${a} / ${b}`, expCancelled: 'Export stopped.', expDone: 'Video ready', expDoneInfo: (mb, audio) => `${mb} MB${audio ? '' : ' · no sound'}`,
    expFail: m => `Export failed: ${m}`, expUnsupported: 'Video export is not available here.', expNothing: 'Every part is removed: nothing to export.',
    emptyT: 'No subtitles yet', emptyD: 'Run “Auto subtitles”, import a .srt, .vtt or .json file, or add one at the playhead.',
    sub: 'Subtitle', newSub: 'New subtitle', clip: 'Part',
    presets: 'Quick styles', applyAll: 'Apply to all subtitles',
    gOpacity: 'Opacity', opacity: 'Text opacity', gText: 'Text', font: 'Font', size: 'Size', weight: 'Weight', align: 'Alignment', italic: 'Italic', upper: 'UPPERCASE',
    gColor: 'Colors', color: 'Color', stroke: 'Outline', strokeW: 'Thickness', bg: 'Background', bgOp: 'Background opacity', shadow: 'Shadow / glow', shadowColor: 'Shadow color',
    gPos: 'Position', posX: 'Horizontal', posY: 'Vertical', centerHint: 'Drag the text on the stage, or use the arrows (Shift = bigger step).',
    gShape: 'Shape', rot: 'Rotation', sx: 'Stretch (width)', sy: 'Flatten (height)', skew: 'Slant', ls: 'Spacing', flipH: 'Flip ↔', flipV: 'Flip ↕', reset: 'Reset',
    gAnim: 'Entrance', anim: 'Animation', aNone: 'None', aFade: 'Fade', aPop: 'Pop', aSlide: 'Slide', aBounce: 'Bounce',
    tLoaded: 'Video loaded', tDemo: 'Demo clip', tAnalyzing: 'Analyzing audio…', tDone: n => `${n} subtitles created`, tNoAudio: 'Audio could not be read: subtitles spread at regular intervals.',
    tCopied: 'Copied to clipboard', tCopyFail: 'Copy failed: select the text and copy it by hand.', tNoSR: 'Voice dictation is not available here.', tSRErr: 'Dictation stopped (microphone denied or unavailable).',
    tDictOn: 'Dictation running, playback started', tDictOff: 'Dictation finished', tBadVideo: 'This video file cannot be played (try MP4 or WebM).', tCut: 'Video cut at the playhead', tCutNone: 'Put the playhead inside a part first.',
    tRemoved: 'Part removed from the edit', tRestored: 'Part restored', tNoSeg: 'Click a video part first.', tSplitSub: 'Subtitle split in two',
    info: (n, d) => `${n} · ${d}`,
    checkUpd: 'Check for updates', updChecking: 'Checking for updates…', updAvail: v => `Version ${v} available`, updDl: 'Downloading', updReady: v => `Version ${v} ready`,
    updReadyMsg: 'Restart Clap to install it.', later: 'Later', restart: 'Restart', updNone: 'Clap is up to date.', updDev: 'Updates are disabled in development mode.', updErr: 'Could not check for updates.',
    demo: ['Welcome to Clap Studio', 'Subtitles generate themselves…', 'Edit them, move them and stretch them.', 'Import a .srt and sync it in one click.', 'Cut your video into parts on the timeline.', 'Then export as SRT, WebVTT or a subtitled video.'],
  },
};
let LANG = 'fr';
try { const l = localStorage.getItem('clap-lang'); if (l === 'en' || l === 'fr') LANG = l; } catch (e) {}
const T = (k, ...a) => { const v = (I18N[LANG][k] ?? I18N.fr[k] ?? k); return typeof v === 'function' ? v(...a) : v; };

/* ---------- état ---------- */
const FONTS = ['Montserrat', 'Poppins', 'Sora', 'Oswald', 'Anton', 'Bebas Neue', 'Bangers', 'Permanent Marker', 'Playfair Display', 'Caveat', 'Pacifico', 'Lobster', 'Roboto Mono'];
const DEF = { font: 'Montserrat', size: 64, weight: 800, italic: false, upper: false, align: 'center', color: '#ffffff', stroke: '#000000', strokeW: 5, bg: '#000000', bgOp: 0, shadow: 30, shadowColor: '#000000', op: 100, x: 50, y: 84, rot: 0, sx: 100, sy: 100, skew: 0, ls: 0, flipH: false, flipV: false, anim: 'pop' };
const PRESETS = [
  { n: { fr: 'Classique', en: 'Classic' }, st: { font: 'Montserrat', size: 62, weight: 700, upper: false, italic: false, color: '#ffffff', stroke: '#000000', strokeW: 5, bgOp: 0, shadow: 30, shadowColor: '#000000', ls: 0, rot: 0, anim: 'fade' } },
  { n: { fr: 'TikTok', en: 'TikTok' }, st: { font: 'Anton', size: 96, weight: 400, upper: true, italic: false, color: '#ffe14d', stroke: '#000000', strokeW: 9, bgOp: 0, shadow: 40, shadowColor: '#000000', ls: 1, rot: 0, anim: 'pop' } },
  { n: { fr: 'Néon', en: 'Neon' }, st: { font: 'Poppins', size: 72, weight: 700, upper: false, italic: false, color: '#c9fbff', stroke: '#22d3ee', strokeW: 2, bgOp: 0, shadow: 85, shadowColor: '#22d3ee', ls: 1, rot: 0, anim: 'fade' } },
  { n: { fr: 'Cinéma', en: 'Cinema' }, st: { font: 'Playfair Display', size: 54, weight: 700, upper: false, italic: true, color: '#f4efe2', stroke: '#000000', strokeW: 0, bgOp: 0, shadow: 55, shadowColor: '#000000', ls: 1, rot: 0, anim: 'fade' } },
  { n: { fr: 'Comics', en: 'Comic' }, st: { font: 'Bangers', size: 88, weight: 400, upper: true, italic: false, color: '#fff35c', stroke: '#d1126b', strokeW: 8, bgOp: 0, shadow: 60, shadowColor: '#000000', ls: 2, rot: -4, anim: 'bounce' } },
  { n: { fr: 'Étiquette', en: 'Label' }, st: { font: 'Poppins', size: 54, weight: 700, upper: false, italic: false, color: '#ffffff', stroke: '#000000', strokeW: 0, bg: '#000000', bgOp: 72, shadow: 0, shadowColor: '#000000', ls: 0, rot: 0, anim: 'slide' } },
  { n: { fr: 'Manuscrit', en: 'Handwritten' }, st: { font: 'Caveat', size: 92, weight: 700, upper: false, italic: false, color: '#ffffff', stroke: '#000000', strokeW: 4, bgOp: 0, shadow: 30, shadowColor: '#000000', ls: 0, rot: -2, anim: 'pop' } },
  { n: { fr: 'Rétro', en: 'Retro' }, st: { font: 'Lobster', size: 84, weight: 400, upper: false, italic: false, color: '#ff8fd0', stroke: '#3a0f5c', strokeW: 7, bgOp: 0, shadow: 50, shadowColor: '#7c3aed', ls: 1, rot: 0, anim: 'bounce' } },
];

const S = {
  duration: 24, t: 0, playing: false, hasVideo: false, isDemo: true, file: null, vw: 0, vh: 0, vname: '',
  peaks: null, aspect: 'orig', zoom: 40, snap: true, applyAll: false, subLang: 'fr-FR',
  subs: [], segs: [{ id: uid(), a: 0, b: 24, off: false }], selSub: null, selSeg: null, rev: 0,
};
const vid = $('#vid'), demo = $('#demo'), stage = $('#stage'), subEl = $('#subEl'), subIn = $('#subIn');
const cur = () => S.subs.find(s => s.id === S.selSub) || null;
const targets = () => S.applyAll ? S.subs : (cur() ? [cur()] : []);
const sortSubs = () => S.subs.sort((a, b) => a.a - b.a);
const mkSub = (a, b, text, st) => ({ id: uid(), a, b, text, st: { ...DEF, ...(st || {}) } });
let exporting = false;

/* ---------- historique ---------- */
let undoStack = [], redoStack = [], lastSnapAt = 0;
const snapshot = () => JSON.stringify({ subs: S.subs, segs: S.segs });
function snap() { undoStack.push(snapshot()); if (undoStack.length > 80) undoStack.shift(); redoStack = []; lastSnapAt = performance.now(); }
function snapSoft() { if (performance.now() - lastSnapAt > 900) snap(); }
function restore(json) {
  const o = JSON.parse(json); S.subs = o.subs; S.segs = o.segs;
  if (!S.subs.find(s => s.id === S.selSub)) S.selSub = S.subs[0]?.id || null;
  if (!S.segs.find(s => s.id === S.selSeg)) S.selSeg = null;
  renderAll();
}
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); }

/* ---------- notifications ---------- */
function toast(msg, err) {
  const d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.textContent = msg;
  $('#toasts').appendChild(d);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 650); }, 3600);
}

/* ---------- fenêtres ---------- */
const isOpen = s => $(s).classList.contains('open');
function openModal(s) {
  const m = $(s); clearTimeout(m._t); if (isOpen(s)) return;
  m.hidden = false; void m.offsetWidth; m.classList.add('open');
}
function closeModal(s) {
  const m = $(s); if (m.hidden) return;
  m.classList.remove('open'); clearTimeout(m._t); m._t = setTimeout(() => { m.hidden = true; }, 520);
}

/* ---------- segments (coupes) ---------- */
const segAt = t => S.segs.find((g, i) => t >= g.a && (t < g.b || i === S.segs.length - 1));
const nextKept = t => { const g = S.segs.find(x => !x.off && x.a >= t - 1e-6); return g ? g.a : null; };
function remap(t) { let off = 0; for (const g of S.segs) { if (g.b <= t) { if (g.off) off += g.b - g.a; } else { if (g.a < t && g.off) off += t - g.a; break; } } return t - off; }
function keptDuration() { return S.segs.reduce((n, g) => n + (g.off ? 0 : g.b - g.a), 0); }

/* ---------- lecture ---------- */
function setT(t, fromVideo) {
  if (exporting) return;
  S.t = clamp(t, 0, S.duration);
  if (S.hasVideo && !fromVideo && Math.abs(vid.currentTime - S.t) > 0.02) { try { vid.currentTime = S.t; } catch (e) {} }
}
function play() {
  if (exporting) return;
  if (S.t >= S.duration - 0.05) setT(S.segs.find(g => !g.off)?.a ?? 0);
  const g = segAt(S.t); if (g && g.off) { const n = nextKept(S.t); if (n == null) return; setT(n); }
  S.playing = true; if (S.hasVideo) vid.play().catch(() => {});
  updPlayBtn(); renderOverlay(true);
}
function pause() { S.playing = false; if (S.hasVideo && !exporting) vid.pause(); stopDictation(); updPlayBtn(); renderOverlay(true); }
function updPlayBtn() { $('#tPlay').innerHTML = ico(S.playing ? 'pause' : 'play'); }
vid.addEventListener('ended', () => { if (!exporting) pause(); });

let lastFrame = performance.now(), lastLiveId = null;
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
  if (exporting) S.t = vid.currentTime;
  else if (S.playing) {
    if (S.hasVideo) S.t = vid.currentTime; else S.t += dt;
    const g = segAt(S.t);
    if (g && g.off) { const n = nextKept(S.t); if (n == null) { setT(S.duration); pause(); } else setT(n); }
    else if (S.t >= S.duration - 0.02) { setT(S.duration); pause(); }
  }
  if (!S.hasVideo) drawDemo();
  $('#ph').style.transform = `translateX(${S.t * S.zoom}px)`;
  $('#tcode').innerHTML = fmt(S.t) + ' <small>/ ' + fmt(S.duration, false) + '</small>';
  const act = activeSub(); const aid = act ? act.id : null;
  if (aid !== lastLiveId) {
    lastLiveId = aid;
    $$('.li.live').forEach(e => e.classList.remove('live')); $$('.blk.live').forEach(e => e.classList.remove('live'));
    if (aid) { $(`.li[data-id="${aid}"]`)?.classList.add('live'); $(`.blk[data-id="${aid}"]`)?.classList.add('live'); }
  }
  renderOverlay();
  if (S.playing || exporting) { const sc = $('#tlScroll'), x = S.t * S.zoom; if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 60); }
  requestAnimationFrame(frame);
}

/* ---------- scène de démonstration (sans vidéo) ---------- */
function drawDemo() {
  const g = demo.getContext('2d'), w = demo.width, h = demo.height, t = S.t;
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#1c1c1f'); gr.addColorStop(1, '#070708');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const x = (Math.sin(t * .25 + i * 1.7) * .4 + .5) * w, y = (Math.cos(t * .2 + i * 2.3) * .35 + .5) * h, r = Math.min(w, h) * (.18 + .05 * Math.sin(t * .6 + i));
    const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(255,255,255,${.07 + .03 * Math.sin(t + i)})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.13)';
  if (S.isDemo) { g.font = `600 ${Math.max(10, Math.min(w, h) * .045)}px 'Segoe UI', sans-serif`; g.fillText(LANG === 'fr' ? 'CLIP DE DÉMONSTRATION' : 'DEMO CLIP', w / 2, h * .17); }
  g.font = `500 ${Math.max(10, Math.min(w, h) * .085)}px 'Cascadia Mono', Consolas, monospace`; g.fillText(fmt(t), w / 2, h * .32);
}
const DEMO_RANGES = [[.8, 3.6], [4.2, 7.4], [8, 11.2], [12, 15], [15.8, 19], [19.8, 23]];
function demoPeaks() {
  const n = Math.floor(S.duration / STEP), p = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i * STEP, inside = DEMO_RANGES.some(r => t >= r[0] && t <= r[1]); p[i] = inside ? .22 + .2 * Math.abs(Math.sin(t * 17)) * Math.abs(Math.sin(t * 3.1 + 1)) + Math.random() * .03 : .015 + Math.random() * .015; }
  return p;
}
function loadDemo() {
  S.hasVideo = false; S.isDemo = true; S.duration = 24; S.t = 0; S.vname = T('tDemo'); S.vw = 1920; S.vh = 1080; S.file = null;
  vid.hidden = true; demo.hidden = false; if (vid.src) { try { URL.revokeObjectURL(vid.src); } catch (e) {} vid.removeAttribute('src'); }
  S.segs = [{ id: uid(), a: 0, b: 24, off: false }]; S.selSeg = null; S.peaks = demoPeaks();
  const txt = T('demo');
  S.subs = DEMO_RANGES.map((r, i) => mkSub(r[0], r[1], txt[i], PRESETS[0].st));
  S.selSub = S.subs[0].id; undoStack = []; redoStack = [];
  fitZoom(); renderAll(); layoutStage();
}

/* ---------- vidéo importée ---------- */
function loadFile(file) {
  return new Promise(resolve => {
    if (!file) return resolve(false);
    const url = URL.createObjectURL(file);
    if (vid.src) { try { URL.revokeObjectURL(vid.src); } catch (e) {} }
    pause();
    vid.onloadedmetadata = async () => {
      // certains WebM n'annoncent pas leur durée : on la fait calculer en sautant à la fin
      if (!isFinite(vid.duration)) {
        await new Promise(r => { vid.ondurationchange = () => { if (isFinite(vid.duration)) r(); }; vid.currentTime = 1e9; setTimeout(r, 3000); });
        vid.ondurationchange = null; vid.currentTime = 0;
      }
      S.hasVideo = true; S.file = file; S.duration = isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 1; S.vw = vid.videoWidth; S.vh = vid.videoHeight; S.vname = file.name; S.t = 0;
      vid.hidden = false; demo.hidden = true;
      S.segs = [{ id: uid(), a: 0, b: S.duration, off: false }]; S.selSeg = null; S.peaks = null;
      // les sous-titres importés avant la vidéo sont conservés ; ceux de la démo sont retirés
      if (S.isDemo) S.subs = [];
      else S.subs = S.subs.filter(s => s.a < S.duration).map(s => ({ ...s, b: Math.min(s.b, S.duration) }));
      S.isDemo = false; S.selSub = S.subs[0]?.id || null;
      undoStack = []; redoStack = []; $('#pname').value = file.name.replace(/\.[^.]+$/, '').slice(0, 60);
      fitZoom(); renderAll(); layoutStage(); toast(T('tLoaded'));
      analyzeAudio(file); resolve(true);
    };
    vid.onerror = () => { toast(T('tBadVideo'), true); resolve(false); };
    vid.src = url; vid.load();
  });
}
async function analyzeAudio(file) {
  S.peaks = null; drawWave();
  try {
    if (file.size > 600e6) throw new Error('big');
    const buf = await file.arrayBuffer(); const AC = window.AudioContext || window.webkitAudioContext; const ctx = new AC();
    const audio = await ctx.decodeAudioData(buf); try { ctx.close(); } catch (e) {}
    const ch = audio.getChannelData(0), win = Math.floor(audio.sampleRate * STEP), n = Math.floor(ch.length / win), p = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = 0; j < win; j += 4) { const v = ch[i * win + j]; s += v * v; c++; } p[i] = Math.sqrt(s / c); }
    S.peaks = p;
  } catch (e) { S.peaks = null; }
  drawWave();
}
function drawWave() {
  const c = $('#waveCv'); if (!c) return;
  const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  if (!S.peaks) return;
  const W = c.width, H = c.height, p = S.peaks; let mx = 0; for (let i = 0; i < p.length; i += 3) mx = Math.max(mx, p[i]); mx = mx || 1;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f4f4f5'); gr.addColorStop(.5, '#a1a1a8'); gr.addColorStop(1, '#f4f4f5'); g.fillStyle = gr;
  const pxPerSec = W / S.duration;
  for (let x = 0; x < W; x++) {
    const a = Math.floor(x / pxPerSec / STEP), b = Math.max(a + 1, Math.floor((x + 1) / pxPerSec / STEP)); let m = 0; for (let i = a; i < b && i < p.length; i++) m = Math.max(m, p[i]);
    const h = Math.max(1, Math.pow(m / mx, .6) * (H - 6)); g.fillRect(x, (H - h) / 2, 1, h);
  }
}

/* ---------- import de sous-titres (.srt, .vtt, .json) ---------- */
function parseTime(s) {
  s = String(s).trim().replace(',', '.'); const m = s.match(/^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/);
  if (m) return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
function parseCues(txt) {
  const cues = [];
  for (const block of txt.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n'), i = lines.findIndex(l => l.includes('-->')); if (i < 0) continue;
    const m = lines[i].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/); if (!m) continue;
    const a = parseTime(m[1]), b = parseTime(m[2]); if (a == null || b == null) continue;
    const text = lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').trim();
    if (text) cues.push({ a, b, text });
  }
  return { cues };
}
function parseJSON(txt) {
  const o = JSON.parse(txt);
  const arr = Array.isArray(o) ? o : (o.subtitles || o.cues || o.captions || o.segments || o.chunks || o.transcription || []);
  const cues = arr.map(x => {
    let a, b; if (Array.isArray(x.timestamp)) { a = x.timestamp[0]; b = x.timestamp[1]; } else { a = x.start ?? x.from ?? x.a ?? x.startTime ?? x.begin; b = x.end ?? x.to ?? x.b ?? x.endTime ?? x.stop; }
    a = typeof a === 'string' ? parseTime(a) : a; b = typeof b === 'string' ? parseTime(b) : b;
    const text = x.text ?? x.content ?? x.caption ?? x.value; if (a == null || !text) return null;
    return { a: +a, b: b == null ? +a + 2.5 : +b, text: String(text).trim(), style: x.style && typeof x.style === 'object' ? { ...x.style } : null };
  }).filter(Boolean);
  // projet Clap : on récupère aussi le nom et les coupes
  const parts = !Array.isArray(o) && Array.isArray(o.parts) ? o.parts.filter(g => typeof g.a === 'number' && typeof g.b === 'number' && g.b > g.a) : null;
  return { cues, parts, name: !Array.isArray(o) && typeof o.name === 'string' ? o.name : '', duration: !Array.isArray(o) ? +o.duration || null : null };
}
function parseSubs(txt) {
  const t = txt.replace(/^﻿/, '').trim();
  return (t[0] === '{' || t[0] === '[') ? parseJSON(t) : parseCues(t);
}
function importSubs(txt, name) {
  let r; try { r = parseSubs(txt); } catch (e) { toast(T('tSubsBad', name), true); return false; }
  const cues = r.cues.filter(c => c.text && isFinite(c.a) && isFinite(c.b) && c.b > c.a).sort((x, y) => x.a - y.a);
  if (!cues.length) { toast(T('tNoSubsIn'), true); return false; }
  const mx = Math.max(...cues.map(c => c.b));
  if ((S.hasVideo && mx > S.duration * 20 && mx > 1000) || (!S.hasVideo && mx > 36000)) { cues.forEach(c => { c.a /= 1000; c.b /= 1000; }); toast(T('tMs')); }
  const base = S.isDemo ? DEF : (cur()?.st || DEF);
  if (S.hasVideo) {
    snap();
    if (r.parts && r.parts.length && Math.abs((r.duration ?? S.duration) - S.duration) < .5) S.segs = r.parts.map(g => ({ id: uid(), a: g.a, b: Math.min(g.b, S.duration), off: !!g.off }));
  } else {
    // pas encore de vidéo : la timeline s'adapte à la durée des sous-titres
    S.duration = Math.max(10, Math.ceil(Math.max(...cues.map(c => c.b)) + 1));
    S.segs = [{ id: uid(), a: 0, b: S.duration, off: false }]; S.selSeg = null; S.peaks = null; S.isDemo = false; S.vname = T('noVideo');
    undoStack = []; redoStack = [];
  }
  S.subs = cues.filter(c => c.a < S.duration).map(c => mkSub(c.a, Math.min(c.b, S.duration), c.text, c.style || { ...base }));
  if (r.name) $('#pname').value = r.name.slice(0, 60);
  S.selSub = S.subs[0]?.id || null; S.t = 0; if (S.hasVideo) vid.currentTime = 0;
  fitZoom(); renderAll(); toast(T('tSubsLoaded', S.subs.length));
  return true;
}
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv|ogv|avi)$/i, SUB_EXT = /\.(srt|vtt|json|txt)$/i;
const isVideo = f => f.type.startsWith('video/') || VIDEO_EXT.test(f.name);
const isSubFile = f => SUB_EXT.test(f.name) || f.type === 'application/json' || f.type.startsWith('text/');
async function handleFiles(list) {
  const files = [...list], vids = files.filter(isVideo), subs = files.filter(f => !isVideo(f) && isSubFile(f));
  files.filter(f => !isVideo(f) && !isSubFile(f)).forEach(f => toast(T('tUnknown', f.name), true));
  if (vids.length) await loadFile(vids[0]); // la vidéo d'abord, pour que les sous-titres se calent sur sa durée
  for (const f of subs) { try { importSubs(await f.text(), f.name); } catch (e) { toast(T('tSubsBad', f.name), true); } }
}

/* ---------- calage global ---------- */
function shiftAll(d) {
  if (!S.subs.length || !d) return;
  snap();
  S.subs = S.subs.map(s => ({ ...s, a: clamp(s.a + d, 0, S.duration), b: clamp(s.b + d, 0, S.duration) })).filter(s => s.b - s.a > .05);
  if (!S.subs.find(s => s.id === S.selSub)) S.selSub = S.subs[0]?.id || null;
  renderAll(); toast(T('tShifted', d));
}
const shiftStep = () => clamp(parseFloat($('#shiftStep').value) || .5, .01, 600);
$('#shiftMinus').onclick = () => shiftAll(-shiftStep());
$('#shiftPlus').onclick = () => shiftAll(shiftStep());
$('#alignFirst').onclick = () => { if (!S.subs.length) return; sortSubs(); const d = S.t - S.subs[0].a; if (Math.abs(d) < .005) return; shiftAll(d); toast(T('tAligned')); };

/* ---------- détection de parole et répartition du texte ---------- */
function detectSpeech(p, sens) {
  if (!p || p.length < 4) return [];
  const sorted = Array.from(p).sort((a, b) => a - b), lo = sorted[Math.floor(sorted.length * .2)], hi = sorted[Math.floor(sorted.length * .95)];
  const thr = lo + (hi - lo) * sens, gap = Math.round(.4 / STEP), minN = Math.round(.4 / STEP), runs = [];
  let start = null, last = -1;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > thr) { if (start === null) start = i; last = i; }
    else if (start !== null && i - last > gap) { if (last - start + 1 >= minN) runs.push([start, last + 1]); start = null; }
  }
  if (start !== null && last - start + 1 >= minN) runs.push([start, last + 1]);
  const out = [];
  for (const [a, b] of runs) {
    const A = Math.max(0, a * STEP - .1), B = Math.min(S.duration, b * STEP + .12), n = Math.max(1, Math.ceil((B - A) / 5));
    for (let k = 0; k < n; k++) out.push({ a: A + (B - A) * k / n, b: A + (B - A) * (k + 1) / n - (k < n - 1 ? .03 : 0) });
  }
  return out.filter(r => { const g = segAt((r.a + r.b) / 2); return !(g && g.off); });
}
function distribute(script, n, durs) {
  const lines = script.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (lines.length === n) return lines;
  const words = script.split(/\s+/).filter(Boolean); if (!words.length) return Array(n).fill('');
  const total = durs.reduce((a, b) => a + b, 0) || 1, out = []; let wi = 0, acc = 0;
  durs.forEach((d, i) => { acc += d; const end = i === n - 1 ? words.length : Math.round(words.length * acc / total); out.push(words.slice(wi, end).join(' ')); wi = end; });
  return out;
}
/* transcription IA (Whisper via transformers.js, exécutée localement) */
let asr = null, asrName = '';
const showProg = (msg, frac) => { $('#progMsg').textContent = msg; const b = $('#progBar'); b.classList.toggle('ind', frac == null); $('#progFill').style.width = frac == null ? '' : Math.round(frac * 100) + '%'; openModal('#mProg'); };
async function loadAsr(model) {
  const lib = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  const env = lib.env; env.allowLocalModels = false;
  if (location.protocol === 'file:' || !('caches' in window)) env.useBrowserCache = false;
  try { env.backends.onnx.wasm.numThreads = 1; } catch (e) {}
  if (!asr || asrName !== model) {
    asr = await lib.pipeline('automatic-speech-recognition', model, { progress_callback: p => { if (p.status === 'progress' && typeof p.progress === 'number') showProg(T('progLoad') + ' ' + Math.round(p.progress) + ' %', p.progress / 100); } });
    asrName = model;
  }
  return asr;
}
async function decode16k(file) {
  const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC({ sampleRate: 16000 });
  const audio = await ctx.decodeAudioData(await file.arrayBuffer()); try { ctx.close(); } catch (e) {}
  const n = audio.numberOfChannels, len = audio.length, out = new Float32Array(len);
  for (let c = 0; c < n; c++) { const d = audio.getChannelData(c); for (let i = 0; i < len; i++) out[i] += d[i] / n; }
  return out;
}
function splitCaption(text, a, b, max = 42) {
  if (text.length <= max) return [{ a, b, text }];
  const parts = []; let line = '';
  for (const w of text.split(/\s+/)) { if (line && (line + ' ' + w).length > max) { parts.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) parts.push(line);
  let t = a; return parts.map(p => { const d = (b - a) * p.length / text.length, r = { a: t, b: Math.max(t + .2, t + d - .02), text: p }; t += d; return r; });
}
async function transcribeAI(model, lang) {
  showProg(T('progLoad') + '…', null);
  const pipe = await loadAsr(model);
  showProg(T('progAudio'), null); const audio = await decode16k(S.file);
  const t0 = performance.now(); showProg(T('progRun'), null);
  const timer = setInterval(() => { $('#progMsg').textContent = T('progRun') + ' · ' + Math.round((performance.now() - t0) / 1000) + ' s'; }, 1000);
  let out; try { out = await pipe(audio, { language: lang, task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, return_timestamps: true }); } finally { clearInterval(timer); }
  const chunks = out.chunks && out.chunks.length ? out.chunks : [{ text: out.text || '', timestamp: [0, S.duration] }];
  const caps = [];
  for (const c of chunks) {
    const text = (c.text || '').trim(); if (!text || /^[\[(♪*].*[\])♪*]$/.test(text)) continue;
    let a = c.timestamp?.[0] ?? 0, b = c.timestamp?.[1]; a = clamp(a, 0, S.duration);
    if (b == null || b <= a) b = Math.min(S.duration, a + Math.max(1.5, text.length * .06)); b = clamp(b, a + .3, S.duration);
    caps.push(...splitCaption(text, a, b));
  }
  return caps.filter(r => { const g = segAt((r.a + r.b) / 2); return !(g && g.off); });
}
async function autoGenerate() {
  const sens = parseInt($('#genSens').value, 10) / 100, script = $('#genText').value.trim(), replace = $('#genReplace').checked;
  const useAI = $('#genMode').value === 'ai' && S.hasVideo && !script, model = $('#genModel').value;
  S.subLang = $('#genLang').value; closeModal('#mGen');
  const base = cur()?.st || S.subs[S.subs.length - 1]?.st || DEF;
  const finish = (made, msg, err) => {
    snap(); S.subs = replace ? made : S.subs.concat(made); sortSubs(); S.isDemo = false;
    S.selSub = made[0]?.id || S.selSub; if (made[0]) setT(made[0].a + .01); renderAll(); toast(msg, err);
  };
  if (useAI) {
    try {
      const caps = await transcribeAI(model, S.subLang.startsWith('fr') ? 'french' : 'english'); closeModal('#mProg');
      if (caps.length) { finish(caps.map(c => mkSub(c.a, c.b, c.text, { ...base })), T('tDone', caps.length)); return; }
      toast(T('tAiEmpty'), true);
    } catch (err) { console.warn('Transcription IA indisponible :', err); closeModal('#mProg'); toast(T('tAiFail'), true); }
  }
  if (S.hasVideo && !S.peaks) { toast(T('tAnalyzing')); await analyzeAudio(S.file); }
  let ranges = detectSpeech(S.peaks, sens), fallback = false;
  if (!ranges.length) {
    fallback = true; ranges = [];
    for (let t = 0; t < S.duration - .5; t += 3) { const g = segAt(t + 1); if (!(g && g.off)) ranges.push({ a: t, b: Math.min(S.duration, t + 2.8) }); }
  }
  const texts = script ? distribute(script, ranges.length, ranges.map(r => r.b - r.a)) : [];
  finish(ranges.map((r, i) => mkSub(r.a, r.b, texts[i] || `${T('sub')} ${i + 1}`, { ...base })), fallback ? T('tNoAudio') : T('tDone', ranges.length), fallback);
}

/* ---------- dictée en direct (navigateur uniquement) ---------- */
let dict = null;
function startDictation() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast(T('tNoSR'), true); return; }
  S.subLang = $('#genLang').value; closeModal('#mGen');
  try {
    const rec = new SR(); rec.lang = S.subLang; rec.continuous = true; rec.interimResults = false;
    let startT = S.t; snap();
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue; const txt = e.results[i][0].transcript.trim(); if (!txt) continue;
        let a = startT, b = S.t; if (b - a < .6) b = a + 1.6;
        const sub = mkSub(a, Math.min(b, S.duration), txt, { ...(cur()?.st || DEF) }); S.subs.push(sub); sortSubs(); startT = S.t; S.selSub = sub.id; renderAll();
      }
    };
    rec.onerror = () => { toast(T('tSRErr'), true); stopDictation(); };
    rec.onend = () => { if (dict) { dict = null; } };
    dict = rec; rec.start(); toast(T('tDictOn')); play();
  } catch (e) { toast(T('tSRErr'), true); dict = null; }
}
function stopDictation() { if (dict) { try { dict.stop(); } catch (e) {} dict = null; toast(T('tDictOff')); } }

/* ---------- surcouche de sous-titre sur la scène ---------- */
let stageU = 1, ovKey = '', ovId = null;
const activeSub = () => S.subs.find(s => S.t >= s.a && S.t < s.b && !(segAt(S.t)?.off)) || null;
function applyStyle(el, inner, st, u) {
  const fs = st.size * u;
  el.style.left = st.x + '%'; el.style.top = st.y + '%';
  el.style.transform = `translate(-50%,-50%) rotate(${st.rot}deg) scale(${st.sx / 100 * (st.flipH ? -1 : 1)},${st.sy / 100 * (st.flipV ? -1 : 1)}) skewX(${st.skew}deg)`;
  el.style.opacity = st.op / 100;
  const k = st.shadow / 100;
  inner.style.fontFamily = `'${st.font}',sans-serif`; inner.style.fontSize = fs + 'px'; inner.style.fontWeight = st.weight; inner.style.fontStyle = st.italic ? 'italic' : 'normal';
  inner.style.color = st.color; inner.style.textAlign = st.align; inner.style.letterSpacing = (st.ls * u) + 'px'; inner.style.textTransform = st.upper ? 'uppercase' : 'none';
  inner.style.setProperty('-webkit-text-stroke', `${st.strokeW * u}px ${st.stroke}`);
  inner.style.background = st.bgOp > 0 ? rgba(st.bg, st.bgOp / 100) : 'transparent';
  inner.style.textShadow = k > 0 ? `0 ${fs * .05 * k}px ${fs * .22 * k}px ${st.shadowColor}, 0 0 ${fs * .1 * k}px ${st.shadowColor}` : 'none';
}
function renderOverlay(force) {
  const act = activeSub(); let show = act; if (!show && !S.playing && !exporting) show = cur();
  const playing = S.playing || exporting;
  const id = show ? show.id : null, key = id + ':' + S.rev + ':' + stageU + ':' + (act ? 1 : 0) + ':' + playing;
  if (!force && key === ovKey) return; ovKey = key;
  if (!show) { subEl.hidden = true; ovId = null; return; }
  subEl.hidden = false;
  const editing = subIn.isContentEditable; if (!editing) subIn.textContent = show.text || '';
  applyStyle(subEl, subIn, show.st, stageU);
  subEl.classList.toggle('sel', !playing && show.id === S.selSub);
  if (id !== ovId && playing) { subIn.className = 'sub-in'; void subIn.offsetWidth; subIn.className = 'sub-in' + (show.st.anim !== 'none' ? ' anim-' + show.st.anim : ''); }
  else if (!playing) subIn.className = 'sub-in';
  ovId = id; subEl.dataset.id = id;
}
function layoutStage() {
  const wrap = $('#stageWrap'), cs = getComputedStyle(wrap);
  const cw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ch = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let r = 16 / 9;
  if (S.aspect === 'orig') r = (S.vw && S.vh) ? S.vw / S.vh : 16 / 9; else { const [a, b] = S.aspect.split('/').map(Number); r = a / b; }
  let w = Math.min(cw, ch * r), h = w / r; if (!(w > 20)) { w = Math.max(200, cw); h = w / r; }
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5); demo.width = Math.round(w * dpr); demo.height = Math.round(h * dpr);
  stageU = h / 1080; $('#info').textContent = T('info', S.vname || '', `${S.vw || 1920}×${S.vh || 1080} · ${fmt(keptDuration(), false)}`);
  renderOverlay(true);
}
new ResizeObserver(layoutStage).observe($('#stageWrap'));

/* glisser le texte sur la scène */
subEl.addEventListener('pointerdown', e => {
  if (subIn.isContentEditable || exporting) return;
  const s = S.subs.find(x => x.id === subEl.dataset.id); if (!s) return;
  if (S.selSub !== s.id) selectSub(s.id, { noSeek: true });
  snap(); const r = stage.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ox = s.st.x, oy = s.st.y;
  subEl.setPointerCapture(e.pointerId);
  const mv = ev => {
    let nx = clamp(ox + (ev.clientX - sx) / r.width * 100, 0, 100), ny = clamp(oy + (ev.clientY - sy) / r.height * 100, 0, 100);
    const gx = Math.abs(nx - 50) < 1.4, gy = Math.abs(ny - 50) < 1.4; if (gx) nx = 50; if (gy) ny = 50;
    $('#gv').classList.toggle('on', gx); $('#gh').classList.toggle('on', gy);
    s.st.x = nx; s.st.y = ny; S.rev++; renderOverlay(true); syncInsp();
  };
  const up = () => { subEl.removeEventListener('pointermove', mv); subEl.removeEventListener('pointerup', up); subEl.removeEventListener('pointercancel', up); $('#gv').classList.remove('on'); $('#gh').classList.remove('on'); };
  subEl.addEventListener('pointermove', mv); subEl.addEventListener('pointerup', up); subEl.addEventListener('pointercancel', up);
});
subEl.addEventListener('dblclick', () => {
  const s = S.subs.find(x => x.id === subEl.dataset.id); if (!s) return;
  try { subIn.contentEditable = 'plaintext-only'; } catch (e) {} if (!subIn.isContentEditable) subIn.contentEditable = 'true';
  subIn.focus(); const rg = document.createRange(); rg.selectNodeContents(subIn); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
});
subIn.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); subIn.blur(); } if (e.key === 'Escape') subIn.blur(); e.stopPropagation(); });
subIn.addEventListener('blur', () => {
  if (!subIn.isContentEditable) return; const s = S.subs.find(x => x.id === subEl.dataset.id);
  subIn.contentEditable = 'false';
  if (s) { snap(); s.text = subIn.innerText.replace(/\n$/, ''); S.rev++; renderList(); renderTLBlocks(); renderOverlay(true); }
});

/* ---------- liste des sous-titres ---------- */
let listIds = new Set();
function renderList() {
  sortSubs(); const list = $('#list'); $('#count').textContent = S.subs.length;
  if (!S.subs.length) { list.innerHTML = `<div class="empty"><b>${T('emptyT')}</b>${T('emptyD')}</div>`; listIds = new Set(); return; }
  list.innerHTML = S.subs.map((s, i) => `
    <div class="li${s.id === S.selSub ? ' sel' : ''}${listIds.has(s.id) ? '' : ' enter'}" data-id="${s.id}" style="animation-delay:${listIds.size ? 0 : Math.min(i, 12) * 40}ms">
      <div class="li-top"><span class="idx">${i + 1}</span>
        <input class="tin" data-f="a" value="${fmt(s.a)}" aria-label="Début"><span class="idx">→</span><input class="tin" data-f="b" value="${fmt(s.b)}" aria-label="Fin">
        <div class="li-act">
          <button class="btn sm icon ghost" data-act="split" title="${T('cut')}">${ico('split')}</button>
          <button class="btn sm icon ghost" data-act="dup">${ico('dup')}</button>
          <button class="btn sm icon ghost danger" data-act="del">${ico('trash')}</button>
        </div></div>
      <textarea rows="2" data-f="text" aria-label="Texte">${esc(s.text)}</textarea>
    </div>`).join('');
  listIds = new Set(S.subs.map(s => s.id));
}
const subById = id => S.subs.find(s => s.id === id);
$('#list').addEventListener('input', e => {
  const li = e.target.closest('.li'); if (!li || e.target.dataset.f !== 'text') return;
  const s = subById(li.dataset.id); snapSoft(); s.text = e.target.value; S.rev++; renderOverlay(true);
  const b = $(`.blk[data-id="${s.id}"] span`); if (b) b.textContent = s.text;
});
$('#list').addEventListener('change', e => {
  const li = e.target.closest('.li'); if (!li || !(e.target.dataset.f === 'a' || e.target.dataset.f === 'b')) return;
  const s = subById(li.dataset.id), v = parseT(e.target.value), f = e.target.dataset.f;
  if (v != null) { snap(); if (f === 'a') s.a = clamp(v, 0, s.b - .1); else s.b = clamp(v, s.a + .1, S.duration); }
  renderAll();
});
$('#list').addEventListener('click', e => {
  const li = e.target.closest('.li'); if (!li) return;
  const s = subById(li.dataset.id), act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'del') { snap(); S.subs = S.subs.filter(x => x !== s); if (S.selSub === s.id) S.selSub = S.subs[0]?.id || null; renderAll(); return; }
  if (act === 'dup') { snap(); const d = mkSub(s.b, Math.min(S.duration, s.b + (s.b - s.a)), s.text, { ...s.st }); S.subs.push(d); sortSubs(); S.selSub = d.id; renderAll(); return; }
  if (act === 'split') { splitSub(s); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  selectSub(s.id);
});
$('#list').addEventListener('focusin', e => { const li = e.target.closest('.li'); if (li && li.dataset.id !== S.selSub && e.target.tagName === 'TEXTAREA') selectSub(li.dataset.id); });
function selectSub(id, o = {}) {
  S.selSub = id; const s = subById(id); S.rev++;
  $$('.li.sel').forEach(x => x.classList.remove('sel')); $$('.blk.sel').forEach(x => x.classList.remove('sel'));
  const li = $(`.li[data-id="${id}"]`); li?.classList.add('sel'); $(`.blk[data-id="${id}"]`)?.classList.add('sel');
  if (li && !o.noScroll) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (s && !o.noSeek && !S.playing) setT(s.a + .01);
  renderOverlay(true); syncInsp();
}
function splitSub(s, at) {
  const t = at ?? S.t; if (!(t > s.a + .15 && t < s.b - .15)) { toast(T('tCutNone')); return; }
  snap(); const w = s.text.split(/\s+/), k = Math.round(w.length * (t - s.a) / (s.b - s.a));
  const n = mkSub(t, s.b, w.slice(k).join(' '), { ...s.st }); s.b = t; s.text = w.slice(0, k).join(' '); S.subs.push(n); sortSubs(); renderAll(); toast(T('tSplitSub'));
}
function addSubAtHead() {
  snap(); const a = S.t, b = Math.min(S.duration, a + 2.5), base = cur()?.st || DEF;
  const s = mkSub(a, Math.max(b, a + .5), T('newSub'), { ...base }); S.subs.push(s); sortSubs(); S.selSub = s.id; renderAll();
  $(`.li[data-id="${s.id}"] textarea`)?.focus();
}

/* ---------- inspecteur de style ---------- */
function buildInsp() {
  const R = (k, lab, min, max, step = 1) => `<div class="ctl"><label for="c_${k}">${T(lab)}</label><div class="rr"><input id="c_${k}" type="range" data-k="${k}" min="${min}" max="${max}" step="${step}"><input class="num" type="number" data-k="${k}" min="${min}" max="${max}" step="${step}" aria-label="${T(lab)}"></div></div>`;
  const C = (k, lab) => `<div class="ctl"><label for="c_${k}">${T(lab)}</label><input id="c_${k}" type="color" data-k="${k}"></div>`;
  $('#insp').innerHTML = `
    <div class="grp hero"><h4>${T('gOpacity')}</h4>${R('op', 'opacity', 0, 100)}
      <label class="sw" style="margin:0"><input type="checkbox" id="applyAll"><i></i><span>${T('applyAll')}</span></label></div>
    <div class="grp"><h4>${T('presets')}</h4><div class="chips">${PRESETS.map((p, i) => `<button class="chip" data-preset="${i}">${p.n[LANG]}</button>`).join('')}</div></div>
    <div class="grp"><h4>${T('gText')}</h4>
      <div class="ctl"><label for="c_font">${T('font')}</label><select id="c_font" data-k="font">${FONTS.map(f => `<option value="${f}" style="font-family:'${f}'">${f}</option>`).join('')}</select></div>
      ${R('size', 'size', 16, 220)}
      <div class="ctl"><label for="c_weight">${T('weight')}</label><select id="c_weight" data-k="weight" data-num="1">${[400, 500, 600, 700, 800, 900].map(w => `<option value="${w}">${w}</option>`).join('')}</select></div>
      <div class="btnrow" style="margin-bottom:9px">
        <button class="btn sm" data-tg="italic"><i>I</i>&nbsp;${T('italic')}</button><button class="btn sm" data-tg="upper">${T('upper')}</button></div>
      <div class="btnrow"><button class="btn sm icon" data-al="left" aria-label="Gauche">${ico('alignL')}</button><button class="btn sm icon" data-al="center" aria-label="Centre">${ico('alignC')}</button><button class="btn sm icon" data-al="right" aria-label="Droite">${ico('alignR')}</button></div></div>
    <div class="grp"><h4>${T('gColor')}</h4>
      ${C('color', 'color')}${C('stroke', 'stroke')}${R('strokeW', 'strokeW', 0, 24)}${C('bg', 'bg')}${R('bgOp', 'bgOp', 0, 100)}${R('shadow', 'shadow', 0, 100)}${C('shadowColor', 'shadowColor')}</div>
    <div class="grp"><h4>${T('gPos')}</h4>${R('x', 'posX', 0, 100, .5)}${R('y', 'posY', 0, 100, .5)}
      <div class="pad" id="pad"><button class="btn sm icon u" data-n="0,-1" aria-label="Haut">${ico('up')}</button><button class="btn sm icon l" data-n="-1,0" aria-label="Gauche">${ico('left')}</button><button class="btn sm icon c" data-n="c" aria-label="Centrer">${ico('center')}</button><button class="btn sm icon r" data-n="1,0" aria-label="Droite">${ico('right')}</button><button class="btn sm icon d" data-n="0,1" aria-label="Bas">${ico('down')}</button></div>
      <p class="hint" style="margin:10px 0 0">${T('centerHint')}</p></div>
    <div class="grp"><h4>${T('gShape')}</h4>${R('rot', 'rot', -180, 180)}${R('sx', 'sx', 20, 300)}${R('sy', 'sy', 10, 300)}${R('skew', 'skew', -45, 45)}${R('ls', 'ls', -5, 40, .5)}
      <div class="btnrow"><button class="btn sm" data-tg="flipH">${ico('fliph')}${T('flipH')}</button><button class="btn sm" data-tg="flipV">${ico('flipv')}${T('flipV')}</button><button class="btn sm" id="resetShape">${ico('reset')}${T('reset')}</button></div></div>
    <div class="grp"><h4>${T('gAnim')}</h4>
      <div class="ctl" style="margin:0"><label for="c_anim">${T('anim')}</label><select id="c_anim" data-k="anim">${['none', 'fade', 'pop', 'slide', 'bounce'].map(a => `<option value="${a}">${T(a === 'none' ? 'aNone' : 'a' + a[0].toUpperCase() + a.slice(1))}</option>`).join('')}</select></div></div>`;
  $('#applyAll').checked = S.applyAll; syncInsp();
}
function syncInsp() {
  const s = cur(); $('#inspPanel').classList.toggle('disabled', !s); if (!s) return;
  $$('[data-k]', $('#insp')).forEach(el => { if (document.activeElement === el) return; const v = s.st[el.dataset.k]; el.value = v; });
  $$('[data-tg]', $('#insp')).forEach(b => b.classList.toggle('on', !!s.st[b.dataset.tg]));
  $$('[data-al]', $('#insp')).forEach(b => b.classList.toggle('on', s.st.align === b.dataset.al));
}
function setStyle(patch) {
  snapSoft(); targets().forEach(s => Object.assign(s.st, patch)); S.rev++; renderOverlay(true); syncInsp();
}
$('#insp').addEventListener('input', e => {
  const el = e.target.closest('[data-k]'); if (!el) return; let v = el.value;
  if (el.type === 'range' || el.type === 'number' || el.dataset.num) { v = parseFloat(v); if (isNaN(v)) return; }
  setStyle({ [el.dataset.k]: v });
});
$('#insp').addEventListener('change', e => { if (e.target.id === 'applyAll') S.applyAll = e.target.checked; });
$('#insp').addEventListener('click', e => {
  const tg = e.target.closest('[data-tg]'); if (tg) { const s = cur(); if (s) setStyle({ [tg.dataset.tg]: !s.st[tg.dataset.tg] }); return; }
  const al = e.target.closest('[data-al]'); if (al) { setStyle({ align: al.dataset.al }); return; }
  const pr = e.target.closest('[data-preset]'); if (pr) { setStyle({ ...PRESETS[+pr.dataset.preset].st }); return; }
  if (e.target.closest('#resetShape')) setStyle({ rot: 0, sx: 100, sy: 100, skew: 0, flipH: false, flipV: false });
});
let nudgeT = null;
$('#insp').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-n]'); if (!b || !cur()) return;
  const step = ev => {
    const s = cur(), big = ev.shiftKey ? 5 : .5;
    if (b.dataset.n === 'c') return setStyle({ x: 50, y: 50 });
    const [dx, dy] = b.dataset.n.split(',').map(Number); setStyle({ x: clamp(s.st.x + dx * big, 0, 100), y: clamp(s.st.y + dy * big, 0, 100) });
  };
  step(e); if (b.dataset.n === 'c') return;
  nudgeT = setTimeout(() => { nudgeT = setInterval(() => step(e), 55); }, 350);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('#insp').addEventListener(ev, () => { clearTimeout(nudgeT); clearInterval(nudgeT); nudgeT = null; }));

/* ---------- timeline ---------- */
const scrollEl = $('#tlScroll'), inner = $('#tlInner');
function fitZoom() { S.zoom = clamp(((scrollEl.clientWidth || 600) - 50) / S.duration, 5, 260); $('#zoom').value = S.zoom; }
const px = t => t * S.zoom;
function renderTL() {
  const W = Math.max(S.duration * S.zoom + 60, scrollEl.clientWidth); inner.style.width = W + 'px';
  const steps = [.1, .25, .5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600], step = steps.find(s => s * S.zoom >= 80) || 600;
  let h = '';
  for (let t = 0; t <= S.duration + 1e-6; t += step) h += `<div class="tk" style="left:${px(t)}px">${fmt(t, step < 1)}</div>`;
  for (let t = step / 5; t <= S.duration; t += step / 5) if (Math.abs(t / step - Math.round(t / step)) > .01) h += `<div class="tk minor" style="left:${px(t)}px"></div>`;
  $('#ruler').innerHTML = h;
  $('#trkV').innerHTML = S.segs.map((g, i) => `<div class="seg${g.off ? ' off' : ''}${g.id === S.selSeg ? ' sel' : ''}" data-id="${g.id}" style="left:${px(g.a) + 1}px;width:${Math.max(4, px(g.b - g.a) - 2)}px">${T('clip')} ${i + 1}<small>${fmt(g.b - g.a, false)}${g.off ? ' ✕' : ''}</small></div>`).join('');
  $('#trkA').innerHTML = `<canvas class="wave" id="waveCv" width="${Math.min(4000, Math.max(200, Math.ceil(S.duration * S.zoom)))}" height="44" style="width:${px(S.duration)}px"></canvas>`;
  drawWave(); renderTLBlocks(); updRemoveLbl();
}
function renderTLBlocks() {
  $('#trkS').innerHTML = S.subs.map(s => `<div class="blk${s.id === S.selSub ? ' sel' : ''}${px(s.b - s.a) < 48 ? ' tiny' : ''}" data-id="${s.id}" style="left:${px(s.a)}px;width:${Math.max(8, px(s.b - s.a))}px"><div class="hd l"></div><span>${esc(s.text || '')}</span><div class="hd r"></div></div>`).join('');
}
function updRemoveLbl() { const g = S.segs.find(x => x.id === S.selSeg) || segAt(S.t); $('#tRemoveLbl').textContent = g && g.off ? T('restorePart') : T('removePart'); }
$('#zoom').addEventListener('input', e => { const c = (scrollEl.scrollLeft + scrollEl.clientWidth / 2) / S.zoom; S.zoom = +e.target.value; renderTL(); scrollEl.scrollLeft = c * S.zoom - scrollEl.clientWidth / 2; });
scrollEl.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); S.zoom = clamp(S.zoom * (e.deltaY < 0 ? 1.15 : .87), 5, 260); $('#zoom').value = S.zoom; renderTL(); }, { passive: false });

const tFromEvent = e => { const r = inner.getBoundingClientRect(); return clamp((e.clientX - r.left) / S.zoom, 0, S.duration); };
function scrub(e) {
  e.preventDefault(); const el = e.currentTarget; el.setPointerCapture(e.pointerId); setT(tFromEvent(e)); updRemoveLbl();
  const mv = ev => { setT(tFromEvent(ev)); updRemoveLbl(); }; const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
}
$('#ruler').addEventListener('pointerdown', scrub);
$('#trkA').addEventListener('pointerdown', scrub);
$('#trkV').addEventListener('pointerdown', e => {
  const sg = e.target.closest('.seg'); if (!sg) return scrub(e);
  S.selSeg = sg.dataset.id; $$('.seg.sel').forEach(x => x.classList.remove('sel')); sg.classList.add('sel'); setT(tFromEvent(e)); updRemoveLbl();
});
$('#trkS').addEventListener('pointerdown', e => {
  const bl = e.target.closest('.blk'); if (!bl) return scrub(e);
  const s = subById(bl.dataset.id); if (!s) return; e.preventDefault();
  const mode = e.target.classList.contains('hd') ? (e.target.classList.contains('l') ? 'l' : 'r') : 'm';
  if (S.selSub !== s.id) selectSub(s.id, { noSeek: true });
  const x0 = e.clientX, a0 = s.a, b0 = s.b, d = b0 - a0; let moved = false, did = false;
  const snapTo = [0, S.duration, S.t]; S.subs.forEach(o => { if (o !== s) snapTo.push(o.a, o.b); }); S.segs.forEach(g => snapTo.push(g.a, g.b));
  const sn = v => { if (!S.snap) return v; let best = v, bd = 7 / S.zoom; snapTo.forEach(t => { if (Math.abs(t - v) < bd) { bd = Math.abs(t - v); best = t; } }); return best; };
  bl.setPointerCapture(e.pointerId);
  const mv = ev => {
    const dx = (ev.clientX - x0) / S.zoom; if (!moved && Math.abs(ev.clientX - x0) < 3) return; moved = true; if (!did) { snap(); did = true; }
    if (mode === 'm') { let a = sn(a0 + dx); const bEnd = sn(a0 + dx + d); if (bEnd !== a0 + dx + d && a === a0 + dx) a = bEnd - d; a = clamp(a, 0, S.duration - d); s.a = a; s.b = a + d; }
    else if (mode === 'l') s.a = clamp(sn(a0 + dx), 0, s.b - .1);
    else s.b = clamp(sn(b0 + dx), s.a + .1, S.duration);
    bl.style.left = px(s.a) + 'px'; bl.style.width = Math.max(8, px(s.b - s.a)) + 'px'; S.rev++;
    const li = $(`.li[data-id="${s.id}"]`); if (li) { $('[data-f="a"]', li).value = fmt(s.a); $('[data-f="b"]', li).value = fmt(s.b); }
  };
  const up = () => { bl.removeEventListener('pointermove', mv); bl.removeEventListener('pointerup', up); bl.removeEventListener('pointercancel', up); if (!moved) setT(s.a + .01); else { sortSubs(); renderList(); renderTLBlocks(); } };
  bl.addEventListener('pointermove', mv); bl.addEventListener('pointerup', up); bl.addEventListener('pointercancel', up);
});

/* découpe / retrait */
function splitVideo() {
  const g = segAt(S.t); if (!g || !(S.t > g.a + .1 && S.t < g.b - .1)) { toast(T('tCutNone')); return; }
  snap(); const n = { id: uid(), a: S.t, b: g.b, off: g.off }; g.b = S.t; S.segs.splice(S.segs.indexOf(g) + 1, 0, n); S.selSeg = n.id; renderTL(); toast(T('tCut'));
}
function toggleSeg() {
  const g = S.segs.find(x => x.id === S.selSeg) || segAt(S.t); if (!g) { toast(T('tNoSeg')); return; }
  snap(); g.off = !g.off; S.selSeg = g.id; if (g.off && S.playing) { const n = nextKept(g.b); if (n == null) pause(); }
  renderTL(); layoutStage(); toast(g.off ? T('tRemoved') : T('tRestored'));
}
$('#tSplit').onclick = () => { const s = activeSub(); if (s && S.t > s.a + .15 && S.t < s.b - .15 && document.activeElement?.closest('#list')) splitSub(s); else splitVideo(); };
$('#tRemove').onclick = toggleSeg;
$('#tAddSub').onclick = addSubAtHead; $('#addSub').onclick = addSubAtHead;
$('#tSnap').onclick = e => { S.snap = !S.snap; e.currentTarget.classList.toggle('on', S.snap); };
$('#tPlay').onclick = () => S.playing ? pause() : play();
$('#tStart').onclick = () => setT(0); $('#tEnd').onclick = () => setT(S.duration);
$('#undo').onclick = undo; $('#redo').onclick = redo;

/* ---------- export texte ---------- */
function exportList() {
  const out = [];
  sortSubs().forEach(s => S.segs.forEach(g => {
    if (g.off) return; const a = Math.max(s.a, g.a), b = Math.min(s.b, g.b); if (b - a > .05 && s.text.trim()) out.push({ a: remap(a), b: remap(b), text: s.text.trim() });
  }));
  return out.sort((x, y) => x.a - y.a);
}
const tc = (t, sep) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(r).padStart(3, '0')}`; };
function exportText(f) {
  const l = exportList();
  if (f === 'srt') return l.map((c, i) => `${i + 1}\n${tc(c.a, ',')} --> ${tc(c.b, ',')}\n${c.text}\n`).join('\n');
  if (f === 'vtt') return 'WEBVTT\n\n' + l.map((c, i) => `${i + 1}\n${tc(c.a, '.')} --> ${tc(c.b, '.')}\n${c.text}\n`).join('\n');
  return JSON.stringify({ name: $('#pname').value, duration: S.duration, parts: S.segs, subtitles: S.subs.map(s => ({ start: +s.a.toFixed(3), end: +s.b.toFixed(3), text: s.text, style: s.st })) }, null, 2);
}
function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
let expF = 'srt';
function showExport() {
  $$('#expTabs button').forEach(b => b.classList.toggle('on', b.dataset.f === expF));
  const isV = expF === 'video';
  $('#expText').hidden = isV; $('#expVid').hidden = !isV;
  $('#expCopy').hidden = isV; $('#expSave').hidden = isV;
  $('#expGo').hidden = !isV || exporting; $('#expStop').hidden = !isV || !exporting;
  if (!isV) { $('#expOut').value = exportText(expF); return; }
  $('#expGo').disabled = !S.hasVideo;
  if (!exporting && $('#expResult').hidden) $('#expStatus').textContent = S.hasVideo ? T('expReady', fmt(keptDuration(), false)) : T('expNoVideo');
}
$('#expTabs').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { expF = b.dataset.f; showExport(); } });
$('#expCopy').onclick = async () => {
  const ta = $('#expOut');
  try { await navigator.clipboard.writeText(ta.value); toast(T('tCopied')); } catch (e) { ta.focus(); ta.select(); try { document.execCommand('copy') ? toast(T('tCopied')) : toast(T('tCopyFail'), true); } catch (x) { toast(T('tCopyFail'), true); } }
};
$('#expSave').onclick = () => {
  const ext = expF === 'json' ? 'clap.json' : expF, type = expF === 'json' ? 'application/json' : 'text/plain';
  const url = URL.createObjectURL(new Blob([$('#expOut').value], { type: type + ';charset=utf-8' }));
  download(url, `${safeName($('#pname').value)}.${ext}`); setTimeout(() => URL.revokeObjectURL(url), 60000);
};

/* ---------- export vidéo : sous-titres incrustés dans l'image ---------- */
const subAt = t => S.subs.find(s => t >= s.a && t < s.b) || null;
const easeOut = p => 1 - Math.pow(1 - p, 3);
const backOut = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
function animState(st, since) {
  const o = { alpha: 1, scale: 1, dy: 0 };
  const D = { fade: .35, pop: .4, slide: .4, bounce: .7 }[st.anim]; if (!D) return o;
  const p = clamp(since / D, 0, 1);
  if (st.anim === 'fade') o.alpha = easeOut(p);
  else if (st.anim === 'pop') { o.scale = .4 + .6 * backOut(p); o.alpha = Math.min(1, p * 2); }
  else if (st.anim === 'slide') { o.dy = (1 - easeOut(p)) * .6; o.alpha = easeOut(p); }
  else { const k = [[0, -1.4, 0], [.6, .12, 1], [.8, -.06, 1], [1, 0, 1]]; let i = 0; while (i < k.length - 2 && p > k[i + 1][0]) i++; const [p0, y0, a0] = k[i], [p1, y1, a1] = k[i + 1], f = easeOut(clamp((p - p0) / (p1 - p0), 0, 1)); o.dy = y0 + (y1 - y0) * f; o.alpha = a0 + (a1 - a0) * f; }
  return o;
}
function drawCue(g, w, h, s, t) {
  const st = s.st, u = h / 1080, fs = st.size * u, an = animState(st, t - s.a);
  let text = st.upper ? s.text.toUpperCase() : s.text;
  g.save(); g.translate(st.x / 100 * w, st.y / 100 * h); g.rotate(st.rot * Math.PI / 180);
  g.scale(st.sx / 100 * (st.flipH ? -1 : 1), st.sy / 100 * (st.flipV ? -1 : 1)); g.transform(1, 0, Math.tan(st.skew * Math.PI / 180), 1, 0, 0);
  g.globalAlpha = clamp(st.op / 100 * an.alpha, 0, 1); g.font = `${st.italic ? 'italic ' : ''}${st.weight} ${fs}px '${st.font}',sans-serif`;
  try { g.letterSpacing = (st.ls * u) + 'px'; } catch (e) {}
  const maxW = w * .9 / (st.sx / 100 || 1), lines = [];
  for (const para of text.split('\n')) { let line = ''; for (const wd of para.split(/\s+/)) { const tt = line ? line + ' ' + wd : wd; if (line && g.measureText(tt).width > maxW) { lines.push(line); line = wd; } else line = tt; } lines.push(line); }
  const lh = fs * 1.18, tw = Math.max(...lines.map(l => g.measureText(l).width)), th = lines.length * lh, k = st.shadow / 100;
  g.translate(0, an.dy * (th + fs * .2)); g.scale(an.scale, an.scale);
  g.textBaseline = 'middle'; g.lineJoin = 'round';
  const ax = st.align === 'left' ? -tw / 2 : st.align === 'right' ? tw / 2 : 0; g.textAlign = st.align === 'left' ? 'left' : st.align === 'right' ? 'right' : 'center';
  if (st.bgOp > 0) { g.fillStyle = rgba(st.bg, st.bgOp / 100); const ppx = fs * .4, py = fs * .1, r = fs * .2; g.beginPath(); g.roundRect ? g.roundRect(-tw / 2 - ppx, -th / 2 - py, tw + ppx * 2, th + py * 2, r) : g.rect(-tw / 2 - ppx, -th / 2 - py, tw + ppx * 2, th + py * 2); g.fill(); }
  lines.forEach((l, i) => {
    const y = -th / 2 + lh * (i + .5);
    if (k > 0) { g.shadowColor = st.shadowColor; g.shadowBlur = fs * .22 * k; g.shadowOffsetY = fs * .05 * k; }
    if (st.strokeW > 0) { g.lineWidth = st.strokeW * u; g.strokeStyle = st.stroke; g.strokeText(l, ax, y); }
    else if (k > 0) { g.fillStyle = st.color; g.fillText(l, ax, y); }
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; g.fillStyle = st.color; g.fillText(l, ax, y);
  });
  g.restore();
}
const MIMES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
let expCancel = false, expUrl = null;
async function exportVideo() {
  if (exporting) return;
  if (!S.hasVideo) { toast(T('expNoVideo'), true); return; }
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast(T('expUnsupported'), true); return; }
  // plages conservées, en fusionnant les parties voisines pour éviter des sauts inutiles
  const ranges = [];
  for (const g of S.segs) { if (g.off) continue; const l = ranges[ranges.length - 1]; if (l && Math.abs(l.b - g.a) < 1e-3) l.b = g.b; else ranges.push({ a: g.a, b: g.b }); }
  if (!ranges.length) { toast(T('expNothing'), true); return; }
  pause(); exporting = true; expCancel = false; showExport();
  const fill = $('#expFill'), st = $('#expStatus'), res = $('#expResult');
  $('#expBar').hidden = false; fill.style.width = '0'; res.hidden = true; res.innerHTML = ''; st.textContent = T('expPrep');
  if (expUrl) { URL.revokeObjectURL(expUrl); expUrl = null; }
  let timer = null;
  const seekTo = t => new Promise(r => { let done = false; const fin = () => { if (done) return; done = true; vid.removeEventListener('seeked', fin); r(); }; vid.addEventListener('seeked', fin); vid.currentTime = t; setTimeout(fin, 2000); });
  try {
    await Promise.all([...new Set(S.subs.map(s => s.st.font))].map(f => document.fonts.load(`700 40px "${f}"`).catch(() => {})));
    const sc = Math.min(1, 1920 / Math.max(S.vw, S.vh)), W = Math.round(S.vw * sc / 2) * 2, H = Math.round(S.vh * sc / 2) * 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const stream = cv.captureStream(30); let audio = 0;
    try { const vs = vid.captureStream ? vid.captureStream() : null; vs && vs.getAudioTracks().forEach(tr => { stream.addTrack(tr); audio++; }); } catch (e) {}
    const mime = MIMES.find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 10e6 } : { videoBitsPerSecond: 10e6 }), chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    const total = keptDuration() || 1;
    const draw = () => {
      const t = vid.currentTime; g.drawImage(vid, 0, 0, W, H);
      const s = subAt(t); if (s) drawCue(g, W, H, s, t);
      fill.style.width = clamp(remap(t) / total * 100, 0, 100) + '%'; st.textContent = T('expRun', fmt(remap(t), false), fmt(total, false));
    };
    // minuterie plutôt que requestAnimationFrame : l'export continue même si la fenêtre est réduite
    timer = setInterval(draw, 1000 / 30);
    for (let i = 0; i < ranges.length && !expCancel; i++) {
      const r = ranges[i];
      await seekTo(r.a); draw();
      if (i === 0) rec.start(250); else rec.resume();
      await vid.play();
      await new Promise(done => { const iv = setInterval(() => { if (expCancel || vid.ended || vid.currentTime >= r.b - .02) { clearInterval(iv); done(); } }, 10); });
      vid.pause(); if (rec.state === 'recording') rec.pause();
    }
    clearInterval(timer); timer = null;
    if (rec.state !== 'inactive') rec.stop(); await stopped;
    if (expCancel) { st.textContent = T('expCancelled'); $('#expBar').hidden = true; return; }
    const type = mime.split(';')[0] || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type }), name = `${safeName($('#pname').value)}-sous-titres.${ext}`;
    expUrl = URL.createObjectURL(blob);
    res.innerHTML = `<video controls src="${expUrl}"></video><button class="btn primary" id="expDl">${ico('download')}<span>${T('saveVideo')}</span></button>`;
    $('#expDl').onclick = () => download(expUrl, name);
    res.hidden = false; fill.style.width = '100%'; st.textContent = T('expDoneInfo', (blob.size / 1e6).toFixed(1), audio); toast(T('expDone'));
  } catch (e) { console.warn(e); toast(T('expFail', e.message || e), true); st.textContent = ''; $('#expBar').hidden = true; }
  finally { clearInterval(timer); exporting = false; vid.pause(); S.t = vid.currentTime; showExport(); renderOverlay(true); }
}
$('#expGo').onclick = exportVideo;
$('#expStop').onclick = () => { expCancel = true; };

/* ---------- fenêtres et import ---------- */
$('#btnAuto').onclick = () => { $('#genLang').value = S.subLang; if (!S.hasVideo) { $('#genMode').value = 'detect'; } syncGen(); openModal('#mGen'); };
$('#genClose').onclick = () => closeModal('#mGen'); $('#genGo').onclick = autoGenerate; $('#genDict').onclick = startDictation;
const syncGen = () => { const ai = $('#genMode').value === 'ai'; $('#genModelRow').hidden = !ai; $('#genSensRow').hidden = ai; };
$('#genMode').onchange = syncGen; syncGen();
$('#genSens').oninput = e => { $('#genSensO').textContent = e.target.value; };
$('#btnExport').onclick = () => { showExport(); openModal('#mExp'); }; $('#expClose').onclick = () => closeModal('#mExp');
$$('.modal-back:not(#mProg)').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) closeModal('#' + m.id); }));

$('#btnImport').onclick = () => openModal('#mImp');
$('#impClose').onclick = () => closeModal('#mImp');
$('#impPick').onclick = () => $('#file').click();
$('#impApply').onclick = () => { const t = $('#impText').value.trim(); if (!t) { toast(T('tPasteFirst'), true); return; } if (importSubs(t, T('pasted'))) { $('#impText').value = ''; closeModal('#mImp'); } };
$('#file').onchange = e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) { closeModal('#mImp'); handleFiles(f); } };
const wrap = $('#stageWrap'); let dragN = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
window.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); dragN++; wrap.classList.add('drag'); });
window.addEventListener('dragover', e => { e.preventDefault(); });
window.addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; wrap.classList.remove('drag'); } });
window.addEventListener('drop', e => { e.preventDefault(); dragN = 0; wrap.classList.remove('drag'); const f = [...(e.dataTransfer?.files || [])]; if (f.length && !exporting) { closeModal('#mImp'); handleFiles(f); } });
window.addEventListener('paste', e => {
  const tag = e.target.tagName; if (tag === 'TEXTAREA' || tag === 'INPUT' || e.target.isContentEditable) return;
  const t = e.clipboardData?.getData('text'); if (t && (t.includes('-->') || /^\s*[\[{]/.test(t))) importSubs(t, T('pasted'));
});
$('#aspect').onchange = e => { S.aspect = e.target.value; layoutStage(); };

/* ---------- mises à jour (application de bureau) ---------- */
let updManual = false;
function onUpdate(u) {
  const box = $('#upd'), show = () => { box.hidden = false; };
  if (u.state === 'available') { show(); $('#updTitle').textContent = T('updAvail', u.version); $('#updMsg').textContent = T('updDl') + '…'; $('#updBar').hidden = false; $('#updFill').style.width = '0'; $('#updAct').hidden = true; updManual = false; }
  else if (u.state === 'progress') { show(); $('#updBar').hidden = false; $('#updFill').style.width = Math.round(u.percent) + '%'; $('#updMsg').textContent = `${T('updDl')} · ${Math.round(u.percent)} %`; }
  else if (u.state === 'downloaded') { show(); $('#updTitle').textContent = T('updReady', u.version); $('#updMsg').textContent = T('updReadyMsg'); $('#updBar').hidden = true; $('#updAct').hidden = false; }
  else if (u.state === 'none') { if (updManual) toast(T('updNone')); updManual = false; }
  else if (u.state === 'dev') { if (updManual) toast(T('updDev')); updManual = false; }
  else if (u.state === 'error') { if (updManual) toast(T('updErr'), true); updManual = false; }
}
if (NATIVE) {
  NATIVE.onUpdate(onUpdate);
  NATIVE.info().then(i => {
    const v = document.createElement('span'); v.className = 'ver'; v.textContent = 'v' + i.version; v.title = T('checkUpd');
    v.onclick = () => { updManual = true; toast(T('updChecking')); NATIVE.checkUpdates(); };
    $('.brand').appendChild(v);
  }).catch(() => {});
  $('#updGo').onclick = () => NATIVE.installUpdate();
  $('#updLater').onclick = () => { const b = $('#upd'); b.style.transition = 'opacity .5s, transform .5s'; b.style.opacity = '0'; b.style.transform = 'translateY(10px)'; setTimeout(() => { b.hidden = true; b.style.cssText = ''; }, 520); };
  $('#genDict').hidden = true; // la reconnaissance vocale du navigateur n'existe pas dans l'application de bureau
}

/* ---------- langue / onglets ---------- */
function applyLang() {
  document.documentElement.lang = LANG;
  $$('[data-i]').forEach(el => { el.textContent = T(el.dataset.i); });
  $$('#langSw button').forEach(b => b.classList.toggle('on', b.dataset.l === LANG));
  $('#genText').placeholder = LANG === 'fr' ? 'Bonjour à tous\nBienvenue sur ma chaîne…' : 'Hello everyone\nWelcome to my channel…';
  $('#impText').placeholder = '1\n00:00:01,000 --> 00:00:03,500\n' + (LANG === 'fr' ? 'Bonjour à tous' : 'Hello everyone');
  if (S.isDemo) { const txt = T('demo'); S.subs.forEach((s, i) => { if (txt[i]) s.text = txt[i]; }); S.vname = T('tDemo'); S.rev++; }
  buildInsp(); renderList(); renderTL(); updRemoveLbl(); layoutStage();
  if (isOpen('#mExp')) showExport();
}
$('#langSw').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; LANG = b.dataset.l; try { localStorage.setItem('clap-lang', LANG); } catch (x) {} S.subLang = LANG === 'fr' ? 'fr-FR' : 'en-US'; applyLang(); });
$$('.tab').forEach(t => t.addEventListener('click', () => { $$('.tab').forEach(x => x.classList.toggle('on', x === t)); $('#main').dataset.tab = t.dataset.tab; }));

function renderAll() { renderList(); renderTL(); renderOverlay(true); syncInsp(); layoutStage(); }

/* ---------- raccourcis ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { ['#mImp', '#mGen', '#mExp'].forEach(s => { if (isOpen(s)) closeModal(s); }); return; }
  const tag = (e.target.tagName || '').toLowerCase(); if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
  if (isOpen('#mGen') || isOpen('#mExp') || isOpen('#mImp') || isOpen('#mProg') || exporting) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  else if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); $('#file').click(); }
  else if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); $('#btnExport').click(); }
  else if (e.key === ' ') { e.preventDefault(); S.playing ? pause() : play(); }
  else if (e.key.toLowerCase() === 's' && !mod) splitVideo();
  else if (e.key.toLowerCase() === 'n' && !mod) addSubAtHead();
  else if (e.key === 'Delete' || e.key === 'Backspace') { if (S.selSeg) toggleSeg(); else { const s = cur(); if (s) { snap(); S.subs = S.subs.filter(x => x !== s); S.selSub = S.subs[0]?.id || null; renderAll(); } } }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); setT(S.t - (e.shiftKey ? 1 : 1 / 30)); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); setT(S.t + (e.shiftKey ? 1 : 1 / 30)); }
});

/* ---------- démarrage ---------- */
hydrateIcons();
$('#tPlay').innerHTML = ico('play');
S.subLang = LANG === 'fr' ? 'fr-FR' : 'en-US';
loadDemo(); applyLang();
requestAnimationFrame(() => { fitZoom(); renderTL(); layoutStage(); });
requestAnimationFrame(frame);
})();
