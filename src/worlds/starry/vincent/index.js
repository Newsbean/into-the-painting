import * as THREE from 'three';
import { paintMaterial } from '../../../engine/paint.js';
import { Builder } from '../../../engine/build.js';
import { rng } from '../../../engine/gl.js';
import { Raw, flame, haystack } from '../helpers.js';
import { footpaths } from './footpaths.js';
import { cafeTerrace } from './cafe-terrace.js';
import { yellowHouse } from './yellow-house.js';
import { vincentsChair } from './chair.js';
import { sunflowers } from './sunflowers.js';
import { almondBlossom } from './almond-blossom.js';
import { redVineyard } from './red-vineyard.js';
import { wheatfieldCrows } from './wheatfield-crows.js';
import { haystacksSower } from './haystacks-sower.js';
import { canalRhone } from './canal-rhone.js';
import { patchwork } from './patchwork.js';

// the world's tick keeps the crows flying
export { flyCrows } from './wheatfield-crows.js';

// ------------------------------------------------------------------
// Everything else he painted, set down around the village.
// ------------------------------------------------------------------
export function vincent(world, { S, H, maps, strokes, B, P, open, nearRoad, nearTrack, inKeep }) {
  const R = rng(1853);
  const F = new Raw(); // petals, leaves, rails
  const TR = new Raw(); // hedges and windbreak cypresses
  const T2 = new Builder(); // the orchard
  const GP = new Builder(); // fields and tracks draped over the ground
  const glow = (x, y, z, c, size, drift = 0) => world.glows.push({ p: [x, y, z], c, size, drift });
  const solid = (x, z, r, top) => world.colliders.push({ x, z, r, top });
  const gasLamp = (x, z, h = 4.4, col = 0xffc23a, size = 3.4, radius = 10, strength = 0.9) => {
    const y = H(x, z);
    B.cyl(0.07, 0.12, h, 0x14161f, x, y - 0.2, z, 5);
    B.box(0.4, 0.5, 0.4, col, x, y + h - 0.2, z, 0, { emissive: 1 });
    B.hip(0.62, 0.62, 0.24, 0x14161f, x, y + h + 0.3, z, 0, undefined, undefined, 0);
    glow(x, y + h + 0.05, z, col, size);
    maps.lamp(x, z, radius, col, strength);
    solid(x, z, 0.2, y + h);
  };
  const tree = (x, z, h, r) => {
    const y = H(x, z);
    flame(TR, x, y - 0.4, z, h, r, R);
    solid(x, z, 0.8, y + h * 0.7);
    maps.blob(x, z, 3, 0.4);
  };
  const stack = (x, z, r, h) => {
    const y = H(x, z);
    haystack(P, x, y, z, r, h, R);
    solid(x, z, r * 0.95, y + h);
    maps.blob(x, z, r * 2.2, 0.45);
  };

  // The set pieces, one file each. They get what build() handed over plus the dice, builders and
  // helpers made above: inside vincent/ kit.R is this 1853 stream, not the village's.
  const kit = { S, H, maps, strokes, B, P, open, nearRoad, nearTrack, inKeep, R, F, TR, T2, GP, glow, solid, gasLamp, tree, stack };
  // their order is the order of the dice
  footpaths(world, kit);
  cafeTerrace(world, kit);
  yellowHouse(world, kit);
  vincentsChair(world, kit);
  sunflowers(world, kit);
  almondBlossom(world, kit);
  redVineyard(world, kit);
  wheatfieldCrows(world, kit);
  haystacksSower(world, kit);
  canalRhone(world, kit);
  patchwork(world, kit);

  if (TR.p.length) T2.parts.push(TR.geometry());
  S.add(T2.mesh(paintMaterial({ stroke: strokes.wavy, scale: 0.16, contrast: 0.7, hueVar: 0.8, warp: 0.5, accent: 0xb9d06a, accentAmt: 0.3, impasto: 0.16, rim: 0.3, band: 0.26, wallStretch: 0.5, angle: 1.57, side: THREE.DoubleSide, emissive: 1.4 })));
  S.add(GP.mesh(paintMaterial({ stroke: strokes.oil, scale: 0.07, contrast: 0.6, hueVar: 0.55, warp: 0.9, accent: 0xf6e9a0, accentAmt: 0.25, impasto: 0.14, rim: 0.05, band: 0.3, side: THREE.DoubleSide })));
  S.add(F.mesh(paintMaterial({ stroke: strokes.dab, scale: 0.6, contrast: 0.32, hueVar: 0.45, warp: 0.1, rim: 0.12, band: 0.3, side: THREE.DoubleSide, emissive: 1.5 })));
}
