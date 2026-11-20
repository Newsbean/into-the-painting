import { house, jitter } from '../../engine/build.js';
import { stoneC } from './palette.js';

// ---------------- the hill town of towers
export function buildHillTown(world, kit) {
  const { B, R, H, proxy, nearRoad, TX, TZ } = kit;
  const TUSC = [0xc9a878, 0xb89868, 0xd9b888, 0xa88858, 0xcdb08a];
  for (let i = 0; i < 22; i++) {
    const a = R() * 6.283,
      d = 5 + R() * 20;
    const x = TX + Math.cos(a) * d,
      z = TZ + Math.sin(a) * d;
    const tower = i < 7;
    house(B, proxy, {
      R, x, z, ry: R() * 6.283, w: tower ? 3.6 + R() : 6 + R() * 3, d: tower ? 3.6 + R() : 5.5 + R() * 2, h: tower ? 16 + R() * 14 : 5 + R() * 3,
      roofType: tower ? 'flat' : 'gable', roofH: 2, over: 0.3, wall: jitter(TUSC[(R() * TUSC.length) | 0], R, 0.05), roof: 0xa8582e, trim: 0x6a5238, lit: 0.35, winW: 0.7, winH: 1.2, chimney: false, mullion: false,
    });
  }
  for (let k = 0; k < 44; k++) {
    const a = (k / 44) * 6.283;
    const x = TX + Math.cos(a) * 28,
      z = TZ + Math.sin(a) * 28;
    if (nearRoad(x, z, 4)) continue;
    B.box(4.2, 3.6, 0.8, stoneC, x, H(x, z) - 0.6, z, -a + Math.PI / 2);
    world.colliders.push({ x, z, r: 1.6, top: H(x, z) + 3 });
  }
}
