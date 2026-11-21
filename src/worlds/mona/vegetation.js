import { Builder, blobTree, cypress } from '../../engine/build.js';
import { leoKeep } from './notebooks/layout.js';

// ---------------- cypress avenues, olives, vineyards
// These were flames, blobs and balls. They still throw the dice exactly as they did, into
// a builder nobody draws; what is kept is where each cypress and each olive stood
// (kit.oldCypress, kit.oldOlives), and tuscany/ grows the real thing there.
export function buildVegetation(world, kit) {
  const { H, R, roadSamples, nearRoad, TX, TZ } = kit;
  const VOID = new Builder();
  const cyp = (kit.oldCypress = []),
    oli = (kit.oldOlives = []);
  for (const [i, s] of roadSamples.entries()) {
    if (i % 3 || Math.hypot(s[0], s[1]) < 14) continue;
    const side = i % 6 ? 1 : -1;
    const x = s[0] + side * (4 + R()),
      z = s[1] + side * (2 + R());
    const y = H(x, z);
    if (y < 1.4 || nearRoad(x, z, 2.6) || Math.hypot(x - TX, z - TZ) < 30) continue;
    const hh = 8 + R() * 6;
    cypress(VOID, x, y - 0.4, z, hh, 1.1 + R() * 0.5, R, { dark: 0x1a2a1a, mid: 0x3a5a34, warm: 0x5a5a2a, sway: 0.3 });
    VOID.parts.length = 0;
    cyp.push({ x, z, h: hh });
  }
  let n = 0,
    guard = 0;
  while (n < 150 && guard++ < 4000) {
    const x = (R() - 0.5) * 560,
      z = -80 + (R() - 0.5) * 560;
    const y = H(x, z);
    if (y < 1.6 || nearRoad(x, z, 5) || Math.hypot(x, z) < 20 || Math.hypot(x - TX, z - TZ) < 30 || y > 40) continue;
    const r = 2.4 + R() * 2.4;
    blobTree(VOID, x, y, z, r * 1.6, r, R, { lo: 0x34482a, hi: 0x8a9a52, trunk: 0x3a2c1c, blobs: 3 });
    VOID.parts.length = 0;
    n++;
    if (!leoKeep(x, z) && Math.hypot(x - TX, z - TZ) > 36) oli.push({ x, z, r });
  }
  // (the vineyards: one throw for the colour of every vine there was)
  for (const [vx, vz, ry] of [[-52, -30, 0.3], [46, -36, -0.4], [-30, 44, 1.2], [58, 40, 0.8], [-90, -60, 0.1]])
    for (let r = 0; r < 9; r++)
      for (let k = 0; k < 12; k++) {
        const lx = (k - 6) * 2.4,
          lz = (r - 4) * 3;
        const x = vx + lx * Math.cos(ry) + lz * Math.sin(ry),
          z = vz - lx * Math.sin(ry) + lz * Math.cos(ry);
        if (H(x, z) < 1.6 || nearRoad(x, z, 3)) continue;
        R();
      }
}
