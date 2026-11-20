import { CLOTH, INK, SKIN, STONE, THATCH, THATCH_D, TIMBER, WOOD, WOOD_D } from '../palette.js';
import { rod, beam } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- Nihonbashi: the arched bridge where the road meets the stream, shoulder to shoulder with porters
export function nihonbashi(world, { H, Q, X, maps, deck, wall, spanY, lanternAt }) {
  const bx = 45,
    bz = 221,
    half = 8,
    rise = 2.3,
    wd = 4.2,
    N = 14;
  const yb = Math.max(H(bx - half, bz), H(bx + half, bz)) + 0.12;
  const arc = (u) => yb + rise * (1 - u * u);
  for (let i = 0; i < N; i++) {
    const u0 = (i / N) * 2 - 1,
      u1 = ((i + 1) / N) * 2 - 1;
    beam(X, [bx + u0 * half, arc(u0), bz], [bx + u1 * half, arc(u1), bz], wd, 0.24, i % 2 ? WOOD : 0xc9a878);
    deck(bx + u0 * half, bx + u1 * half, bz - wd / 2, bz + wd / 2, arc((u0 + u1) / 2) + 0.14);
  }
  for (const sz of [-1, 1]) {
    const rz = bz + sz * (wd / 2 - 0.12);
    for (let i = 0; i <= N; i += 2) {
      const u = (i / N) * 2 - 1,
        x = bx + u * half,
        y = arc(u);
      X.box(0.2, 1.15, 0.2, WOOD_D, x, y, rz);
      X.ball(0.15, 0x6a7a5a, x, y + 1.3, rz, 1, 1.3, 1, 0);
      if (i < N) {
        const u2 = ((i + 2) / N) * 2 - 1;
        for (const hh of [0.5, 0.95]) beam(X, [x, y + hh, rz], [bx + u2 * half, arc(u2) + hh, rz], 0.1, 0.12, WOOD_D);
      }
    }
  }
  for (const u of [-0.55, 0, 0.55]) {
    const x = bx + u * half;
    for (const sz of [-1.5, 1.5]) rod(X, [x, H(x, bz + sz) - 0.6, bz + sz], [x, arc(u) - 0.1, bz + sz * 0.9], 0.2, 0.17, TIMBER, 6);
    X.box(0.24, 0.24, 3.6, TIMBER, x, arc(u) - 0.5, bz);
  }
  for (const sx of [-1, 1]) X.box(1.8, 1.2, wd + 1.4, STONE, bx + sx * (half + 0.4), yb - 1.05, bz);
  const loads = ['pack', 'pole', 'basket', undefined, 'bundle', 'sack', 'pole', undefined];
  const hats = ['cone', 'none', 'cloth', 'cone', 'flat', 'none'];
  for (let i = 0; i < 15; i++) {
    const u = -0.88 + (i / 14) * 1.76,
      robe = i % 5 === 3;
    person(X, bx + u * half, arc(u) + 0.14, bz + (((i * 2) % 3) - 1) * 1.2 + (Q() - 0.5) * 0.3, ((i % 2 ? 1 : -1) * Math.PI) / 2, {
      coat: CLOTH[i % CLOTH.length],
      legs: i % 3 ? 0x3a4a5a : SKIN,
      hat: robe ? 'none' : hats[i % hats.length],
      carry: robe ? undefined : loads[i % loads.length],
      robe,
      lean: robe ? 0.05 : 0.14,
      stride: 0.16,
      s: 0.88 + Q() * 0.08,
    });
  }
  // a white-walled storehouse on the bank, bales stacked at its door
  const kx = 55.4,
    kz = 213.4,
    ky = spanY(kx, kz, 4.6, 6)[1] + 0.05;
  X.box(4.6, 1.1, 6, 0x4a5560, kx, ky - 0.3, kz);
  X.box(4.5, 2.5, 5.9, 0xf3ecd8, kx, ky + 0.8, kz);
  X.gable(5.6, 6.8, 1.7, 0x35424f, kx, ky + 3.3, kz);
  X.box(0.1, 1.5, 1.0, 0x1d2a44, kx - 2.3, ky + 0.8, kz);
  X.box(0.7, 0.6, 0.1, INK, kx, ky + 2.5, kz - 3.0);
  wall(kx, kz, 2.5, 3.2, 0, ky + 5);
  maps.blob(kx, kz, 5, 0.4);
  for (const [ox, oy] of [[-0.7, 0], [0, 0], [0.7, 0], [-0.35, 0.6], [0.35, 0.6], [0, 1.2]]) X.cyl(0.33, 0.33, 0.95, oy === 0.6 ? THATCH_D : THATCH, 57.6 + ox, H(57.6, 217.6) + 0.33 + oy, 217.2, 7, undefined, undefined, Math.PI / 2, 0);
  lanternAt(35.6, 218.2);
}
