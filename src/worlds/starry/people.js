import { figure, jitter, xf } from '../../engine/build.js';

// a small figure that can stoop, sit, stride and reach, at a third of the cost of the village folk
export function person(B, x, y, z, ry, o = {}) {
  const s = o.scale ?? 1,
    bend = o.bend ?? 0,
    reach = o.reach ?? 0.1,
    d = o.data;
  const M = xf(x, y, z, ry, s, s, s);
  const coat = o.coat ?? 0x2f4f9a,
    legs = o.legs ?? 0x1c2440,
    skin = o.skin ?? 0xe0b090,
    hatCol = o.hatCol ?? 0xe2c46a;
  let hip = 0.86;
  if (o.sit) {
    hip = 0.5;
    for (const sx of [-0.11, 0.11]) {
      B.box(0.13, 0.12, 0.42, legs, sx, 0.42, 0.2, 0, d, M);
      B.cyl(0.07, 0.08, 0.46, legs, sx, 0, 0.4, 4, d, M);
    }
  } else if (o.dress) B.cyl(0.17, 0.4, hip + 0.06, o.skirt ?? coat, 0, 0, 0, 6, d, M);
  else for (const sx of [-1, 1]) B.cyl(0.1, 0.085, hip + 0.04, legs, sx * 0.11, hip + 0.04, 0, 5, d, M, Math.PI + sx * (o.stride ?? 0), 0);
  const T = M.clone().multiply(xf(0, hip, 0, 0, 1, 1, 1, bend, 0));
  B.cyl(0.19, 0.24, 0.62, coat, 0, 0, 0, 6, d, T);
  B.ball(0.185, skin, 0, 0.86, 0.02, 1, 1.08, 1, 1, d, T);
  const ax = o.arms ?? [Math.PI - reach - bend, Math.PI - reach - bend],
    az = o.armZ ?? [-0.1, 0.1];
  B.cyl(0.055, 0.07, 0.6, o.sleeve ?? coat, -0.26, 0.56, 0, 4, d, T, ax[0], az[0]);
  B.cyl(0.055, 0.07, 0.6, o.sleeve ?? coat, 0.26, 0.56, 0, 4, d, T, ax[1], az[1]);
  if (o.hat === 'straw') {
    B.cyl(0.34, 0.36, 0.03, hatCol, 0, 1.0, 0.02, 8, d, T);
    B.cyl(0.14, 0.17, 0.13, hatCol, 0, 1.02, 0.02, 6, d, T);
  } else if (o.hat === 'cap') B.ball(0.2, hatCol, 0, 0.93, -0.02, 1, 0.8, 1.05, 0, d, T);
  else B.ball(0.195, o.hair ?? 0x2a1c14, 0, 0.92, -0.03, 1, 0.9, 1.02, 0, d, T);
}

// a few villagers out late
export function villagers(world, { H, R, P }) {
  const folk = [[6, -20, 0.4], [14, -27, 3.6], [-12, -31, 1.5], [33, -29, -1.4], [4, 8, 2.9], [16, -37, 0.2], [0, -34, 1.2]];
  for (const [x, z, ry] of folk)
    figure(P, x, H(x, z), z, ry, { coat: jitter([0x35406a, 0x6a3f5a, 0x2f5a5a, 0x7a5a2a][(R() * 4) | 0], R, 0.1), dress: R() < 0.5, hat: R() < 0.5 ? 'straw' : undefined, scale: 0.95 + R() * 0.12 });
}
