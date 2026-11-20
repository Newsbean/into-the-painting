import { lerp } from '../../../engine/gl.js';
import { FOAM, INK, STONE, STONE_D, THATCH, VERM, WOOD_D } from '../palette.js';
import { STAIR } from '../ground-plan.js';
import { rod, toriiGate } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- vermilion gates climbing to a hill shrine
export function hillShrine(world, { H, X, deck, solid, spanY, wall, lanternAt }) {
  const [A, Bq] = STAIR;
  const ry = Math.atan2(Bq[0] - A[0], Bq[1] - A[1]);
  const cs = Math.cos(ry),
    sn = Math.sin(ry);
  for (let i = 0; i < 40; i++) {
    const t = (i + 0.5) / 40,
      x = lerp(A[0], Bq[0], t),
      z = lerp(A[1], Bq[1], t);
    const top = H(x, z + 0.5) + 0.12;
    X.box(2.5, 0.5, 1.12, i % 2 ? STONE : 0xa8a89c, x, top - 0.5, z, ry);
    deck(x - 1.3, x + 1.3, z - 0.56, z + 0.56, top);
  }
  for (let i = 0; i < 20; i++) {
    const t = (i + 0.35) / 20,
      x = lerp(A[0], Bq[0], t),
      z = lerp(A[1], Bq[1], t),
      y = H(x, z) + 0.15;
    toriiGate(X, x, y, z, ry, 1 + (i === 0 || i === 19 ? 0.18 : 0));
    for (const s of [-1.15, 1.15]) solid(x + s * cs, z - s * sn, 0.22, y + 3);
  }
  // the shrine at the top
  const sx = 71.8,
    sz = 315,
    [slo, shi] = spanY(sx, sz, 4.8, 4.4);
  const py = shi + 0.15;
  X.box(4.8, py - slo + 0.6, 4.4, STONE, sx, slo - 0.6, sz);
  for (let k = 0; k < 4; k++) X.box(2.2, 0.4, 0.5, STONE_D, sx, py - (k + 1) * 0.36 - 0.4 + 0.36, sz - 2.45 - k * 0.5);
  X.box(2.6, 2.0, 2.2, 0xe9dfc6, sx, py, sz + 0.5);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) X.box(0.2, 2.0, 0.2, VERM, sx + a * 1.3, py, sz + 0.5 + b * 1.1);
  X.box(2.9, 0.16, 2.5, VERM, sx, py + 2.0, sz + 0.5);
  X.gable(3.8, 4.2, 1.3, 0x35424f, sx, py + 2.16, sz + 0.3, Math.PI / 2);
  X.box(4.4, 0.18, 0.3, INK, sx, py + 3.4, sz + 0.3);
  X.box(1.1, 1.3, 0.06, 0x7a2f2a, sx, py + 0.3, sz - 0.62);
  X.box(0.9, 0.5, 0.5, WOOD_D, sx, py, sz - 1.5);
  rod(X, [sx - 1.3, py + 1.85, sz - 0.9], [sx + 1.3, py + 1.85, sz - 0.9], 0.06, 0.06, THATCH, 5);
  for (const ox of [-0.7, 0, 0.7]) X.box(0.16, 0.3, 0.03, FOAM, sx + ox, py + 1.5, sz - 0.9, 0, { sway: 0.3 });
  wall(sx, sz, 2.4, 2.2, 0, py);
  wall(sx, sz + 0.5, 1.5, 1.3, 0, py + 3.4);
  deck(sx - 2.4, sx + 2.4, sz - 2.2, sz + 2.2, py);
  lanternAt(68.6, 311.4);
  lanternAt(75.2, 311.8);
  person(X, sx, py, sz - 1.95, 0, { robe: true, coat: 0x3a628f, sash: 0xe8c66a, lean: 0.25, armL: [1.3, -0.3, 0.9], armR: [1.3, -0.3, 0.9] });
  const [vx, vz] = [lerp(A[0], Bq[0], 0.42), lerp(A[1], Bq[1], 0.42)];
  person(X, vx, H(vx, vz + 0.5) + 0.12, vz, ry, { coat: 0x5a6a4a, legs: 0xe2d6b4, hat: 'cone', lean: 0.25, stride: 0.2, staff: true });
  lanternAt(62.3, 263.4);
}
