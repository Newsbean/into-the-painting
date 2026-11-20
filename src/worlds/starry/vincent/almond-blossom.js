import { patch, mix } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { almond } from '../helpers.js';

// ---- Almond Blossom: the orchard under the asylum wall
export function almondBlossom(world, { H, maps, F, T2, GP, R, open, nearTrack, solid }) {
  GP.parts.push(patch(105, 82, 21, H, (x, y, z) => mix(0x2f8f8a, 0x4fb0a8, vnoise(x * 0.15, z * 0.15)), { lift: 0.15, wobble: 0.15, sx: 1.05, sz: 0.85, rings: 5, seg: 26 }));
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 4; j++) {
      const x = 90 + i * 7.8 + (R() - 0.5) * 2.4,
        z = 68.5 + j * 8.2 + (R() - 0.5) * 2.4;
      if (nearTrack(x, z, 2.2) || !open(x, z, 2)) continue;
      const y = H(x, z);
      almond(T2, F, x, y, z, R);
      solid(x, z, 0.4, y + 2.2);
      maps.blob(x, z, 4, 0.32);
    }
}
