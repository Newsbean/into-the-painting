import { xf } from '../../../engine/build.js';
import { SKIN, WOOD_D } from '../palette.js';
import { rod, beam } from '../helpers.js';
import { person, crane } from '../figures.js';

// ---------------- cranes on the shore, as at Umezawa
export function cranes(world, { H, X }) {
  for (const [x, z, ry, pose, s] of [[-74, 203.2, 0.4, 0, 1], [-71.4, 205.1, 2.1, 1, 0.95], [-69, 202.5, -0.6, 0, 1.05], [-66.2, 204.5, 1.2, 2, 1], [-63.4, 203, 3.0, 1, 1], [-60.8, 205.5, 0.2, 0, 0.95], [-58.5, 202.6, -1.4, 0, 1], [-67.6, 200.7, 0.9, 1, 1], [-72.8, 201, -2.2, 2, 1.05]]) crane(X, x, H(x, z), z, ry, pose, s);
}

// ---------------- nets drying on the beach, and the people who mend them
export function nets(world, { H, X }) {
  for (const [nx, nz, ry] of [[-101, 204.6, 0.2], [-93, 207.6, -0.25]]) {
    const M = xf(nx, H(nx, nz), nz, ry);
    for (const sx of [-2.6, 2.6]) rod(X, [sx, -0.3, 0], [sx, 2.5, 0], 0.07, 0.06, WOOD_D, 4, undefined, M);
    rod(X, [-2.9, 2.45, 0], [2.9, 2.45, 0], 0.045, 0.045, WOOD_D, 4, undefined, M);
    for (const sz of [-1, 1]) beam(X, [0, 2.45, 0], [0, 0.1, sz * 1.5], 5.0, 0.03, sz > 0 ? 0x4a6a80 : 0x5f8298, { sway: 0.15 }, M);
  }
  person(X, -97.4, H(-97.4, 205.9), 205.9, 2.4, { pose: 'kneel', coat: 0x3a628f, hat: 'cloth', lean: 0.4, armL: [0.9, 0.1], armR: [0.9, 0.1] });
  person(X, -89.6, H(-89.6, 210.6), 210.6, 0.3, { coat: 0x5a6a4a, legs: SKIN, hat: 'cone', carry: 'pole', stride: 0.2, lean: 0.12, armR: [2.3, 0.1, 1.2] });
  for (const [bx, bz] of [[-98.6, 207.3], [-97.7, 207.9], [-104.5, 206.6]]) rod(X, [bx, H(bx, bz) - 0.05, bz], [bx, H(bx, bz) + 0.5, bz], 0.26, 0.36, 0xc9a86a, 7);
  const by = H(-107, 208.6);
  X.box(5.2, 0.75, 1.5, 0xd9c690, -107, by + 0.05, 208.6, 0.9);
  X.box(5.5, 0.12, 1.7, 0x8a6a48, -107, by + 0.8, 208.6, 0.9);
}
