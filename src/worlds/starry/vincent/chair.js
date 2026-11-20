import { xf } from '../../../engine/build.js';
import { chair } from '../helpers.js';

// ---- Vincent's Chair beside the easel: pipe and tobacco on the rush seat
export function vincentsChair(world, { H, P }) {
  const x = 75.0,
    z = 42.3,
    y = H(x, z) + 0.15; // on top of the garden's gravel
  chair(P, x, y, z, 2.2, { s: 1.12 });
  const M = xf(x, y + 0.57, z, 2.2);
  P.cyl(0.04, 0.032, 0.07, 0x5a3418, 0.06, 0, 0.02, 5, undefined, M);
  P.box(0.028, 0.022, 0.22, 0x3a2414, 0.06, 0.02, 0.14, 0, undefined, M);
  P.ball(0.075, 0xf2eedc, -0.1, 0.03, -0.02, 1.2, 0.4, 0.9, 0, undefined, M);
  P.box(0.5, 0.2, 0.34, 0x8a5a2a, x - 0.75, y, z + 0.55, 0.4); // his box of colours
}
