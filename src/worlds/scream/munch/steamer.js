import { mix, xf } from '../../../engine/build.js';

// --- a steamer on the fjord, and more sails
export function addSteamer(world, kit) {
  const { MB } = kit;
  const M = xf(46, 0, -150, 0.5);
  MB.box(18, 2.2, 4.4, 0x1c1c26, 0, -0.5, 0, 0, undefined, M);
  MB.box(9, 1.6, 3.2, 0xe8e2d4, -1, 1.7, 0, 0, undefined, M);
  MB.cyl(0.6, 0.7, 3.6, 0xb8382c, 1, 3.3, 0, 10, undefined, M);
  MB.cyl(0.64, 0.64, 0.6, 0x15151c, 1, 6.6, 0, 10, undefined, M);
  for (let k = 0; k < 7; k++) MB.ball(1.0 + k * 0.42, mix(0x4a4a5a, 0x9a94a0, k / 7), 1 - k * 2.6, 8 + k * 1.5, k * 0.6, 1, 0.8, 1, 1, { sway: 0.4 }, M);
  world.colliders.push({ x: 46, z: -150, hw: 9.5, hd: 2.6, ry: 0.5, top: 4 });
}
