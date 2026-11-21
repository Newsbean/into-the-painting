// The people of Delft, about 1660: burghers in black under broad hats, their wives in
// jackets of yellow or blue with a white cap, maids with a pail or a basket, boys.
//
//   delftPerson(S, { x, y, z, ry, R, kind })     drawn into a Soup, facing local +z
//   delftCrowd(world, traces, streets, soupAt, R, n)   standing about in the streets, in ones and twos
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { along } from '../../../engine/plan.js';

const pick = (R, a) => a[(R() * a.length) | 0];
const lathe = (pts, seg = 9) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const T = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

const SKIRT = lathe([[0.31, 0], [0.33, 0.06], [0.3, 0.4], [0.21, 0.9], [0.165, 1.0]]);
const BODICE = lathe([[0.168, 0.98], [0.2, 1.12], [0.215, 1.3], [0.17, 1.42], [0.06, 1.47], [0.055, 1.53]]);
const COAT = lathe([[0.25, 0.5], [0.26, 0.58], [0.21, 1.0], [0.22, 1.2], [0.235, 1.33], [0.17, 1.44], [0.06, 1.49], [0.055, 1.55]]);
const BREECHES = lathe([[0.1, 0.42], [0.19, 0.5], [0.2, 0.62], [0.17, 0.72]], 7);
const LEG = new THREE.CylinderGeometry(0.055, 0.045, 0.46, 6);
const SHOE = new THREE.BoxGeometry(0.1, 0.07, 0.24);
const SLEEVE = new THREE.BoxGeometry(0.11, 0.44, 0.2);
const HEAD = new THREE.IcosahedronGeometry(0.105, 1);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const BRIM = new THREE.CylinderGeometry(0.29, 0.29, 0.025, 12);
const CROWN = new THREE.CylinderGeometry(0.1, 0.13, 0.17, 10);
const COLLAR = new THREE.CylinderGeometry(0.17, 0.2, 0.05, 10);
const PAIL = new THREE.CylinderGeometry(0.15, 0.12, 0.26, 9);

const BLACKS = [0x1c1c22, 0x26221e, 0x2a2a30, 0x3a3028, 0x22262e];
const SKIRTS = [0x7a2f2a, 0x24405a, 0x5a4a3a, 0x3a4a3a, 0x8a5a2a, 0x4a3a4a, 0x2a3a4a];
const JACKETS = [0xd9b84a, 0x3f5f8a, 0x8a3a2a, 0xc9a04a, 0x4a6a5a, 0x2a2a30, 0x9a7a4a, 0x5a7aa0];
const SKIN = [0xe8c9a4, 0xdcb890, 0xf0d4b0];
const WHITE = 0xf1ebdc;

export function delftPerson(S, o) {
  const R = o.R;
  const kind = o.kind ?? pick(R, ['burgher', 'woman', 'woman', 'maid', 'burgher', 'boy']);
  const k = (kind === 'boy' ? 0.68 : 0.93) + R() * 0.1;
  const prev = S.m;
  S.set(xf(o.x, o.y, o.z, o.ry ?? 0, k, k, k));
  const skin = pick(R, SKIN),
    sway = { sway: 0.02 };
  const man = kind === 'burgher' || kind === 'boy';
  let top;
  if (man) {
    top = pick(R, kind === 'boy' ? [0x5a4a3a, 0x3f5f8a, 0x4a3a2a, 0x6a5a4a] : BLACKS);
    const hose = pick(R, [0x2a2a30, 0x4a4038, 0x6a6258, 0x1c1c22]);
    for (const sx of [-1, 1]) {
      S.add(LEG, hose, T(sx * 0.09, 0.26, 0), sway);
      S.add(SHOE, 0x1c1814, T(sx * 0.09, 0.035, 0.05), sway);
    }
    S.add(BREECHES, pick(R, BLACKS), null, sway);
    S.add(COAT, top, null, sway);
    S.add(COLLAR, WHITE, T(0, 1.45, 0.01), sway); // the falling band
  } else {
    top = pick(R, kind === 'maid' ? [0x5a4a3a, 0x7a5a3a, 0x4a5a6a, 0x8a6a4a] : JACKETS);
    S.add(SKIRT, pick(R, SKIRTS), null, sway);
    S.add(BODICE, top, null, sway);
    // an apron, and a kerchief over the shoulders
    if (kind === 'maid' || R() < 0.55) S.add(new THREE.BoxGeometry(0.34, 0.7, 0.03), kind === 'maid' && R() < 0.5 ? 0x4a6a9a : WHITE, T(0, 0.6, 0.265, -0.13), sway);
    S.add(new THREE.ConeGeometry(0.215, 0.13, 10), WHITE, T(0, 1.4, 0), sway);
  }
  const reach = kind === 'maid' ? -0.5 : -0.1 - R() * 0.25;
  for (const sx of [-1, 1]) S.add(SLEEVE, top, T(sx * 0.25, 1.15, 0.03, reach, 0, sx * 0.13), sway);
  S.add(HEAD, skin, T(0, 1.65, 0.005, 0, 0, 0, 1, 1.1, 1), sway);
  if (kind === 'burgher') {
    // the tall hat with its broad brim
    S.add(BRIM, 0x18181c, T(0, 1.745, 0), sway);
    S.add(CROWN, 0x18181c, T(0, 1.84, 0), sway);
    S.add(BALL, pick(R, [0x3a2a1e, 0x5a4a3a, 0x8a7a6a, 0x2a2018]), T(0, 1.63, -0.03, 0, 0, 0, 0.12, 0.1, 0.12), sway); // hair to the collar
  } else if (kind === 'boy') S.add(BALL, pick(R, [0x5a4030, 0x8a6a44, 0x3a2a1e]), T(0, 1.69, -0.015, 0, 0, 0, 0.113, 0.085, 0.118), sway);
  else {
    // the linen cap, close to the head and standing out at the sides
    S.add(BALL, WHITE, T(0, 1.685, -0.02, 0, 0, 0, 0.122, 0.105, 0.128), sway);
    S.add(BALL, WHITE, T(0, 1.6, -0.06, 0, 0, 0, 0.14, 0.06, 0.08), sway);
  }
  if (kind === 'maid') {
    if (R() < 0.5) {
      S.add(PAIL, pick(R, [0x8a6a44, 0xb8a078, 0x7a8a8a]), T(0.02, 0.86, 0.36), sway);
    } else {
      // a basket on the arm, with something in it
      S.add(new THREE.CylinderGeometry(0.2, 0.15, 0.17, 9), 0xc9a964, T(0.3, 0.98, 0.14), sway);
      S.add(BALL, pick(R, [0xe8c84a, 0xd9443a, 0x6a8a4a, 0xf2f0e0]), T(0.3, 1.06, 0.14, 0, 0, 0, 0.16, 0.07, 0.16), sway);
    }
  } else if (kind === 'burgher' && R() < 0.3) S.add(new THREE.CylinderGeometry(0.014, 0.014, 1.05, 4), 0x3a2a1e, T(0.3, 0.52, 0.16, 0.12)); // a cane
  S.set(prev);
}

// singles, pairs in talk and the odd knot of three, mostly on the main streets
export function delftCrowd(world, traces, streets, soupAt, R, n = 60) {
  const H = (x, z) => world.heightAt(x, z);
  let made = 0,
    guard = 0;
  while (made < n && guard++ < n * 30) {
    const si = (R() * traces.length) | 0,
      st = streets[si],
      Tr = traces[si];
    if (!st.main && R() < 0.6) continue;
    const p = along(Tr, 3 + R() * (Tr.length_ - 6));
    const off = (R() < 0.5 ? -1 : 1) * (0.4 + R() * Math.max(0.2, st.w / 2 - 1.6));
    const x = p.x - p.tz * off,
      z = p.z + p.tx * off;
    if (world.blocked(x, H(x, z) + 1, z) || H(x, z) < -0.5) continue;
    const S = soupAt(x, z);
    if (R() < 0.42) {
      const g = R() < 0.25 ? 3 : 2,
        a0 = R() * 6.283;
      for (let i = 0; i < g; i++) {
        const a = a0 + (i / g) * 6.283,
          dx = Math.cos(a) * 0.5,
          dz = Math.sin(a) * 0.5;
        delftPerson(S, { x: x + dx, y: H(x + dx, z + dz), z: z + dz, ry: Math.atan2(-dx, -dz), R });
      }
      made += g;
    } else {
      delftPerson(S, { x, y: H(x, z), z, ry: Math.atan2(p.tx, p.tz) + (R() < 0.5 ? Math.PI : 0) + (R() - 0.5) * 0.9, R });
      made++;
    }
  }
  return made;
}
