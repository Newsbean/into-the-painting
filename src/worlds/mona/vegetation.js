import { Builder, blobTree, cypress, mix } from '../../engine/build.js';
import { leoKeep } from './notebooks/layout.js';

// ---------------- cypress avenues, olives, vineyards
export function buildVegetation(world, kit) {
  const { S, H, R, maps, soft, strokes, roadSamples, nearRoad, TX, TZ } = kit;
  const T = new Builder();
  for (const [i, s] of roadSamples.entries()) {
    if (i % 3 || Math.hypot(s[0], s[1]) < 14) continue;
    const side = i % 6 ? 1 : -1;
    const x = s[0] + side * (4 + R()),
      z = s[1] + side * (2 + R());
    const y = H(x, z);
    if (y < 1.4 || nearRoad(x, z, 2.6) || Math.hypot(x - TX, z - TZ) < 30) continue;
    const hh = 8 + R() * 6;
    cypress(T, x, y - 0.4, z, hh, 1.1 + R() * 0.5, R, { dark: 0x1a2a1a, mid: 0x3a5a34, warm: 0x5a5a2a, sway: 0.3 });
    world.colliders.push({ x, z, r: 0.7, top: y + hh * 0.6 });
    maps.blob(x, z, 3, 0.35);
  }
  const VOID = new Builder();
  let n = 0,
    guard = 0;
  while (n < 150 && guard++ < 4000) {
    const x = (R() - 0.5) * 560,
      z = -80 + (R() - 0.5) * 560;
    const y = H(x, z);
    if (y < 1.6 || nearRoad(x, z, 5) || Math.hypot(x, z) < 20 || Math.hypot(x - TX, z - TZ) < 30 || y > 40) continue;
    const r = 2.4 + R() * 2.4;
    // where the notebooks now stand the same numbers are drawn, but nothing is planted
    const taken = leoKeep(x, z);
    blobTree(taken ? VOID : T, x, y, z, r * 1.6, r, R, { lo: 0x34482a, hi: 0x8a9a52, trunk: 0x3a2c1c, blobs: 3 });
    VOID.parts.length = 0;
    n++;
    if (taken) continue;
    if (Math.hypot(x, z + 80) < 180) world.colliders.push({ x, z, r: 0.5, top: y + 3 });
    maps.blob(x, z, r * 1.4, 0.35);
  }
  // vineyards in rows on the near slopes
  for (const [vx, vz, ry] of [[-52, -30, 0.3], [46, -36, -0.4], [-30, 44, 1.2], [58, 40, 0.8], [-90, -60, 0.1]])
    for (let r = 0; r < 9; r++)
      for (let k = 0; k < 12; k++) {
        const lx = (k - 6) * 2.4,
          lz = (r - 4) * 3;
        const x = vx + lx * Math.cos(ry) + lz * Math.sin(ry),
          z = vz - lx * Math.sin(ry) + lz * Math.cos(ry);
        const y = H(x, z);
        if (y < 1.6 || nearRoad(x, z, 3)) continue;
        T.ball(1.0, mix(0x4a6a2a, 0x9aa83a, R()), x, y + 0.6, z, 1.25, 0.75, 0.7, 0, { sway: 0.08 });
      }
  S.add(T.meshes(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5, hueVar: 0.4, rim: 0.2 })));
}
