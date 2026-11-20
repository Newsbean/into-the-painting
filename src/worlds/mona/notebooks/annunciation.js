import { mix, xf } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';
import { rod, lump, person, wings } from '../helpers.js';
import { MARBLE, TERRA, stoneC, leafC } from '../palette.js';
import { LEO } from './layout.js';

// ================= the Annunciation: a walled garden, the angel kneeling to the Virgin at her lectern
export function buildAnnunciation(world, kit) {
  const { H, maps, Q, C, PL, LB, LT, LP, GQ, span, toW, cyp } = kit;
  const [gx, gz] = LEO.garden;
  const g = span(gx, gz, 9.5, 13.5);
  const y0 = g.hi + 0.15,
    base = g.lo - 1;
  // the garden's +z looks east to the hill, so from there the angel is on the left and the Virgin on the right
  const M = xf(gx, y0, gz, Math.PI / 2);
  LB.box(18.8, y0 - 0.04 - base, 26.8, stoneC, gx, base, gz);
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 13; j++) {
      const xa = gx - 9 + i * 2,
        za = gz - 13 + j * 2;
      GQ.quad([xa, y0, za], [xa, y0, za + 2], [xa + 2, y0, za + 2], [xa + 2, y0, za], mix(0x4f6a34, 0x7a8a44, Q()));
    }
  const wall = (x, z, w, d, h = 0.95) => {
    LB.box(w, h, d, stoneC, x, 0, z, 0, undefined, M);
    LB.box(w + 0.16, 0.1, d + 0.16, 0xc9bc9a, x, h, z, 0, undefined, M);
  };
  wall(-7.25, -9, 11.5, 0.45);
  wall(5, -9, 7, 0.45);
  wall(-13, 0, 0.45, 18.45);
  // the corner of the house behind her, with its quoins and dark doorway
  LB.box(4.5, 7.2, 12.5, (x, y) => mix(0xb8a888, 0x9a8a6c, clamp(0.3 - y * 0.1)), 10.75, 0, -2.75, 0, undefined, M);
  LB.hip(5.7, 13.7, 1.6, TERRA, 10.75, 7.2, -2.75, 0, undefined, M);
  for (let k = 0; k < 12; k++) LB.box(k & 1 ? 0.95 : 0.55, 0.52, k & 1 ? 0.55 : 0.95, 0xd4c8aa, 8.45 + (k & 1 ? 0.42 : 0.22), k * 0.6, 3.55 - (k & 1 ? 0.22 : 0.42), 0, undefined, M);
  LB.box(0.12, 3.3, 1.7, 0x2a241c, 8.47, 0, -2, 0, undefined, M);
  for (const s of [-1, 1]) LB.box(0.2, 3.5, 0.26, 0xd4c8aa, 8.44, 0, -2 + s * 0.98, 0, undefined, M);
  LB.box(0.22, 0.3, 2.3, 0xd4c8aa, 8.44, 3.3, -2, 0, undefined, M);
  LB.box(1.3, 1.9, 0.1, 0x3a342a, 10.75, 3.3, 3.52, 0, undefined, M);
  LB.box(1.6, 0.16, 0.2, 0xd4c8aa, 10.75, 3.14, 3.55, 0, undefined, M);
  // the Virgin, seated, right hand on the book
  LB.box(0.9, 0.5, 0.9, stoneC, 5.75, 0, 0.35, 0.35, undefined, M);
  person(LP, M.clone().multiply(xf(5.6, 0, 0.4, -Math.PI / 2 + 0.35, 1.25, 1.25, 1.25)), { pose: 'sit', robe: 0x8a3028, mantle: 0x2f4a78, hair: 0x9a7a44, longHair: true, hands: [[0.45, -0.15, 0.8], [0.12, 0, 0.3]], nod: 0.12 });
  // the marble lectern with its lion feet and scrolls
  const LM = M.clone().multiply(xf(4.55, 0, 1, 0.35));
  LB.box(1.25, 0.14, 0.85, MARBLE, 0, 0, 0, 0, undefined, LM);
  for (const [px, pz] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]]) LB.ball(0.13, MARBLE, px, 0.2, pz, 1, 1, 1, 0, undefined, LM);
  LB.ball(0.5, (x, y) => mix(0xc9c0aa, 0xe8e1d1, clamp(y + 0.5)), 0, 0.6, 0, 1.05, 0.7, 0.72, 1, undefined, LM);
  LB.box(1.35, 0.1, 0.9, MARBLE, 0, 0.9, 0, 0, undefined, LM);
  for (const s of [-1, 1]) LB.cyl(0.11, 0.11, 0.9, MARBLE, s * 0.66, 1.0, -0.45, 6, undefined, LM, Math.PI / 2, 0);
  const BK = LM.clone().multiply(xf(0.12, 1.05, 0, 0, 1, 1, 1, 0, -0.22));
  LB.box(0.62, 0.05, 0.46, 0x6a4a30, 0, 0, 0, 0, undefined, BK);
  LB.box(0.5, 0.04, 0.38, 0xeee6d2, 0, 0.05, 0, 0, undefined, BK);
  LB.box(0.02, 0.5, 0.5, 0xf2eee4, -0.69, 0.5, 0.1, 0, undefined, LM);
  // the angel, kneeling in the flowers, lily in hand
  const AU = person(LP, M.clone().multiply(xf(-5, 0, 0.9, Math.PI / 2 - 0.3, 1.25, 1.25, 1.25)), { pose: 'kneel', robe: 0xe6dfd0, mantle: 0x9a3a2e, sleeve: 0xe6dfd0, hair: 0xb08a44, longHair: true, hands: [[0.1, 0.02, 0.55], [0, -0.22, 0.32]], lean: 0.12 });
  wings(LP, AU);
  rod(LP, [0.25, 0.14, 0.32], [0.3, 1.05, 0.38], 0.016, 0x5a7a3a, 3, 0.012, undefined, AU);
  for (const [fx, fy, fz] of [[0.3, 1.02, 0.38], [0.22, 0.9, 0.42], [0.37, 0.86, 0.34]]) LP.cyl(0.075, 0.015, 0.15, 0xf4f0e4, fx, fy, fz, 5, undefined, AU);
  // flowers in the grass, lilies along the wall, dark trees beyond it
  const FL = [0xf2eee0, 0xe8c84a, 0xb8443a, 0x6a7ab8, 0xd88ab0];
  for (let k = 0; k < 70; k++) {
    const lx = -12.3 + Q() * 20,
      lz = -8.3 + Q() * 16.8;
    if (Math.hypot(lx + 5, lz - 0.9) < 1.3 || Math.hypot(lx - 5.2, lz - 0.7) < 1.8) continue;
    const w = toW(M, lx, 0.1, lz);
    LT.ball(0.1 + Q() * 0.07, FL[(Q() * FL.length) | 0], w.x, w.y, w.z, 1, 0.7, 1, 0, { sway: 0.05 });
  }
  for (let k = 0; k < 9; k++) {
    const lx = -12 + k * 2.4 + (k > 4 ? 1.6 : 0);
    if (Math.abs(lx) < 1.6) continue;
    const a = toW(M, lx, 0, -8.4),
      hh = 1 + Q() * 0.5;
    rod(LT, [a.x, a.y, a.z], [a.x, a.y + hh, a.z], 0.02, 0x5a7a3a, 3, 0.015, { sway: 0.05 });
    for (let f = 0; f < 3; f++) LT.cyl(0.08, 0.015, 0.16, 0xf4f0e4, a.x + (Q() - 0.5) * 0.2, a.y + hh - 0.05 - f * 0.16, a.z + (Q() - 0.5) * 0.2, 5, { sway: 0.06 });
    LT.ball(0.3, 0x4a6a34, a.x, a.y + 0.2, a.z, 1, 0.6, 1, 0, { sway: 0.05 });
  }
  for (let k = 0; k < 8; k++) {
    const w = toW(M, -12 + k * 3.4, 0, -12.2 + (Q() - 0.5) * 1.6);
    if (k % 3 === 1) {
      const y = H(w.x, w.z),
        s = 1.2 + Q() * 0.5;
      LT.cyl(0.12, 0.2, 3.2 * s, 0x3a2c1c, w.x, y - 0.2, w.z, 5);
      lump(LT, w.x, y + 3.4 * s, w.z, 1.9 * s, 1.5 * s, 1.9 * s, k * 3.1, leafC(0x243824, 0x4a6238), 1, 0.5, { sway: 0.2 });
      C.push({ x: w.x, z: w.z, r: 0.5, top: y + 3 });
    } else cyp(w.x, w.z, 8 + Q() * 5, 1.1 + Q() * 0.3);
  }
  PL.push({ minx: gx - 9.4, maxx: gx + 9.4, minz: gz - 13.4, maxz: gz + 13.4, y: y0 });
  C.push({ x: gx - 2.75, z: gz - 10.75, hw: 6.3, hd: 2.3, ry: 0, top: y0 + 9 });
  C.push({ x: gx - 9, z: gz + 7.25, hw: 0.3, hd: 5.75, ry: 0, top: y0 + 1.1 });
  C.push({ x: gx - 9, z: gz - 5, hw: 0.3, hd: 3.5, ry: 0, top: y0 + 1.1 });
  C.push({ x: gx, z: gz + 13, hw: 9.3, hd: 0.3, ry: 0, top: y0 + 1.1 });
  const lw = toW(M, 4.55, 0, 1),
    vw = toW(M, 5.7, 0, 0.4),
    aw = toW(M, -5, 0, 0.9);
  C.push({ x: lw.x, z: lw.z, r: 0.8, top: y0 + 1.3 }, { x: vw.x, z: vw.z, r: 0.6, top: y0 + 1.9 }, { x: aw.x, z: aw.z, r: 0.7, top: y0 + 1.9 });
  maps.blob(gx - 2.75, gz - 10.75, 9, 0.4);
}
