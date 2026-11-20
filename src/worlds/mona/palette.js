import { mix } from '../../engine/build.js';
import { vnoise, smooth, clamp } from '../../engine/gl.js';

// The colours more than one part of this world reaches for: the stone of the hilltop,
// the bridge and the town, the dust of the roads, and the materials of everything that
// came out of the notebooks. A colour only one part uses stays in that part's file.
export const STONE = 0xb8aa88;
export const MARBLE = 0xddd5c2,
  TIMBER = 0x7a5a36,
  DARK = 0x5a4026,
  LINEN = 0xe6dcc0,
  TERRA = 0xa8582e;
export const stoneC = (x, y, z) => mix(0xa89a78, 0xcdbf9c, vnoise(x * 0.9 + z, y * 0.9));
export const woodC = (x, y, z) => mix(0x5e4428, 0x8e6c40, vnoise(x * 1.3 + z * 0.7, y * 1.1));
export const bronzeC = (x, y, z) => mix(0x8a6a38, 0x4f7a66, smooth(0.4, 0.85, vnoise(x * 2.1 + 3, y * 2.1 + z * 1.7)) * 0.65);
export const clayC = (x, y, z) => mix(0xa08462, 0xc2a680, vnoise(x * 0.8 + z * 0.6, y * 0.8));
export const rockC = (x, y, z) => mix(0x4c483a, 0x9a8c66, clamp(y * 0.5 + 0.5) * 0.7 + vnoise(x * 2 + 1, z * 2) * 0.3);
export const leafC = (lo, hi) => (x, y, z) => mix(lo, hi, clamp(y * 0.5 + 0.5) * 0.7 + vnoise(x * 3 + z, y * 3) * 0.3);
// the dust of his roads, and of the paths out to the notebooks
export const dust = (x, y, z) => mix(0xb09a6a, 0xd0b888, vnoise(x * 0.3, z * 0.3));
