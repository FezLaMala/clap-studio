// Génère build/icon.png (512×512) et build/icon.ico (16 à 256 px) : clap blanc sur carré arrondi noir. Aucune dépendance.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const inRound = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const rot = (x, y, ox, oy, a) => { const c = Math.cos(a), s = Math.sin(a); x -= ox; y -= oy; return [ox + x * c - y * s, oy + x * s + y * c]; };

// couleur d'un point (u, v dans [0,1]) : [r, g, b, a]
function sample(u, v) {
  if (!inRound(u, v, .03, .03, .97, .97, .2)) return null;
  const k = 1 - v * .6;
  let col = [26 * k + 8, 26 * k + 8, 29 * k + 9];
  // reflet en haut à gauche
  const hl = Math.max(0, 1 - Math.hypot(u - .15, v - .1) / .7) * 14; col = col.map(c => c + hl);
  // corps du clap
  if (inRound(u, v, .2, .44, .8, .8, .045)) {
    const g = 238 - (v - .44) * 120; col = [g, g, g + 2];
    if (v > .53 && v < .545 && u > .27 && u < .73) col = [150, 150, 154];
  }
  // claquette inclinée avec bandes
  const [ru, rv] = rot(u, v, .2, .4, .2);
  if (inRound(ru, rv, .2, .27, .8, .38, .03)) {
    const stripe = Math.floor((ru - rv * .9) * 9) % 2 === 0;
    col = stripe ? [244, 244, 245] : [24, 24, 26];
  }
  return [...col, 255];
}

// rendu RGBA N×N avec suréchantillonnage (plus fin pour les petites tailles)
function render(N) {
  const SS = N <= 64 ? 8 : 4, px = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
      const c = sample((x + (i + .5) / SS) / N, (y + (j + .5) / SS) / N);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a += 1; }
    }
    const o = (y * N + x) * 4, cl = v => Math.max(0, Math.min(255, Math.round(v)));
    if (a) { px[o] = cl(r / a); px[o + 1] = cl(g / a); px[o + 2] = cl(b / a); }
    px[o + 3] = cl(a / (SS * SS) * 255);
  }
  return px;
}

// encodage PNG
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
function png(N) {
  const px = render(N), raw = Buffer.alloc(N * (N * 4 + 1));
  for (let y = 0; y < N; y++) Buffer.from(px.buffer, y * N * 4, N * 4).copy(raw, y * (N * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ICO : chaque taille est stockée en PNG (pris en charge depuis Windows Vista)
function ico(sizes) {
  const imgs = sizes.map(png), head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head[e] = s >= 256 ? 0 : s; head[e + 1] = s >= 256 ? 0 : s; head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12); off += imgs[i].length;
  });
  return Buffer.concat([head, ...imgs]);
}

const dir = path.join(__dirname, '..', 'build');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.png'), png(512));
fs.writeFileSync(path.join(dir, 'icon.ico'), ico([16, 24, 32, 48, 64, 128, 256]));
console.log('Icônes écrites dans', dir);
