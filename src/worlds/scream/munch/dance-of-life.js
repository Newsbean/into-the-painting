import * as THREE from 'three';
import { patch, mix } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { Soup } from '../../../engine/soup.js';
import { kristianiaPerson } from '../kristiania/people.js';

// --- The Dance of Life: couples turning on the green by the water under the column of
// light, and the two who stand apart
export function addDanceOfLife(world, kit) {
  const { R, R2, S, H, wavy, person, krMats } = kit;
  const cx = -92,
    cz = -80;
  S.add(new THREE.Mesh(patch(cx, cz, 17, H, (x, y, z) => mix(0x3f7a44, 0x6fa04a, vnoise(x * 0.2, z * 0.2)), { lift: 0.12, wobble: 0.15, sx: 1.4 }), wavy({ scale: 0.14, warp: 0.4 })));
  const couples = [[0, 0, 0xc8382c], [-6, 2, 0xf4d9e0], [6, -2, 0xe9c96a], [-3, -5, 0x8fb0d8], [9, 4, 0xf2efe6]];
  world.dancers = couples.map(([ox, oz, dress], i) => {
    const a = R() * 6.283;
    const x = cx + ox,
      z = cz + oz;
    // each couple is a small mesh of its own, so that it can turn
    const pair = new Soup();
    kristianiaPerson(pair, { x: 0, y: 0, z: 0.34, ry: Math.PI, R: R2, kind: 'woman', col: dress, hat: 'none', hair: i === 0 ? 0xb8402c : 0x4a2c1a, arms: 1.15, scale: 0.94 });
    kristianiaPerson(pair, { x: 0, y: 0, z: -0.34, ry: 0, R: R2, kind: 'man', col: 0x15151c, legs: 0x15151c, hat: 'none', arms: 1.2, scale: 1 });
    const mesh = pair.mesh(krMats.detail);
    mesh.position.set(x, H(x, z), z);
    mesh.geometry.boundingSphere.radius += 0.5;
    S.add(mesh);
    world.colliders.push({ x, z, r: 0.75, top: H(x, z) + 1.8 });
    return { mesh, ph: a, w: (i % 2 ? -1 : 1) * (0.5 + 0.12 * i) };
  });
  // the two who stand apart: white for the beginning, black for the end
  person(cx - 14, cz + 1, 1.3, { kind: 'woman', col: 0xf6f2e8, hat: 'none', hair: 0xd9a84a });
  person(cx + 15, cz - 1, -1.3, { kind: 'woman', col: 0x121218, hat: 'none', hair: 0x2a1c14 });
}
