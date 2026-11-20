import * as THREE from 'three';
import { waterMaterial } from '../../../engine/paint.js';
import { mix, jitter, xf } from '../../../engine/build.js';
import { vnoise, clamp } from '../../../engine/gl.js';
import { WL, BRIDGE_X, channel } from '../terrain.js';
import { cart, boat, farm } from '../helpers.js';
import { person } from '../people.js';

// ---- the canal with the Langlois drawbridge, widening into Starry Night Over the Rhône
export function canalRhone(world, { S, H, maps, strokes, B, P, F, R, open, nearRoad, gasLamp, tree }) {
  // where the water meets the bank, walking out from mid-stream (side 1 = south)
  const shore = (x, side) => {
    const c = channel(x);
    let z = c.zc + side * c.hw;
    for (let i = 0; i < 60 && H(x, z) < WL + 0.12; i++) z += side * 0.2;
    return z;
  };
  const wp = [];
  for (let x = -64; x < 123.9; x += 4) {
    const a = channel(x),
      b = channel(x + 4);
    const a0 = a.zc - a.hw - a.bk,
      a1 = a.zc + a.hw + a.bk,
      b0 = b.zc - b.hw - b.bk,
      b1 = b.zc + b.hw + b.bk;
    wp.push(x, WL, a0, x, WL, a1, x + 4, WL, b1, x, WL, a0, x + 4, WL, b1, x + 4, WL, b0);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  const water = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.oil, deep: 0x0a1a4a, shallow: 0x1f4aa0, reflect: 0x3a6ac0, glint: 0xffe9a0, scale: 0.1, glintAmt: 1.3, flow: 0.008 }));
  water.frustumCulled = false;
  S.add(water);

  // -- the drawbridge: stone abutments, two timber leaves, the frames with their balance beams and chains
  const BX = BRIDGE_X,
    DY = WL + 2.1,
    zS = -114.4,
    zN = -131.6;
  const stone = (px, py) => mix(0xd9b85a, 0xa88a4a, clamp(0.5 - py / 3.5)),
    TIM = (px, py, pz) => mix(0xb88a3a, 0x7a5a2a, vnoise(px * 3 + pz, py * 2 + pz));
  for (const [za, zb] of [[-118.8, zS], [zN, -127.2]]) {
    const zm = (za + zb) / 2;
    B.box(5.6, 3.5, zb - za, stone, BX, DY - 3.5, zm);
    for (const sx of [-1, 1]) {
      B.box(0.4, 0.8, zb - za, 0xe0c46a, BX + sx * 2.6, DY, zm);
      world.colliders.push({ x: BX + sx * 2.6, z: zm, hw: 0.25, hd: (zb - za) / 2, ry: 0, top: DY + 0.8, bottom: DY - 0.3 });
    }
  }
  for (const zm of [-121, -125.1]) B.box(4.8, 0.24, 4.15, (px, py, pz) => mix(0x8a6a48, 0xb0905a, vnoise(px * 2.2, pz * 0.4 + zm)), BX, DY - 0.24, zm);
  for (const [fz, sg] of [[-118.9, 1], [-127.1, -1]]) {
    for (const sx of [-1, 1]) {
      const px = BX + sx * 2.45;
      B.box(0.3, 4.6, 0.3, TIM, px, DY, fz);
      B.add(new THREE.BoxGeometry(0.16, 3.6, 0.16), TIM, xf(px, DY + 1.5, fz + sg * 1.0, 0, 1, 1, 1, -sg * 0.588));
      B.add(new THREE.BoxGeometry(0.22, 0.24, 8.2), TIM, xf(px, DY + 4.95, fz + sg * 0.9, 0, 1, 1, 1, sg * 0.13));
      B.box(0.5, 0.5, 1.0, 0x5a4a3a, px, DY + 4.05, fz + sg * 4.6);
      B.cyl(0.03, 0.03, 5.4, 0x23232c, BX + sx * 2.3, DY + 0.05, fz - sg * 3.17, 3);
    }
    B.box(5.5, 0.28, 0.3, TIM, BX, DY + 4.6, fz);
    B.box(5.1, 0.14, 0.14, TIM, BX, DY + 5.38, fz - sg * 3.17);
  }
  (world.platforms ??= []).push({ minx: BX - 2.4, maxx: BX + 2.4, minz: zN, maxz: zS, y: DY });
  // the little yellow cart crossing, driver up
  cart(P, BX + 1.3, DY, -120.2, Math.PI, { horse: 1 });
  person(P, BX + 1.3, DY + 0.76, -119.9, Math.PI, { sit: 1, coat: 0x2f4fa8, hat: 'straw' });
  world.colliders.push({ x: BX + 1.3, z: -121.2, hw: 0.75, hd: 2.6, ry: 0, top: DY + 2.3, bottom: DY - 0.3 });
  // washerwomen at the water's edge below it
  [18.2, 20.0, 21.9].forEach((x, k) => {
    const z = shore(x, 1) + 0.25;
    person(P, x, H(x, z), z, Math.PI + (R() - 0.5) * 0.5, { dress: 1, coat: [0x2f4fa8, 0xc85a6a, 0x3a7a6a][k], skirt: [0x23408a, 0x8a3a4a, 0x2a5a5a][k], bend: 0.95, reach: 0.5, hat: 'cap', hatCol: 0xf4f0e6 });
    P.box(0.5, 0.06, 0.34, 0xf2f0e6, x + 0.1, H(x, z - 0.7) + 0.02, z - 0.7, R() * 3);
  });
  tree(31.8, -133.6, 9.5, 1.3);
  tree(33.7, -135.4, 7.5, 1.1);

  // -- the Rhône: gas lamps along the town bank, each dragging a long yellow reflection over the water
  for (let x = 50; x <= 114; x += 8) {
    const c = channel(x),
      z = c.zc + c.hw + c.bk + 1.8;
    gasLamp(x, z, 4.8, 0xffc23a, 3.6, 11, 0.9);
    const z0 = shore(x, 1);
    for (let k = 0; k < 18; k++) {
      const zz = z0 - 1.4 - k * 1.7 - R() * 0.5,
        ww = (1.7 - k * 0.06) * (0.6 + R() * 0.6),
        ox = (R() - 0.5) * 0.8,
        yy = WL + 0.04;
      if (zz < c.zc - c.hw + 2) break;
      F.quad([x + ox - ww, yy, zz - 0.6], [x + ox - ww, yy, zz + 0.6], [x + ox + ww, yy, zz + 0.6], [x + ox + ww, yy, zz - 0.6], k % 3 === 2 ? 0xff9a2a : 0xffd03a, 0.9 - k * 0.03);
      if (k % 2 === 0) maps.lamp(x, zz, 3.6 - k * 0.1, 0xffc23a, 0.85 - k * 0.035);
    }
    // the town behind the lamps
    const hx = x + 3 + (R() - 0.5) * 3,
      hz = z + 8.5 + R() * 3;
    if (open(hx, hz, 5.5) && !nearRoad(hx, hz, 6))
      farm(B, world, hx, hz, Math.PI + (R() - 0.5) * 0.3, R, { wall: jitter([0x3d5a9c, 0x5a6fa8, 0x6a5aa0, 0x4a7a8a][(x / 8) & 3], R, 0.1), roof: [0x27408c, 0xb23a2c, 0x35307a][(x / 8) % 3 | 0], lit: 0.85, h: 3.6 + R() * 2.4 });
  }
  // two boats moored afloat just off the near bank, a post to tie them to, and the couple who walk there
  const b1 = shore(78, -1);
  boat(F, 76.4, WL - 0.02, b1 + 2.6, 1.0);
  boat(F, 81.4, WL - 0.02, b1 + 2.9, 1.25, 0x234a3a, 0xe0b040);
  P.cyl(0.07, 0.09, 1.0, 0x5a4030, 79, H(79, b1 - 1.2) - 0.1, b1 - 1.2, 5);
  const c9 = channel(90),
    cz = c9.zc - c9.hw - c9.bk - 0.7; // the flat top of the bank
  person(P, 90, H(90, cz), cz, 2.6, { coat: 0x2a3f8a, hat: 'straw' });
  person(P, 90.75, H(90.75, cz + 0.15), cz + 0.15, 2.7, { dress: 1, coat: 0x3a6a8a, skirt: 0x2f4a7a, hat: 'cap', hatCol: 0xd9c890 });
}
