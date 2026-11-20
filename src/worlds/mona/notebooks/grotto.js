import * as THREE from 'three';
import { waterMaterial } from '../../../engine/paint.js';
import { patch, mix, xf } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { lump, spire, person, wings } from '../helpers.js';
import { rockC } from '../palette.js';
import { LEO } from './layout.js';

// ================= the Virgin of the Rocks: a cave of leaning stone on the lake shore
export function buildGrotto(world, kit) {
  const { S, H, maps, strokes, Q, C, PL, LB, LT, LP } = kit;
  const [cx, cz] = LEO.grotto;
  const rock = (lx, lz, h, r, sd, topR) => {
    const x = cx + lx,
      z = cz + lz,
      y = Math.max(H(x, z), -1) - 1.5;
    spire(LB, x, y, z, h + 1.5, r, sd, 0x4a4636, 0x9a8a62, topR);
    C.push({ x, z, r: r * 0.7, top: y + h * 0.75 });
  };
  rock(-8.5, 1, 13, 4.2, 1.3, 0.45);
  rock(-6.8, -4.2, 16, 4.6, 2.9, 0.4);
  rock(-11, -3.5, 10, 4, 4.4, 0.35);
  rock(-11.5, 5, 7, 3.2, 6.1, 0.3);
  rock(8.2, 0.5, 12.5, 4, 7.7, 0.45);
  rock(7.2, -4.6, 15, 4.4, 9.2, 0.4);
  rock(11.2, -2, 9, 3.8, 10.5, 0.35);
  rock(10.8, 5.5, 6, 3, 12.3, 0.3);
  rock(-1.6, -8.6, 9.5, 2.5, 14.1, 0.5);
  rock(3, -7.2, 8.2, 2.1, 15.8, 0.5);
  // out in the water, the blue stacks seen through the arches
  for (const [lx, lz, h, r, sd] of [[-3, -24, 13, 2.6, 17], [5, -31, 17, 3.2, 19], [-10, -34, 11, 2.6, 21], [13, -22, 9, 2.4, 23]]) spire(LB, cx + lx, -2.6, cz + lz, h + 3.2, r, sd, 0x4a5a52, 0x8aa09a, 0.25);
  // the roof: slabs wedged across the pillars
  lump(LB, cx, 12.8, cz - 2.5, 9.8, 2.3, 6.2, 5.5, rockC, 2, 0.45, undefined, undefined, 0.15);
  lump(LB, cx - 3.8, 10.2, cz - 7.8, 5, 1.6, 3.6, 8.1, rockC, 1, 0.5, undefined, undefined, -0.5);
  lump(LB, cx + 5, 9.4, cz - 6.6, 4.6, 1.5, 3.4, 11.7, rockC, 1, 0.5, undefined, undefined, 0.6);
  lump(LB, cx - 6, 14.6, cz + 2.4, 4, 2.2, 3.6, 13.3, rockC, 1, 0.5);
  lump(LB, cx + 6.4, 13.9, cz + 2, 3.8, 2, 3.4, 16.9, rockC, 1, 0.5);
  // the ledge they sit on
  const yl = H(cx, cz + 2.6) + 0.35;
  LB.cyl(3.4, 4, 1.1, (x, y, z) => mix(0x5a543e, 0x8a7e5a, vnoise(x + 3, z)), cx, yl - 1.1, cz + 2.6, 9);
  PL.push({ minx: cx - 2.5, maxx: cx + 2.5, minz: cz + 0.2, maxz: cz + 5, y: yl });
  const VU = person(LP, xf(cx, yl, cz + 2, 0, 1.15, 1.15, 1.15), { pose: 'kneel', robe: 0x2a4470, mantle: 0x2a4470, hair: 0x7a5a34, longHair: true, hands: [[-0.45, -0.3, 0.3], [0.25, -0.12, 0.55]], nod: 0.3, cock: 0.15 });
  LP.ball(0.16, 0xc49a3a, 0.04, 0.12, 0.2, 1.5, 0.5, 0.6, 0, undefined, VU);
  person(LP, xf(cx - 1.3, yl, cz + 3, 0.9, 0.55, 0.55, 0.55), { pose: 'kneel', robe: 0xdcb48e, hair: 0x8a6a3a, hands: [[0.18, -0.1, 0.38], [-0.18, -0.1, 0.38]], lean: 0.2 });
  person(LP, xf(cx + 1.05, yl, cz + 3.7, -1.2, 0.5, 0.5, 0.5), { pose: 'sit', robe: 0xdcb48e, hair: 0xa8823a, hands: [[0.1, 0.15, 0.35], [0.05, -0.4, 0.2]] });
  const GU = person(LP, xf(cx + 2, yl, cz + 2.5, -0.5, 1.1, 1.1, 1.1), { pose: 'kneel', robe: 0x4a6a4a, mantle: 0x9a3a2e, hair: 0xa8823a, longHair: true, hands: [[-0.5, -0.05, 0.45], [0, -0.3, 0.3]] });
  wings(LP, GU, 0.85);
  C.push({ x: cx + 0.3, z: cz + 2.4, r: 1.6, top: yl + 1.8 });
  // the dark pool before them, stones round its edge
  const px = cx + 0.3,
    pz = cz + 9;
  const pool = new THREE.Mesh(patch(px, pz, 3.5, H, 0xffffff, { lift: 0.1, rings: 3, seg: 16, wobble: 0.2 }), waterMaterial({ stroke: strokes.soft, deep: 0x0e1612, shallow: 0x24382e, reflect: 0x6a7a5a, glint: 0xd8e0b8, scale: 0.12, glintAmt: 0.5, flow: 0.002 }));
  pool.frustumCulled = false;
  S.add(pool);
  for (let k = 0; k < 15; k++) {
    const a = (k / 15) * 6.283 + Q() * 0.2,
      x = px + Math.cos(a) * (3.6 + Q() * 0.4),
      z = pz + Math.sin(a) * (3.6 + Q() * 0.4);
    lump(LB, x, H(x, z) + 0.1, z, 0.5 + Q() * 0.4, 0.32, 0.45 + Q() * 0.3, k * 2.3, rockC, 0, 0.5);
  }
  // iris, fern and palm, as he painted them leaf by leaf
  const iris = (x, z, s = 1) => {
    const y = H(x, z);
    for (let b = 0; b < 5; b++) LT.cyl(0.005, 0.055 * s, (0.6 + Q() * 0.5) * s, mix(0x3f5a2a, 0x6a8a3a, Q()), x + (Q() - 0.5) * 0.2, y, z + (Q() - 0.5) * 0.2, 3, { sway: 0.08 }, undefined, (Q() - 0.5) * 0.7, (Q() - 0.5) * 0.7);
    if (Q() < 0.6) LT.ball(0.09 * s, Q() < 0.5 ? 0x6a5aa8 : 0xe8e4d4, x, y + 0.8 * s, z, 1, 1.2, 1, 0, { sway: 0.1 });
  };
  for (let k = 0; k < 16; k++) {
    const a = Q() * 6.283,
      rr = 4.3 + Q() * 1.6;
    iris(px + Math.cos(a) * rr, pz + Math.sin(a) * rr, 0.9 + Q() * 0.6);
  }
  for (const [lx, lz, s] of [[-4.6, 3.2, 1.6], [4.8, 3.8, 1.4], [-3.4, 0.4, 1.2], [3.8, 0.2, 1.3], [-6.5, 6.5, 2.2], [6.8, 7.4, 1.8]]) {
    iris(cx + lx, cz + lz, s);
    LT.ball(0.6, 0x3f5a30, cx + lx + 0.5, H(cx + lx + 0.5, cz + lz) + 0.15, cz + lz + 0.3, 1.2, 0.35, 1.2, 0, { sway: 0.06 });
  }
  maps.blob(cx, cz - 2, 14, 0.55);
  for (let k = 0; k < 8; k++) world.glows.push({ p: [cx + (Q() - 0.5) * 10, 4 + Q() * 5, cz + (Q() - 0.5) * 9], c: 0xcfe8d8, size: 0.25, drift: 1.5 });
}
