import * as THREE from 'three';
import { Builder, terrain, ribbon, patch, mountainRing, blobTree, house, figure, mix, jitter, xf } from '../../engine/build.js';
import { fbm, vnoise, smooth, clamp } from '../../engine/gl.js';
import { BRICK, ROOF } from './palette.js';

// Delft: the cobbles and the polder, the canal houses, the market square, the
// Nieuwe Kerk, the windmill, the trees and the townsfolk. Everything built goes
// into kit.B (index.js bakes it); the calls are in index.js, in order.

// ---------------- ground: cobbled town, green polder beyond
export function addGround(world, kit) {
  const { strokes, S, soft } = kit;
  const groundCol = (x, z, y) => {
    const town = 1 - smooth(105, 140, Math.hypot(x, z * 1.1));
    const cob = mix(0xa89878, 0xc9b592, vnoise(x * 0.3, z * 0.3));
    const pol = mix(0x7f9a4a, 0xb0b458, vnoise(x * 0.02, z * 0.04));
    const c = pol.lerp(cob, town);
    if (y < -0.4) c.lerp(new THREE.Color(0x5a4a3a), 0.7);
    return c;
  };
  S.add(new THREE.Mesh(terrain((x, z) => world.baseH(x, z), 420, 230, groundCol, 0.72, 2.2), soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.26, hueVar: 0.2 })));
}

// canal houses: tall, narrow, stepped gables to the water
export function addCanalHouses(world, kit) {
  const { R, B, proxy } = kit;
  const placed = [];
  const rowOf = (z0, face, x0, x1, skip) => {
    let x = x0;
    while (x < x1) {
      const w = 5.2 + R() * 2.6;
      const cx = x + w / 2;
      x += w + 0.25;
      if (skip(cx)) continue;
      const d = 9 + R() * 3,
        h = 7.6 + R() * 5.2;
      house(B, proxy, {
        R, x: cx, z: z0 + (face > 0 ? -d / 2 : d / 2), ry: face > 0 ? 0 : Math.PI, w, d, h,
        roofType: R() < 0.7 ? 'step' : 'gable', roofH: w * 0.62, over: 0.15, ridgeAlongX: false,
        wall: jitter(BRICK[(R() * BRICK.length) | 0], R, 0.07), roof: ROOF[(R() * ROOF.length) | 0], trim: 0xe9e0cc,
        shutters: R() < 0.6 ? [0x7c2a22, 0x2f5a3a, 0x24405a][(R() * 3) | 0] : null, winH: 1.75, winW: 0.95, lit: 0.3, chimneyChance: 0.5, doorCol: 0x2a3a2c,
      });
      placed.push([cx, z0 + (face > 0 ? -d / 2 : d / 2), 6]);
    }
  };
  rowOf(-15.5, 1, -138, 132, (x) => x > 25 && x < 44); // north bank faces +z (the canal); gap for Vermeer's house
  rowOf(15.5, -1, -138, 132, (x) => (x > -62 && x < -28) || Math.abs(x) < 9 || Math.abs(x + 64) < 4.5); // south bank, gap for the market street
  rowOf(-44, 1, -110, 110, (x) => x > 14 && x < 54);
  rowOf(70, -1, -20, 110, () => false);
}

// ---------------- market square
export function addMarket(world, kit) {
  const { strokes, R, S, H, maps, soft, B, MX, MZ } = kit;
  const GB = new Builder();
  GB.parts.push(patch(MX, MZ, 23, H, (x, y, z) => mix(0xb8a480, 0xd6c098, vnoise(x * 0.4, z * 0.4)), { lift: 0.07, wobble: 0.05, sx: 1, sz: 0.9 }));
  GB.parts.push(ribbon([[-45, 16], [-45, 30]], 9, H, 0xbfa986, { lift: 0.06 }));
  S.add(GB.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5 })));
  const AWN = [0xb2452f, 0xe6d9b0, 0x2f5f8a, 0xd9a83a, 0x4a7a4a, 0xe6d9b0];
  const GOODS = [[0xe8c84a, 0xf0d870], [0xd9443a, 0xf0b0c0, 0xf2d04a], [0xb9c4cc, 0x8fa0aa], [0x9a5a2a, 0xc98a4a], [0x2f5fd0, 0xd9a83a, 0xb0362e, 0x3a8a5a, 0xf2f0e0]];
  world.stalls = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const x = MX + Math.cos(a) * 13,
      z = MZ + Math.sin(a) * 11;
    const ry = -a + Math.PI / 2;
    const M = xf(x, 0, z, ry);
    B.box(3.6, 0.9, 1.5, 0x7a5a3a, 0, 0, 0, 0, undefined, M);
    for (const [px, pz] of [[-1.7, -0.7], [1.7, -0.7], [-1.7, 0.7], [1.7, 0.7]]) B.cyl(0.06, 0.06, 2.9, 0x4a3626, px, 0, pz, 5, undefined, M);
    B.gable(2.2, 4.2, 0.7, AWN[i], 0, 2.9, 0, Math.PI / 2, { sway: 0.03 }, M);
    const goods = GOODS[i % GOODS.length];
    for (let k = 0; k < 9; k++) B.ball(0.2 + R() * 0.08, goods[(R() * goods.length) | 0], -1.4 + (k % 5) * 0.7, 1.08, k < 5 ? -0.3 : 0.35, 1, 0.9, 1, 1, undefined, M);
    world.colliders.push({ x, z, hw: 1.9, hd: 0.9, ry, top: 2.6 });
    maps.blob(x, z, 3.5, 0.35);
    world.stalls.push([x, z]);
  }
  // town pump in the middle
  B.cyl(0.35, 0.45, 2.2, 0x8a8a84, MX, 0, MZ, 8);
  B.cyl(1.5, 1.6, 0.5, 0x9a9488, MX, 0, MZ, 12);
  world.colliders.push({ x: MX, z: MZ, r: 1.7, top: 2 });
}

// ---------------- Nieuwe Kerk
export function addChurch(world, kit) {
  const { B, maps } = kit;
  const cx = -45,
    cz = 92;
  B.box(8, 22, 8, (x, y) => mix(0x8a4a34, 0xa86244, clamp(y / 22 + 0.5)), cx, 0, cz);
  B.box(6.4, 12, 6.4, 0xd9d0b8, cx, 22, cz);
  B.cyl(2.6, 3.1, 8, 0xd9d0b8, cx, 34, cz, 8);
  B.cyl(0.05, 2.7, 13, 0x4a5058, cx, 42, cz, 8);
  B.box(18, 12, 9, 0x9a5a40, cx + 13, 0, cz);
  B.gable(9.6, 18.6, 6, 0x4a4a52, cx + 13, 12, cz, Math.PI / 2);
  world.colliders.push({ x: cx, z: cz, hw: 4.2, hd: 4.2, ry: 0, top: 54 }, { x: cx + 13, z: cz, hw: 9.2, hd: 4.7, ry: 0, top: 18 });
  for (const [ox, oz] of [[0, 4.05], [0, -4.05]]) B.box(1.4, 3.4, 0.14, 0x232a3a, cx + ox, 12, cz + oz);
  maps.blob(cx + 6, cz, 16, 0.4);
}

// ---------------- windmill on the edge of town
export function addWindmill(world, kit) {
  const { S, maps, soft, B } = kit;
  const wx = 104,
    wz = 62;
  B.cyl(2.6, 4.6, 13, (x, y) => mix(0x6a4a34, 0x9a7a54, clamp(y / 13 + 0.5)), wx, 0, wz, 8);
  B.cyl(0.4, 2.9, 3, 0x4a3a30, wx, 13, wz, 8);
  world.colliders.push({ x: wx, z: wz, r: 4.4, top: 16 });
  const sails = new Builder();
  for (let i = 0; i < 4; i++) {
    const M = xf(0, 0, 0, 0, 1, 1, 1, 0, (i * Math.PI) / 2);
    sails.box(0.3, 10.5, 0.3, 0x4a3626, 0, 0.5, 0, 0, undefined, M);
    sails.box(2.2, 8.2, 0.08, 0xe9dfc4, 1.2, 2.3, 0, 0, undefined, M);
  }
  world.sails = sails.mesh(soft({ objSpace: 1, scale: 0.5 }));
  world.sails.position.set(wx - 3.1, 13.6, wz);
  world.sails.rotation.y = Math.PI / 2;
  S.add(world.sails);
  maps.blob(wx, wz, 9, 0.4);
}

// ---------------- trees and townsfolk
export function addTreesAndTownsfolk(world, kit) {
  const { strokes, R, S, H, maps, soft } = kit;
  const T = new Builder();
  for (let x = -132; x <= 132; x += 15) {
    for (const sz of [-1, 1]) {
      if ((Math.abs(x) < 8 || Math.abs(x + 64) < 8) || (sz < 0 && x > 22 && x < 46) || (sz > 0 && x > -60 && x < -30)) continue;
      const tx = x + (R() - 0.5) * 3,
        tz = sz * 10.2;
      blobTree(T, tx, 0, tz, 6.5 + R() * 2, 2.5 + R() * 0.8, R, { lo: 0x40602a, hi: 0xb8b848, trunk: 0x4a3626, blobs: 4, trunkH: 0.5 });
      world.colliders.push({ x: tx, z: tz, r: 0.4, top: 3 });
      maps.blob(tx, tz, 4, 0.35);
    }
  }
  for (let i = 0; i < 60; i++) {
    const a = R() * 6.283,
      d = 150 + R() * 200;
    const x = Math.cos(a) * d,
      z = Math.sin(a) * d * 1.0;
    blobTree(T, x, world.baseH(x, z), z, 9, 4 + R() * 3, R, { lo: 0x4a6a30, hi: 0xa8b04a, trunk: 0x4a3626, blobs: 3 });
  }
  S.add(T.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5, hueVar: 0.45, rim: 0.25 })));

  const P = new Builder();
  const folk = [[-40, 40, 1], [-49, 48, -2], [-36, 50, 2.5], [-52, 38, 0.3], [-4, 13, 1.6], [20, 12, -1.5], [46, -14, 0.5], [-70, -12, 0], [70, 12, 3]];
  for (const [x, z, ry] of folk) figure(P, x, H(x, z), z, ry, { coat: [0x2a2a30, 0x4a3a2a, 0x2f4a5a, 0x7a2f2a][(R() * 4) | 0], dress: R() < 0.5, hat: R() < 0.6 ? 'top' : undefined, hatCol: 0x1a1a1e });
  S.add(P.mesh(soft({ scale: 0.8, rim: 0.2 })));
}

// distant polder: church spires and more mills on the horizon
export function addFarPolder(world, kit) {
  const { S, soft } = kit;
  const far = mountainRing({ radius: 400, base: -3, profile: (a) => 9 + fbm(a * 9, 0.5, 3) * 16 + (Math.sin(a * 23) > 0.94 ? 26 : 0), colorFn: (x, y) => mix(0x6f8a5a, 0x8fa0a0, clamp(y / 30)), seg: 300, depth: 40 });
  const fm = new THREE.Mesh(far, soft({ scale: 0.02, side: THREE.DoubleSide, rim: 0 }));
  fm.frustumCulled = false;
  S.add(fm);
}
