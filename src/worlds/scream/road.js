import * as THREE from 'three';
import { Builder, ribbon, patch, mix } from '../../engine/build.js';
import { vnoise } from '../../engine/gl.js';

// ---------------- the road and its railing
// The surface is a mesh of its own. The railing goes into kit.B, the builder it
// shares with the town and the harbour. Returns the points spaced along the road:
// the trees, the people, the leaves and the story are all placed from them.
export function addRoad(world, kit) {
  const { S, H, wavy, B } = kit;
  const pts = world.roadPts();
  const RB = new Builder();
  RB.parts.push(ribbon(pts, 6.4, H, (x, y, z) => mix(0x6a4428, 0xa8743a, vnoise(x * 0.2, z * 0.2)).lerp(new THREE.Color(0x4a4468), vnoise(x * 0.07 + 3, z * 0.07) * 0.45), { lift: 0.16, across: 4 }));
  RB.parts.push(patch(-172, -74, 30, H, (x, y, z) => mix(0x7a6a5a, 0xa08a6a, vnoise(x * 0.3, z * 0.3)), { lift: 0.14, wobble: 0.08 }));
  S.add(RB.meshes(wavy({ scale: 0.12, warp: 0.25, angle: 1.2, contrast: 0.5 })));

  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5);
  const cs = curve.getSpacedPoints(160);
  world.rail = [];
  for (let i = 0; i < cs.length - 1; i++) {
    const a = cs[i],
      b = cs[i + 1];
    if (a.x < -150) break;
    if (Math.abs((a.x + b.x) / 2 - 104) < 1.9) continue; // the gap where the path goes down to the boathouses
    const tx = b.x - a.x,
      tz = b.z - a.z,
      L = Math.hypot(tx, tz);
    // fjord side is to the right when walking west
    const nx = -tz / L,
      nz = tx / L;
    const px = (a.x + b.x) / 2 + nx * 3.0,
      pz = (a.z + b.z) / 2 + nz * 3.0;
    const y = H(px - nx * 0.8, pz - nz * 0.8);
    const ry = Math.atan2(tx, tz);
    for (const hh of [0.42, 0.78, 1.14]) B.box(0.09, 0.07, L + 0.05, 0x5a3320, px, y + hh, pz, ry);
    if (i % 2 === 0) B.box(0.14, 1.3, 0.14, 0x3a2418, px, y, pz, ry);
    world.colliders.push({ x: px, z: pz, hw: 0.2, hd: L / 2, ry, top: y + 1.25 });
  }
  return cs;
}
