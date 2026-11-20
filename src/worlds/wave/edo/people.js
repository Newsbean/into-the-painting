// The people of Edo's streets: townsfolk in kimono and sash, travellers under straw hats,
// porters with a load at each end of a pole, a parasol here and there.
//
//   edoPerson(S, { x, y, z, ry, R, kind })    S: the 'detail' soup of an EdoKit
//   edoCrowd(world, traces, streets, soupAt, R, n)    scatter them along the streets
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { along } from '../../../engine/plan.js';

const ROBE = [0x1f3f7a, 0x2f548a, 0x5a4a3a, 0x7a2f2a, 0x3f5a4a, 0x6a6a72, 0x8a6a44, 0x2a2a34, 0xb8502e, 0x4a3a5a];
const SASH = [0xe9dfc6, 0xd9482b, 0x1c1c22, 0xd9a93a, 0x3f7a5a];
const SKIN = [0xe6c8a0, 0xd9b78c, 0xf0d2aa];
const STRAW = 0xdcc27a;
const pick = (R, a) => a[(R() * a.length) | 0];
const lathe = (pts, seg = 9) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const ROBE_G = lathe([[0.17, 0], [0.2, 0.06], [0.19, 0.5], [0.165, 0.95], [0.19, 1.12], [0.2, 1.3], [0.15, 1.42], [0.06, 1.46], [0.055, 1.52]]);
const SASH_G = new THREE.CylinderGeometry(0.19, 0.185, 0.15, 9);
const SLEEVE = new THREE.BoxGeometry(0.11, 0.44, 0.22);
const HEAD = new THREE.IcosahedronGeometry(0.105, 1);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const KASA = new THREE.ConeGeometry(0.36, 0.17, 12);
const T = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

export function edoPerson(S, o) {
  const R = o.R;
  const kind = o.kind ?? pick(R, ['townsman', 'townswoman', 'traveller', 'porter', 'townswoman', 'townsman']);
  const k = 0.92 + R() * 0.12;
  const prev = S.m;
  S.set(xf(o.x, o.y, o.z, o.ry ?? 0, k, k, k));
  const robe = pick(R, ROBE),
    skin = pick(R, SKIN);
  const sway = { sway: 0.02 };
  S.add(ROBE_G, robe, null, sway);
  S.add(SASH_G, pick(R, SASH), T(0, 1.02, 0), sway);
  const reach = kind === 'porter' ? -1.2 : -0.12 - R() * 0.25;
  for (const sx of [-1, 1]) S.add(SLEEVE, robe, T(sx * 0.24, 1.14, 0.03, reach * (kind === 'porter' ? 1 : 0.6), 0, sx * 0.14), sway);
  S.add(HEAD, skin, T(0, 1.62, 0.005, 0, 0, 0, 1, 1.1, 1), sway);
  if (kind === 'traveller' || kind === 'porter' || R() < 0.15) S.add(KASA, STRAW, T(0, 1.77, 0), sway);
  else {
    S.add(BALL, 0x15151a, T(0, 1.665, -0.015, 0, 0, 0, 0.112, 0.085, 0.118), sway);
    if (kind === 'townswoman') S.add(BALL, 0x15151a, T(0, 1.75, -0.04, 0, 0, 0, 0.075, 0.06, 0.075), sway);
    else S.add(new THREE.CylinderGeometry(0.02, 0.025, 0.12, 5), 0x15151a, T(0, 1.755, 0.02, 1.2), sway);
  }
  if (kind === 'porter') {
    // a pole across one shoulder, a load at each end
    S.add(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 5), 0x8a6a44, T(0.1, 1.42, 0, Math.PI / 2));
    const load = new THREE.CylinderGeometry(0.2, 0.17, 0.3, 8);
    for (const sz of [-1, 1]) {
      S.add(load, pick(R, [0xb89a5a, 0x8a6a44, 0xd8c48a]), T(0.1, 0.72, sz * 0.85), sway);
      S.add(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 3), 0x3a2a1e, T(0.1, 1.14, sz * 0.85));
    }
  } else if (kind === 'townswoman' && R() < 0.35) {
    // an oiled-paper parasol
    S.add(new THREE.CylinderGeometry(0.012, 0.012, 1.15, 4), 0x3a2a1e, T(0.2, 1.55, 0.05, 0, 0, -0.12));
    S.add(new THREE.ConeGeometry(0.62, 0.2, 12), pick(R, [0xd9482b, 0xe9dfc6, 0x2f548a, 0xd9a93a]), T(0.27, 2.2, 0.05, 0, 0, -0.12), sway);
  } else if (kind === 'traveller') {
    S.add(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 4), 0x6a4a36, T(0.3, 0.75, 0.12, 0.1)); // a staff
    S.add(new THREE.BoxGeometry(0.26, 0.2, 0.14), 0x3f5a4a, T(0, 1.2, -0.2), sway); // a bundle on the back
  }
  S.set(prev);
}

// singles, pairs in talk, and the odd porter, mostly where the shops are
export function edoCrowd(world, traces, streets, soupAt, R, n = 70) {
  const H = (x, z) => world.heightAt(x, z);
  let made = 0,
    guard = 0;
  while (made < n && guard++ < n * 30) {
    const si = (R() * traces.length) | 0,
      st = streets[si],
      Tr = traces[si];
    if (!st.main && R() < 0.6) continue;
    const p = along(Tr, 3 + R() * (Tr.length_ - 6));
    const off = (R() < 0.5 ? -1 : 1) * R() * (st.w / 2 - 1.1);
    const x = p.x - p.tz * off,
      z = p.z + p.tx * off;
    if (H(x, z) < 1.5) continue;
    const S = soupAt(x, z);
    const heading = Math.atan2(p.tx, p.tz) + (R() < 0.5 ? Math.PI : 0);
    if (R() < 0.3) {
      const a = R() * 6.283,
        dx = Math.cos(a) * 0.4,
        dz = Math.sin(a) * 0.4;
      edoPerson(S, { x: x - dx, y: H(x - dx, z - dz), z: z - dz, ry: Math.atan2(dx, dz), R });
      edoPerson(S, { x: x + dx, y: H(x + dx, z + dz), z: z + dz, ry: Math.atan2(-dx, -dz), R });
      made += 2;
    } else {
      edoPerson(S, { x, y: H(x, z), z, ry: heading + (R() - 0.5) * 0.5, R });
      made++;
    }
  }
  return made;
}
