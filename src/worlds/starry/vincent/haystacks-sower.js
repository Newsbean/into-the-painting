import { mix, xf } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { drape, fence } from '../helpers.js';
import { person } from '../people.js';

// ---- Haystacks in Provence, and The Sower striding over the ploughland beyond them
export function haystacksSower(world, { H, P, F, GP, R, glow, solid, stack }) {
  stack(-75, -70, 2.6, 4.6);
  stack(-78.5, -63.5, 2.2, 3.8);
  stack(-73.5, -60.5, 1.7, 2.8);
  const LM = xf(-71.8, H(-71.8, -70), -70, Math.PI / 2, 1, 1, 1, -0.3);
  for (const sx of [-0.25, 0.25]) P.box(0.06, 3.7, 0.06, 0x8a6a3a, sx, 0, 0, 0, undefined, LM);
  for (let i = 0; i < 7; i++) P.box(0.5, 0.05, 0.05, 0x8a6a3a, 0, 0.4 + i * 0.5, 0, 0, undefined, LM);
  fence(F, H, [[-70.5, -57], [-69, -64], [-70.2, -72], [-73.5, -77.5]], R);
  // violet and ochre furrows running east-west
  const cx = -88,
    cz = -96;
  GP.parts.push(drape(H, cx, cz, 0.1, 31, 41, (i, j) => mix(i % 2 ? 0x5a4a9a : 0xb8823a, i % 2 ? 0x3f4f9a : 0xd9a24a, vnoise(i * 1.3, j * 1.9)), { lift: 0.18, step: 1.1, cols: 14 }));
  const sx = -85,
    sz = -95,
    sy = H(sx, sz) + 0.12;
  person(P, sx, sy, sz, -1.45, { coat: 0x34479a, legs: 0x2a2f6a, hat: 'straw', hatCol: 0xd9b84a, stride: 0.5, bend: 0.12, arms: [Math.PI - 0.25, Math.PI - 1.3], armZ: [-0.1, 0.5], scale: 1.12 });
  P.ball(0.2, 0xe8e2d0, -0.25, 0.98, 0.14, 1, 1.2, 0.8, 0, undefined, xf(sx, sy, sz, -1.45, 1.12, 1.12, 1.12));
  solid(sx, sz, 0.4, sy + 2);
  for (let i = 0; i < 6; i++) glow(sx - 0.9 - R() * 1.2, sy + 0.5 + R() * 0.8, sz - 0.5 + (R() - 0.5), 0xffe08a, 0.28, 0.5);
}
