// What a Tuscan hill town is built of besides its houses (those are engine/townhouse.js
// with this kit): tower houses, the parish church and its bell tower, the town wall and
// gate, and the bridge of round arches over the river.
//
//   torre(kit, world, { x, z, ry, w, h, R, roofed })     a tower house; returns { top }
//   pieve(kit, world, { x, z, ry, R })                    church: the front is local +z, the bell tower beside the apse
//   mura(kit, world, { x, z, r, gate, R })                a ring of wall with a gate towards `gate` (an angle)
//   ponte(kit, { x0, x1, z, deck, spans })                the bridge, running along x
//
// kit is a TuscanKit.
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { at, wallBand, reveal, pane, slab, cuboid, partMatrix } from '../../../engine/facade.js';
import { vnoise } from '../../../engine/gl.js';
import { sides, open, shut } from '../../../engine/townhouse.js';
import { TU } from './kit.js';

const pick = (R, a) => a[(R() * a.length) | 0];
const _t = new THREE.Color();
const sat = (x) => Math.min(1, Math.max(0, x));
const stone = (base, seed) => {
  const c = new THREE.Color(base);
  return (x, y, z) => _t.copy(c).multiplyScalar((0.72 + 0.28 * sat((y + 2) / 12)) * (0.84 + 0.32 * vnoise(x * 0.6 + z * 0.5 + seed, y * 0.45 + seed)));
};
// a low four-sided roof of tiles over a square of half-width a at height y
function cap(s, a, y, rise, col) {
  s.roof.facing([0, y - 30, 0]);
  for (let k = 0; k < 4; k++) {
    const c0 = Math.cos((k / 4) * 6.2832 + 0.7854) * a * 1.4142,
      s0 = Math.sin((k / 4) * 6.2832 + 0.7854) * a * 1.4142,
      c1 = Math.cos(((k + 1) / 4) * 6.2832 + 0.7854) * a * 1.4142,
      s1 = Math.sin(((k + 1) / 4) * 6.2832 + 0.7854) * a * 1.4142;
    s.roof.tri([c0, y, s0], [c1, y, s1], [0, y + rise, 0], col);
  }
  s.roof.facing(null);
}
const tiles = (seed) => (x, y, z) => _t.set(0xa8582e).multiplyScalar(0.78 + 0.44 * vnoise(x * 0.7 + seed, z * 0.7 + y));

// ---------------------------------------------------------------- a tower house
export function torre(kit, world, o) {
  const R = o.R,
    w = o.w ?? 4.3 + R() * 1.3,
    h = o.h ?? 17 + R() * 13;
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, gy, o.z, o.ry ?? 0);
  const s = open(kit, M),
    F = sides(w, w),
    seed = o.x * 0.37 + o.z * 0.61;
  const col = stone(pick(R, [0xb8a078, 0xa89068, 0xc0a884, 0x9a8a6a]), seed);
  for (const k of ['front', 'back', 'left', 'right']) {
    // small windows one above another, each in a band of wall of its own
    const ops = [];
    for (let y = (k === 'front' ? 6.5 : 4.5) + R() * 2; y < h - 3.5; y += 4.5 + R() * 3) ops.push({ x0: w / 2 - 0.36, x1: w / 2 + 0.36, y0: y, y1: y + 1.25 });
    let lo = -3;
    ops.forEach((op, i) => {
      const hi = i === ops.length - 1 ? h : (op.y1 + ops[i + 1].y0) / 2;
      const door = k === 'front' && i === 0 ? [{ x0: w / 2 - 0.6, x1: w / 2 + 0.6, y0: 0.05, y1: 2.3 }] : [];
      if (door.length) {
        wallBand(s.stone, F[k], lo, 3.4, door, col);
        reveal(s.detail, F[k], door[0], 0.3, 0x1c1814);
        kit.place('door', partMatrix(M, F[k], door[0].x0, 0.05, 1.2, 2.25), 0x4a3424);
        lo = 3.4;
      }
      wallBand(s.stone, F[k], lo, hi, [op], col);
      reveal(s.detail, F[k], op, 0.3, 0x2a2420);
      const lit = R() < 0.14;
      pane(s.detail, F[k], op.x0, op.x1, op.y0, op.y1, -0.3, lit ? pick(R, TU.LIT) : 0x14110f, { em: lit ? 0.9 : 0 });
      lo = hi;
    });
    if (!ops.length) wallBand(s.stone, F[k], -3, h, [], col);
    // the holes the scaffolding left
    for (let y = 3.2; y < h - 1; y += 2.9) for (const x of [0.8, w - 0.8]) pane(s.detail, F[k], x - 0.09, x + 0.09, y, y + 0.18, 0.012, 0x2a2420);
  }
  let top = h;
  if (o.roofed ?? R() < 0.45) {
    cap(s, w / 2 + 0.45, h, 1.5, tiles(seed));
    top = h + 1.5;
  } else {
    // a crown of merlons
    for (const k of ['front', 'back', 'left', 'right']) {
      slab(s.stone, F[k], -0.12, w + 0.12, h - 0.25, h + 0.55, 0, 0.12, col, undefined, 'k');
      for (let i = 0; i < 3; i++) slab(s.stone, F[k], i * (w / 2.5), i * (w / 2.5) + w / 5, h + 0.55, h + 1.35, -0.45, 0.12, col, undefined, '');
    }
    s.stone.facing([0, h - 30, 0]);
    s.stone.quad([-w / 2, h + 0.1, -w / 2], [w / 2, h + 0.1, -w / 2], [w / 2, h + 0.1, w / 2], [-w / 2, h + 0.1, w / 2], col);
    s.stone.facing(null);
    top = h + 1.35;
  }
  shut(s);
  return { top, w };
}

// ---------------------------------------------------------------- the parish church
export function pieve(kit, world, o) {
  const R = o.R,
    NW = 9,
    NL = 19,
    NH = 8,
    rise = 2.3;
  const gy = o.y ?? world.heightAt(o.x, o.z),
    ry = o.ry ?? 0,
    M = xf(o.x, gy, o.z, ry);
  const s = open(kit, M),
    seed = o.x * 0.21 + o.z * 0.43;
  const wall = stone(0xd9c49a, seed),
    ash = stone(0xb8a888, seed + 7),
    roof = tiles(seed);
  const F = sides(NW, NL),
    glass = (x, y) => _t.set(0xffd98a).multiplyScalar(0.75 + 0.4 * vnoise(x * 3, y * 2));
  // the front: a round-arched door, a round window over it, a gable
  const door = { x0: NW / 2 - 0.95, x1: NW / 2 + 0.95, y0: 0.05, y1: 3.3 };
  wallBand(s.stone, F.front, -3, NH, [door], ash);
  reveal(s.detail, F.front, door, 0.35, 0x1c1814);
  kit.place('door', partMatrix(M, F.front, door.x0, door.y0, 1.9, 3.25), 0x5a4026);
  s.stone.tri(at(F.front, -0.1, NH), at(F.front, NW + 0.1, NH), at(F.front, NW / 2, NH + rise), ash);
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * 6.2832,
      a1 = ((i + 1) / 12) * 6.2832;
    s.detail.tri(at(F.front, NW / 2, 6.1, 0.03), at(F.front, NW / 2 + Math.cos(a0) * 0.8, 6.1 + Math.sin(a0) * 0.8, 0.03), at(F.front, NW / 2 + Math.cos(a1) * 0.8, 6.1 + Math.sin(a1) * 0.8, 0.03), glass, { em: 0.8 });
    s.detail.quad(at(F.front, NW / 2 + Math.cos(a0) * 0.8, 6.1 + Math.sin(a0) * 0.8, 0.05), at(F.front, NW / 2 + Math.cos(a0) * 1.0, 6.1 + Math.sin(a0) * 1.0, 0.05), at(F.front, NW / 2 + Math.cos(a1) * 1.0, 6.1 + Math.sin(a1) * 1.0, 0.05), at(F.front, NW / 2 + Math.cos(a1) * 0.8, 6.1 + Math.sin(a1) * 0.8, 0.05), TU.TRIM);
  }
  // the sides: narrow windows high up, lit from inside
  for (const k of ['left', 'right']) {
    const ops = Array.from({ length: 4 }, (_, i) => ({ x0: (i + 0.5) * (NL / 4) - 0.32, x1: (i + 0.5) * (NL / 4) + 0.32, y0: 4.4, y1: 6.4 }));
    wallBand(s.plaster, F[k], -3, NH, ops, wall);
    for (const op of ops) {
      reveal(s.detail, F[k], op, 0.3, 0x2a2420);
      pane(s.detail, F[k], op.x0, op.x1, op.y0, op.y1, -0.3, glass, { em: 0.7 });
    }
  }
  wallBand(s.plaster, F.back, -3, NH, [], wall);
  s.plaster.tri(at(F.back, -0.1, NH), at(F.back, NW + 0.1, NH), at(F.back, NW / 2, NH + rise), wall);
  s.roof.facing([0, NH - 30, 0]);
  for (const sx of [-1, 1]) s.roof.quad([sx * (NW / 2 + 0.45), NH - 0.1, -NL / 2 - 0.3], [sx * (NW / 2 + 0.45), NH - 0.1, NL / 2 + 0.4], [0, NH + rise, NL / 2 + 0.4], [0, NH + rise, -NL / 2 - 0.3], roof);
  s.roof.facing(null);
  // the apse: half a drum behind the altar, under half a cone
  const AR = 3.1,
    az = -NL / 2;
  for (let i = 0; i < 8; i++) {
    const a0 = Math.PI + (i / 8) * Math.PI,
      a1 = Math.PI + ((i + 1) / 8) * Math.PI;
    const p = (a, y) => [Math.cos(a) * AR, y, az + Math.sin(a) * AR];
    s.plaster.facing([0, 3, az + 1]);
    s.plaster.quad(p(a0, -3), p(a1, -3), p(a1, 5.6), p(a0, 5.6), wall);
    s.plaster.facing(null);
    s.roof.facing([0, -30, az]);
    s.roof.tri(p(a0, 5.6), p(a1, 5.6), [0, 7.4, az], roof);
    s.roof.facing(null);
  }
  // the bell tower, beside the apse
  const TW = 4.4,
    TH = 21,
    tx = NW / 2 + TW / 2 - 0.4,
    tz = -NL / 2 + TW / 2 + 0.6;
  const MT = M.clone().multiply(xf(tx, 0, tz));
  shut(s);
  const t = open(kit, MT),
    FT = sides(TW, TW);
  for (const k of ['front', 'back', 'left', 'right']) {
    // two tiers of paired openings where the bells hang
    const b1 = [{ x0: TW / 2 - 0.95, x1: TW / 2 - 0.15, y0: 12.6, y1: 14.8 }, { x0: TW / 2 + 0.15, x1: TW / 2 + 0.95, y0: 12.6, y1: 14.8 }];
    const b2 = b1.map((q) => ({ ...q, y0: 16.6, y1: 19.2 }));
    wallBand(t.stone, FT[k], -3, 11.8, [], ash);
    wallBand(t.stone, FT[k], 11.8, 15.8, b1, ash);
    wallBand(t.stone, FT[k], 15.8, TH, b2, ash);
    for (const op of [...b1, ...b2]) {
      reveal(t.detail, FT[k], op, 0.4, 0x2a2420);
      pane(t.detail, FT[k], op.x0, op.x1, op.y0, op.y1, -0.4, 0x14110f);
    }
    for (const y of [11.8, 15.8, TH]) slab(t.stone, FT[k], -0.1, TW + 0.1, y - 0.12, y + 0.12, 0, 0.12, TU.TRIM, undefined, 'k');
  }
  cap(t, TW / 2 + 0.4, TH + 0.12, 2.4, roof);
  t.detail.add(new THREE.CylinderGeometry(0.16, 0.42, 0.6, 8), 0x8a6a2a, xf(0, 17.6, 0));
  shut(t);
  const P = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyMatrix4(M);
  const c = P(0, 0),
    b = P(tx, tz);
  world.colliders.push({ x: c.x, z: c.z, hw: NW / 2 + 0.3, hd: NL / 2 + 0.3, ry, top: gy + NH + rise }, { x: b.x, z: b.z, hw: TW / 2 + 0.2, hd: TW / 2 + 0.2, ry, top: gy + TH + 2.5 });
  world.maps?.blob(c.x, c.z, 14, 0.4);
  return { top: TH + 2.5, bell: [b.x, gy + TH, b.z], door: P(0, NL / 2 + 2) };
}

// ---------------------------------------------------------------- the town wall
export function mura(kit, world, o) {
  const H = (x, z) => world.heightAt(x, z);
  const n = o.n ?? 44,
    hh = 5.2,
    seed = o.x * 0.1;
  const col = stone(0xa89a80, seed);
  const S = kit.s('stone').set(null).facing(null);
  const pt = (i, r) => {
    const a = (i / n) * 6.2832;
    return [o.x + Math.cos(a) * r, o.z + Math.sin(a) * r];
  };
  const gi = Math.round(((o.gate % 6.2832) / 6.2832) * n + n) % n; // the gap the gate fills
  for (let i = 0; i < n; i++) {
    if (i === gi) continue;
    const [ax, az] = pt(i, o.r),
      [bx, bz] = pt(i + 1, o.r),
      [cx, cz] = pt(i, o.r - 1.1),
      [dx, dz] = pt(i + 1, o.r - 1.1);
    const y0 = Math.min(H(ax, az), H(bx, bz)) - 2,
      y1 = (H(ax, az) + H(bx, bz)) / 2 + hh;
    S.facing([o.x, y1, o.z]);
    S.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], col);
    S.facing([(ax + bx) / 2 + (ax - o.x), y1, (az + bz) / 2 + (az - o.z)]);
    S.quad([cx, y0, cz], [dx, y0, dz], [dx, y1 - 1.3, dz], [cx, y1 - 1.3, cz], col);
    S.facing([(ax + bx) / 2, y1 - 30, (az + bz) / 2]);
    S.quad([cx, y1 - 1.3, cz], [dx, y1 - 1.3, dz], [bx, y1 - 1.3, bz], [ax, y1 - 1.3, az], col);
    // a merlon on every other length
    if (i % 2 === 0) {
      const [ex, ez] = pt(i + 0.25, o.r),
        [fx, fz] = pt(i + 0.75, o.r),
        [gx, gz] = pt(i + 0.25, o.r - 0.45),
        [hx, hz] = pt(i + 0.75, o.r - 0.45);
      S.facing([o.x, y1, o.z]);
      S.quad([ex, y1, ez], [fx, y1, fz], [fx, y1 + 0.9, fz], [ex, y1 + 0.9, ez], col);
      S.facing([(ex + fx) / 2 + (ex - o.x), y1, (ez + fz) / 2 + (ez - o.z)]);
      S.quad([gx, y1 - 1.3, gz], [hx, y1 - 1.3, hz], [hx, y1 + 0.9, hz], [gx, y1 + 0.9, gz], col);
      S.facing([(ex + fx) / 2, y1 - 30, (ez + fz) / 2]);
      S.quad([gx, y1 + 0.9, gz], [hx, y1 + 0.9, hz], [fx, y1 + 0.9, fz], [ex, y1 + 0.9, ez], col);
    }
    S.facing(null);
    const a = ((i + 0.5) / n) * 6.2832;
    world.colliders.push({ x: (ax + bx) / 2, z: (az + bz) / 2, hw: Math.hypot(bx - ax, bz - az) / 2 + 0.1, hd: 0.75, ry: a - Math.PI / 2, top: y1 + 1 });
  }
  // the gate: two piers, an arch between them, a chamber over it
  const ga = ((gi + 0.5) / n) * 6.2832,
    gx = o.x + Math.cos(ga) * (o.r - 0.5),
    gz = o.z + Math.sin(ga) * (o.r - 0.5),
    gy = H(gx, gz),
    gry = Math.PI / 2 - ga; // its front looks outwards
  const M = xf(gx, gy, gz, gry);
  const s = open(kit, M),
    GW = 7.2,
    GD = 3.6,
    GH = 9.5,
    F = sides(GW, GD);
  const arch = { x0: GW / 2 - 1.7, x1: GW / 2 + 1.7, y0: -0.2, y1: 4.1 };
  for (const k of ['front', 'back']) {
    wallBand(s.stone, F[k], -3, GH, [arch], col);
    // the round head of the arch, filled back in at its corners
    for (const sx of [-1, 1]) {
      const xe = sx < 0 ? arch.x0 : arch.x1;
      s.stone.facing(at(F[k], GW / 2, 2, -9));
      s.stone.tri(at(F[k], xe, 2.7, 0.002), at(F[k], xe, 4.1, 0.002), at(F[k], xe + sx * -1.05, 4.1, 0.002), col);
      s.stone.facing(null);
    }
    pane(s.detail, F[k], GW / 2 - 0.3, GW / 2 + 0.3, 6.2, 7.4, 0.015, 0x14110f);
    for (let i = 0; i < 4; i++) slab(s.stone, F[k], i * (GW / 3.5), i * (GW / 3.5) + GW / 7, GH, GH + 0.9, -0.5, 0.1, col, undefined, '');
  }
  for (const k of ['left', 'right']) wallBand(s.stone, F[k], -3, GH, [], col);
  // the passage: its two walls and its vault
  s.stone.facing([0, 2, 0]);
  for (const sx of [-1, 1]) s.stone.quad([sx * 1.7, -0.2, -GD / 2], [sx * 1.7, -0.2, GD / 2], [sx * 1.7, 4.1, GD / 2], [sx * 1.7, 4.1, -GD / 2], col);
  s.stone.quad([-1.7, 4.1, -GD / 2], [1.7, 4.1, -GD / 2], [1.7, 4.1, GD / 2], [-1.7, 4.1, GD / 2], col);
  s.stone.facing(null);
  s.stone.facing([0, GH - 30, 0]);
  s.stone.quad([-GW / 2, GH, -GD / 2], [GW / 2, GH, -GD / 2], [GW / 2, GH, GD / 2], [-GW / 2, GH, GD / 2], col);
  s.stone.facing(null);
  kit.place('lantern', M.clone().multiply(xf(2.3, 2.6, GD / 2)), 0xffc070);
  shut(s);
  for (const sx of [-1, 1]) {
    const p = new THREE.Vector3(sx * (1.7 + (GW / 2 - 1.7) / 2), 0, 0).applyMatrix4(M);
    world.colliders.push({ x: p.x, z: p.z, hw: (GW / 2 - 1.7) / 2 + 0.1, hd: GD / 2 + 0.2, ry: gry, top: gy + GH + 1 });
  }
  const lamp = new THREE.Vector3(2.3, 2.8, GD / 2 + 0.5).applyMatrix4(M);
  world.glows?.push({ p: [lamp.x, lamp.y, lamp.z], c: 0xffc070, size: 1.8 });
  world.maps?.lamp(lamp.x, lamp.z, 7, 0xffc070, 0.6);
  return { gate: [gx, gz], angle: ga };
}

// ---------------------------------------------------------------- the bridge
// Round arches on piers with pointed cutwaters, a level deck between low walls.
export function ponte(kit, o) {
  const { x0, x1, z, deck } = o,
    n = o.spans ?? 5,
    hw = 2.5,
    span = (x1 - x0) / n,
    pier = 1.5;
  const S = kit.s('stone').set(null).facing(null);
  const col = stone(0xb0a288, 3),
    r = (span - pier) / 2,
    spring = deck - 1.0 - r; // where the arches start from
  for (let i = 0; i < n; i++) {
    const cx = x0 + (i + 0.5) * span,
      K = 10;
    const arc = (k) => {
      const a = Math.PI - (k / K) * Math.PI;
      return [cx + Math.cos(a) * r, spring + Math.sin(a) * r];
    };
    for (let k = 0; k < K; k++) {
      const [ax, ay] = arc(k),
        [bx, by] = arc(k + 1);
      // the faces above the arch, and the underside of it
      for (const sz of [-1, 1]) {
        S.facing([cx, deck, z]);
        S.quad([ax, ay, z + sz * hw], [bx, by, z + sz * hw], [bx, deck, z + sz * hw], [ax, deck, z + sz * hw], col);
      }
      S.facing([cx, deck + 9, z]);
      S.quad([ax, ay, z - hw], [bx, by, z - hw], [bx, by, z + hw], [ax, ay, z + hw], (x, y) => _t.set(0x7a6e5a).multiplyScalar(0.6 + 0.3 * vnoise(x, y)));
    }
    S.facing(null);
  }
  // piers down into the water, pointed up and down stream
  for (let i = 0; i <= n; i++) {
    const px = x0 + i * span;
    cuboid(S, [px - pier / 2, -3.2, z - hw], [px + pier / 2, deck, z + hw], col, undefined, 'tb');
    for (const sz of [-1, 1]) {
      S.facing([px, 0, z]);
      S.quad([px - pier / 2, -3.2, z + sz * hw], [px, -3.2, z + sz * (hw + 1.7)], [px, spring + 0.8, z + sz * (hw + 1.7)], [px - pier / 2, spring + 0.8, z + sz * hw], col);
      S.quad([px + pier / 2, -3.2, z + sz * hw], [px, -3.2, z + sz * (hw + 1.7)], [px, spring + 0.8, z + sz * (hw + 1.7)], [px + pier / 2, spring + 0.8, z + sz * hw], col);
      S.tri([px - pier / 2, spring + 0.8, z + sz * hw], [px + pier / 2, spring + 0.8, z + sz * hw], [px, spring + 0.8, z + sz * (hw + 1.7)], col);
      S.facing(null);
    }
  }
  // the road over it, and its walls
  S.facing([0, deck - 30, z]);
  S.quad([x0 - 1, deck, z - hw], [x1 + 1, deck, z - hw], [x1 + 1, deck, z + hw], [x0 - 1, deck, z + hw], (x, y, zz) => _t.set(0xb8a888).multiplyScalar(0.8 + 0.3 * vnoise(x * 0.8, zz * 0.8)));
  S.facing(null);
  for (const sz of [-1, 1]) cuboid(S, [x0 - 1, deck, z + sz * hw - 0.2], [x1 + 1, deck + 0.85, z + sz * hw + 0.2], col, undefined, 'b');
}
