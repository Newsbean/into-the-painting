import * as THREE from 'three';
import { patch, mix } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';

// --- The Dance of Life: couples turning on the shore meadow under the column of light
export function addDanceOfLife(world, kit) {
  const { R, S, H, wavy, person } = kit;
  const cx = -92,
    cz = -80;
  S.add(new THREE.Mesh(patch(cx, cz, 17, H, (x, y, z) => mix(0x3f7a44, 0x6fa04a, vnoise(x * 0.2, z * 0.2)), { lift: 0.12, wobble: 0.15, sx: 1.4 }), wavy({ scale: 0.14, warp: 0.4 })));
  const couples = [[0, 0, 0xc8382c], [-6, 2, 0xf4d9e0], [6, -2, 0xe9c96a], [-3, -5, 0x8fb0d8], [9, 4, 0xf2efe6]];
  couples.forEach(([ox, oz, dress], i) => {
    const a = R() * 6.283;
    const x = cx + ox,
      z = cz + oz;
    person(x + Math.sin(a) * 0.36, z + Math.cos(a) * 0.36, a + Math.PI, { coat: dress, dress: true, hair: i === 0 ? 0xb8402c : 0x4a2c1a, arms: 0.9, lean: 0.06 });
    person(x - Math.sin(a) * 0.36, z - Math.cos(a) * 0.36, a, { coat: 0x15151c, legs: 0x15151c, arms: 0.9, lean: 0.06 });
  });
  // the two who stand apart: white for the beginning, black for the end
  person(cx - 14, cz + 1, 1.3, { coat: 0xf6f2e8, dress: true, hair: 0xd9a84a, arms: 0.2 });
  person(cx + 15, cz - 1, -1.3, { coat: 0x121218, dress: true, hair: 0x2a1c14, arms: 0.1 });
}
