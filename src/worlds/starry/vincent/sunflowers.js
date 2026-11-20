import { mix } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { drape, sunflower } from '../helpers.js';

// ---- Sunflowers: a whole field of them beside the road in
export function sunflowers(world, { H, F, GP, R, open, nearTrack }) {
  const X0 = 25,
    X1 = 80,
    Z0 = 85,
    Z1 = 124;
  GP.parts.push(drape(H, (X0 + X1) / 2, (Z0 + Z1) / 2, 0, Z1 - Z0 + 4, X1 - X0 + 5, (i, j) => mix(0x2a5a30, 0x4a6a2a, vnoise(i * 0.9 + 4, j * 0.7)), { lift: 0.16, step: 3.6, cols: 12 }));
  for (let z = Z0; z <= Z1; z += 2.5) {
    const off = (R() - 0.5) * 5;
    for (let x = X0 + off + R(); x <= X1 + off * 0.5; x += 1.1 + R() * 0.5) {
      const pz = z + (R() - 0.5) * 0.7;
      if (nearTrack(x, pz, 1.2) || !open(x, pz, 0.5)) continue;
      sunflower(F, x, H(x, pz) + 0.1, pz, 1.5 + R() * 0.75, -1.9 + (R() - 0.5) * 1.3, 0.3 + R() * 0.12, R, 0.3);
    }
  }
}
