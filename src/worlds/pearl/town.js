import * as THREE from 'three';
import { terrain, tiles, mountainRing, mix } from '../../engine/build.js';
import { fbm, vnoise, smooth, clamp } from '../../engine/gl.js';

// The ground Delft stands on and the polder round it, out to the horizon.
// (The town itself is in delft/.)

// ---------------- ground: cobbled town, green polder beyond
export function addGround(world, kit) {
  const { strokes, S, soft } = kit;
  const groundCol = (x, z, y) => {
    const town = 1 - smooth(120, 160, Math.hypot(x, z * 1.05));
    // in town: trodden earth, where no paving is laid over it. Outside: polder, in long strips of meadow
    const cob = mix(0x8a7a60, 0xa8946e, vnoise(x * 0.3, z * 0.3));
    const pol = mix(0x7f9a4a, 0xb0b458, vnoise(x * 0.02, z * 0.04)).lerp(new THREE.Color(0x5f8a42), smooth(0.45, 0.6, vnoise(x * 0.012 + 3, z * 0.06)) * 0.5);
    const c = pol.lerp(cob, town);
    if (y < -0.4) c.lerp(new THREE.Color(0x5a4a3a), 0.7);
    return c;
  };
  S.add(tiles(terrain((x, z) => world.baseH(x, z), 420, 230, groundCol, 0.72, 2.2), soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.26, hueVar: 0.2 }), { n: 6 }));
}

// distant polder: church spires and more mills on the horizon
export function addFarPolder(world, kit) {
  const { S, soft } = kit;
  const far = mountainRing({ radius: 400, base: -3, profile: (a) => 9 + fbm(a * 9, 0.5, 3) * 16 + (Math.sin(a * 23) > 0.94 ? 26 : 0), colorFn: (x, y) => mix(0x6f8a5a, 0x8fa0a0, clamp(y / 30)), seg: 300, depth: 40 });
  const fm = new THREE.Mesh(far, soft({ scale: 0.02, side: THREE.DoubleSide, rim: 0 }));
  fm.frustumCulled = false;
  S.add(fm);
}
