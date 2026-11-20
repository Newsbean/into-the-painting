import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { SKIN } from '../palette.js';
import { segDist } from '../ground-plan.js';
import { person } from '../figures.js';
import { bamboo } from '../plants.js';

// ---------------- the bamboo grove on the way up to the falls
export function bambooGrove(world, { H, Q, X, P, maps, near, solid, jizo, lanternAt }) {
  let k = 0,
    guard = 0;
  while (k < 64 && guard++ < 1500) {
    const x = -39 + Q() * 27,
      z = 267.5 + Q() * 31;
    if (segDist(x, z, -5, 262, -6, 280) < 2.4 || segDist(x, z, -6, 280, -7, 298) < 2.4 || near(x, z, 0.7)) continue;
    const y = H(x, z);
    bamboo(P, x, y, z, 9 + Q() * 5.5, Q);
    solid(x, z, 0.2, y + 6);
    if (z < 280) maps.blob(x, z, 2, 0.25);
    k++;
  }
  for (let i = 0; i < 7; i++) {
    const x = -34 + Q() * 20,
      z = 270 + Q() * 26;
    P.add(new THREE.ConeGeometry(0.16, 0.5, 5, 1, true), 0x8a6a48, xf(x, H(x, z) + 0.2, z));
  }
  const wx = -15.5,
    wz = 284;
  person(X, wx, H(wx, wz), wz, 2.4, { coat: 0x5a6a4a, legs: SKIN, hat: 'cloth', carry: 'basket', lean: 0.5, armL: [0.8, 0.1], armR: [0.8, 0.1] });
  for (let i = 0; i < 5; i++) jizo(-8.3 - i * 0.12, 262.5 + i * 0.85, Math.PI / 2);
  lanternAt(-9.2, 299);
  // a traveller with his pack partway up
  person(X, -6.4, H(-6.4, 290), 290, 0, { coat: 0x2f548a, legs: 0xe2d6b4, hat: 'cone', carry: 'pack', lean: 0.2, stride: 0.2, staff: true });
}
