import * as THREE from 'three';
import { gridGeo, mix, jitter, xf } from '../../engine/build.js';
import { vnoise, clamp, lerp } from '../../engine/gl.js';
import { WARM, PETAL, VINE, BLOSSOM, FARM_WALL, FARM_ROOF } from './palette.js';

// ------------------------------------------------------------------
// The rest of Vincent. The land around the village is laid out with his
// other canvases: Arles, Saint-Rémy and Auvers within walking distance.
// Local helpers first; all of them are cheap in triangles.
// ------------------------------------------------------------------
const _cc = new Map();
const C = (h) => {
  if (h.isColor) return h;
  let c = _cc.get(h);
  if (!c) _cc.set(h, (c = new THREE.Color(h)));
  return c;
};

// loose triangles with a colour, glow and sway per corner: leaves, petals, rails.
// a corner is [x, y, z, sway, colour]
export class Raw {
  constructor() {
    this.p = [];
    this.c = [];
    this.d = [];
  }
  tri(a, b, c, col, em = 0) {
    for (const v of [a, b, c]) {
      const k = C(v[4] ?? col);
      this.p.push(v[0], v[1], v[2]);
      this.c.push(k.r, k.g, k.b);
      this.d.push(em, v[3] ?? 0, 0, 1);
    }
  }
  quad(a, b, c, d, col, em = 0) {
    this.tri(a, b, c, col, em);
    this.tri(a, c, d, col, em);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aData', new THREE.Float32BufferAttribute(this.d, 4));
    g.computeVertexNormals();
    return g;
  }
  mesh(material) {
    const m = new THREE.Mesh(this.geometry(), material);
    m.frustumCulled = false;
    return m;
  }
}

// a sheet of flat-coloured quads laid over the ground (plough furrows, strips, planks)
export function drape(H, cx, cz, ry, len, wid, colFn, { lift = 0.22, step = 2.4, cols = 2 } = {}) {
  const rows = Math.max(1, Math.round(len / step)),
    c = Math.cos(ry),
    s = Math.sin(ry);
  return gridGeo(
    rows,
    cols,
    (u, v) => {
      const lx = (v - 0.5) * wid,
        lz = (u - 0.5) * len;
      const x = cx + lx * c + lz * s,
        z = cz - lx * s + lz * c;
      return [x, H(x, z) + lift, z];
    },
    (u, v, i, j) => C(colFn(i, j))
  );
}

export function flowerHead(F, cx, cy, cz, yaw, tilt, r, sw, R, em = 0.3) {
  const ct = Math.cos(tilt),
    nx = Math.sin(yaw) * ct,
    ny = Math.sin(tilt),
    nz = Math.cos(yaw) * ct;
  const ux = Math.cos(yaw),
    uz = -Math.sin(yaw);
  const vx = ny * uz,
    vy = nz * ux - nx * uz,
    vz = -ny * ux;
  const at = (a, rad, f) => [cx + (ux * Math.cos(a) + vx * Math.sin(a)) * rad + nx * f, cy + vy * Math.sin(a) * rad + ny * f, cz + (uz * Math.cos(a) + vz * Math.sin(a)) * rad + nz * f, sw];
  const ph = R() * 6.283,
    c1 = PETAL[(R() * 5) | 0],
    c2 = PETAL[(R() * 5) | 0];
  const N = 12,
    ctr = [cx, cy, cz, sw];
  let prev = at(ph, r, 0.04);
  for (let i = 1; i <= N; i++) {
    const cur = at(ph + (i / N) * 6.283, r * (i % 2 ? 0.74 : 1), 0.04);
    F.tri(ctr, prev, cur, i % 2 ? c1 : c2, em);
    prev = cur;
  }
  const b = [cx + nx * 0.08, cy + ny * 0.08, cz + nz * 0.08, sw];
  prev = at(ph, r * 0.44, 0.06);
  for (let i = 1; i <= 6; i++) {
    const cur = at(ph + (i / 6) * 6.283, r * 0.44, 0.06);
    F.tri(b, prev, cur, i % 2 ? 0x5a3414 : 0x80501c);
    prev = cur;
  }
}
export function sunflower(F, x, y, z, h, yaw, r, R, em) {
  const tx = x + (R() - 0.5) * 0.3,
    tz = z + (R() - 0.5) * 0.3,
    ty = y + h,
    sw = 0.08 + h * 0.05,
    w = 0.05;
  F.quad([x - w, y, z, 0], [x + w, y, z, 0], [tx + w * 0.7, ty, tz, sw], [tx - w * 0.7, ty, tz, sw], 0x3f7a2e);
  F.quad([x, y, z - w, 0], [x, y, z + w, 0], [tx, ty, tz + w * 0.7, sw], [tx, ty, tz - w * 0.7, sw], 0x2f6428);
  for (let i = 0; i < 2; i++) {
    const a = yaw + 1.57 + i * 3.14 + (R() - 0.5),
      t = 0.3 + R() * 0.35,
      l = 0.45 + R() * 0.3;
    const bx = lerp(x, tx, t),
      by = y + h * t,
      bz = lerp(z, tz, t),
      dx = Math.cos(a),
      dz = Math.sin(a),
      s = sw * t;
    F.tri([bx, by, bz, s], [bx + dx * l - dz * 0.17, by + 0.12, bz + dz * l + dx * 0.17, s], [bx + dx * l * 0.9 + dz * 0.17, by - 0.14, bz + dz * l * 0.9 - dx * 0.17, s], i ? 0x347a36 : 0x2a6a40);
  }
  flowerHead(F, tx, ty, tz, yaw, 0.08 + R() * 0.38, r, sw, R, em);
}
// cut flowers in a jar
export function bouquet(F, B, x, y, z, R, { n = 6, r = 0.13, s = 1, vase = 0xd9b030 } = {}) {
  B.cyl(0.07 * s, 0.09 * s, 0.24 * s, vase, x, y, z, 6);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.283,
      d = (0.07 + R() * 0.17) * s,
      hy = y + (0.4 + R() * 0.32) * s;
    const hx = x + Math.cos(a) * d,
      hz = z + Math.sin(a) * d;
    F.tri([x - 0.014 * s, y + 0.22 * s, z], [x + 0.014 * s, y + 0.22 * s, z], [hx, hy, hz], 0x3f7a2e);
    flowerHead(F, hx, hy, hz, Math.atan2(Math.cos(a), Math.sin(a)), 0.45 + R() * 0.6, r * s * (0.8 + R() * 0.45), 0, R, 0.25);
  }
}
export function vine(F, x, y, z, R) {
  const h = 0.9 + R() * 0.5,
    r = 0.55 + R() * 0.3,
    n = 5,
    ph = R() * 6.283;
  const top = [x + (R() - 0.5) * 0.3, y + h, z + (R() - 0.5) * 0.3, 0.06];
  const ring = [];
  for (let i = 0; i < n; i++) {
    const a = ph + (i / n) * 6.283,
      rr = r * (0.65 + R() * 0.6);
    ring.push([x + Math.cos(a) * rr, y + 0.02 + R() * 0.1, z + Math.sin(a) * rr, 0.02, VINE[(R() * 6) | 0]]);
  }
  for (let i = 0; i < n; i++) F.tri(ring[i], ring[(i + 1) % n], top, VINE[(R() * 4) | 0]);
  F.tri([x - 0.05, y, z], [x + 0.05, y, z], [x, y + h * 0.7, z], 0x2a1c24);
}
// a slim cypress in a quarter of the triangles of the big ones
export function flame(F, x, y, z, h, r, R, dark = 0x0b1c1a, mid = 0x1c4a38) {
  const rings = 7,
    seg = 7,
    tw = R() * 6,
    pts = [];
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const prof = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - t * 0.25) + 0.02;
    const row = [];
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * 6.283 + t * 2.4 + tw;
      const rr = r * prof * (1 + (vnoise(s * 1.7 + tw, k * 0.9) - 0.5) * 0.6);
      row.push([x + Math.cos(a) * rr + Math.sin(t * 3 + tw) * r * 0.25 * t, y + t * h, z + Math.sin(a) * rr, t * t * 0.5, vnoise(s * 2.1 + tw, k * 1.3) > 0.5 ? mid : dark]);
    }
    pts.push(row);
  }
  for (let k = 0; k < rings; k++) for (let s = 0; s < seg; s++) F.quad(pts[k][s], pts[k + 1][s], pts[k + 1][(s + 1) % seg], pts[k][(s + 1) % seg], dark);
}
export function hedge(F, H, x0, z0, x1, z1, h, w, R, lo = 0x123628, hi = 0x2f6f48) {
  const len = Math.hypot(x1 - x0, z1 - z0),
    n = Math.max(2, Math.round(len / 2.6));
  const nx = (-(z1 - z0) / len) * w * 0.5,
    nz = ((x1 - x0) / len) * w * 0.5;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      x = lerp(x0, x1, t),
      z = lerp(z0, z1, t),
      y = H(x, z) - 0.2;
    const hh = h * (0.8 + R() * 0.45) * (i === 0 || i === n ? 0.35 : 1);
    const cur = [
      [x - nx, y, z - nz, 0, lo],
      [x - nx * 0.7, y + hh, z - nz * 0.7, 0.05, hi],
      [x + nx * 0.7, y + hh, z + nz * 0.7, 0.05, hi],
      [x + nx, y, z + nz, 0, lo],
    ];
    if (prev) for (let k = 0; k < 3; k++) F.quad(prev[k], cur[k], cur[k + 1], prev[k + 1], lo);
    prev = cur;
  }
}
// posts and two rails along a line of [x, z] points
export function fence(F, H, pts, R, col = 0x9a8d6c) {
  let prev = null;
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, az] = pts[s],
      [bx, bz] = pts[s + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2.7));
    for (let i = s ? 1 : 0; i <= n; i++) {
      const x = lerp(ax, bx, i / n),
        z = lerp(az, bz, i / n),
        y = H(x, z) - 0.1;
      const lx = (R() - 0.5) * 0.14,
        lz = (R() - 0.5) * 0.14,
        h = 1.2 + R() * 0.15;
      F.quad([x - 0.06, y, z], [x + 0.06, y, z], [x + 0.06 + lx, y + h, z + lz], [x - 0.06 + lx, y + h, z + lz], col);
      F.quad([x, y, z - 0.06], [x, y, z + 0.06], [x + lx, y + h, z + 0.06 + lz], [x + lx, y + h, z - 0.06 + lz], col);
      if (prev) for (const ry of [0.55, 0.98]) F.quad([prev[0], prev[1] + ry, prev[2]], [x, y + ry, z], [x, y + ry + 0.1, z], [prev[0], prev[1] + ry + 0.1, prev[2]], col);
      prev = [x, y, z];
    }
  }
}
export function haystack(B, x, y, z, r, h, R) {
  const c1 = jitter(0xd9a838, R, 0.08);
  B.cyl(r * 0.95, r, h * 0.55, (px, py) => mix(0xa87a26, c1, clamp(py / (h * 0.55) + 0.5)), x, y - 0.2, z, 9);
  B.cyl(r * 0.12, r * 1.08, h * 0.6, (px, py) => mix(c1, 0xf4d970, clamp(py / (h * 0.6) + 0.5)), x, y - 0.2 + h * 0.55, z, 9);
}
// rx, rz that point a cylinder along a unit vector
export const aim = (dx, dy, dz) => [Math.atan2(dz, dy), -Math.asin(clamp(dx, -1, 1))];
export function almond(T, F, x, y, z, R) {
  const bark = 0x34262e,
    th = 1.2 + R() * 0.5,
    ty = y + th - 0.1;
  T.cyl(0.12, 0.2, th + 0.2, bark, x, y - 0.2, z, 5);
  const n = 4 + ((R() * 2) | 0),
    a0 = R() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * 6.283 + (R() - 0.5) * 0.6,
      t = 0.55 + R() * 0.5,
      len = 1.7 + R() * 0.9;
    const dx = Math.sin(t) * Math.cos(a),
      dy = Math.cos(t),
      dz = Math.sin(t) * Math.sin(a);
    const [rx, rz] = aim(dx, dy, dz);
    T.cyl(0.035, 0.09, len, bark, x, ty, z, 4, undefined, undefined, rx, rz);
    for (const f of [0.5, 0.78, 1.02]) {
      const br = (0.34 + R() * 0.26) * (f > 1 ? 0.85 : 1),
        col = BLOSSOM[(R() * 4) | 0];
      T.ball(br, (px, py) => mix(0xf0b4ca, col, clamp((py / br) * 0.6 + 0.6)), x + dx * len * f + (R() - 0.5) * 0.3, ty + dy * len * f + (R() - 0.3) * 0.3, z + dz * len * f + (R() - 0.5) * 0.3, 1, 0.72, 1, 1, { emissive: 0.26, sway: 0.18 });
    }
  }
  // a few petals let go
  for (let i = 0; i < 8; i++) {
    const a = R() * 6.283,
      d = 0.4 + R() * 2.6;
    const px = x + Math.cos(a) * d,
      pz = z + Math.sin(a) * d,
      py = y + (i < 4 ? 0.22 : 0.6 + R() * 2.2);
    F.tri([px, py, pz, 0.1], [px + 0.15, py + 0.02, pz + 0.05, 0.1], [px + 0.04, py + 0.04, pz + 0.16, 0.1], BLOSSOM[i & 3], 0.2);
  }
}
// the rush-seated chair of the Bedroom and of Vincent's Chair
export function chair(B, x, y, z, ry, o = {}) {
  const s = o.s ?? 1,
    M = xf(x, y, z, ry, s, s, s),
    wood = o.wood ?? 0xe2a62a,
    d = o.data;
  B.box(0.46, 0.06, 0.44, o.seat ?? 0xb9b25a, 0, 0.44, 0, 0, d, M);
  if (o.simple) {
    B.box(0.42, 0.44, 0.04, wood, 0, 0, 0.19, 0, d, M);
    B.box(0.42, 0.95, 0.04, wood, 0, 0, -0.2, 0, d, M);
    return;
  }
  for (const lx of [-0.2, 0.2]) {
    B.box(0.05, 0.44, 0.05, wood, lx, 0, 0.19, 0, d, M);
    B.box(0.05, 0.98, 0.05, wood, lx, 0, -0.2, 0, d, M);
  }
  for (const ly of [0.6, 0.8]) B.box(0.38, 0.08, 0.03, wood, 0, ly, -0.2, 0, d, M);
  B.box(0.38, 0.03, 0.03, wood, 0, 0.2, 0.19, 0, d, M);
}
// a two-wheeled cart, shafts forward along +z, with or without the horse
export function cart(B, x, y, z, ry, o = {}) {
  const M = xf(x, y, z, ry);
  const body = o.body ?? 0xe0b83a,
    wheel = o.wheel ?? 0x9a5a2a;
  B.box(1.25, 0.45, 2.1, body, 0, 0.74, -0.9, 0, undefined, M);
  B.box(1.36, 0.07, 2.2, mix(body, 0x000000, 0.35), 0, 0.68, -0.9, 0, undefined, M);
  for (const sx of [-1, 1]) {
    B.cyl(0.66, 0.66, 0.08, wheel, sx * 0.74 + 0.04, 0.66, -0.9, 10, undefined, M, 0, Math.PI / 2);
    B.box(0.06, 0.07, 2.4, wheel, sx * 0.45, 0.84, 1.3, 0, undefined, M);
  }
  if (!o.horse) return;
  const hc = o.horseCol ?? 0xd8d2c4;
  B.ball(0.5, hc, 0, 1.2, 1.75, 0.7, 0.78, 1.7, 1, undefined, M);
  for (const sx of [-0.2, 0.2]) for (const lz of [1.15, 2.35]) B.cyl(0.075, 0.055, 0.98, hc, sx, 0, lz, 4, undefined, M);
  B.add(new THREE.BoxGeometry(0.26, 0.85, 0.36), hc, M.clone().multiply(xf(0, 1.72, 2.62, 0, 1, 1, 1, 0.75)));
  B.box(0.22, 0.26, 0.58, hc, 0, 1.86, 2.9, 0, undefined, M);
  B.cyl(0.03, 0.08, 0.7, mix(hc, 0x000000, 0.4), 0, 1.4, 0.92, 4, undefined, M, -2.7, 0);
}
// an open boat drawn up by its bow, in two-sided triangles so the inside shows
export function boat(F, x, y, z, ry, c1 = 0x1f4f6a, c2 = 0xd0683a) {
  const c = Math.cos(ry),
    s = Math.sin(ry),
    n = 7,
    L = 5.2;
  const Pt = (lx, ly, lz, col) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c, 0, col];
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      lz = (t - 0.5) * L;
    const w = Math.pow(Math.sin(Math.PI * (t * 0.92 + 0.04)), 0.7) * 0.85,
      top = 0.44 + (2 * t - 1) ** 2 * 0.3;
    const cur = [Pt(-w, top, lz, c2), Pt(-w * 0.6, 0.06, lz, c1), Pt(w * 0.6, 0.06, lz, c1), Pt(w, top, lz, c2)];
    if (prev) {
      F.quad(prev[0], cur[0], cur[1], prev[1], c1);
      F.quad(prev[1], cur[1], cur[2], prev[2], 0x6a5a48);
      F.quad(prev[2], cur[2], cur[3], prev[3], c1);
    }
    prev = cur;
  }
  for (const lz of [-0.9, 0.7]) F.quad(Pt(-0.72, 0.34, lz), Pt(0.72, 0.34, lz), Pt(0.72, 0.34, lz + 0.3), Pt(-0.72, 0.34, lz + 0.3), 0xb89a6a);
  F.quad(Pt(-0.05, 0.1, 0.45), Pt(0.05, 0.1, 0.45), Pt(0.03, 3.6, 0.45), Pt(-0.03, 3.6, 0.45), 0x6a4a2a);
  F.quad(Pt(0, 0.1, 0.4), Pt(0, 0.1, 0.5), Pt(0, 3.6, 0.48), Pt(0, 3.6, 0.42), 0x6a4a2a);
}
// a plain farmhouse: far cheaper than the village houses, but the windows are lit
export function farm(B, W, x, z, ry, R, o = {}) {
  const w = o.w ?? 7 + R() * 3.5,
    d = o.d ?? 5 + R() * 1.5,
    h = o.h ?? 3.2 + R() * 1.0,
    rh = o.roofH ?? 2 + R() * 1.0;
  const y = W.heightAt(x, z) - 0.6,
    H0 = h + 0.6;
  const M = xf(x, y, z, ry);
  const wall = o.wall ?? jitter(FARM_WALL[(R() * FARM_WALL.length) | 0], R, 0.08),
    roof = o.roof ?? jitter(FARM_ROOF[(R() * FARM_ROOF.length) | 0], R, 0.1),
    shut = o.shutters ?? [0x2f8a55, 0x2a4a9a, 0x8a2f2f][(R() * 3) | 0];
  B.box(w, H0, d, (px, py) => mix(wall, 0x10142a, clamp(0.3 - (py + H0 / 2) * 0.2, 0, 0.3)), 0, 0, 0, 0, undefined, M);
  B.gable(d + 0.9, w + 0.7, rh, roof, 0, H0, 0, Math.PI / 2, undefined, M);
  B.box(0.6, rh * 0.7 + 0.7, 0.6, mix(wall, 0x000000, 0.4), w * 0.3, H0 + rh * 0.25, 0, 0, undefined, M);
  B.box(1.0, 1.95, 0.1, shut, w * 0.06, 0.6, d / 2 + 0.02, 0, undefined, M);
  const cs = Math.cos(ry),
    sn = Math.sin(ry),
    wy = 0.6 + h * 0.36;
  const win = (lx, lz, side) => {
    const on = R() < (o.lit ?? 0.7),
      col = on ? WARM[(R() * 4) | 0] : 0x18203a,
      data = on ? { emissive: 1 } : undefined;
    if (side) {
      B.box(0.1, 1.05, 0.9, col, lx, wy, lz, 0, data, M);
      for (const k of [-1, 1]) B.box(0.08, 1.15, 0.3, shut, lx, wy - 0.05, lz + k * 0.62, 0, undefined, M);
    } else {
      B.box(0.9, 1.05, 0.1, col, lx, wy, lz, 0, data, M);
      for (const k of [-1, 1]) B.box(0.3, 1.15, 0.08, shut, lx + k * 0.62, wy - 0.05, lz, 0, undefined, M);
    }
    if (!on) return;
    const at = (o2) => {
      const ax = lx + (side ? Math.sign(lx) * o2 : 0),
        az = lz + (side ? 0 : Math.sign(lz) * o2);
      return [x + ax * cs + az * sn, z - ax * sn + az * cs];
    };
    const [gx, gz] = at(1.7),
      [px, pz] = at(0.25);
    W.maps.lamp(gx, gz, 4.5, col, 0.55);
    W.glows.push({ p: [px, y + wy + 0.55, pz], c: col, size: 1.5 });
  };
  win(-w * 0.32, d / 2 + 0.03, 0);
  win(w * 0.34, d / 2 + 0.03, 0);
  win(-w * 0.25, -d / 2 - 0.03, 0);
  win(w * 0.25, -d / 2 - 0.03, 0);
  win(-w / 2 - 0.03, 0, 1);
  win(w / 2 + 0.03, 0, 1);
  W.colliders.push({ x, z, hw: w / 2 + 0.2, hd: d / 2 + 0.2, ry, top: y + H0 + rh });
  W.maps.blob(x, z, Math.max(w, d) * 0.95, 0.4);
  return { w, d, top: y + H0 + rh };
}
