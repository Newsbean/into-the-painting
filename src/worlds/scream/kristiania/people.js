// The people of Kristiania in 1893, as Munch painted them on Karl Johan: men in dark
// overcoats under bowlers and top hats, women in long narrow dresses and small hats,
// all of them pale in the lamplight.
//
//   kristianiaPerson(S, { x, y, z, ry, R, kind })    drawn into a Soup, facing local +z
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

const DARK = [0x15151c, 0x1c1a24, 0x24202a, 0x2a2430, 0x1a2030, 0x2a1c1c];
const DRESSES = [0x1c1a24, 0x3a2030, 0x24303a, 0x4a2a2a, 0x2a2a34, 0x5a4a5a, 0x2a3a3a];
const PALE = [0xe8dcc0, 0xdcd0b0, 0xf0e4c8]; // faces like paper, as he painted them

export function kristianiaPerson(S, o) {
  const R = o.R;
  const kind = o.kind ?? pick(R, ['man', 'woman', 'man', 'woman', 'gentleman', 'child']);
  const k = (kind === 'child' ? 0.66 : 0.95) + R() * 0.1;
  const prev = S.m;
  S.set(xf(o.x, o.y, o.z, o.ry ?? 0, k, k, k));
  const sway = { sway: 0.02 },
    skin = pick(R, PALE);
  const woman = kind === 'woman' || (kind === 'child' && R() < 0.5);
  const col = pick(R, woman ? DRESSES : DARK);
  if (woman) S.add(DRESS, col, null, sway);
  else {
    for (const sx of [-1, 1]) S.add(LEG, pick(R, DARK), T(sx * 0.085, 0.23, 0), sway);
    S.add(OVERCOAT, col, null, sway);
  }
  for (const sx of [-1, 1]) S.add(SLEEVE, col, T(sx * 0.24, 1.14, 0.02, -0.08 - R() * 0.2, 0, sx * 0.1), sway);
  S.add(HEAD, skin, T(0, 1.66, 0.005, 0, 0, 0, 0.95, 1.14, 0.98), sway);
  if (kind === 'gentleman') {
    S.add(BRIM, 0x101014, T(0, 1.745, 0), sway);
    S.add(TOPHAT, 0x101014, T(0, 1.855, 0), sway);
  } else if (!woman) {
    S.add(BRIM, 0x14141a, T(0, 1.74, 0), sway);
    S.add(BOWLER, 0x14141a, T(0, 1.745, 0), sway);
  } else {
    // hair put up, and a small hat or a shawl over it
    S.add(BALL, pick(R, [0x2a1c14, 0x4a3020, 0x1c1410, 0x6a4a2a]), T(0, 1.7, -0.03, 0, 0, 0, 0.115, 0.1, 0.125), sway);
    if (R() < 0.6) S.add(new THREE.CylinderGeometry(0.13, 0.15, 0.06, 9), pick(R, DRESSES), T(0, 1.79, 0.01, 0.12), sway);
    else S.add(new THREE.ConeGeometry(0.25, 0.3, 9), pick(R, [0x5a4a5a, 0x7a3a34, 0x3a4a5a, 0x8a7a6a]), T(0, 1.38, -0.02), sway);
  }
  if (kind === 'gentleman' && R() < 0.5) S.add(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), 0x1a1410, T(0.3, 0.5, 0.14, 0.1));
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
