// The people of Kristiania in 1893, as Munch painted them on Karl Johan: men in dark
// overcoats under bowlers and top hats, women in long narrow dresses and small hats,
// all of them pale in the lamplight. The same figures, in other colours, are the
// dancers on the shore, the girls on the pier and the people of the farms.
//
//   kristianiaPerson(S, { x, y, z, ry, R, kind, ... })   drawn into a Soup, facing local +z
//       kind    'man' | 'woman' | 'gentleman' | 'child'  (one of them at random if not given)
//       col     the colour of the coat or dress          sleeve  of the sleeves, if not the same
//       hat     'straw' | 'cap' | 'scarf' | 'none' instead of what the kind wears; hatCol, hair
//       arms    how far both arms are raised to the front, in radians (dancing, leaning on a rail)
//       lean    how far the whole figure leans forward    scale   a size, instead of one at random
//   seatedMan(S, { x, y, z, ry })                        hunched on a stone, his head in his hand
//   kristianiaCrowd(world, traces, streets, soupAt, R, n)
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { along } from '../../../engine/plan.js';

const pick = (R, a) => a[(R() * a.length) | 0];
const lathe = (pts, seg = 9) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const T = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

const OVERCOAT = lathe([[0.22, 0.42], [0.235, 0.5], [0.2, 1.0], [0.215, 1.22], [0.23, 1.36], [0.16, 1.46], [0.06, 1.5], [0.055, 1.56]]);
const DRESS = lathe([[0.27, 0], [0.285, 0.05], [0.24, 0.5], [0.17, 0.98], [0.16, 1.05], [0.2, 1.2], [0.21, 1.34], [0.16, 1.45], [0.06, 1.5], [0.055, 1.56]]);
const LEG = new THREE.CylinderGeometry(0.07, 0.06, 0.46, 6);
const SLEEVE = new THREE.BoxGeometry(0.1, 0.5, 0.17);
const HEAD = new THREE.IcosahedronGeometry(0.105, 1);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const BOWLER = new THREE.SphereGeometry(0.115, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
const BRIM = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 10);
const TOPHAT = new THREE.CylinderGeometry(0.1, 0.105, 0.2, 9);
const STRAW = new THREE.CylinderGeometry(0.105, 0.115, 0.09, 10);
const WIDE = new THREE.CylinderGeometry(0.27, 0.27, 0.018, 12);

const DARK = [0x15151c, 0x1c1a24, 0x24202a, 0x2a2430, 0x1a2030, 0x2a1c1c];
const DRESSES = [0x1c1a24, 0x3a2030, 0x24303a, 0x4a2a2a, 0x2a2a34, 0x5a4a5a, 0x2a3a3a];
const PALE = [0xe8dcc0, 0xdcd0b0, 0xf0e4c8]; // faces like paper, as he painted them

// (Every figure throws the dice the same number of times whatever it is asked to wear, so
// asking one for a red dress does not change the crowd behind it.)
export function kristianiaPerson(S, o) {
  const R = o.R;
  const kind = o.kind ?? pick(R, ['man', 'woman', 'man', 'woman', 'gentleman', 'child']);
  const k0 = (kind === 'child' ? 0.66 : 0.95) + R() * 0.1,
    k = o.scale ?? k0;
  const prev = S.m;
  S.set(xf(o.x, o.y, o.z, o.ry ?? 0, k, k, k, o.lean ?? 0));
  const sway = { sway: 0.02 },
    skin = pick(R, PALE);
  const woman = kind === 'woman' || (kind === 'child' && R() < 0.5);
  const own = pick(R, woman ? DRESSES : DARK),
    col = o.col ?? own,
    sleeve = o.sleeve ?? col;
  if (woman) S.add(DRESS, col, null, sway);
  else {
    for (const sx of [-1, 1]) {
      const cloth = pick(R, DARK);
      S.add(LEG, o.legs ?? cloth, T(sx * 0.085, 0.23, 0), sway);
    }
    S.add(OVERCOAT, col, null, sway);
  }
  for (const sx of [-1, 1]) {
    const loose = -0.08 - R() * 0.2;
    if (o.arms === undefined) S.add(SLEEVE, sleeve, T(sx * 0.24, 1.14, 0.02, loose, 0, sx * 0.1), sway);
    else {
      // raised from the shoulder, a hand at the end of it
      const m = T(sx * 0.24, 1.38, 0, -o.arms, 0, sx * 0.06);
      S.add(SLEEVE, sleeve, m.clone().multiply(T(0, -0.25, 0)), sway);
      S.add(BALL, skin, m.clone().multiply(T(0, -0.54, 0, 0, 0, 0, 0.05, 0.06, 0.05)), sway);
    }
  }
  S.add(HEAD, skin, T(0, 1.66, 0.005, 0, 0, 0, 0.95, 1.14, 0.98), sway);
  // what the kind wears on its head (the dice are thrown for it even if something else is worn)
  const hair = woman ? pick(R, [0x2a1c14, 0x4a3020, 0x1c1410, 0x6a4a2a]) : 0x2a1c14,
    small = woman ? R() < 0.6 : false,
    cloth = woman ? (small ? pick(R, DRESSES) : pick(R, [0x5a4a5a, 0x7a3a34, 0x3a4a5a, 0x8a7a6a])) : 0;
  const hat = o.hat ?? (kind === 'gentleman' ? 'top' : !woman ? 'bowler' : small ? 'small' : 'shawl');
  if (woman || hat === 'none' || hat === 'straw') S.add(BALL, o.hair ?? hair, T(0, 1.7, -0.03, 0, 0, 0, 0.115, 0.1, 0.125), sway);
  if (hat === 'top') {
    S.add(BRIM, 0x101014, T(0, 1.745, 0), sway);
    S.add(TOPHAT, 0x101014, T(0, 1.855, 0), sway);
  } else if (hat === 'bowler') {
    S.add(BRIM, 0x14141a, T(0, 1.74, 0), sway);
    S.add(BOWLER, 0x14141a, T(0, 1.745, 0), sway);
  } else if (hat === 'cap') {
    S.add(BOWLER, o.hatCol ?? 0x2a2a30, T(0, 1.735, 0, 0, 0, 0, 1, 0.6, 1), sway);
    S.add(BRIM, o.hatCol ?? 0x2a2a30, T(0, 1.74, 0.09, 0.1, 0, 0, 0.6, 1, 0.6), sway);
  } else if (hat === 'straw') {
    S.add(WIDE, o.hatCol ?? 0xe2c46a, T(0, 1.765, 0, 0.06), sway);
    S.add(STRAW, o.hatCol ?? 0xe2c46a, T(0, 1.81, 0, 0.06), sway);
  } else if (hat === 'small') S.add(new THREE.CylinderGeometry(0.13, 0.15, 0.06, 9), o.hatCol ?? cloth, T(0, 1.79, 0.01, 0.12), sway);
  else if (hat === 'shawl' || hat === 'scarf') S.add(new THREE.ConeGeometry(0.25, 0.3, 9), o.hatCol ?? cloth, T(0, 1.38, -0.02), sway);
  if (kind === 'gentleman' && R() < 0.5 && o.arms === undefined) S.add(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), 0x1a1410, T(0.3, 0.5, 0.14, 0.1));
  S.set(prev);
}

// Melancholy: a man sitting forward on a stone, an elbow on his knee, his head in his hand.
export function seatedMan(S, o) {
  const prev = S.m,
    coat = o.col ?? 0x1c1c26,
    skin = 0xd9c8a8;
  const M = xf(o.x, o.y, o.z, o.ry ?? 0);
  S.set(M);
  const rod = (a, b, r0, r1, col) => {
    const va = new THREE.Vector3(...a),
      vb = new THREE.Vector3(...b),
      d = vb.clone().sub(va),
      L = d.length();
    S.add(new THREE.CylinderGeometry(r1, r0, L, 6), col, new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)));
  };
  // thighs out to the knees, shins down to the stones
  for (const sx of [-1, 1]) {
    rod([sx * 0.11, 0.5, 0], [sx * 0.14, 0.52, 0.46], 0.095, 0.08, coat);
    rod([sx * 0.14, 0.52, 0.46], [sx * 0.15, 0.04, 0.56], 0.075, 0.06, coat);
    S.add(BALL, 0x14110f, T(sx * 0.15, 0.04, 0.64, 0, 0, 0, 0.06, 0.045, 0.13));
  }
  // the back bent over, the head hung forward into the hand
  S.add(BALL, coat, T(0, 0.82, 0.08, 0.5, 0, 0, 0.23, 0.4, 0.19));
  S.add(HEAD, skin, T(0.03, 1.2, 0.34, 0.5, 0, 0, 0.95, 1.14, 0.98));
  S.add(BALL, 0x2a1c14, T(0.03, 1.25, 0.3, 0.5, 0, 0, 0.115, 0.1, 0.125));
  rod([0.2, 1.05, 0.16], [0.15, 0.62, 0.42], 0.065, 0.05, coat); // the arm propped on the knee
  rod([0.15, 0.62, 0.42], [0.08, 1.08, 0.4], 0.05, 0.04, coat);
  S.add(BALL, skin, T(0.07, 1.12, 0.4, 0, 0, 0, 0.05, 0.06, 0.05));
  rod([-0.2, 1.05, 0.16], [-0.16, 0.6, 0.36], 0.065, 0.05, coat); // the other lying along his thigh
  S.set(prev);
}

export function kristianiaCrowd(world, traces, streets, soupAt, R, n = 50) {
  const H = (x, z) => world.heightAt(x, z);
  let made = 0,
    guard = 0;
  while (made < n && guard++ < n * 30) {
    const si = (R() * traces.length) | 0,
      st = streets[si],
      Tr = traces[si];
    if (!st.main && R() < 0.6) continue;
    const p = along(Tr, 3 + R() * (Tr.length_ - 6));
    const off = (R() < 0.5 ? -1 : 1) * (0.4 + R() * Math.max(0.2, st.w / 2 - 1.4));
    const x = p.x - p.tz * off,
      z = p.z + p.tx * off;
    if (world.blocked(x, H(x, z) + 1, z) || H(x, z) < 0.4) continue;
    const S = soupAt(x, z);
    if (R() < 0.4) {
      const a = R() * 6.283;
      for (const s of [-1, 1]) kristianiaPerson(S, { x: x + Math.cos(a) * 0.45 * s, y: H(x, z), z: z + Math.sin(a) * 0.45 * s, ry: Math.atan2(-Math.cos(a) * s, -Math.sin(a) * s), R });
      made += 2;
    } else {
      kristianiaPerson(S, { x, y: H(x, z), z, ry: Math.atan2(p.tx, p.tz) + (R() < 0.5 ? Math.PI : 0) + (R() - 0.5) * 0.8, R });
      made++;
    }
  }
  return made;
}
