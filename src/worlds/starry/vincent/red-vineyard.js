import { mix } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { drape, vine, cart } from '../helpers.js';
import { person } from '../people.js';
import { DRESS } from '../palette.js';

// ---- The Red Vineyard: rows of red and yellow vines, the pickers bent double
export function redVineyard(world, { H, P, F, GP, R, nearTrack }) {
  const X0 = 107,
    X1 = 150,
    ZC = -29.5,
    rows = 32,
    len = rows * 1.4;
  GP.parts.push(drape(H, (X0 + X1) / 2, ZC, 0, len, X1 - X0 + 3, (i, j) => mix(i % 2 ? 0xdba436 : 0x5f4590, i % 2 ? 0xc27a2a : 0x7a3a6a, vnoise(i * 1.7, j * 2.3)), { lift: 0.18, step: 1.4, cols: 12 }));
  for (let i = 0; i < rows; i += 2) {
    const z = ZC - len / 2 + (i + 0.5) * 1.4;
    for (let x = X0 + R(); x < X1; x += 1.3 + R() * 0.4) {
      const pz = z + (R() - 0.5) * 0.4;
      if (!nearTrack(x, pz, 0.9)) vine(F, x, H(x, pz) + 0.15, pz, R);
    }
  }
  [[114, -41.5, 0.4], [121.5, -36, 2.2], [126, -21.5, 1.0], [133.5, -18.5, -0.6], [138, -38.5, 3.0], [119, -15.5, 1.7], [144, -24, -2], [129, -44, 0.2]].forEach(([x, z, ry], k) => {
    const up = k === 3 || k === 6, // two have straightened their backs
      y = H(x, z) + 0.12;
    person(P, x, y, z, ry, { dress: 1, coat: k % 3 === 1 ? 0xe8e4d8 : DRESS[k % 5], skirt: DRESS[(k + 2) % 5], bend: up ? 0.1 : 0.95 + R() * 0.3, reach: up ? 0.1 : 0.45, hat: k % 2 ? 'cap' : 'straw', hatCol: k % 2 ? 0xf2efe6 : 0xe2c46a });
    if (k % 2) return;
    P.cyl(0.3, 0.22, 0.32, 0xb8862a, x + 0.75, y, z + 0.45, 7);
    P.ball(0.25, 0x4a2a6a, x + 0.75, y + 0.33, z + 0.45, 1, 0.5, 1, 0);
  });
  const cy = H(117, -29.4);
  cart(P, 117, cy + 0.1, -29.4, 1.5, { body: 0x3a6ad0, wheel: 0x7a3a2a, horse: 1, horseCol: 0x6a4a3a });
  world.colliders.push({ x: 117.9, z: -29.4, hw: 0.8, hd: 2.7, ry: 1.5, top: cy + 2.2 });
}
