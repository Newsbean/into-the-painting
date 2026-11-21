import * as THREE from 'three';
import { rng, lerp } from './gl.js';
import { BUILT, makeBuiltTexture } from './built.js';

// Brush-stroke atlases, painted once on a 2D canvas at boot.
//   R = value of the stroke (0.5 neutral)   -> lighter / darker dabs
//   G = hue variation        (0.5 neutral)  -> neighbouring strokes drift in hue
//   B = height of the paint                 -> impasto ridges + pencil hatching
// Strokes run along +U so materials can aim them.

const STYLES = {
  // long loaded-brush strokes: Van Gogh
  oil: { count: 2600, len: [70, 170], w: [11, 24], jitter: 0.32, curve: 10, vRange: 0.95, bristles: 5, blur: 0 },
  // short stubby dabs / cobbles
  dab: { count: 5200, len: [16, 44], w: [16, 30], jitter: 3.2, curve: 2, vRange: 0.9, bristles: 3, blur: 0 },
  // sinuous ribbons: Munch
  wavy: { count: 1500, len: [220, 460], w: [9, 20], jitter: 0.16, curve: 34, vRange: 0.9, bristles: 4, blur: 0 },
  // thin glazes, almost invisible handwork: Vermeer / Leonardo
  soft: { count: 1500, len: [60, 150], w: [34, 70], jitter: 1.2, curve: 8, vRange: 0.5, bristles: 2, blur: 5 },
  // woodblock: baren streaks and paper fibre
  wood: { count: 1700, len: [200, 520], w: [3, 9], jitter: 0.05, curve: 5, vRange: 0.4, bristles: 0, blur: 0.6 },
};

function drawStroke(ctx, S, r, size) {
  const x = r() * size,
    y = r() * size;
  const ang = (r() - 0.5) * 2 * S.jitter;
  const len = lerp(S.len[0], S.len[1], r());
  const w = lerp(S.w[0], S.w[1], r());
  const v = 0.5 + (r() - 0.5) * S.vRange;
  const h = r();
  const b = 0.3 + r() * 0.45;
  const cAmp = (r() - 0.5) * 2 * S.curve;
  const cFreq = 0.6 + r() * 1.6;
  const cPh = r() * 6.283;
  const dx = Math.cos(ang),
    dy = Math.sin(ang);
  const K = len > 160 ? 14 : 6;

  const path = (ox, oy, off) => {
    ctx.beginPath();
    for (let i = 0; i <= K; i++) {
      const t = i / K;
      const side = cAmp * Math.sin(t * Math.PI * cFreq + cPh) + off;
      const px = x + ox + dx * (t - 0.5) * len - dy * side;
      const py = y + oy + dy * (t - 0.5) * len + dx * side;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };
  const rgb = (rv, gv, bv) =>
    `rgb(${Math.max(0, Math.min(255, rv * 255)) | 0},${(gv * 255) | 0},${Math.max(0, Math.min(255, bv * 255)) | 0})`;

  // bristle offsets are fixed per stroke so every wrapped copy matches
  const br = [];
  for (let i = 0; i < S.bristles; i++) br.push([(r() - 0.5) * w * 0.62, (r() - 0.5) * 0.22, r() * 0.42]);

  const reach = len * 0.5 + w + Math.abs(cAmp);
  for (let ox = -size; ox <= size; ox += size) {
    if (x + ox + reach < 0 || x + ox - reach > size) continue;
    for (let oy = -size; oy <= size; oy += size) {
      if (y + oy + reach < 0 || y + oy - reach > size) continue;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // dark thin rim -> strokes separate from their neighbours
      ctx.lineWidth = w;
      ctx.strokeStyle = rgb(v - 0.16, h, b * 0.35);
      path(ox, oy, 0);
      ctx.lineWidth = w * 0.76;
      ctx.strokeStyle = rgb(v, h, b);
      path(ox, oy, 0);
      for (const [off, dv, db] of br) {
        ctx.lineWidth = Math.max(1, w * 0.13);
        ctx.strokeStyle = rgb(v + dv, h, b + db);
        path(ox, oy, off);
      }
    }
  }
}

// Soften a finished sheet: one blur of the whole of it, wrapped round its edges so that it
// still tiles. (Blurring each stroke as it is drawn comes to the same picture and takes a
// hundred times as long: six thousand filtered strokes were, for a while, most of the time
// the game took to open, and minutes in a browser without a graphics card.)
function soften(c, ctx, px) {
  const size = c.width,
    m = Math.ceil(px * 3) + 2,
    big = document.createElement('canvas');
  big.width = big.height = size + m * 2;
  const b = big.getContext('2d');
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) b.drawImage(c, m + ox, m + oy);
  ctx.filter = `blur(${px}px)`;
  ctx.drawImage(big, -m, -m);
  ctx.filter = 'none';
}

export function makeStrokeTexture(style, renderer, size = 1024, seed = 11) {
  const S = STYLES[style];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,110)';
  ctx.fillRect(0, 0, size, size);
  const r = rng(seed);
  for (let i = 0; i < S.count; i++) drawStroke(ctx, S, r, size);
  if (S.blur) soften(c, ctx, S.blur);

  if (style === 'soft' || style === 'wood') {
    // canvas weave / paper tooth lives in the height channel only
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const weave =
          style === 'soft'
            ? (Math.sin(x * 1.57) * Math.sin(y * 1.57) * 0.5 + 0.5) * 60
            : (r() - 0.5) * 70 + Math.sin(y * 0.9 + Math.sin(x * 0.02) * 3) * 22;
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * 0.75 + weave));
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

// Every atlas is painted the first time something asks for it, so a world only
// pays for the brushes it uses. The built-surface atlases (masonry, ashlar,
// brick, tiles, slate, cobble, plank) come from built.js.
let cache = null;
export function strokeSet(renderer) {
  if (cache) return cache;
  cache = {};
  const lazy = (key, make) =>
    Object.defineProperty(cache, key, {
      configurable: true,
      enumerable: true,
      get() {
        const t = make();
        Object.defineProperty(cache, key, { value: t, enumerable: true });
        return t;
      },
    });
  lazy('oil', () => makeStrokeTexture('oil', renderer, 1024, 11));
  lazy('dab', () => makeStrokeTexture('dab', renderer, 1024, 23));
  lazy('wavy', () => makeStrokeTexture('wavy', renderer, 1024, 37));
  lazy('soft', () => makeStrokeTexture('soft', renderer, 1024, 41));
  lazy('wood', () => makeStrokeTexture('wood', renderer, 1024, 53));
  Object.keys(BUILT).forEach((k, i) => lazy(k, () => makeBuiltTexture(k, renderer, 1024, 71 + i * 12)));
  return cache;
}
