import * as THREE from 'three';
import { mix, xf } from '../../../engine/build.js';
import { rod, beam } from '../helpers.js';
import { MARBLE, stoneC, bronzeC } from '../palette.js';
import { LEO } from './layout.js';

// ================= the Vitruvian Man: the drawing laid out as a piazza, the man himself in bronze
export function buildVitruvianPiazza(world, kit) {
  const { maps, Q, C, PL, LB, SQ, span, cyp } = kit;
  const [vx, vz] = LEO.vit;
  const g = span(vx, vz + 2, 15);
  const y0 = g.hi + 0.5,
    base = g.lo - 1;
  LB.box(29.6, y0 - 0.27 - base, 29.6, 0x9c8e6e, vx, base, vz + 2);
  LB.box(27, y0 - 0.02 - base, 27, stoneC, vx, base, vz + 2);
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++) {
      const xa = vx - 13.5 + i * 3,
        za = vz - 11.5 + j * 3;
      SQ.quad([xa, y0, za], [xa, y0, za + 3], [xa + 3, y0, za + 3], [xa + 3, y0, za], mix((i + j) & 1 ? 0xbcae8a : 0xd0c3a2, 0xa4966f, Q() * 0.5));
    }
  // the circle about the navel and the square about the groin, inlaid dark; the figure in red stone, head to the south
  const INK = 0x574b3b,
    SANG = 0x94684a,
    flat = y0 + 0.03;
  const ring = new THREE.RingGeometry(11.86, 12.46, 72);
  ring.rotateX(-Math.PI / 2);
  LB.add(ring, INK, xf(vx, y0 + 0.04, vz + 2.16));
  for (const s of [-1, 1]) {
    LB.box(20.6, 0.05, 0.6, INK, vx, y0, vz + s * 10);
    LB.box(0.6, 0.05, 20.6, INK, vx + s * 10, y0, vz);
  }
  LB.cyl(1.3, 1.3, 0.045, SANG, vx, y0, vz + 8.65, 14);
  LB.box(3.3, 0.045, 6.6, SANG, vx, y0, vz + 3);
  LB.box(4.6, 0.045, 1.1, SANG, vx, y0, vz + 6.2);
  LB.box(0.9, 0.045, 1.2, SANG, vx, y0, vz + 7.1);
  for (const s of [-1, 1]) {
    LB.box(1.25, 0.045, 10, SANG, vx + s * 0.85, y0, vz - 5);
    beam(LB, [vx + s * 1.2, flat, vz - 0.2], [vx + s * 4.9, flat, vz - 8.9], 1.2, 0.045, SANG);
    LB.box(7.9, 0.045, 0.95, SANG, vx + s * 6.05, y0, vz + 6.3);
    beam(LB, [vx + s * 2.1, flat, vz + 6.3], [vx + s * 9.3, flat, vz + 9.8], 0.95, 0.045, SANG);
  }
  // the bronze, six metres tall, in both poses at once inside his circle and square
  const sz0 = vz + 2.16;
  LB.cyl(2.5, 2.8, 0.5, stoneC, vx, y0, sz0, 14);
  LB.cyl(2.1, 2.2, 0.7, MARBLE, vx, y0 + 0.5, sz0, 14);
  const yb = y0 + 1.2;
  const VM = xf(vx, yb, sz0);
  LB.add(new THREE.TorusGeometry(3.65, 0.1, 6, 44), bronzeC, xf(vx, yb + 3.65, sz0));
  for (const s of [-1, 1]) LB.box(0.17, 6, 0.17, bronzeC, s * 3, 0, 0, 0, undefined, VM);
  LB.box(6.17, 0.17, 0.17, bronzeC, 0, 5.92, 0, 0, undefined, VM);
  LB.box(6.17, 0.14, 0.17, bronzeC, 0, 0, 0, 0, undefined, VM);
  const FM = VM.clone().multiply(xf(0, 0, 0, 0, 1, 1, 0.62));
  LB.cyl(0.6, 0.42, 1.9, bronzeC, 0, 3, 0, 8, undefined, FM);
  LB.ball(0.5, bronzeC, 0, 3.05, 0, 1, 0.8, 1, 1, undefined, FM);
  LB.ball(0.66, bronzeC, 0, 4.55, 0, 1, 0.75, 1, 1, undefined, FM);
  LB.cyl(0.17, 0.2, 0.45, bronzeC, 0, 4.9, 0, 6, undefined, VM);
  LB.ball(0.4, bronzeC, 0, 5.62, 0, 0.9, 1.12, 0.95, 2, undefined, VM);
  LB.ball(0.43, bronzeC, 0, 5.7, 0.07, 0.95, 1, 0.95, 1, undefined, VM);
  for (const s of [-1, 1]) {
    rod(LB, [s * 0.66, 4.82, 0], [s * 2.9, 4.86, 0], 0.17, bronzeC, 6, 0.1, undefined, VM);
    rod(LB, [s * 0.66, 4.82, 0], [s * 2.72, 5.93, 0], 0.17, bronzeC, 6, 0.1, undefined, VM);
    LB.ball(0.14, bronzeC, s * 2.98, 4.86, 0, 1, 1, 1, 0, undefined, VM);
    LB.ball(0.14, bronzeC, s * 2.8, 5.98, 0, 1, 1, 1, 0, undefined, VM);
    rod(LB, [s * 0.3, 3.1, 0], [s * 0.3, 0.14, 0], 0.27, bronzeC, 6, 0.13, undefined, VM);
    rod(LB, [s * 0.36, 3.1, 0], [s * 1.7, 0.55, 0], 0.27, bronzeC, 6, 0.13, undefined, VM);
    LB.box(0.22, 0.14, 0.55, bronzeC, s * 0.3, 0, -0.08, 0, undefined, VM);
    LB.box(0.22, 0.14, 0.5, bronzeC, s * 1.78, 0.4, -0.08, 0, undefined, VM);
  }
  C.push({ x: vx, z: sz0, r: 2.7, top: yb + 7.4 });
  PL.push({ minx: vx - 13.5, maxx: vx + 13.5, minz: vz - 11.5, maxz: vz + 15.5, y: y0 });
  maps.blob(vx, sz0, 6, 0.35);
  for (const sx of [-1, 1]) {
    for (const oz of [-15.5, 19.5]) cyp(vx + sx * 17.5, vz + oz, 10 + Q() * 3, 1.3);
    LB.box(3.2, 0.5, 0.9, stoneC, vx + sx * 9, y0, vz - 10.9);
    C.push({ x: vx + sx * 9, z: vz - 10.9, hw: 1.7, hd: 0.5, ry: 0, top: y0 + 0.6 });
  }
}
