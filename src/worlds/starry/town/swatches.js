// Lab scene: every built-surface brush on a wall, a roof or the ground, with walls
// turned at odd angles to show that the courses stay level and unstretched.
//   /?debug&lab=worlds/starry/town/swatches.js
import * as THREE from 'three';
import { paintMaterial } from '../../../engine/paint.js';
import { Builder, patch, mix } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';

export function lab(world) {
  const { strokes } = world.ctx;
  const S = world.scene;
  const wall = (stroke, o = {}) => paintMaterial({ stroke, directed: 1, scale: 0.2, contrast: 0.55, hueVar: 0.35, warp: 0, impasto: 0.12, rim: 0.06, band: 0.3, big: 0.5, ...o });

  const panels = [
    ['masonry', 0xd9b56a, 0.2],
    ['ashlar', 0x8f9cc4, 0.16],
    ['brick', 0xc0623c, 0.3],
    ['plank', 0x3f7a58, 0.5],
    ['masonry', 0x7a5aa8, 0.2],
    ['brick', 0x3f6f9c, 0.3],
  ];
  panels.forEach(([kind, col, scale], i) => {
    const B = new Builder();
    const a = (i / panels.length) * Math.PI * 2;
    const x = Math.sin(a) * 15,
      z = -Math.cos(a) * 15;
    B.box(7, 6, 0.6, col, x, 0, z, -a + 0.35);
    S.add(B.mesh(wall(strokes[kind], { scale })));
  });

  // two small houses to carry the roofs
  const roofs = [
    ['tiles', 0xc2512e, -5, 0.25],
    ['slate', 0x3a4a9a, 5, 0.3],
  ];
  for (const [kind, col, x, scale] of roofs) {
    const W = new Builder();
    W.box(6, 3.2, 5, 0xd8c79a, x, 0, 0, 0.3);
    S.add(W.mesh(wall(strokes.masonry)));
    const R = new Builder();
    R.gable(6.8, 5.8, 2.6, col, x, 3.2, 0, 0.3);
    S.add(R.mesh(wall(strokes[kind], { scale, contrast: 0.6, hueVar: 0.5, impasto: 0.18, big: 0.7 })));
  }

  // cobbles the new way, beside the old dabs
  const C = new Builder();
  C.parts.push(patch(0, 9, 7, () => 0, (x, y, z) => mix(0x6c5fa6, 0xa57cb6, vnoise(x * 0.35, z * 0.35)).lerp(new THREE.Color(0x4a5cae), vnoise(x * 0.11 + 7, z * 0.11) * 0.5), { lift: 0.08, wobble: 0.02 }));
  S.add(C.mesh(paintMaterial({ stroke: strokes.cobble, scale: 0.25, contrast: 0.7, hueVar: 0.9, warp: 0, accent: 0xf0b6c8, accentAmt: 0.3, impasto: 0.2, rim: 0.05, band: 0.3, big: 0.3 })));

  world.maps.lamp(0, 9, 12, 0xffc46a, 0.9);
  world.maps.lamp(-9, -9, 14, 0xffc46a, 0.7);
  return { focus: [0, 2.5, 0], dist: 30 };
}
