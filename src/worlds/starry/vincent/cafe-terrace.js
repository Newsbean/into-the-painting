import * as THREE from 'three';
import { mix, xf } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';
import { drape, chair, bouquet } from '../helpers.js';
import { person } from '../people.js';

// ---- Café Terrace at Night, on the north-east corner of the square
export function cafeTerrace(world, { H, maps, B, P, F, GP, R, glow, solid }) {
  const cx = 23.2,
    fz = -42.2,
    w = 12.6,
    d = 6,
    bz = fz - d / 2,
    y = H(cx, fz);
  B.box(w, 3.5, d, (px, py) => mix(0xd09a22, 0x7a5a26, clamp(0.4 - py / 3.5)), cx, y - 0.3, bz);
  B.box(w, 4.2, d, (px, py) => mix(0x6a78b4, 0x8f9ad0, clamp(py / 4.2 + 0.5)), cx, y + 3.2, bz);
  B.hip(d + 1, w + 1, 2.3, 0x27408c, cx, y + 7.4, bz, Math.PI / 2, undefined, undefined, 0.6);
  B.box(0.7, 1.6, 0.7, 0x4a5590, cx + 3.5, y + 8.2, bz);
  // the wall that glows under the awning, two doorways and the long window
  B.box(w - 0.2, 3.0, 0.14, (px, py) => mix(0xf7cf2e, 0xf0941a, clamp(0.5 - py / 3.0) * 0.8), cx, y + 0.1, fz + 0.05, 0, { emissive: 0.5 });
  for (const dx of [-3.7, 3.7]) {
    B.box(1.9, 2.8, 0.14, 0x25488a, cx + dx, y + 0.1, fz + 0.1);
    B.box(1.45, 2.5, 0.14, 0xffa238, cx + dx, y + 0.1, fz + 0.14, 0, { emissive: 1 });
  }
  B.box(3.3, 1.8, 0.14, 0x25488a, cx, y + 0.95, fz + 0.1);
  B.box(2.95, 1.5, 0.14, 0xffd56b, cx, y + 1.1, fz + 0.14, 0, { emissive: 1 });
  for (const dx of [-0.75, 0.75]) B.box(0.08, 1.5, 0.14, 0x25488a, cx + dx, y + 1.1, fz + 0.17);
  // upstairs: green shutters, half the rooms awake
  for (let i = 0; i < 4; i++) {
    const wx = cx - 4.5 + i * 3,
      on = i === 1 || i === 2;
    B.box(1.0, 1.5, 0.12, on ? 0xffd56b : 0x1c2548, wx, y + 4.5, fz + 0.03, 0, on ? { emissive: 1 } : undefined);
    for (const k of [-1, 1]) B.box(0.36, 1.6, 0.1, 0x2f8a55, wx + k * 0.72, y + 4.45, fz + 0.05);
    const back = i === 0 || i === 3;
    B.box(1.0, 1.4, 0.12, back ? 0xffc861 : 0x1c2548, wx, y + 4.5, bz - d / 2 - 0.03, 0, back ? { emissive: 1 } : undefined);
  }
  for (const sx of [-1, 1])
    for (const dz of [-1.4, 1.4]) {
      const on = sx * dz > 0;
      B.box(0.12, 1.4, 0.95, on ? 0xffc861 : 0x1c2548, cx + sx * (w / 2 + 0.03), y + 4.5, bz + dz, 0, on ? { emissive: 1 } : undefined);
    }
  // the awning, lit from below, and its valance
  B.add(new THREE.BoxGeometry(w - 1, 0.12, 4.9), (px, py, pz) => mix(0xf7cf34, 0xe8981c, clamp(pz / 4.9 + 0.5)), xf(cx, y + 3.12, fz + 2.42, 0, 1, 1, 1, 0.1), { emissive: 0.5 });
  B.box(w - 1, 0.34, 0.07, 0xf7cc30, cx, y + 2.54, fz + 4.86, 0, { emissive: 0.45 });
  for (const sx of [-1, 1]) B.cyl(0.04, 0.05, 2.9, 0x1c2440, cx + sx * (w / 2 - 0.7), y, fz + 4.8, 5);
  // the big gas lantern
  const lx = cx - 1.6,
    lz = fz + 4.3;
  B.cyl(0.02, 0.02, 0.45, 0x14161f, lx, y + 2.5, lz, 4);
  B.box(0.48, 0.52, 0.48, 0xffe38a, lx, y + 1.98, lz, 0.6, { emissive: 1 });
  B.hip(0.72, 0.72, 0.22, 0x14161f, lx, y + 2.5, lz, 0.6, undefined, undefined, 0);
  glow(lx, y + 2.25, lz, 0xffd24a, 7);
  glow(lx, y + 2.25, lz, 0xfff2c0, 2.4);
  maps.lamp(lx, lz, 18, 0xffc23a, 1.5);
  maps.lamp(cx, fz + 2.6, 10, 0xffe07a, 1.2);
  // orange boards underfoot
  GP.parts.push(drape(H, cx, fz + 3.45, 0, 6.9, w + 0.4, (i, j) => [0xe8922a, 0xf2a83a, 0xd97a2a, 0xf0b84a][(i + ((j * 5) % 3 === 0 ? 1 : 0)) % 4], { lift: 0.19, step: 0.86, cols: 6 }));
  // round white tables, rush chairs, sunflowers in jars
  const seats = [];
  let nt = 0;
  for (const tz of [1.4, 3.5, 5.6])
    for (let i = 0; i < 5; i++) {
      const tx = cx - 4.9 + i * 2.45 + (R() - 0.5) * 0.3,
        zz = fz + tz + (R() - 0.5) * 0.3;
      if ((tz < 2 && Math.abs(Math.abs(tx - cx) - 3.7) < 1.1) || R() < 0.12) continue;
      P.cyl(0.5, 0.5, 0.05, 0xf4efe2, tx, y + 0.72, zz, 10);
      P.cyl(0.035, 0.05, 0.72, 0x23284a, tx, y, zz, 4);
      solid(tx, zz, 0.55, y + 0.8);
      // one chair east and one west of every table, so no two sets can touch
      const a = (R() - 0.5) * 0.3;
      for (let k = 0; k < 2; k++) {
        const ca = (k ? -1 : 1) * 1.5708 + a + (R() - 0.5) * 0.4,
          sx = tx + Math.sin(ca) * 0.8,
          sz = zz + Math.cos(ca) * 0.8;
        chair(P, sx, y, sz, ca + Math.PI, { simple: 1, wood: k ? 0xd9a030 : 0xc8862a, seat: 0xe8c860 });
        seats.push([sx, sz, ca + Math.PI]);
      }
      if (nt++ % 3 === 0) bouquet(F, P, tx, y + 0.77, zz, R, { n: 5 });
    }
  bouquet(F, P, cx - 2.3, y, fz + 0.5, R, { n: 8, r: 0.2, s: 2.2, vase: 0x3a8a6a });
  bouquet(F, P, cx + 2.3, y, fz + 0.5, R, { n: 8, r: 0.2, s: 2.2 });
  // the waiter in white, a few late drinkers, a couple walking home
  person(P, cx + 1.2, y, fz + 2.5, 0.4, { coat: 0xf6f2e8, legs: 0x1c2040, sleeve: 0xf6f2e8 });
  for (const [k, coat, hat] of [[1, 0x35406a, 'straw'], [4, 0x7a3f5a, undefined], [9, 0x2f5a5a, 'cap'], [14, 0x5a4a8a, undefined]]) {
    const st = seats[k];
    if (st) person(P, st[0], y, st[1], st[2], { sit: 1, coat, hat, hatCol: hat === 'cap' ? 0x1c1c26 : 0xe2c46a });
  }
  person(P, 27.4, H(27.4, -34.3), -34.3, 1.3, { coat: 0x23284a, hat: 'straw' });
  person(P, 28.2, H(28.2, -34.7), -34.7, 1.4, { dress: 1, coat: 0x8a3a5a, skirt: 0x5a2a4a, hat: 'cap', hatCol: 0x2a1c14 });
  world.colliders.push({ x: cx, z: bz, hw: w / 2 + 0.2, hd: d / 2 + 0.2, ry: 0, top: y + 10 });
  maps.blob(cx, bz, 9, 0.35);
}
