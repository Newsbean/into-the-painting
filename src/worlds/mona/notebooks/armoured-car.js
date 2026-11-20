import { mix, xf } from '../../../engine/build.js';
import { rod, shell } from '../helpers.js';
import { woodC } from '../palette.js';
import { LEO } from './layout.js';

// ================= the armoured car: a turtle of planks on wheels, cannon all round
export function buildArmouredCar(world, kit) {
  const { H, maps, Q, C, LB, span } = kit;
  const [tx, tz] = LEO.tank;
  const g = span(tx, tz, 4.5);
  const y0 = (g.lo + g.hi) / 2;
  const M = xf(tx, y0, tz, 0.4);
  const plank = (j) => mix(j & 1 ? 0x7a5a36 : 0x8c6a42, 0x5a4026, Q() * 0.4);
  LB.cyl(3.9, 3.9, 0.12, 0x2c241a, 0, 0.38, 0, 20, undefined, M);
  shell(LB, 3.9, 0.45, 4.8, 1.75, 26, plank, M);
  LB.cyl(4.7, 4.7, 0.34, 0x2c241a, 0, 1.73, 0, 20, undefined, M);
  shell(LB, 4.8, 2.05, 1, 4.75, 26, plank, M);
  LB.cyl(4.86, 4.86, 0.13, 0x4a4438, 0, 1.98, 0, 26, undefined, M);
  LB.cyl(2.95, 2.95, 0.1, 0x4a4438, 0, 3.38, 0, 20, undefined, M);
  LB.cyl(0.95, 1.05, 0.85, woodC, 0, 4.7, 0, 10, undefined, M);
  LB.cyl(0.04, 1.2, 0.7, 0x6a5030, 0, 5.55, 0, 10, undefined, M);
  for (let k = 0; k < 4; k++) LB.box(0.34, 0.2, 0.1, 0x1c1610, Math.cos(k * 1.5708) * 1.0, 5.1, Math.sin(k * 1.5708) * 1.0, -k * 1.5708 + 1.5708, undefined, M);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * 6.2832,
      cs = Math.cos(a),
      sn = Math.sin(a);
    rod(LB, [cs * 4.2, 1.9, sn * 4.2], [cs * 5.9, 1.9, sn * 5.9], 0.15, 0x4a4030, 6, 0.12, undefined, M, true);
    rod(LB, [cs * 5.75, 1.9, sn * 5.75], [cs * 5.98, 1.9, sn * 5.98], 0.19, 0x3a3226, 6, 0.19, undefined, M, true);
  }
  for (const [wx, wz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) LB.cyl(0.9, 0.9, 0.36, woodC, wx + 0.18, 0.9, wz, 10, undefined, M, 0, Math.PI / 2);
  C.push({ x: tx, z: tz, r: 5, top: y0 + 6 });
  maps.blob(tx, tz, 7.5, 0.45);
  // shot stacked beside it
  for (const [ox, oz] of [[5.9, -4.6], [-5.5, 5.6]]) {
    const bx = tx + ox,
      bz = tz + oz,
      by = H(bx, bz);
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) LB.ball(0.3, 0x6a6458, bx + dx, by + 0.28, bz + dz, 1, 1, 1, 1);
    LB.ball(0.3, 0x7a7466, bx, by + 0.72, bz, 1, 1, 1, 1);
  }
}
