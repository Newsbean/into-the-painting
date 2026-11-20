// The church of the painting: a long buttressed nave under a steep blue roof, an apse,
// and the steeple that pierces the horizon. Its lancets are lit from inside.
//
//   church(kit, world, { x, z, ry })     local frame: the nave runs along z, the tower stands at the +z end
// Lab: /?debug&lab=worlds/starry/town/church.js
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { smooth, vnoise } from '../../../engine/gl.js';
import { at, wallBand, reveal, pane, slab } from './house.js';
import { cuboid } from './parts.js';
import { Kit, townMaterials } from './kit.js';

const GLASS = [0xffd56b, 0xff9a4a, 0xffe6a3, 0xffc861, 0xe8607a, 0xffd56b, 0x7ac8ff, 0xffb84d];
const _t = new THREE.Color();

// a triangle that is made to face away from `from`, whichever way its corners were given
function face3(S, a, b, c, col, from, o) {
  const ux = b[0] - a[0],
    uy = b[1] - a[1],
    uz = b[2] - a[2],
    vx = c[0] - a[0],
    vy = c[1] - a[1],
    vz = c[2] - a[2];
  const nx = uy * vz - uz * vy,
    ny = uz * vx - ux * vz,
    nz = ux * vy - uy * vx;
  const mx = (a[0] + b[0] + c[0]) / 3 - from[0],
    my = (a[1] + b[1] + c[1]) / 3 - from[1],
    mz = (a[2] + b[2] + c[2]) / 3 - from[2];
  if (nx * mx + ny * my + nz * mz >= 0) S.tri(a, b, c, col, o);
  else S.tri(a, c, b, col, o);
}
// a flat many-sided disc lying on a facade (clock face, oculus)
function disc(S, F, cx, cy, r, z, col, o, n = 14) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2,
      a1 = ((i + 1) / n) * Math.PI * 2;
    S.tri(at(F, cx, cy, z), at(F, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, z), at(F, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, z), col, o);
  }
}
// a pointed opening: a rectangular hole whose top corners are filled back in with wall
function lancet(wall, det, F, op, depth, wallCol, revealCol, glass, em) {
  const xm = (op.x0 + op.x1) / 2,
    yh = op.y1 - (op.x1 - op.x0) * 1.05;
  reveal(det, F, op, depth, revealCol);
  pane(det, F, op.x0, op.x1, op.y0, op.y1, -depth, glass, { em });
  wall.tri(at(F, op.x0, yh, 0.002), at(F, xm, op.y1, 0.002), at(F, op.x0, op.y1, 0.002), wallCol);
  wall.tri(at(F, op.x1, yh, 0.002), at(F, op.x1, op.y1, 0.002), at(F, xm, op.y1, 0.002), wallCol);
  // a stone mullion and a transom
  pane(det, F, xm - 0.05, xm + 0.05, op.y0, op.y1, -depth + 0.03, 0x2a2c44);
  pane(det, F, op.x0, op.x1, yh - 0.06, yh + 0.04, -depth + 0.03, 0x2a2c44);
}

export function church(kit, world, o) {
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, gy, o.z, o.ry ?? 0);
  const toWorld = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const wall = kit.s('ashlar').set(M).warp(null);
  const roof = kit.s('slate').set(M).warp(null);
  const det = kit.s('detail').set(M).warp(null);

  const stone = new THREE.Color(o.stone ?? 0xc3c8de);
  const wallCol = (x, y, z) => _t.copy(stone).multiplyScalar((0.74 + 0.26 * smooth(-0.5, 4, y)) * (0.9 + 0.2 * vnoise(x * 0.4 + z * 0.3, y * 0.3)));
  const revealCol = stone.clone().multiplyScalar(0.55);
  const trim = stone.clone().lerp(new THREE.Color(0xffffff), 0.35);
  const roofC = new THREE.Color(o.roof ?? 0x2a44a0);
  const roofCol = (x, y, z) => _t.copy(roofC).multiplyScalar(0.85 + 0.3 * vnoise(x * 0.3 + y * 0.2, z * 0.3));
  const spireC = new THREE.Color(o.spire ?? 0x21347e);
  const spireCol = (x, y, z) => _t.copy(spireC).multiplyScalar(0.8 + 0.4 * vnoise(x * 0.5 + z * 0.5, y * 0.25));
  const glass = (x, y, z) => _t.set(GLASS[Math.abs(Math.floor(y * 1.9 + x * 1.3 + z * 1.3)) % GLASS.length]);
  const BASE = -1.6;

  // ---------------------------------------------------------------- nave
  const hw = 4.8,
    zA = -13,
    zB = 5,
    L = zB - zA,
    hN = 9.5;
  const sides = [
    { o: [-hw, 0, zA], u: [0, 0, 1], n: [-1, 0, 0], W: L },
    { o: [hw, 0, zB], u: [0, 0, -1], n: [1, 0, 0], W: L },
  ];
  for (const F of sides) {
    const ops = [];
    for (let i = 0; i < 4; i++) {
      const c = 2.5 + i * 4.35;
      ops.push({ x0: c - 0.52, x1: c + 0.52, y0: 3.0, y1: 7.7 });
    }
    wallBand(wall, F, BASE, hN, ops, wallCol);
    for (const op of ops) lancet(wall, det, F, op, 0.32, wallCol, revealCol, glass, 1);
    // buttresses with weathered caps
    for (let i = 0; i <= 4; i++) {
      const c = Math.min(L - 0.42, Math.max(0.42, 0.32 + i * 4.35));
      slab(wall, F, c - 0.4, c + 0.4, BASE, 6.1, 0, 0.95, wallCol, undefined, 'kb');
      wall.quad(at(F, c - 0.4, 6.1, 0.95), at(F, c + 0.4, 6.1, 0.95), at(F, c + 0.4, 7.4, 0), at(F, c - 0.4, 7.4, 0), trim);
      wall.tri(at(F, c - 0.4, 6.1, 0), at(F, c - 0.4, 6.1, 0.95), at(F, c - 0.4, 7.4, 0), wallCol);
      wall.tri(at(F, c + 0.4, 6.1, 0.95), at(F, c + 0.4, 6.1, 0), at(F, c + 0.4, 7.4, 0), wallCol);
    }
    slab(det, F, 0, L, BASE, 0.75, 0, 0.13, revealCol.clone().multiplyScalar(1.25), undefined, 'kb');
    slab(det, F, -0.1, L + 0.1, hN - 0.34, hN, 0, 0.28, trim, undefined, 'k');
  }
  // the two gable ends
  const run = hw + 0.55,
    ridge = hN + run * Math.tan(0.91);
  const ends = [
    { o: [hw, 0, zA], u: [-1, 0, 0], n: [0, 0, -1], W: hw * 2 },
    { o: [-hw, 0, zB], u: [1, 0, 0], n: [0, 0, 1], W: hw * 2 },
  ];
  for (const F of ends) {
    wallBand(wall, F, BASE, hN, [], wallCol);
    wall.tri(at(F, 0, hN), at(F, F.W, hN), at(F, hw, ridge - 0.06), wallCol);
  }
  // the roof, a ridge board, and the eaves' edge
  roof.quad([-run, hN, zA - 0.4], [-run, hN, zB], [0, ridge, zB], [0, ridge, zA - 0.4], roofCol);
  roof.quad([run, hN, zB], [run, hN, zA - 0.4], [0, ridge, zA - 0.4], [0, ridge, zB], roofCol);
  cuboid(roof, [-0.16, ridge - 0.05, zA - 0.4], [0.16, ridge + 0.14, zB], (x, y, z) => _t.copy(roofC).multiplyScalar(1.25), undefined, 'b');
  for (const sx of [-1, 1]) {
    const a = [sx * run, hN - 0.2, zA - 0.4],
      b = [sx * run, hN - 0.2, zB],
      c = [sx * run, hN, zB],
      d = [sx * run, hN, zA - 0.4];
    if (sx < 0) roof.quad(a, b, c, d, roofC.clone().multiplyScalar(0.5));
    else roof.quad(b, a, d, c, roofC.clone().multiplyScalar(0.5));
  }
  // west verge
  face3(roof, [-run, hN, zA - 0.4], [0, ridge, zA - 0.4], [0, ridge - 0.2, zA - 0.4], roofC.clone().multiplyScalar(0.5), [0, hN, 0]);

  // ---------------------------------------------------------------- apse
  {
    const Ra = 4.15,
      hA = 7.3,
      n = 5;
    const P = [];
    for (let k = 0; k <= n; k++) {
      const th = Math.PI + (k / n) * Math.PI;
      P.push([Ra * Math.cos(th), zA + Ra * Math.sin(th)]);
    }
    const apex = [0, hA + 4.4, zA + 0.2];
    for (let k = 0; k < n; k++) {
      const a = P[k + 1],
        b = P[k];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const u = [(b[0] - a[0]) / len, 0, (b[1] - a[1]) / len];
      const F = { o: [a[0], 0, a[1]], u, n: [-u[2], 0, u[0]], W: len }; // outward normal: u x up
      const op = { x0: len / 2 - 0.4, x1: len / 2 + 0.4, y0: 2.6, y1: 5.9 };
      const lit = k >= 1 && k <= 3;
      wallBand(wall, F, BASE, hA, lit ? [op] : [], wallCol);
      if (lit) lancet(wall, det, F, op, 0.3, wallCol, revealCol, glass, 1);
      slab(det, F, -0.05, len + 0.05, hA - 0.26, hA, 0, 0.2, trim, undefined, 'k');
      face3(roof, [P[k][0] * 1.08, hA, zA + (P[k][1] - zA) * 1.08], [P[k + 1][0] * 1.08, hA, zA + (P[k + 1][1] - zA) * 1.08], apex, roofCol, [0, hA - 3, zA]);
    }
  }

  // ---------------------------------------------------------------- tower
  const s = 2.8,
    tz = zB + s,
    hT = 21;
  const TF = [
    { o: [-s, 0, tz + s], u: [1, 0, 0], n: [0, 0, 1], W: s * 2, front: true },
    { o: [s, 0, tz - s], u: [-1, 0, 0], n: [0, 0, -1], W: s * 2, back: true },
    { o: [-s, 0, tz - s], u: [0, 0, 1], n: [-1, 0, 0], W: s * 2 },
    { o: [s, 0, tz + s], u: [0, 0, -1], n: [1, 0, 0], W: s * 2 },
  ];
  for (const F of TF) {
    // portal stage
    const A = [];
    if (F.front) A.push({ x0: s - 1.1, x1: s + 1.1, y0: 0.25, y1: 4.7, portal: true });
    else if (!F.back) A.push({ x0: s - 0.25, x1: s + 0.25, y0: 3.4, y1: 5.4 });
    wallBand(wall, F, BASE, 7.5, A, wallCol);
    for (const op of A) {
      if (op.portal) {
        const xm = s,
          yh = op.y1 - 2.2 * 0.6;
        reveal(det, F, op, 0.5, revealCol);
        pane(det, F, op.x0, op.x1, op.y0, yh - 0.1, -0.5, 0x4a2c1c);
        pane(det, F, op.x0, op.x1, yh - 0.1, op.y1, -0.5, glass, { em: 1 });
        pane(det, F, xm - 0.03, xm + 0.03, op.y0, yh - 0.1, -0.48, 0x1c120c);
        for (const hx of [-0.7, 0.7]) pane(det, F, xm + hx - 0.3, xm + hx + 0.3, op.y0 + 0.5, yh - 0.6, -0.48, 0x5c3a24);
        wall.tri(at(F, op.x0, yh, 0.002), at(F, xm, op.y1, 0.002), at(F, op.x0, op.y1, 0.002), wallCol);
        wall.tri(at(F, op.x1, yh, 0.002), at(F, op.x1, op.y1, 0.002), at(F, xm, op.y1, 0.002), wallCol);
        // the surround and two steps
        slab(det, F, op.x0 - 0.4, op.x0, 0, op.y1 - 1.0, 0, 0.16, trim, undefined, 'k');
        slab(det, F, op.x1, op.x1 + 0.4, 0, op.y1 - 1.0, 0, 0.16, trim, undefined, 'k');
        slab(det, F, op.x0 - 0.9, op.x1 + 0.9, BASE, 0.25, 0, 1.3, trim, undefined, 'kb');
        slab(det, F, op.x0 - 1.4, op.x1 + 1.4, BASE, 0.08, 0, 1.9, revealCol.clone().multiplyScalar(1.5), undefined, 'kb');
        // an oculus over the door
        disc(det, F, s, 6.1, 0.74, 0.03, trim);
        disc(det, F, s, 6.1, 0.56, 0.05, glass, { em: 1 });
      } else {
        reveal(det, F, op, 0.3, revealCol);
        pane(det, F, op.x0, op.x1, op.y0, op.y1, -0.3, 0x1a2444);
      }
    }
    // clock stage
    const Bops = F.back ? [] : [{ x0: s - 0.22, x1: s + 0.22, y0: 8.4, y1: 10.2 }];
    wallBand(wall, F, 7.5, 14, Bops, wallCol);
    for (const op of Bops) {
      reveal(det, F, op, 0.3, revealCol);
      pane(det, F, op.x0, op.x1, op.y0, op.y1, -0.3, 0x1a2444);
    }
    if (!F.back) {
      disc(det, F, s, 12.1, 1.34, 0.04, 0x2a2c44);
      disc(det, F, s, 12.1, 1.16, 0.06, 0xfff0c8, { em: 0.85 });
      // ten past ten
      const hand = (ang, len, wd) => {
        const dx = Math.sin(ang),
          dy = Math.cos(ang);
        det.quad(at(F, s - dy * wd, 12.1 + dx * wd, 0.08), at(F, s + dy * wd, 12.1 - dx * wd, 0.08), at(F, s + dy * wd + dx * len, 12.1 - dx * wd + dy * len, 0.08), at(F, s - dy * wd + dx * len, 12.1 + dx * wd + dy * len, 0.08), 0x16182a);
      };
      hand(-1.05, 0.62, 0.05);
      hand(1.05, 0.92, 0.035);
    }
    // belfry: two tall louvred openings a side, a dim glow behind the slats
    const C = [
      { x0: 0.75, x1: 2.25, y0: 15.1, y1: 19.7 },
      { x0: 3.35, x1: 4.85, y0: 15.1, y1: 19.7 },
    ];
    wallBand(wall, F, 14, hT, C, wallCol);
    for (const op of C) {
      const xm = (op.x0 + op.x1) / 2,
        yh = op.y1 - 1.5 * 0.8;
      reveal(det, F, op, 0.4, revealCol);
      pane(det, F, op.x0, op.x1, op.y0, op.y1, -0.4, 0x9a6a2e, { em: 0.5 });
      for (let y = op.y0 + 0.3; y < op.y1 - 0.2; y += 0.52) det.quad(at(F, op.x0, y, -0.34), at(F, op.x1, y, -0.34), at(F, op.x1, y + 0.3, -0.12), at(F, op.x0, y + 0.3, -0.12), 0x1c2038);
      wall.tri(at(F, op.x0, yh, 0.002), at(F, xm, op.y1, 0.002), at(F, op.x0, op.y1, 0.002), wallCol);
      wall.tri(at(F, op.x1, yh, 0.002), at(F, op.x1, op.y1, 0.002), at(F, xm, op.y1, 0.002), wallCol);
    }
    // string courses and the cornice
    slab(det, F, -0.12, F.W + 0.12, 7.35, 7.65, 0, 0.16, trim, undefined, 'k');
    slab(det, F, -0.12, F.W + 0.12, 13.85, 14.15, 0, 0.16, trim, undefined, 'k');
    slab(det, F, -0.2, F.W + 0.2, hT - 0.45, hT - 0.15, 0, 0.2, trim, undefined, 'k');
    slab(det, F, -0.34, F.W + 0.34, hT - 0.15, hT + 0.12, 0, 0.36, trim, undefined, 'k');
    slab(det, F, 0, F.W, BASE, 0.85, 0, 0.14, revealCol.clone().multiplyScalar(1.25), undefined, 'kb');
  }
  // the spire: eight slate faces to a point, a pinnacle at each corner
  const hS = 45,
    h0 = hT + 0.12,
    b = s + 0.18,
    c8 = b * Math.tan(Math.PI / 8);
  const oct = [
    [c8, -b],
    [b, -c8],
    [b, c8],
    [c8, b],
    [-c8, b],
    [-b, c8],
    [-b, -c8],
    [-c8, -b],
  ].map(([x, z]) => [x, h0, tz + z]);
  const tip = [0, hS, tz];
  for (let i = 0; i < 8; i++) face3(roof, oct[i], oct[(i + 1) % 8], tip, spireCol, [0, h0, tz]);
  roof.quad([-b, h0, tz - b], [-b, h0, tz + b], [b, h0, tz + b], [b, h0, tz - b], spireC.clone().multiplyScalar(0.6));
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const cx = sx * (b - 0.55),
      cz = tz + sz * (b - 0.55),
      r = 0.55,
      top = [cx, h0 + 3.6, cz];
    const q = [
      [cx - r, h0, cz - r],
      [cx + r, h0, cz - r],
      [cx + r, h0, cz + r],
      [cx - r, h0, cz + r],
    ];
    for (let i = 0; i < 4; i++) face3(roof, q[i], q[(i + 1) % 4], top, spireCol, [cx, h0, cz]);
  }
  // the cross
  cuboid(det, [-0.06, hS - 0.2, tz - 0.06], [0.06, hS + 1.5, tz + 0.06], 0x16182a, undefined, '');
  cuboid(det, [-0.45, hS + 0.8, tz - 0.05], [0.45, hS + 0.92, tz + 0.05], 0x16182a, undefined, '');

  wall.set(null);
  roof.set(null);
  det.set(null);

  // light: the star on the spire, the clock, the porch
  const star = toWorld(0, hS + 1.2, tz),
    clock = toWorld(0, 12.1, tz + s + 0.4),
    porch = toWorld(0, 0, tz + s + 5);
  world.glows?.push({ p: [star.x, star.y, star.z], c: 0xfff3c4, size: 3.2 });
  world.glows?.push({ p: [clock.x, clock.y, clock.z], c: 0xffd56b, size: 3.4 });
  world.maps?.lamp(porch.x, porch.z, 12, 0xffd08a, 0.8);
  const nave = toWorld(0, 0, (zA + zB) / 2 - 2),
    tower = toWorld(0, 0, tz);
  world.colliders.push({ x: nave.x, z: nave.z, hw: hw + 1, hd: L / 2 + 3, ry: o.ry ?? 0, top: gy + ridge });
  world.colliders.push({ x: tower.x, z: tower.z, hw: s + 0.2, hd: s + 0.2, ry: o.ry ?? 0, top: gy + hS });
  world.maps?.blob(nave.x, nave.z, 13, 0.4);
  return { top: gy + hS, spire: [star.x, star.y, star.z] };
}

export function lab(world) {
  const kit = new Kit(townMaterials(world.ctx.strokes));
  church(kit, world, { x: 0, z: 0, ry: 0 });
  const { base, detail } = kit.build();
  world.scene.add(base, detail);
  return {
    focus: [0, 12, 2],
    dist: 52,
    views: [
      { yaw: -32, pitch: 6, dist: 52, focus: [0, 13, 2], fov: 55 },
      { yaw: 0, pitch: 2, dist: 21, focus: [0, 6.5, 8], fov: 58 },
      { yaw: 110, pitch: 8, dist: 40, focus: [0, 9, -4], fov: 55 },
      { yaw: 205, pitch: 30, dist: 60, focus: [0, 10, 0], fov: 50 },
    ],
  };
}
