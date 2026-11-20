import * as THREE from 'three';
import { gridGeo } from '../../../engine/build.js';
import { lerp } from '../../../engine/gl.js';
import { CLOTH, SKIN } from '../palette.js';
import { rod } from '../helpers.js';
import { person, horse } from '../figures.js';

// ---------------- the tea plantation of Katakura: clipped rows along the hill, pickers between them
export function teaPlantation(world, { H, X, P, minka }) {
  for (let r = 0; r < 7; r++) {
    const zc = 273.5 + r * 4.2,
      x0 = 86 + (r % 2) * 2,
      x1 = 127 - (r % 3) * 2;
    const n = Math.round((x1 - x0) / 1.4);
    const zAt = (x) => zc + Math.sin(x * 0.11 + r) * 1.1;
    P.parts.push(
      gridGeo(
        n,
        4,
        (a, b, i) => {
          const x = lerp(x0, x1, a),
            th = b * Math.PI,
            zz = zAt(x);
          const bump = (0.78 + 0.22 * Math.abs(Math.sin(i * 1.05))) * Math.min(1, Math.sin(a * Math.PI) * 6 + 0.25);
          return [x, H(x, zz) - 0.15 + Math.sin(th) * 1.1 * bump, zz - Math.cos(th) * 0.95 * bump];
        },
        (a, b, i, j) => new THREE.Color(j === 1 || j === 2 ? (i % 2 ? 0x6f9a5a : 0x7fa866) : 0x4f7a4a),
        { sway: 0.04 }
      )
    );
    if (r < 6) {
      const px = 91 + ((r * 13) % 31),
        pz = zAt(px) + 2.1;
      person(X, px, H(px, pz), pz, r % 2 ? Math.PI : 0, { robe: true, coat: CLOTH[(r * 2 + 1) % CLOTH.length], sash: 0x9a4a3a, hat: 'cloth', lean: 0.45, armL: [0.9, 0.15], armR: [0.9, 0.15], carry: 'basket' });
    }
  }
  const sy = minka(130.6, 277.5, Math.PI, 4.6, 4, { lit: false });
  for (const [bx, bz] of [[127.4, 274.6], [128.3, 274.2], [127.8, 275.4]]) rod(X, [bx, H(bx, bz) - 0.1, bz], [bx, H(bx, bz) + 0.55, bz], 0.3, 0.4, 0xc9a86a, 7);
  const px = 122,
    pz = 270.6;
  person(X, px, H(px, pz), pz, Math.PI / 2, { coat: 0x3a628f, legs: SKIN, hat: 'cone', carry: 'pole', load: 0x86aa66, stride: 0.2, lean: 0.12, armR: [2.3, 0.1, 1.2] });
  horse(X, 131.5, H(131.5, 271.4), 271.4, -1.2, { load: 0x86aa66, col: 0x6a5240 });
  person(X, 130.2, H(130.2, 272.4), 272.4, 2.2, { coat: 0x8a6a48, legs: SKIN, hat: 'cone', armR: [1.2, 0.2] });
  void sy;
}
