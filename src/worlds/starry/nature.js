import * as THREE from 'three';
import { paintMaterial } from '../../engine/paint.js';
import { Builder, patch, cypress, blobTree, mix } from '../../engine/build.js';
import { vnoise, clamp } from '../../engine/gl.js';

// ---------------- trees
export function trees(world, { S, H, R, maps, strokes, placed, free, nearRoad, cleared, VOID }) {
  const T = new Builder();
  const HX = -24,
    HZ = 72;
  cypress(T, HX, H(HX, HZ) - 1, HZ, 41, 6.4, R, { flames: 3, sway: 0.9, dark: 0x07140f, mid: 0x143524, warm: 0x5a4418 });
  world.colliders.push({ x: HX, z: HZ, r: 3.2, top: H(HX, HZ) + 30 });
  world.cypressTop = [HX + 0.5, H(HX, HZ) + 42.5, HZ];
  maps.blob(HX, HZ, 12, 0.5);
  let n = 0;
  while (n < 26) {
    const a = R() * 6.283,
      d = 20 + R() * 150;
    const x = 8 + Math.cos(a) * d,
      z = -30 + Math.sin(a) * d;
    if (nearRoad(x, z, 3) || !free(x, z, 2.5) || (x > -22 && x < 42 && z > 18)) continue;
    const h = 8 + R() * 9;
    const gone = cleared(x, z, 1);
    cypress(gone ? VOID : T, x, H(x, z) - 0.5, z, h, 1.1 + R() * 0.7, R, { flames: 1 });
    placed.push([x, z, 1.4, gone]);
    n++;
    if (gone) continue;
    world.colliders.push({ x, z, r: 0.9, top: H(x, z) + h * 0.7 });
    maps.blob(x, z, 3, 0.4);
  }
  // olives: twisting blue-green crowns
  n = 0;
  while (n < 150) {
    let x, z;
    if (n < 60) {
      x = 22 + R() * 46;
      z = 12 + R() * 62; // the grove under the hill
    } else {
      const a = R() * 6.283,
        d = 62 + R() * 150;
      x = 8 + Math.cos(a) * d;
      z = -30 + Math.sin(a) * d;
    }
    if (nearRoad(x, z, 3) || !free(x, z, 2.6) || Math.hypot(x - HX, z - HZ) < 12) continue;
    const far = Math.hypot(x, z) > 120;
    const r = (2.2 + R() * 1.8) * (far ? 1.7 : 1);
    const gone = cleared(x, z, r * 0.6);
    blobTree(gone ? VOID : T, x, H(x, z), z, r * 1.5, r, R, { lo: [0x163a5c, 0x1b4a4a, 0x1f3f70][(R() * 3) | 0], hi: [0x3f86a8, 0x4a9a86, 0x4f78c0][(R() * 3) | 0], blobs: far ? 2 : 4 });
    placed.push([x, z, r * 0.8, gone]);
    n++;
    if (gone) continue;
    if (!far) world.colliders.push({ x, z, r: 0.5, top: H(x, z) + 3 });
    maps.blob(x, z, r * 1.5, 0.42);
  }
  VOID.parts.length = 0;
  S.add(T.mesh(paintMaterial({ stroke: strokes.wavy, scale: 0.16, contrast: 0.7, hueVar: 0.8, warp: 0.5, accent: 0xb9d06a, accentAmt: 0.3, impasto: 0.16, rim: 0.3, band: 0.26, wallStretch: 0.5, angle: 1.57 })));
}

// irises in the garden of the asylum
export function irises(world, { H, R, P, AX, AZ }) {
  for (let i = 0; i < 330; i++) {
    const x = AX - 11 + R() * 24,
      z = AZ - 9 + R() * 22;
    if (Math.hypot(x - 78, z - 44) < 5.5) continue;
    const y = H(x, z);
    const s = 0.7 + R() * 0.6;
    for (let k = 0; k < 3; k++) P.cyl(0.0, 0.06 * s, 0.9 * s, 0x2a7a52, x + (R() - 0.5) * 0.3, y, z + (R() - 0.5) * 0.3, 4, { sway: 0.1 }, undefined, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5);
    P.ball(0.16 * s, [0x5a4fd8, 0x6f5cf0, 0x4338b0, 0x8a78ff][(R() * 4) | 0], x, y + 0.95 * s, z, 1, 1.25, 1, 0, { sway: 0.14 });
    if (R() < 0.3) P.ball(0.07 * s, 0xf2c530, x, y + 0.98 * s, z + 0.08, 1, 1, 1, 0, { sway: 0.14 });
  }
}

// wheat field west of the village, stooks standing in rows
export function wheat(world, { S, H, R, P, maps, strokes, nearRoad, nearTrack }) {
  world.wheat = [-92, -22];
  S.add(
    new THREE.Mesh(
      patch(-92, -22, 36, H, (x, y, z) => mix(0xc9a437, 0xe8cc5a, vnoise(x * 0.2, z * 0.2)), { lift: 0.12, wobble: 0.2, sx: 1.25, sz: 0.85, rings: 9 }),
      paintMaterial({ stroke: strokes.oil, scale: 0.06, contrast: 0.6, hueVar: 0.5, warp: 1.1, accent: 0xf6e9a0, accentAmt: 0.35, impasto: 0.16, rim: 0.05, band: 0.3 })
    )
  );
  for (let i = 0; i < 46; i++) {
    const x = -92 + (R() - 0.5) * 78,
      z = -22 + (R() - 0.5) * 50;
    if (Math.hypot((x + 92) / 1.25, (z + 22) / 0.85) > 33 || nearRoad(x, z, 3)) continue;
    const y = H(x, z);
    if (nearTrack(x, z, 1.6)) continue; // no stook on the red tracks (nothing random is drawn after this point of the loop)
    P.cyl(0.12, 0.85, 1.9, (px, py) => mix(0xb88a2a, 0xf0d060, clamp(py / 1.9 + 0.5)), x, y, z, 7, { sway: 0.06 });
    maps.blob(x, z, 1.6, 0.3);
  }
}
