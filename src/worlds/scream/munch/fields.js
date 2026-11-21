import * as THREE from 'three';
import { Builder, patch, house, mix } from '../../../engine/build.js';
import { yardAt } from '../country/plan.js';
import { skigard, hesje } from '../country/farm.js';
import { horse } from '../country/animals.js';

// --- worked land on the hillside: strips of plough, pasture and stubble; hay on the racks,
// a team at the plough, a fence along the foot of each field. (The farms themselves stand
// on their terraces: country/.)
export function addFields(world, kit) {
  const { R, R2, S, H, wavy, MB, ck, person, burn } = kit;
  const FIELD = [0x5a4478, 0x6f9a4a, 0xc9a43a, 0x3f6a5a, 0x7a4a3a, 0xa8b04a, 0x4a4a7a];
  const fields = (world.fields = []);
  const FM = new Builder();
  for (let i = 0; i < 26; i++) {
    const x = -120 + R() * 280;
    const south = 26 + R() * 60;
    const z = world._roadZ(x) + south;
    if (fields.some((f) => Math.hypot(f[0] - x, f[1] - z) < 26) || Math.hypot(x - 70, z - 64) < 24 || Math.hypot(x - 106, z - 48) < 18) continue;
    const col = FIELD[(R() * FIELD.length) | 0];
    const rad = 11 + R() * 7;
    fields.push([x, z, rad, col]);
    FM.parts.push(patch(x, z, rad, H, (px, py, pz) => mix(col, 0x000000, 0.12 * Math.abs(Math.sin(px * 0.9 + pz * 0.4))).lerp(new THREE.Color(col), 0.5), { lift: 0.14, wobble: 0.2, sx: 1.5, sz: 0.8, ry: R() * 0.6 }));
  }
  S.add(FM.mesh(wavy({ scale: 0.12, warp: 0.5, contrast: 0.5 })));
  const D = ck.s('detail'),
    W = ck.s('boards');
  fields.forEach(([x, z, rad, col], i) => {
    const built = yardAt(x, z, 0.05); // a farm's terrace has been cut through this field: leave it clear
    if (col === 0xc9a43a || col === 0xa8b04a) {
      // stubble: the hay is on the racks, in two rows along the hill
      for (let k = 0; k < 6; k++) R();
      if (!built)
        for (const dz of [-0.28, 0.3]) {
          const hx = x + (R2() - 0.5) * 3,
            hz = z + dz * rad;
          hesje(D, hx, hz, 0.3 + (R2() - 0.5) * 0.2, rad * 1.1 + R2() * 4, H, R2);
          world.colliders.push({ x: hx, z: hz, hw: rad * 0.6, hd: 0.5, ry: 0.3, top: H(hx, hz) + 1.7 });
        }
    } else if (col === 0x5a4478 || col === 0x7a4a3a) {
      // ploughing: a white horse and a brown one side by side, a man behind them at the stilts
      const a = R() * 6.283;
      if (!built) {
        const sn = Math.sin(a),
          cs = Math.cos(a);
        for (const [side, coat] of [[-0.5, 0xe8e2d4], [0.5, 0x6a3a22]]) horse(D, { x: x + cs * side, y: H(x + cs * side, z - sn * side), z: z - sn * side, ry: a, coat, mane: side < 0 ? 0xc8c0b0 : 0x2a1c14 });
        const px = x - sn * 3.3,
          pz = z - cs * 3.3;
        person(px, pz, a, { kind: 'man', col: 0x3a4a6a, sleeve: 0xd9d0c0, hat: 'straw', lean: 0.16, arms: 0.75 });
        // the plough between them: a beam, a share in the ground, two stilts up to his hands
        MB.box(0.09, 0.09, 2.4, 0x4a3a2c, x - sn * 1.9, H(x - sn * 1.9, z - cs * 1.9) + 0.42, z - cs * 1.9, a);
        MB.box(0.07, 0.5, 0.5, 0x2a2a30, x - sn * 2.5, H(x - sn * 2.5, z - cs * 2.5) - 0.05, z - cs * 2.5, a);
        for (const sd of [-0.2, 0.2]) MB.cyl(0.03, 0.03, 1.1, 0x4a3a2c, x - sn * 2.6 + cs * sd, H(x - sn * 2.6, z - cs * 2.6) + 0.2, z - cs * 2.6 - sn * sd, 4, undefined, undefined, 0, 0);
        world.colliders.push({ x, z, r: 1.6, top: H(x, z) + 1.9 });
      }
    }
    if (i % 3 === 0) {
      const fx = x + rad * 1.2,
        fz = z + 4;
      // (a box of a farmhouse stood by every third field: its dice)
      if (H(fx, fz) > 4 && !fields.some((f) => f !== fields[i] && Math.hypot(f[0] - fx, f[1] - fz) < f[2] + 4))
        house(burn.B, burn.W, { R, x: fx, z: fz, y: 0, ry: Math.PI + (R() - 0.5), w: 7, d: 5.5, h: 3.8, wall: [0x8a2f2a, 0xdcd4c0, 0xc9a24a][(R() * 3) | 0], roof: 0x2a2a34, trim: 0xf2efe6, lit: 0.9, roofH: 2.8 });
    }
    // the fence along the downhill edge
    if (!built) skigard(W, [[x - rad * 1.1, z - rad * 0.82], [x, z - rad * 0.86], [x + rad * 1.1, z - rad * 0.82]], H);
  });
}
