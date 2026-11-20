import * as THREE from 'three';
import { gridGeo, mix, xf } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';
import { SKIN, STONE, STONE_D } from '../palette.js';
import { rod } from '../helpers.js';
import { person, horse } from '../figures.js';

// ---------------- Mishima Pass: three travellers with their arms about a cedar too big to measure
export function mishimaPass(world, { H, Q, X, P, solid, face }) {
  const cx = -150,
    cz = 292.5,
    gy = H(cx, cz),
    TH = 66;
  const rAt = (y) => 2.6 * (1 - 0.8 * (y / TH)) + 1.1 * Math.exp(-y / 1.8);
  X.parts.push(
    gridGeo(
      14,
      7,
      (a, b) => {
        const yy = b * b * (TH + 1.5) - 1.5,
          an = a * 6.283,
          r = rAt(Math.max(yy, 0));
        return [cx + Math.cos(an) * r, gy + yy, cz + Math.sin(an) * r];
      },
      (a, b, i) => new THREE.Color(i % 2 ? 0xa4603c : 0x7c4830)
    )
  );
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05 + 0.4;
    rod(X, [cx + Math.cos(a) * 2.5, gy + 2.2, cz + Math.sin(a) * 2.5], [cx + Math.cos(a) * 5.4, H(cx + Math.cos(a) * 5.4, cz + Math.sin(a) * 5.4) - 0.3, cz + Math.sin(a) * 5.4], 0.6, 0.22, 0x7c4830, 5);
  }
  solid(cx, cz, 3.0, gy + 30);
  // its own weather of branches, far overhead
  for (let k = 0; k < 9; k++) {
    const y = gy + 25 + k * 4.4,
      spread = 9.5 - k * 0.85;
    for (let j = 0; j < 3; j++) {
      const a = k * 1.9 + j * 2.09 + Q() * 0.5,
        d = spread * (0.45 + Q() * 0.2),
        br = spread * (0.42 + Q() * 0.12);
      rod(P, [cx, y - 0.6, cz], [cx + Math.cos(a) * d, y - 0.8, cz + Math.sin(a) * d], 0.3, 0.16, 0x7c4830, 4);
      P.add(new THREE.IcosahedronGeometry(br, 1), (px, py) => mix(0x21453a, 0x4a8062, clamp((py / br) * 0.5 + 0.5)), xf(cx + Math.cos(a) * d, y - 1 - Q() * 0.8, cz + Math.sin(a) * d, Q() * 6, 1, 0.3, 1), { sway: 0.1 });
    }
  }
  P.add(new THREE.ConeGeometry(3.2, 9, 7, 1, true), 0x2f5a48, xf(cx, gy + TH + 1.5, cz), { sway: 0.15 });
  // the three who try to span it, seen from behind
  const r1 = rAt(1.2) + 0.3;
  [-0.5, 0, 0.5].forEach((a, i) => {
    const x = cx + Math.sin(a) * r1,
      z = cz + Math.cos(a) * r1;
    person(X, x, H(x, z), z, a + Math.PI, { coat: [0x2f548a, 0x8a6a48, 0x5a6a4a][i], legs: i === 1 ? SKIN : 0xe2d6b4, hat: i === 1 ? 'cloth' : 'none', hatBack: i !== 1, lean: 0.1, armL: [0.3, 1.42], armR: [0.3, 1.42] });
  });
  // the rest of the party: one craning up at it, one sitting with his pipe, their loads set down
  let px = cx + 5.6,
    pz = cz + 5.2;
  person(X, px, H(px, pz), pz, face(px, pz, cx, cz), { coat: 0x4a5560, legs: 0xe2d6b4, hat: 'cone', hatTilt: -0.5, lean: -0.3, armL: [2.1, 0.1, 1.9], staff: true });
  px = cx - 5.4;
  pz = cz + 5.8;
  X.box(0.9, 0.42, 0.6, STONE_D, px, H(px, pz) - 0.05, pz - 0.1, 0.4);
  person(X, px, H(px, pz) + 0.08, pz, 0.6, { pose: 'sit', seat: 0.42, coat: 0x7f9aa8, legs: SKIN, hat: 'cloth', armR: [1.3, 0.1, 1.6] });
  X.box(0.5, 0.45, 0.36, 0x5a6a4a, px + 1.1, H(px + 1.1, pz + 0.5), pz + 0.5, 0.5);
  X.add(new THREE.ConeGeometry(0.42, 0.22, 8, 1, true), 0xd9c28a, xf(px + 1.7, H(px + 1.7, pz - 0.3) + 0.12, pz - 0.3));
  horse(X, cx + 9, H(cx + 9, cz + 8.6), cz + 8.6, -1.9, { load: 0x8a6a48, col: 0x6a5240 });
  person(X, cx + 7.2, H(cx + 7.2, cz + 9.4), cz + 9.4, -1.7, { coat: 0x3a628f, legs: SKIN, hat: 'cone', lean: 0.1 });
  // the spring the west stream starts from, and stones across it
  for (let k = 0; k < 5; k++) X.ball(0.8 + Q() * 0.6, k % 2 ? 0x5a7a80 : 0x86a08a, -126 + Math.cos(k * 1.3) * 1.6, H(-126, 297) + 0.2, 297.2 + Math.sin(k * 1.3) * 1.3, 1, 0.7, 1, 0);
  for (let k = 0; k < 3; k++) X.cyl(0.45, 0.5, 0.3, STONE, -125.7 - k * 0.95, H(-126.6, 287.6) - 0.05, 287 + k * 0.75, 6);
}
