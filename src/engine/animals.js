// Farm animals for any world, drawn into a Soup: a horse, a cow (or an ox), a sheep.
// Each body is one skin drawn over rings set along a line from tail to nose, so a back
// runs into a neck and a neck into a head without a join; legs, ears, horns, mane and
// tail are added to it.
//
//   horse(S, { x, y, z, ry, coat, mane, graze, s })
//   cow(S, { x, y, z, ry, coat, graze, s, R })
//   sheep(S, { x, y, z, ry, wool, face, graze, s })
//
// They face local +z. `graze` puts the head down to the grass. The Soup must have no
// matrix set (set(null)): each animal places itself.
import * as THREE from 'three';
import { xf } from './build.js';
import { vnoise } from './gl.js';

const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const sat = (x) => Math.min(1, Math.max(0, x));

// the way the line runs at station i: [along z, along y]
function heading(st, i) {
  const a = st[Math.max(0, i - 1)],
    b = st[Math.min(st.length - 1, i + 1)];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
}
// the top of ring i (k = 1), or a point further out along the same line
const crest = (st, i, k = 1) => {
  const [tz, ty] = heading(st, i),
    s = st[i];
  return [0, s[1] + s[3] * k * tz, s[0] - s[3] * k * ty];
};
// stations [z, y, half-width, half-height] -> a closed skin with smooth normals, n points to a ring
function skin(st, n = 8) {
  const v = [],
    idx = [];
  st.forEach((s, i) => {
    const [tz, ty] = heading(st, i);
    // the ring stands square to the line: its own "up" is the line turned a quarter
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * 6.2832,
        up = Math.sin(ang) * s[3];
      v.push(Math.cos(ang) * s[2], s[1] + up * tz, s[0] - up * ty);
    }
  });
  for (let i = 0; i < st.length - 1; i++)
    for (let k = 0; k < n; k++) {
      const a = i * n + k,
        b = i * n + ((k + 1) % n),
        c = a + n,
        d = b + n;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function limb(S, a, b, r0, r1, col, M, seg = 5, o) {
  const va = new THREE.Vector3(...a),
    vb = new THREE.Vector3(...b),
    d = vb.clone().sub(va),
    L = d.length() || 0.001;
  const m = new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_up, d.normalize()), new THREE.Vector3(1, 1, 1));
  S.add(new THREE.CylinderGeometry(r1, r0, L, seg, 1, true), col, M.clone().multiply(m), o);
}
// four legs: front and hind at z = zf and zh, set wide by w; each bends once on its way down
function legs(S, M, { zf, zh, w, top, knee, r, col, low, hoof, kink = 0.1 }) {
  for (const [z, bend] of [[zf, 0.03], [zh, -kink]])
    for (const sx of [-1, 1]) {
      const k = [sx * w, knee, z + bend],
        f = [sx * w, 0.07, z + bend * 0.3];
      limb(S, [sx * w, top, z], k, r, r * 0.62, col, M);
      limb(S, k, f, r * 0.62, r * 0.48, low ?? col, M);
      limb(S, f, [sx * w, 0, z + bend * 0.3 + 0.02], r * 0.62, r * 0.66, hoof, M);
    }
}

// ---------------------------------------------------------------- horse
// The fjord horse: dun, thick in the neck, dark in the legs, its mane cut to stand up.
export function horse(S, o = {}) {
  const k = o.s ?? 1,
    M = xf(o.x ?? 0, o.y ?? 0, o.z ?? 0, o.ry ?? 0, k, k, k);
  const coat = new THREE.Color(o.coat ?? 0xc9a878),
    mane = o.mane ?? 0x2a2018;
  const neck = o.graze
    ? [[0.92, 1.42, 0.17, 0.28], [1.12, 1.12, 0.13, 0.21], [1.26, 0.8, 0.1, 0.15], [1.38, 0.5, 0.086, 0.12], [1.46, 0.24, 0.062, 0.085], [1.48, 0.15, 0.02, 0.03]]
    : [[0.92, 1.58, 0.17, 0.29], [1.08, 1.86, 0.135, 0.23], [1.2, 2.08, 0.105, 0.17], [1.38, 2.02, 0.092, 0.135], [1.58, 1.86, 0.068, 0.095], [1.64, 1.8, 0.02, 0.03]];
  const st = [[-1.02, 1.28, 0.02, 0.02], [-0.98, 1.3, 0.19, 0.23], [-0.72, 1.32, 0.32, 0.38], [-0.3, 1.22, 0.33, 0.39], [0.2, 1.19, 0.34, 0.42], [0.55, 1.25, 0.31, 0.43], [0.78, 1.36, 0.23, 0.38], ...neck];
  // lighter under the belly and at the muzzle
  const end = neck[neck.length - 1];
  S.add(skin(st), (x, y, z) => _c.copy(coat).multiplyScalar(0.78 + 0.3 * sat((y - 0.95) / 0.5) + 0.08 * vnoise(x * 5 + z * 3, y * 5)).lerp(_c2.set(0xe8dcc0), sat(1 - Math.hypot(z - end[0], y - end[1]) / 0.3) * 0.7), M);
  legs(S, M, { zf: 0.62, zh: -0.72, w: 0.18, top: 1.05, knee: 0.56, r: 0.125, col: coat.clone().multiplyScalar(0.82), low: coat.clone().multiplyScalar(0.42), hoof: 0x1c1814 });
  // the mane: a crest standing along the top of the neck
  S.set(M);
  for (let i = 6; i < 9; i++) {
    const a0 = crest(st, i, 0.9),
      a1 = crest(st, i, 1.45),
      b0 = crest(st, i + 1, 0.9),
      b1 = crest(st, i + 1, 1.45);
    for (const sx of [-1, 1]) {
      S.facing([sx * -9, a0[1], a0[2]]);
      S.quad([sx * 0.035, a0[1], a0[2]], [sx * 0.035, b0[1], b0[2]], [sx * 0.012, b1[1], b1[2]], [sx * 0.012, a1[1], a1[2]], mane, { sway: 0.1 });
    }
  }
  S.set(null).facing(null);
  // ears, and the tail
  const e = crest(st, 9, 0.9);
  for (const sx of [-1, 1]) S.add(new THREE.ConeGeometry(0.035, 0.13, 4), coat, M.clone().multiply(xf(sx * 0.06, e[1] + 0.04, e[2], 0, 1, 1, 1, o.graze ? 1.2 : 0.2, sx * -0.25)));
  limb(S, [0, 1.3, -1.0], [0, 0.55, -1.16], 0.07, 0.03, mane, M, 5, { sway: 0.25 });
}

// ---------------------------------------------------------------- cow
// Red cattle with white on them, deep in the body and short in the leg.
export function cow(S, o = {}) {
  const k = o.s ?? 1,
    M = xf(o.x ?? 0, o.y ?? 0, o.z ?? 0, o.ry ?? 0, k, k, k);
  const coat = new THREE.Color(o.coat ?? 0x8a3a22),
    sd = (o.R?.() ?? 0.5) * 40;
  const head = o.graze
    ? [[0.95, 1.08, 0.15, 0.2], [1.12, 0.8, 0.13, 0.17], [1.25, 0.5, 0.115, 0.14], [1.34, 0.27, 0.09, 0.1], [1.36, 0.19, 0.03, 0.04]]
    : [[0.95, 1.28, 0.15, 0.2], [1.12, 1.3, 0.13, 0.17], [1.3, 1.2, 0.115, 0.14], [1.46, 1.08, 0.09, 0.1], [1.5, 1.05, 0.03, 0.04]];
  const st = [[-0.95, 1.2, 0.02, 0.02], [-0.9, 1.22, 0.24, 0.3], [-0.55, 1.2, 0.34, 0.4], [0, 1.12, 0.37, 0.44], [0.5, 1.15, 0.33, 0.42], [0.78, 1.22, 0.22, 0.3], ...head];
  const hide = (x, y, z) => (vnoise(x * 2.2 + sd, z * 2.2 + y * 1.6 + sd) > 0.6 || (y < 0.78 && z < 0.8) ? _c.set(0xe8e0d0) : _c.copy(coat)).multiplyScalar(0.8 + 0.25 * sat((y - 0.8) / 0.5));
  S.add(skin(st), hide, M);
  legs(S, M, { zf: 0.55, zh: -0.62, w: 0.2, top: 0.9, knee: 0.42, r: 0.095, col: coat.clone().multiplyScalar(0.8), low: 0xd9d0c0, hoof: 0x1c1814, kink: 0.07 });
  // horns and ears at the back of the head, an udder, a tail with a tuft
  const p = crest(st, 7, 0.7);
  for (const sx of [-1, 1]) {
    limb(S, [sx * 0.09, p[1], p[2]], [sx * 0.24, p[1] + 0.13, p[2] + 0.03], 0.028, 0.008, 0xe8dcc0, M, 4);
    S.add(new THREE.ConeGeometry(0.05, 0.14, 4), coat, M.clone().multiply(xf(sx * 0.18, p[1] - 0.07, p[2] - 0.03, 0, 1, 1, 1, 0, sx * -1.3)));
  }
  S.add(new THREE.IcosahedronGeometry(0.15, 0), 0xe0b8a8, M.clone().multiply(xf(0, 0.72, -0.4, 0, 1, 0.8, 1.1)));
  limb(S, [0, 1.25, -0.93], [0, 0.5, -1.0], 0.025, 0.02, coat, M, 4, { sway: 0.2 });
  limb(S, [0, 0.5, -1.0], [0, 0.32, -1.0], 0.04, 0.02, 0x2a1c14, M, 4, { sway: 0.3 });
}

// ---------------------------------------------------------------- sheep
export function sheep(S, o = {}) {
  const k = o.s ?? 1,
    M = xf(o.x ?? 0, o.y ?? 0, o.z ?? 0, o.ry ?? 0, k, k, k);
  const wool = new THREE.Color(o.wool ?? 0xd9d0b8),
    dark = o.face ?? 0x2a2420;
  const head = o.graze ? [[0.46, 0.6, 0.1, 0.12], [0.56, 0.4, 0.075, 0.085], [0.62, 0.22, 0.055, 0.06], [0.63, 0.15, 0.02, 0.02]] : [[0.46, 0.72, 0.1, 0.12], [0.58, 0.78, 0.078, 0.088], [0.7, 0.72, 0.055, 0.06], [0.74, 0.7, 0.02, 0.02]];
  const st = [[-0.5, 0.62, 0.02, 0.02], [-0.46, 0.64, 0.2, 0.22], [-0.2, 0.66, 0.27, 0.27], [0.15, 0.66, 0.27, 0.27], [0.36, 0.68, 0.2, 0.22], ...head];
  const far = head[0][0] + 0.06;
  S.add(skin(st, 7), (x, y, z) => (z > far ? _c.set(dark) : _c.copy(wool).multiplyScalar(0.72 + 0.3 * sat((y - 0.45) / 0.4) + 0.12 * vnoise(x * 9 + z * 7, y * 9))), M);
  legs(S, M, { zf: 0.28, zh: -0.3, w: 0.12, top: 0.5, knee: 0.24, r: 0.042, col: dark, hoof: 0x14110f, kink: 0.04 });
  const p = crest(st, 6, 0.8);
  for (const sx of [-1, 1]) S.add(new THREE.ConeGeometry(0.03, 0.1, 3), dark, M.clone().multiply(xf(sx * 0.09, p[1], p[2] - 0.02, 0, 1, 1, 1, 0, sx * -1.4)));
}
