import { xf } from '../../../engine/build.js';

// --- the rounded shore stones of Åsgårdstrand, all along the water
export function addShoreStones(world, kit) {
  const { R, H, MB, shoreZ } = kit;
  const STONE = [0xc9b49a, 0x9a8a9a, 0xb8a08a, 0x7f8aa0, 0xd9c0a0, 0x8a7a8a];
  for (let x = -126; x < 150; x += 2.2) {
    for (let k = 0; k < 2; k++) {
      if (R() < 0.35) continue;
      const z = shoreZ(x) + 1 + (R() - 0.5) * 9;
      const r = 0.6 + R() * 1.7;
      MB.ball(r, STONE[(R() * STONE.length) | 0], x + (R() - 0.5) * 2, H(x, z) - r * 0.3, z, 1.35, 0.6, 1, 1);
    }
  }
}

// --- Melancholy: a man on the stones with his head in his hand
export function addMelancholy(world, kit) {
  const { H, MB, shoreZ } = kit;
  const x = 4,
    z = shoreZ(4) + 4,
    y = H(x, z);
  MB.ball(1.1, 0x9a8a9a, x, y, z, 1.3, 0.7, 1, 1);
  const M = xf(x, y + 0.72, z, -0.8);
  MB.cyl(0.2, 0.26, 0.62, 0x1c1c26, 0, 0, 0, 8, undefined, M, 0.5, 0);
  MB.cyl(0.09, 0.1, 0.5, 0x1c1c26, -0.12, 0.05, 0.3, 6, undefined, M, 1.45, 0);
  MB.cyl(0.09, 0.1, 0.5, 0x1c1c26, 0.12, 0.05, 0.3, 6, undefined, M, 1.45, 0);
  MB.cyl(0.08, 0.09, 0.55, 0x1c1c26, -0.12, -0.5, 0.56, 6, undefined, M);
  MB.cyl(0.08, 0.09, 0.55, 0x1c1c26, 0.12, -0.5, 0.56, 6, undefined, M);
  MB.ball(0.19, 0xd9b090, 0.06, 0.78, 0.36, 1, 1.08, 1, 1, undefined, M);
  MB.ball(0.2, 0x2a1c14, 0.06, 0.84, 0.33, 1, 0.8, 1, 1, undefined, M);
  MB.cyl(0.06, 0.07, 0.5, 0x1c1c26, 0.2, 0.3, 0.3, 6, undefined, M, 0.5, 0.35);
  world.colliders.push({ x, z, r: 1.3, top: y + 1 });
}
