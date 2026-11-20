import * as THREE from 'three';
import { waterMaterial } from '../../engine/paint.js';
import { mix } from '../../engine/build.js';
import { clamp } from '../../engine/gl.js';

// The canal through the middle of the town: its water, the quays and the two
// humpback bridges, the trader moored at the east end, the boats, the gnats.
// Everything built goes into kit.B (index.js bakes it).

// canal
export function addCanal(world, kit) {
  const { strokes, S } = kit;
  const wg = new THREE.PlaneGeometry(900, 15, 60, 2);
  wg.rotateX(-Math.PI / 2);
  const canal = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.oil, deep: 0x2f4238, shallow: 0x5a7a62, reflect: 0xf2c98a, glint: 0xfff0c0, scale: 0.09, glintAmt: 1.6, flow: 0.006 }));
  canal.position.y = world.waterY;
  S.add(canal);
}

// quay walls + mooring posts
export function addQuays(world, kit) {
  const { R, B } = kit;
  for (const sz of [-1, 1]) {
    for (let x = -150; x < 150; x += 6) B.box(6, 2.9, 0.7, mix(0x8a5a44, 0x6f4a3a, R()), x + 3, -2.7, sz * 6.9);
    for (let x = -140; x < 140; x += 14) B.cyl(0.14, 0.16, 1.0, 0x3a2c22, x, 0, sz * 6.2, 6);
  }
}

// bridges
export function addBridges(world, kit) {
  const { R, B } = kit;
  for (const bx of [0, -64]) {
    for (let z = -10; z <= 10; z += 1) {
      const y = 2.1 * Math.cos((z / 10.5) * Math.PI * 0.5);
      B.box(6.6, 0.5, 1.05, mix(0xb09a7a, 0x9a8468, R()), bx, y - 0.5, z);
      for (const sx of [-1, 1]) B.box(0.35, 0.95, 1.05, 0x9a5a40, bx + sx * 3.15, y - 0.1, z);
    }
    for (const sx of [-1, 1]) world.colliders.push({ x: bx + sx * 3.45, z: 0, hw: 0.25, hd: 10.5, ry: 0, top: 3.2 });
  }
}

// ---------------- a trader moored at the east end of the canal
export function addTrader(world, kit) {
  const { B } = kit;
  const sx = 104;
  B.box(22, 3.2, 5.6, (x, y) => mix(0x5a3a26, 0x8a5a36, clamp(y / 3.2 + 0.5)), sx, -1.4, 0);
  B.box(6, 2.2, 5.2, 0x6a4530, sx + 9, 1.8, 0);
  B.box(4, 1.2, 5.0, 0x6a4530, sx - 10, 1.8, 0);
  for (const [mx, mh] of [[sx - 3, 19], [sx + 5, 16]]) {
    B.cyl(0.16, 0.26, mh, 0x4a3626, mx, 1.8, 0, 6);
    B.box(0.2, 0.2, 9, 0x4a3626, mx, mh * 0.72 + 1.8, 0);
    B.box(0.5, mh * 0.34, 8.4, 0xe9e0c8, mx + 0.3, mh * 0.72 + 1.8 - mh * 0.34, 0, 0, { sway: 0.05 });
    B.cyl(0.7, 0.55, 0.5, 0x4a3626, mx, mh * 0.86 + 1.8, 0, 8);
  }
  B.box(0.06, 1.6, 2.6, 0xd9443a, sx - 3, 21.2, 1.3, 0, { sway: 0.2 });
  world.platforms = [{ minx: sx - 11, maxx: sx + 6, minz: -2.8, maxz: 2.8, y: 1.8 }];
  world.colliders.push({ x: sx + 9, z: 0, hw: 3, hd: 2.6, ry: 0, top: 4 });
  world.crowNest = [sx - 3, 19.4, 0];
}

// canal boats
export function addCanalBoats(world, kit) {
  const { R, B } = kit;
  for (const [x, z, ry] of [[-22, -3.4, 0.05], [38, 3.2, -0.04], [-92, 2.6, 0.03]]) {
    B.box(6.4, 0.8, 1.9, 0x5a4030, x, world.waterY - 0.15, z, ry);
    B.box(6.8, 0.14, 2.1, 0x8a6a48, x, world.waterY + 0.6, z, ry);
    B.box(2.2, 0.5, 1.4, [0xb2452f, 0xd9c890, 0x4a6a8a][(R() * 3) | 0], x, world.waterY + 0.7, z, ry);
  }
}

// gnats over the canal
export function addGnats(world, kit) {
  const { R } = kit;
  for (let i = 0; i < 60; i++) world.glows.push({ p: [(R() - 0.5) * 240, 0.3 + R() * 2.5, (R() - 0.5) * 12], c: 0xfff0c0, size: 0.12 + R() * 0.1, drift: 1.4 });
}
