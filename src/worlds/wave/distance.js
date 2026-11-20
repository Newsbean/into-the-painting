import * as THREE from 'three';
import { gridGeo, mountainRing, mix } from '../../engine/build.js';
import { fbm, clamp } from '../../engine/gl.js';

// What is too far away to walk to: the mountain, the bands of mist, the far
// coast and the lights along it.

// ---------------- Fuji, small and patient
export function addFuji(world, { S, flat }) {
  const FX = 178,
    FZ = -1120;
  const g = gridGeo(
    26,
    48,
    (a, b) => {
      const ang = b * Math.PI * 2;
      const r = 330 * Math.pow(1 - a, 1.5) + 16;
      const y = 132 * Math.pow(a, 0.85) - 4;
      return [FX + Math.cos(ang) * r, y, FZ + Math.sin(ang) * r];
    },
    (a, b, i, j) => {
      const snow = a > 0.62 + Math.sin(j * 1.9) * 0.07 + Math.sin(j * 0.7) * 0.05;
      return new THREE.Color(snow ? 0xf6f1e2 : a > 0.3 ? 0x2c4a7a : 0x3f6a8c);
    }
  );
  const m = new THREE.Mesh(g, flat({ scale: 0.004, side: THREE.DoubleSide }));
  // the mountain is printed, not seen through air: no haze on it
  m.material.uniforms.uFog = { value: new THREE.Vector4(0, 0, 0, 0) };
  m.frustumCulled = false;
  S.add(m);
}

// --- bands of printed mist lying across the distance
export function addMist(world, { R, X, SPARE }) {
  for (let i = 0; i < 22; i++) {
    const far = i < 9;
    const x = far ? -260 + R() * 620 : (R() - 0.5) * 900,
      z = far ? -420 - R() * 520 : i < 15 ? 340 + R() * 130 : -160 - R() * 200,
      y = far ? 16 + R() * 60 : i < 15 ? 30 + R() * 46 : 60 + R() * 30;
    const w = 50 + R() * 90;
    (far ? X : SPARE).ball(1, R() < 0.3 ? 0xf2d6c4 : 0xf6ecd4, x, y, z, w, 2.2 + R() * 2, 9 + R() * 8, 2, { emissive: 0.55 });
  }
}

// far coast behind the village
export function addFarCoast(world, { S, flat }) {
  const coast = mountainRing({
    radius: 520,
    base: -6,
    profile: (a) => 40 + fbm(a * 4, 1.5, 3) * 70,
    colorFn: (x, y) => mix(0x5f8090, 0x3a5a78, clamp(y / 80)),
    a0: Math.PI * 0.55,
    a1: Math.PI * 1.45,
    seg: 120,
    depth: 120,
  });
  const cm = new THREE.Mesh(coast, flat({ scale: 0.006, side: THREE.DoubleSide }));
  cm.position.z = 120;
  cm.frustumCulled = false;
  S.add(cm);
}

// gulls of light over the water, lanterns far along the coast
export function addCoastLights(world, { R }) {
  for (let i = 0; i < 60; i++) world.glows.push({ p: [(R() - 0.5) * 700, 3, 330 + R() * 120], c: 0xffc878, size: 2.4 + R() * 2 });
}
