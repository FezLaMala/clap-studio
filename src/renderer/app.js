/* Clap Studio — accueil, projets, éditeur à pistes (sous-titres, textes, images), paramètres d'apparence. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const fmt = (t, ms = true) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t % 1) * 100); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + (ms ? '.' + String(c).padStart(2, '0') : ''); };
const parseT = v => { v = String(v).trim().replace(',', '.'); if (v.includes(':')) { const p = v.split(':').map(Number); if (p.some(isNaN)) return null; return p.reduce((a, x) => a * 60 + x, 0); } const n = parseFloat(v); return isNaN(n) ? null : n; };
const hexRgb = hex => { const n = parseInt(String(hex).slice(1), 16) || 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgba = (hex, a) => `rgba(${hexRgb(hex).join(',')},${a})`;
const safeName = s => (String(s || '').replace(/[\\/:*?"<>|]+/g, '').trim() || 'clap').slice(0, 60);
const STEP = 0.05, LANE_H = 46;
const NATIVE = window.clap || null; // pont exposé par l'application de bureau (preload)
const fileUrl = p => 'clapfile://local/?p=' + encodeURIComponent(p);

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
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
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
  cc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 10.2a2.2 2.2 0 100 3.6M17 10.2a2.2 2.2 0 100 3.6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  alignL: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>', alignC: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>', alignR: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/>',
};
const ico = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICO[n] || ''}</svg>`;
const hydrateIcons = (root = document) => $$('[data-ic]', root).forEach(el => { el.outerHTML = ico(el.dataset.ic); });
const KIND_ICO = { sub: 'cc', text: 'text', image: 'image' };

/* ---------- textes ---------- */
const I18N = {
  fr: {
    homeTag: 'Sous-titres, textes et images sur ta vidéo, en quelques minutes.', hNew: 'Nouveau projet', hNewD: 'Partir d\'une timeline vide.', hOpen: 'Ouvrir un projet', hOpenD: 'Reprendre un fichier .clap.',
    hVideo: 'Importer une vidéo', hVideoD: 'Commencer directement avec ta vidéo.', hDemo: 'Démonstration', hDemoD: 'Découvrir l\'éditeur avec un exemple.', recent: 'Projets récents', settings: 'Paramètres',
    untitled: 'Sans titre', today: 'Aujourd\'hui', yesterday: 'Hier', forget: 'Retirer de la liste',
    import: 'Importer', auto: 'Sous-titres auto', export: 'Exporter', tabSubs: 'Éléments', tabStyle: 'Style',
    items: 'Éléments', add: 'Ajouter', format: 'Format', orig: 'Original', dropHint: 'Glisse une vidéo, des sous-titres ou une image ici', style: 'Style',
    cut: 'Couper', removePart: 'Retirer la partie', restorePart: 'Réactiver la partie', addAtHead: 'Ajouter ici', snap: 'Aimant', zoom: 'Zoom',
    tVideo: 'Vidéo', tAudio: 'Audio', track: 'Piste', newTrack: 'Nouvelle',
    kSub: 'Sous-titre', kSubD: 'Exporté en SRT / WebVTT', kText: 'Texte libre', kTextD: 'Titre, légende, appel à l\'action…', kImage: 'Image', kImageD: 'Logo, sticker, photo…',
    shift: 'Décaler les sous-titres', alignFirst: '1er ici', tShifted: d => `Sous-titres décalés de ${d > 0 ? '+' : ''}${d.toFixed(2)} s`, tAligned: 'Premier sous-titre calé sur la tête de lecture',
    impTitle: 'Importer', impDesc: 'Ajoute une vidéo, un fichier de sous-titres (.srt, .vtt, .json), une image ou un projet .clap. Tu peux aussi glisser les fichiers n\'importe où dans la fenêtre, ou coller des sous-titres avec Ctrl+V.',
    impFiles: 'Choisir des fichiers', impFilesHint: 'Vidéo · SRT · WebVTT · JSON · Image · Projet', pasteCode: 'Ou colle le contenu d\'un fichier de sous-titres', apply: 'Appliquer',
    tSubsLoaded: n => `${n} sous-titres importés`, tSubsBad: n => `Fichier de sous-titres illisible : ${n}`, tNoSubsIn: 'Aucun sous-titre lisible dans ce texte.', tPasteFirst: 'Colle d\'abord le contenu du fichier.',
    tMs: 'Les temps semblaient en millisecondes : convertis en secondes.', tUnknown: n => `Format non reconnu : ${n}`, noVideo: 'Sans vidéo', pasted: 'texte collé',
    tImgAdded: 'Image ajoutée', tImgBad: n => `Image illisible : ${n}`,
    genTitle: 'Sous-titres automatiques', genDesc: 'Clap écoute l\'audio et écrit ce qui est dit, avec le minutage (modèle Whisper exécuté sur ton ordinateur). Le premier lancement télécharge le modèle, il faut donc une connexion ; il reste ensuite en cache. Si tu colles un texte ci-dessous, il est utilisé à la place de la transcription.',
    genMode: 'Méthode', modeAi: 'Transcription IA (texte réel)', modeDetect: 'Détection de la parole seulement', genModel: 'Modèle', mTiny: 'Rapide (tiny, ~40 Mo)', mBase: 'Équilibré (base, ~75 Mo)', mSmall: 'Précis (small, ~250 Mo)',
    progTitle: 'Sous-titres automatiques', progLoad: 'Téléchargement du modèle', progAudio: 'Lecture de l\'audio', progDecode: 'Décodage de l\'audio…', progRun: 'Transcription', progLeft: s => `encore ~${s}`,
    tAiFail: 'Transcription IA indisponible (modèle non téléchargeable ou audio illisible). Détection simple utilisée à la place.', tAiEmpty: 'Aucune parole reconnue. Détection simple utilisée à la place.', tAiCancel: 'Transcription annulée',
    genLang: 'Langue parlée', genSens: 'Sensibilité', genReplace: 'Remplacer les sous-titres existants', genScript: 'Texte à répartir (facultatif, une ligne par sous-titre)',
    genGo: 'Générer', genDict: 'Dictée en direct', cancel: 'Annuler', close: 'Fermer', copy: 'Copier', save: 'Enregistrer', dontSave: 'Ne pas enregistrer',
    expDesc: 'Seuls les éléments de type « Sous-titre » sont exportés. Les parties retirées sont supprimées et les temps recalculés.', expVideo: 'Vidéo incrustée',
    expVideoDesc: 'Crée une copie de la vidéo avec tous les éléments (sous-titres, textes, images) gravés dans l\'image, sans les parties retirées. L\'enregistrement se fait en temps réel et le son est lu pendant l\'export : garde Clap ouvert jusqu\'à la fin.',
    expGo: 'Créer la vidéo', expStop: 'Arrêter', saveVideo: 'Enregistrer la vidéo', expNoVideo: 'Importe d\'abord une vidéo pour créer une version incrustée.', expReady: d => `Durée finale : ${d}`,
    expPrep: 'Préparation…', expRun: (a, b) => `Enregistrement ${a} / ${b}`, expCancelled: 'Export arrêté.', expDone: 'Vidéo prête', expDoneInfo: (mb, audio) => `${mb} Mo${audio ? '' : ' · sans son'}`,
    expFail: m => `L'export a échoué : ${m}`, expUnsupported: 'L\'export vidéo n\'est pas disponible ici.', expNothing: 'Toutes les parties sont retirées : rien à exporter.',
    emptyT: 'Aucun élément', emptyD: 'Lance « Sous-titres auto », importe un fichier .srt, ou ajoute un sous-titre, un texte ou une image avec « Ajouter ».',
    sub: 'Sous-titre', newSub: 'Nouveau sous-titre', newText: 'Ton texte', clip: 'Partie',
    presets: 'Styles rapides', applyAll: 'Appliquer à tous les éléments du même type',
    gItem: 'Élément', kindLbl: 'Type', trackLbl: 'Piste', trackHint: 'Les pistes du dessus s\'affichent par-dessus les autres.',
    gOpacity: 'Opacité', opacity: 'Opacité', gText: 'Texte', font: 'Police', size: 'Taille', weight: 'Graisse', align: 'Alignement', italic: 'Italique', upper: 'MAJUSCULES',
    gColor: 'Couleurs', color: 'Couleur', stroke: 'Contour', strokeW: 'Épaisseur', bg: 'Fond', bgOp: 'Opacité du fond', shadow: 'Ombre / lueur', shadowColor: 'Couleur ombre',
    gPos: 'Position', posX: 'Horizontal', posY: 'Vertical', centerHint: 'Glisse l\'élément sur la scène, ou utilise les flèches (Maj = pas plus grand).',
    gShape: 'Forme', rot: 'Rotation', sx: 'Étendre (largeur)', sy: 'Aplatir (hauteur)', skew: 'Inclinaison', ls: 'Espacement', flipH: 'Retourner ↔', flipV: 'Retourner ↕', reset: 'Réinitialiser',
    gAnim: 'Apparition', anim: 'Animation', aNone: 'Aucune', aFade: 'Fondu', aPop: 'Pop', aSlide: 'Glissé', aBounce: 'Rebond',
    tLoaded: 'Vidéo chargée', tDemo: 'Clip de démonstration', tAnalyzing: 'Analyse de l\'audio…', tDone: n => `${n} sous-titres créés`, tNoAudio: 'Audio illisible : sous-titres répartis à intervalles réguliers.',
    waveRead: 'Lecture de l\'audio', waveDecode: 'Décodage de l\'audio…',
    tCopied: 'Copié dans le presse-papiers', tCopyFail: 'Copie impossible : sélectionne le texte et copie-le à la main.', tNoSR: 'La dictée vocale n\'est pas disponible ici.', tSRErr: 'Dictée interrompue (micro refusé ou indisponible).',
    tDictOn: 'Dictée en cours, lecture lancée', tDictOff: 'Dictée terminée', tBadVideo: 'Impossible de lire ce fichier vidéo (essaie MP4 ou WebM).', tCut: 'Vidéo coupée à la tête de lecture', tCutNone: 'Place la tête de lecture à l\'intérieur d\'une partie.',
    tRemoved: 'Partie retirée du montage', tRestored: 'Partie réactivée', tNoSeg: 'Clique d\'abord sur une partie de la vidéo.', tSplitSub: 'Élément coupé en deux',
    tSaved: 'Projet enregistré', tOpenFail: 'Impossible d\'ouvrir ce projet (fichier déplacé ou supprimé).', tBadProject: 'Ce fichier n\'est pas un projet Clap valide.', tVideoMissing: n => `Vidéo introuvable : ${n}. Importe-la à nouveau pour la relier.`,
    askTitle: n => `Enregistrer les modifications apportées à « ${n} » ?`, askDesc: 'Si tu n\'enregistres pas, tes modifications seront perdues.',
    info: (n, d) => `${n} · ${d}`,
    checkUpd: 'Rechercher des mises à jour', updChecking: 'Recherche de mises à jour…', updAvail: v => `Version ${v} disponible`, updDl: 'Téléchargement', updReady: v => `Version ${v} prête`,
    updReadyMsg: 'Redémarre Clap pour l\'installer.', later: 'Plus tard', restart: 'Redémarrer', updNone: 'Clap est à jour.', updDev: 'Mises à jour désactivées en mode développement.', updErr: 'Impossible de vérifier les mises à jour.',
    sAppearance: 'Apparence', sInterface: 'Interface', sApp: 'Application',
    sGlass: 'Effet verre', sGlassD: 'Panneaux translucides et flous', sBlur: 'Intensité du flou', sBg: 'Fond', bgHalos: 'Halos animés', bgGradient: 'Dégradé', bgSolid: 'Uni', bgImage: 'Image',
    sBgColor: 'Couleur de fond', sBgImg: 'Image de fond', sBgPick: 'Choisir une image…', sBgDim: 'Assombrir l\'image', sAccent: 'Couleur du thème', sAccentD: 'Boutons, sélection, tête de lecture',
    sScale: 'Taille de l\'interface', sMotion: 'Animations', mFull: 'Fluides', mReduced: 'Réduites', sLang: 'Langue',
    sAutoUpd: 'Mises à jour automatiques', sAutoUpdD: 'Rechercher une nouvelle version au lancement', sCheckNow: 'Rechercher maintenant', setReset: 'Tout réinitialiser', tBgTooBig: 'Image trop lourde pour être gardée ici : choisis une image plus légère.',
    demo: ['Bienvenue dans Clap Studio', 'Les sous-titres se génèrent tout seuls…', 'Tu peux les éditer, les déplacer et les étirer.', 'Ajoute des textes et des images sur d\'autres pistes.', 'Coupe ta vidéo en plusieurs parties sur la timeline.', 'Puis exporte en SRT, WebVTT ou en vidéo incrustée.'],
  },
  en: {
    homeTag: 'Subtitles, text and images on your video, in minutes.', hNew: 'New project', hNewD: 'Start from an empty timeline.', hOpen: 'Open project', hOpenD: 'Resume a .clap file.',
    hVideo: 'Import a video', hVideoD: 'Start right away with your video.', hDemo: 'Demo', hDemoD: 'Discover the editor with an example.', recent: 'Recent projects', settings: 'Settings',
    untitled: 'Untitled', today: 'Today', yesterday: 'Yesterday', forget: 'Remove from list',
    import: 'Import', auto: 'Auto subtitles', export: 'Export', tabSubs: 'Elements', tabStyle: 'Style',
    items: 'Elements', add: 'Add', format: 'Format', orig: 'Original', dropHint: 'Drop a video, subtitles or an image here', style: 'Style',
    cut: 'Cut', removePart: 'Remove part', restorePart: 'Restore part', addAtHead: 'Add here', snap: 'Snap', zoom: 'Zoom',
    tVideo: 'Video', tAudio: 'Audio', track: 'Track', newTrack: 'New',
    kSub: 'Subtitle', kSubD: 'Exported to SRT / WebVTT', kText: 'Free text', kTextD: 'Title, caption, call to action…', kImage: 'Image', kImageD: 'Logo, sticker, photo…',
    shift: 'Shift subtitles', alignFirst: 'First here', tShifted: d => `Subtitles shifted by ${d > 0 ? '+' : ''}${d.toFixed(2)} s`, tAligned: 'First subtitle aligned to the playhead',
    impTitle: 'Import', impDesc: 'Add a video, a subtitle file (.srt, .vtt, .json), an image or a .clap project. You can also drop files anywhere in the window, or paste subtitles with Ctrl+V.',
    impFiles: 'Choose files', impFilesHint: 'Video · SRT · WebVTT · JSON · Image · Project', pasteCode: 'Or paste the content of a subtitle file', apply: 'Apply',
    tSubsLoaded: n => `${n} subtitles imported`, tSubsBad: n => `Unreadable subtitle file: ${n}`, tNoSubsIn: 'No readable subtitles in this text.', tPasteFirst: 'Paste the file content first.',
    tMs: 'Timings looked like milliseconds: converted to seconds.', tUnknown: n => `Unsupported format: ${n}`, noVideo: 'No video', pasted: 'pasted text',
    tImgAdded: 'Image added', tImgBad: n => `Unreadable image: ${n}`,
    genTitle: 'Automatic subtitles', genDesc: 'Clap listens to the audio and writes what is said, with timings (Whisper model running on your computer). The first run downloads the model, so it needs a connection; it is cached afterwards. If you paste a text below, it is used instead of the transcription.',
    genMode: 'Method', modeAi: 'AI transcription (real text)', modeDetect: 'Speech detection only', genModel: 'Model', mTiny: 'Fast (tiny, ~40 MB)', mBase: 'Balanced (base, ~75 MB)', mSmall: 'Accurate (small, ~250 MB)',
    progTitle: 'Automatic subtitles', progLoad: 'Downloading the model', progAudio: 'Reading the audio', progDecode: 'Decoding the audio…', progRun: 'Transcribing', progLeft: s => `~${s} left`,
    tAiFail: 'AI transcription is not available (model could not be downloaded or audio unreadable). Plain detection used instead.', tAiEmpty: 'No speech recognized. Plain detection used instead.', tAiCancel: 'Transcription cancelled',
    genLang: 'Spoken language', genSens: 'Sensitivity', genReplace: 'Replace existing subtitles', genScript: 'Text to spread (optional, one line per subtitle)',
    genGo: 'Generate', genDict: 'Live dictation', cancel: 'Cancel', close: 'Close', copy: 'Copy', save: 'Save', dontSave: 'Don\'t save',
    expDesc: 'Only “Subtitle” elements are exported. Removed parts are dropped and timings are recalculated.', expVideo: 'Burned-in video',
    expVideoDesc: 'Creates a copy of the video with every element (subtitles, text, images) burned into the picture, without the removed parts. Recording happens in real time and the sound plays during the export: keep Clap open until it finishes.',
    expGo: 'Create video', expStop: 'Stop', saveVideo: 'Save video', expNoVideo: 'Import a video first to create a burned-in version.', expReady: d => `Final duration: ${d}`,
    expPrep: 'Preparing…', expRun: (a, b) => `Recording ${a} / ${b}`, expCancelled: 'Export stopped.', expDone: 'Video ready', expDoneInfo: (mb, audio) => `${mb} MB${audio ? '' : ' · no sound'}`,
    expFail: m => `Export failed: ${m}`, expUnsupported: 'Video export is not available here.', expNothing: 'Every part is removed: nothing to export.',
    emptyT: 'No elements yet', emptyD: 'Run “Auto subtitles”, import a .srt file, or add a subtitle, text or image with “Add”.',
    sub: 'Subtitle', newSub: 'New subtitle', newText: 'Your text', clip: 'Part',
    presets: 'Quick styles', applyAll: 'Apply to every element of the same type',
    gItem: 'Element', kindLbl: 'Type', trackLbl: 'Track', trackHint: 'Upper tracks are drawn above the others.',
    gOpacity: 'Opacity', opacity: 'Opacity', gText: 'Text', font: 'Font', size: 'Size', weight: 'Weight', align: 'Alignment', italic: 'Italic', upper: 'UPPERCASE',
    gColor: 'Colors', color: 'Color', stroke: 'Outline', strokeW: 'Thickness', bg: 'Background', bgOp: 'Background opacity', shadow: 'Shadow / glow', shadowColor: 'Shadow color',
    gPos: 'Position', posX: 'Horizontal', posY: 'Vertical', centerHint: 'Drag the element on the stage, or use the arrows (Shift = bigger step).',
    gShape: 'Shape', rot: 'Rotation', sx: 'Stretch (width)', sy: 'Flatten (height)', skew: 'Slant', ls: 'Spacing', flipH: 'Flip ↔', flipV: 'Flip ↕', reset: 'Reset',
    gAnim: 'Entrance', anim: 'Animation', aNone: 'None', aFade: 'Fade', aPop: 'Pop', aSlide: 'Slide', aBounce: 'Bounce',
    tLoaded: 'Video loaded', tDemo: 'Demo clip', tAnalyzing: 'Analyzing audio…', tDone: n => `${n} subtitles created`, tNoAudio: 'Audio could not be read: subtitles spread at regular intervals.',
    waveRead: 'Reading the audio', waveDecode: 'Decoding the audio…',
    tCopied: 'Copied to clipboard', tCopyFail: 'Copy failed: select the text and copy it by hand.', tNoSR: 'Voice dictation is not available here.', tSRErr: 'Dictation stopped (microphone denied or unavailable).',
    tDictOn: 'Dictation running, playback started', tDictOff: 'Dictation finished', tBadVideo: 'This video file cannot be played (try MP4 or WebM).', tCut: 'Video cut at the playhead', tCutNone: 'Put the playhead inside a part first.',
    tRemoved: 'Part removed from the edit', tRestored: 'Part restored', tNoSeg: 'Click a video part first.', tSplitSub: 'Element split in two',
    tSaved: 'Project saved', tOpenFail: 'Could not open this project (file moved or deleted).', tBadProject: 'This file is not a valid Clap project.', tVideoMissing: n => `Video not found: ${n}. Import it again to relink it.`,
    askTitle: n => `Save changes to “${n}”?`, askDesc: 'If you don\'t save, your changes will be lost.',
    info: (n, d) => `${n} · ${d}`,
    checkUpd: 'Check for updates', updChecking: 'Checking for updates…', updAvail: v => `Version ${v} available`, updDl: 'Downloading', updReady: v => `Version ${v} ready`,
    updReadyMsg: 'Restart Clap to install it.', later: 'Later', restart: 'Restart', updNone: 'Clap is up to date.', updDev: 'Updates are disabled in development mode.', updErr: 'Could not check for updates.',
    sAppearance: 'Appearance', sInterface: 'Interface', sApp: 'Application',
    sGlass: 'Glass effect', sGlassD: 'Translucent, blurred panels', sBlur: 'Blur strength', sBg: 'Background', bgHalos: 'Animated halos', bgGradient: 'Gradient', bgSolid: 'Solid', bgImage: 'Image',
    sBgColor: 'Background color', sBgImg: 'Background image', sBgPick: 'Choose an image…', sBgDim: 'Darken the image', sAccent: 'Theme color', sAccentD: 'Buttons, selection, playhead',
    sScale: 'Interface size', sMotion: 'Animations', mFull: 'Smooth', mReduced: 'Reduced', sLang: 'Language',
    sAutoUpd: 'Automatic updates', sAutoUpdD: 'Look for a new version at launch', sCheckNow: 'Check now', setReset: 'Reset everything', tBgTooBig: 'Image too heavy to be kept here: choose a lighter one.',
    demo: ['Welcome to Clap Studio', 'Subtitles generate themselves…', 'Edit them, move them and stretch them.', 'Add text and images on other tracks.', 'Cut your video into parts on the timeline.', 'Then export as SRT, WebVTT or a burned-in video.'],
  },
};
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };

/* ---------- paramètres ---------- */
const SET_DEF = { glass: true, blur: 28, bg: 'halos', bgColor: '#0a0a0b', bgImage: '', bgDim: 55, accent: '#f4f4f5', scale: 100, motion: 'full', lang: 'fr', autoUpdate: true };
const SET = { ...SET_DEF, ...store.get('clap-settings', {}) };
{ const l = store.get('clap-lang', null); if ((l === 'en' || l === 'fr') && !store.get('clap-settings', null)) SET.lang = l; }
const ACCENTS = ['#f4f4f5', '#a1a1aa', '#60a5fa', '#a78bfa', '#f472b6', '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf'];
const BG_COLORS = ['#0a0a0b', '#141416', '#0e1117', '#0d0b16', '#0b1310', '#160b0e', '#16120b'];
let LANG = SET.lang;
const T = (k, ...a) => { const v = (I18N[LANG][k] ?? I18N.fr[k] ?? k); return typeof v === 'function' ? v(...a) : v; };

function applySettings() {
  const r = document.documentElement.style, b = document.body;
  b.classList.toggle('no-glass', !SET.glass);
  b.classList.toggle('reduce-motion', SET.motion === 'reduced');
  b.dataset.bg = SET.bg === 'image' && !SET.bgImage ? 'halos' : SET.bg;
  r.setProperty('--blur-px', SET.blur + 'px');
  r.setProperty('--bg', SET.bgColor);
  r.setProperty('--bg-img', SET.bgImage ? `url("${SET.bgImage.startsWith('data:') ? SET.bgImage : fileUrl(SET.bgImage) + '&v=' + (SET.bgVer || 0)}")` : 'none');
  r.setProperty('--bg-dim', SET.bgDim / 100);
  const [cr, cg, cb] = hexRgb(SET.accent), lum = (0.2126 * cr + 0.7152 * cg + 0.0722 * cb) / 255;
  r.setProperty('--accent', SET.accent); r.setProperty('--accent-rgb', `${cr},${cg},${cb}`); r.setProperty('--accent-fg', lum > 0.55 ? '#0a0a0b' : '#ffffff');
  if (NATIVE) NATIVE.setZoom(SET.scale / 100); else document.documentElement.style.zoom = SET.scale / 100;
}
const saveSettings = () => { store.set('clap-settings', SET); applySettings(); };

/* ---------- état ---------- */
const FONTS = ['Montserrat', 'Poppins', 'Sora', 'Oswald', 'Anton', 'Bebas Neue', 'Bangers', 'Permanent Marker', 'Playfair Display', 'Caveat', 'Pacifico', 'Lobster', 'Roboto Mono'];
const DEF = { font: 'Montserrat', size: 64, weight: 800, italic: false, upper: false, align: 'center', color: '#ffffff', stroke: '#000000', strokeW: 5, bg: '#000000', bgOp: 0, shadow: 30, shadowColor: '#000000', op: 100, x: 50, y: 84, rot: 0, sx: 100, sy: 100, skew: 0, ls: 0, flipH: false, flipV: false, anim: 'pop' };
const DEF_KIND = {
  sub: DEF,
  text: { ...DEF, font: 'Bebas Neue', size: 120, weight: 400, ls: 4, strokeW: 0, shadow: 45, y: 50, anim: 'fade' },
  image: { ...DEF, size: 300, y: 40, strokeW: 0, shadow: 0, anim: 'fade' },
};
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
  duration: 30, t: 0, playing: false, hasVideo: false, isDemo: false, file: null, videoPath: null, vw: 1920, vh: 1080, vname: '',
  peaks: null, aspect: 'orig', zoom: 40, snap: true, applyAll: false, subLang: 'fr-FR',
  items: [], media: {}, segs: [{ id: uid(), a: 0, b: 30, off: false }], sel: null, selSeg: null, rev: 0,
  path: null, dirty: false, view: 'home',
};
const vid = $('#vid'), demo = $('#demo'), stage = $('#stage'), overlay = $('#overlay');
const byId = id => S.items.find(i => i.id === id);
const cur = () => byId(S.sel) || null;
const isText = it => it && it.kind !== 'image';
const subsOnly = () => S.items.filter(i => i.kind === 'sub');
const targets = () => { const c = cur(); if (!c) return []; return S.applyAll ? S.items.filter(i => isText(i) === isText(c)) : [c]; };
const sortItems = () => S.items.sort((a, b) => a.a - b.a || a.track - b.track);
const mkItem = (kind, a, b, o = {}) => ({ id: uid(), kind, track: o.track ?? 0, a, b, text: o.text ?? '', media: o.media ?? null, st: { ...DEF_KIND[kind], ...(o.st || {}) } });
const firstFreeTrack = (a, b, from) => { for (let t = from; ; t++) if (!S.items.some(i => i.track === t && i.a < b && i.b > a)) return t; };
const nLanes = () => S.items.reduce((m, i) => Math.max(m, i.track + 1), 1) + 1; // une piste vide de plus pour déposer
let exporting = false;

/* ---------- enregistrement : modifications en cours ---------- */
function setDirty(d) {
  if (S.dirty === d) return;
  S.dirty = d; $('#dirtyDot').hidden = !d; updTitle();
}
const markDirty = () => { if (S.view === 'editor') setDirty(true); };
function updTitle() { document.title = S.view === 'home' ? 'Clap Studio' : `${$('#pname').value || T('untitled')}${S.dirty ? ' •' : ''} — Clap Studio`; }

/* ---------- historique ---------- */
let undoStack = [], redoStack = [], lastSnapAt = 0;
const snapshot = () => JSON.stringify({ items: S.items, segs: S.segs });
function snap() { undoStack.push(snapshot()); if (undoStack.length > 80) undoStack.shift(); redoStack = []; lastSnapAt = performance.now(); markDirty(); }
function snapSoft() { if (performance.now() - lastSnapAt > 900) snap(); else markDirty(); }
function restore(json) {
  const o = JSON.parse(json); S.items = o.items; S.segs = o.segs;
  if (!byId(S.sel)) S.sel = S.items[0]?.id || null;
  if (!S.segs.find(s => s.id === S.selSeg)) S.selSeg = null;
  markDirty(); renderAll();
}
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); }
const clearHistory = () => { undoStack = []; redoStack = []; };

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
// demande type Word : « Enregistrer les modifications ? » → 'save' | 'discard' | 'cancel'
let askResolve = null;
function ask(title, desc) {
  if (askResolve) askResolve('cancel');
  $('#askT').textContent = title; $('#askD').textContent = desc; openModal('#mAsk');
  setTimeout(() => $('#askYes').focus(), 60);
  return new Promise(r => { askResolve = r; });
}
const answer = v => { closeModal('#mAsk'); const r = askResolve; askResolve = null; r?.(v); };
$('#askYes').onclick = () => answer('save'); $('#askNo').onclick = () => answer('discard'); $('#askCancel').onclick = () => answer('cancel');
async function confirmDiscard() {
  if (!S.dirty) return true;
  const r = await ask(T('askTitle', $('#pname').value || T('untitled')), T('askDesc'));
  if (r === 'save') return saveProject();
  return r === 'discard';
}

/* menu d'ajout */
function openMenu(btn) {
  const m = $('#addMenu'), r = btn.getBoundingClientRect();
  m.hidden = false; const h = m.offsetHeight, w = m.offsetWidth;
  const below = r.bottom + 6 + h < innerHeight;
  m.style.left = clamp(r.left, 8, innerWidth - w - 8) + 'px'; m.style.top = (below ? r.bottom + 6 : r.top - h - 6) + 'px';
  requestAnimationFrame(() => m.classList.add('open'));
}
function closeMenu() { const m = $('#addMenu'); if (m.hidden) return; m.classList.remove('open'); setTimeout(() => { if (!m.classList.contains('open')) m.hidden = true; }, 300); }
$$('[data-menu="add"]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); $('#addMenu').hidden ? openMenu(b) : closeMenu(); }));
document.addEventListener('pointerdown', e => { if (!e.target.closest('#addMenu') && !e.target.closest('[data-menu]')) closeMenu(); });
$('#addMenu').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; closeMenu(); addAtHead(b.dataset.add); });

/* ---------- vues ---------- */
function showView(v) {
  S.view = v;
  $('#home').classList.toggle('off', v !== 'home'); $('#app').classList.toggle('off', v !== 'editor');
  if (v === 'home') { pause(); renderRecents(); }
  else requestAnimationFrame(() => { fitZoom(); renderTL(); layoutStage(); });
  updTitle();
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

let lastFrame = performance.now(), liveKey = '';
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
  if (S.view === 'editor') {
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
    const act = activeItems(), key = act.map(i => i.id).join(',');
    if (key !== liveKey) {
      liveKey = key;
      $$('.li.live,.blk.live').forEach(e => e.classList.remove('live'));
      act.forEach(i => { $(`.li[data-id="${i.id}"]`)?.classList.add('live'); $(`.blk[data-id="${i.id}"]`)?.classList.add('live'); });
    }
    renderOverlay();
    if (S.playing || exporting) { const sc = $('#tlScroll'), x = S.t * S.zoom; if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 60); }
  }
  requestAnimationFrame(frame);
}

/* ---------- fond de scène sans vidéo ---------- */
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
  if (S.isDemo) { g.font = `600 ${Math.max(10, Math.min(w, h) * .045)}px 'Segoe UI', sans-serif`; g.fillText(LANG === 'fr' ? 'CLIP DE DÉMONSTRATION' : 'DEMO CLIP', w / 2, h * .1); }
  g.font = `500 ${Math.max(10, Math.min(w, h) * .085)}px 'Cascadia Mono', Consolas, monospace`; g.fillText(fmt(t), w / 2, h * .55);
}
const DEMO_RANGES = [[.8, 3.6], [4.2, 7.4], [8, 11.2], [12, 15], [15.8, 19], [19.8, 23]];
function demoPeaks() {
  const n = Math.floor(S.duration / STEP), p = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i * STEP, inside = DEMO_RANGES.some(r => t >= r[0] && t <= r[1]); p[i] = inside ? .22 + .2 * Math.abs(Math.sin(t * 17)) * Math.abs(Math.sin(t * 3.1 + 1)) + Math.random() * .03 : .015 + Math.random() * .015; }
  return p;
}

/* ---------- projet : nouveau, démo, ouverture, enregistrement ---------- */
function resetProject() {
  pause();
  if (vid.src) { if (vid.src.startsWith('blob:')) { try { URL.revokeObjectURL(vid.src); } catch (e) {} } vid.removeAttribute('src'); vid.load(); }
  Object.assign(S, { hasVideo: false, isDemo: false, file: null, videoPath: null, vw: 1920, vh: 1080, vname: T('noVideo'), duration: 30, t: 0,
    peaks: null, items: [], media: {}, segs: [{ id: uid(), a: 0, b: 30, off: false }], sel: null, selSeg: null, path: null, aspect: 'orig' });
  vid.hidden = true; demo.hidden = false; $('#aspect').value = 'orig'; $('#pname').value = T('untitled');
  imgCache.clear(); setWave(null); clearHistory(); $('#expResult').hidden = true;
}
function loadDemo() {
  resetProject();
  S.isDemo = true; S.duration = 24; S.vname = T('tDemo'); S.segs = [{ id: uid(), a: 0, b: 24, off: false }]; S.peaks = demoPeaks();
  const txt = T('demo');
  S.items = DEMO_RANGES.map((r, i) => mkItem('sub', r[0], r[1], { text: txt[i], st: PRESETS[0].st }));
  S.items.push(mkItem('text', .3, 7.6, { track: 1, text: 'CLAP STUDIO', st: { y: 20 } }));
  S.sel = S.items[0].id; $('#pname').value = T('hDemo');
}
async function startProject(kind) {
  if (!(await confirmDiscard())) return false;
  if (kind === 'demo') loadDemo(); else resetProject();
  showView('editor'); fitZoom(); renderAll(); setDirty(false);
  return true;
}
$('#hNew').onclick = () => startProject('new');
$('#hDemo').onclick = () => startProject('demo');
$('#hVideo').onclick = async () => { if (await startProject('new')) $('#file').click(); };
$('#hOpen').onclick = () => openProject();
$('#goHome').onclick = async () => { if (await confirmDiscard()) { resetProject(); setDirty(false); showView('home'); } };

function projectData() {
  const used = new Set(S.items.filter(i => i.media).map(i => i.media)), media = {};
  used.forEach(id => { if (S.media[id]) media[id] = S.media[id]; });
  return {
    app: 'clap-studio', format: 2, name: $('#pname').value, duration: S.duration, aspect: S.aspect,
    video: S.videoPath ? { path: S.videoPath, name: S.vname } : null,
    parts: S.segs.map(g => ({ a: g.a, b: g.b, off: g.off })),
    items: S.items.map(i => ({ kind: i.kind, track: i.track, start: +i.a.toFixed(3), end: +i.b.toFixed(3), text: i.text, media: i.media, style: i.st })),
    media,
  };
}
async function saveProject(as) {
  const content = JSON.stringify(projectData()), name = safeName($('#pname').value);
  if (NATIVE) {
    let p = null; try { p = await NATIVE.saveProject({ path: as ? null : S.path, name, content }); } catch (e) { toast(String(e.message || e), true); return false; }
    if (!p) return false;
    S.path = p; addRecent(p, $('#pname').value);
  } else {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    download(url, name + '.clap'); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  setDirty(false); toast(T('tSaved'));
  return true;
}
async function openProject(path) {
  if (!(await confirmDiscard())) return;
  if (!NATIVE) { $('#fileProj').click(); return; }
  const r = await NATIVE.openProject(path);
  if (!r) return;
  if (r.error) { toast(T('tOpenFail'), true); if (r.error === 'missing') forgetRecent(r.path); return; }
  let o; try { o = JSON.parse(r.content); } catch (e) { toast(T('tBadProject'), true); return; }
  if (!isProject(o)) { toast(T('tBadProject'), true); return; }
  await loadProject(o, r.path);
}
$('#fileProj').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const o = JSON.parse(await f.text()); if (!isProject(o)) throw 0; await loadProject(o, null); } catch (x) { toast(T('tBadProject'), true); }
};
const isProject = o => o && typeof o === 'object' && !Array.isArray(o) && (Array.isArray(o.items) || (Array.isArray(o.subtitles) && Array.isArray(o.parts)));
async function loadProject(o, path) {
  resetProject();
  for (const [id, m] of Object.entries(o.media || {})) if (m && typeof m.data === 'string' && m.data.startsWith('data:image/')) S.media[id] = { name: String(m.name || 'image'), data: m.data, w: +m.w || 0, h: +m.h || 0 };
  const list = Array.isArray(o.items) ? o.items : o.subtitles.map(s => ({ ...s, kind: 'sub', track: 0 }));
  S.items = list.map(x => {
    const kind = ['sub', 'text', 'image'].includes(x.kind) ? x.kind : 'sub', a = +x.start || 0, b = +x.end || a + 2;
    if (kind === 'image' && !S.media[x.media]) return null;
    return mkItem(kind, a, Math.max(b, a + .1), { track: Math.max(0, Math.floor(+x.track || 0)), text: String(x.text ?? ''), media: x.media ?? null, st: x.style && typeof x.style === 'object' ? x.style : {} });
  }).filter(Boolean);
  S.duration = Math.max(1, +o.duration || 30, ...S.items.map(i => i.b));
  const parts = Array.isArray(o.parts) ? o.parts.filter(g => typeof g.a === 'number' && typeof g.b === 'number' && g.b > g.a) : [];
  S.segs = parts.length ? parts.map(g => ({ id: uid(), a: g.a, b: g.b, off: !!g.off })) : [{ id: uid(), a: 0, b: S.duration, off: false }];
  S.aspect = ['orig', '16/9', '9/16', '1/1', '4/5'].includes(o.aspect) ? o.aspect : 'orig'; $('#aspect').value = S.aspect;
  $('#pname').value = String(o.name || T('untitled')).slice(0, 60); S.path = path; S.sel = S.items[0]?.id || null;
  showView('editor'); fitZoom(); renderAll();
  if (o.video?.path && NATIVE) {
    const f = await nativeFile(o.video.path);
    if (f) await loadFile(f, { keep: true }); else toast(T('tVideoMissing', o.video.name || o.video.path), true);
  }
  setDirty(false); clearHistory();
  if (path) addRecent(path, $('#pname').value);
}
async function nativeFile(p) {
  const st = await NATIVE.stat(p); if (!st) return null;
  return { name: p.split(/[\\/]/).pop(), size: st.size, path: p, url: fileUrl(p), type: '' };
}

/* projets récents (application de bureau) */
const getRecents = () => store.get('clap-recents', []).filter(r => r && r.path);
function addRecent(path, name) { store.set('clap-recents', [{ path, name, t: Date.now() }, ...getRecents().filter(r => r.path !== path)].slice(0, 8)); }
function forgetRecent(path) { store.set('clap-recents', getRecents().filter(r => r.path !== path)); renderRecents(); }
function when(t) {
  const d = new Date(t), now = new Date(), day = 864e5, k = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / day);
  const hm = d.toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' });
  return k === 0 ? `${T('today')} ${hm}` : k === 1 ? `${T('yesterday')} ${hm}` : d.toLocaleDateString(LANG, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
function renderRecents() {
  const list = NATIVE ? getRecents() : [];
  $('#recents').hidden = !list.length;
  $('#recentList').innerHTML = list.map(r => `<div class="rec" data-path="${esc(r.path)}" role="button" tabindex="0">${ico('file')}<span><b>${esc(r.name || r.path.split(/[\\/]/).pop())}</b><small>${esc(r.path)}</small></span><time>${when(r.t)}</time><button class="btn sm icon ghost" data-forget title="${T('forget')}">${ico('x')}</button></div>`).join('');
}
$('#recentList').addEventListener('click', e => {
  const r = e.target.closest('.rec'); if (!r) return;
  if (e.target.closest('[data-forget]')) { forgetRecent(r.dataset.path); return; }
  openProject(r.dataset.path);
});
$('#recentList').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.closest('.rec')?.click(); });

/* ---------- vidéo importée ---------- */
function loadFile(file, o = {}) {
  return new Promise(resolve => {
    if (!file) return resolve(false);
    const url = file.url || URL.createObjectURL(file);
    if (vid.src && vid.src.startsWith('blob:')) { try { URL.revokeObjectURL(vid.src); } catch (e) {} }
    pause();
    vid.onloadedmetadata = async () => {
      // certains WebM n'annoncent pas leur durée : on la fait calculer en sautant à la fin
      if (!isFinite(vid.duration)) {
        await new Promise(r => { vid.ondurationchange = () => { if (isFinite(vid.duration)) r(); }; vid.currentTime = 1e9; setTimeout(r, 3000); });
        vid.ondurationchange = null; vid.currentTime = 0;
      }
      S.hasVideo = true; S.file = file; S.duration = isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 1; S.vw = vid.videoWidth; S.vh = vid.videoHeight; S.vname = file.name; S.t = 0;
      S.videoPath = file.path || NATIVE?.pathForFile(file) || null;
      vid.hidden = false; demo.hidden = true;
      if (o.keep) S.segs = S.segs.filter(g => g.a < S.duration).map(g => ({ ...g, b: Math.min(g.b, S.duration) }));
      else S.segs = [{ id: uid(), a: 0, b: S.duration, off: false }];
      if (!S.segs.length) S.segs = [{ id: uid(), a: 0, b: S.duration, off: false }];
      S.segs[S.segs.length - 1].b = S.duration; S.selSeg = null; S.peaks = null;
      // les éléments de la démo sont retirés ; ceux du projet sont conservés
      if (S.isDemo) S.items = [];
      else S.items = S.items.filter(i => i.a < S.duration).map(i => ({ ...i, b: Math.min(i.b, S.duration) }));
      S.isDemo = false; if (!byId(S.sel)) S.sel = S.items[0]?.id || null;
      if (!o.keep) { clearHistory(); if ($('#pname').value === T('untitled') || $('#pname').value === T('hDemo')) $('#pname').value = file.name.replace(/\.[^.]+$/, '').slice(0, 60); markDirty(); toast(T('tLoaded')); }
      fitZoom(); renderAll(); layoutStage();
      analyzeAudio(file); resolve(true);
    };
    vid.onerror = () => { toast(T('tBadVideo'), true); resolve(false); };
    vid.src = url; vid.load();
  });
}

/* lecture d'un fichier avec progression (les gros fichiers prennent du temps) */
async function readWithProgress(file, cb) {
  let stream, total = file.size || 0;
  if (file.url) { const r = await fetch(file.url); if (!r.ok) throw new Error('read'); total = +r.headers.get('content-length') || total; stream = r.body; }
  else stream = file.stream();
  const reader = stream.getReader(), parts = []; let got = 0, last = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    parts.push(value); got += value.length;
    if (total && performance.now() - last > 80) { last = performance.now(); cb(got / total); }
  }
  cb(1);
  const out = new Uint8Array(got); let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
  return out.buffer;
}

/* forme d'onde, avec l'état de l'analyse affiché sur la piste audio */
let waveState = null, waveJob = 0;
function setWave(st) { waveState = st; renderWaveStatus(); }
function renderWaveStatus() {
  const box = $('#waveStatus'); if (!box) return;
  box.hidden = !waveState; if (!waveState) return;
  box.querySelector('span').textContent = waveState.msg + (waveState.frac != null ? ` ${Math.round(waveState.frac * 100)} %` : '');
  box.querySelector('.bar').classList.toggle('ind', waveState.frac == null);
  box.querySelector('.bar i').style.width = waveState.frac == null ? '' : waveState.frac * 100 + '%';
}
async function analyzeAudio(file) {
  const job = ++waveJob;
  S.peaks = null; drawWave();
  try {
    if (file.size > 600e6) throw new Error('big');
    setWave({ msg: T('waveRead'), frac: 0 });
    const buf = await readWithProgress(file, f => { if (job === waveJob) setWave({ msg: T('waveRead'), frac: f }); });
    if (job !== waveJob) return;
    setWave({ msg: T('waveDecode'), frac: null });
    const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
    const audio = await ctx.decodeAudioData(buf); try { ctx.close(); } catch (e) {}
    if (job !== waveJob) return;
    const ch = audio.getChannelData(0), win = Math.floor(audio.sampleRate * STEP), n = Math.floor(ch.length / win), p = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = 0; j < win; j += 4) { const v = ch[i * win + j]; s += v * v; c++; } p[i] = Math.sqrt(s / c); }
    S.peaks = p;
  } catch (e) { if (job === waveJob) S.peaks = null; }
  if (job === waveJob) { setWave(null); drawWave(); }
}
function drawWave() {
  const c = $('#waveCv'); if (!c) return;
  const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  if (!S.peaks) return;
  const W = c.width, H = c.height, p = S.peaks; let mx = 0; for (let i = 0; i < p.length; i += 3) mx = Math.max(mx, p[i]); mx = mx || 1;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f4f4f5'); gr.addColorStop(.5, '#a1a1a8'); gr.addColorStop(1, '#f4f4f5'); g.fillStyle = gr;
  for (let x = 0; x < W; x++) {
    const a = Math.floor(x / W * p.length), b = Math.max(a + 1, Math.floor((x + 1) / W * p.length)); let m = 0; for (let i = a; i < b && i < p.length; i++) m = Math.max(m, p[i]);
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
  return cues;
}
function parseJSONCues(o) {
  const arr = Array.isArray(o) ? o : (o.subtitles || o.cues || o.captions || o.segments || o.chunks || o.transcription || []);
  return arr.map(x => {
    let a, b; if (Array.isArray(x.timestamp)) { a = x.timestamp[0]; b = x.timestamp[1]; } else { a = x.start ?? x.from ?? x.a ?? x.startTime ?? x.begin; b = x.end ?? x.to ?? x.b ?? x.endTime ?? x.stop; }
    a = typeof a === 'string' ? parseTime(a) : a; b = typeof b === 'string' ? parseTime(b) : b;
    const text = x.text ?? x.content ?? x.caption ?? x.value; if (a == null || !text) return null;
    return { a: +a, b: b == null ? +a + 2.5 : +b, text: String(text).trim(), style: x.style && typeof x.style === 'object' ? { ...x.style } : null };
  }).filter(Boolean);
}
// texte collé ou fichier : un projet Clap s'ouvre comme projet, le reste remplace les sous-titres
async function importText(txt, name) {
  const t = txt.replace(/^﻿/, '').trim();
  let cues;
  if (t[0] === '{' || t[0] === '[') {
    let o; try { o = JSON.parse(t); } catch (e) { toast(T('tSubsBad', name), true); return false; }
    if (isProject(o) && Array.isArray(o.items)) { if (!(await confirmDiscard())) return false; await loadProject(o, null); setDirty(true); return true; }
    cues = parseJSONCues(o);
  } else cues = parseCues(t);
  cues = cues.filter(c => c.text && isFinite(c.a) && isFinite(c.b) && c.b > c.a).sort((x, y) => x.a - y.a);
  if (!cues.length) { toast(T('tNoSubsIn'), true); return false; }
  const mx = Math.max(...cues.map(c => c.b));
  if ((S.hasVideo && mx > S.duration * 20 && mx > 1000) || (!S.hasVideo && mx > 36000)) { cues.forEach(c => { c.a /= 1000; c.b /= 1000; }); toast(T('tMs')); }
  const base = S.isDemo ? DEF : (subsOnly()[0]?.st || DEF);
  if (S.isDemo) S.items = [];
  snap();
  if (!S.hasVideo) {
    // pas encore de vidéo : la timeline s'adapte à la durée des sous-titres
    S.duration = Math.max(S.isDemo ? 10 : S.duration, Math.ceil(Math.max(...cues.map(c => c.b)) + 1));
    S.segs = [{ id: uid(), a: 0, b: S.duration, off: false }]; S.selSeg = null; S.peaks = null; S.isDemo = false; S.vname = T('noVideo');
  }
  const made = cues.filter(c => c.a < S.duration).map(c => mkItem('sub', c.a, Math.min(c.b, S.duration), { text: c.text, st: c.style || { ...base } }));
  S.items = S.items.filter(i => i.kind !== 'sub').concat(made);
  S.sel = made[0]?.id || null; S.t = 0; if (S.hasVideo) vid.currentTime = 0;
  fitZoom(); renderAll(); toast(T('tSubsLoaded', made.length));
  return true;
}
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv|ogv|avi)$/i, SUB_EXT = /\.(srt|vtt|json|txt|clap)$/i, IMG_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
const isVideo = f => f.type.startsWith('video/') || VIDEO_EXT.test(f.name);
const isImage = f => f.type.startsWith('image/') || IMG_EXT.test(f.name);
const isSubFile = f => SUB_EXT.test(f.name) || f.type === 'application/json' || f.type.startsWith('text/');
async function handleFiles(list) {
  const files = [...list], vids = files.filter(isVideo), imgs = files.filter(f => !isVideo(f) && isImage(f)), subs = files.filter(f => !isVideo(f) && !isImage(f) && isSubFile(f));
  files.filter(f => !isVideo(f) && !isImage(f) && !isSubFile(f)).forEach(f => toast(T('tUnknown', f.name), true));
  if (S.view !== 'editor' && (vids.length || imgs.length || subs.length)) { if (!(await startProject('new'))) return; }
  if (vids.length) await loadFile(vids[0]); // la vidéo d'abord, pour que les sous-titres se calent sur sa durée
  for (const f of subs) { try { await importText(await f.text(), f.name); } catch (e) { toast(T('tSubsBad', f.name), true); } }
  for (const f of imgs) await addImage(f);
}

/* ---------- ajout d'éléments ---------- */
function addAtHead(kind) {
  if (kind === 'image') { $('#fileImg').click(); return; }
  const a = Math.min(S.t, Math.max(0, S.duration - .5)), b = Math.min(S.duration, a + (kind === 'text' ? 3 : 2.5));
  const base = kind === 'sub' ? (cur()?.kind === 'sub' ? cur().st : subsOnly()[0]?.st) : null;
  snap();
  const it = mkItem(kind, a, Math.max(b, a + .5), { track: firstFreeTrack(a, b, kind === 'sub' ? 0 : 1), text: kind === 'sub' ? T('newSub') : T('newText'), st: base ? { ...base } : {} });
  S.items.push(it); sortItems(); S.sel = it.id; renderAll();
  $(`.li[data-id="${it.id}"] textarea`)?.focus();
}
$('#fileImg').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) addImage(f); };
function addImage(file) {
  return new Promise(resolve => {
    const fr = new FileReader();
    fr.onerror = () => { toast(T('tImgBad', file.name), true); resolve(false); };
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const id = uid(); S.media[id] = { name: file.name, data: fr.result, w: img.naturalWidth, h: img.naturalHeight };
        const a = Math.min(S.t, Math.max(0, S.duration - .5)), b = Math.min(S.duration, a + 4);
        snap();
        const size = Math.round(clamp(img.naturalHeight, 80, 360));
        const it = mkItem('image', a, Math.max(b, a + .5), { track: firstFreeTrack(a, b, 1), media: id, st: { size } });
        S.items.push(it); sortItems(); S.sel = it.id; renderAll(); toast(T('tImgAdded')); resolve(true);
      };
      img.onerror = () => { toast(T('tImgBad', file.name), true); resolve(false); };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ---------- calage global des sous-titres ---------- */
function shiftAll(d) {
  if (!subsOnly().length || !d) return;
  snap();
  S.items = S.items.map(i => i.kind !== 'sub' ? i : ({ ...i, a: clamp(i.a + d, 0, S.duration), b: clamp(i.b + d, 0, S.duration) })).filter(i => i.b - i.a > .05);
  if (!byId(S.sel)) S.sel = S.items[0]?.id || null;
  renderAll(); toast(T('tShifted', d));
}
const shiftStep = () => clamp(parseFloat($('#shiftStep').value) || .5, .01, 600);
$('#shiftMinus').onclick = () => shiftAll(-shiftStep());
$('#shiftPlus').onclick = () => shiftAll(shiftStep());
$('#alignFirst').onclick = () => { const s = subsOnly().sort((x, y) => x.a - y.a)[0]; if (!s) return; const d = S.t - s.a; if (Math.abs(d) < .005) return; shiftAll(d); toast(T('tAligned')); };

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

/* transcription IA : Whisper dans un worker, avec une progression réelle à chaque étape */
const durTxt = s => s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s` : `${Math.max(1, Math.round(s))} s`;
function showProg(msg, frac, eta = '') {
  $('#progMsg').textContent = msg;
  $('#progBar').classList.toggle('ind', frac == null);
  $('#progFill').style.width = frac == null ? '' : clamp(frac, 0, 1) * 100 + '%';
  $('#progPct').textContent = frac == null ? '' : Math.round(clamp(frac, 0, 1) * 100) + ' %';
  $('#progEta').textContent = eta;
  openModal('#mProg');
}
let asrWorker = null, asrAbort = null;
async function decode16k(file) {
  showProg(T('progAudio'), 0);
  const buf = await readWithProgress(file, f => showProg(T('progAudio'), f));
  showProg(T('progDecode'), null);
  const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC({ sampleRate: 16000 });
  const audio = await ctx.decodeAudioData(buf); try { ctx.close(); } catch (e) {}
  const n = audio.numberOfChannels, len = audio.length, out = new Float32Array(len);
  for (let c = 0; c < n; c++) { const d = audio.getChannelData(c); for (let i = 0; i < len; i++) out[i] += d[i] / n; }
  return out;
}
function runWhisper(audio, model, lang) {
  return new Promise((resolve, reject) => {
    if (!asrWorker) asrWorker = new Worker('asr-worker.js', { type: 'module' });
    const w = asrWorker;
    let total = 1, done = 0, runAt = 0, lastAt = 0, tick = null;
    const finish = () => { clearInterval(tick); asrAbort = null; };
    const upd = () => {
      const now = performance.now(), avg = done ? (lastAt - runAt) / done : 0;
      const f = done >= total ? 1 : (done + (avg ? Math.min(.95, (now - lastAt) / avg) : 0)) / total;
      const left = avg ? Math.max(0, (total - done) * avg - (now - lastAt)) / 1000 : 0;
      showProg(T('progRun'), f, left ? T('progLeft', durTxt(left)) : '');
    };
    asrAbort = () => { finish(); w.terminate(); asrWorker = null; reject(Object.assign(new Error('cancel'), { cancel: true })); };
    w.onmessage = ({ data: m }) => {
      if (m.type === 'load') showProg(T('progLoad'), m.frac);
      else if (m.type === 'start') { total = m.total; runAt = lastAt = performance.now(); clearInterval(tick); tick = setInterval(upd, 250); upd(); }
      else if (m.type === 'chunk') { done = m.done; lastAt = performance.now(); upd(); }
      else if (m.type === 'done') { finish(); showProg(T('progRun'), 1); resolve(m.out); }
      else if (m.type === 'error') { finish(); reject(new Error(m.message)); }
    };
    w.onerror = e => { finish(); w.terminate(); asrWorker = null; reject(new Error(e.message || 'worker')); };
    showProg(T('progLoad'), null);
    w.postMessage({ type: 'run', model, lang, audio }, [audio.buffer]);
  });
}
$('#progCancel').onclick = () => { if (asrAbort) asrAbort(); else closeModal('#mProg'); };
function splitCaption(text, a, b, max = 42) {
  if (text.length <= max) return [{ a, b, text }];
  const parts = []; let line = '';
  for (const w of text.split(/\s+/)) { if (line && (line + ' ' + w).length > max) { parts.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) parts.push(line);
  let t = a; return parts.map(p => { const d = (b - a) * p.length / text.length, r = { a: t, b: Math.max(t + .2, t + d - .02), text: p }; t += d; return r; });
}
async function transcribeAI(model, lang) {
  const audio = await decode16k(S.file);
  const out = await runWhisper(audio, model, lang);
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
  const base = subsOnly()[0]?.st || DEF;
  const finish = (made, msg, err) => {
    snap(); if (S.isDemo) { S.items = []; S.isDemo = false; }
    S.items = (replace ? S.items.filter(i => i.kind !== 'sub') : S.items).concat(made); sortItems();
    S.sel = made[0]?.id || S.sel; if (made[0]) setT(made[0].a + .01); renderAll(); toast(msg, err);
  };
  if (useAI) {
    try {
      const caps = await transcribeAI(model, S.subLang.startsWith('fr') ? 'french' : 'english'); closeModal('#mProg');
      if (caps.length) { finish(caps.map(c => mkItem('sub', c.a, c.b, { text: c.text, st: { ...base } })), T('tDone', caps.length)); return; }
      toast(T('tAiEmpty'), true);
    } catch (err) {
      closeModal('#mProg');
      if (err.cancel) { toast(T('tAiCancel')); return; }
      console.warn('Transcription IA indisponible :', err); toast(T('tAiFail'), true);
    }
  }
  if (S.hasVideo && !S.peaks) { toast(T('tAnalyzing')); await analyzeAudio(S.file); }
  let ranges = detectSpeech(S.peaks, sens), fallback = false;
  if (!ranges.length) {
    fallback = true; ranges = [];
    for (let t = 0; t < S.duration - .5; t += 3) { const g = segAt(t + 1); if (!(g && g.off)) ranges.push({ a: t, b: Math.min(S.duration, t + 2.8) }); }
  }
  const texts = script ? distribute(script, ranges.length, ranges.map(r => r.b - r.a)) : [];
  finish(ranges.map((r, i) => mkItem('sub', r.a, r.b, { text: texts[i] || `${T('sub')} ${i + 1}`, st: { ...base } })), fallback ? T('tNoAudio') : T('tDone', ranges.length), fallback);
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
        const it = mkItem('sub', a, Math.min(b, S.duration), { text: txt, st: { ...(subsOnly()[0]?.st || DEF) } }); S.items.push(it); sortItems(); startT = S.t; S.sel = it.id; markDirty(); renderAll();
      }
    };
    rec.onerror = () => { toast(T('tSRErr'), true); stopDictation(); };
    rec.onend = () => { if (dict) { dict = null; } };
    dict = rec; rec.start(); toast(T('tDictOn')); play();
  } catch (e) { toast(T('tSRErr'), true); dict = null; }
}
function stopDictation() { if (dict) { try { dict.stop(); } catch (e) {} dict = null; toast(T('tDictOff')); } }

/* ---------- éléments sur la scène (plusieurs à la fois, superposés par piste) ---------- */
let stageU = 1, ovKey = '', prevShown = new Set();
const pool = new Map();
const ANIMS = ['anim-fade', 'anim-pop', 'anim-slide', 'anim-bounce'];
const activeItems = () => { if (segAt(S.t)?.off) return []; return S.items.filter(i => S.t >= i.a && S.t < i.b); };
function visibleItems() {
  const v = activeItems(), c = cur();
  if (!(S.playing || exporting) && c && !v.includes(c)) v.push(c);
  return v.sort((x, y) => x.track - y.track || x.a - y.a);
}
function applyStyle(el, inner, it, u) {
  const st = it.st, fs = st.size * u;
  el.style.left = st.x + '%'; el.style.top = st.y + '%';
  el.style.transform = `translate(-50%,-50%) rotate(${st.rot}deg) scale(${st.sx / 100 * (st.flipH ? -1 : 1)},${st.sy / 100 * (st.flipV ? -1 : 1)}) skewX(${st.skew}deg)`;
  el.style.opacity = st.op / 100;
  if (it.kind === 'image') { inner.style.height = fs + 'px'; return; }
  const k = st.shadow / 100;
  inner.style.fontFamily = `'${st.font}',sans-serif`; inner.style.fontSize = fs + 'px'; inner.style.fontWeight = st.weight; inner.style.fontStyle = st.italic ? 'italic' : 'normal';
  inner.style.color = st.color; inner.style.textAlign = st.align; inner.style.letterSpacing = (st.ls * u) + 'px'; inner.style.textTransform = st.upper ? 'uppercase' : 'none';
  inner.style.setProperty('-webkit-text-stroke', `${st.strokeW * u}px ${st.stroke}`);
  inner.style.background = st.bgOp > 0 ? rgba(st.bg, st.bgOp / 100) : 'transparent';
  inner.style.textShadow = k > 0 ? `0 ${fs * .05 * k}px ${fs * .22 * k}px ${st.shadowColor}, 0 0 ${fs * .1 * k}px ${st.shadowColor}` : 'none';
}
function makeEl(it) {
  const el = document.createElement('div'); el.className = 'sub'; el.dataset.id = it.id; el.dataset.kind = it.kind;
  if (it.kind === 'image') { const img = document.createElement('img'); img.className = 'sub-in'; img.draggable = false; img.alt = ''; el.appendChild(img); }
  else {
    const t = document.createElement('div'); t.className = 'sub-in'; el.appendChild(t);
    t.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); t.blur(); } if (e.key === 'Escape') t.blur(); e.stopPropagation(); });
    t.addEventListener('blur', () => {
      if (!t.isContentEditable) return; t.contentEditable = 'false';
      const x = byId(el.dataset.id); if (x) { snap(); x.text = t.innerText.replace(/\n$/, ''); S.rev++; renderList(); renderTLBlocks(); renderOverlay(true); }
    });
  }
  overlay.appendChild(el); pool.set(it.id, el); return el;
}
function renderOverlay(force) {
  const vis = visibleItems(), playing = S.playing || exporting;
  const key = vis.map(i => i.id).join(',') + ':' + S.rev + ':' + stageU + ':' + playing + ':' + S.sel;
  if (!force && key === ovKey) return; ovKey = key;
  const ids = new Set(vis.map(i => i.id));
  for (const [id, el] of pool) if (!ids.has(id) && !el.contains(document.activeElement)) { el.remove(); pool.delete(id); }
  vis.forEach((it, z) => {
    let el = pool.get(it.id);
    if (el && el.dataset.kind !== it.kind) { el.remove(); pool.delete(it.id); el = null; }
    el = el || makeEl(it);
    const inner = el.firstChild;
    if (it.kind === 'image') { const m = S.media[it.media]; if (m && inner.getAttribute('src') !== m.data) inner.src = m.data; }
    else if (!inner.isContentEditable) inner.textContent = it.text || '';
    applyStyle(el, inner, it, stageU);
    el.style.zIndex = 10 + z;
    el.classList.toggle('sel', !playing && it.id === S.sel);
    if (playing && !prevShown.has(it.id) && it.st.anim !== 'none') { inner.classList.remove(...ANIMS); void inner.offsetWidth; inner.classList.add('anim-' + it.st.anim); }
    else if (!playing) inner.classList.remove(...ANIMS);
  });
  prevShown = ids;
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

/* glisser un élément sur la scène, double-clic pour modifier un texte */
overlay.addEventListener('pointerdown', e => {
  const el = e.target.closest('.sub'); if (!el || exporting || el.firstChild.isContentEditable) return;
  const it = byId(el.dataset.id); if (!it) return;
  if (S.sel !== it.id) selectItem(it.id, { noSeek: true });
  snap(); const r = stage.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ox = it.st.x, oy = it.st.y;
  el.setPointerCapture(e.pointerId);
  const mv = ev => {
    let nx = clamp(ox + (ev.clientX - sx) / r.width * 100, 0, 100), ny = clamp(oy + (ev.clientY - sy) / r.height * 100, 0, 100);
    const gx = Math.abs(nx - 50) < 1.4, gy = Math.abs(ny - 50) < 1.4; if (gx) nx = 50; if (gy) ny = 50;
    $('#gv').classList.toggle('on', gx); $('#gh').classList.toggle('on', gy);
    it.st.x = nx; it.st.y = ny; S.rev++; renderOverlay(true); syncInsp();
  };
  const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); $('#gv').classList.remove('on'); $('#gh').classList.remove('on'); };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
});
overlay.addEventListener('dblclick', e => {
  const el = e.target.closest('.sub'); if (!el || el.dataset.kind === 'image') return;
  const t = el.firstChild;
  try { t.contentEditable = 'plaintext-only'; } catch (x) {} if (!t.isContentEditable) t.contentEditable = 'true';
  t.focus(); const rg = document.createRange(); rg.selectNodeContents(t); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
});

/* ---------- liste des éléments ---------- */
let listIds = new Set();
function renderList() {
  sortItems(); const list = $('#list'); $('#count').textContent = S.items.length;
  if (!S.items.length) { list.innerHTML = `<div class="empty"><b>${T('emptyT')}</b>${T('emptyD')}</div>`; listIds = new Set(); return; }
  const kName = { sub: T('kSub'), text: T('kText'), image: T('kImage') };
  list.innerHTML = S.items.map((s, i) => `
    <div class="li k-${s.kind}${s.id === S.sel ? ' sel' : ''}${listIds.has(s.id) ? '' : ' enter'}" data-id="${s.id}" style="animation-delay:${listIds.size ? 0 : Math.min(i, 12) * 40}ms">
      <div class="li-top"><span class="kind" title="${kName[s.kind]} · ${T('track')} ${s.track + 1}">${ico(KIND_ICO[s.kind])}</span>
        <input class="tin" data-f="a" value="${fmt(s.a)}" aria-label="Début"><span class="idx">→</span><input class="tin" data-f="b" value="${fmt(s.b)}" aria-label="Fin">
        <div class="li-act">
          ${s.kind !== 'image' ? `<button class="btn sm icon ghost" data-act="split" title="${T('cut')}">${ico('split')}</button>` : ''}
          <button class="btn sm icon ghost" data-act="dup">${ico('dup')}</button>
          <button class="btn sm icon ghost danger" data-act="del">${ico('trash')}</button>
        </div></div>
      ${s.kind === 'image' ? `<div class="li-img"><img src="${S.media[s.media]?.data || ''}" alt=""><span>${esc(S.media[s.media]?.name || '')}</span></div>` : `<textarea rows="2" data-f="text" aria-label="Texte">${esc(s.text)}</textarea>`}
    </div>`).join('');
  listIds = new Set(S.items.map(s => s.id));
}
$('#list').addEventListener('input', e => {
  const li = e.target.closest('.li'); if (!li || e.target.dataset.f !== 'text') return;
  const s = byId(li.dataset.id); snapSoft(); s.text = e.target.value; S.rev++; renderOverlay(true);
  const b = $(`.blk[data-id="${s.id}"] em`); if (b) b.textContent = s.text;
});
$('#list').addEventListener('change', e => {
  const li = e.target.closest('.li'); if (!li || !(e.target.dataset.f === 'a' || e.target.dataset.f === 'b')) return;
  const s = byId(li.dataset.id), v = parseT(e.target.value), f = e.target.dataset.f;
  if (v != null) { snap(); if (f === 'a') s.a = clamp(v, 0, s.b - .1); else s.b = clamp(v, s.a + .1, S.duration); }
  renderAll();
});
$('#list').addEventListener('click', e => {
  const li = e.target.closest('.li'); if (!li) return;
  const s = byId(li.dataset.id), act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'del') { deleteItem(s); return; }
  if (act === 'dup') { snap(); const d = { ...s, id: uid(), st: { ...s.st } }; d.a = s.b; d.b = Math.min(S.duration, s.b + (s.b - s.a)); if (d.b - d.a < .1) { d.a = s.a; d.b = s.b; d.track = firstFreeTrack(s.a, s.b, s.track); } S.items.push(d); sortItems(); S.sel = d.id; renderAll(); return; }
  if (act === 'split') { splitItem(s); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  selectItem(s.id);
});
$('#list').addEventListener('focusin', e => { const li = e.target.closest('.li'); if (li && li.dataset.id !== S.sel && e.target.tagName === 'TEXTAREA') selectItem(li.dataset.id); });
function deleteItem(s) { snap(); S.items = S.items.filter(x => x !== s); if (S.sel === s.id) S.sel = S.items[0]?.id || null; renderAll(); }
function selectItem(id, o = {}) {
  S.sel = id; const s = byId(id); S.rev++;
  $$('.li.sel').forEach(x => x.classList.remove('sel')); $$('.blk.sel').forEach(x => x.classList.remove('sel'));
  const li = $(`.li[data-id="${id}"]`); li?.classList.add('sel'); $(`.blk[data-id="${id}"]`)?.classList.add('sel');
  if (li && !o.noScroll) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (s && !o.noSeek && !S.playing) setT(s.a + .01);
  renderOverlay(true); syncInsp();
}
function splitItem(s, at) {
  const t = at ?? S.t; if (!(t > s.a + .15 && t < s.b - .15)) { toast(T('tCutNone')); return; }
  snap();
  const n = { ...s, id: uid(), st: { ...s.st }, a: t };
  if (s.kind !== 'image') { const w = s.text.split(/\s+/), k = Math.round(w.length * (t - s.a) / (s.b - s.a)); n.text = w.slice(k).join(' '); s.text = w.slice(0, k).join(' '); }
  s.b = t; S.items.push(n); sortItems(); renderAll(); toast(T('tSplitSub'));
}

/* ---------- inspecteur de style ---------- */
function buildInsp() {
  const R = (k, lab, min, max, step = 1, f = '') => `<div class="ctl"${f}><label for="c_${k}">${T(lab)}</label><div class="rr"><input id="c_${k}" type="range" data-k="${k}" min="${min}" max="${max}" step="${step}"><input class="num" type="number" data-k="${k}" min="${min}" max="${max}" step="${step}" aria-label="${T(lab)}"></div></div>`;
  const C = (k, lab) => `<div class="ctl"><label for="c_${k}">${T(lab)}</label><input id="c_${k}" type="color" data-k="${k}"></div>`;
  const TX = ' data-for="text"';
  $('#insp').innerHTML = `
    <div class="grp"><h4>${T('gItem')}</h4>
      <div class="ctl"${TX}><label for="c_kind">${T('kindLbl')}</label><select id="c_kind"><option value="sub">${T('kSub')}</option><option value="text">${T('kText')}</option></select></div>
      <div class="ctl track-ctl"><label>${T('trackLbl')}</label><div class="rr"><button class="btn sm icon" data-track="-1" aria-label="-">${ico('down')}</button><output id="trackO"></output><button class="btn sm icon" data-track="1" aria-label="+">${ico('up')}</button></div></div>
      <p class="hint" style="margin:0">${T('trackHint')}</p></div>
    <div class="grp hero"><h4>${T('gOpacity')}</h4>${R('op', 'opacity', 0, 100)}
      <label class="sw" style="margin:0"><input type="checkbox" id="applyAll"><i></i><span>${T('applyAll')}</span></label></div>
    <div class="grp"${TX}><h4>${T('presets')}</h4><div class="chips">${PRESETS.map((p, i) => `<button class="chip" data-preset="${i}">${p.n[LANG]}</button>`).join('')}</div></div>
    <div class="grp"${TX}><h4>${T('gText')}</h4>
      <div class="ctl"><label for="c_font">${T('font')}</label><select id="c_font" data-k="font">${FONTS.map(f => `<option value="${f}" style="font-family:'${f}'">${f}</option>`).join('')}</select></div>
      <div class="ctl"><label for="c_weight">${T('weight')}</label><select id="c_weight" data-k="weight" data-num="1">${[400, 500, 600, 700, 800, 900].map(w => `<option value="${w}">${w}</option>`).join('')}</select></div>
      <div class="btnrow" style="margin-bottom:9px">
        <button class="btn sm" data-tg="italic"><i>I</i>&nbsp;${T('italic')}</button><button class="btn sm" data-tg="upper">${T('upper')}</button></div>
      <div class="btnrow"><button class="btn sm icon" data-al="left" aria-label="Gauche">${ico('alignL')}</button><button class="btn sm icon" data-al="center" aria-label="Centre">${ico('alignC')}</button><button class="btn sm icon" data-al="right" aria-label="Droite">${ico('alignR')}</button></div></div>
    <div class="grp"${TX}><h4>${T('gColor')}</h4>
      ${C('color', 'color')}${C('stroke', 'stroke')}${R('strokeW', 'strokeW', 0, 24)}${C('bg', 'bg')}${R('bgOp', 'bgOp', 0, 100)}${R('shadow', 'shadow', 0, 100)}${C('shadowColor', 'shadowColor')}</div>
    <div class="grp"><h4>${T('gPos')}</h4>${R('size', 'size', 16, 900)}${R('x', 'posX', 0, 100, .5)}${R('y', 'posY', 0, 100, .5)}
      <div class="pad" id="pad"><button class="btn sm icon u" data-n="0,-1" aria-label="Haut">${ico('up')}</button><button class="btn sm icon l" data-n="-1,0" aria-label="Gauche">${ico('left')}</button><button class="btn sm icon c" data-n="c" aria-label="Centrer">${ico('center')}</button><button class="btn sm icon r" data-n="1,0" aria-label="Droite">${ico('right')}</button><button class="btn sm icon d" data-n="0,1" aria-label="Bas">${ico('down')}</button></div>
      <p class="hint" style="margin:10px 0 0">${T('centerHint')}</p></div>
    <div class="grp"><h4>${T('gShape')}</h4>${R('rot', 'rot', -180, 180)}${R('sx', 'sx', 20, 300)}${R('sy', 'sy', 10, 300)}${R('skew', 'skew', -45, 45)}${R('ls', 'ls', -5, 40, .5, TX)}
      <div class="btnrow"><button class="btn sm" data-tg="flipH">${ico('fliph')}${T('flipH')}</button><button class="btn sm" data-tg="flipV">${ico('flipv')}${T('flipV')}</button><button class="btn sm" id="resetShape">${ico('reset')}${T('reset')}</button></div></div>
    <div class="grp"><h4>${T('gAnim')}</h4>
      <div class="ctl" style="margin:0"><label for="c_anim">${T('anim')}</label><select id="c_anim" data-k="anim">${['none', 'fade', 'pop', 'slide', 'bounce'].map(a => `<option value="${a}">${T(a === 'none' ? 'aNone' : 'a' + a[0].toUpperCase() + a.slice(1))}</option>`).join('')}</select></div></div>`;
  $('#applyAll').checked = S.applyAll; syncInsp();
}
function syncInsp() {
  const s = cur(); $('#inspPanel').classList.toggle('disabled', !s); if (!s) return;
  $$('[data-for="text"]', $('#insp')).forEach(g => { g.hidden = !isText(s); });
  $$('[data-k]', $('#insp')).forEach(el => { if (document.activeElement === el) return; const v = s.st[el.dataset.k]; el.value = v; });
  $$('[data-tg]', $('#insp')).forEach(b => b.classList.toggle('on', !!s.st[b.dataset.tg]));
  $$('[data-al]', $('#insp')).forEach(b => b.classList.toggle('on', s.st.align === b.dataset.al));
  if (isText(s)) $('#c_kind').value = s.kind;
  $('#trackO').textContent = s.track + 1;
}
function setStyle(patch) {
  snapSoft(); targets().forEach(s => Object.assign(s.st, patch)); S.rev++; renderOverlay(true); syncInsp();
}
$('#insp').addEventListener('input', e => {
  const el = e.target.closest('[data-k]'); if (!el) return; let v = el.value;
  if (el.type === 'range' || el.type === 'number' || el.dataset.num) { v = parseFloat(v); if (isNaN(v)) return; }
  setStyle({ [el.dataset.k]: v });
});
$('#insp').addEventListener('change', e => {
  if (e.target.id === 'applyAll') S.applyAll = e.target.checked;
  if (e.target.id === 'c_kind') { const s = cur(); if (s && isText(s)) { snap(); s.kind = e.target.value; renderAll(); } }
});
$('#insp').addEventListener('click', e => {
  const tr = e.target.closest('[data-track]'); if (tr) { const s = cur(); if (s) { const n = Math.max(0, s.track + +tr.dataset.track); if (n !== s.track) { snap(); s.track = n; renderAll(); } } return; }
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

/* ---------- timeline à pistes ---------- */
const scrollEl = $('#tlScroll'), inner = $('#tlInner'), lanesEl = $('#lanes');
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
  $('#trkA').innerHTML = `<canvas class="wave" id="waveCv" width="${Math.min(4000, Math.max(200, Math.ceil(S.duration * S.zoom)))}" height="44" style="width:${px(S.duration)}px"></canvas>
    <div class="wave-status" id="waveStatus" hidden><span></span><div class="bar"><i></i></div></div>`;
  const n = nLanes();
  $('#tlLabels').innerHTML = `<div class="spacer"></div><div class="lbl" style="height:56px">${ico('film')}<span>${T('tVideo')}</span></div><div class="lbl" style="height:44px">${ico('wave')}<span>${T('tAudio')}</span></div><div style="margin-top:6px">`
    + Array.from({ length: n }, (_, i) => `<div class="lbl lane-lbl${i === n - 1 ? ' ghost' : ''}" style="height:${LANE_H}px">${ico(i === n - 1 ? 'plus' : 'layers')}<span>${i === n - 1 ? T('newTrack') : `${T('track')} ${i + 1}`}</span></div>`).join('') + '</div>';
  drawWave(); renderWaveStatus(); renderTLBlocks(); updRemoveLbl(); syncLabels();
}
function renderTLBlocks() {
  const n = nLanes();
  lanesEl.style.height = n * LANE_H + 'px';
  lanesEl.innerHTML = Array.from({ length: n }, (_, i) => `<div class="lane${i === n - 1 ? ' ghost' : ''}" data-lane="${i}" style="top:${i * LANE_H}px"></div>`).join('')
    + S.items.map(s => {
      const label = s.kind === 'image' ? `<img src="${S.media[s.media]?.data || ''}" alt=""><em>${esc(S.media[s.media]?.name || '')}</em>` : `${s.kind === 'text' ? ico('text') : ''}<em>${esc(s.text || '')}</em>`;
      return `<div class="blk k-${s.kind}${s.id === S.sel ? ' sel' : ''}${px(s.b - s.a) < 48 ? ' tiny' : ''}" data-id="${s.id}" style="left:${px(s.a)}px;width:${Math.max(8, px(s.b - s.a))}px;top:${s.track * LANE_H + 4}px"><div class="hd l"></div><span>${label}</span><div class="hd r"></div></div>`;
    }).join('');
  liveKey = '';
}
const syncLabels = () => { $('#tlLabels').style.transform = `translateY(${-scrollEl.scrollTop}px)`; };
scrollEl.addEventListener('scroll', syncLabels);
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
// déplacer (dans le temps et d'une piste à l'autre) ou étirer un élément
lanesEl.addEventListener('pointerdown', e => {
  const bl = e.target.closest('.blk'); if (!bl) { S.selSeg = null; return scrub(e); }
  const s = byId(bl.dataset.id); if (!s) return; e.preventDefault(); S.selSeg = null;
  const mode = e.target.classList.contains('hd') ? (e.target.classList.contains('l') ? 'l' : 'r') : 'm';
  if (S.sel !== s.id) selectItem(s.id, { noSeek: true });
  const x0 = e.clientX, y0 = e.clientY, a0 = s.a, b0 = s.b, tr0 = s.track, d = b0 - a0; let moved = false, did = false;
  const snapTo = [0, S.duration, S.t]; S.items.forEach(o => { if (o !== s) snapTo.push(o.a, o.b); }); S.segs.forEach(g => snapTo.push(g.a, g.b));
  const sn = v => { if (!S.snap) return v; let best = v, bd = 7 / S.zoom; snapTo.forEach(t => { if (Math.abs(t - v) < bd) { bd = Math.abs(t - v); best = t; } }); return best; };
  bl.setPointerCapture(e.pointerId);
  const mv = ev => {
    const dx = (ev.clientX - x0) / S.zoom; if (!moved && Math.abs(ev.clientX - x0) < 3 && Math.abs(ev.clientY - y0) < 3) return;
    moved = true; if (!did) { snap(); did = true; bl.classList.add('dragging'); }
    if (mode === 'm') {
      let a = sn(a0 + dx); const bEnd = sn(a0 + dx + d); if (bEnd !== a0 + dx + d && a === a0 + dx) a = bEnd - d; a = clamp(a, 0, S.duration - d); s.a = a; s.b = a + d;
      const lr = lanesEl.getBoundingClientRect(), tr = clamp(Math.floor((ev.clientY - lr.top) / LANE_H), 0, nLanes() - 1);
      if (Math.abs(ev.clientY - y0) > LANE_H / 3 || tr !== tr0) s.track = tr;
      bl.style.top = s.track * LANE_H + 4 + 'px';
      $$('.lane', lanesEl).forEach(l => l.classList.toggle('drop', +l.dataset.lane === s.track && s.track !== tr0));
    }
    else if (mode === 'l') s.a = clamp(sn(a0 + dx), 0, s.b - .1);
    else s.b = clamp(sn(b0 + dx), s.a + .1, S.duration);
    bl.style.left = px(s.a) + 'px'; bl.style.width = Math.max(8, px(s.b - s.a)) + 'px'; S.rev++;
    const li = $(`.li[data-id="${s.id}"]`); if (li) { $('[data-f="a"]', li).value = fmt(s.a); $('[data-f="b"]', li).value = fmt(s.b); }
  };
  const up = () => {
    bl.removeEventListener('pointermove', mv); bl.removeEventListener('pointerup', up); bl.removeEventListener('pointercancel', up);
    if (!moved) setT(s.a + .01);
    else { sortItems(); renderList(); renderTL(); syncInsp(); renderOverlay(true); }
  };
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
$('#tSplit').onclick = () => { const s = cur(); if (s && S.t > s.a + .15 && S.t < s.b - .15 && document.activeElement?.closest('#list')) splitItem(s); else splitVideo(); };
$('#tRemove').onclick = toggleSeg;
$('#tSnap').onclick = e => { S.snap = !S.snap; e.currentTarget.classList.toggle('on', S.snap); };
$('#tPlay').onclick = () => S.playing ? pause() : play();
$('#tStart').onclick = () => setT(0); $('#tEnd').onclick = () => setT(S.duration);
$('#undo').onclick = undo; $('#redo').onclick = redo;
$('#btnSave').onclick = () => saveProject();
$('#pname').addEventListener('input', () => { markDirty(); updTitle(); });

/* ---------- export texte (sous-titres uniquement) ---------- */
function exportList() {
  const out = [];
  subsOnly().sort((x, y) => x.a - y.a).forEach(s => S.segs.forEach(g => {
    if (g.off) return; const a = Math.max(s.a, g.a), b = Math.min(s.b, g.b); if (b - a > .05 && s.text.trim()) out.push({ a: remap(a), b: remap(b), text: s.text.trim() });
  }));
  return out.sort((x, y) => x.a - y.a);
}
const tc = (t, sep) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(r).padStart(3, '0')}`; };
function exportText(f) {
  const l = exportList();
  if (f === 'srt') return l.map((c, i) => `${i + 1}\n${tc(c.a, ',')} --> ${tc(c.b, ',')}\n${c.text}\n`).join('\n');
  return 'WEBVTT\n\n' + l.map((c, i) => `${i + 1}\n${tc(c.a, '.')} --> ${tc(c.b, '.')}\n${c.text}\n`).join('\n');
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
  const url = URL.createObjectURL(new Blob([$('#expOut').value], { type: 'text/plain;charset=utf-8' }));
  download(url, `${safeName($('#pname').value)}.${expF}`); setTimeout(() => URL.revokeObjectURL(url), 60000);
};

/* ---------- export vidéo : tous les éléments incrustés dans l'image ---------- */
const imgCache = new Map();
function getImg(id) {
  if (!imgCache.has(id)) { const im = new Image(); im.src = S.media[id]?.data || ''; imgCache.set(id, im); }
  return imgCache.get(id);
}
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
function placeItem(g, w, h, st, an) {
  g.translate(st.x / 100 * w, st.y / 100 * h); g.rotate(st.rot * Math.PI / 180);
  g.scale(st.sx / 100 * (st.flipH ? -1 : 1), st.sy / 100 * (st.flipV ? -1 : 1)); g.transform(1, 0, Math.tan(st.skew * Math.PI / 180), 1, 0, 0);
  g.globalAlpha = clamp(st.op / 100 * an.alpha, 0, 1);
}
function drawItem(g, w, h, it, t) {
  const st = it.st, u = h / 1080, an = animState(st, t - it.a);
  g.save();
  if (it.kind === 'image') {
    const im = getImg(it.media); if (!im.complete || !im.naturalWidth) { g.restore(); return; }
    const ih = st.size * u, iw = ih * im.naturalWidth / im.naturalHeight;
    placeItem(g, w, h, st, an); g.translate(0, an.dy * ih); g.scale(an.scale, an.scale);
    g.drawImage(im, -iw / 2, -ih / 2, iw, ih); g.restore(); return;
  }
  const fs = st.size * u, text = st.upper ? it.text.toUpperCase() : it.text;
  placeItem(g, w, h, st, an);
  g.font = `${st.italic ? 'italic ' : ''}${st.weight} ${fs}px '${st.font}',sans-serif`;
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
    await Promise.all([...new Set(S.items.filter(isText).map(s => s.st.font))].map(f => document.fonts.load(`700 40px "${f}"`).catch(() => {})));
    await Promise.all(S.items.filter(i => i.kind === 'image').map(i => getImg(i.media).decode().catch(() => {})));
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
      S.items.filter(i => t >= i.a && t < i.b).sort((x, y) => x.track - y.track || x.a - y.a).forEach(i => drawItem(g, W, H, i, t));
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
    const blob = new Blob(chunks, { type }), name = `${safeName($('#pname').value)}-clap.${ext}`;
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
$$('.modal-back:not(#mProg):not(#mAsk)').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) closeModal('#' + m.id); }));
$('#mAsk').addEventListener('pointerdown', e => { if (e.target === $('#mAsk')) answer('cancel'); });

$('#btnImport').onclick = () => openModal('#mImp');
$('#impClose').onclick = () => closeModal('#mImp');
$('#impPick').onclick = () => $('#file').click();
$('#impApply').onclick = async () => { const t = $('#impText').value.trim(); if (!t) { toast(T('tPasteFirst'), true); return; } if (await importText(t, T('pasted'))) { $('#impText').value = ''; closeModal('#mImp'); } };
$('#file').onchange = e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) { closeModal('#mImp'); handleFiles(f); } };
const wrap = $('#stageWrap'); let dragN = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
window.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); dragN++; wrap.classList.add('drag'); });
window.addEventListener('dragover', e => { e.preventDefault(); });
window.addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; wrap.classList.remove('drag'); } });
window.addEventListener('drop', e => {
  e.preventDefault(); dragN = 0; wrap.classList.remove('drag');
  const f = [...(e.dataTransfer?.files || [])]; if (!f.length || exporting) return;
  closeModal('#mImp');
  const proj = f.find(x => /\.clap$/i.test(x.name));
  if (proj && NATIVE?.pathForFile(proj)) openProject(NATIVE.pathForFile(proj)); else handleFiles(f);
});
window.addEventListener('paste', e => {
  if (S.view !== 'editor') return;
  const tag = e.target.tagName; if (tag === 'TEXTAREA' || tag === 'INPUT' || e.target.isContentEditable) return;
  const t = e.clipboardData?.getData('text'); if (t && (t.includes('-->') || /^\s*[\[{]/.test(t))) importText(t, T('pasted'));
});
$('#aspect').onchange = e => { S.aspect = e.target.value; markDirty(); layoutStage(); };

/* ---------- paramètres ---------- */
function buildSettings() {
  const sw = (k, lab, desc) => `<div class="set-row"><label for="s_${k}">${T(lab)}${desc ? `<small>${T(desc)}</small>` : ''}</label><label class="sw"><input type="checkbox" id="s_${k}" data-set="${k}"${SET[k] ? ' checked' : ''}><i></i></label></div>`;
  const seg = (k, lab, opts) => `<div class="set-row"><label>${T(lab)}</label><div class="seg-toggle" data-seg="${k}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(SET[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
  const swatches = (k, list) => `<div class="swatches" data-swatch="${k}">${list.map(c => `<button class="swatch${SET[k] === c ? ' on' : ''}" style="--c:${c}" data-v="${c}" aria-label="${c}"></button>`).join('')}<label class="swatch-custom" title="${SET[k]}"><input type="color" data-color="${k}" value="${SET[k]}"></label></div>`;
  $('#setBody').innerHTML = `
    <div class="set-sec"><h4>${T('sAppearance')}</h4>
      ${sw('glass', 'sGlass', 'sGlassD')}
      <div class="set-row"><label for="s_blur">${T('sBlur')}</label><div class="rr"><input type="range" id="s_blur" data-range="blur" min="0" max="60" value="${SET.blur}"${SET.glass ? '' : ' disabled'}><output class="num">${SET.blur}</output></div></div>
      ${seg('bg', 'sBg', [['halos', T('bgHalos')], ['gradient', T('bgGradient')], ['solid', T('bgSolid')], ['image', T('bgImage')]])}
      <div class="set-row"><label>${T('sBgColor')}</label>${swatches('bgColor', BG_COLORS)}</div>
      <div class="set-row"${SET.bg === 'image' ? '' : ' hidden'}><label>${T('sBgImg')}</label><div class="btnrow"><span class="bg-prev"></span><button class="btn sm" id="s_bgPick">${ico('image')}${T('sBgPick')}</button></div></div>
      <div class="set-row"${SET.bg === 'image' ? '' : ' hidden'}><label for="s_bgDim">${T('sBgDim')}</label><div class="rr"><input type="range" id="s_bgDim" data-range="bgDim" min="0" max="90" value="${SET.bgDim}"><output class="num">${SET.bgDim}</output></div></div>
      <div class="set-row"><label>${T('sAccent')}<small>${T('sAccentD')}</small></label>${swatches('accent', ACCENTS)}</div>
    </div>
    <div class="set-sec"><h4>${T('sInterface')}</h4>
      ${seg('scale', 'sScale', [[90, '90 %'], [100, '100 %'], [110, '110 %'], [125, '125 %']])}
      ${seg('motion', 'sMotion', [['full', T('mFull')], ['reduced', T('mReduced')]])}
      ${seg('lang', 'sLang', [['fr', 'Français'], ['en', 'English']])}
    </div>
    ${NATIVE ? `<div class="set-sec"><h4>${T('sApp')}</h4>${sw('autoUpdate', 'sAutoUpd', 'sAutoUpdD')}
      <div class="set-row"><label></label><div class="btnrow"><button class="btn sm" id="s_check">${T('sCheckNow')}</button><span class="ver" id="setVer"></span></div></div></div>` : ''}`;
  if (NATIVE) NATIVE.info().then(i => { const v = $('#setVer'); if (v) v.textContent = 'v' + i.version; }).catch(() => {});
}
function setSetting(k, v) {
  SET[k] = v; saveSettings();
  if (k === 'lang') { LANG = v; S.subLang = v === 'fr' ? 'fr-FR' : 'en-US'; applyLang(); }
  if (k === 'bg' && v === 'image' && !SET.bgImage) pickBackground();
  if (['glass', 'bg', 'lang'].includes(k)) buildSettings();
  else syncSettingsUI();
}
function syncSettingsUI() {
  $$('[data-seg]', $('#setBody')).forEach(g => $$('button', g).forEach(b => b.classList.toggle('on', String(SET[g.dataset.seg]) === b.dataset.v)));
  $$('[data-swatch]', $('#setBody')).forEach(g => $$('.swatch', g).forEach(b => b.classList.toggle('on', SET[g.dataset.swatch] === b.dataset.v)));
}
async function pickBackground() {
  if (NATIVE) { const p = await NATIVE.pickBackground(); if (!p) { if (!SET.bgImage) setSetting('bg', 'halos'); return; } SET.bgImage = p; SET.bgVer = Date.now(); saveSettings(); buildSettings(); }
  else $('#fileBg').click();
}
$('#fileBg').onchange = e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const fr = new FileReader(); fr.onload = () => { SET.bgImage = fr.result; if (!store.set('clap-settings', SET)) { SET.bgImage = ''; toast(T('tBgTooBig'), true); } applySettings(); buildSettings(); }; fr.readAsDataURL(f);
};
$('#setBody').addEventListener('click', e => {
  const sb = e.target.closest('[data-seg] button'); if (sb) { const k = sb.parentElement.dataset.seg, raw = sb.dataset.v; setSetting(k, k === 'scale' ? +raw : raw); return; }
  const sw = e.target.closest('.swatch'); if (sw) { setSetting(sw.parentElement.dataset.swatch, sw.dataset.v); return; }
  if (e.target.closest('#s_bgPick')) { pickBackground(); return; }
  if (e.target.closest('#s_check')) { updManual = true; toast(T('updChecking')); NATIVE.checkUpdates(); }
});
$('#setBody').addEventListener('input', e => {
  const r = e.target.closest('[data-range]'); if (r) { SET[r.dataset.range] = +r.value; r.nextElementSibling.textContent = r.value; saveSettings(); return; }
  const c = e.target.closest('[data-color]'); if (c) { SET[c.dataset.color] = c.value; saveSettings(); syncSettingsUI(); }
});
$('#setBody').addEventListener('change', e => { const c = e.target.closest('[data-set]'); if (c) setSetting(c.dataset.set, c.checked); });
const openSettings = () => { buildSettings(); openModal('#mSet'); };
$('#btnSettings').onclick = openSettings; $('#hSettings').onclick = openSettings;
$('#setClose').onclick = () => closeModal('#mSet');
$('#setReset').onclick = () => { const lang = SET.lang; Object.assign(SET, SET_DEF, { lang }); saveSettings(); buildSettings(); };

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
    $('.brand').appendChild(v); $('#homeVer').textContent = 'Clap Studio v' + i.version;
  }).catch(() => {});
  $('#updGo').onclick = async () => { if (await confirmDiscard()) { allowClose = true; NATIVE.installUpdate(); } };
  $('#updLater').onclick = () => { const b = $('#upd'); b.style.transition = 'opacity .5s, transform .5s'; b.style.opacity = '0'; b.style.transform = 'translateY(10px)'; setTimeout(() => { b.hidden = true; b.style.cssText = ''; }, 520); };
  $('#genDict').hidden = true; // la reconnaissance vocale du navigateur n'existe pas dans l'application de bureau
  if (SET.autoUpdate) setTimeout(() => NATIVE.checkUpdates(), 1500);
}
// fermeture avec des modifications non enregistrées (bouton ✕, Alt+F4, mise à jour…) :
// la fermeture est annulée puis on pose la question, comme Word ; dans le navigateur, sa propre alerte s'affiche
let allowClose = false, closing = false;
window.addEventListener('beforeunload', e => {
  if (!S.dirty || allowClose) return;
  e.preventDefault(); e.returnValue = '';
  if (!NATIVE || closing) return;
  closing = true;
  setTimeout(async () => { try { if (await confirmDiscard()) { allowClose = true; window.close(); } } finally { closing = false; } }, 0);
});

/* ---------- langue / onglets ---------- */
function applyLang() {
  document.documentElement.lang = LANG;
  $$('[data-i]').forEach(el => { el.textContent = T(el.dataset.i); });
  $('#genText').placeholder = LANG === 'fr' ? 'Bonjour à tous\nBienvenue sur ma chaîne…' : 'Hello everyone\nWelcome to my channel…';
  $('#impText').placeholder = '1\n00:00:01,000 --> 00:00:03,500\n' + (LANG === 'fr' ? 'Bonjour à tous' : 'Hello everyone');
  if (S.isDemo) { const txt = T('demo'); subsOnly().forEach((s, i) => { if (txt[i]) s.text = txt[i]; }); S.vname = T('tDemo'); S.rev++; }
  if (!S.hasVideo && !S.isDemo) S.vname = T('noVideo');
  buildInsp(); renderList(); renderTL(); updRemoveLbl(); layoutStage(); renderRecents(); updTitle();
  if (isOpen('#mExp')) showExport();
}
$$('.tab').forEach(t => t.addEventListener('click', () => { $$('.tab').forEach(x => x.classList.toggle('on', x === t)); $('#main').dataset.tab = t.dataset.tab; }));

function renderAll() { renderList(); renderTL(); renderOverlay(true); syncInsp(); layoutStage(); }

/* ---------- raccourcis ---------- */
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.key === 'Escape') {
    if (!$('#addMenu').hidden) { closeMenu(); return; }
    if (isOpen('#mAsk')) { answer('cancel'); return; }
    ['#mImp', '#mGen', '#mExp', '#mSet'].forEach(s => { if (isOpen(s)) closeModal(s); }); return;
  }
  if (isOpen('#mAsk') || isOpen('#mProg') || exporting) return;
  if (mod && k === 'o') { e.preventDefault(); openProject(); return; }
  if (mod && k === 'n') { e.preventDefault(); startProject('new'); return; }
  if (mod && e.key === ',') { e.preventDefault(); openSettings(); return; }
  if (S.view !== 'editor') return;
  if (mod && k === 's') { e.preventDefault(); saveProject(e.shiftKey); return; }
  if (mod && k === 'i') { e.preventDefault(); $('#file').click(); return; }
  if (mod && k === 'e') { e.preventDefault(); $('#btnExport').click(); return; }
  const tag = (e.target.tagName || '').toLowerCase(); if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
  if (isOpen('#mGen') || isOpen('#mExp') || isOpen('#mImp') || isOpen('#mSet')) return;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && k === 'y') { e.preventDefault(); redo(); }
  else if (e.key === ' ') { e.preventDefault(); S.playing ? pause() : play(); }
  else if (k === 's' && !mod) splitVideo();
  else if (k === 'n' && !mod) addAtHead('sub');
  else if (k === 't' && !mod) addAtHead('text');
  else if (e.key === 'Delete' || e.key === 'Backspace') { if (S.selSeg) toggleSeg(); else { const s = cur(); if (s) deleteItem(s); } }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); setT(S.t - (e.shiftKey ? 1 : 1 / 30)); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); setT(S.t + (e.shiftKey ? 1 : 1 / 30)); }
});

/* ---------- démarrage : on ouvre sur l'accueil ---------- */
applySettings();
hydrateIcons();
$('#tPlay').innerHTML = ico('play');
S.subLang = LANG === 'fr' ? 'fr-FR' : 'en-US';
resetProject(); applyLang(); showView('home');
requestAnimationFrame(frame);
})();
