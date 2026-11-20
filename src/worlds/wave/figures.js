import * as THREE from 'three';
import { xf } from '../../engine/build.js';
import { rod } from './helpers.js';
import { HAIR, INDIGO, INK, SKIN, TIMBER, VERM, WOOD_D } from './palette.js';

// The people and animals that stand in the scenes: a poseable figure, a pack
// horse, a crane. Each is drawn straight into whatever Builder it is handed.

// A small poseable figure in plain Edo dress. Faces +z before ry, like figure().
// arms are [raise forward, spread sideways, bend at the elbow] from hanging.
export function person(B, x, y, z, ry, o = {}) {
  const s = o.s ?? 0.92;
  const coat = o.coat ?? INDIGO,
    legs = o.legs ?? 0x3a4a5a,
    skin = o.skin ?? SKIN,
    hair = o.hair ?? HAIR;
  const M = xf(x, y, z, ry, s, s, s);
  const low = o.robe ? coat : legs;
  let hip = 0.84;
  if (o.pose === 'kneel') {
    hip = 0.3;
    B.box(0.5, 0.3, 0.62, low, 0, 0, -0.06, 0, undefined, M);
  } else if (o.pose === 'sit') {
    hip = o.seat ?? 0.45;
    for (const sx of [-0.11, 0.11]) {
      rod(B, [sx, hip, 0], [sx, hip, 0.42], 0.1, 0.085, low, 4, undefined, M);
      rod(B, [sx, hip, 0.42], [sx, 0, 0.46], 0.08, 0.07, low, 4, undefined, M);
    }
  } else if (o.robe) rod(B, [0, 0, 0], [0, hip + 0.04, 0], 0.34, 0.2, coat, 6, undefined, M);
  else {
    const st = o.stride ?? 0;
    rod(B, [-0.11, 0, st], [-0.1, hip + 0.04, 0], 0.08, 0.11, legs, 4, undefined, M);
    rod(B, [0.11, 0, -st], [0.1, hip + 0.04, 0], 0.08, 0.11, legs, 4, undefined, M);
  }
  // everything above the hips leans and turns together
  const U = M.clone().multiply(xf(0, hip, 0, o.twist ?? 0, 1, 1, 1, o.lean ?? 0, 0));
  rod(B, [0, -0.08, 0], [0, 0.58, 0], 0.25, 0.19, coat, 6, undefined, U);
  B.ball(0.2, coat, 0, 0.57, 0, 1.15, 0.5, 0.8, 0, undefined, U);
  if (o.sash) rod(B, [0, 0.06, 0], [0, 0.18, 0], 0.247, 0.237, o.sash, 6, undefined, U);
  const arm = (side, a = [0.1, 0.12]) => {
    const A = U.clone().multiply(xf(side * 0.25, 0.55, 0, 0, 1, 1, 1, -a[0], side * a[1]));
    rod(B, [0, 0, 0], [0, -0.34, 0], 0.075, 0.06, coat, 4, undefined, A);
    const F = A.multiply(xf(0, -0.34, 0, 0, 1, 1, 1, -(a[2] ?? 0), 0));
    rod(B, [0, 0, 0], [0, -0.28, 0], 0.05, 0.04, skin, 4, undefined, F);
    return new THREE.Vector3(0, -0.28, 0).applyMatrix4(F);
  };
  const handL = arm(-1, o.armL),
    handR = arm(1, o.armR);
  const hy = 0.84;
  const hat = o.hat ?? 'none';
  B.ball(0.18, skin, 0, hy, 0.01, 1, 1.08, 1, hat === 'none' ? 1 : 0, undefined, U);
  if (hat === 'cone') B.add(new THREE.ConeGeometry(0.42, 0.22, 8, 1, true), o.hatCol ?? 0xd9c28a, U.clone().multiply(xf(0, hy + 0.2, 0, 0, 1, 1, 1, o.hatTilt ?? 0, 0)));
  else if (hat === 'flat') B.add(new THREE.ConeGeometry(0.5, 0.13, 8, 1, true), o.hatCol ?? 0xcdb880, U.clone().multiply(xf(0, hy + 0.19, 0)));
  else if (hat === 'cloth') B.ball(0.19, o.hatCol ?? 0xe9dfc6, 0, hy + 0.05, -0.02, 1.05, 0.85, 1.05, 0, undefined, U);
  else if (hat === 'basket') {
    // the deep reed hood of a wandering flute-monk
    rod(B, [0, hy - 0.24, 0], [0, hy + 0.22, 0], 0.27, 0.21, 0xcdb880, 7, undefined, U);
    B.ball(0.21, 0xcdb880, 0, hy + 0.22, 0, 1, 0.35, 1, 0, undefined, U);
  } else {
    B.ball(0.185, hair, 0, hy + 0.05, -0.035, 1.03, 0.85, 1.03, 0, undefined, U);
    if (o.robe) B.ball(0.1, hair, 0, hy + 0.2, -0.08, 1, 0.8, 1, 0, undefined, U);
    else B.box(0.06, 0.06, 0.17, hair, 0, hy + 0.17, -0.03, 0, undefined, U);
  }
  if (o.hatBack) B.add(new THREE.ConeGeometry(0.4, 0.2, 8, 1, true), 0xd9c28a, U.clone().multiply(xf(0, 0.42, -0.27, 0, 1, 1, 1, -1.35, 0)));
  const c = o.carry;
  if (c === 'pack') B.box(0.44, 0.42, 0.26, o.load ?? 0x5a6a4a, 0, 0.14, -0.33, 0, undefined, U);
  else if (c === 'basket') rod(B, [0, 0.06, -0.35], [0, 0.56, -0.37], 0.15, 0.23, o.load ?? 0xc9a86a, 6, undefined, U);
  else if (c === 'sack') B.ball(0.27, o.load ?? 0xe6dcc0, 0.15, 0.82, -0.02, 0.85, 0.72, 1.55, 1, undefined, U);
  else if (c === 'bundle') B.ball(0.25, o.load ?? 0x5f8a7a, 0, 0.36, -0.31, 1.2, 0.9, 0.8, 0, undefined, U);
  else if (c === 'pole') {
    // a shoulder pole with a load at either end
    rod(B, [0.2, 0.68, -0.85], [0.2, 0.68, 0.85], 0.022, 0.022, WOOD_D, 3, undefined, U);
    for (const e of [-0.8, 0.8]) {
      rod(B, [0.2, 0.68, e], [0.2, 0.22, e], 0.01, 0.01, TIMBER, 3, undefined, U);
      B.box(0.34, 0.28, 0.34, o.load ?? 0xc9a86a, 0.2, -0.06, e, 0, undefined, U);
    }
  }
  if (o.staff) rod(B, [0.36, 0, 0.2], [0.36, 1.55, 0.2], 0.022, 0.018, WOOD_D, 3, undefined, M);
  return { M, U, handL, handR };
}

export function horse(B, x, y, z, ry, o = {}) {
  const s = o.s ?? 1,
    col = o.col ?? 0x8a6a48;
  const M = xf(x, y, z, ry, s, s, s);
  B.ball(0.5, col, 0, 1.22, 0, 0.78, 0.76, 1.7, 1, undefined, M);
  rod(B, [0, 1.3, 0.62], [0, 1.92, 1.08], 0.27, 0.15, col, 5, undefined, M);
  rod(B, [0, 2.0, 1.02], [0, 1.58, 1.42], 0.16, 0.09, col, 5, undefined, M);
  B.ball(0.1, col, 0, 1.56, 1.44, 1, 1, 1, 0, undefined, M);
  rod(B, [0, 1.5, 0.5], [0, 2.1, 0.98], 0.06, 0.05, TIMBER, 3, undefined, M);
  for (const [lx, lz, k] of [[-0.2, 0.62, 0.1], [0.2, 0.6, -0.08], [-0.2, -0.62, -0.1], [0.2, -0.6, 0.08]]) rod(B, [lx, 0, lz + k], [lx, 1.05, lz], 0.055, 0.1, col, 4, undefined, M);
  rod(B, [0, 1.4, -0.8], [0, 0.6, -0.98], 0.07, 0.02, TIMBER, 4, undefined, M);
  if (o.load) {
    B.box(0.92, 0.08, 0.9, o.cloth ?? INDIGO, 0, 1.6, -0.05, 0, undefined, M);
    for (const sx of [-1, 1]) B.box(0.38, 0.5, 0.8, o.load, sx * 0.54, 1.12, -0.05, 0, undefined, M);
    B.box(0.5, 0.3, 0.6, o.load, 0, 1.68, -0.05, 0, undefined, M);
  }
}

// a red-crowned crane: 0 standing, 1 feeding, 2 calling
export function crane(B, x, y, z, ry, pose = 0, s = 1) {
  const M = xf(x, y, z, ry, s, s, s);
  const W = 0xf6f1e2;
  rod(B, [-0.06, 0, 0.02], [-0.05, 0.9, 0], 0.016, 0.024, INK, 3, undefined, M);
  rod(B, [0.06, 0, -0.03], [0.05, 0.9, 0], 0.016, 0.024, INK, 3, undefined, M);
  B.ball(0.3, W, 0, 1.08, 0, 0.72, 0.7, 1.25, 1, undefined, M);
  B.ball(0.22, INK, 0, 1.02, -0.36, 0.6, 0.62, 1.1, 0, undefined, M);
  const n = pose === 1 ? [[0, 1.15, 0.3], [0, 0.72, 0.72], [0, 0.32, 0.86], [0, 0.06, 0.98], [0, 0.05, 0.07]] : pose === 2 ? [[0, 1.2, 0.26], [0, 1.72, 0.36], [0, 2.05, 0.3], [0, 2.38, 0.36], [0, 0.02, -0.07]] : [[0, 1.2, 0.28], [0, 1.7, 0.42], [0, 1.94, 0.44], [0, 1.9, 0.78], [0, 0.07, -0.01]];
  rod(B, n[0], n[1], 0.085, 0.05, W, 4, undefined, M);
  rod(B, n[1], n[2], 0.05, 0.045, INK, 4, undefined, M);
  B.ball(0.078, W, n[2][0], n[2][1], n[2][2], 1, 1, 1.15, 0, undefined, M);
  B.ball(0.05, VERM, n[2][0] + n[4][0], n[2][1] + n[4][1], n[2][2] + n[4][2], 1, 1, 1, 0, undefined, M);
  rod(B, n[2], n[3], 0.03, 0.006, 0x8a8a5a, 3, undefined, M);
}
