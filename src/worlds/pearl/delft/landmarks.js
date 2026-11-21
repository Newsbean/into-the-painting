// The buildings that make Delft Delft: the Nieuwe Kerk and its tower, the town hall on
// the market, a tower mill, a town gate on the water, and the brick bridges.
//
//   nieuweKerk(kit, world, { x, z, ry })   the tower stands at local +z, the nave runs back from it
//   stadhuis(kit, world, { x, z, ry })     the front is local +z
//   mill(kit, world, { x, z, ry })         the cap looks along local -x; returns where the sails turn
//   millSails(material)                    the four sails, to be turned about their own x axis
//   gate(kit, world, { x, z, ry })         the passage runs along local z
//   bridge(kit, world, { x, z, ry, half, wide, rise })   the deck follows rise*cos, as heightAt does
//
// kit is a DelftKit (kit.js). Lab: /?debug&look=pearl&lab=worlds/pearl/delft/lab.js&show=church
import * as THREE from 'three';
import { Builder, xf } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { at, wallBand, reveal, pane, slab, cuboid, partMatrix } from '../../../engine/facade.js';
import { DELFT } from './kit.js';

const _t = new THREE.Color();
const STONE = new THREE.Color(DELFT.STONE);
const soups = (kit, M) => {
  const s = {};
  for (const n of ['brick', 'plaster', 'stone', 'tile', 'slate', 'wood', 'detail']) s[n] = kit.s(n).set(M).facing(null).warp(null);
  return s;
};
const done = (s) => {
  for (const k in s) s[k].set(null).facing(null);
};
// the four walls of a box standing at (cx, cz): w along x, d along z
const box4 = (cx, cz, w, d) => ({
  front: { o: [cx - w / 2, 0, cz + d / 2], u: [1, 0, 0], n: [0, 0, 1], W: w },
  back: { o: [cx + w / 2, 0, cz - d / 2], u: [-1, 0, 0], n: [0, 0, -1], W: w },
  left: { o: [cx - w / 2, 0, cz - d / 2], u: [0, 0, 1], n: [-1, 0, 0], W: d },
  right: { o: [cx + w / 2, 0, cz + d / 2], u: [0, 0, -1], n: [1, 0, 0], W: d },
});
// the n sides of an upright prism or frustum about (cx, cz); the same again as facades for openings
const ring = (cx, cz, r, n, rot = Math.PI / n) => Array.from({ length: n }, (_, i) => [cx + Math.sin(rot + (i / n) * 6.2832) * r, cz + Math.cos(rot + (i / n) * 6.2832) * r]);
function prism(S, cx, cz, r0, r1, y0, y1, n, col, rot) {
  const a = ring(cx, cz, r0, n, rot),
    b = ring(cx, cz, r1, n, rot);
  S.facing([cx, (y0 + y1) / 2, cz]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (r1 > 0.02) S.quad([a[i][0], y0, a[i][1]], [a[j][0], y0, a[j][1]], [b[j][0], y1, b[j][1]], [b[i][0], y1, b[i][1]], col);
    else S.tri([a[i][0], y0, a[i][1]], [a[j][0], y0, a[j][1]], [cx, y1, cz], col);
  }
  S.facing(null);
}
const faces = (cx, cz, r, n, rot = Math.PI / n) => {
  const p = ring(cx, cz, r, n, rot);
  return p.map((a, i) => {
    const b = p[(i + 1) % n],
      W = Math.hypot(b[0] - a[0], b[1] - a[1]),
      u = [(b[0] - a[0]) / W, 0, (b[1] - a[1]) / W];
    return { o: [a[0], 0, a[1]], u, n: [-u[2], 0, u[0]], W };
  });
};
// a pointed opening: a rectangular hole whose top corners are filled back in with wall
function lancet(wall, det, F, op, depth, wallCol, revealCol, glass, o) {
  const xm = (op.x0 + op.x1) / 2,
    yh = op.y1 - (op.x1 - op.x0) * 0.95;
  reveal(det, F, op, depth, revealCol);
  pane(det, F, op.x0, op.x1, op.y0, op.y1, -depth, glass, o);
  wall.tri(at(F, op.x0, yh, 0.002), at(F, xm, op.y1, 0.002), at(F, op.x0, op.y1, 0.002), wallCol);
  wall.tri(at(F, op.x1, yh, 0.002), at(F, op.x1, op.y1, 0.002), at(F, xm, op.y1, 0.002), wallCol);
  if (o?.tracery !== false) {
    pane(det, F, xm - 0.06, xm + 0.06, op.y0, op.y1, -depth + 0.04, DELFT.STONE_D);
    for (let y = op.y0 + 1.6; y < yh; y += 1.6) pane(det, F, op.x0, op.x1, y - 0.04, y + 0.04, -depth + 0.04, DELFT.STONE_D);
  }
}
// the far side of a block that stands free (slab() leaves it out)
const behind = (S, F, x0, x1, y0, y1, z, col) => S.quad(at(F, x1, y0, z), at(F, x0, y0, z), at(F, x0, y1, z), at(F, x1, y1, z), col);
const collide = (world, M, lx, lz, hw, hd, ry, top) => {
  const p = new THREE.Vector3(lx, 0, lz).applyMatrix4(M);
  world.colliders.push({ x: p.x, z: p.z, hw, hd, ry, top });
};

// ---------------------------------------------------------------- the Nieuwe Kerk
// A Gothic church of brick: a long nave with lower aisles and tall pointed windows, and
// in front of it the tower, square and brick below, eight-sided and stone above, then the spire.
export function nieuweKerk(kit, world, o) {
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const ry = o.ry ?? 0;
  const M = xf(o.x, gy, o.z, ry);
  const s = soups(kit, M);
  const bc = new THREE.Color(0x96523a);
  const brick = (x, y, z) => _t.copy(bc).multiplyScalar((0.78 + 0.22 * Math.min(1, Math.max(0, y / 9))) * (0.9 + 0.2 * vnoise(x * 0.4 + z * 0.3, y * 0.35)));
  const dark = bc.clone().multiplyScalar(0.5);
  const stone = (x, y, z) => _t.copy(STONE).multiplyScalar(0.9 + 0.16 * vnoise(x * 0.5 + z * 0.4, y * 0.5));
  const glass = (x, y) => _t.set(0x2c3a48).lerp(SKY, 0.3 + 0.25 * vnoise(x * 2, y * 0.8));
  const slate = (x, y, z) => _t.set(0x4a5260).multiplyScalar(0.85 + 0.3 * vnoise(x * 0.4, z * 0.4 + y * 0.3));

  // --- the tower: 9.4 m square, brick to 32 m
  const TW = 9.4,
    TH = 32,
    tz = 0; // its middle
  const T = box4(0, tz, TW, TW);
  for (const k of ['front', 'back', 'left', 'right']) {
    const F = T[k];
    const door = k === 'front' ? [{ x0: TW / 2 - 1.7, x1: TW / 2 + 1.7, y0: 0, y1: 6.6 }] : [];
    wallBand(s.brick, F, -1.2, 9, door, brick);
    if (door.length) {
      lancet(s.brick, s.detail, F, door[0], 0.9, brick, dark, 0x2a2018, { tracery: false });
      pane(s.wood, F, door[0].x0, door[0].x1, 0, 4.2, -0.88, 0x3a2a1e);
      slab(s.stone, F, door[0].x0 - 0.45, door[0].x0, 0, 5.2, 0, 0.3, stone, undefined, 'kb');
      slab(s.stone, F, door[0].x1, door[0].x1 + 0.45, 0, 5.2, 0, 0.3, stone, undefined, 'kb');
    }
    // two tall storeys of paired lancets, the upper one the belfry with its louvres
    for (const [y0, y1, belfry] of [[9, 20, false], [20, TH, true]]) {
      const ops = [1, 2].map((i) => ({ x0: (TW * i) / 3 - 0.85, x1: (TW * i) / 3 + 0.85, y0: y0 + 1.6, y1: y1 - 1.6 }));
      wallBand(s.brick, F, y0, y1, ops, brick);
      for (const op of ops) {
        lancet(s.brick, s.detail, F, op, 0.5, brick, dark, belfry ? 0x1e1a18 : glass, { tracery: !belfry });
        if (belfry) for (let y = op.y0 + 0.5; y < op.y1 - 2; y += 0.7) slab(s.wood, F, op.x0, op.x1, y, y + 0.1, -0.45, -0.1, 0x4a4038, undefined, 'k');
      }
      slab(s.stone, F, -0.1, TW + 0.1, y0 - 0.14, y0 + 0.14, 0, 0.12, stone, undefined, 'k');
    }
    // a clock under the parapet, on the side that looks at the market
    if (k === 'front') {
      for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * 6.2832,
          a1 = ((i + 1) / 16) * 6.2832;
        s.detail.tri(at(F, TW / 2, TH - 1.9, 0.08), at(F, TW / 2 + Math.cos(a0) * 1.35, TH - 1.9 + Math.sin(a0) * 1.35, 0.08), at(F, TW / 2 + Math.cos(a1) * 1.35, TH - 1.9 + Math.sin(a1) * 1.35, 0.08), i % 4 === 0 ? 0xd9a83a : 0x1e2430);
      }
      pane(s.detail, F, TW / 2 - 0.04, TW / 2 + 0.04, TH - 1.9, TH - 0.85, 0.1, 0xe6c860);
      pane(s.detail, F, TW / 2, TW / 2 + 0.7, TH - 1.94, TH - 1.86, 0.1, 0xe6c860);
    }
  }
  // buttresses at the corners, stepping back as they climb
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (const [y0, y1, e] of [[-1.2, 11, 1.1], [11, 22, 0.75], [22, TH, 0.4]]) {
        cuboid(s.brick, [sx * (TW / 2) + (sx < 0 ? -e : 0), y0, tz + sz * (TW / 2) + (sz < 0 ? -e : 0)], [sx * (TW / 2) + (sx < 0 ? 0 : e), y1, tz + sz * (TW / 2) + (sz < 0 ? 0 : e)], brick, undefined, 'b');
        cuboid(s.stone, [sx * (TW / 2) + (sx < 0 ? -e - 0.05 : -0.05), y1, tz + sz * (TW / 2) + (sz < 0 ? -e - 0.05 : -0.05)], [sx * (TW / 2) + (sx < 0 ? 0.05 : e + 0.05), y1 + 0.18, tz + sz * (TW / 2) + (sz < 0 ? 0.05 : e + 0.05)], stone, undefined, 'b');
      }
  // the parapet, with a pinnacle at each corner
  cuboid(s.stone, [-TW / 2 - 0.35, TH, tz - TW / 2 - 0.35], [TW / 2 + 0.35, TH + 0.3, tz + TW / 2 + 0.35], stone, undefined, '');
  for (const k of ['front', 'back', 'left', 'right']) for (let i = 0; i < 9; i++) slab(s.stone, { ...T[k], o: at(T[k], 0, 0, 0.3) }, 0.2 + i * ((TW - 0.4) / 9), 0.2 + (i + 0.62) * ((TW - 0.4) / 9), TH + 0.3, TH + 1.5, -0.3, 0, stone, undefined, '');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) prism(s.stone, sx * (TW / 2 + 0.1), tz + sz * (TW / 2 + 0.1), 0.42, 0, TH + 0.3, TH + 3.6, 4, stone, 0);

  // the eight-sided stages of pale stone, each with its open arches and its gallery
  let y = TH + 0.3;
  for (const [r, h] of [[3.9, 9.5], [2.9, 7]]) {
    for (const F of faces(0, tz, r, 8)) {
      const op = { x0: F.W / 2 - F.W * 0.26, x1: F.W / 2 + F.W * 0.26, y0: y + 1.1, y1: y + h - 1.2 };
      wallBand(s.stone, F, y, y + h, [op], stone);
      lancet(s.stone, s.detail, F, op, 0.35, stone, STONE.clone().multiplyScalar(0.6), 0x1a1c22, { tracery: false });
    }
    prism(s.stone, 0, tz, r + 0.32, r + 0.32, y + h, y + h + 0.26, 8, stone);
    s.stone.facing([0, y - 30, tz]);
    const top = ring(0, tz, r + 0.32, 8);
    for (let i = 0; i < 8; i++) s.stone.tri([top[i][0], y + h + 0.26, top[i][1]], [top[(i + 1) % 8][0], y + h + 0.26, top[(i + 1) % 8][1]], [0, y + h + 0.26, tz], stone);
    s.stone.facing(null);
    // the gallery rail
    prism(s.stone, 0, tz, r + 0.3, r + 0.3, y + h + 0.26, y + h + 1.15, 8, (px, py) => _t.copy(STONE).multiplyScalar(py > y + h + 0.95 ? 1 : 0.72));
    y += h + 0.26;
  }
  // the spire: slate, drawn in at its foot, a ball and a cross on top
  prism(s.slate, 0, tz, 2.5, 1.5, y, y + 2.2, 8, slate);
  prism(s.slate, 0, tz, 1.5, 0.12, y + 2.2, y + 15.5, 8, slate);
  prism(s.detail, 0, tz, 0.34, 0.34, y + 15.5, y + 16.1, 6, 0xd9a83a);
  cuboid(s.detail, [-0.05, y + 16.1, tz - 0.05], [0.05, y + 17.9, tz + 0.05], 0xd9a83a, undefined, 'b');
  cuboid(s.detail, [-0.5, y + 17.1, tz - 0.04], [0.5, y + 17.2, tz + 0.04], 0xd9a83a, undefined, '');
  const top = y + 17.9;

  // --- the nave behind it: 13 m wide and 19 to the eaves, an aisle 6 m wide either side
  const N0 = -TW / 2,
    NL = 46,
    NW = 13,
    NH = 19,
    AW = 6,
    AH = 9.5,
    bays = 7,
    bl = NL / bays;
  const nave = box4(0, N0 - NL / 2, NW, NL);
  for (const k of ['left', 'right']) {
    const F = nave[k];
    // the clerestory above the aisle roof
    const ops = Array.from({ length: bays }, (_, i) => ({ x0: (i + 0.5) * bl - 1.25, x1: (i + 0.5) * bl + 1.25, y0: AH + 4.2, y1: NH - 1.0 }));
    wallBand(s.brick, F, AH + 2.6, NH, ops, brick);
    for (const op of ops) lancet(s.brick, s.detail, F, op, 0.4, brick, dark, glass);
    // the aisle wall, with the tall windows between its buttresses
    const A = { ...F, o: at(F, 0, 0, AW) };
    const aops = Array.from({ length: bays }, (_, i) => ({ x0: (i + 0.5) * bl - 1.5, x1: (i + 0.5) * bl + 1.5, y0: 2.4, y1: AH - 0.9 }));
    wallBand(s.brick, A, -1.2, AH, aops, brick);
    for (const op of aops) lancet(s.brick, s.detail, A, op, 0.45, brick, dark, glass);
    for (let i = 0; i <= bays; i++) {
      slab(s.brick, A, i * bl - 0.42, i * bl + 0.42, -1.2, AH - 1.6, 0, 1.25, brick, undefined, 'kb');
      slab(s.stone, A, i * bl - 0.47, i * bl + 0.47, AH - 1.6, AH - 1.42, 0, 1.3, stone, undefined, 'k');
    }
    slab(s.stone, A, 0, NL, AH - 0.12, AH + 0.12, 0, 0.14, stone, undefined, 'k');
    // the aisle's lean-to roof, and its end walls
    s.slate.facing([0, -40, N0 - NL / 2]);
    s.slate.quad(at(A, 0, AH, 0.3), at(A, NL, AH, 0.3), at(F, NL, AH + 2.7, 0), at(F, 0, AH + 2.7, 0), slate);
    s.slate.facing(null);
    for (const end of [0, NL]) {
      s.brick.facing([0, 4, N0 - NL / 2]);
      s.brick.quad(at(F, end, -1.2, 0), at(F, end, -1.2, AW), at(F, end, AH, AW), at(F, end, AH, 0), brick);
      s.brick.tri(at(F, end, AH, 0), at(F, end, AH, AW), at(F, end, AH + 2.7, 0), brick);
      s.brick.facing(null);
    }
    slab(s.stone, F, 0, NL, NH - 0.14, NH + 0.14, 0, 0.16, stone, undefined, 'k');
  }
  // the steep roof of the nave and its gable ends
  const RH = 10.5;
  s.slate.facing([0, -40, N0 - NL / 2]);
  for (const sx of [-1, 1]) s.slate.quad([sx * (NW / 2 + 0.3), NH, N0], [sx * (NW / 2 + 0.3), NH, N0 - NL - 0.3], [0, NH + RH, N0 - NL - 0.3], [0, NH + RH, N0], slate);
  s.slate.facing(null);
  cuboid(s.slate, [-0.16, NH + RH - 0.05, N0 - NL - 0.3], [0.16, NH + RH + 0.16, N0], 0x3a4250, undefined, 'b');
  // a slender spirelet where the choir begins
  prism(s.slate, 0, N0 - NL * 0.72, 0.9, 0.9, NH + RH - 0.6, NH + RH + 1.6, 6, slate);
  prism(s.slate, 0, N0 - NL * 0.72, 1.0, 0.05, NH + RH + 1.6, NH + RH + 7.5, 6, slate);
  // the east end: a wall with one great window, and its gable
  const E = nave.back;
  const ew = { x0: NW / 2 - 2.2, x1: NW / 2 + 2.2, y0: 3, y1: NH - 2 };
  wallBand(s.brick, E, -1.2, NH, [ew], brick);
  lancet(s.brick, s.detail, E, ew, 0.5, brick, dark, glass);
  s.brick.tri(at(E, 0, NH), at(E, NW, NH), at(E, NW / 2, NH + RH - 0.05), brick);
  s.brick.tri(at(nave.front, 0, NH), at(nave.front, NW, NH), at(nave.front, NW / 2, NH + RH - 0.05), brick);
  // (the west wall of the nave above the aisles, either side of the tower)
  wallBand(s.brick, nave.front, -1.2, NH, [{ x0: NW / 2 - TW / 2, x1: NW / 2 + TW / 2, y0: -1.2, y1: NH }], brick);

  collide(world, M, 0, tz, TW / 2 + 0.9, TW / 2 + 0.9, ry, gy + top);
  collide(world, M, 0, N0 - NL / 2, NW / 2 + AW + 1.2, NL / 2 + 0.3, ry, gy + NH + RH);
  const c = new THREE.Vector3(0, 0, -NL / 2).applyMatrix4(M);
  world.maps?.blob(c.x, c.z, 30, 0.4);
  done(s);
  return { top: gy + top, towerTop: gy + TH };
}
const SKY = new THREE.Color(0x9fb4c4);

// ---------------------------------------------------------------- the town hall
// Stone, in the manner of 1620: three storeys of cross-windows with red shutters, a
// carved gable over the middle, a balustrade with obelisks, and the old square
// tower of the prison rising behind.
export function stadhuis(kit, world, o) {
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const ry = o.ry ?? 0;
  const M = xf(o.x, gy, o.z, ry);
  const s = soups(kit, M);
  const W = 23,
    D = 13,
    gH = 4.6,
    fH = 3.9,
    H = gH + fH * 2;
  const stone = (x, y, z) => _t.copy(STONE).multiplyScalar(0.88 + 0.16 * vnoise(x * 0.5 + z * 0.4, y * 0.5));
  const shade = STONE.clone().multiplyScalar(0.58);
  const glass = (x, y) => _t.set(0x2c3a40).lerp(SKY, 0.3 + 0.2 * vnoise(x * 2, y));
  const B = box4(0, 0, W, D);
  const bays = 7,
    bw = W / bays;
  for (const k of ['front', 'back', 'left', 'right']) {
    const F = B[k],
      nb = k === 'front' || k === 'back' ? bays : 4,
      w1 = F.W / nb;
    for (let f = 0; f < 3; f++) {
      const y0 = f ? gH + (f - 1) * fH : -1.2,
        y1 = f ? gH + f * fH : gH;
      const ops = [];
      for (let i = 0; i < nb; i++) {
        const cx = (i + 0.5) * w1;
        if (k === 'front' && f === 0 && i === 3) ops.push({ x0: cx - 1.0, x1: cx + 1.0, y0: 0.9, y1: 4.0, door: true });
        else ops.push({ x0: cx - 0.62, x1: cx + 0.62, y0: (f ? y0 : 0) + 1.1, y1: (f ? y0 : 0) + 1.1 + (f ? 2.2 : 2.6) });
      }
      wallBand(s.stone, F, y0, y1, ops, stone);
      for (const op of ops) {
        reveal(s.detail, F, op, 0.24, shade, shade);
        if (op.door) {
          pane(s.wood, F, op.x0, op.x1, op.y0, op.y1, -0.24, 0x4a2a20);
          // the double stair up to it
          slab(s.stone, F, op.x0 - 2.6, op.x1 + 2.6, -1.2, 0.9, 0, 1.6, stone, undefined, 'kb');
          for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) slab(s.stone, F, sx < 0 ? op.x0 - 2.6 - (i + 1) * 0.5 : op.x1 + 2.6 + i * 0.5, sx < 0 ? op.x0 - 2.6 - i * 0.5 : op.x1 + 2.6 + (i + 1) * 0.5, -1.2, 0.9 - (i + 1) * 0.22, 0, 1.6, stone, undefined, 'kb');
        } else {
          pane(s.detail, F, op.x0, op.x1, op.y0, op.y1, -0.24, glass);
          kit.place(k === 'front' ? 'window' : 'windowBare', partMatrix(M, F, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), 0xa8281e);
          slab(s.stone, F, op.x0 - 0.16, op.x1 + 0.16, op.y1 + 0.08, op.y1 + 0.3, 0, 0.1, stone, undefined, 'k');
        }
      }
      slab(s.stone, F, -0.08, F.W + 0.08, y1 - 0.16, y1 + 0.12, 0, 0.16, stone, undefined, 'k');
    }
    // pilasters between the bays of the front
    if (k === 'front') for (let i = 0; i <= bays; i++) slab(s.stone, F, Math.max(0, i * bw - 0.22), Math.min(W, i * bw + 0.22), -1.2, H, 0, 0.14, stone, undefined, 'kb');
    // the balustrade, an obelisk over every pilaster
    slab(s.stone, { ...F, o: at(F, 0, 0, 0.16) }, -0.16, F.W + 0.16, H + 0.12, H + 1.0, -0.22, 0, (x, y2) => _t.copy(STONE).multiplyScalar(y2 > H + 0.85 ? 0.98 : 0.7), undefined, 'b');
  }
  for (let i = 0; i <= bays; i++) if (Math.abs(i - bays / 2) > 1.1) prism(s.stone, -W / 2 + i * bw, D / 2 + 0.05, 0.2, 0, H + 1.0, H + 2.5, 4, stone, 0);
  // the gable over the middle three bays, scrolled at the shoulders, a figure of Justice in its niche
  const g0 = W / 2 - bw * 1.5,
    g1 = W / 2 + bw * 1.5;
  for (const [a, b, y0, y1] of [[g0, g1, H, H + 3.2], [g0 + 1.3, g1 - 1.3, H + 3.2, H + 5.6], [g0 + 2.8, g1 - 2.8, H + 5.6, H + 7.2]]) {
    slab(s.stone, B.front, a, b, y0, y1, -0.5, 0.1, stone, undefined, 'b');
    behind(s.stone, B.front, a, b, y0, y1, -0.5, stone);
    slab(s.stone, B.front, a - 0.12, b + 0.12, y1, y1 + 0.18, -0.56, 0.18, stone, undefined, '');
    for (const x of [a, b]) prism(s.stone, -W / 2 + x, D / 2 - 0.2, 0.34, 0.05, y1 + 0.18, y1 + 1.2, 6, stone);
  }
  pane(s.detail, B.front, W / 2 - 0.55, W / 2 + 0.55, H + 0.7, H + 2.7, 0.11, shade);
  pane(s.detail, B.front, W / 2 - 0.22, W / 2 + 0.22, H + 0.75, H + 2.2, 0.13, 0xd9a83a);
  prism(s.stone, 0, D / 2 - 0.2, 0.4, 0, H + 7.38, H + 9.2, 4, stone, 0);
  // the hipped slate roof
  const slate = (x, y, z) => _t.set(0x4a5260).multiplyScalar(0.85 + 0.3 * vnoise(x * 0.4, z * 0.4 + y * 0.3));
  s.slate.facing([0, -40, 0]);
  const rh = 4.6,
    ix = W / 2 - 4.8;
  s.slate.quad([-W / 2, H, D / 2], [W / 2, H, D / 2], [ix, H + rh, 0], [-ix, H + rh, 0], slate);
  s.slate.quad([W / 2, H, -D / 2], [-W / 2, H, -D / 2], [-ix, H + rh, 0], [ix, H + rh, 0], slate);
  s.slate.tri([-W / 2, H, -D / 2], [-W / 2, H, D / 2], [-ix, H + rh, 0], slate);
  s.slate.tri([W / 2, H, D / 2], [W / 2, H, -D / 2], [ix, H + rh, 0], slate);
  s.slate.facing(null);
  // the old tower behind, with its lead spire
  const TZ = -D / 2 + 3.2,
    TS = 6.4,
    TT = 25;
  const T = box4(0, TZ, TS, TS);
  for (const k of ['front', 'back', 'left', 'right']) {
    const op = { x0: TS / 2 - 0.7, x1: TS / 2 + 0.7, y0: TT - 5.2, y1: TT - 1.6 };
    wallBand(s.stone, T[k], H - 0.5, TT, [op], stone);
    lancet(s.stone, s.detail, T[k], op, 0.3, stone, shade, 0x1a1c22, { tracery: false });
    slab(s.stone, T[k], -0.1, TS + 0.1, TT - 0.2, TT + 0.9, 0, 0.14, (x, y2) => _t.copy(STONE).multiplyScalar(y2 > TT + 0.7 ? 1 : 0.72), undefined, 'b');
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) prism(s.stone, sx * (TS / 2 + 0.05), TZ + sz * (TS / 2 + 0.05), 0.5, 0.5, TT - 2.5, TT + 2.2, 6, stone);
  prism(s.slate, 0, TZ, 2.7, 2.0, TT + 0.2, TT + 3.4, 8, slate);
  prism(s.slate, 0, TZ, 1.7, 1.7, TT + 3.4, TT + 5.6, 8, slate);
  prism(s.slate, 0, TZ, 1.9, 0.1, TT + 5.6, TT + 11.5, 8, slate);
  prism(s.detail, 0, TZ, 0.26, 0.26, TT + 11.5, TT + 12.0, 6, 0xd9a83a);
  collide(world, M, 0, 0, W / 2 + 0.4, D / 2 + 0.4, ry, gy + TT + 11);
  collide(world, M, 0, D / 2 + 0.9, 4.4, 0.9, ry, gy + 1.1);
  const c = new THREE.Vector3(0, 0, 0).applyMatrix4(M);
  world.maps?.blob(c.x, c.z, 16, 0.4);
  done(s);
  return { top: gy + TT + 12 };
}

// ---------------------------------------------------------------- the mill
// A tower mill with a stage: tapering brick, a wooden gallery half way up from which
// the miller sets the sails, and a boat-shaped cap that is turned into the wind.
export function mill(kit, world, o) {
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, gy, o.z, o.ry ?? 0);
  const s = soups(kit, M);
  const bc = new THREE.Color(0x8a5a40);
  const brick = (x, y, z) => _t.copy(bc).multiplyScalar((0.8 + 0.2 * Math.min(1, y / 6)) * (0.9 + 0.2 * vnoise(x * 0.5 + z * 0.4, y * 0.4)));
  const HT = 18.5,
    SY = 7.0,
    RB = 5.2,
    RT = 3.1;
  const rAt = (y) => RB - (RB - RT) * ((y + 1.2) / (HT + 1.2)); // the tower draws in as it climbs
  prism(s.brick, 0, 0, RB, RT, -1.2, HT, 12, brick);
  // the door, and small windows up the tower
  faces(0, 0, rAt(1.2) + 0.06, 12).forEach((F, i) => {
    if (i === 9) pane(s.wood, F, F.W / 2 - 0.7, F.W / 2 + 0.7, 0, 2.5, 0, 0x4a3626);
  });
  for (const y of [SY + 3.4, SY + 7.6]) faces(0, 0, rAt(y + 0.6) + 0.04, 12).forEach((F, i) => {
    if (i % 3 === (y > SY + 5 ? 1 : 0)) pane(s.detail, F, F.W / 2 - 0.36, F.W / 2 + 0.36, y, y + 1.2, 0, 0x1e2430);
  });
  // the stage: a ring of planks on struts, with a rail
  const r0 = rAt(SY),
    r1 = r0 + 2.5;
  const a = ring(0, 0, r0 - 0.1, 12),
    b = ring(0, 0, r1, 12);
  for (let i = 0; i < 12; i++) {
    const j = (i + 1) % 12;
    s.wood.facing([0, SY - 30, 0]);
    s.wood.quad([a[i][0], SY, a[i][1]], [a[j][0], SY, a[j][1]], [b[j][0], SY, b[j][1]], [b[i][0], SY, b[i][1]], 0x8a6a48);
    s.wood.facing([0, SY + 30, 0]);
    s.wood.quad([a[i][0], SY - 0.14, a[i][1]], [a[j][0], SY - 0.14, a[j][1]], [b[j][0], SY - 0.14, b[j][1]], [b[i][0], SY - 0.14, b[i][1]], 0x5a4230);
    s.wood.facing([0, SY, 0]);
    s.wood.quad([b[i][0], SY - 0.14, b[i][1]], [b[j][0], SY - 0.14, b[j][1]], [b[j][0], SY, b[j][1]], [b[i][0], SY, b[i][1]], 0x6a5038);
    // rail and post
    s.wood.quad([b[i][0], SY + 0.95, b[i][1]], [b[j][0], SY + 0.95, b[j][1]], [b[j][0], SY + 1.05, b[j][1]], [b[i][0], SY + 1.05, b[i][1]], 0x6a5038);
    s.wood.facing(null);
    cuboid(s.wood, [b[i][0] - 0.05, SY, b[i][1] - 0.05], [b[i][0] + 0.05, SY + 1.05, b[i][1] + 0.05], 0x5a4230, undefined, 'b');
    // a strut from the wall below up to the edge of the stage
    const q = ring(0, 0, rAt(SY - 3.4) + 0.02, 12)[i];
    for (const [p0, p1] of [[0.985, 1], [1, 0.985]]) s.wood.tri([q[0], SY - 3.4, q[1]], [b[i][0] * p0, SY - 0.14, b[i][1] * p0], [b[i][0] * p1, SY - 0.4, b[i][1] * p1], 0x4a3626);
  }
  // the cap: tarred boards, longer than it is wide, with the windshaft coming out of its nose
  const cap = (x, y, z) => _t.set(0x3a3230).multiplyScalar(0.85 + 0.3 * vnoise(x, y + z));
  s.wood.facing([0, HT - 20, 0]);
  const cr = ring(0, 0, 3.3, 10, 0);
  for (let i = 0; i < 10; i++) {
    const j = (i + 1) % 10;
    const e = (p) => [p[0] * 1.18 - 0.5, HT, p[1] * 0.96];
    const m = (p) => [p[0] * 0.8 - 0.35, HT + 1.9, p[1] * 0.62];
    s.wood.quad(e(cr[i]), e(cr[j]), m(cr[j]), m(cr[i]), cap);
    s.wood.tri(m(cr[i]), m(cr[j]), [-0.2, HT + 3.0, 0], cap);
  }
  s.wood.facing(null);
  cuboid(s.wood, [-4.6, HT + 0.9, -0.22], [-2.0, HT + 1.35, 0.22], 0x4a3626, undefined, '');
  // the tail pole, down to the stage, by which the cap is turned
  s.wood.tri([3.2, HT + 0.6, -0.1], [3.2, HT + 0.6, 0.1], [r1 + 0.3, SY + 1.2, 0], 0x4a3626);
  s.wood.tri([3.2, HT + 0.6, 0.1], [3.2, HT + 0.6, -0.1], [r1 + 0.3, SY + 1.2, 0], 0x4a3626);
  world.colliders.push({ x: o.x, z: o.z, r: 4.7, top: gy + HT + 2 });
  (world.platforms ??= []).push({ minx: o.x - r1 * 0.72, maxx: o.x + r1 * 0.72, minz: o.z - r1 * 0.72, maxz: o.z + r1 * 0.72, y: gy + SY });
  world.maps?.blob(o.x, o.z, 9, 0.4);
  done(s);
  const hub = new THREE.Vector3(-4.7, HT + 1.12, 0).applyMatrix4(M);
  return { hub, top: gy + HT + 3 };
}
// the four sails: each a lattice frame on one side of its stock, with the cloth spread on it
export function millSails(material) {
  const B = new Builder();
  for (let i = 0; i < 4; i++) {
    const M = xf(0, 0, 0, 0, 1, 1, 1, (i * Math.PI) / 2, 0);
    B.box(0.22, 11.4, 0.22, 0x4a3626, 0, 0.3, 0, 0, undefined, M); // the stock
    B.box(0.06, 9.2, 2.2, 0xe9dfc4, 0.05, 2.0, 1.15, 0, { sway: 0.03 }, M); // the cloth
    for (let k = 0; k < 8; k++) B.box(0.08, 0.07, 2.25, 0x5a4230, -0.02, 2.2 + k * 1.22, 1.15, 0, undefined, M); // the bars
    B.box(0.08, 9.4, 0.08, 0x5a4230, -0.02, 2.0, 2.26, 0, undefined, M); // the hem lath
  }
  B.ball(0.42, 0x3a2c22, 0, 0, 0, 1, 1, 1, 0);
  return B.mesh(material);
}

// ---------------------------------------------------------------- a town gate on the water
// Brick, with a pointed archway and two slender round towers under tall spires.
export function gate(kit, world, o) {
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const ry = o.ry ?? 0;
  const M = xf(o.x, gy, o.z, ry);
  const s = soups(kit, M);
  const bc = new THREE.Color(0x935238);
  const brick = (x, y, z) => _t.copy(bc).multiplyScalar((0.8 + 0.2 * Math.min(1, Math.max(0, y / 5))) * (0.9 + 0.2 * vnoise(x * 0.5 + z * 0.4, y * 0.4)));
  const stone = (x, y, z) => _t.copy(STONE).multiplyScalar(0.9 + 0.14 * vnoise(x + z, y));
  const slate = (x, y, z) => _t.set(0x4a5260).multiplyScalar(0.85 + 0.3 * vnoise(x * 0.5, z * 0.5 + y * 0.3));
  const W = 9,
    D = 7,
    H = 10.5;
  const B = box4(0, 0, W, D);
  for (const k of ['front', 'back']) {
    const arch = { x0: W / 2 - 1.9, x1: W / 2 + 1.9, y0: 0, y1: 5.6 };
    const win = { x0: W / 2 - 0.5, x1: W / 2 + 0.5, y0: 6.9, y1: 8.9 };
    wallBand(s.brick, B[k], -1.2, 6.3, [arch], brick);
    wallBand(s.brick, B[k], 6.3, H, [win], brick);
    // (an open passage: its walls and vault, and the two corners that make the arch pointed)
    if (k === 'front') reveal(s.detail, B[k], arch, D, bc.clone().multiplyScalar(0.5), 0x8a7a66);
    const am = (arch.x0 + arch.x1) / 2,
      ah = arch.y1 - (arch.x1 - arch.x0) * 0.6;
    s.brick.tri(at(B[k], arch.x0, ah, 0.002), at(B[k], am, arch.y1, 0.002), at(B[k], arch.x0, arch.y1, 0.002), brick);
    s.brick.tri(at(B[k], arch.x1, ah, 0.002), at(B[k], arch.x1, arch.y1, 0.002), at(B[k], am, arch.y1, 0.002), brick);
    reveal(s.detail, B[k], win, 0.2, bc.clone().multiplyScalar(0.5));
    pane(s.detail, B[k], win.x0, win.x1, win.y0, win.y1, -0.2, 0x2c3a40);
    slab(s.stone, B[k], 0, W, 6.2, 6.42, 0, 0.1, stone, undefined, 'k');
    // a stepped gable over the passage
    for (let i = 0; i < 4; i++) slab(s.brick, B[k], W / 2 - 3.2 + i * 0.8, W / 2 + 3.2 - i * 0.8, H + i * 0.9, H + (i + 1) * 0.9, -0.4, 0, brick, undefined, 'b');
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) slab(s.stone, B[k], sx < 0 ? W / 2 - 3.25 + i * 0.8 : W / 2 + 2.45 - i * 0.8, sx < 0 ? W / 2 - 2.45 + i * 0.8 : W / 2 + 3.25 - i * 0.8, H + (i + 1) * 0.9, H + (i + 1) * 0.9 + 0.1, -0.44, 0.05, stone, undefined, '');
  }
  for (const k of ['left', 'right']) wallBand(s.brick, B[k], -1.2, H, [], brick);
  s.tile.facing([0, -30, 0]);
  const tile = (x, y, z) => _t.set(0xb5532e).multiplyScalar(0.85 + 0.3 * vnoise(x * 0.5, z * 0.7 + y * 0.4));
  for (const sx of [-1, 1]) s.tile.quad([sx * (W / 2), H, -D / 2 + 0.4], [sx * (W / 2), H, D / 2 - 0.4], [0, H + 3.8, D / 2 - 0.4], [0, H + 3.8, -D / 2 + 0.4], tile);
  s.tile.facing(null);
  // the two towers, on the side that faces out of the town
  for (const sx of [-1, 1]) {
    const cx = sx * (W / 2 + 0.6),
      cz = D / 2 + 0.5;
    prism(s.brick, cx, cz, 1.75, 1.6, -1.2, 13.5, 10, brick);
    prism(s.stone, cx, cz, 1.75, 1.75, 13.5, 13.8, 10, stone);
    prism(s.slate, cx, cz, 1.95, 0.08, 13.8, 22.5, 10, slate);
    for (const F of faces(cx, cz, 1.72, 10).filter((_, i) => i % 3 === 0)) pane(s.detail, { ...F, o: at(F, 0, 0, 0.02) }, F.W / 2 - 0.16, F.W / 2 + 0.16, 9.4, 11.2, 0, 0x1e2430);
    const p = new THREE.Vector3(cx, 0, cz).applyMatrix4(M);
    world.colliders.push({ x: p.x, z: p.z, r: 1.9, top: gy + 22 });
  }
  // the walls either side of the passage stop you; the passage itself is open
  for (const sx of [-1, 1]) collide(world, M, sx * (W / 2 - 1.2), 0, 1.35, D / 2 + 0.2, ry, gy + H + 4);
  const c = new THREE.Vector3(0, 0, 0).applyMatrix4(M);
  world.maps?.blob(c.x, c.z, 9, 0.4);
  done(s);
  return { top: gy + 22.5 };
}

// ---------------------------------------------------------------- a brick bridge
// One low arch of brick under a paved hump, with a parapet and stone copings. The deck
// is rise*cos(pi/2 * t/half), which is the shape heightAt gives the ground there.
export function bridge(kit, world, o) {
  const { half = 10.5, wide = 3.3, rise = 2.1 } = o;
  const ry = o.ry ?? 0;
  const M = xf(o.x, 0, o.z, ry);
  const s = soups(kit, M);
  const bc = new THREE.Color(0x8f5038);
  const brick = (x, y, z) => _t.copy(bc).multiplyScalar(0.84 + 0.26 * vnoise(x * 0.6 + z * 0.5, y * 0.7));
  const deckY = (t) => rise * Math.cos((t / half) * Math.PI * 0.5);
  const N = 14;
  for (let i = 0; i < N; i++) {
    const t0 = -half + (i * 2 * half) / N,
      t1 = t0 + (2 * half) / N,
      y0 = deckY(t0),
      y1 = deckY(t1);
    // the paving of the hump
    s.stone.facing([0, -30, 0]);
    s.stone.quad([-wide, y0 + 0.02, t0], [wide, y0 + 0.02, t0], [wide, y1 + 0.02, t1], [-wide, y1 + 0.02, t1], (x, y, z) => _t.set(0xb0a08a).multiplyScalar(0.85 + 0.3 * vnoise(x * 1.5, z * 1.5)));
    s.stone.facing(null);
    for (const sx of [-1, 1]) {
      // the spandrel wall down to the water, cut away under the arch; the parapet above it
      const x = sx * wide;
      const under = (t) => (Math.abs(t) < half * 0.62 ? -2.6 + 3.5 * Math.cos((t / (half * 0.62)) * Math.PI * 0.5) : -2.9);
      s.brick.facing([0, 0, 0]);
      s.brick.quad([x + sx * 0.36, under(t0), t0], [x + sx * 0.36, under(t1), t1], [x + sx * 0.36, y1 + 1.0, t1], [x + sx * 0.36, y0 + 1.0, t0], brick);
      s.brick.facing([sx * 99, 0, 0]);
      s.brick.quad([x, y0, t0], [x, y1, t1], [x, y1 + 1.0, t1], [x, y0 + 1.0, t0], brick);
      s.brick.facing(null);
      s.stone.facing([0, -30, 0]);
      s.stone.quad([x - 0.05 * sx, y0 + 1.0, t0], [x + sx * 0.42, y0 + 1.0, t0], [x + sx * 0.42, y1 + 1.0, t1], [x - 0.05 * sx, y1 + 1.0, t1], STONE);
      s.stone.facing(null);
      // the soffit of the arch
      if (Math.abs((t0 + t1) / 2) < half * 0.62) {
        s.brick.facing([0, -99, 0]);
        if (sx > 0) s.brick.quad([-wide - 0.36, under(t0), t0], [wide + 0.36, under(t0), t0], [wide + 0.36, under(t1), t1], [-wide - 0.36, under(t1), t1], (px, py, pz) => _t.copy(bc).multiplyScalar(0.55));
        s.brick.facing(null);
      }
    }
  }
  for (const sx of [-1, 1]) collide(world, M, sx * (wide + 0.18), 0, 0.25, half, ry, 3.3);
  done(s);
}
