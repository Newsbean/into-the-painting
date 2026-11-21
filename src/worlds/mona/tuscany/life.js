// What lives in the valley: its people, and what grows there that grows nowhere else in
// this game (cypress, olive, the umbrella pine, the vine on its stake, poppies).
//
//   tuscanPerson(S, { x, y, z, ry, R, kind })     'man' | 'woman' | 'friar' | 'child', facing local +z
//   cypressGeo(R)  olivoGeo(R)  pinoGeo(R)  viteGeo(R)  fioreGeo(R)     one small geometry each,
//       a unit tall, to be drawn many times over (engine/scatter.js)
//   pagliaio(S, x, y, z, s)                        a haystack built round its pole
import * as THREE from 'three';
import { xf, mix } from '../../../engine/build.js';
import { Raw } from '../../../engine/scatter.js';

const pick = (R, a) => a[(R() * a.length) | 0];
const lathe = (pts, seg = 9) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const T = (x, y, z, rx = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz));
const unit = (x, y, z) => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

// ---------------------------------------------------------------- people
const TUNIC = lathe([[0.25, 0.62], [0.24, 0.7], [0.19, 1.02], [0.21, 1.2], [0.22, 1.34], [0.15, 1.44], [0.06, 1.49], [0.055, 1.55]]);
const GOWN = lathe([[0.3, 0], [0.31, 0.05], [0.25, 0.55], [0.17, 1.0], [0.16, 1.06], [0.2, 1.2], [0.21, 1.33], [0.15, 1.43], [0.06, 1.48], [0.055, 1.54]]);
const LEG = new THREE.CylinderGeometry(0.065, 0.055, 0.66, 6);
const ARM = new THREE.BoxGeometry(0.1, 0.5, 0.16);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const CAP = new THREE.CylinderGeometry(0.13, 0.125, 0.07, 9);
const MEN = [0x8a2f2a, 0x3a4a6a, 0x5a6a3a, 0x6a4a2a, 0xb8922a, 0x2a2a30, 0x7a3a4a];
const WOMEN = [0x8a3a3a, 0x3a5a4a, 0x6a4a6a, 0xb8863a, 0x4a5a7a, 0x7a5a3a];
const HOSE = [0x2a2a30, 0x6a2a24, 0x3a3a4a, 0x5a4a2a, 0x8a7a5a];
const SKIN = [0xe0b890, 0xd9a878, 0xe8c4a0];

export function tuscanPerson(S, o) {
  const R = o.R;
  const kind = o.kind ?? pick(R, ['man', 'woman', 'man', 'woman', 'friar', 'child']);
  const k = (kind === 'child' ? 0.64 : 0.94) + R() * 0.1;
  const prev = S.m;
  S.set(xf(o.x, o.y, o.z, o.ry ?? 0, k, k, k));
  const sw = { sway: 0.02 },
    skin = pick(R, SKIN);
  const robe = kind === 'woman' || kind === 'friar' || (kind === 'child' && R() < 0.5);
  const col = o.col ?? (kind === 'friar' ? 0x5a4030 : pick(R, robe ? WOMEN : MEN));
  if (robe) S.add(GOWN, col, null, sw);
  else {
    const hose = pick(R, HOSE);
    for (const sx of [-1, 1]) S.add(LEG, hose, T(sx * 0.085, 0.33, 0), sw);
    S.add(TUNIC, col, null, sw);
    S.add(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 9), 0x2a2018, T(0, 1.0, 0), sw); // the belt
  }
  for (const sx of [-1, 1]) S.add(ARM, col, new THREE.Matrix4().compose(new THREE.Vector3(sx * 0.24, 1.13, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08 - R() * 0.25, 0, sx * 0.1)), new THREE.Vector3(1, 1, 1)), sw);
  S.add(BALL, skin, T(0, 1.65, 0.005, 0, 0.1, 0.118, 0.102), sw);
  if (kind === 'friar') {
    S.add(BALL, 0x5a4030, T(0, 1.5, -0.07, 0.3, 0.17, 0.12, 0.16), sw); // the hood, thrown back
    S.add(BALL, 0x3a2a1c, T(0, 1.7, -0.02, 0, 0.108, 0.07, 0.11), sw);
  } else if (robe) {
    // a white veil over her hair
    S.add(BALL, pick(R, [0xe8e0d0, 0xd9d0bc, 0xf0e8d8]), T(0, 1.7, -0.03, -0.2, 0.118, 0.105, 0.13), sw);
    S.add(new THREE.ConeGeometry(0.16, 0.34, 8), 0xe0d8c8, T(0, 1.48, -0.08, 0.2), sw);
  } else {
    S.add(BALL, pick(R, [0x2a1c14, 0x4a3020, 0x6a4a2a]), T(0, 1.7, -0.02, 0, 0.11, 0.09, 0.118), sw);
    S.add(CAP, pick(R, MEN), T(0.01, 1.775, 0, 0.12), sw); // a flat cap
  }
  S.set(prev);
}

// ---------------------------------------------------------------- trees
// a round pole through stations [x, y, z, radius]
function pole(g, st, sides, col) {
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i],
      b = st[i + 1];
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * 6.2832,
        a1 = ((k + 1) / sides) * 6.2832,
        P = (s, ang) => [s[0] + Math.cos(ang) * s[3], s[1], s[2] + Math.sin(ang) * s[3], col, 0.02 * i, 0];
      g.quad(P(a, a0), P(a, a1), P(b, a1), P(b, a0), unit(Math.cos((a0 + a1) / 2), 0.12, Math.sin((a0 + a1) / 2)));
    }
  }
}
// one dab of foliage: a leaf-shaped stroke standing on its stalk end, leaning out along (ox, oz)
function dab(g, x, y, z, ox, oz, h, w, tip, sway) {
  const n = unit(ox, 0.7, oz),
    px = -oz * w,
    pz = ox * w;
  g.tri([x - px, y, z - pz, 0x0c1410, sway * 0.4, 0.45], [x + px, y, z + pz, 0x0c1410, sway * 0.4, 0.45], [x + ox * h * 0.35, y + h, z + oz * h * 0.35, tip, sway, 0.85], n);
}
// The cypress: a dark flame, a unit tall and a unit out at its widest (scale it [r, h, r]).
export function cypressGeo(R) {
  const g = new Raw();
  pole(g, [[0, 0, 0, 0.16], [0, 0.1, 0, 0.12]], 5, 0x2a2018);
  // the body of it: a spindle, so that no sky shows through
  const body = [[0.3, 0.06], [0.78, 0.2], [0.86, 0.36], [0.7, 0.56], [0.42, 0.76], [0.02, 0.98]];
  for (let i = 0; i < body.length - 1; i++)
    for (let k = 0; k < 7; k++) {
      const a0 = (k / 7) * 6.2832,
        a1 = ((k + 1) / 7) * 6.2832,
        [r0, y0] = body[i],
        [r1, y1] = body[i + 1],
        P = (r, y, a) => [Math.cos(a) * r, y, Math.sin(a) * r, 0x0c1410, 0.1 + y * 0.4, 0.55];
      g.quad(P(r0, y0, a0), P(r0, y0, a1), P(r1, y1, a1), P(r1, y1, a0), unit(Math.cos((a0 + a1) / 2), 0.25, Math.sin((a0 + a1) / 2)));
    }
  // and the flame of strokes over it
  for (let i = 0; i < 46; i++) {
    const t = i / 45,
      a = i * 2.4 + R() * 0.5,
      r = (0.3 + 0.62 * Math.sin(Math.PI * Math.pow(t, 0.6))) * (0.85 + 0.25 * R());
    dab(g, Math.cos(a) * r * 0.86, 0.05 + t * 0.74, Math.sin(a) * r * 0.86, Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0.17 + 0.06 * R(), 0.5 * (1 - t * 0.5), 0xffffff, 0.15 + 0.5 * t);
  }
  return g.geometry();
}
// The olive: a short trunk that has twisted for two hundred years, and a loose silver head.
export function olivoGeo(R) {
  const g = new Raw();
  const k1 = (R() - 0.5) * 0.2,
    k2 = (R() - 0.5) * 0.2;
  pole(g, [[0, 0, 0, 0.042], [k1 * 0.5, 0.16, k2 * 0.5, 0.034], [-k1 * 0.3, 0.32, -k2 * 0.5, 0.028], [k1 * 0.2, 0.48, k2 * 0.25, 0.018]], 5, 0x5a4e40);
  for (let i = 0; i < 84; i++) {
    const a = R() * 6.2832,
      e = R() * 1.5 - 0.3,
      r = 0.4 * (0.5 + 0.5 * R()),
      x = Math.cos(a) * Math.cos(e) * r * 1.3,
      z = Math.sin(a) * Math.cos(e) * r * 1.3,
      y = 0.62 + Math.sin(e) * r * 0.8;
    dab(g, x, y - 0.06, z, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.17 + 0.07 * R(), 0.1, i % 3 ? 0xffffff : 0xd9e0d0, 0.4);
  }
  return g.geometry();
}
// The umbrella pine: a bare trunk, red in the evening, and a flat dark cloud on top of it.
export function pinoGeo(R) {
  const g = new Raw();
  const lean = (R() - 0.5) * 0.12;
  pole(g, [[0, 0, 0, 0.05], [lean * 0.4, 0.4, 0, 0.04], [lean, 0.76, 0, 0.028]], 5, 0x7a4a34);
  for (let i = 0; i < 40; i++) {
    const a = R() * 6.2832,
      d = Math.sqrt(R()) * 0.42,
      x = lean + Math.cos(a) * d,
      z = Math.sin(a) * d,
      y = 0.8 + 0.12 * (1 - (d / 0.42) ** 2) + R() * 0.03;
    dab(g, x, y, z, Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.07 + 0.04 * R(), 0.09, 0xffffff, 0.3);
  }
  return g.geometry();
}
// A vine trained up its stake.
export function viteGeo(R) {
  const g = new Raw();
  pole(g, [[0, 0, 0, 0.022], [0, 1, 0, 0.016]], 4, 0x5a4a38);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.2 + R(),
      y = 0.25 + (i / 9) * 0.7;
    dab(g, Math.cos(a) * 0.1, y, Math.sin(a) * 0.1, Math.cos(a), Math.sin(a), 0.16, 0.13, 0xffffff, 0.3);
  }
  // a bunch of grapes or two
  for (const [x, y, z] of [[0.14, 0.42, 0.05], [-0.1, 0.56, -0.12]]) g.tri([x - 0.05, y, z, 0x4a2a5a, 0.2, 0], [x + 0.05, y, z, 0x4a2a5a, 0.2, 0], [x, y - 0.16, z, 0x2a1c3a, 0.2, 0], [0, 1, 0]);
  return g.geometry();
}
// five poppies (or whatever the instance colour makes them) on their stalks
export function fioreGeo(R) {
  const g = new Raw();
  for (let i = 0; i < 5; i++) {
    const a = R() * 6.2832,
      d = R() * 0.3,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      h = 0.3 + R() * 0.3,
      r = 0.08 + R() * 0.05;
    g.tri([x - 0.015, 0, z, 0x4f6a3a, 0, 0], [x + 0.015, 0, z, 0x4f6a3a, 0, 0], [x, h, z, 0x6f8a4a, 0.5, 0], [0, 1, 0]);
    for (let q = 0; q < 4; q++) {
      const a0 = (q / 4) * 6.2832,
        a1 = ((q + 1) / 4) * 6.2832;
      g.tri([x, h - r * 0.1, z, 0xffffff, 0.6, 1], [x + Math.cos(a0) * r, h + r * 0.6, z + Math.sin(a0) * r, 0xffffff, 0.6, 1], [x + Math.cos(a1) * r, h + r * 0.6, z + Math.sin(a1) * r, 0xffffff, 0.6, 1], [0, 1, 0]);
    }
  }
  return g.geometry();
}

// a haystack built round its pole, as they still are
export function pagliaio(S, x, y, z, s = 1) {
  const c = new THREE.Color();
  S.add(lathe([[0.02, 3.4], [0.5, 2.9], [1.25, 1.9], [1.5, 1.0], [1.35, 0.25], [1.1, 0]], 10), (px, py) => c.copy(mix(0x8a6a2a, 0xe0c060, Math.min(1, py / 3.2))), xf(x, y, z, 0, s, s, s), { sway: 0.03 });
  S.add(new THREE.CylinderGeometry(0.035, 0.05, 1.0, 5), 0x4a3a2a, xf(x, y + 3.7 * s, z, 0, s, s, s));
}
