// Lab scene for the Edo kit: a row of merchant houses, two storehouses, farmhouses,
// the pagoda and the castle keep.
//   /?debug&look=wave&lab=worlds/wave/edo/lab.js        (add &seed=7 for other houses)
import { rng } from '../../../engine/gl.js';
import { EdoKit, edoMaterials } from './kit.js';
import { machiya, kura, minka, pagoda, tenshu } from './house.js';

export function lab(world, { params }) {
  const R = rng(Number(params.get('seed') || 1831));
  const kit = new EdoKit(edoMaterials(world.ctx.strokes));
  let x = -26;
  for (let i = 0; i < 6; i++) {
    const w = 5.6 + R() * 3.4;
    machiya(kit, world, { x: x + w / 2, z: -8, ry: 0, w, d: 8 + R() * 2.5, R, shop: i % 3 !== 2, floors: R() < 0.8 ? 2 : 1 });
    x += w + 0.05;
  }
  kura(kit, world, { x: x + 4.5, z: -8.5, ry: 0, w: 6, d: 7.5, R });
  kura(kit, world, { x: x + 12, z: -8.5, ry: 0, w: 6.6, d: 8, R });
  minka(kit, world, { x: -30, z: 6, ry: 0.5, w: 9, d: 6.5 });
  minka(kit, world, { x: 30, z: 8, ry: -0.6, w: 6, d: 8, lit: false });
  pagoda(kit, world, { x: -34, z: -26, tiers: 3 });
  tenshu(kit, world, { x: 14, z: -44, ry: 0.2 });
  const { base, detail, tris } = kit.build();
  world.scene.add(base, detail);
  console.log('edo lab: triangles', Math.round(tris));
  return {
    focus: [-6, 3, -6],
    dist: 34,
    views: [
      { yaw: 10, pitch: 6, dist: 34, focus: [-6, 3.2, -6], fov: 52 },
      { yaw: -22, pitch: 3, dist: 11, focus: [-13, 2.3, -5.5], fov: 50 },
      { yaw: 18, pitch: 8, dist: 62, focus: [6, 11, -36], fov: 50 },
      { yaw: 150, pitch: 14, dist: 22, focus: [-28, 3, 4], fov: 52 },
    ],
  };
}
