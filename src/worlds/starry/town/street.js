// Lab scene: a short street of generated houses, two rows facing each other, to judge
// the house generator at street level and from the air.
//   /?debug&lab=worlds/starry/town/street.js           (add &seed=7 for another street)
import { rng } from '../../../engine/gl.js';
import { Kit, townMaterials } from './kit.js';
import { house, randomStyle } from './house.js';

export function lab(world, { params }) {
  const R = rng(Number(params.get('seed') || 1889));
  const kit = new Kit(townMaterials(world.ctx.strokes));
  const half = 8.5; // half the street width, wall to wall
  for (const side of [-1, 1]) {
    let x = -30;
    let i = 0;
    while (x < 30) {
      const w = 6 + R() * 5.5;
      const d = 9 + R() * 3;
      const floors = 2 + ((R() * 3) | 0);
      const first = x === -30;
      x += w;
      const last = x >= 30;
      house(kit, world, {
        x: x - w / 2,
        z: side * (half + d / 2),
        ry: side < 0 ? 0 : Math.PI,
        w,
        d,
        floors,
        R,
        style: randomStyle(R),
        shop: R() < 0.45,
        gableFront: R() < 0.18,
        open: { left: side < 0 ? first : last, right: side < 0 ? last : first },
      });
      world.colliders.push({ x: x - w / 2, z: side * (half + d / 2), hw: w / 2, hd: d / 2, ry: 0, top: 30 });
      i++;
    }
  }
  const { base, detail, tris } = kit.build();
  world.scene.add(base, detail);
  console.log('street: triangles', Math.round(tris));
  for (const x of [-18, 0, 18]) world.maps.lamp(x, 0, 11, 0xffc46a, 0.7);
  return {
    focus: [0, 5, 0],
    dist: 34,
    views: [
      { yaw: 90, pitch: 2, dist: 29, focus: [0, 4.6, 0], fov: 60 },
      { yaw: 8, pitch: 2, dist: 13, focus: [-6, 3.2, -8], fov: 52 },
      { yaw: 205, pitch: 6, dist: 15, focus: [8, 4, 8], fov: 52 },
      { yaw: 35, pitch: 38, dist: 52, focus: [0, 4, 0], fov: 50 },
    ],
  };
}
