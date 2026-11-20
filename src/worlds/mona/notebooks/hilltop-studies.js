import * as THREE from 'three';
import { figure, mix, xf } from '../../../engine/build.js';
import { rod, beam } from '../helpers.js';
import { MARBLE, TIMBER, DARK, stoneC, woodC } from '../palette.js';

// ================= on the hilltop: drawing tables, mirrors, anatomy, a wing on test, solids for Pacioli
export function buildHilltopStudies(world, kit) {
  const { H, maps, Q, C, LB, LP, SQ, toW } = kit;
  const desk = (x, z, ry, w = 2.6, d = 1.2) => {
    const y = H(x, z) + 0.02,
      M = xf(x, y, z, ry);
    LB.box(w, 0.1, d, woodC, 0, 0.82, 0, 0, undefined, M);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) LB.box(0.1, 0.82, 0.1, DARK, sx * (w / 2 - 0.12), 0, sz * (d / 2 - 0.12), 0, undefined, M);
    C.push({ x, z, hw: w / 2 + 0.05, hd: d / 2 + 0.05, ry, top: y + 1.05 });
    maps.blob(x, z, 1.8, 0.3);
    return M;
  };
  const sheet = (M, x, z, ry, w = 0.5, d = 0.36) => LB.box(w, 0.012, d, 0xe8dcc0, x, 0.925, z, ry, undefined, M);
  const flags = (x0, z0, nx, nz) => {
    const P = (x, z) => [x, H(x, z) + 0.07, z];
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const xa = x0 + i * 2,
          za = z0 + j * 2;
        if (Q() < 0.1) continue;
        SQ.quad(P(xa + 0.06, za + 0.06), P(xa + 0.06, za + 1.94), P(xa + 1.94, za + 1.94), P(xa + 1.94, za + 0.06), mix(0xb4a684, 0xcabc98, Q()));
      }
  };
  const stool = (x, z) => {
    LB.cyl(0.22, 0.26, 0.5, DARK, x, H(x, z), z, 7);
    C.push({ x, z, r: 0.3, top: H(x, z) + 0.6 });
  };
  // ---- west: the studies
  flags(-31, -3, 5, 8);
  const MA = desk(-25.2, -0.6, 0.25);
  sheet(MA, -0.2, 0.1, 0.2);
  sheet(MA, 0.45, -0.2, -0.3);
  sheet(MA, -0.1, -0.3, 1.2, 0.4, 0.3);
  LB.cyl(0.05, 0.06, 0.08, 0x2a2420, 0.95, 0.92, 0.3, 6, undefined, MA);
  rod(LB, [0.95, 0.98, 0.3], [1.15, 1.3, 0.2], 0.012, 0xf0ece0, 3, 0.03, undefined, MA);
  LB.box(0.07, 0.55, 0.07, DARK, -0.95, 0.92, -0.2, 0, undefined, MA);
  LB.cyl(0.42, 0.42, 0.04, 0xc9d6d0, -0.95, 1.5, -0.2, 16, { emissive: 0.5 }, MA, 1.25, 0);
  LB.add(new THREE.TorusGeometry(0.44, 0.035, 4, 16), DARK, MA.clone().multiply(xf(-0.95, 1.5, -0.2, 0, 1, 1, 1, 1.25 - Math.PI / 2, 0)));
  stool(-24.9, 0.9);
  // a bird, taken apart to see how it flies
  LB.ball(0.09, 0x6a5a48, 0.1, 1.0, 0.35, 1.9, 1, 1, 0, undefined, MA);
  for (const s of [-1, 1]) {
    const a = toW(MA, 0.1, 1.02, 0.35),
      b = toW(MA, 0.2, 1.08, 0.35 + s * 0.42),
      c = toW(MA, -0.05, 1.04, 0.35 + s * 0.4);
    SQ.tri([a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z], 0x8a7a66);
    SQ.tri([a.x, a.y, a.z], [c.x, c.y, c.z], [b.x, b.y, b.z], 0x8a7a66);
  }
  // anatomy: a skull, the bones and muscle of an arm, a flayed figure
  const MBn = desk(-28.6, 5.6, -0.35);
  sheet(MBn, 0.1, 0.2, 0.4);
  sheet(MBn, 0.2, -0.25, -0.1);
  LB.ball(0.14, 0xe2d8bc, -0.7, 1.06, 0.1, 0.9, 1, 1.1, 1, undefined, MBn);
  LB.box(0.16, 0.07, 0.14, 0xd8ccae, -0.7, 0.925, 0.2, 0, undefined, MBn);
  for (const s of [-1, 1]) LB.ball(0.036, 0x2a2420, -0.7 + s * 0.055, 1.075, 0.235, 1, 1, 1, 0, undefined, MBn);
  LB.box(0.3, 0.08, 0.3, DARK, 0.85, 0.92, 0, 0, undefined, MBn);
  for (const s of [-1, 1]) rod(LB, [0.85 + s * 0.03, 1.0, 0], [0.86 + s * 0.02, 1.45, 0], 0.024, 0xe2d8bc, 4, 0.02, undefined, MBn);
  LB.ball(0.07, 0xa8584a, 0.85, 1.17, 0.03, 1, 2.3, 1, 0, undefined, MBn);
  for (let f = -2; f <= 2; f++) rod(LB, [0.86, 1.45, 0], [0.86 + f * 0.045, 1.62, 0], 0.012, 0xe2d8bc, 3, 0.01, undefined, MBn);
  stool(-27.4, 6.6);
  {
    const x = -30.6,
      z = 2.6,
      y = H(x, z);
    LB.box(0.75, 0.95, 0.75, stoneC, x, y, z, 0.5);
    LB.box(0.9, 0.08, 0.9, MARBLE, x, y + 0.95, z, 0.5);
    figure(LP, x, y + 1.03, z, 1.4, { coat: 0xa8604a, legs: 0x9a5444, skin: 0xb87058, hair: 0xa8604a, scale: 0.6, arms: 0.55 });
    C.push({ x, z, r: 0.6, top: y + 2.2 });
  }
  // the wing on its test frame: push the lever and the linen beats
  {
    const x = -23.4,
      z = 10.4,
      RM = xf(x, H(x, z), z, -0.5);
    LB.box(1.8, 0.25, 1.1, DARK, 0, 0, 0, 0, undefined, RM);
    rod(LB, [0, 0.2, 0], [0, 2.5, 0], 0.09, woodC, 5, 0.08, undefined, RM);
    beam(LB, [-1.7, 1.15, 0], [0.25, 2.6, 0], 0.12, 0.14, TIMBER, undefined, RM);
    rod(LB, [-1.7, 1.15, 0], [-1.7, 0.25, 0], 0.02, 0x3a2a1c, 3, 0.02, undefined, RM);
    const spar = [[0.25, 2.6, 0], [1.3, 2.95, 0.05], [2.3, 3.05, 0.2], [3.2, 2.95, 0.45], [3.9, 2.75, 0.8]];
    const tips = spar.map((p, i) => [p[0] + 0.15 * i, p[1] - 0.25 - i * 0.05, p[2] + 1.7 - i * 0.22]);
    for (let i = 0; i < spar.length; i++) {
      if (i < spar.length - 1) rod(LB, spar[i], spar[i + 1], 0.045, DARK, 4, 0.035, undefined, RM);
      rod(LB, spar[i], tips[i], 0.025, TIMBER, 3, 0.015, undefined, RM);
      if (i < spar.length - 1) {
        const q = [spar[i], tips[i], tips[i + 1], spar[i + 1]].map((p) => toW(RM, p[0], p[1], p[2])).map((v) => [v.x, v.y, v.z]);
        SQ.quad(q[0], q[1], q[2], q[3], i & 1 ? 0xe6dcc0 : 0xd8ccac, true);
      }
    }
    C.push({ x, z, r: 0.8, top: H(x, z) + 2.6 });
    maps.blob(x, z, 2.5, 0.3);
  }
  // an easel with a red-chalk study
  {
    const x = -22.4,
      z = 3.2,
      EM = xf(x, H(x, z), z, -1.1);
    for (const [ox, rz] of [[-0.4, 0.13], [0.4, -0.13]]) LB.cyl(0.035, 0.035, 2.1, 0x6a4a2a, ox, 0, 0, 5, undefined, EM, 0, rz);
    LB.cyl(0.035, 0.035, 2.1, 0x6a4a2a, 0, 0, -0.55, 5, undefined, EM, 0.28, 0);
    LB.box(1.0, 1.25, 0.04, 0xe8dcc0, 0, 0.8, 0.05, 0, undefined, EM);
    for (let k = 0; k < 5; k++) LB.box(0.5 - k * 0.06, 0.025, 0.02, 0x9a5a40, -0.1 + k * 0.05, 1.75 - k * 0.17, 0.08, 0, undefined, EM);
    LB.add(new THREE.TorusGeometry(0.2, 0.014, 4, 14), 0x9a5a40, EM.clone().multiply(xf(0.12, 1.2, 0.08)));
    C.push({ x, z, r: 0.6, top: H(x, z) + 2 });
  }
  // ---- east: geometry and mechanics
  flags(21, -4, 5, 8);
  const wire = (geo, x, z, r) => {
    const y = H(x, z);
    LB.box(0.7, 1.0, 0.7, stoneC, x, y, z, 0.3);
    LB.box(0.84, 0.08, 0.84, MARBLE, x, y + 1.0, z, 0.3);
    const e = new THREE.EdgesGeometry(geo, 1).attributes.position;
    const seen = new Set();
    for (let i = 0; i < e.count; i += 2) {
      const a = [x + e.getX(i) * r, y + 1.1 + r + e.getY(i) * r, z + e.getZ(i) * r],
        b = [x + e.getX(i + 1) * r, y + 1.1 + r + e.getY(i + 1) * r, z + e.getZ(i + 1) * r];
      rod(LB, a, b, 0.028, 0x8e6c40, 4);
      for (const p of [a, b]) {
        const key = p.map((v) => v.toFixed(2)).join();
        if (seen.has(key)) continue;
        seen.add(key);
        LB.ball(0.055, DARK, p[0], p[1], p[2], 1, 1, 1, 0);
      }
    }
    C.push({ x, z, r: 0.55, top: y + 1.2 + r * 2 });
    maps.blob(x, z, 1.4, 0.3);
  };
  wire(new THREE.IcosahedronGeometry(1, 0), 23.4, -1.6, 0.62);
  wire(new THREE.DodecahedronGeometry(1, 0), 27.6, 1.0, 0.62);
  wire(new THREE.OctahedronGeometry(1, 0), 23.8, 4.4, 0.6);
  // three mirrors set to catch a face from every side
  const MC = desk(28.2, 6.6, 0.5);
  for (const [mx, mz, mr] of [[-0.7, -0.15, 0.6], [0, -0.38, 0], [0.7, -0.15, -0.6]]) {
    LB.box(0.62, 0.9, 0.05, DARK, mx, 0.92, mz, mr, undefined, MC);
    LB.box(0.52, 0.8, 0.02, 0xc9d6d0, mx + Math.sin(mr) * 0.035, 0.97, mz + Math.cos(mr) * 0.035, mr, { emissive: 0.45 }, MC);
  }
  LB.ball(0.12, 0xb8c4c0, 0, 1.04, 0.25, 1, 1, 1, 1, { emissive: 0.25 }, MC);
  stool(27.4, 8.2);
  // models: gears in mesh, the spring-driven cart
  const MD = desk(24.4, 9.4, -0.2);
  for (const [gx0, gr, gn] of [[-0.75, 0.36, 12], [-0.14, 0.22, 8]]) {
    LB.cyl(gr, gr, 0.07, 0x8a6a3a, gx0, 0.925, 0, 12, undefined, MD);
    for (let k = 0; k < gn; k++) LB.box(0.09, 0.07, 0.1, 0x8a6a3a, gx0 + Math.cos((k / gn) * 6.283) * (gr + 0.03), 0.925, Math.sin((k / gn) * 6.283) * (gr + 0.03), -(k / gn) * 6.283, undefined, MD);
    LB.cyl(0.03, 0.03, 0.2, DARK, gx0, 0.925, 0, 5, undefined, MD);
  }
  LB.box(0.6, 0.06, 0.42, woodC, 0.65, 1.06, 0.05, 0, undefined, MD);
  for (const [wx, wz] of [[0.42, -0.22], [0.42, 0.32], [0.95, 0.05]]) LB.cyl(0.13, 0.13, 0.05, DARK, wx, 1.06, wz - 0.025, 9, undefined, MD, Math.PI / 2, 0);
  for (const sz of [-1, 1]) LB.add(new THREE.TorusGeometry(0.12, 0.018, 4, 10), 0x4a4438, MD.clone().multiply(xf(0.62, 1.13, 0.05 + sz * 0.1, 0, 1, 1, 1, Math.PI / 2, 0)));
  sheet(MD, 0.2, -0.36, 0.1, 0.5, 0.3);
  stool(25.4, 10.9);
}
