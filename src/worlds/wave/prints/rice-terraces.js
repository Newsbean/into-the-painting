import { mix, xf } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';
import { SKIN, THATCH_D, WOOD_D } from '../palette.js';
import { rod } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- rice terraces west and east, planters bent over the water
export function riceTerraces(world, { H, Q, X, pick, fields, minka }) {
  const planters = (list, n) => {
    const big = list.filter((f) => f.d > 2.6).sort((a, b) => b.d * b.w - a.d * a.w);
    for (let i = 0; i < Math.min(n, big.length); i++) {
      const f = big[(i * 3) % big.length];
      for (let k = 0; k < 2; k++) {
        const x = f.x + (k - 0.5) * 2.2 + (Q() - 0.5) * 0.6,
          z = f.z + (Q() - 0.5) * (f.d - 1.4);
        person(X, x, f.y - 0.12, z, Math.PI + (Q() - 0.5) * 0.5, { coat: pick([0x2f548a, 0x3a628f, 0x7f9aa8, 0x9a4a3a]), legs: SKIN, hat: 'cone', lean: 1.2, armL: [0.25, 0.08], armR: [0.25, 0.08] });
      }
    }
  };
  planters(fields(-222, -160, 229, 262, 8.9, 'rice'), 4);
  planters(fields(181, 227, 229.5, 259, 9.2, 'rice'), 2);
  planters(fields(144, 162, 250, 270, 9, 'rice'), 1);
  fields(1, 15, 231, 243, 7, 'veg');
  fields(-88, -67, 245, 265, 7, 'veg');
  fields(95, 112, 240, 258, 8.5, 'veg');
  // racks of cut rice, farmhouses above the fields
  const hasa = (x, z, ry) => {
    const M = xf(x, H(x, z), z, ry);
    for (const sx of [-1.8, 1.8]) rod(X, [sx, -0.2, 0], [sx, 1.9, 0], 0.05, 0.04, WOOD_D, 4, undefined, M);
    rod(X, [-2.1, 1.8, 0], [2.1, 1.8, 0], 0.04, 0.04, WOOD_D, 4, undefined, M);
    X.box(3.7, 1.15, 0.3, (px, py) => mix(THATCH_D, 0xdcc880, clamp(py / 1.15 + 0.5)), 0, 0.62, 0, 0, undefined, M);
  };
  for (const [x, z, ry] of [[-176, 265.4, 0.1], [-198, 264.6, -0.15], [203, 262.6, 0.1], [154, 272.6, 0.2]]) hasa(x, z, ry);
  minka(-190, 271.5, Math.PI + 0.15, 7.5, 5.2);
  minka(-168.5, 279.5, Math.PI - 0.2, 6, 4.6);
  minka(210, 267.5, Math.PI - 0.15, 7, 5);
  minka(178, 273, Math.PI + 0.2, 6, 4.6);
  minka(166.5, 262, Math.PI + 0.4, 5.2, 4.2, { lit: false });
}
