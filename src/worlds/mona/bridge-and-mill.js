import * as THREE from 'three';
import { Builder, house, xf } from '../../engine/build.js';
import { stoneC } from './palette.js';

// ---------------- the bridge with its row of arches
export function buildBridge(world, kit) {
  const { B } = kit;
  const bx0 = 40,
    bx1 = 86,
    bz = -120,
    deck = 6.4;
  B.box(bx1 - bx0, 0.7, 4.6, stoneC, (bx0 + bx1) / 2, deck - 0.7, bz);
  for (const sz of [-1, 1]) B.box(bx1 - bx0, 0.7, 0.4, stoneC, (bx0 + bx1) / 2, deck, bz + sz * 2.3);
  const n = 5,
    span = (bx1 - bx0) / n;
  for (let i = 0; i <= n; i++) B.box(1.5, deck + 2, 5.2, stoneC, bx0 + i * span, -2.6, bz);
  for (let i = 0; i < n; i++)
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI;
      const r = span / 2 - 0.5;
      B.box(1.2, 0.9, 4.8, stoneC, bx0 + (i + 0.5) * span + Math.cos(a) * r, 0.4 + Math.sin(a) * (deck - 2.2), bz, 0, undefined, xf(0, 0, 0, 0, 1, 1, 1, 0, 0));
    }
  world.platforms = [{ minx: bx0 - 2, maxx: bx1 + 2, minz: bz - 2.2, maxz: bz + 2.2, y: deck }];
  for (const sz of [-1, 1]) world.colliders.push({ x: (bx0 + bx1) / 2, z: bz + sz * 2.35, hw: (bx1 - bx0) / 2, hd: 0.22, ry: 0, top: deck + 0.9, bottom: deck - 1.2 });
}

// water mill on the river, wheel turning
export function buildMill(world, kit) {
  const { B, R, S, proxy, soft } = kit;
  const mx = 96,
    mz = -34;
  house(B, proxy, { R, x: mx - 9, z: mz - 4, w: 8, d: 7, h: 6, wall: 0xc9a878, roof: 0xa8582e, trim: 0x6a5238, lit: 0.5, roofH: 3 });
  const wheel = new Builder();
  wheel.add(new THREE.TorusGeometry(3.4, 0.22, 6, 24), 0x5a4026, null);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * 6.283;
    wheel.box(0.14, 3.4, 0.14, 0x6a4a2a, 0, 0, 0, 0, undefined, xf(0, 0, 0, 0, 1, 1, 1, 0, a));
    wheel.box(1.0, 0.1, 1.3, 0x7a5a36, 0, 3.3, 0, 0, undefined, xf(0, 0, 0, 0, 1, 1, 1, 0, a));
  }
  world.wheel = wheel.mesh(soft({ objSpace: 1, scale: 0.6 }));
  world.wheel.position.set(mx - 3.6, 2.6, mz - 4);
  world.wheel.rotation.y = Math.PI / 2;
  S.add(world.wheel);
}

export function tickMill(world, time) {
  world.wheel.rotation.x = time * 0.5;
}
