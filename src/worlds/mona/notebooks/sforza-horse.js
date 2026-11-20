import { xf } from '../../../engine/build.js';
import { lerp } from '../../../engine/gl.js';
import { rod, beam, lump, person } from '../helpers.js';
import { DARK, stoneC, woodC, clayC } from '../palette.js';
import { LEO } from './layout.js';

// ================= the Sforza horse: the clay colossus, still in its scaffold
export function buildSforzaHorse(world, kit) {
  const { H, maps, C, LB, LP, span } = kit;
  const [hx, hz] = LEO.horse;
  const g = span(hx, hz, 6.5, 3.5);
  const y0 = g.lo - 0.4;
  const M = xf(hx, y0, hz);
  LB.box(12, 0.9, 5.4, stoneC, 0, 0, 0, 0, undefined, M);
  LB.box(10.8, 1.95, 4.4, stoneC, 0, 0.9, 0, 0, undefined, M);
  LB.box(11.3, 0.3, 4.9, 0xc9bc9a, 0, 2.8, 0, 0, undefined, M);
  const HM = xf(hx, y0 + 3.1, hz);
  lump(LB, 0, 4.25, 0, 2.5, 1.25, 1.05, 3.1, clayC, 2, 0.12, undefined, HM, 0);
  lump(LB, 1.75, 4.35, 0, 1.25, 1.45, 1.08, 5.2, clayC, 1, 0.12, undefined, HM, 0);
  lump(LB, -1.95, 4.45, 0, 1.45, 1.45, 1.12, 7.7, clayC, 1, 0.12, undefined, HM, 0);
  rod(LB, [2.2, 4.8, 0], [3.75, 7.05, 0], 0.98, clayC, 8, 0.52, undefined, HM);
  beam(LB, [2.15, 5.7, 0], [3.7, 7.6, 0], 0.2, 0.5, 0x8a7052, undefined, HM);
  rod(LB, [3.5, 7.2, 0], [4.75, 6.05, 0], 0.52, clayC, 7, 0.3, undefined, HM, true);
  LB.ball(0.33, clayC, 4.82, 5.98, 0, 1, 1, 0.9, 1, undefined, HM);
  LB.ball(0.55, clayC, 3.6, 7.1, 0, 1, 1, 0.8, 1, undefined, HM);
  for (const s of [-1, 1]) LB.cyl(0.01, 0.13, 0.42, clayC, 3.45, 7.5, s * 0.24, 4, undefined, HM);
  const leg = (pts, z) => {
    const rr = [0.46, 0.27, 0.17, 0.2];
    for (let i = 0; i < pts.length - 1; i++) rod(LB, [pts[i][0], pts[i][1], z], [pts[i + 1][0], pts[i + 1][1], z], rr[i], clayC, 6, rr[i + 1], undefined, HM, true);
    for (let i = 1; i < pts.length - 1; i++) LB.ball(rr[i] * 1.12, clayC, pts[i][0], pts[i][1], z, 1, 1, 1, 0, undefined, HM);
    const e = pts[pts.length - 1];
    LB.cyl(0.2, 0.27, 0.28, 0x7a6248, e[0], e[1] - 0.26, z, 6, undefined, HM);
  };
  leg([[-2.2, 3.9], [-2.75, 2.15], [-2.45, 0.42], [-2.42, 0.26]], -0.6);
  leg([[-2.2, 3.9], [-3.3, 2.25], [-3.55, 0.6], [-3.5, 0.3]], 0.6);
  leg([[1.9, 3.7], [2.0, 1.95], [2.0, 0.42], [2.03, 0.26]], -0.55);
  leg([[1.9, 3.7], [3.05, 2.8], [2.8, 1.5], [2.92, 1.25]], 0.55);
  rod(LB, [-3.2, 5.15, 0], [-4.15, 3.7, 0], 0.3, 0x8a7052, 5, 0.2, undefined, HM);
  rod(LB, [-4.15, 3.7, 0], [-4.3, 2.3, 0], 0.2, 0x8a7052, 5, 0.06, undefined, HM);
  // poles, ledgers, braces, planks, ladders and a hoist
  const pole = (a, b, r = 0.09) => rod(LB, a, b, r, woodC, 4, r, undefined, M);
  const xs = [-6.6, -3.3, 0, 3.3, 6.6];
  for (const sz of [-1, 1]) {
    for (const x of xs) pole([x, 0.2, sz * 3.5], [x, 13, sz * 3.5], 0.1);
    for (const y of [4.2, 7.4, 10.6]) pole([-7.1, y, sz * 3.5], [7.1, y, sz * 3.5]);
    for (let i = 0; i < 4; i++) pole([xs[i], i & 1 ? 4.2 : 7.4, sz * 3.5], [xs[i + 1], i & 1 ? 7.4 : 4.2, sz * 3.5], 0.06);
  }
  for (const x of xs) pole([x, 12.2, -3.9], [x, 12.2, 3.9]);
  for (const x of [-6.6, 6.6]) for (const y of [4.2, 7.4, 10.6]) pole([x, y, -3.5], [x, y, 3.5]);
  LB.box(13.6, 0.08, 1.1, 0x8e6c44, 0, 7.45, 2.9, 0, undefined, M);
  LB.box(13.6, 0.08, 1.1, 0x86643e, 0, 4.25, -2.9, 0, undefined, M);
  LB.box(6.9, 0.08, 1.1, 0x8e6c44, 3.3, 10.65, -2.9, 0, undefined, M);
  const ladder = (x0, ya, x1, yb, z) => {
    for (const s of [-0.3, 0.3]) pole([x0, ya, z + s], [x1, yb, z + s], 0.05);
    for (let k = 1; k < 9; k++) pole([lerp(x0, x1, k / 9), lerp(ya, yb, k / 9), z - 0.3], [lerp(x0, x1, k / 9), lerp(ya, yb, k / 9), z + 0.3], 0.035);
  };
  ladder(8.8, 0.4, 7.0, 4.3, -2.9);
  ladder(-9.4, 0.4, -7.0, 7.5, 2.9);
  beam(LB, [-3.3, 12.2, 0], [1.6, 14.8, 0], 0.22, 0.22, DARK, undefined, M);
  pole([-3.3, 12.2, 0], [-3.3, 14.4, 0], 0.08);
  pole([-3.3, 14.4, 0], [1.6, 14.8, 0], 0.03);
  pole([1.6, 14.8, 0], [1.6, 12.4, 0], 0.025);
  LB.cyl(0.32, 0.26, 0.45, 0x6a5030, 1.6, 12.0, 0, 7, undefined, M);
  person(LP, M.clone().multiply(xf(2.4, 7.53, 2.9, Math.PI)), { robe: 0x5a5a3a, hands: [[-0.1, 0.35, 0.4], [0.1, -0.1, 0.4]], nod: -0.2 });
  person(LP, M.clone().multiply(xf(9.8, 0.4, 2.2, -1.9)), { robe: 0x4a3a5a, mantle: 0x7a3a2a, hands: [[-0.2, 0.3, 0.35], [0.08, -0.5, 0.1]], nod: -0.45 });
  for (const [ox, oz, s] of [[8.6, -4.6, 0.8], [9.6, -3.9, 0.55], [-8.4, 4.4, 0.7]]) lump(LB, hx + ox, H(hx + ox, hz + oz) + s * 0.3, hz + oz, s * 1.2, s * 0.7, s, ox, clayC, 1, 0.4);
  C.push({ x: hx, z: hz, hw: 6.1, hd: 2.8, ry: 0, top: y0 + 3.3 });
  C.push({ x: hx, z: hz, hw: 4.7, hd: 1.3, ry: 0, top: y0 + 11.2, bottom: y0 + 3.3 });
  maps.blob(hx, hz, 10, 0.45);
}
