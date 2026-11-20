import * as THREE from 'three';
import { gridGeo, mix, xf } from '../../../engine/build.js';
import { clamp, lerp } from '../../../engine/gl.js';
import { FOAM, INK, MIDBLUE, PALE, TIMBER, VERM } from '../palette.js';
import { person } from '../figures.js';
import { matsu } from '../plants.js';

// ---------------- Amida Falls: a round hollow in the rock, then one straight striped drop
export function amidaFalls(world, { H, Q, X, P, face, solid, wall, deck, spanY, lanternAt }) {
  const CX = 10,
    CZ = 331,
    RR = 13.5,
    y0 = 24,
    HT = 25;
  const T = H(CX, 317.5) + 0.25; // the level shelf the pool lies on
  const crag = (phi, b, out = 0) => {
    const lump = 1 + 0.1 * Math.sin(3 * phi) + 0.06 * Math.sin(7 * phi) + 0.05 * Math.sin(5 * phi + b * 9) * (1 - Math.exp(-phi * phi * 30));
    const r = RR * lump * Math.pow(1 - b * b * b, 0.6) + out;
    return [CX + Math.sin(phi) * r, y0 + HT * Math.pow(b, 0.9), CZ - Math.cos(phi) * r];
  };
  const ROCK = [0x5a7a80, 0x86a08a, 0xbca97c, 0x4a6470, 0x93a583];
  X.parts.push(gridGeo(30, 10, (a, b) => crag(Math.PI - a * Math.PI * 2, b), (a, b, i, j) => new THREE.Color(j > 8 ? 0x6f8a5a : ROCK[(i * 2 + j * 3 + (i >> 2)) % 5])));
  solid(CX, CZ, 12.4, y0 + HT - 3);
  // the headwall the hollow is cut into
  const hy = y0 + HT - 1.3,
    hz = CZ - 5.6;
  X.add(new THREE.IcosahedronGeometry(4.7, 1), (px, py) => mix(0x4a6470, 0x93a583, clamp(py / 9 + 0.5)), xf(CX, hy, hz, 0.3, 1.45, 1.0, 0.72));
  const HM = xf(CX, hy - 0.4, hz - 3.6, Math.PI, 1, 1, 1, -0.18, 0);
  X.add(new THREE.CircleGeometry(2.7, 18), PALE, HM, { emissive: 0.3 });
  for (const [r0, r1] of [[0.6, 0.85], [1.35, 1.6], [2.1, 2.3]]) X.add(new THREE.RingGeometry(r0, r1, 18, 1), MIDBLUE, HM.clone().multiply(xf(0.15 * r0, -0.1 * r0, 0.03)));
  for (let k = 0; k < 9; k++) {
    const a = -0.55 + (k / 8) * (Math.PI + 1.1); // rocks round the top and sides, open below where the water leaves
    X.ball(0.95 + Q() * 0.5, ROCK[k % 5], Math.cos(a) * 3.1, Math.sin(a) * 3.1, -0.45, 1, 1, 0.8, 0, undefined, HM);
  }
  // the fall itself
  const b0 = Math.pow((T - y0) / HT, 1 / 0.9);
  const STR = [MIDBLUE, FOAM, PALE, FOAM, FOAM, MIDBLUE, FOAM, PALE, FOAM, MIDBLUE];
  X.parts.push(gridGeo(10, 12, (a, b) => crag((0.5 - a) * 0.27 * (1.3 - 0.3 * b), lerp(b0, 0.8, b), 0.45), (a, b, i, j) => new THREE.Color((i * 3 + j) % 9 === 0 ? PALE : STR[i]), { emissive: 0.35 }));
  for (let k = 0; k < 6; k++) X.ball(0.7 + Q() * 0.5, FOAM, CX + (k - 2.5) * 0.85 + (Q() - 0.5) * 0.4, T + 0.25 + Q() * 0.4, 316.7 + Q() * 0.5, 1.3, 0.6, 1, 1, { emissive: 0.35 });
  // the shelf, the pool on it, and the spill down its front into the stream
  const tlo = spanY(CX, 312, 24, 11)[0];
  X.box(24, T - tlo + 0.9, 11, 0x7a8a84, CX, tlo - 1, 312);
  X.box(24.3, 0.14, 11.3, 0xa4ae8e, CX, T - 0.12, 312);
  wall(CX, 312, 12, 5.5, 0, T);
  deck(-2, 22, 306.5, 317.5, T + 0.02);
  const flatM = (x, y, z) => xf(x, y, z, 0, 1, 1, 1, -Math.PI / 2, 0);
  X.add(new THREE.CircleGeometry(3.7, 20), PALE, flatM(CX, T + 0.08, 313.6));
  for (const [r0, r1] of [[1.3, 1.7], [2.5, 2.85]]) X.add(new THREE.RingGeometry(r0, r1, 20, 1), MIDBLUE, flatM(CX, T + 0.1, 313.9 - r0 * 0.2));
  X.box(1.7, 0.1, 3.8, MIDBLUE, CX, T, 308.3);
  const yb = H(CX, 305.6) + 0.1;
  X.parts.push(gridGeo(4, 3, (a, b) => [CX + (a - 0.5) * 1.9, lerp(T + 0.08, yb, b), 306.42 - b * 0.9], (a, b, i) => new THREE.Color(i % 2 ? FOAM : PALE), { emissive: 0.3 }));
  for (let x = -1.5; x <= 21.6; x += 2.3) if (Math.abs(x - CX) > 1.6) X.box(0.14, 0.9, 0.14, TIMBER, x, T, 306.9);
  for (const cx of [3.45, 16.55]) X.box(9.9, 0.1, 0.1, TIMBER, cx, T + 0.82, 306.9);
  // pilgrims come to stand under it; a few have spread a mat
  const pil = { coat: 0xe9e2cc, legs: 0xe9e2cc, hat: 'cone', staff: true, lean: -0.12 };
  for (const [px, pz, arms, carry] of [[3, 311.2, [2.3, 0.2], 'pack'], [4.7, 312.9, undefined, undefined], [15.6, 310.8, undefined, 'pack'], [17.3, 312.7, [2.0, 0.1, 1.8], undefined], [6.3, 309.3, undefined, 'bundle']]) person(X, px, T + 0.02, pz, face(px, pz, CX, 326), { ...pil, armL: arms, carry });
  X.box(2.6, 0.04, 1.9, VERM, 19.2, T + 0.02, 309.2);
  person(X, 18.3, T + 0.06, 308.9, face(18.3, 308.9, 19.6, 309.4), { pose: 'kneel', coat: 0x3a628f, armR: [1.0, 0.1, 0.9] });
  person(X, 20.1, T + 0.06, 308.8, face(20.1, 308.8, CX, 326), { pose: 'kneel', robe: true, coat: 0x9a4a3a, sash: 0xe8c66a });
  person(X, 19.4, T + 0.06, 310, face(19.4, 310, CX, 326), { pose: 'kneel', coat: 0x5a6a4a, armL: [2.0, 0.3] });
  X.ball(0.16, INK, 19.2, T + 0.2, 309.2, 1, 0.8, 1, 0);
  X.box(0.4, 0.24, 0.3, TIMBER, 19.7, T + 0.06, 309.6);
  lanternAt(-4.6, 315.4);
  // pines cling to the rock
  for (const [px, pz, b] of [[-1.5, 327, 0.55], [21.5, 328, 0.5], [2.5, 336, 0.9], [17, 337, 0.88]]) matsu(P, px, y0 + HT * b - 0.5, pz, 6 + Q() * 2.5, Q, { pads: 3 });
}
