import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { FOAM, INDIGO, INK, SKIN, THATCH_D, TIMBER, VERM, WOOD, WOOD_D } from '../palette.js';
import { rod } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- a tea house on the road: banners out, travellers resting with the mountain in view
export function teaHouse(world, { H, X, maps, spanY, thatch, glow, wall, deck, toFuji }) {
  const tx = -50,
    tz = 222,
    w = 9,
    d = 5;
  const [lo, hi] = spanY(tx, tz, w, d);
  const fy = hi + 0.4;
  X.box(w - 0.4, fy - lo + 0.1, d - 0.4, 0x6a5a48, tx, lo - 0.3, tz);
  X.box(w, 0.22, d, WOOD, tx, fy - 0.22, tz);
  for (const px of [-4.35, -1.45, 1.45, 4.35]) for (const pz of [-2.4, 2.4]) X.box(0.2, 2.9, 0.2, TIMBER, tx + px, fy, tz + pz);
  X.box(w - 0.2, 2.7, 0.12, 0xe2d6b4, tx, fy, tz + 2.4);
  for (const sx of [-4.4, 4.4]) X.box(0.12, 2.7, 2.5, 0xe2d6b4, tx + sx, fy, tz + 1.2);
  for (const pz of [-2.4, 2.4]) X.box(w + 0.3, 0.2, 0.2, TIMBER, tx, fy + 2.75, tz + pz);
  X.hip(d + 3.2, w + 2.8, 2.5, thatch, tx, fy + 2.9, tz - 0.4, Math.PI / 2, undefined, undefined, 0.5);
  X.box((w + 2.8) * 0.5 + 0.5, 0.22, 0.55, THATCH_D, tx, fy + 5.32, tz - 0.4);
  for (let k = -2; k <= 2; k++) X.box(1.55, 0.75, 0.05, k % 2 ? 0x243a6a : INDIGO, tx + k * 1.72, fy + 1.95, tz - 2.46, 0, { sway: 0.5 });
  X.box(1.3, 0.75, 0.9, 0x8a6a48, tx + 3.2, fy, tz + 1.5);
  X.box(0.5, 0.3, 0.06, 0xffb060, tx + 3.2, fy + 0.15, tz + 1.02, 0, { emissive: 1 });
  X.ball(0.22, INK, tx + 3.2, fy + 0.95, tz + 1.5, 1, 0.8, 1, 0);
  X.box(0.4, 0.55, 0.4, 0xffd58a, tx + 4.35, fy + 1.3, tz - 2.75, 0, { emissive: 1 });
  glow(tx + 4.35, fy + 1.6, tz - 2.9);
  maps.lamp(tx + 4.35, tz - 3.2, 7, 0xffc878, 0.7);
  wall(tx, tz + 2.4, 4.5, 0.2, 0, fy + 2.7);
  for (const sx of [-4.4, 4.4]) wall(tx + sx, tz + 1.2, 0.2, 1.3, 0, fy + 2.7);
  deck(tx - 4.5, tx + 4.5, tz - 2.5, tz + 2.5, fy);
  maps.blob(tx, tz, 8, 0.4);
  // benches under red felt, a big paper umbrella, banners on tall poles
  for (const bx of [tx - 2.5, tx + 2.3]) {
    const by = H(bx, tz - 3.9);
    X.box(2.3, 0.08, 0.9, WOOD, bx, by + 0.4, tz - 3.9);
    X.box(2.1, 0.03, 0.8, VERM, bx, by + 0.48, tz - 3.9);
    for (const a of [-1, 1]) for (const b of [-0.35, 0.35]) X.box(0.1, 0.4, 0.1, WOOD_D, bx + a, by, tz - 3.9 + b);
  }
  const ux = tx - 5.9,
    uz = tz - 3.5,
    uy = H(ux, uz);
  rod(X, [ux, uy - 0.2, uz], [ux, uy + 2.9, uz], 0.05, 0.04, TIMBER, 4);
  X.add(new THREE.ConeGeometry(1.7, 0.55, 10, 1, true), VERM, xf(ux, uy + 2.75, uz));
  for (const [bx, c1, c2] of [[tx + 5.8, INDIGO, FOAM], [tx + 7.1, 0xe9dfc6, VERM], [tx - 7.6, 0xe9dfc6, INDIGO]]) {
    const bz = tz - 4.0,
      by = H(bx, bz);
    rod(X, [bx, by - 0.3, bz], [bx, by + 4.9, bz], 0.045, 0.035, TIMBER, 4);
    X.box(0.85, 0.05, 0.05, TIMBER, bx + 0.4, by + 4.6, bz);
    X.box(0.72, 2.8, 0.03, c1, bx + 0.43, by + 1.25, bz, 0, { sway: 0.7 });
    X.box(0.72, 0.52, 0.035, c2, bx + 0.43, by + 4.05, bz, 0, { sway: 0.7 });
  }
  // the people of the house and of the road
  person(X, tx + 0.6, fy, tz - 1.7, Math.PI, { robe: true, coat: 0x9a4a3a, sash: INDIGO, armL: [1.1, 0.1], armR: [1.1, 0.1] });
  X.box(0.45, 0.04, 0.3, INK, tx + 0.6, fy + 0.98, tz - 2.2);
  const by = H(tx - 2.5, tz - 3.9) + 0.1;
  person(X, tx - 3.1, by, tz - 3.85, Math.PI, { pose: 'sit', coat: 0x3a628f, legs: 0xe2d6b4, hatBack: true, armR: [1.2, 0.1, 1.5] });
  person(X, tx - 2.0, by, tz - 3.85, Math.PI - 0.2, { pose: 'sit', coat: 0x5a6a4a, legs: SKIN, hat: 'cone' });
  person(X, tx + 2.4, H(tx + 2.4, tz - 3.9) + 0.1, tz - 3.85, toFuji(tx + 2.4, tz - 3.85), { pose: 'sit', coat: 0x8a6a48, legs: 0x3a4a5a, armR: [1.5, 0.2] });
  person(X, tx - 0.9, fy, tz - 2.1, Math.PI, { pose: 'sit', seat: 0.02, robe: true, coat: 0x7f9aa8, sash: 0xcdbb98 });
  person(X, tx + 5.2, H(tx + 5.2, tz - 6), tz - 6, -Math.PI / 2 + 0.3, { coat: 0x2f548a, legs: 0xe2d6b4, hat: 'cone', carry: 'pack', stride: 0.2, staff: true });
}
