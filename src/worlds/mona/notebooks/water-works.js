import * as THREE from 'three';
import { Builder, gridGeo, mix, xf } from '../../../engine/build.js';
import { vnoise, lerp } from '../../../engine/gl.js';
import { rod, beam, person, _UP } from '../helpers.js';
import { TIMBER, DARK, stoneC, woodC } from '../palette.js';
import { RIV, canalP } from './layout.js';

// ================= water works below the bridge: Archimedes' screw lifts the river into a canal, a lock
// with his mitre gates lets it down again, and a bridge of nothing but leaning logs crosses the tail race
export function buildWaterWorks(world, kit) {
  const { S, maps, soft, C, PL, LB, LP, WQ, toW } = kit;
  const th = Math.atan2(-RIV.uz, RIV.ux);
  const M = xf(62, 0, -120, th); // local x = downstream, z = inland
  const yL = 3.25,
    yU = 4.35,
    zc = 24;
  const W3 = (s, y, d) => {
    const p = canalP(s, d);
    return [p[0], y, p[1]];
  };
  const reach = (s0, s1, yw, top, hw = 1.5) => {
    const sm = (s0 + s1) / 2,
      len = s1 - s0;
    LB.box(len, yw - 0.04 - 2, hw * 2, 0x4a4a3a, sm, 2, zc, 0, undefined, M);
    for (const s of [-1, 1]) LB.box(len, top - 2.2, 0.55, stoneC, sm, 2.2, zc + s * (hw + 0.275), 0, undefined, M);
    WQ.quad(W3(s0, yw, zc - hw), W3(s0, yw, zc + hw), W3(s1, yw, zc + hw), W3(s1, yw, zc - hw), 0xffffff);
  };
  reach(10.5, 16, yU, yU + 0.35, 2.8);
  LB.box(0.55, yU + 0.35 - 2.2, 6.7, stoneC, 10.225, 2.2, zc, 0, undefined, M);
  for (const s of [-1, 1]) LB.box(0.55, yU + 0.35 - 2.2, 1.85, stoneC, 16.275, 2.2, zc + s * 2.425, 0, undefined, M);
  reach(16, 34, yU, yU + 0.35);
  reach(34, 43, yL, yU + 0.6);
  for (const s of [-1, 1]) LB.box(9.5, 0.14, 0.8, 0xc9bc9a, 38.5, yU + 0.6, zc + s * 1.775, 0, undefined, M);
  reach(43, 63, yL, yL + 0.3);
  // mitre gates: two leaves meeting in a point against the higher water, each swung by its balance beam
  const gate = (sg) => {
    for (const s of [-1, 1]) {
      const hx = sg,
        hz = zc + s * 1.5,
        dx = -1,
        dz = -s * 1.5,
        len = Math.hypot(dx, dz);
      // leaf, heel post and beam all stand clear above the coping of the chamber walls
      LB.box(len + 0.1, yU + 0.78 - (yL - 0.5), 0.2, woodC, hx + dx / 2, yL - 0.5, hz + dz / 2, Math.atan2(-dz, dx), undefined, M);
      beam(LB, [hx + dx, yU + 0.93, hz + dz], [hx - (dx / len) * 3.6, yU + 0.93, hz - (dz / len) * 3.6], 0.28, 0.28, DARK, undefined, M);
      LB.cyl(0.14, 0.14, yU + 1.1 - 2.4, DARK, hx, 2.4, hz, 6, undefined, M);
    }
  };
  gate(34.3);
  gate(43);
  // the tail race turns back to the river and spills down the bank
  {
    const a = [63, 24],
      b = [68.5, 18.5];
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz),
      ry = Math.atan2(-dz, dx),
      nx = -dz / len,
      nz = dx / len;
    const mx = (a[0] + b[0]) / 2,
      mz = (a[1] + b[1]) / 2;
    LB.box(len, yL - 0.04 - 1.4, 3, 0x4a4a3a, mx, 1.4, mz, ry, undefined, M);
    for (const s of [-1, 1]) LB.box(len + 0.6, yL + 0.3 - 1.4, 0.55, stoneC, mx + s * nx * 1.775, 1.4, mz + s * nz * 1.775, ry, undefined, M);
    WQ.quad(W3(a[0] - nx * 1.5, yL, a[1] - nz * 1.5), W3(a[0] + nx * 1.5, yL, a[1] + nz * 1.5), W3(b[0] + nx * 1.5, yL, b[1] + nz * 1.5), W3(b[0] - nx * 1.5, yL, b[1] - nz * 1.5), 0xffffff);
    for (const s of [-1, 1]) LB.cyl(0.62, 0.62, yL + 0.45 - 2.2, stoneC, 63, 2.2, zc + s * 1.9, 8, undefined, M);
    beam(LB, [68.3, yL - 0.26, 18.7], [71.9, 0.3, 15.1], 3.6, 0.4, stoneC, undefined, M);
    WQ.quad(W3(68.5 - nx * 1.3, yL, 18.5 - nz * 1.3), W3(68.5 + nx * 1.3, yL, 18.5 + nz * 1.3), W3(71.7 + nx * 1.3, 0.66, 15.3 + nz * 1.3), W3(71.7 - nx * 1.3, 0.66, 15.3 - nz * 1.3), 0xffffff);
  }
  const cA = canalP(26.5, zc),
    cB = canalP(13.25, zc);
  C.push({ x: cA[0], z: cA[1], hw: 16.8, hd: 2.15, ry: th, top: yU + 0.6 });
  C.push({ x: cB[0], z: cB[1], hw: 3.1, hd: 3.5, ry: th, top: yU + 0.4 });
  for (const s of [14, 24, 34, 44, 54]) maps.blob(...canalP(s, zc), 5, 0.25);

  // Archimedes' screw, turned by hand
  const foot = toW(M, 13.2, 0.1, 11.2),
    head = toW(M, 13.2, yU + 0.95, 20.9);
  const axis = head.clone().sub(foot),
    L = axis.length();
  const SB = new Builder();
  SB.cyl(0.13, 0.13, L + 0.8, woodC, 0, -0.2, 0, 6);
  SB.parts.push(
    gridGeo(
      88,
      1,
      (u, v) => [Math.cos(u * 11 * 6.2832) * lerp(0.13, 0.6, v), 0.3 + u * (L - 0.6), Math.sin(u * 11 * 6.2832) * lerp(0.13, 0.6, v)],
      (u, v, i) => mix(0x8e6c40, 0x5e4428, (i % 8) / 8)
    )
  );
  for (const y of [0.3, L * 0.5, L - 0.3]) SB.add(new THREE.TorusGeometry(0.6, 0.035, 4, 12), DARK, xf(0, y, 0, 0, 1, 1, 1, Math.PI / 2));
  for (let k = 0; k < 4; k++) SB.box(0.05, L - 0.6, 0.05, DARK, Math.cos(k * 1.5708) * 0.6, 0.3, Math.sin(k * 1.5708) * 0.6);
  SB.box(0.9, 0.08, 0.08, DARK, 0.4, L + 0.5, 0);
  SB.box(0.08, 0.5, 0.08, DARK, 0.85, L + 0.5, 0);
  world.waterScrew = SB.mesh(soft({ objSpace: 1, scale: 0.8, side: THREE.DoubleSide }));
  const sg = new THREE.Group();
  sg.position.copy(foot);
  sg.quaternion.setFromUnitVectors(_UP, axis.normalize());
  sg.add(world.waterScrew);
  S.add(sg);
  const post = (a, b, r = 0.08) => rod(LB, a, b, r, woodC, 4, r, undefined, M);
  post([12.4, 2.5, 20.9], [12.85, yU + 0.75, 20.9]);
  post([14.0, 2.5, 20.9], [13.55, yU + 0.75, 20.9]);
  post([12.7, yU + 0.3, 20.9], [13.7, yU + 0.3, 20.9]);
  post([12.3, 0.7, 16], [12.95, 2.45, 16]);
  post([14.1, 0.7, 16], [13.45, 2.45, 16]);
  post([12.8, 2.05, 16], [13.6, 2.05, 16]);
  post([12.5, -1.6, 11.6], [12.5, 1.2, 11.6], 0.1);
  post([13.9, -1.6, 11.6], [13.9, 1.2, 11.6], 0.1);
  beam(LB, [13.2, yU + 0.72, 20.7], [13.2, yU + 0.45, 21.7], 0.5, 0.08, TIMBER, undefined, M);
  person(LP, M.clone().multiply(xf(14.3, yU + 0.35, 21, -Math.PI / 2)), { robe: 0x5a4a2a, hands: [[-0.1, 0.3, 0.45], [0.1, 0.2, 0.45]] });

  // the self-supporting bridge
  // both feet on level ground either side of the tail race
  const s0 = 52,
    d0 = 20.4,
    d1 = 28,
    yg = 2.95,
    n = 6;
  const node = (k) => [d0 + ((d1 - d0) * k) / n, yg + 1.9 * Math.sin((Math.PI * k) / n)];
  const logC = (x, y, z) => mix(0x6a4e2e, 0x94744a, vnoise(y * 1.5, x * 4 + z * 4));
  for (let k = 0; k <= n - 2; k++) {
    const a = node(k),
      b = node(k + 2),
      off = k & 1 ? 0.8 : 1.15;
    const ad = a[0] - (b[0] - a[0]) * 0.12,
      ay = a[1] - (b[1] - a[1]) * 0.12,
      bd = b[0] + (b[0] - a[0]) * 0.12,
      by = b[1] + (b[1] - a[1]) * 0.12;
    for (const s of [-1, 1]) rod(LB, [s0 + s * off, ay + 0.14, ad], [s0 + s * off, by + 0.14, bd], 0.15, logC, 6, 0.14, undefined, M, true);
  }
  for (let k = 0; k <= n; k++) {
    const p = node(k),
      y = p[1] + (k % 2 ? 0.42 : -0.12);
    rod(LB, [s0 - 1.7, y, p[0]], [s0 + 1.7, y, p[0]], 0.15, logC, 6, 0.15, undefined, M, true);
  }
  for (let k = 0; k < n; k++) {
    const a = node(k),
      b = node(k + 1),
      p = canalP(s0, (a[0] + b[0]) / 2);
    beam(LB, [s0, a[1] + 0.27, a[0]], [s0, b[1] + 0.27, b[0]], 1.5, 0.06, 0x86683e, undefined, M);
    PL.push({ minx: p[0] - 1.3, maxx: p[0] + 1.3, minz: p[1] - 1.3, maxz: p[1] + 1.3, y: (a[1] + b[1]) / 2 + 0.3 });
  }
}

export function tickWaterWorks(world, time) {
  world.waterScrew.rotation.y = time * 1.6;
}
