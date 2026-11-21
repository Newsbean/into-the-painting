// What stands on a Norwegian hill farm and along its shore, built with the Kristiania kit
// (the dwelling house itself is kristiania/house.js's townHouse, in boards).
//
//   barn(kit, world, { x, z, ry, w, d, R })     the låve: a byre of stone under a red hayloft,
//                                                a bridge up to its great door on the uphill side
//   stabbur(kit, world, { x, z, ry, R, bell })  the storehouse on its stone legs, the loft
//                                                jutting out over the room below; with a bell on the big farm
//   naust(kit, world, { x, z, ry, R })          a boathouse on a stone landing, a slip of logs, a boat drawn up
//   skigard(S, pts, H)                          the fence of leaning split rails, along a line of [x, z]
//   hesje(S, x, z, ry, L, H, R)                 hay hung to dry on a rack, L metres long
//   cart(S, M, { hay, up })                     a two-wheeled cart, its shafts on the ground (or up, in harness)
//   rowboat(S, M, colour)                       a small open boat, bow towards +x
//
// The front of a building is local +z: downhill, towards the fjord. kit is a KristianiaKit;
// S is a Soup with no matrix set.
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { at, wallBand, reveal, pane, slab, cuboid, partMatrix } from '../../../engine/facade.js';
import { vnoise } from '../../../engine/gl.js';
import { KR } from '../kristiania/kit.js';
import { sides, open, shut, warehouse } from '../../../engine/townhouse.js';

const pick = (R, a) => a[(R() * a.length) | 0];
const _t = new THREE.Color();
const _c2 = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const sat = (x) => Math.min(1, Math.max(0, x));
const RAIL = 0x4a443e, // split rails gone grey in the weather
  STAKE = 0x3a3430,
  TAR = 0x3a2a22; // tarred logs

function rod(S, a, b, r0, r1, col, seg = 4, o, M) {
  const va = new THREE.Vector3(...a),
    vb = new THREE.Vector3(...b),
    d = vb.clone().sub(va),
    L = d.length() || 0.001;
  const m = new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_up, d.normalize()), new THREE.Vector3(1, 1, 1));
  S.add(new THREE.CylinderGeometry(r1, r0, L, seg, 1, true), col, M ? M.clone().multiply(m) : m, o);
}
const stoneCol = (seed) => (x, y, z) => _t.set(KR.STONE).multiplyScalar(0.58 + 0.42 * vnoise(x * 1.1 + z * 0.9 + seed, y * 1.3));

// ---------------------------------------------------------------- the barn
export function barn(kit, world, o) {
  const R = o.R,
    w = o.w ?? 14,
    d = o.d ?? 8.5;
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, gy, o.z, o.ry ?? 0);
  const s = open(kit, M);
  const F = sides(w, d),
    zf = d / 2,
    foot = o.foot ?? -3.6,
    byre = 2.3,
    hW = byre + (o.h ?? 3.3),
    over = 0.5,
    rise = (d / 2 + over) * 0.8;
  const wc = new THREE.Color(o.wall ?? pick(R, [0x7a2a24, 0x8a3226, 0x6f2a22, 0x7f3a2a]));
  const seed = o.x * 0.31 + o.z * 0.57;
  const wallCol = (x, y, z) => _t.copy(wc).multiplyScalar((0.74 + 0.26 * sat((y - byre) / 3)) * (0.84 + 0.32 * vnoise(x * 0.5 + z * 0.4 + seed, y * 0.4 + seed)));
  const stone = stoneCol(seed);
  const roofC = new THREE.Color(o.roof ?? pick(R, KR.ROOF));
  const roofCol = (x, y, z) => _t.copy(roofC).multiplyScalar(0.8 + 0.4 * vnoise(x * 0.5 + seed, z * 0.6 + y * 0.4));
  const doorC = wc.clone().multiplyScalar(0.6);
  const lamp = (op, lit) => {
    const on = R() < lit;
    reveal(s.detail, F.front, op, 0.16, 0x2a2430);
    pane(s.detail, F.front, op.x0, op.x1, op.y0, op.y1, -0.16, on ? pick(R, KR.LIT) : KR.DARK, { em: on ? 0.8 : 0 });
    for (const [a, b, c, e] of [[op.x0 - 0.07, op.x1 + 0.07, op.y1, op.y1 + 0.08], [op.x0 - 0.07, op.x1 + 0.07, op.y0 - 0.08, op.y0]]) pane(s.detail, F.front, a, b, c, e, 0.03, KR.TRIM);
    return on;
  };
  // the byre: stone, with a door and a row of small windows looking downhill; the stone
  // goes on down wherever the hill falls away
  const fops = [{ x0: 1.5, x1: 2.7, y0: 0.05, y1: 1.95, kind: 'door' }];
  for (let x = 4.3; x < w - 1.3; x += 2.4) fops.push({ x0: x, x1: x + 0.8, y0: 1.05, y1: 1.7 });
  wallBand(s.stone, F.front, 0, byre, fops, stone);
  wallBand(s.stone, F.front, foot, 0, [], stone);
  for (const op of fops) {
    if (op.kind === 'door') {
      reveal(s.detail, F.front, op, 0.16, 0x2a2430);
      kit.place('gate', partMatrix(M, F.front, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), doorC);
    } else if (lamp(op, 0.35)) {
      const q = new THREE.Vector3(-w / 2 + (op.x0 + op.x1) / 2, 0, zf + 1.5).applyMatrix4(M);
      world.maps?.lamp(q.x, q.z, 3, 0xffb860, 0.35);
    }
  }
  for (const k of ['back', 'left', 'right']) wallBand(s.stone, F[k], foot, byre, [], stone);
  // the hayloft: boards painted red, white at the corners, a hatch or two for air
  const hatch = [{ x0: w * 0.3 - 0.45, x1: w * 0.3 + 0.45, y0: byre + 1.2, y1: byre + 2.1 }, { x0: w * 0.72 - 0.45, x1: w * 0.72 + 0.45, y0: byre + 1.2, y1: byre + 2.1 }];
  wallBand(s.boards, F.front, byre, hW, hatch, wallCol);
  for (const op of hatch) {
    pane(s.boards, F.front, op.x0, op.x1, op.y0, op.y1, -0.06, doorC);
    for (const [a, b, c, e] of [[op.x0 - 0.08, op.x0, op.y0, op.y1], [op.x1, op.x1 + 0.08, op.y0, op.y1], [op.x0 - 0.08, op.x1 + 0.08, op.y1, op.y1 + 0.08], [op.x0 - 0.08, op.x1 + 0.08, op.y0 - 0.08, op.y0]]) pane(s.detail, F.front, a, b, c, e, 0.03, KR.TRIM);
  }
  // the great door is on the uphill side, where the bridge comes in
  const gx = w * 0.42,
    gate = { x0: gx - 1.5, x1: gx + 1.5, y0: byre + 0.02, y1: byre + 2.9 };
  wallBand(s.boards, F.back, byre, hW, [gate], wallCol);
  reveal(s.detail, F.back, gate, 0.12, 0x2a2430);
  kit.place('gate', partMatrix(M, F.back, gate.x0, gate.y0, 3, gate.y1 - gate.y0), doorC);
  for (const [a, b, c, e] of [[gate.x0 - 0.14, gate.x0, gate.y0, gate.y1], [gate.x1, gate.x1 + 0.14, gate.y0, gate.y1], [gate.x0 - 0.14, gate.x1 + 0.14, gate.y1, gate.y1 + 0.14]]) pane(s.detail, F.back, a, b, c, e, 0.04, KR.TRIM);
  for (const k of ['front', 'back']) for (const x of [0, F[k].W - 0.18]) slab(s.detail, F[k], x, x + 0.18, byre, hW, 0, 0.05, KR.TRIM, undefined, 'kb');
  slab(s.detail, F.front, 0, w, byre - 0.07, byre + 0.07, 0, 0.07, wc.clone().multiplyScalar(0.55), undefined, 'k');
  // the gables: a loft door under the ridge at one end, with its hoist
  for (const k of ['left', 'right']) {
    wallBand(s.boards, F[k], byre, hW, [], wallCol);
    s.boards.tri(at(F[k], -over * 0.2, hW), at(F[k], d + over * 0.2, hW), at(F[k], d / 2, hW + rise - 0.06), wallCol);
    if (k === 'right') {
      pane(s.boards, F[k], d / 2 - 0.6, d / 2 + 0.6, hW + 0.15, hW + 1.55, 0.02, doorC);
      kit.place('hoist', partMatrix(M, F[k], d / 2, hW + rise - 0.8, 1, 1), 0xffffff);
    } else pane(s.detail, F[k], d / 2 - 0.35, d / 2 + 0.35, hW + 0.4, hW + 1.2, 0.02, KR.DARK);
  }
  const ex = w / 2 + 0.4,
    ez = zf + over;
  s.roof.facing([0, hW - 30, 0]);
  for (const sz of [-1, 1]) s.roof.quad([-ex, hW, sz * ez], [ex, hW, sz * ez], [ex, hW + rise, 0], [-ex, hW + rise, 0], roofCol);
  s.roof.facing(null);
  cuboid(s.roof, [-ex, hW + rise - 0.04, -0.15], [ex, hW + rise + 0.1, 0.15], roofC.clone().multiplyScalar(0.7), undefined, 'b');
  // the bridge: a bank of stone and earth, planked on top
  const bx = w / 2 - gx, // the gate's middle, in the barn's own x
    bl = o.bridge ?? 6.5,
    y1 = 0.2;
  s.stone.facing([bx, -9, -zf - bl / 2]);
  for (const sx of [-1, 1]) s.stone.quad([bx + sx * 1.9, foot, -zf], [bx + sx * 1.9, byre, -zf], [bx + sx * 1.9, y1, -zf - bl], [bx + sx * 1.9, foot, -zf - bl], stone);
  s.stone.quad([bx - 1.9, foot, -zf - bl], [bx + 1.9, foot, -zf - bl], [bx + 1.9, y1, -zf - bl], [bx - 1.9, y1, -zf - bl], stone);
  s.stone.facing(null);
  s.boards.facing([bx, -30, -zf - bl / 2]);
  s.boards.quad([bx - 1.9, byre, -zf], [bx + 1.9, byre, -zf], [bx + 1.9, y1, -zf - bl], [bx - 1.9, y1, -zf - bl], (x, y, z) => _t.set(0x6a5438).multiplyScalar(0.7 + 0.5 * vnoise(x * 2, z * 6)));
  s.boards.facing(null);
  shut(s);
  return { top: hW + rise, hW, ridge: hW + rise, w, d };
}

// ---------------------------------------------------------------- the storehouse
export function stabbur(kit, world, o) {
  const R = o.R;
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, gy, o.z, o.ry ?? 0);
  const s = open(kit, M);
  const a = 3.7, // the room below
    b = 4.9, // the loft above, jutting out all round
    y0 = 0.95,
    y1 = y0 + 2.15,
    y2 = y1 + 1.85,
    rise = 2.0;
  const wc = new THREE.Color(o.wall ?? pick(R, [TAR, 0x4a3024, 0x6f2a22]));
  const seed = o.x * 0.7 + o.z * 0.3;
  const wallCol = (x, y, z) => _t.copy(wc).multiplyScalar(0.8 + 0.4 * vnoise(x * 0.4 + z * 0.3 + seed, y * 2.2));
  const stone = stoneCol(seed);
  // four legs of stone that no mouse can climb, and a frame of beams on them
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const cx = sx * (a / 2 - 0.35),
        cz = sz * (a / 2 - 0.35);
      s.stone.facing([cx, 0, cz]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const px = dz * 0.34,
          pz = dx * 0.34;
        s.stone.quad([cx + dx * 0.34 - px, o.foot ?? -2.4, cz + dz * 0.34 - pz], [cx + dx * 0.34 + px, o.foot ?? -2.4, cz + dz * 0.34 + pz], [cx + dx * 0.22 + px * 0.65, y0 - 0.16, cz + dz * 0.22 + pz * 0.65], [cx + dx * 0.22 - px * 0.65, y0 - 0.16, cz + dz * 0.22 - pz * 0.65], stone);
      }
      s.stone.facing(null);
    }
  cuboid(s.boards, [-a / 2 - 0.12, y0 - 0.16, -a / 2 - 0.12], [a / 2 + 0.12, y0, a / 2 + 0.12], TAR, undefined, '');
  // the room below: logs, a low door with iron on it
  const Fa = sides(a, a),
    Fb = sides(b, b);
  const door = { x0: a / 2 - 0.5, x1: a / 2 + 0.5, y0: y0 + 0.12, y1: y0 + 1.75 };
  wallBand(s.boards, Fa.front, y0, y1, [door], wallCol);
  reveal(s.detail, Fa.front, door, 0.12, 0x1c1814);
  kit.place('gate', partMatrix(M, Fa.front, door.x0, door.y0, 1, door.y1 - door.y0), wc.clone().multiplyScalar(0.7));
  for (const k of ['back', 'left', 'right']) wallBand(s.boards, Fa[k], y0, y1, [], wallCol);
  // the loft: wider, a carved board round its foot, one small shuttered opening
  cuboid(s.boards, [-b / 2, y1 - 0.14, -b / 2], [b / 2, y1, b / 2], wc.clone().multiplyScalar(0.6), undefined, '');
  const hole = { x0: b / 2 - 0.3, x1: b / 2 + 0.3, y0: y1 + 0.7, y1: y1 + 1.3 };
  wallBand(s.boards, Fb.front, y1, y2, [hole], wallCol);
  pane(s.detail, Fb.front, hole.x0, hole.x1, hole.y0, hole.y1, -0.05, 0x14100e);
  for (const k of ['back', 'left', 'right']) wallBand(s.boards, Fb[k], y1, y2, [], wallCol);
  for (const k of ['front', 'back', 'left', 'right']) slab(s.detail, Fb[k], 0, b, y1 - 0.02, y1 + 0.16, 0, 0.04, KR.TRIM, undefined, 'k');
  for (const k of ['front', 'back']) s.boards.tri(at(Fb[k], -0.1, y2), at(Fb[k], b + 0.1, y2), at(Fb[k], b / 2, y2 + rise - 0.05), wallCol);
  // a roof of turf, the grass on it gone to straw
  const turf = (x, y, z) => _t.set(0x4a5230).lerp(_c2.set(0x9a8a44), vnoise(x * 1.4 + seed, z * 1.4)).multiplyScalar(0.75 + 0.4 * vnoise(x * 4, z * 4 + y));
  const ex = b / 2 + 0.45,
    ez = b / 2 + 0.4;
  s.roof.facing([0, y2 - 30, 0]);
  for (const sx of [-1, 1]) s.roof.quad([sx * ex, y2 - 0.1, -ez], [sx * ex, y2 - 0.1, ez], [0, y2 + rise, ez], [0, y2 + rise, -ez], turf);
  s.roof.facing(null);
  for (const sx of [-1, 1]) cuboid(s.boards, [sx > 0 ? ex - 0.1 : -ex, y2 - 0.22, -ez], [sx > 0 ? ex : -ex + 0.1, y2 - 0.04, ez], TAR, undefined, '');
  // steps that stop short of the door
  for (let i = 0; i < 3; i++) cuboid(s.stone, [-0.7, o.foot ?? -2.4, a / 2 + 0.45 + (2 - i) * 0.34], [0.7, 0.22 + i * 0.24, a / 2 + 0.45 + (3 - i) * 0.34], stone, undefined, 'b');
  let top = y2 + rise;
  if (o.bell) {
    // the farm's bell, under a little roof of its own on the ridge
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cuboid(s.boards, [sx * 0.34 - 0.05, top - 0.3, sz * 0.34 - 0.05], [sx * 0.34 + 0.05, top + 1.0, sz * 0.34 + 0.05], KR.TRIM, undefined, 'b');
    s.roof.facing([0, top - 20, 0]);
    for (let k = 0; k < 4; k++) {
      const c0 = Math.cos((k / 4) * 6.2832 + 0.7854) * 0.72,
        s0 = Math.sin((k / 4) * 6.2832 + 0.7854) * 0.72,
        c1 = Math.cos(((k + 1) / 4) * 6.2832 + 0.7854) * 0.72,
        s1 = Math.sin(((k + 1) / 4) * 6.2832 + 0.7854) * 0.72;
      s.roof.tri([c0, top + 1.0, s0], [c1, top + 1.0, s1], [0, top + 1.75, 0], 0x2a2a34);
    }
    s.roof.facing(null);
    s.detail.add(new THREE.CylinderGeometry(0.07, 0.19, 0.28, 7), 0x8a6a2a, xf(0, top + 0.6, 0));
    top += 1.75;
  }
  shut(s);
  return { top, hW: y2, ridge: y2 + rise, w: b, d: b };
}

// ---------------------------------------------------------------- the boathouse
export function naust(kit, world, o) {
  const R = o.R,
    ry = o.ry ?? 0,
    top = 1.05;
  const M = xf(o.x, 0, o.z, ry);
  const P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const st = kit.s('stone').set(M).facing(null),
    stone = stoneCol(o.x);
  // a landing of piled stone, out into the water
  cuboid(st, [-4.6, -2.8, -7], [4.6, top, 4.2], stone, undefined, 'b');
  st.set(null);
  const c = P(0, 0, -2.4);
  const res = warehouse(kit, world, { x: c.x, z: c.z, ry, w: 5.4, d: 7.6, R, floors: 1, y: top, wall: o.wall ?? pick(R, [0x5a4a40, 0x6f2a22, 0x4a3a30, 0x7a3a2a]) });
  // the slip: two long logs down into the water, rungs across them
  const B = kit.s('boards');
  for (const sx of [-1, 1]) rod(B, [sx * 0.9, top + 0.1, 1.4], [sx * 0.9, -0.7, 10.5], 0.11, 0.1, TAR, 5, undefined, M);
  for (let z = 2.2; z < 10; z += 1.3) rod(B, [-1.2, top + 0.18 - ((z - 1.4) / 9.1) * (top + 0.8), z], [1.2, top + 0.18 - ((z - 1.4) / 9.1) * (top + 0.8), z], 0.06, 0.06, 0x5a4a3a, 4, undefined, M);
  // a boat drawn up on it
  rowboat(kit.s('detail'), M.clone().multiply(xf(0, top + 0.36 - (4.3 / 9.1) * (top + 0.8), 5.7, -Math.PI / 2, 1, 1, 1, 0, -0.19)), pick(R, [0x7a5a3a, 0x3a4a5a, 0x8a3226, 0xd9d0c0]));
  const p = P(0, 0, -1.2);
  world.colliders.push({ x: c.x, z: c.z, hw: 2.8, hd: 3.9, ry, top: top + res.top });
  (world.platforms ??= []).push({ minx: p.x - 3.4, maxx: p.x + 3.4, minz: p.z - 3.4, maxz: p.z + 3.4, y: top });
  return { top: top + res.top };
}

// ---------------------------------------------------------------- fences, hay, a cart, a boat
// The skigard: pairs of stakes, and long split rails leaning through them, each with its
// foot on the ground three stakes on.
export function skigard(S, pts, H, { step = 1.7, h = 1.15 } = {}) {
  const P = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i],
      [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
    for (let k = i ? 1 : 0; k <= n; k++) P.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  for (let i = 0; i < P.length; i++) {
    const [x, z] = P[i],
      y = H(x, z),
      a = P[Math.max(0, i - 1)],
      b = P[Math.min(P.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
      tx = (b[0] - a[0]) / l,
      tz = (b[1] - a[1]) / l;
    for (const sd of [-1, 1]) rod(S, [x - tz * 0.07 * sd, y - 0.25, z + tx * 0.07 * sd], [x - tz * 0.1 * sd + tx * 0.06 * sd, y + h + 0.2 + 0.12 * sd, z + tx * 0.1 * sd + tz * 0.06 * sd], 0.034, 0.024, STAKE, 4);
    const j = Math.min(P.length - 1, i + 3);
    if (j > i) rod(S, [x - tx * 0.3, y + h + 0.06, z - tz * 0.3], [P[j][0], H(P[j][0], P[j][1]) + 0.1, P[j][1]], 0.036, 0.03, i % 2 ? RAIL : 0x5a524a, 4);
  }
}

// Hay hung on a rack to dry: a long shaggy wall of it, the poles standing out of the top.
export function hesje(S, x, z, ry, L, H, R) {
  const cs = Math.cos(ry),
    sn = Math.sin(ry),
    n = Math.max(2, Math.round(L / 1.15));
  const prof = [[0.27, 0.3], [0.34, 0.8], [0.25, 1.36], [0.1, 1.74], [-0.1, 1.74], [-0.25, 1.36], [-0.34, 0.8], [-0.27, 0.3]];
  const rings = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n - 0.5) * L,
      px = x + cs * u,
      pz = z - sn * u,
      y = H(px, pz);
    const end = i === 0 || i === n,
      sag = 1 - 0.07 * Math.abs(Math.sin(i * 1.7)) - (end ? 0.2 : 0),
      fat = (end ? 0.55 : 1) * (0.88 + 0.24 * R());
    rings.push({ px, pz, y, pts: prof.map(([a, b]) => [px + sn * a * fat, y + b * sag, pz + cs * a * fat]) });
    if (i % 2 === 0) rod(S, [px, y - 0.2, pz], [px + (R() - 0.5) * 0.1, y + 2.0, pz + (R() - 0.5) * 0.1], 0.04, 0.03, STAKE, 4);
  }
  const col = (px, py, pz) => _t.set(0x8a6a2a).lerp(_c2.set(0xe8c85a), sat(vnoise(px * 3 + pz * 2, py * 1.5) * 0.9 + 0.1)).multiplyScalar(0.8 + 0.35 * vnoise(px * 7, pz * 7 + py * 3));
  for (let i = 0; i < n; i++) {
    const a = rings[i],
      b = rings[i + 1];
    S.facing([(a.px + b.px) / 2, (a.y + b.y) / 2 + 0.7, (a.pz + b.pz) / 2]);
    for (let k = 0; k < prof.length - 1; k++) S.quad(a.pts[k], b.pts[k], b.pts[k + 1], a.pts[k + 1], col, { sway: 0.06 });
  }
  for (const r of [rings[0], rings[n]]) {
    S.facing([x, r.y + 0.8, z]);
    for (let k = 1; k < prof.length - 2; k++) S.tri(r.pts[0], r.pts[k], r.pts[k + 1], col);
    S.tri(r.pts[0], r.pts[prof.length - 2], r.pts[prof.length - 1], col);
  }
  S.facing(null);
}

export function cart(S, M, { hay = false, up = false } = {}) {
  const wood = 0x5a4634;
  S.set(M);
  cuboid(S, [-1.05, 0.72, -0.56], [1.05, 0.8, 0.56], wood, undefined, '');
  for (const sz of [-1, 1]) cuboid(S, [-1.05, 0.8, sz > 0 ? 0.5 : -0.56], [1.05, 1.12, sz > 0 ? 0.56 : -0.5], wood, undefined, 'b');
  cuboid(S, [-1.05, 0.8, -0.5], [-0.99, 1.12, 0.5], wood, undefined, 'b');
  S.set(null);
  for (const sz of [-1, 1]) {
    S.add(new THREE.TorusGeometry(0.56, 0.045, 5, 14), 0x2a2420, M.clone().multiply(xf(0, 0.6, sz * 0.68)));
    for (let k = 0; k < 3; k++) S.add(new THREE.BoxGeometry(1.08, 0.05, 0.04), 0x4a3a2c, M.clone().multiply(xf(0, 0.6, sz * 0.68, 0, 1, 1, 1, 0, (k / 3) * Math.PI)));
    rod(S, [1.0, 0.76, sz * 0.42], [3.0, up ? 0.98 : 0.1, sz * 0.42], 0.045, 0.035, wood, 4, undefined, M);
  }
  rod(S, [0, 0.6, -0.72], [0, 0.6, 0.72], 0.05, 0.05, 0x2a2420, 5, undefined, M);
  if (hay) S.add(new THREE.IcosahedronGeometry(1, 1), (x, y) => _t.set(0x9a7a2a).lerp(_c2.set(0xe8c85a), sat(y * 0.6 + 0.5)), M.clone().multiply(xf(-0.22, 1.22, 0, 0, 0.9, 0.6, 0.64)), { sway: 0.05 });
}

export function rowboat(S, M, colour = 0x7a5a3a) {
  const c = new THREE.Color(colour);
  S.add(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), (x, y) => _t.copy(c).multiplyScalar(0.55 + 0.6 * sat(y + 1)), M.clone().multiply(xf(0, 0.5, 0, 0, 2.5, 0.62, 0.82)));
  S.add(new THREE.CylinderGeometry(1, 1, 0.05, 12), 0x3a2c22, M.clone().multiply(xf(0, 0.32, 0, 0, 2.3, 1, 0.7)));
  for (const x of [-0.9, 0.5]) S.add(new THREE.BoxGeometry(0.22, 0.05, 1.45), 0x6a5438, M.clone().multiply(xf(x, 0.46, 0)));
  for (const sz of [-1, 1]) rod(S, [-1.3, 0.5, sz * 0.3], [1.4, 0.56, sz * 0.42], 0.03, 0.022, 0x8a7a5a, 4, undefined, M);
  S.add(new THREE.CylinderGeometry(1, 1, 0.04, 12, 1, true), _t.copy(c).multiplyScalar(0.5).clone(), M.clone().multiply(xf(0, 0.5, 0, 0, 2.5, 1, 0.82)));
}
