import { mix } from '../../../engine/build.js';
import { lerp } from '../../../engine/gl.js';
import { SKIN, TIMBER, WOOD_D, WOOD_L } from '../palette.js';
import { rod, beam } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- the timber yard at Honjo Tatekawa: stacked high, sawn by hand
export function timberYard(world, { H, Q, X, maps, face, wall, deck }) {
  const sx = 68,
    sz = 211,
    sy = H(sx, sz),
    LAY = 14,
    th = 0.44;
  for (let l = 0; l < LAY; l++)
    for (let k = 0; k < 5; k++) {
      const o = (k - 2) * 1.02,
        col = mix(0xdcc48c, 0xb8935a, Q());
      if (l % 2) X.box(4.9, th - 0.03, 0.9, col, sx, sy + l * th, sz + o);
      else X.box(0.9, th - 0.03, 4.9, col, sx + o, sy + l * th, sz);
    }
  const top = sy + LAY * th;
  wall(sx, sz, 2.5, 2.5, 0, top);
  deck(sx - 2.5, sx + 2.5, sz - 2.5, sz + 2.5, top);
  // one man up on the stack catching, one below throwing, a board in the air between them
  person(X, sx + 1.5, top, sz + 0.9, face(sx + 1.5, sz + 0.9, 73, 212.6), { coat: 0x3a628f, legs: SKIN, hat: 'cloth', armL: [2.5, 0.25], armR: [2.5, 0.25], lean: 0.25 });
  person(X, 73, H(73, 212.6), 212.6, face(73, 212.6, sx + 1.5, sz + 0.9), { coat: 0x8a6a48, legs: SKIN, armL: [2.7, 0.2], armR: [2.7, 0.2], lean: -0.15 });
  beam(X, [72.3, sy + 3.0, 212.4], [70.9, sy + 5.3, 212.0], 0.5, 0.06, WOOD_L);
  // the sawyer on his propped beam, and his mate setting a blade below
  const gy = H(80, 212.5);
  const p0 = [77.3, gy + 0.3, 212.5],
    p1 = [83.2, gy + 3.7, 212.5];
  beam(X, p0, p1, 0.34, 1.15, 0xdcc48c);
  rod(X, [81.7, gy - 0.3, 211.5], [82.5, gy + 3.5, 213.3], 0.1, 0.08, TIMBER, 5);
  rod(X, [81.7, gy - 0.3, 213.5], [82.5, gy + 3.5, 211.7], 0.1, 0.08, TIMBER, 5);
  const sp = [lerp(p0[0], p1[0], 0.5), lerp(p0[1], p1[1], 0.5) + 0.66, 212.5];
  const sw = person(X, sp[0], sp[1], sp[2], -Math.PI / 2, { coat: 0x2f548a, legs: SKIN, hat: 'cloth', lean: 0.55, armL: [0.9, -0.1], armR: [0.9, -0.1], stride: 0.15 });
  beam(X, [sw.handR.x, sw.handR.y + 0.1, 212.5], [sw.handR.x - 0.75, sw.handR.y - 1.5, 212.5], 0.03, 0.42, 0x9aa4a6);
  person(X, 79.4, gy + 0.05, 209.8, 2.6, { pose: 'sit', seat: 0.4, coat: 0x5a6a4a, legs: SKIN, hat: 'none', lean: 0.45, armL: [0.9, 0.1], armR: [0.9, 0.1] });
  X.box(0.7, 0.36, 0.5, WOOD_D, 79.4, gy, 209.6);
  beam(X, [78.9, gy + 0.62, 210.5], [80.1, gy + 0.62, 210.1], 0.4, 0.03, 0x9aa4a6);
  // poles stood on end against a rail
  const ry0 = H(90.2, 211);
  for (const px of [86.9, 93.6]) rod(X, [px, ry0 - 0.4, 211], [px, ry0 + 5.2, 211], 0.14, 0.12, TIMBER, 5);
  rod(X, [86.6, ry0 + 5, 211], [93.9, ry0 + 5, 211], 0.09, 0.09, TIMBER, 5);
  for (let k = 0; k < 28; k++) {
    const px = 87.2 + k * 0.235,
      side = k % 2 ? 1 : -1;
    rod(X, [px, ry0 - 0.2, 211 + side * (1.0 + Q() * 0.5)], [px + (Q() - 0.5) * 0.2, ry0 + 6.4 + Q() * 2.4, 211 - side * 0.12], 0.075, 0.04, mix(0xdcc890, 0xb8a060, Q()), 4);
  }
  wall(90.2, 211, 3.5, 1.5, 0, ry0 + 5);
  // boards laid up to season, and logs waiting at the water's edge
  for (const [px, pz, ry] of [[74.6, 208.3, 0.1], [76.2, 215.6, -0.2], [85.4, 215.8, 0.15], [64.6, 215.4, 1.4]]) {
    const y = H(px, pz);
    for (let l = 0; l < 6; l++) X.box(3.7 - (l % 2) * 0.2, 0.09, 0.95, mix(0xdcc48c, 0xc0a068, Q()), px + (Q() - 0.5) * 0.12, y + 0.08 + l * 0.14, pz, ry);
  }
  for (let k = 0; k < 6; k++) {
    const x0 = 63.5 + k * 3.3,
      z0 = 205.4 - (k % 2) * 0.9;
    const ly = Math.max(H(x0 + 2.2, z0), 0.8) + 0.25; // resting on the sand, not sunk in it
    rod(X, [x0, ly, z0], [x0 + 4.4, ly, z0 + (Q() - 0.5) * 0.6], 0.3, 0.26, mix(0xb08a58, 0x8a6a48, Q()), 6);
  }
  person(X, 76.5, H(76.5, 211.5), 211.5, 1.2, { coat: 0x4a5560, legs: 0x3a4a5a, sash: 0xcdbb98, armL: [0.9, -0.5, 1.6], armR: [0.9, -0.5, 1.6] });
  const cp = person(X, 85.6, H(85.6, 213), 213, -1.9, { coat: 0x7f9aa8, legs: SKIN, hat: 'cloth', stride: 0.2, lean: 0.12, armR: [2.5, 0.1, 1.0] });
  beam(X, [cp.handR.x - 1.6, cp.handR.y + 0.12, cp.handR.z + 0.6], [cp.handR.x + 1.5, cp.handR.y + 0.02, cp.handR.z - 0.55], 0.3, 0.05, WOOD_L);
  maps.blob(sx, sz, 6, 0.4);
}
