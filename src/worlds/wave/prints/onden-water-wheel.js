import * as THREE from 'three';
import { Builder, xf } from '../../../engine/build.js';
import { lerp } from '../../../engine/gl.js';
import { FOAM, PALE, SKIN, TIMBER, WOOD, WOOD_D } from '../palette.js';
import { rod, beam } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- the water wheel at Onden: a long flume, a slow wheel, sacks going up, washing going on
export function ondenWaterWheel(world, { S, H, X, flat, face, solid, minka }) {
  const wx = 36.7,
    wz = 247.3,
    gy = H(wx, wz),
    r = 3.1,
    wy = gy + 2.9;
  const WB = new Builder();
  for (const sx of [-0.42, 0.42]) {
    for (let k = 0; k < 16; k++) {
      const a0 = (k / 16) * 6.283,
        a1 = ((k + 1) / 16) * 6.283;
      beam(WB, [sx, Math.cos(a0) * r, Math.sin(a0) * r], [sx, Math.cos(a1) * r, Math.sin(a1) * r], 0.16, 0.26, k % 2 ? WOOD : 0xa07e52);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 6.283;
      beam(WB, [sx, 0, 0], [sx, Math.cos(a) * (r - 0.1), Math.sin(a) * (r - 0.1)], 0.1, 0.12, WOOD_D);
    }
  }
  for (let k = 0; k < 16; k++) WB.add(new THREE.BoxGeometry(1.0, 0.6, 0.06), 0xc9a878, xf(0, 0, 0, 0, 1, 1, 1, ((k + 0.5) / 16) * 6.283, 0).multiply(xf(0, r - 0.05, 0)));
  WB.add(new THREE.CylinderGeometry(0.2, 0.2, 2.8, 8), TIMBER, xf(-0.6, 0, 0, 0, 1, 1, 1, 0, Math.PI / 2));
  const wm = WB.mesh(flat({ scale: 0.5, objSpace: 1, side: THREE.DoubleSide }));
  wm.name = 'prints';
  wm.position.set(wx, wy, wz);
  S.add(wm);
  world.wheel = wm;
  // its bearing out in the stream, and the mill it turns
  for (const sz of [-1.3, 1.3]) rod(X, [wx + 0.85, gy - 0.4, wz + sz], [wx + 0.8, wy + 0.1, wz], 0.14, 0.11, TIMBER, 5);
  X.box(0.4, 0.3, 0.5, TIMBER, wx + 0.8, wy - 0.15, wz);
  minka(32.4, 248.2, Math.PI, 5, 5.4, { h: 2.9 });
  // the flume, down from where the stream runs higher
  const A = [30.6, Math.max(wy + r + 1.2, H(30.6, 272) + 0.35), 272],
    Bq = [wx, wy + r + 0.4, wz + 1.7];
  beam(X, A, Bq, 0.9, 0.1, WOOD);
  for (const sx of [-0.45, 0.45]) beam(X, [A[0] + sx, A[1] + 0.2, A[2]], [Bq[0] + sx, Bq[1] + 0.2, Bq[2]], 0.08, 0.4, WOOD_D);
  beam(X, [A[0], A[1] + 0.14, A[2]], [Bq[0], Bq[1] + 0.14, Bq[2]], 0.7, 0.04, PALE);
  for (const t of [0.14, 0.3, 0.46, 0.62, 0.78, 0.93]) {
    const px = lerp(A[0], Bq[0], t),
      py = lerp(A[1], Bq[1], t),
      pz = lerp(A[2], Bq[2], t),
      g = H(px, pz);
    if (py - g < 0.6) continue;
    for (const sx of [-1, 1]) rod(X, [px + sx * (0.5 + (py - g) * 0.12), g - 0.3, pz], [px + sx * 0.4, py - 0.05, pz], 0.09, 0.07, TIMBER, 4);
    X.box(1.3, 0.14, 0.16, TIMBER, px, py - 0.2, pz);
  }
  beam(X, [Bq[0], Bq[1] + 0.1, Bq[2]], [wx, wy + r * 0.92, wz + 0.75], 0.62, 0.06, FOAM, { emissive: 0.3 });
  // men carrying sacks up to the mill, women washing in the stream, a boy looking on
  person(X, 31.2, H(31.2, 243.3), 243.3, face(31.2, 243.3, 31.6, 246), { coat: 0x3a628f, legs: SKIN, hat: 'cloth', carry: 'sack', lean: 0.35, stride: 0.2, armR: [2.6, 0.1, 1.2] });
  person(X, 29.6, H(29.6, 240.6), 240.6, face(29.6, 240.6, 31.2, 243.3), { coat: 0x8a6a48, legs: SKIN, carry: 'sack', lean: 0.4, stride: -0.2, armR: [2.6, 0.1, 1.2] });
  for (const [px, pz, c2] of [[35.1, 240.7, 0x9a4a3a], [34.9, 238.5, 0x7f9aa8]]) person(X, px, H(px, pz), pz, Math.PI / 2, { pose: 'kneel', robe: true, coat: c2, hat: 'cloth', lean: 0.55, armL: [1.0, 0.1], armR: [1.0, 0.1] });
  X.cyl(0.42, 0.36, 0.3, WOOD, 35.2, H(35.2, 239.6) + 0.02, 239.6, 8);
  person(X, 34, H(34, 243.8), 243.8, face(34, 243.8, wx, wz), { s: 0.6, coat: 0x5a6a4a, legs: SKIN, armR: [1.9, 0.3] });
  solid(wx, wz, 1.2, gy + 5.5);
}
