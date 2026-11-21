import * as THREE from 'three';
import { waterMaterial } from '../../engine/paint.js';
import { trader } from './delft/ship.js';

// The water of Delft, the trader moored in the harbour, the small boats, the gnats.
// (The quays and bridges are in delft/.) What is built here goes into kit.B.

// canal
export function addCanal(world, kit) {
  const { strokes, S } = kit;
  // one sheet under the whole town: it shows wherever the ground is cut away for a canal
  const wg = new THREE.PlaneGeometry(900, 420, 60, 28);
  wg.rotateX(-Math.PI / 2);
  const canal = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.oil, deep: 0x2f4238, shallow: 0x5a7a62, reflect: 0xf2c98a, glint: 0xfff0c0, scale: 0.09, glintAmt: 1.6, flow: 0.006 }));
  canal.position.y = world.waterY;
  S.add(canal);
}

// ---------------- the trader moored in the harbour (delft/ship.js draws her)
export function addTrader(world, kit) {
  world.crowNest = trader(kit.B, world, { x: 104, z: 0 }).crowNest;
}

// gnats over the canal
export function addGnats(world, kit) {
  const { R } = kit;
  for (let i = 0; i < 60; i++) world.glows.push({ p: [(R() - 0.5) * 240, 0.3 + R() * 2.5, (R() - 0.5) * 12], c: 0xfff0c0, size: 0.12 + R() * 0.1, drift: 1.4 });
}
