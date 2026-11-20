import * as THREE from 'three';
import { mix, xf } from '../../../engine/build.js';
import { vnoise, clamp } from '../../../engine/gl.js';

// --- The Yellow Log: a felled trunk in the forest, bright as butter
export function addYellowLog(world, kit) {
  const { R, H, MB } = kit;
  const lx = 70,
    lz = 64;
  const y = H(lx, lz);
  const sl = Math.atan2(H(lx, lz + 6) - H(lx, lz - 6), 12);
  MB.add(new THREE.CylinderGeometry(0.8, 1.0, 22, 12), (x, yy) => mix(0xf2c230, 0xffe27a, clamp(vnoise(yy * 0.6, x * 3))), xf(lx, y + 1.0, lz, 0.15, 1, 1, 1, Math.PI / 2 - sl, 0));
  MB.add(new THREE.CylinderGeometry(0.98, 0.98, 0.12, 12), 0xf0903a, xf(lx - Math.sin(0.15) * 11, H(lx, lz - 11) + 1.0, lz - 11, 0.15, 1, 1, 1, Math.PI / 2 - sl, 0));
  for (let i = 0; i < 7; i++) {
    const ox = 5 + (i % 4) * 1.5,
      oz = -4 + Math.floor(i / 4) * 0.2;
    MB.add(new THREE.CylinderGeometry(0.5, 0.55, 9, 8), [0xe8c84a, 0xd9a83a, 0xc98a3a][i % 3], xf(lx + ox, H(lx + ox, lz + oz) + 0.5 + Math.floor(i / 4) * 0.95, lz + oz, 0.1, 1, 1, 1, Math.PI / 2 - sl, 0));
  }
  for (let i = 0; i < 9; i++) {
    const a = R() * 6.283,
      d = 6 + R() * 12;
    MB.cyl(0.5, 0.6, 0.5 + R() * 0.4, 0xd9a84a, lx + Math.cos(a) * d, H(lx + Math.cos(a) * d, lz + Math.sin(a) * d), lz + Math.sin(a) * d, 8);
  }
  world.colliders.push({ x: lx, z: lz, hw: 1.1, hd: 11, ry: 0.15, top: y + 2.2 });
}
