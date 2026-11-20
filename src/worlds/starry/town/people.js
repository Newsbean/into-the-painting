// Townspeople of the 1880s, turned on a lathe: women in long skirts and shawls, men in
// coats and hats, a child now and then. They stand in pairs, stroll, look into shop windows.
//
//   townsperson(S, { x, y, z, ry, R, kind })    S: a Soup (the 'detail' soup of a Kit)
//   strollers(world, town, kit, R, n)           scatter them along the lit streets
// Lab: /?debug&lab=worlds/starry/town/people.js
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { Kit, townMaterials } from './kit.js';
import { along } from './plan.js';

const DRESS = [0x2f4f9a, 0x7a2f4a, 0x2f6a5a, 0x8a5a2a, 0x5a3a8a, 0xb8503a, 0x3a5a8a, 0xc9a24a, 0x6a2f3a, 0x35406a];
const COAT = [0x1c2438, 0x2a2233, 0x3a2a22, 0x22323a, 0x2f3a5a, 0x4a3a2a];
const SKIN = [0xe6b890, 0xd9a882, 0xf0c8a0, 0xc99874];
const HAIR = [0x2a1c14, 0x4a3020, 0x1a1414, 0x7a5a30, 0x8a8a8a];
const SHAWL = [0xe0d2a8, 0xb8503a, 0xd9a83a, 0x3f7a58, 0x8fa8d8, 0xe6e0d0];
const STRAW = 0xe2c46a;

const pick = (R, a) => a[(R() * a.length) | 0];
const lathe = (pts, seg = 10) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const SKIRT = lathe([[0.37, 0.0], [0.36, 0.08], [0.3, 0.45], [0.21, 0.86], [0.15, 1.06], [0.14, 1.1]]);
const BODICE = lathe([[0.14, 1.08], [0.17, 1.2], [0.185, 1.33], [0.15, 1.43], [0.06, 1.47], [0.055, 1.53]]);
const COATG = lathe([[0.23, 0.72], [0.225, 0.86], [0.19, 1.12], [0.2, 1.3], [0.215, 1.38], [0.17, 1.46], [0.065, 1.5], [0.06, 1.56]]);
const LEG = new THREE.CylinderGeometry(0.075, 0.062, 0.86, 7);
const ARM = new THREE.CylinderGeometry(0.052, 0.045, 0.58, 6);
const HEAD = new THREE.IcosahedronGeometry(0.108, 1);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const _c = new THREE.Color();
const T = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

export function townsperson(S, o) {
  const R = o.R;
  const kind = o.kind ?? (R() < 0.5 ? 'woman' : R() < 0.85 ? 'man' : 'child');
  const k = kind === 'child' ? 0.62 : 0.94 + R() * 0.12; // height
  const M = xf(o.x, o.y, o.z, o.ry ?? 0, k, k, k);
  const prev = S.m;
  S.set(M);
  const skin = pick(R, SKIN);
  const hair = pick(R, HAIR);
  const stride = o.stride ?? (R() < 0.55 ? 0.22 + R() * 0.12 : 0); // walking, or standing
  const sway = { sway: 0.02 };
  if (kind === 'woman' || (kind === 'child' && R() < 0.5)) {
    const dress = new THREE.Color(pick(R, DRESS));
    S.add(SKIRT, (x, y) => _c.copy(dress).multiplyScalar(0.7 + 0.35 * Math.min(1, y / 0.9)), T(0, 0, 0, stride * 0.25));
    S.add(BODICE, dress.clone().multiplyScalar(1.08), null, sway);
    if (R() < 0.6) {
      // a shawl over the shoulders
      S.add(lathe([[0.24, 1.14], [0.225, 1.3], [0.16, 1.44], [0.07, 1.48]], 9), pick(R, SHAWL), null, sway);
    } else if (R() < 0.5) S.quad([-0.12, 0.35, 0.3], [0.12, 0.35, 0.3], [0.1, 1.08, 0.155], [-0.1, 1.08, 0.155], 0xe9e4d6); // an apron
    for (const sx of [-1, 1]) S.add(ARM, dress, T(sx * 0.2, 1.14, 0.03, -0.18 - R() * 0.3, 0, sx * 0.16), sway);
    S.add(HEAD, skin, T(0, 1.63, 0.005, 0, 0, 0, 1, 1.12, 1), sway);
    S.add(BALL, hair, T(0, 1.66, -0.03, 0, 0, 0, 0.115, 0.11, 0.12), sway);
    const h = R();
    if (h < 0.4) {
      // a hat with a ribbon
      S.add(new THREE.CylinderGeometry(0.2, 0.22, 0.025, 12), STRAW, T(0, 1.735, 0, 0.08), sway);
      S.add(new THREE.CylinderGeometry(0.095, 0.11, 0.09, 10), STRAW, T(0, 1.785, 0, 0.08), sway);
      S.add(new THREE.CylinderGeometry(0.112, 0.112, 0.03, 10), pick(R, DRESS), T(0, 1.755, 0, 0.08), sway);
    } else if (h < 0.7) S.add(BALL, hair, T(0, 1.7, -0.1, 0, 0, 0, 0.07, 0.07, 0.07), sway); // a bun
    else S.add(BALL, pick(R, SHAWL), T(0, 1.67, -0.02, 0, 0, 0, 0.125, 0.115, 0.13), sway); // a bonnet
    if (R() < 0.18) {
      // a basket on her arm
      S.add(new THREE.CylinderGeometry(0.13, 0.1, 0.13, 8), 0xa87a3a, T(0.3, 0.9, 0.1));
    }
  } else {
    const coat = new THREE.Color(pick(R, COAT));
    const trousers = new THREE.Color(pick(R, COAT)).multiplyScalar(0.85);
    S.add(LEG, trousers, T(-0.085, 0.43, 0, stride));
    S.add(LEG, trousers, T(0.085, 0.43, 0, -stride));
    S.add(COATG, (x, y) => _c.copy(coat).multiplyScalar(0.8 + 0.3 * Math.min(1, (y - 0.7) / 0.7)), null, sway);
    for (const sx of [-1, 1]) S.add(ARM, coat, T(sx * 0.225, 1.17, 0.02 - sx * stride * 0.15, sx * stride * 0.7, 0, sx * 0.12), sway);
    S.add(HEAD, skin, T(0, 1.66, 0.005, 0, 0, 0, 1, 1.12, 1), sway);
    if (R() < 0.35) S.add(BALL, hair, T(0, 1.6, 0.075, 0, 0, 0, 0.075, 0.07, 0.05), sway); // a beard
    const h = R();
    if (h < 0.3) {
      S.add(new THREE.CylinderGeometry(0.1, 0.105, 0.17, 10), 0x15161f, T(0, 1.85, 0), sway);
      S.add(new THREE.CylinderGeometry(0.165, 0.165, 0.02, 12), 0x15161f, T(0, 1.765, 0), sway);
    } else if (h < 0.62) {
      S.add(new THREE.CylinderGeometry(0.105, 0.11, 0.075, 10), STRAW, T(0, 1.8, 0), sway);
      S.add(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 12), STRAW, T(0, 1.765, 0), sway);
    } else if (h < 0.85) S.add(BALL, pick(R, COAT), T(0, 1.75, 0.01, 0.1, 0, 0, 0.135, 0.045, 0.14), sway); // a beret
    else S.add(BALL, hair, T(0, 1.7, -0.015, 0, 0, 0, 0.112, 0.085, 0.118), sway);
  }
  S.set(prev);
}

// people along the lit streets: singles, pairs facing each other, a few at shop windows
export function strollers(world, town, kits, R, n = 120, streets = null) {
  const H = (x, z) => world.heightAt(x, z);
  let made = 0;
  let guard = 0;
  while (made < n && guard++ < n * 30) {
    const si = (R() * town.traces.length) | 0;
    const st = streets ? streets[si] : null;
    if (st && st.houses === false && R() < 0.7) continue;
    if (st && !st.main && R() < 0.55) continue; // most of them are where the lights are
    const Tr = town.traces[si];
    const p = along(Tr, 4 + R() * (Tr.length_ - 8));
    const side = R() < 0.5 ? -1 : 1;
    const w = st?.w ?? 8;
    const off = side * (R() < 0.6 ? w / 2 - 1.2 - R() * 1.2 : R() * (w / 2 - 1.6));
    const x = p.x - p.tz * off,
      z = p.z + p.tx * off;
    if (town.occupied(x, z, 0.5) && Math.abs(off) > w / 2 - 0.4) continue;
    const S = kits(x, z);
    const heading = Math.atan2(p.tx, p.tz) + (R() < 0.5 ? Math.PI : 0);
    const mode = R();
    if (mode < 0.45) {
      // a pair, turned to each other
      const a = R() * 6.283;
      const dx = Math.cos(a) * 0.42,
        dz = Math.sin(a) * 0.42;
      townsperson(S, { x: x - dx, y: H(x - dx, z - dz), z: z - dz, ry: Math.atan2(dx, dz), R, stride: 0 });
      townsperson(S, { x: x + dx, y: H(x + dx, z + dz), z: z + dz, ry: Math.atan2(-dx, -dz), R, stride: 0 });
      made += 2;
    } else if (mode < 0.6) {
      // arm in arm down the street
      const nx = -p.tz * 0.3,
        nz = p.tx * 0.3;
      townsperson(S, { x: x - nx, y: H(x - nx, z - nz), z: z - nz, ry: heading, R, kind: 'man' });
      townsperson(S, { x: x + nx, y: H(x + nx, z + nz), z: z + nz, ry: heading, R, kind: 'woman' });
      made += 2;
    } else {
      townsperson(S, { x, y: H(x, z), z, ry: heading + (R() - 0.5) * 0.6, R });
      made++;
    }
  }
  return made;
}

export function lab(world) {
  let seed = 7;
  const R = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const kit = new Kit(townMaterials(world.ctx.strokes));
  const S = kit.s('detail');
  const kinds = ['woman', 'man', 'woman', 'man', 'child', 'woman', 'man', 'woman', 'man', 'child', 'woman', 'man'];
  kinds.forEach((kind, i) => townsperson(S, { x: (i - 5.5) * 1.15, y: 0, z: i % 2 ? 0.5 : -0.3, ry: (R() - 0.5) * 1.2, R, kind }));
  const { base } = kit.build();
  world.scene.add(base);
  world.maps.lamp(0, 2, 12, 0xffc46a, 0.9);
  return {
    focus: [0, 1, 0],
    dist: 9,
    views: [
      { yaw: 0, pitch: 4, dist: 9.5, focus: [0, 1.0, 0], fov: 50 },
      { yaw: 25, pitch: 6, dist: 4.2, focus: [-2.6, 1.15, 0], fov: 45 },
      { yaw: -20, pitch: 6, dist: 4.2, focus: [2.6, 1.15, 0], fov: 45 },
      { yaw: 180, pitch: 10, dist: 8, focus: [0, 1, 0], fov: 50 },
    ],
  };
}
