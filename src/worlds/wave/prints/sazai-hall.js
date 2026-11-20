import * as THREE from 'three';
import { mix, xf } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';
import { INK, SKIN, STONE_D, TIMBER, WOOD, WOOD_D } from '../palette.js';
import { beam } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- the Sazai hall: a broad balcony, and everyone on it looking the same way
export function sazaiHall(world, { H, X, spanY, wall, deck, toFuji, lanternAt, glow }) {
  const hx = 150,
    F = H(hx, 292) + 0.3;
  const lo = spanY(hx, 292, 14, 8)[0];
  X.box(14.4, F - lo + 0.6, 8.4, STONE_D, hx, lo - 0.6, 292);
  X.box(14, 4.4, 8, 0xe9dfc6, hx, F, 292);
  for (let k = 0; k <= 6; k++) X.box(0.28, 4.4, 0.28, TIMBER, 143 + k * 2.333, F, 287.95);
  for (let k = 0; k < 6; k++) if (k !== 2 && k !== 3) X.box(1.7, 2.5, 0.08, 0xf6e6b8, 144.17 + k * 2.333, F + 0.5, 287.94, 0, { emissive: 0.5 });
  X.box(4.3, 2.9, 0.08, 0x3a2a1e, hx, F, 287.94);
  X.box(14.3, 0.3, 0.3, TIMBER, hx, F + 4.1, 287.9);
  X.hip(12.6, 18.6, 4.2, (px, py) => mix(0x2c3848, 0x4a5a6a, clamp(py / 4.2)), hx, F + 4.4, 292, Math.PI / 2, undefined, undefined, 0.55);
  X.box(10.8, 0.4, 0.6, INK, hx, F + 8.5, 292);
  wall(hx, 292, 7.2, 4.2, 0, F + 8.6);
  // the balcony, out over the slope on tall posts
  X.box(19.5, 0.3, 8.5, WOOD, 149.25, F - 0.3, 283.75);
  X.box(3.5, 0.3, 8, WOOD, 141.25, F - 0.3, 292);
  for (let k = 1; k < 7; k++) X.box(19.5, 0.02, 0.07, WOOD_D, 149.25, F, 279.5 + k * 1.21);
  deck(139.5, 159, 279.5, 288, F + 0.02);
  deck(139.5, 143, 288, 296, F + 0.02);
  for (const px of [140, 143.8, 147.6, 151.4, 155.2, 158.6]) {
    for (const pz of [279.9, 283.7, 287.6]) {
      const g = H(px, pz);
      X.box(0.34, F - 0.3 - g + 0.5, 0.34, TIMBER, px, g - 0.5, pz);
    }
    X.box(0.2, 0.22, 7.9, TIMBER, px, F - 1.3, 283.75);
    beam(X, [px, H(px, 279.9) + 0.9, 279.9], [px, F - 0.5, 283.7], 0.16, 0.16, TIMBER);
  }
  for (const [pz, dy] of [[279.9, 1.7], [279.9, 3.3], [283.7, 1.7]]) X.box(18.8, 0.22, 0.2, TIMBER, 149.3, F - dy, pz);
  for (let x = 139.6; x <= 159; x += 1.76) X.box(0.16, 1.05, 0.16, TIMBER, x, F, 279.6);
  for (const hh of [0.5, 0.98]) X.box(19.5, 0.1, 0.12, TIMBER, 149.25, F + hh, 279.6);
  for (let z = 281.3; z <= 288; z += 1.68) X.box(0.16, 1.05, 0.16, TIMBER, 158.9, F, z);
  for (const hh of [0.5, 0.98]) X.box(0.12, 0.1, 8.4, TIMBER, 158.9, F + hh, 283.8);
  for (let z = 281.3; z <= 290; z += 1.74) X.box(0.16, 1.05, 0.16, TIMBER, 139.6, F, z);
  for (const hh of [0.5, 0.98]) X.box(0.12, 0.1, 10.4, TIMBER, 139.6, F + hh, 284.8);
  wall(149.25, 279.6, 9.75, 0.15, 0, F + 1.0, F - 0.4);
  wall(158.9, 283.8, 0.15, 4.2, 0, F + 1.0, F - 0.4);
  wall(139.6, 284.8, 0.15, 5.2, 0, F + 1.0, F - 0.4);
  // visitors: pointing, shading their eyes, resting with their bundles
  const fy = F + 0.02;
  person(X, 146.2, fy, 280.5, toFuji(146.2, 280.5), { coat: 0x2f548a, legs: 0xe2d6b4, hatBack: true, armR: [1.5, 0.2] });
  person(X, 147.7, fy, 280.7, toFuji(147.7, 280.7) + 0.1, { coat: 0x8a6a48, legs: 0x3a4a5a, hat: 'cone', armL: [2.0, 0.1, 1.9] });
  person(X, 151.6, fy, 280.35, toFuji(151.6, 280.35), { coat: 0x5a6a4a, legs: SKIN, lean: 0.4, armL: [1.15, 0.15], armR: [1.15, 0.15] });
  person(X, 154.6, fy, 282.2, toFuji(154.6, 282.2), { pose: 'kneel', coat: 0x4a5560, hat: 'none' });
  person(X, 155.9, fy, 282.7, toFuji(155.9, 282.7) - 0.4, { pose: 'kneel', robe: true, coat: 0x9a4a3a, sash: 0xe8c66a, armR: [1.5, 0.3] });
  X.ball(0.3, 0x5f8a7a, 153.3, fy + 0.22, 282.4, 1.2, 0.75, 1, 0);
  X.add(new THREE.ConeGeometry(0.42, 0.22, 8, 1, true), 0xd9c28a, xf(153.2, fy + 0.11, 283.3));
  person(X, 143.3, fy, 281.3, toFuji(143.3, 281.3), { robe: true, coat: 0x7f9aa8, sash: 0x2f548a, armR: [0.5, 0.5] });
  person(X, 144.1, fy, 280.8, toFuji(144.1, 280.8), { s: 0.55, coat: 0x9a4a3a, legs: SKIN, armR: [1.7, 0.2] });
  person(X, 141.2, fy, 290.8, Math.PI / 2, { coat: 0xe9e2cc, legs: 0xe9e2cc, hat: 'cone', carry: 'pack', staff: true });
  person(X, 149.2, fy, 286.9, Math.PI, { robe: true, coat: 0x6f7670, hat: 'cloth', hatCol: SKIN, armL: [1.2, -0.25, 0.6], armR: [1.2, -0.25, 0.6] });
  lanternAt(137.6, 293.2);
  glow(hx, F + 2.2, 287.6, 2.2);
}
