import * as THREE from 'three';
import { mix, xf } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { person } from '../helpers.js';
import { DARK, TERRA, stoneC } from '../palette.js';
import { LEO } from './layout.js';

// ================= the Last Supper: the refectory with one wall away, the table as he set it
export function buildLastSupper(world, kit) {
  const { maps, Q, C, PL, LB, LP, SQ, span } = kit;
  const [sx0, sz0] = LEO.supper;
  const g = span(sx0, sz0 + 1, 18, 8);
  const yf = g.hi + 0.6,
    base = g.lo - 1;
  const M = xf(sx0, yf, sz0);
  LB.box(34, yf - 0.02 - base, 12, stoneC, sx0, base, sz0);
  LB.box(34, yf - 0.2 - base, 1, stoneC, sx0, base, sz0 + 6.5);
  LB.box(34, yf - 0.4 - base, 1, stoneC, sx0, base, sz0 + 7.5);
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 5; j++) {
      const xa = sx0 - 16 + i * 2,
        za = sz0 - 5 + j * 2.2;
      SQ.quad([xa, yf, za], [xa, yf, za + 2.2], [xa + 2, yf, za + 2.2], [xa + 2, yf, za], mix((i + j) & 1 ? 0xb4a684 : 0xc8ba98, 0x9a8c6c, Q() * 0.4));
    }
  const WH = 7.5;
  const plaster = (x, y, z) => mix(0xc6b794, 0xb09f7a, vnoise(x * 0.4 + z * 0.3, y * 0.4));
  // the back wall and its three windows onto the country beyond
  const bw = (x0, x1, ya, yb) => LB.box(x1 - x0, yb - ya, 0.6, plaster, (x0 + x1) / 2, ya, -5.3, 0, undefined, M);
  bw(-16.6, -4.6, 0, WH);
  bw(4.6, 16.6, 0, WH);
  bw(-2.6, -1.4, 0, WH);
  bw(1.4, 2.6, 0, WH);
  for (const s of [-1, 1]) {
    bw(s * 3.6 - 1, s * 3.6 + 1, 0, 1.3);
    bw(s * 3.6 - 1, s * 3.6 + 1, 4.3, WH);
  }
  bw(-1.4, 1.4, 0, 1.0);
  bw(-1.4, 1.4, 4.8, WH);
  LB.add(new THREE.TorusGeometry(1.55, 0.13, 5, 12, Math.PI), 0x9a8c6c, M.clone().multiply(xf(0, 4.9, -4.96)));
  for (const [wx, ww, wa, wb] of [[-3.6, 2, 1.3, 4.3], [0, 2.8, 1.0, 4.8], [3.6, 2, 1.3, 4.3]]) {
    LB.box(ww + 0.3, 0.14, 0.76, 0x9a8c6c, wx, wa - 0.04, -5.3, 0, undefined, M);
    LB.box(ww + 0.3, 0.14, 0.76, 0x9a8c6c, wx, wb - 0.1, -5.3, 0, undefined, M);
  }
  // side walls hung with dark tapestries
  for (const s of [-1, 1]) {
    LB.box(0.6, WH, 11.2, plaster, s * 16.3, 0, 0, 0, undefined, M);
    for (let k = 0; k < 4; k++) {
      LB.box(0.08, 3.5, 1.8, [0x5c4a3a, 0x48584a, 0x6a3c32, 0x3c4a5a][(k + (s > 0 ? 1 : 0)) % 4], s * 15.96, 2, -3.75 + k * 2.5, 0, undefined, M);
      LB.box(0.1, 0.1, 2, DARK, s * 15.95, 5.5, -3.75 + k * 2.5, 0, undefined, M);
    }
    LB.box(0.8, 6.7, 0.8, stoneC, s * 10.8, 0, 5.2, 0, undefined, M);
    C.push({ x: sx0 + s * 16.3, z: sz0, hw: 0.4, hd: 5.7, ry: 0, top: yf + 11 });
    C.push({ x: sx0 + s * 10.8, z: sz0 + 5.2, r: 0.55, top: yf + 7 });
  }
  LB.box(33.2, 0.8, 0.7, 0x4a3420, 0, 6.7, 5.25, 0, undefined, M);
  // coffered ceiling under a tiled roof
  LB.box(33.8, 0.3, 11.8, 0x3a2a1c, 0, WH, 0, 0, undefined, M);
  for (const z of [-4, -2, 0, 2, 4]) LB.box(32, 0.3, 0.26, 0x4a3420, 0, WH - 0.3, z, 0, undefined, M);
  for (let x = -14; x <= 14; x += 3.5) LB.box(0.26, 0.3, 10.4, 0x4a3420, x, WH - 0.3, 0, 0, undefined, M);
  LB.gable(12.8, 35, 2.9, TERRA, 0, WH + 0.3, 0, Math.PI / 2, undefined, M);
  // the table: white cloth with its pressed folds, pewter, bread, glasses
  const TZ0 = -1.6,
    PEWTER = 0x9a9684;
  LB.box(17.4, 0.07, 1.5, 0xe9e2d0, 0, 0.95, TZ0, 0, undefined, M);
  LB.box(17.4, 0.6, 0.05, 0xe2dac6, 0, 0.37, TZ0 + 0.76, 0, undefined, M);
  for (const s of [-1, 1]) {
    LB.box(0.05, 0.6, 1.5, 0xe2dac6, s * 8.7, 0.37, TZ0, 0, undefined, M);
    LB.box(0.14, 0.076, 1.52, 0x5a6a8a, s * 8.1, 0.95, TZ0, 0, undefined, M);
    LB.box(0.14, 0.6, 0.06, 0x5a6a8a, s * 8.1, 0.37, TZ0 + 0.765, 0, undefined, M);
  }
  for (let x = -7.25; x < 8; x += 1.45) LB.box(0.035, 0.6, 0.062, 0xc9c1ab, x, 0.37, TZ0 + 0.765, 0, undefined, M);
  for (const x of [-7.4, -2.5, 2.5, 7.4]) LB.box(0.16, 0.95, 1.2, DARK, x, 0, TZ0, 0, undefined, M);
  LB.box(17, 0.45, 0.5, DARK, 0, 0, -2.85, 0, undefined, M);
  for (let i = -6; i <= 6; i++) {
    const x = i * 1.3;
    LB.cyl(0.17, 0.15, 0.025, PEWTER, x + 0.05, 1.02, TZ0 + 0.2, 8, undefined, M);
    LB.cyl(0.04, 0.035, 0.11, 0xa8c0b8, x + 0.4, 1.02, TZ0 + 0.05, 5, undefined, M);
    LB.ball(0.075, 0xc9a465, x - 0.35 + Q() * 0.2, 1.07, TZ0 + 0.3 + Q() * 0.25, 1.2, 0.8, 1, 0, undefined, M);
  }
  for (const x of [-3.9, 0, 3.9]) {
    LB.cyl(0.32, 0.28, 0.04, PEWTER, x, 1.02, TZ0 + 0.45, 10, undefined, M);
    for (let k = 0; k < 3; k++) LB.ball(0.08, x === 0 ? 0xb8905a : 0xc9783a, x + Math.cos(k * 2.1) * 0.13, 1.1, TZ0 + 0.45 + Math.sin(k * 2.1) * 0.13, 1, 1, 1, 0, undefined, M);
  }
  // thirteen at table, in his groups of three either side of the still centre
  const seat = (i, o) => person(LP, M.clone().multiply(xf(i * 1.3, 0, o.pose === 'stand' ? -2.6 : -2.72, 0, 1.2, 1.2, 1.2)), { pose: 'sit', ...o });
  seat(-6, { pose: 'stand', robe: 0x3f6a6a, mantle: 0x5a6a3a, hair: 0x4a3422, beard: true, tilt: -0.1, lean: 0.32, turn: 0.25, hands: [[-0.05, -0.32, 0.55], [0.05, -0.32, 0.55]] });
  seat(-5, { robe: 0x9a5a48, hair: 0x6a4a2a, tilt: -0.15, hands: [[0.15, -0.1, 0.32], [0.55, 0.05, 0.3]] });
  seat(-4, { robe: 0x7a7a3a, mantle: 0xb08a3a, hair: 0xa8a094, beard: true, hands: [[-0.1, 0.08, 0.38], [0.1, 0.08, 0.38]] });
  seat(-3, { robe: 0x33414f, mantle: 0x46564a, hair: 0x2a2018, beard: true, lean: -0.14, tilt: 0.08, turn: 0.5, hands: [[-0.05, -0.14, 0.52], [0.2, -0.13, 0.45]] });
  seat(-2, { robe: 0x3a557e, mantle: 0xb08a3a, hair: 0xb8b0a0, beard: true, tilt: -0.3, lean: 0.2, hands: [[0.3, -0.05, 0.25], [0.5, 0, 0.35]] });
  seat(-1, { robe: 0x3f6a6a, mantle: 0xa04a3a, hair: 0x8a5a30, longHair: true, tilt: 0.32, nod: 0.25, hands: [[0.05, -0.14, 0.45], [-0.05, -0.14, 0.45]] });
  person(LP, M.clone().multiply(xf(0, 0, -2.72, 0, 1.25, 1.25, 1.25)), { pose: 'sit', robe: 0x9a3a2e, mantle: 0x34507a, hair: 0x5a3a22, longHair: true, beard: true, hands: [[-0.32, -0.16, 0.62], [0.32, -0.16, 0.62]], nod: 0.18, cock: 0.12 });
  seat(1, { robe: 0x6a7a4a, mantle: 0xa8843a, hair: 0x5a4028, beard: true, tilt: 0.15, hands: [[-0.05, -0.13, 0.42], [0, 0.4, 0.2]] });
  seat(2, { robe: 0x5a7a5a, hair: 0x6a4a2a, lean: -0.08, hands: [[-0.6, -0.08, 0.25], [0.6, -0.08, 0.25]] });
  seat(3, { pose: 'stand', robe: 0xb8603a, mantle: 0x3a557e, hair: 0x7a5a34, tilt: 0.2, lean: 0.25, hands: [[0.14, -0.2, 0.2], [-0.14, -0.2, 0.2]] });
  seat(4, { robe: 0x3a6a8a, hair: 0x5a4028, turn: 0.5, hands: [[-0.6, 0, 0.25], [-0.4, -0.05, 0.4]] });
  seat(5, { robe: 0x8a6a3a, mantle: 0x7a4a3a, hair: 0x8a8274, beard: true, turn: 0.4, hands: [[-0.3, -0.1, 0.35], [0.1, -0.02, 0.35]] });
  seat(6, { robe: 0xd8d0c0, mantle: 0x9a8aa0, hair: 0xa8a094, beard: true, turn: -0.5, hands: [[-0.2, -0.12, 0.5], [0.15, -0.12, 0.5]] });
  LB.ball(0.08, 0x6a5a3a, -3 * 1.3 - 0.3, 1.1, TZ0 - 0.25, 1, 1.2, 1, 0, undefined, M);
  C.push({ x: sx0, z: sz0 - 5.3, hw: 16.8, hd: 0.45, ry: 0, top: yf + 11 });
  C.push({ x: sx0, z: sz0 - 1.6, hw: 8.8, hd: 0.8, ry: 0, top: yf + 1.1 });
  C.push({ x: sx0, z: sz0 - 2.8, hw: 8.6, hd: 0.45, ry: 0, top: yf + 2.1 });
  C.push({ x: sx0, z: sz0, hw: 17.4, hd: 6.4, ry: 0, top: yf + 11, bottom: yf + 7.3 });
  PL.push({ minx: sx0 - 17, maxx: sx0 + 17, minz: sz0 - 6, maxz: sz0 + 6, y: yf });
  PL.push({ minx: sx0 - 17, maxx: sx0 + 17, minz: sz0 + 6, maxz: sz0 + 7, y: yf - 0.2 });
  PL.push({ minx: sx0 - 17, maxx: sx0 + 17, minz: sz0 + 7, maxz: sz0 + 8, y: yf - 0.4 });
  maps.lamp(sx0, sz0 - 1, 15, 0xffe2a8, 0.5);
  maps.blob(sx0, sz0, 16, 0.3);
}
