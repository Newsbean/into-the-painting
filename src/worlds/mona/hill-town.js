import { house, jitter } from '../../engine/build.js';

// ---------------- the hill town of towers
// It was twenty-two boxes inside a ring of slabs. The town is tuscany/ now; this still
// throws the dice the boxes threw, into a builder nobody draws, so that everything built
// after it stands where it stood.
export function buildHillTown(world, kit) {
  const { R, TX, TZ, burn } = kit;
  const TUSC = [0xc9a878, 0xb89868, 0xd9b888, 0xa88858, 0xcdb08a];
  for (let i = 0; i < 22; i++) {
    const a = R() * 6.283,
      d = 5 + R() * 20;
    const x = TX + Math.cos(a) * d,
      z = TZ + Math.sin(a) * d;
    const tower = i < 7;
    house(burn.B, burn.W, {
      R, x, z, y: 0, ry: R() * 6.283, w: tower ? 3.6 + R() : 6 + R() * 3, d: tower ? 3.6 + R() : 5.5 + R() * 2, h: tower ? 16 + R() * 14 : 5 + R() * 3,
      roofType: tower ? 'flat' : 'gable', roofH: 2, over: 0.3, wall: jitter(TUSC[(R() * TUSC.length) | 0], R, 0.05), roof: 0xa8582e, trim: 0x6a5238, lit: 0.35, winW: 0.7, winH: 1.2, chimney: false, mullion: false,
    });
    burn.B.parts.length = 0;
  }
}
