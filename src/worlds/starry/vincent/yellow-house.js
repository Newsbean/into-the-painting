import { mix } from '../../../engine/build.js';
import { vnoise, clamp } from '../../../engine/gl.js';
import { chair } from '../helpers.js';

// ---- The Yellow House on the corner, with the Bedroom open to the square
export function yellowHouse(world, { H, maps, B, P, glow }) {
  const x0 = 20.5,
    x1 = 28.7,
    z0 = -26,
    z1 = -19.6,
    xm = 25.9; // the bedroom's far wall
  const cxh = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    w = x1 - x0,
    d = z1 - z0,
    mx = (x0 + xm) / 2,
    y = H(cxh, cz);
  const YEL = (px, py) => mix(0xf4c62e, 0xd9a022, clamp(0.5 - py / 3.5) * 0.6);
  B.box(w, 3.6, d, YEL, cxh, y + 3.05, cz); // upper storey
  B.box(x1 - xm, 3.4, d, YEL, (xm + x1) / 2, y - 0.3, cz); // the solid east half
  for (const zz of [z0 + 0.14, z1 - 0.14]) B.box(xm - x0, 3.4, 0.28, YEL, mx, y - 0.3, zz);
  for (const zz of [z0 + 0.25, z1 - 0.25]) B.box(0.32, 3.4, 0.5, YEL, x0 + 0.16, y - 0.3, zz);
  B.box(0.32, 0.5, d, YEL, x0 + 0.16, y + 2.6, cz);
  B.gable(d + 1.1, w + 0.7, 2.7, 0xc8562c, cxh, y + 6.65, cz, Math.PI / 2);
  B.box(0.7, 2.2, 0.7, 0xb0782a, cxh + 2.2, y + 7.4, cz + 0.6);
  // green shutters and the green door
  const SH = 0x2f8a55;
  const win = (wx, wy, wz, alongX, out, on) => {
    const col = on ? 0xffd56b : 0x1c2a4a,
      data = on ? { emissive: 1 } : undefined;
    if (alongX) {
      B.box(1.0, 1.4, 0.12, col, wx, wy, wz + out * 0.03, 0, data);
      for (const k of [-1, 1]) B.box(0.34, 1.5, 0.1, SH, wx + k * 0.7, wy - 0.05, wz + out * 0.05);
    } else {
      B.box(0.12, 1.4, 1.0, col, wx + out * 0.03, wy, wz, 0, data);
      for (const k of [-1, 1]) B.box(0.1, 1.5, 0.34, SH, wx + out * 0.05, wy - 0.05, wz + k * 0.7);
    }
  };
  [x0 + 1.5, cxh, x1 - 1.5].forEach((wx, i) => {
    win(wx, y + 4.1, z1, true, 1, i !== 1);
    win(wx, y + 4.1, z0, true, -1, i === 1);
  });
  for (const dz of [-1.5, 1.5]) {
    win(x0, y + 4.1, cz + dz, false, -1, dz > 0);
    win(x1, y + 4.1, cz + dz, false, 1, dz < 0);
  }
  win(x1 - 1.4, y + 1.0, z0, true, -1, true);
  win(x1, y + 1.0, cz, false, 1, false);
  B.box(1.0, 2.15, 0.12, SH, x1 - 1.45, y, z1 + 0.03);
  // inside: pale lilac-blue walls, a floor of worn boards
  const BL = 0xa8c6ea,
    lit = { emissive: 0.4 },
    IN = { emissive: 0.22 };
  for (const zz of [z0 + 0.31, z1 - 0.31]) B.box(xm - x0 - 0.3, 3.0, 0.06, BL, mx + 0.15, y + 0.05, zz, 0, lit);
  B.box(0.06, 3.0, d - 0.6, BL, xm - 0.03, y + 0.05, cz, 0, lit);
  B.box(xm - x0 - 0.4, 0.1, d - 0.56, 0xdfe6f0, mx + 0.2, y + 2.98, cz, 0, { emissive: 0.25 });
  // the boards stand a step above the cobbles of the square, which run in under the house
  B.box(xm - x0, 0.52, d - 0.56, (px, py, pz) => mix(0x9a5a3a, 0x7a7046, vnoise(px * 0.7 + 3, pz * 0.7)), mx, y - 0.3, cz);
  const fy = y + 0.22,
    WOOD = 0xe8a22c;
  (world.platforms ??= []).push({ minx: x0, maxx: xm, minz: z0 + 0.28, maxz: z1 - 0.28, y: fy });
  // the bed against the right-hand wall, red blanket, two pillows
  const bx = xm - 1.4,
    bz2 = z1 - 1.0;
  P.box(2.3, 0.34, 1.26, WOOD, bx, fy + 0.22, bz2, 0, IN);
  P.box(0.1, 1.0, 1.36, WOOD, bx - 1.15, fy, bz2, 0, IN);
  P.box(0.1, 1.3, 1.36, WOOD, bx + 1.15, fy, bz2, 0, IN);
  P.box(1.65, 0.18, 1.3, 0xc9281e, bx - 0.25, fy + 0.54, bz2, 0, IN);
  P.box(0.5, 0.14, 1.2, 0xeef0c8, bx + 0.82, fy + 0.56, bz2, 0, IN);
  for (const dz of [-0.3, 0.3]) P.box(0.42, 0.16, 0.5, 0xf4f2d0, bx + 0.86, fy + 0.68, bz2 + dz, 0, IN);
  // two rush chairs, the little table with jug and basin
  chair(P, x0 + 1.5, fy, z0 + 1.35, 2.2, { data: IN });
  chair(P, bx + 0.25, fy, bz2 - 1.3, -0.4, { data: IN });
  const tx = xm - 0.75,
    tz = z0 + 0.78;
  P.box(0.75, 0.05, 0.55, WOOD, tx, fy + 0.76, tz, 0, IN);
  P.box(0.66, 0.16, 0.46, 0xc8862a, tx, fy + 0.6, tz, 0, IN);
  for (const [ox, oz] of [[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]]) P.box(0.05, 0.62, 0.05, WOOD, tx + ox, fy, tz + oz, 0, IN);
  P.cyl(0.06, 0.1, 0.28, 0x4a6ad8, tx - 0.15, fy + 0.81, tz, 6, IN);
  P.cyl(0.17, 0.1, 0.09, 0xdfe6f0, tx + 0.16, fy + 0.81, tz + 0.05, 6, IN);
  // the window at the far end, pictures over the bed, mirror, towel, two blue doors
  P.box(0.08, 1.6, 1.15, 0x3f8a4a, xm - 0.1, fy + 1.05, cz - 0.5, 0, IN);
  P.box(0.1, 1.38, 0.93, 0xcfe08a, xm - 0.12, fy + 1.16, cz - 0.5, 0, { emissive: 0.7 });
  P.box(0.12, 1.38, 0.06, 0x3f8a4a, xm - 0.13, fy + 1.16, cz - 0.5, 0, IN);
  for (const [dx, col] of [[-0.75, 0x6a8ad0], [-0.1, 0x8ab06a]]) {
    P.box(0.52, 0.64, 0.04, 0xe8b23a, bx + dx, fy + 1.7, z1 - 0.36, 0, IN);
    P.box(0.4, 0.52, 0.05, col, bx + dx, fy + 1.76, z1 - 0.37, 0, IN);
  }
  for (const dz of [-0.3, 0.3]) {
    P.box(0.04, 0.5, 0.42, 0xe8b23a, xm - 0.08, fy + 1.85, bz2 + dz, 0, IN);
    P.box(0.05, 0.4, 0.32, dz < 0 ? 0xd9a86a : 0x7a9a8a, xm - 0.09, fy + 1.9, bz2 + dz, 0, IN);
  }
  P.box(0.4, 0.52, 0.04, 0x1c1c26, xm - 1.6, fy + 1.55, z0 + 0.36, 0, IN);
  P.box(0.3, 0.42, 0.05, 0xbfe0d8, xm - 1.6, fy + 1.6, z0 + 0.37, 0, IN);
  P.box(0.3, 0.75, 0.04, 0xf2f0e0, x0 + 2.4, fy + 1.0, z0 + 0.36, 0, IN);
  for (const zz of [z0 + 0.36, z1 - 0.36]) P.box(0.95, 2.15, 0.05, 0x7fa0dc, x0 + 1.0, fy, zz, 0, IN);
  glow(x0 + 2.6, y + 2.55, cz, 0xfff0c0, 1.6);
  maps.lamp(x0 + 2.4, cz, 6.5, 0xffe6a8, 1.0);
  maps.lamp(x0 - 1.5, cz, 6, 0xffe6a8, 0.6);
  maps.blob(cxh + 1.6, cz, 6, 0.3);
  // walls you can walk between, a storey you can walk under
  const top = y + 9.4;
  world.colliders.push({ x: (xm + x1) / 2, z: cz, hw: (x1 - xm) / 2 + 0.1, hd: d / 2 + 0.1, ry: 0, top });
  for (const zz of [z0 + 0.14, z1 - 0.14]) world.colliders.push({ x: mx, z: zz, hw: (xm - x0) / 2, hd: 0.2, ry: 0, top });
  world.colliders.push({ x: cxh, z: cz, hw: w / 2, hd: d / 2, ry: 0, top, bottom: y + 3.0 });
  world.colliders.push({ x: bx, z: bz2, hw: 1.2, hd: 0.7, ry: 0, top: y + 1.1 });
}
