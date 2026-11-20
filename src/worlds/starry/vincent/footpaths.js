import { ribbon, mix } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { TRACKS } from '../terrain.js';

// ---- footpaths: ochre earth, and the three red tracks of the wheatfield with their grass verges
export function footpaths(world, { H, GP }) {
  for (const t of TRACKS) {
    if (t.red) {
      GP.parts.push(ribbon(t.pts, t.w + 1.6, H, (x, y, z) => mix(0x2f6a2a, 0x5a9a3a, vnoise(x * 0.5, z * 0.5)), { lift: 0.17, across: 2, step: 2 }));
      GP.parts.push(ribbon(t.pts, t.w, H, (x, y, z) => mix(0x7a2f1c, 0xb85a2a, vnoise(x * 0.45, z * 0.45)), { lift: 0.23, across: 2, step: 2 }));
    } else GP.parts.push(ribbon(t.pts, t.w, H, (x, y, z) => mix(0xa8843f, 0xdcc070, vnoise(x * 0.4, z * 0.4)), { lift: 0.2, across: 2, step: 2 }));
  }
}
