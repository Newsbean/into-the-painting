import * as THREE from 'three';
import { Builder, house, figure, blobTree, mix, xf } from '../../engine/build.js';
import { clamp } from '../../engine/gl.js';
import { FOAM, VERMILION } from './palette.js';
import { keptClear } from './ground-plan.js';
import { machiya, minka, pagoda, rngAt } from './edo/house.js';
import { matsu } from './plants.js';

// The fishing village behind the workshop: its houses and lanterns, the
// pagoda, the cooper at his barrel, the kites and the cherry trees.

// --- the fishing village strung along the shore
export function addFishingVillage(world, { R, H, maps, proxy, X }) {
  const lots = [[-70, 228], [-94, 238], [-118, 231], [74, 238], [98, 229], [122, 240], [146, 232], [-58, 252], [86, 256], [18, 256], [-22, 250], [-146, 240], [170, 244], [-98, 262], [120, 264]];
  for (const [x, z] of lots) {
    if (H(x, z) < 1.3) continue;
    const ry = Math.PI + (R() - 0.5) * 0.7,
      w = 7 + R() * 4,
      d = 5.5 + R() * 2;
    // the box house this used to be still throws its dice (into a builder that is thrown away),
    // so that everything random built after it stays exactly where it was
    house(new Builder(), { heightAt: H }, {
      R, x, z, ry, w, d, h: 3.5 + R() * 0.8,
      roofType: 'hip', roofH: 2.3, over: 1.0, ridge: 0.5, wall: R() < 0.5 ? 0xe9dfc6 : 0xcdbb98, roof: [0x3d4c5c, 0x4a5560, 0x55504a, 0x35455a][(R() * 4) | 0],
      trim: 0x3a2a1e, doorCol: [0x243a6a, 0x7a2f2a, 0x3a2a1e][(R() * 3) | 0], lit: 0.85, winW: 1.3, winH: 1.4, chimney: false,
    });
    // down by the road, shops and fishermen's houses under tile; higher up, thatch
    const Q = rngAt(x, z);
    const res = z > 246 ? minka(world.edoKit, world, { x, z, ry, w, d, y: H(x, z) + 0.15, lo: H(x, z) - 0.9 }) : machiya(world.edoKit, world, { x, z, ry, w, d, R: Q, shop: Q() < 0.5, floors: Q() < 0.45 ? 2 : 1 });
    world.colliders.push({ x, z, hw: w / 2 + 0.3, hd: d / 2 + 0.3, ry, top: z > 246 ? res.top : H(x, z) + res.top });
    maps.blob(x, z, Math.max(w, d) * 0.95, 0.4);
    // a paper lantern by every door
    const lx = x + (R() - 0.5) * 3,
      lz = z - 5;
    X.cyl(0.04, 0.04, 2.4, 0x3a2a1e, lx, H(lx, lz), lz, 5);
    X.ball(0.34, [0xf2a04a, 0xe8604a, 0xf6e0a0][(R() * 3) | 0], lx, H(lx, lz) + 2.3, lz, 1, 1.25, 1, 1, { emissive: 1 });
    world.glows.push({ p: [lx, H(lx, lz) + 2.3, lz], c: 0xffb860, size: 1.6 });
    maps.lamp(lx, lz, 6, 0xffb860, 0.7);
  }
}

// --- a three-storey pagoda above the roofs
export function addPagoda(world, { H, maps, X }) {
  const px = -78,
    pz = 276,
    y = H(px, pz);
  pagoda(world.edoKit, world, { x: px, z: pz, tiers: 3 });
  world.colliders.push({ x: px, z: pz, hw: 4, hd: 4, ry: 0, top: y + 15 });
  world.glows.push({ p: [px, y + 19.6, pz], c: 0xffd58a, size: 2 });
  maps.blob(px, pz, 9, 0.4);
}

// --- the cooper's unfinished barrel: a hoop big enough to frame the mountain
export function addCooper(world, { H, X }) {
  const bx = 38,
    bz = 213,
    y = H(bx, bz);
  X.add(new THREE.TorusGeometry(3.1, 0.34, 8, 30), (x, y2) => mix(0xb08a50, 0xe0c080, clamp(y2 / 6 + 0.5)), xf(bx, y + 3.2, bz, 0.25));
  X.add(new THREE.TorusGeometry(3.1, 0.2, 6, 30), 0x6a4a2a, xf(bx, y + 3.2, bz + 0.5, 0.25));
  for (const sx of [-1, 1]) X.box(0.5, 0.6, 1.6, 0x6a4a2a, bx + sx * 2, y, bz);
  figure(X, bx + 0.4, y + 0.35, bz + 0.2, 2.6, { coat: 0x7f9aa8, legs: 0x3a4a5a, lean: 0.5, arms: 0.7, scale: 0.9 });
  for (const sx of [-1, 1]) world.colliders.push({ x: bx + sx * 3, z: bz, r: 0.5, top: y + 5 });
}

// --- kites over the village
export function addKites(world, { R, H, X }) {
  const KITE = [VERMILION, 0x2f5f9a, FOAM, 0xe8c66a, VERMILION, 0x7fa0a8];
  KITE.forEach((col, i) => {
    const ax = -110 + i * 46 + R() * 14,
      az = 232 + R() * 22;
    const kx = ax + (R() - 0.5) * 16,
      ky = 26 + R() * 18,
      kz = az - 16 - R() * 14;
    const M = xf(kx, ky, kz, R() * 0.6, 1, 1, 1, 0.5, Math.PI / 4);
    X.box(2.0, 2.0, 0.06, col, 0, -1, 0, 0, { sway: 0.5 }, M);
    X.box(0.12, 2.6, 0.08, 0x3a2a1e, 0, -1.3, 0.02, 0, { sway: 0.5 }, M);
    for (let k = 1; k <= 3; k++) X.box(0.5, 0.3, 0.05, k % 2 ? FOAM : col, kx + k * 0.3, ky - 1.6 - k * 0.9, kz + k * 0.3, 0, { sway: 0.6 });
    // the flyer steps aside from ground the other prints stand on; the kite itself stays where it was
    let fx = ax;
    for (let s = 0; s < 14 && (keptClear(fx, az, 2) || world.blocked(fx, H(fx, az) + 1, az)); s++) fx -= 2.5;
    const a = new THREE.Vector3(fx, H(fx, az) + 1.4, az),
      b = new THREE.Vector3(kx, ky - 1, kz);
    const dir = b.clone().sub(a);
    const L = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    X.add(new THREE.CylinderGeometry(0.02, 0.02, L, 3), 0x3a2a1e, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    if (H(fx, az) > 1.2) figure(X, fx, H(fx, az), az, Math.PI, { coat: [0x2f548a, 0x8a2f2f, 0x5a6a4a][i % 3], scale: 0.72, arms: 0.8 });
  });
}

// --- cherry trees in blossom between the houses
export function addCherryTrees(world, { R, H, maps, T2, SPARE }) {
  // (as with the shore pines, a tree on kept ground is drawn into SPARE and never shown)
  let cn = 0,
    guard = 0;
  while (cn < 34 && guard++ < 600) {
    const x = (R() - 0.5) * 400,
      z = 212 + R() * 80;
    const y = H(x, z);
    if (y < 2 || world.blocked(x, y + 1, z) || (Math.abs(x - 10) < 7 && z < 214)) continue;
    const open = !keptClear(x, z, 2);
    // the round tree this used to be still throws its dice (unseen); the cherry that stands here
    // is drawn the way the prints draw a tree: a dark leaning trunk under flat clouds of blossom
    const bh = 5.2 + R() * 1.6;
    blobTree(SPARE, x, y, z, bh, 2.5 + R() * 0.9, R, { lo: 0xe58aa6, hi: 0xffe0ea, trunk: 0x3a2622, blobs: 4, trunkH: 0.5 });
    if (open) matsu(T2, x, y, z, bh + 1.6, rngAt(x, z), { lo: 0xe58aa6, hi: 0xffe6ee, trunk: 0x3a2622, pads: 6 });
    world.colliders.push({ x, z, r: 0.4, top: y + 2.5, spare: !open });
    if (open) maps.blob(x, z, 3.6, 0.3);
    cn++;
  }
}
