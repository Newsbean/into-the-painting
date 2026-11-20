// Lab scene: a district of town on flat ground — a handful of streets bent a little out
// of true, a square, lamps and lights — to judge the planner and to count its cost.
//   /?debug&bare&lab=worlds/starry/town/district.js
import { rng, vnoise } from '../../../engine/gl.js';
import { buildTown } from './town.js';

export function lab(world, { params }) {
  const R = rng(Number(params.get('seed') || 1889));
  const bendx = (x, z) => x + (vnoise(z * 0.012 + 3, x * 0.004) - 0.5) * 22;
  const bendz = (x, z) => z + (vnoise(x * 0.012 + 8, z * 0.004) - 0.5) * 22;
  const streets = [];
  const xs = [-105, -52, 0, 52, 105],
    zs = [-95, -45, 5, 55, 100];
  for (const z of zs) {
    const pts = [];
    for (let x = -118; x <= 118; x += 20) pts.push([x, bendz(x, z)]);
    streets.push({ pts, w: z === 5 ? 11 : 8, main: z === 5, festive: z === 5 });
  }
  for (const x of xs) {
    const pts = [];
    for (let z = -108; z <= 112; z += 20) pts.push([bendx(x, z), z]);
    streets.push({ pts, w: x === 0 ? 10 : 7.5, main: x === 0, festive: x === 0 });
  }
  const square = { x: 0, z: 5, r: 19 };
  const t0 = performance.now();
  const town = buildTown(world, {
    streets,
    R,
    keep: [square],
    squares: [square],
    inside: (x, z) => (x / 124) ** 2 + (z / 118) ** 2 < 1,
    floors: (x, z, r) => (Math.hypot(x, z) < 60 ? 3 + ((r() * 2.4) | 0) : 2 + ((r() * 2.2) | 0)),
  });
  world.scene.add(town.group);
  console.log('district', JSON.stringify(town.stats), 'built in', Math.round(performance.now() - t0), 'ms');
  world.maps.lamp(square.x, square.z, 20, 0xffc46a, 0.5);
  return {
    focus: [0, 6, 5],
    dist: 60,
    tick: (dt, time, g) => town.tick(g.camera.position),
    stats: town.stats,
    views: [
      { yaw: 20, pitch: 30, dist: 150, focus: [0, 0, 0], fov: 55 },
      { yaw: 90, pitch: 3, dist: 46, focus: [-8, 5, 4], fov: 60 },
      { yaw: 200, pitch: 12, dist: 34, focus: [0, 5, 5], fov: 58 },
      { yaw: -40, pitch: 62, dist: 210, focus: [0, 0, 0], fov: 50 },
    ],
  };
}
