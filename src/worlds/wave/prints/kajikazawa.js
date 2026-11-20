import * as THREE from 'three';
import { mix, xf } from '../../../engine/build.js';
import { clamp, lerp } from '../../../engine/gl.js';
import { FOAM, SKIN, TIMBER } from '../palette.js';
import { rod } from '../helpers.js';
import { person } from '../figures.js';

// ---------------- Kajikazawa: the fisherman out on his rock, lines fanned to the water
export function kajikazawa(world, { H, Q, X, deck, solid, face, minka }) {
  const base = [-175.5, 200.5],
    tip = [-168.5, 185.5],
    N = 7;
  const rockCol = (px, py) => mix(0x2f5068, 0x86a8a0, clamp(py * 0.5 + 0.5));
  let prev = 1.4;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1);
    const x = lerp(base[0], tip[0], t),
      z = lerp(base[1], tip[1], t);
    const top = lerp(1.7, 5.4, Math.pow(t, 0.8)),
      rad = lerp(4.6, 2.4, t),
      bot = Math.min(H(x, z), 0) - 1.4;
    X.add(new THREE.IcosahedronGeometry(1, 1), rockCol, xf(x + (Q() - 0.5) * 0.8, (top + bot) / 2 - 0.1, z, Q() * 6, rad, ((top - bot) / 2) * 1.02, rad * 0.9));
    X.cyl(rad * 0.6, rad * 0.72, 0.4, k % 2 ? 0x7f9a6a : 0x6f8a5a, x, top - 0.36, z, 7);
    deck(x - rad * 0.55, x + rad * 0.55, z - rad * 0.55, z + rad * 0.55, top + 0.04);
    if (k) solid(x, z, rad * 0.5, prev - 0.05);
    prev = top;
  }
  // the lip that hangs out over the water
  X.add(new THREE.IcosahedronGeometry(1, 1), rockCol, xf(tip[0] + 1.0, 3.9, tip[1] - 1.6, 0.4, 2.0, 1.6, 2.6, 0.5, 0));
  X.cyl(1.3, 1.6, 0.36, 0x7f9a6a, tip[0] + 0.8, 5.08, tip[1] - 1.7, 7);
  deck(tip[0] - 0.5, tip[0] + 2.1, tip[1] - 3, tip[1] - 0.4, 5.48);
  const fx = tip[0] + 1.1,
    fz = tip[1] - 2.4;
  const ends = [[-181, 174.8], [-178.4, 172.8], [-175.6, 171.3], [-172.7, 170.4], [-169.8, 170.1]];
  const f = person(X, fx, 5.46, fz, face(fx, fz, -175.6, 171.3), { coat: 0x2f548a, legs: SKIN, hat: 'cloth', lean: 0.8, stride: 0.12, armR: [0.75, 0.05], armL: [0.3, 0.1] });
  for (const [ex, ez] of ends) rod(X, [f.handR.x, f.handR.y, f.handR.z], [ex, 0.05, ez], 0.02, 0.02, TIMBER, 3);
  for (const [ex, ez] of ends) X.ball(0.5, FOAM, ex, 0.15, ez, 1.3, 0.35, 1, 0);
  // the boy with the basket behind him
  person(X, tip[0] - 0.6, 5.44, tip[1] + 0.6, 2.4, { s: 0.62, pose: 'kneel', coat: 0x5a6a4a, lean: 0.3, armL: [0.8, 0.1], armR: [0.8, 0.1] });
  rod(X, [tip[0] + 0.3, 5.42, tip[1] + 1.1], [tip[0] + 0.3, 5.95, tip[1] + 1.1], 0.24, 0.34, 0xc9a86a, 7);
  for (let k = 0; k < 9; k++) {
    const a = -2.2 + k * 0.5;
    X.ball(0.7 + Q() * 0.5, FOAM, tip[0] + 0.6 + Math.cos(a) * (3.4 + Q()), 0.2, tip[1] - 1 + Math.sin(a) * (3.4 + Q()), 1.3, 0.5, 1, 0);
  }
  // a fisherman's hut and boat up the beach from the rock
  minka(-206, 213.5, Math.PI - 0.3, 5, 4, { h: 2.2, lit: false });
  const by = H(-199.5, 208.5);
  X.box(5.6, 0.75, 1.5, 0xd9c690, -199.5, by + 0.05, 208.5, -0.5);
  X.box(5.9, 0.12, 1.7, 0x8a6a48, -199.5, by + 0.8, 208.5, -0.5);
  person(X, -202.6, H(-202.6, 210.4), 210.4, 0.6, { coat: 0x4a5560, legs: SKIN, hat: 'cone', carry: 'basket' });
}
