import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { lerp } from '../../../engine/gl.js';
import { rod, beam, person } from '../helpers.js';
import { TIMBER, DARK, woodC } from '../palette.js';
import { LEO } from './layout.js';

// ================= the giant crossbow on its six canted wheels
export function buildCrossbow(world, kit) {
  const { maps, C, LB, LP, span, toW } = kit;
  const [bx, bz] = LEO.bow;
  const g = span(bx, bz, 9);
  const y0 = g.lo * 0.4 + g.hi * 0.6,
    ry = Math.PI + 0.6;
  const M = xf(bx, y0, bz, ry);
  for (const wz of [-7, 0, 7]) {
    LB.box(6.9, 0.4, 0.4, woodC, 0, 1.4, wz, 0, undefined, M);
    for (const sx of [-1, 1]) {
      const W = M.clone().multiply(xf(sx * 3.45, 1.6, wz, 0, 1, 1, 1, 0, sx * 0.2));
      LB.add(new THREE.TorusGeometry(1.6, 0.15, 5, 16), DARK, W.clone().multiply(xf(0, 0, 0, Math.PI / 2)));
      for (let k = 0; k < 3; k++) LB.box(0.16, 3.1, 0.16, TIMBER, 0, -1.55, 0, 0, undefined, W.clone().multiply(xf(0, 0, 0, 0, 1, 1, 1, (k * Math.PI) / 3, 0)));
      LB.cyl(0.3, 0.3, 0.7, DARK, 0.35, 0, 0, 8, undefined, W, 0, Math.PI / 2);
    }
  }
  for (const sx of [-1, 1]) LB.box(0.5, 0.6, 22, woodC, sx * 1.1, 1.8, 0, 0, undefined, M);
  for (let z = -10; z <= 10; z += 2.5) LB.box(2.7, 0.3, 0.4, DARK, 0, 1.9, z, 0, undefined, M);
  LB.box(0.8, 0.3, 21.4, TIMBER, 0, 2.4, 0, 0, undefined, M);
  // the bow: laminated staves bound together, drawn back
  const bp = (t) => [12.5 * t, 3.05, -9.6 + 5.2 * Math.pow(Math.abs(t), 1.8)];
  for (const sx of [-1, 1])
    for (let k = 0; k < 8; k++) {
      const t0 = (k / 8) * sx,
        t1 = ((k + 1) / 8) * sx;
      beam(LB, bp(t0), bp(t1), lerp(1.0, 0.36, k / 7), lerp(0.9, 0.4, k / 7), k & 1 ? 0x8a6a40 : 0x76562f, undefined, M);
      const p = bp(t1);
      if (k < 7) LB.box(lerp(1.1, 0.5, k / 7), lerp(1.0, 0.5, k / 7), 0.22, 0x3a2c1c, p[0], p[1] - lerp(0.5, 0.25, k / 7), p[2], sx * -0.5, undefined, M);
    }
  LB.box(2.6, 1.2, 1.5, woodC, 0, 2.3, -9.5, 0, undefined, M);
  for (const sx of [-1, 1]) rod(LB, bp(sx), [0, 3.0, 5.6], 0.06, 0xd8cfae, 4, 0.06, undefined, M);
  rod(LB, [0, 2.85, 5.4], [0, 2.85, -10.6], 0.12, 0x6a4a2a, 5, 0.1, undefined, M, true);
  rod(LB, [0, 2.85, -10.6], [0, 2.85, -11.7], 0.26, 0x4a4438, 6, 0.01, undefined, M, true);
  LB.box(1.5, 0.9, 1.3, woodC, 0, 2.6, 5.7, 0, undefined, M);
  beam(LB, [0.5, 3.4, 5.9], [0.9, 4.5, 6.8], 0.14, 0.14, DARK, undefined, M);
  // the worm screw and handwheel that draw it
  rod(LB, [0, 3.0, 6.3], [0, 3.0, 10.9], 0.2, 0x5a5044, 6, 0.2, undefined, M, true);
  for (let z = 6.6; z < 10.4; z += 0.45) LB.add(new THREE.TorusGeometry(0.24, 0.05, 4, 8), 0x4a4034, M.clone().multiply(xf(0, 3.0, z, 0, 1, 1, 1, 0.3, 0)));
  LB.box(1.6, 1.3, 0.5, woodC, 0, 2.4, 10.3, 0, undefined, M);
  LB.add(new THREE.TorusGeometry(1.1, 0.08, 5, 18), DARK, M.clone().multiply(xf(0, 3.0, 11, 0)));
  for (let k = 0; k < 2; k++) LB.box(2.2, 0.1, 0.1, TIMBER, 0, 2.95, 11, 0, undefined, M.clone().multiply(xf(0, 3, 11, 0, 1, 1, 1, 0, k * 1.5708)).multiply(xf(0, -3, -11)));
  const op = toW(M, 1.05, 2.4, 7.6);
  person(LP, xf(op.x, op.y, op.z, ry + Math.PI + 0.4), { robe: 0x7a3a2a, hands: [[-0.2, -0.2, 0.4], [0.1, -0.25, 0.4]] });
  const cb = toW(M, 0, 0, -6.6);
  C.push({ x: bx, z: bz, hw: 1.7, hd: 11.6, ry, top: y0 + 3.3 });
  C.push({ x: cb.x, z: cb.z, hw: 12.6, hd: 3, ry, top: y0 + 4, bottom: y0 + 2.3 });
  maps.blob(bx, bz, 9, 0.4);
}
