import { Builder, figure } from '../../engine/build.js';

// travellers on the road, birds of haze
export function buildTravellers(world, kit) {
  const { S, R, soft, TX, TZ } = kit;
  const P = new Builder();
  for (const [x, z, ry] of [[-16, -40, 2], [-40, -98, 1], [60, -120, 1.6], [-122, -138, -1], [TX, TZ, 0.5], [TX + 6, TZ - 4, 2.5], [100, -30, 3]]) figure(P, x, world.groundAt(x, z, 99), z, ry, { coat: [0x5a2a2a, 0x2a3a4a, 0x4a4a2a, 0x6a4a2a][(R() * 4) | 0], dress: R() < 0.6, scale: 0.98 });
  S.add(P.mesh(soft({ scale: 0.8, rim: 0.2 })));
  for (let i = 0; i < 120; i++) world.glows.push({ p: [(R() - 0.5) * 300, 2 + R() * 30, -80 + (R() - 0.5) * 300], c: 0xfff0c8, size: 0.2 + R() * 0.25, drift: 3 });
}
