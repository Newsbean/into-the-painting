import * as THREE from 'three';
import { rng, lerp } from './gl.js';

// Brush atlases for built surfaces. They carry the same three channels as the
// stroke atlases in strokes.js
//   R = value (0.5 neutral)   G = hue drift (0.5 neutral)   B = height of the paint
// but the "strokes" are laid the way a mason, a roofer or a paviour lays them:
// every block, tile and sett is its own loaded dab of paint.
//
// Use them with paintMaterial({ directed: 1 }) so courses run level along a wall
// and along the eaves of a roof whichever way the building is turned.
// The top of the canvas is "up" (up the wall, up the roof).

const px = (v, h, b) => `rgb(${Math.max(0, Math.min(255, v * 255)) | 0},${Math.max(0, Math.min(255, h * 255)) | 0},${Math.max(0, Math.min(255, b * 255)) | 0})`;

// lengths that add up to exactly `total`, so a row closes on itself
function spans(r, total, lo, hi) {
  const out = [];
  let sum = 0;
  while (sum < total) {
    const w = lerp(lo, hi, r());
    out.push(w);
    sum += w;
  }
  return out.map((w) => (w * total) / sum);
}

// coursed stone, or brick: hand-cut blocks, each one a few loaded strokes
function paintMasonry(ctx, size, r, o = {}) {
  const { courses = 16, lo = 70, hi = 190, joint = 5, bond = 0, wander = 2.2, round = 5, mortar = 0.2, vary = 0.3, marks = 3 } = o;
  ctx.fillStyle = px(mortar, 0.5, 0.06);
  ctx.fillRect(0, 0, size, size);
  const hs = spans(r, size, (size / courses) * 0.78, (size / courses) * 1.28);
  let y = 0;
  hs.forEach((ch, ci) => {
    const ws = spans(r, size, lo, hi);
    let x = bond ? (ci % 2) * bond + (r() - 0.5) * 8 + size : r() * hi;
    for (const bw of ws) {
      const v = 0.56 + (r() - 0.5) * 2 * vary * (0.55 + 0.45 * r());
      const h = r();
      const b = 0.52 + r() * 0.26;
      const jit = Array.from({ length: 8 }, () => (r() - 0.5) * 2 * wander);
      const mk = Array.from({ length: marks }, () => [r(), r(), 0.3 + r() * 0.6, (r() - 0.5) * 0.16, r()]);
      const bx = x % size;
      const top = y;
      const draw = () => {
        const x0 = bx + joint / 2,
          y0 = top + joint / 2,
          w = bw - joint,
          hh = ch - joint;
        const P = [
          [x0 + jit[0], y0 + jit[1]],
          [x0 + w + jit[2], y0 + jit[3]],
          [x0 + w + jit[4], y0 + hh + jit[5]],
          [x0 + jit[6], y0 + hh + jit[7]],
        ];
        const path = () => {
          ctx.beginPath();
          ctx.moveTo((P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2);
          for (let i = 1; i <= 4; i++) {
            const c = P[i % 4],
              d = P[(i + 1) % 4];
            ctx.arcTo(c[0], c[1], (c[0] + d[0]) / 2, (c[1] + d[1]) / 2, round);
          }
          ctx.closePath();
        };
        path();
        ctx.fillStyle = px(v, h, b);
        ctx.fill();
        ctx.save();
        path();
        ctx.clip();
        // lit upper edge, shaded lower edge: the block stands proud of its joint
        ctx.fillStyle = px(v + 0.1, h, b + 0.2);
        ctx.fillRect(x0 - 4, y0 - 4, w + 8, Math.max(3, hh * 0.16) + 4);
        ctx.fillStyle = px(v - 0.12, h, b - 0.14);
        ctx.fillRect(x0 - 4, y0 + hh * 0.82, w + 8, hh * 0.22 + 4);
        ctx.lineCap = 'round';
        for (const [mx, my, ml, dv, mb] of mk) {
          ctx.lineWidth = Math.max(3, hh * (0.14 + mb * 0.14));
          ctx.strokeStyle = px(v + dv, h + (mb - 0.5) * 0.12, b + 0.1 + mb * 0.25);
          const sx = x0 + mx * w * 0.7,
            sy = y0 + hh * (0.24 + my * 0.52);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + ml * w * 0.5, sy + (mb - 0.5) * 4);
          ctx.stroke();
        }
        ctx.restore();
      };
      for (const dx of [0, -size]) {
        if (bx + dx + bw < 0) continue;
        ctx.save();
        ctx.translate(dx, 0);
        draw();
        ctx.restore();
      }
      x += bw;
    }
    y += ch;
  });
}

// roof tiles in overlapping rows; scallop 1 = round fish-scale slates
function paintTiles(ctx, size, r, o = {}) {
  const { rows = 8, across = 16, scallop = 0.45, vary = 0.3, barrel = 1, seed = 1000 } = o;
  const rh = size / rows,
    tw = size / across;
  ctx.fillStyle = px(0.18, 0.5, 0.08);
  ctx.fillRect(0, 0, size, size);
  const row = (ri, dy) => {
    const y = ri * rh + dy;
    for (let c = -1; c <= across; c++) {
      const k = ((c % across) + across) % across;
      const rr = rng(seed + ri * 97 + k * 13); // the same tile each time it is drawn again for the wrap
      const v = 0.55 + (rr() - 0.5) * 2 * vary,
        h = rr(),
        b = 0.5 + rr() * 0.22;
      const x = c * tw + (ri % 2) * tw * 0.5 + (rr() - 0.5) * 3;
      const w = tw - 3,
        len = rh * 1.3;
      const rad = Math.min(w / 2, len * 0.9) * scallop;
      const streak = rr();
      const body = () => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + len - rad);
        ctx.arcTo(x + w, y + len, x + w / 2, y + len, rad);
        ctx.arcTo(x, y + len, x, y + len - rad, rad);
        ctx.closePath();
      };
      ctx.save();
      ctx.translate(0, Math.max(4, rh * 0.07)); // its shadow on the row below
      body();
      ctx.fillStyle = px(0.13, 0.5, 0.04);
      ctx.fill();
      ctx.restore();
      body();
      ctx.fillStyle = px(v, h, b);
      ctx.fill();
      ctx.save();
      body();
      ctx.clip();
      if (barrel) {
        // the barrel of a clay tile: light down the middle, dark at the sides
        ctx.fillStyle = px(v + 0.1 * barrel, h, b + 0.25);
        ctx.fillRect(x + w * 0.3, y, w * 0.34, len);
        ctx.fillStyle = px(v - 0.13 * barrel, h, b - 0.15);
        ctx.fillRect(x, y, w * 0.13, len);
        ctx.fillRect(x + w * 0.87, y, w * 0.13, len);
      } else {
        // a slate: one loaded stroke down its length
        ctx.fillStyle = px(v + (streak - 0.5) * 0.14, h, b + 0.2);
        ctx.fillRect(x + w * (0.15 + streak * 0.3), y, w * 0.3, len);
      }
      ctx.fillStyle = px(v + 0.17, h, b + 0.38); // the lip catches the light
      const lip = Math.max(4, rh * 0.1);
      ctx.fillRect(x, y + len - lip, w, lip);
      ctx.restore();
    }
  };
  // from the eaves up, each row lying over the one below; then the wrap of the lowest row over the top
  for (let ri = rows - 1; ri >= 0; ri--) row(ri, 0);
  row(rows - 1, -size);
}

// rounded setts, lit from the upper left
function paintCobbles(ctx, size, r, o = {}) {
  const { n = 14, vary = 0.3 } = o; // n even, so the half-step of alternate rows survives the wrap
  const cell = size / n;
  ctx.fillStyle = px(0.14, 0.5, 0.03);
  ctx.fillRect(0, 0, size, size);
  for (let j = -1; j <= n; j++)
    for (let i = -1; i <= n; i++) {
      const jj = ((j % n) + n) % n,
        ii = ((i % n) + n) % n;
      const rr = rng(77 + ii * 131 + jj * 17);
      const cx = (i + 0.5 + (rr() - 0.5) * 0.34 + (jj % 2) * 0.5) * cell;
      const cy = (j + 0.5 + (rr() - 0.5) * 0.3) * cell;
      const rx = cell * (0.41 + rr() * 0.1),
        ry = cell * (0.36 + rr() * 0.11),
        rot = (rr() - 0.5) * 1.1;
      const v = 0.56 + (rr() - 0.5) * 2 * vary,
        h = rr(),
        b = 0.5 + rr() * 0.2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      const gr = ctx.createRadialGradient(-rx * 0.3, -ry * 0.35, 1, 0, 0, Math.max(rx, ry) * 1.05);
      gr.addColorStop(0, px(v + 0.16, h, b + 0.42));
      gr.addColorStop(0.45, px(v, h, b + 0.1));
      gr.addColorStop(1, px(v - 0.16, h, b - 0.22));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.roundRect(-rx, -ry, rx * 2, ry * 2, Math.min(rx, ry) * 0.72);
      ctx.fill();
      ctx.restore();
    }
}

// boards with a long wandering grain, running up the canvas
function paintPlanks(ctx, size, r) {
  ctx.fillStyle = px(0.18, 0.5, 0.04);
  ctx.fillRect(0, 0, size, size);
  let x = 0;
  for (const w of spans(r, size, 84, 150)) {
    const v = 0.54 + (r() - 0.5) * 0.3,
      h = r(),
      b = 0.5 + r() * 0.2;
    ctx.fillStyle = px(v, h, b);
    ctx.fillRect(x + 3, 0, w - 6, size);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, 0, w - 6, size);
    ctx.clip();
    for (let k = 0; k < 9; k++) {
      const gx = x + 5 + r() * (w - 10);
      ctx.strokeStyle = px(v + (r() - 0.5) * 0.2, h, b + (r() - 0.3) * 0.4);
      ctx.lineWidth = 2 + r() * 5;
      const amp = r() * 5,
        ph = r() * 6.283,
        fq = 1 + ((r() * 3) | 0);
      ctx.beginPath();
      for (let yy = 0; yy <= size; yy += 32) {
        const gxx = gx + Math.sin((yy / size) * 6.283 * fq + ph) * amp;
        if (yy === 0) ctx.moveTo(gxx, yy);
        else ctx.lineTo(gxx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    x += w;
  }
}

// loose strokes dragged over the finished surface, so no block, tile or sett is a flat
// patch when you walk right up to it. dir = which way the brush mostly travels.
function glaze(ctx, size, r, { n = 900, alpha = 0.26, dir = 0, spread = 0.35, len = [30, 110], w = [5, 17] } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = r() * size,
      y = r() * size;
    const l = lerp(len[0], len[1], r()),
      ang = dir + (r() - 0.5) * 2 * spread;
    const dx = (Math.cos(ang) * l) / 2,
      dy = (Math.sin(ang) * l) / 2;
    ctx.strokeStyle = px(0.5 + (r() - 0.5) * 0.56, r(), 0.3 + r() * 0.65);
    ctx.lineWidth = lerp(w[0], w[1], r());
    for (const ox of [-size, 0, size])
      for (const oy of [-size, 0, size]) {
        if (x + ox < -l || x + ox > size + l || y + oy < -l || y + oy > size + l) continue;
        ctx.beginPath();
        ctx.moveTo(x + ox - dx, y + oy - dy);
        ctx.lineTo(x + ox + dx, y + oy + dy);
        ctx.stroke();
      }
  }
  ctx.restore();
}

export const BUILT = {
  // limestone in rough courses: farm and town walls
  masonry: (c, n, r) => (paintMasonry(c, n, r, { courses: 16, lo: 70, hi: 190 }), glaze(c, n, r, { n: 1000 })),
  // big dressed blocks: churches, quays, the town hall
  ashlar: (c, n, r) => (paintMasonry(c, n, r, { courses: 9, lo: 150, hi: 260, joint: 4, wander: 1.2, round: 3, vary: 0.2, marks: 4 }), glaze(c, n, r, { n: 800, alpha: 0.22 })),
  brick: (c, n, r) => (paintMasonry(c, n, r, { courses: 24, lo: 118, hi: 138, joint: 4, bond: 64, wander: 1.1, round: 2.5, vary: 0.24, marks: 2 }), glaze(c, n, r, { n: 900, alpha: 0.22, len: [24, 80], w: [4, 12] })),
  // clay tiles in rows, and round slates
  tiles: (c, n, r) => (paintTiles(c, n, r, { rows: 8, across: 16, scallop: 0.45, barrel: 1 }), glaze(c, n, r, { n: 800, alpha: 0.24, dir: Math.PI / 2, spread: 0.3 })),
  slate: (c, n, r) => (paintTiles(c, n, r, { rows: 10, across: 10, scallop: 1, barrel: 0, vary: 0.24, seed: 4000 }), glaze(c, n, r, { n: 900, alpha: 0.26, dir: Math.PI / 2, spread: 0.45 })),
  cobble: (c, n, r) => (paintCobbles(c, n, r, { n: 14 }), glaze(c, n, r, { n: 700, alpha: 0.2, spread: 3.2, len: [18, 60], w: [5, 14] })),
  plank: (c, n, r) => (paintPlanks(c, n, r), glaze(c, n, r, { n: 500, alpha: 0.2, dir: Math.PI / 2, spread: 0.12, len: [60, 200], w: [3, 9] })),
};

export function makeBuiltTexture(kind, renderer, size = 1024, seed = 71) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  BUILT[kind](ctx, size, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
