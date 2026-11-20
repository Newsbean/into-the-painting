import * as THREE from 'three';
import { Builder, patch, house, mix, xf } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';

// --- worked land on the bare hillside: strips of plough, pasture and stubble, ricks, fences, farms
export function addFields(world, kit) {
  const { R, S, H, maps, wavy, MB, proxyM, person } = kit;
  const FIELD = [0x5a4478, 0x6f9a4a, 0xc9a43a, 0x3f6a5a, 0x7a4a3a, 0xa8b04a, 0x4a4a7a];
  const fields = [];
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
  const horse = (x, z, ry, col) => {
    const M = xf(x, H(x, z), z, ry);
    MB.box(0.62, 0.75, 1.9, col, 0, 0.95, 0, 0, undefined, M);
    for (const [ox, oz] of [[-0.22, -0.75], [0.22, -0.75], [-0.22, 0.75], [0.22, 0.75]]) MB.box(0.16, 1.0, 0.18, col, ox, 0, oz, 0, undefined, M);
    MB.box(0.34, 0.95, 0.4, col, 0, 1.45, 1.05, 0, undefined, M.clone().multiply(xf(0, 0, 0, 0, 1, 1, 1, 0.5, 0)));
    MB.box(0.3, 0.36, 0.72, col, 0, 2.05, 1.62, 0, undefined, M);
    MB.box(0.1, 0.8, 0.1, 0x2a1c14, 0, 1.0, -1.02, 0, undefined, M);
  };
  fields.forEach(([x, z, rad, col], i) => {
    if (col === 0xc9a43a || col === 0xa8b04a) {
      // stubble: hayricks in rows
      for (let k = 0; k < 6; k++) {
        const hx = x + (k % 3 - 1) * 5.5 + (R() - 0.5),
          hz = z + (Math.floor(k / 3) - 0.5) * 6;
        MB.cyl(0.15, 1.5, 2.6, (px, py) => mix(0xb8862a, 0xf2d060, clamp(py / 2.6 + 0.5)), hx, H(hx, hz), hz, 8);
        maps.blob(hx, hz, 2.4, 0.3);
      }
    } else if (col === 0x5a4478 || col === 0x7a4a3a) {
      // spring ploughing: a white horse and a brown one, a man behind
      const a = R() * 6.283;
      horse(x - 0.5, z, a, 0xe8e2d4);
      horse(x + 0.5, z, a, 0x6a3a22);
      person(x - Math.sin(a) * 3.2, z - Math.cos(a) * 3.2, a, { coat: 0x3a4a6a, hat: 'straw', lean: 0.2, arms: 0.6 });
    }
    if (i % 3 === 0) {
      const fx = x + rad * 1.2,
        fz = z + 4;
      if (H(fx, fz) > 4 && !fields.some((f) => f !== fields[i] && Math.hypot(f[0] - fx, f[1] - fz) < f[2] + 4))
        house(MB, proxyM, { R, x: fx, z: fz, ry: Math.PI + (R() - 0.5), w: 7, d: 5.5, h: 3.8, wall: [0x8a2f2a, 0xdcd4c0, 0xc9a24a][(R() * 3) | 0], roof: 0x2a2a34, trim: 0xf2efe6, lit: 0.9, roofH: 2.8 });
    }
    // post-and-rail along the downhill edge
    for (let k = -3; k <= 3; k++) MB.box(0.12, 0.9, 0.12, 0x3a2418, x + k * 2.6, H(x + k * 2.6, z - rad * 0.8), z - rad * 0.8);
  });
}
