import * as THREE from 'three';
import { Builder, house, xf } from '../../engine/build.js';
import { townHouse } from '../../engine/townhouse.js';
import { ponte } from './tuscany/build.js';

// ---------------- the bridge with its row of arches
export function buildBridge(world, kit) {
  const bx0 = 40,
    bx1 = 86,
    bz = -120,
    deck = 6.4;
  ponte(kit.tk, { x0: bx0, x1: bx1, z: bz, deck, spans: 5 });
  world.platforms = [{ minx: bx0 - 2, maxx: bx1 + 2, minz: bz - 2.2, maxz: bz + 2.2, y: deck }];
  for (const sz of [-1, 1]) world.colliders.push({ x: (bx0 + bx1) / 2, z: bz + sz * 2.35, hw: (bx1 - bx0) / 2, hd: 0.22, ry: 0, top: deck + 0.9, bottom: deck - 1.2 });
}

// water mill on the river, wheel turning
export function buildMill(world, kit) {
  const { R, S, H, maps, soft, burn, tk } = kit;
  const mx = 96,
    mz = -34;
  // (the box the mill used to be: its dice)
  house(burn.B, burn.W, { R, x: mx - 9, z: mz - 4, y: 0, w: 8, d: 7, h: 6, wall: 0xc9a878, roof: 0xa8582e, trim: 0x6a5238, lit: 0.5, roofH: 3 });
  burn.B.parts.length = 0;
  const res = townHouse(tk, world, { x: mx - 9, z: mz - 4, ry: 0, w: 8, d: 7, R: kit.R2, floors: 2, clad: 'plaster', wall: 0xc9a878, roof: 0xa8582e, pitch: 0.36, chimneys: 1, shutter: 0x5a4026, lit: 0.5 });
  world.colliders.push({ x: mx - 9, z: mz - 4, hw: 4.15, hd: 3.65, ry: 0, top: H(mx - 9, mz - 4) + res.top });
  maps.blob(mx - 9, mz - 4, 8, 0.4);
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
