import { seatedMan } from '../kristiania/people.js';

// --- the rounded shore stones of Åsgårdstrand, all along the water
export function addShoreStones(world, kit) {
  const { R, H, MB, shoreZ } = kit;
  const STONE = [0xc9b49a, 0x9a8a9a, 0xb8a08a, 0x7f8aa0, 0xd9c0a0, 0x8a7a8a];
  const mz = shoreZ(4) + 4; // where the man of Melancholy sits: no stone may land on him
  for (let x = -126; x < 150; x += 2.2) {
    for (let k = 0; k < 2; k++) {
      if (R() < 0.35) continue;
      const z = shoreZ(x) + 1 + (R() - 0.5) * 9;
      const r = 0.6 + R() * 1.7;
      const col = STONE[(R() * STONE.length) | 0],
        sx = x + (R() - 0.5) * 2;
      if (Math.hypot(sx - 4, z - mz) > 2.2 + r * 1.35) MB.ball(r, col, sx, H(x, z) - r * 0.3, z, 1.35, 0.6, 1, 1);
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
  // he sits on the front of the stone, looking out along the shore
  const ry = -0.8;
  seatedMan(kit.ck.s('detail'), { x: x + Math.sin(ry) * 0.45, y: y + 0.3, z: z + Math.cos(ry) * 0.45, ry });
  world.colliders.push({ x, z, r: 1.3, top: y + 1 });
}
