import * as THREE from 'three';
import { mix, xf } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';

// --- the coast steamer coming up the fjord, her lamps lit, smoke lying back from the funnel
export function addSteamer(world, kit) {
  const { MB } = kit;
  const ry = 0.5,
    M = xf(46, 0, -150, ry),
    L = 24;
  // the hull: black, red below the water line, a white strake at the rail
  MB.add(new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), (x, y) => (y > -0.14 ? new THREE.Color(0xd9d0c0) : y < -0.62 ? new THREE.Color(0x6a2a22) : mix(0x14141c, 0x24222c, clamp(y + 1))), M.clone().multiply(xf(0, 2.1, 0, 0, L / 2, 3.3, 2.7)));
  MB.add(new THREE.CylinderGeometry(1, 1, 0.1, 18), 0x7a6a50, M.clone().multiply(xf(0, 2.1, 0, 0, L / 2 - 0.25, 1, 2.55)));
  // the deckhouse amidships, the wheelhouse on top of it, a boat in its davits
  MB.box(9.5, 1.9, 3.2, 0xe8e2d4, -0.5, 2.15, 0, 0, undefined, M);
  MB.box(3.2, 1.7, 2.6, 0xe8e2d4, 2.2, 4.05, 0, 0, undefined, M);
  MB.box(3.6, 0.12, 3.0, 0x3a2c22, 2.2, 5.75, 0, 0, undefined, M);
  MB.add(new THREE.SphereGeometry(1, 8, 5), 0xd9d0c0, M.clone().multiply(xf(-3.6, 4.5, 0.9, 0, 1.5, 0.36, 0.5)));
  for (let x = -4.6; x <= 3.4; x += 1.15) for (const sz of [-1, 1]) MB.box(0.42, 0.42, 0.05, 0xffc861, x, 3.0, sz * 1.63, 0, { emissive: 1 }, M);
  for (const sz of [-1, 1]) MB.box(0.9, 0.6, 0.05, 0xffd98a, 2.6, 4.75, sz * 1.33, 0, { emissive: 1 }, M);
  // the funnel: buff, a black top, raked a little
  MB.cyl(0.62, 0.72, 4.2, 0xc8a04a, -1.8, 4.05, 0, 12, undefined, M, 0, 0.1);
  MB.cyl(0.66, 0.66, 0.9, 0x15151c, -2.2, 8.1, 0, 12, undefined, M, 0, 0.1);
  // two masts and their stays, a riding light on the fore one
  for (const [mx, h] of [[7.2, 12], [-8.2, 10.5]]) {
    MB.cyl(0.07, 0.13, h, 0x3a2418, mx, 2.1, 0, 6, undefined, M, 0, mx > 0 ? -0.06 : 0.06);
    MB.box(0.05, 0.05, 3.4, 0x3a2418, mx, 2.1 + h * 0.72, 0, 0, undefined, M);
  }
  MB.box(0.26, 0.3, 0.26, 0xffc060, 7.0, 9.4, 0, 0, { emissive: 1 }, M);
  const lamp = new THREE.Vector3(7.0, 9.6, 0).applyMatrix4(M),
    stack = new THREE.Vector3(-2.3, 9.2, 0).applyMatrix4(M);
  world.glows.push({ p: [lamp.x, lamp.y, lamp.z], c: 0xffc060, size: 2.4 });
  kit.maps.lamp(46, -150, 16, 0xffc060, 0.5);
  kit.hearths.push([stack.x, stack.y, stack.z], [stack.x - 0.6, stack.y + 0.4, stack.z + 0.3]);
  world.colliders.push({ x: 46, z: -150, hw: L / 2 + 0.5, hd: 2.9, ry, top: 4 });
  (world.platforms ??= []).push({ minx: 46 - 5, maxx: 46 + 5, minz: -150 - 3.5, maxz: -150 + 3.5, y: 2.2 });
}
