// Lab scenes for the Kristiania kit.
//   /?debug&look=scream&lab=worlds/scream/kristiania/lab.js      a street of houses and a row of warehouses
//   ...&seed=7                                                  other houses
import { rng } from '../../../engine/gl.js';
import { KristianiaKit, kristianiaMaterials } from './kit.js';
import { townHouse, warehouse } from './house.js';

export function lab(world, { params }) {
  const R = rng(Number(params.get('seed') || 1893));
  const kit = new KristianiaKit(kristianiaMaterials(world.ctx.strokes));
  let x = -26;
  for (let i = 0; i < 6; i++) {
    const w = 7 + R() * 4;
    townHouse(kit, world, { x: x + w / 2, z: -7, ry: 0, w, d: 7 + R() * 2, R, floors: i % 3 === 1 ? 3 : 1 + ((R() * 2) | 0), clad: i % 3 === 1 ? 'plaster' : 'boards' });
    x += w + 0.6;
  }
  x = -20;
  for (let i = 0; i < 5; i++) {
    const w = 6 + R() * 2.5;
    warehouse(kit, world, { x: x + w / 2, z: 16, ry: Math.PI, w, d: 11 + R() * 3, R });
    x += w + 0.25;
  }
  const { base, detail, tris } = kit.build();
  world.scene.add(base, detail);
  console.log('kristiania lab: triangles', Math.round(tris));
  const views = [
    { yaw: 8, pitch: 5, dist: 34, focus: [-2, 4.5, -5], fov: 50 },
    { yaw: -24, pitch: 2, dist: 11, focus: [-10, 2.6, -2], fov: 52 },
    { yaw: 172, pitch: 5, dist: 26, focus: [0, 5.5, 12], fov: 50 },
    { yaw: 140, pitch: 16, dist: 34, focus: [0, 5, 4], fov: 50 },
  ];
  return { focus: views[0].focus, dist: views[0].dist, views };
}
