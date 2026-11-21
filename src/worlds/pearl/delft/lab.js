// Lab scenes for the Delft kit.
//   /?debug&look=pearl&lab=worlds/pearl/delft/lab.js             a row of canal houses
//   ...&show=church | hall | mill | gate | folk                 the other things it builds
//   ...&seed=7                                                  other houses
import { rng } from '../../../engine/gl.js';
import { paintMaterial } from '../../../engine/paint.js';
import { DelftKit, delftMaterials } from './kit.js';
import { canalHouse } from './house.js';
import { nieuweKerk, stadhuis, mill, millSails, gate, bridge } from './landmarks.js';

export function lab(world, { params }) {
  const R = rng(Number(params.get('seed') || 1665));
  const kit = new DelftKit(delftMaterials(world.ctx.strokes));
  const show = params.get('show') || 'houses';
  let out;
  let tick;
  if (show === 'church') {
    nieuweKerk(kit, world, { x: 0, z: 6, ry: 0 });
    out = { views: [{ yaw: 20, pitch: 8, dist: 92, focus: [0, 26, -10], fov: 50 }, { yaw: 0, pitch: 4, dist: 26, focus: [0, 9, 10], fov: 55 }, { yaw: 120, pitch: 12, dist: 70, focus: [0, 14, -20], fov: 50 }, { yaw: 30, pitch: 30, dist: 40, focus: [0, 46, 6], fov: 40 }] };
  } else if (show === 'hall') {
    stadhuis(kit, world, { x: 0, z: -4, ry: 0 });
    out = { views: [{ yaw: 12, pitch: 6, dist: 44, focus: [0, 10, 0], fov: 50 }, { yaw: -20, pitch: 3, dist: 18, focus: [-3, 5, 3], fov: 50 }, { yaw: 150, pitch: 14, dist: 44, focus: [0, 10, -4], fov: 50 }, { yaw: 30, pitch: 26, dist: 30, focus: [0, 22, -6], fov: 40 }] };
  } else if (show === 'mill') {
    const m = mill(kit, world, { x: 0, z: 0, ry: 0 });
    const sails = millSails(paintMaterial({ stroke: world.ctx.strokes.soft, objSpace: 1, scale: 0.5, contrast: 0.2 }));
    sails.position.copy(m.hub);
    world.scene.add(sails);
    tick = (dt, time) => (sails.rotation.x = time * 0.35);
    gate(kit, world, { x: 26, z: 0, ry: 0.4 });
    bridge(kit, world, { x: -24, z: 6, ry: 0.3 });
    out = { views: [{ yaw: -60, pitch: 6, dist: 46, focus: [0, 11, 0], fov: 50 }, { yaw: -30, pitch: 4, dist: 20, focus: [-2, 7, 0], fov: 55 }, { yaw: 10, pitch: 8, dist: 34, focus: [26, 9, 0], fov: 50 }, { yaw: 60, pitch: 10, dist: 24, focus: [-24, 1, 6], fov: 50 }] };
  } else {
    let x = -24;
    for (let i = 0; i < 8; i++) {
      const w = 4.8 + R() * 2.8;
      canalHouse(kit, world, { x: x + w / 2, z: -6, ry: 0, w, d: 10 + R() * 2.5, R, floors: 2 + ((R() * 2.4) | 0), shop: i % 3 === 1 });
      x += w + 0.04;
    }
    canalHouse(kit, world, { x: -20, z: 12, ry: Math.PI * 0.8, w: 6.2, d: 10, R, floors: 3, gable: 'step' });
    canalHouse(kit, world, { x: 22, z: 12, ry: -Math.PI * 0.75, w: 5.2, d: 10, R, floors: 2, gable: 'spout', wash: true });
    out = { views: [{ yaw: 8, pitch: 5, dist: 36, focus: [-2, 5.5, -4], fov: 50 }, { yaw: -24, pitch: 2, dist: 12, focus: [-9, 3.2, 0], fov: 50 }, { yaw: 30, pitch: 14, dist: 15, focus: [6, 9.5, -1], fov: 46 }, { yaw: 160, pitch: 16, dist: 30, focus: [0, 5, -8], fov: 50 }] };
  }
  const { base, detail, tris } = kit.build();
  world.scene.add(base, detail);
  console.log('delft lab:', show, 'triangles', Math.round(tris));
  return { focus: out.views[0].focus, dist: out.views[0].dist, views: out.views, tick };
}
