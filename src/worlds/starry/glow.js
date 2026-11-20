import { glowPoints } from '../../engine/paint.js';
import { CENTER } from './terrain.js';

// ---------------- glow: lamps, fireflies, far villages
export function glow(world, { S, H, R, maps }) {
  for (let i = 0; i < 130; i++) {
    const a = R() * 6.283,
      d = 12 + R() * 120;
    const x = -5 + Math.cos(a) * d,
      z = 15 + Math.sin(a) * d;
    world.glows.push({ p: [x, H(x, z) + 0.6 + R() * 3, z], c: 0xe8f08a, size: 0.34 + R() * 0.3, drift: 1.6 });
  }
  for (let i = 0; i < 90; i++) {
    const a = R() * 6.283,
      d = 470 + R() * 230;
    const x = CENTER[0] + Math.cos(a) * d,
      z = CENTER[1] + Math.sin(a) * d;
    world.glows.push({ p: [x, H(x, z) + 2, z], c: R() < 0.8 ? 0xffc46a : 0xff9a5a, size: 2.6 + R() * 2.4 });
  }
  S.add(glowPoints(world.glows, 1.15));
  maps.finish();
}
