import * as THREE from 'three';
import { mix, xf } from '../../../engine/build.js';
import { clamp, lerp } from '../../../engine/gl.js';
import { MIDBLUE, PALE, SKIN, STONE, STONE_D, TIMBER, WOOD, WOOD_D } from '../palette.js';
import { rod, beam } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- the drum bridge at Kameido, and wisteria on its trellis
export function kameido(world, { H, Q, X, P, deck, spanY, toFuji, lanternAt }) {
  const cx = -134,
    cz = 229.5;
  const yp = H(cx, cz + 1.6),
    lo = H(cx, cz - 2.6) - 0.6;
  X.box(11.6, yp - lo, 5.2, STONE, cx, lo, cz);
  X.box(9.6, 0.07, 4.2, PALE, cx, yp - 0.03, cz);
  for (const [ox, oz, r0] of [[-2.6, 0.9, 0.5], [2.9, -0.8, 0.65], [0.4, 1.2, 0.4]]) X.add(new THREE.RingGeometry(r0, r0 + 0.14, 12, 1), MIDBLUE, xf(cx + ox, yp + 0.06, cz + oz, 0, 1, 1, 1, -Math.PI / 2, 0));
  deck(cx - 5.8, cx + 5.8, cz - 2.6, cz + 2.6, yp + 0.04);
  const half = 4.7,
    rise = 3,
    N = 12;
  const Rr = (half * half + rise * rise) / (2 * rise),
    th0 = Math.asin(half / Rr);
  const pt = (k) => {
    const th = lerp(-th0, th0, k / N);
    return [cx + Rr * Math.sin(th), yp + 0.1 + Rr * Math.cos(th) - (Rr - rise), cz];
  };
  for (let k = 0; k < N; k++) {
    const a = pt(k),
      b = pt(k + 1);
    beam(X, a, b, 2.3, 0.16, k % 2 ? WOOD : 0xc9a878);
    deck(Math.min(a[0], b[0]), Math.max(a[0], b[0]), cz - 1.15, cz + 1.15, Math.max(a[1], b[1]) + 0.08);
  }
  for (const sz of [-1.08, 1.08])
    for (let k = 0; k <= N; k++) {
      const a = pt(k);
      X.box(0.13, 0.85, 0.13, k % 3 === 0 ? TIMBER : WOOD_D, a[0], a[1], cz + sz);
      if (k % 3 === 0) X.ball(0.11, 0x6a7a5a, a[0], a[1] + 0.95, cz + sz, 1, 1.3, 1, 0);
      if (k < N) {
        const b = pt(k + 1);
        beam(X, [a[0], a[1] + 0.82, cz + sz], [b[0], b[1] + 0.82, cz + sz], 0.09, 0.09, WOOD_D);
      }
    }
  for (const k of [3, 9]) {
    const a = pt(k);
    for (const sz of [-0.9, 0.9]) X.box(0.2, a[1] - yp, 0.2, TIMBER, a[0], yp, cz + sz);
    X.box(0.16, 0.16, 2.2, TIMBER, a[0], yp + (a[1] - yp) * 0.55, cz);
  }
  // the trellis, heavy with flower
  const tx0 = -145,
    tx1 = -137,
    tz0 = 223.7,
    tz1 = 225.9;
  const ty = spanY(-141, 224.8, 8, 2.2)[1] + 2.6;
  for (const x of [tx0, -141, tx1]) for (const z of [tz0, tz1]) X.box(0.16, ty - H(x, z) + 0.3, 0.16, TIMBER, x, H(x, z) - 0.3, z);
  for (const z of [tz0, tz1]) X.box(8.6, 0.12, 0.12, TIMBER, -141, ty, z);
  for (let x = tx0; x <= tx1 + 0.01; x += 1) X.box(0.08, 0.08, 2.7, WOOD_D, x, ty + 0.1, 224.8);
  for (let i = 0; i < 56; i++) {
    const len = 0.6 + Q() * 0.9;
    P.add(new THREE.ConeGeometry(0.13, len, 4, 1, true), (px, py) => mix(0x7a78b8, 0xdcd6ee, clamp(py / len + 0.5)), xf(tx0 + Q() * 8, ty - len / 2 - 0.02, tz0 + Q() * 2.2, Q() * 6, 1, 1, 1, Math.PI, 0), { sway: (px, py) => (py / len + 0.5) * 0.9 });
  }
  for (let i = 0; i < 7; i++) P.add(new THREE.IcosahedronGeometry(0.9 + Q() * 0.4, 0), i % 2 ? 0x6f9a5a : 0x86aa66, xf(tx0 + 0.6 + i * 1.15, ty + 0.3, 224.8 + (Q() - 0.5) * 1.2, Q() * 6, 1, 0.3, 1.2), { sway: 0.2 });
  rod(P, [-141.6, H(-141.6, 226.1) - 0.2, 226.1], [-141.2, ty, 225.6], 0.14, 0.08, 0x6a4a36, 5);
  // people crossing, people looking
  const top = pt(6);
  person(X, top[0] - 0.5, top[1] + 0.08, cz + 0.3, toFuji(top[0], cz), { robe: true, coat: 0x9a4a3a, sash: 0xe8c66a, armR: [1.4, 0.3] });
  person(X, top[0] + 0.7, top[1] + 0.08, cz - 0.2, toFuji(top[0], cz) + 0.3, { coat: 0x3a628f, legs: 0xe2d6b4, hat: 'cone' });
  person(X, -140.3, H(-140.3, 226.6), 226.6, 2.6, { robe: true, coat: 0x7f9aa8, sash: 0x9a4a3a, lean: -0.1, armR: [2.4, 0.2] });
  person(X, -139.4, H(-139.4, 227), 227, 2.9, { s: 0.55, coat: 0x5a6a4a, legs: SKIN, armL: [2.2, 0.3] });
  lanternAt(-141.2, 230.2);
  // where the road crosses the stream: a plain slab bridge and a way-stone, as at Nakahara
  const sy = H(-131.4, 220.1);
  X.box(4.8, 0.3, 4.6, STONE, -131.4, sy - 0.04, 220.1);
  deck(-133.8, -129, 217.8, 222.4, sy + 0.26);
  for (const a of [-1, 1]) for (const b of [-1, 1]) X.box(0.24, 0.7, 0.24, STONE_D, -131.4 + a * 2.2, sy, 220.1 + b * 2.1);
  X.box(0.4, 1.1, 0.3, STONE, -135.6, H(-135.6, 222.6) - 0.1, 222.6, 0.3);
  person(X, -130.6, sy + 0.26, 220.4, -Math.PI / 2, { coat: 0x4a5560, legs: SKIN, hat: 'cone', carry: 'pole', stride: 0.2, lean: 0.1, armR: [2.3, 0.1, 1.2] });
}
