// Edo buildings in the manner of the prints: merchant houses with lattice fronts and
// shop curtains, plastered storehouses, thatched farmhouses, a pagoda and a castle keep.
//
//   machiya(kit, world, { x, z, ry, w, d, R, shop, floors })   a town house; its front is local +z
//   kura(kit, world, { x, z, ry, w, d, R })                    a storehouse
//   minka(kit, world, { x, z, ry, w, d, y, lo, ... })          a thatched farmhouse
//   pagoda(kit, world, { x, z, tiers })    tenshu(kit, world, { x, z, ry })   the castle keep
//
// kit is an EdoKit (kit.js). Lab: /?debug&look=wave&lab=worlds/wave/edo/lab.js
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { rng } from '../../../engine/gl.js';
import { at, wallBand, reveal, pane, slab, cuboid, partMatrix } from '../../../engine/facade.js';
import { EDO } from './kit.js';
import { roof } from './roof.js';

const pick = (R, a) => a[(R() * a.length) | 0];
const _t = new THREE.Color();
const _t2 = new THREE.Color();
const rngAt = (x, z) => rng(Math.abs(Math.floor(x * 73 + z * 131)) + 7);
const SOUPS = ['boards', 'plaster', 'koshi', 'shoji', 'kawara', 'thatch', 'namako', 'stone', 'detail'];
// the four walls of a box as facades (the front is +z)
const sides = (w, d) => ({
  front: { o: [-w / 2, 0, d / 2], u: [1, 0, 0], n: [0, 0, 1], W: w },
  back: { o: [w / 2, 0, -d / 2], u: [-1, 0, 0], n: [0, 0, -1], W: w },
  left: { o: [-w / 2, 0, -d / 2], u: [0, 0, 1], n: [-1, 0, 0], W: d },
  right: { o: [w / 2, 0, d / 2], u: [0, 0, -1], n: [1, 0, 0], W: d },
});
const ALL = ['front', 'back', 'left', 'right'];
const soups = (kit, M) => {
  const s = {};
  for (const n of SOUPS) s[n] = kit.s(n).set(M).facing(null).warp(null);
  return s;
};
const done = (s) => {
  for (const k in s) s[k].set(null).facing(null);
};

// ---------------------------------------------------------------- machiya
// Posts and a lintel across the front; between the posts a fine lattice, or the shop
// lying open under its curtain; a pent roof over that; a low plastered upper floor with
// one long window; a tiled roof with its eaves to the street.
export function machiya(kit, world, o) {
  const R = o.R,
    { w, d } = o;
  const two = (o.floors ?? 2) > 1;
  const g = 2.75,
    hW = g + (two ? 1.95 : 0.4);
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, gy, o.z, o.ry ?? 0);
  const W3 = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const s = soups(kit, M);
  const wood = new THREE.Color(o.wood ?? pick(R, [EDO.TIMBER, 0x5a4230, 0x6b5038, 0x3f2e22]));
  const pale = wood.clone().lerp(new THREE.Color(0xc9a878), 0.55);
  const wallC = new THREE.Color(o.plaster ?? pick(R, [EDO.PLASTER, EDO.CREAM, 0xe8dcc0, 0xd9ccae]));
  const tileC = new THREE.Color(o.tile ?? pick(R, EDO.TILE));
  const cloth = o.cloth ?? pick(R, [EDO.INDIGO, 0x24487f, 0x7a2f2a, 0x5a4a2a, 0x1f5a5a, EDO.VERM, 0x2f2f3a]);
  const F = sides(w, d);
  const zf = d / 2;
  const tileCol = (x) => _t.copy(tileC).multiplyScalar(0.94 + 0.12 * (0.5 + 0.5 * Math.sin(x * 1.7 + o.x)));

  // stone footing, a step wider at the front
  cuboid(s.stone, [-w / 2 - 0.12, -1.3, -d / 2 - 0.12], [w / 2 + 0.12, 0.22, zf + 0.4], EDO.STONE, undefined, 'b');
  // board walls at the sides and back, plaster in the gables
  const B = d / 2 + 0.75,
    eave = hW - 0.375,
    rise = B * 0.5,
    ridge = eave + rise;
  for (const k of ['left', 'right', 'back']) wallBand(s.boards, F[k], 0.22, hW, [], wood);
  for (const k of ['left', 'right']) s.plaster.tri(at(F[k], 0, hW), at(F[k], d, hW), at(F[k], d / 2, ridge - 0.05), wallC);

  // the front: posts, lintel, and what stands between the posts
  const nb = Math.max(2, Math.round(w / 1.85)),
    bw = w / nb;
  for (let i = 0; i <= nb; i++) {
    const x = -w / 2 + i * bw;
    cuboid(s.detail, [x - 0.085, 0.22, zf - 0.085], [x + 0.085, hW, zf + 0.085], wood, undefined, 'b');
  }
  cuboid(s.detail, [-w / 2 - 0.06, g - 0.2, zf - 0.1], [w / 2 + 0.06, g + 0.02, zf + 0.1], wood, undefined, '');
  const doorBay = o.shop ? -1 : (R() * nb) | 0;
  const dim = new THREE.Color(0x2a2420);
  for (let i = 0; i < nb; i++) {
    const x0 = i * bw + 0.085,
      x1 = (i + 1) * bw - 0.085;
    const open = o.shop ? nb <= 2 || (i > 0 && i < nb - 1) : i === doorBay;
    if (open) {
      reveal(s.detail, F.front, { x0, x1, y0: 0.22, y1: g - 0.2 }, 1.0, dim, wood);
      pane(s.detail, F.front, x0, x1, 0.22, g - 0.2, -1.0, o.shop ? 0x6a5236 : 0x1c1814);
      if (o.shop) {
        // the raised shop floor, with a bale or a chest on it
        slab(s.boards, F.front, x0, x1, 0.22, 0.6, -1.0, -0.15, pale, undefined, 'kb');
        for (let k = 0; k < 2; k++) {
          const gw = 0.35 + R() * 0.3,
            gh = 0.3 + R() * 0.35,
            gx = x0 + 0.2 + R() * Math.max(0.1, x1 - x0 - gw - 0.4);
          slab(s.detail, F.front, gx, gx + gw, 0.6, 0.6 + gh, -0.75, -0.3, pick(R, [0xd8c48a, 0x8a6a44, 0xc9d2d8, 0x7a2f2a, 0x2f548a]), undefined, 'kb');
        }
      }
      kit.place('noren', partMatrix(M, F.front, x0 + 0.03, g - 0.21, x1 - x0 - 0.06, o.shop ? 0.72 : 1.0), cloth);
    } else {
      pane(s.koshi, F.front, x0, x1, 0.78, g - 0.2, -0.03, pale);
      pane(s.boards, F.front, x0, x1, 0.22, 0.78, -0.02, wood);
    }
  }

  // the pent roof over the shopfront
  const py0 = g + 0.45,
    py1 = g - 0.02,
    pz1 = zf + 1.0,
    px = w / 2 + 0.12;
  s.kawara.facing([0, -30, 0]);
  s.kawara.quad([-px, py1, pz1], [px, py1, pz1], [px, py0, zf], [-px, py0, zf], tileCol);
  s.kawara.facing([0, py1, 0]);
  s.kawara.quad([-px, py1 - 0.14, pz1], [px, py1 - 0.14, pz1], [px, py1, pz1], [-px, py1, pz1], tileC.clone().multiplyScalar(0.7));
  s.kawara.facing(null);
  s.detail.facing([0, 40, 0]);
  s.detail.quad([-px, py1 - 0.14, pz1], [px, py1 - 0.14, pz1], [px, py0 - 0.2, zf], [-px, py0 - 0.2, zf], wood.clone().multiplyScalar(0.7));
  s.detail.facing(null);

  // the upper floor
  if (two) {
    const op = { x0: 0.5, x1: w - 0.5, y0: g + 0.62, y1: g + 1.5 };
    wallBand(s.plaster, F.front, g, hW, [op], wallC);
    reveal(s.detail, F.front, op, 0.14, wood);
    if (R() < 0.5) pane(s.shoji, F.front, op.x0, op.x1, op.y0, op.y1, -0.14, EDO.PAPER, { em: 0.85 });
    else pane(s.koshi, F.front, op.x0, op.x1, op.y0, op.y1, -0.14, pale);
    slab(s.detail, F.front, op.x0 - 0.1, op.x1 + 0.1, op.y0 - 0.1, op.y0, 0, 0.1, wood, undefined, 'k');
  } else wallBand(s.plaster, F.front, g, hW, [], wallC);

  roof(s.kawara, s.detail, { A: w / 2 + 0.16, B, y: eave, h: rise, type: 'gable', hollow: 0, lift: 0, thick: 0.2, col: tileCol, edge: tileC.clone().multiplyScalar(0.72), over: 0.75, under: wood.clone().multiplyScalar(0.7) });

  // what hangs on it and stands before it
  if (o.shop && R() < 0.75) kit.place('kanban', partMatrix(M, F.front, R() < 0.5 ? 0.3 : w - 0.3, g + (two ? 1.75 : 0.3), 1, 1), pick(R, [0xd9c9a0, 0x8a6a44, 0xe9dfc6]));
  if (R() < (o.shop ? 0.85 : 0.4)) {
    const lx = 0.3 + R() * (w - 0.6);
    const red = R() < 0.35;
    kit.place('chochin', partMatrix(M, { ...F.front, o: at(F.front, 0, 0, 0.82) }, lx, g - 0.12, 1, 1), red ? 0xf0623f : EDO.PAPER);
    const p = W3(-w / 2 + lx, g - 0.5, zf + 0.82);
    world.glows?.push({ p: [p.x, p.y, p.z], c: red ? 0xff8a5a : 0xffd58a, size: 1.5 });
    const q = W3(-w / 2 + lx, 0, zf + 1.6);
    world.maps?.lamp(q.x, q.z, 5.5, 0xffc878, 0.6);
  }
  if (R() < 0.3) kit.place('tensui', M.clone().multiply(new THREE.Matrix4().makeTranslation((R() < 0.5 ? -1 : 1) * (w / 2 - 0.55), 0.22, zf + 0.78)), 0xffffff);
  if (o.shop && R() < 0.5) kit.place('bench', M.clone().multiply(new THREE.Matrix4().makeTranslation((R() - 0.5) * Math.max(0, w - 2.4), 0.02, zf + 1.4)), 0xffffff);
  done(s);
  return { top: ridge };
}

// ---------------------------------------------------------------- kura
// A fireproof storehouse: thick white walls over a dado of diagonal tiles, small
// windows with plaster shutters standing open, a heavy door, a roof edged in plaster.
export function kura(kit, world, o) {
  const R = o.R,
    { w, d } = o,
    h = o.h ?? 5.2;
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, gy, o.z, o.ry ?? 0);
  const s = soups(kit, M);
  const F = sides(w, d);
  const white = new THREE.Color(0xf2ece0),
    tileC = new THREE.Color(pick(R, EDO.TILE)),
    dark = new THREE.Color(0x30353c);
  cuboid(s.stone, [-w / 2 - 0.2, -1.3, -d / 2 - 0.2], [w / 2 + 0.2, 0.25, d / 2 + 0.2], EDO.STONE, undefined, 'b');
  const door = { x0: w / 2 - 0.7, x1: w / 2 + 0.7, y0: 0.25, y1: 2.35 };
  for (const k of ALL) {
    const Fk = F[k],
      front = k === 'front';
    wallBand(s.namako, Fk, 0.25, 1.4, front ? [{ ...door, y1: 1.4 }] : [], dark);
    wallBand(s.plaster, Fk, 1.4, 2.6, front ? [{ ...door, y0: 1.4 }] : [], white);
    const wo = k === 'back' ? [] : [{ x0: Fk.W / 2 - 0.38, x1: Fk.W / 2 + 0.38, y0: 3.3, y1: 4.15 }];
    wallBand(s.plaster, Fk, 2.6, h, wo, white);
    for (const op of wo) {
      reveal(s.detail, Fk, op, 0.3, 0xd8d2c4);
      pane(s.detail, Fk, op.x0, op.x1, op.y0, op.y1, -0.3, 0x1c1c22);
      // the thick plaster shutters, standing open
      for (const x of [op.x0 - 0.12, op.x1]) slab(s.plaster, Fk, x, x + 0.12, op.y0 - 0.05, op.y1 + 0.05, 0, 0.42, white, undefined, 'k');
      slab(s.plaster, Fk, op.x0 - 0.2, op.x1 + 0.2, op.y1 + 0.05, op.y1 + 0.2, 0, 0.18, white, undefined, 'k');
    }
  }
  reveal(s.detail, F.front, door, 0.4, 0xd8d2c4);
  pane(s.boards, F.front, door.x0, door.x1, door.y0, door.y1, -0.4, 0x3a2a1e);
  slab(s.plaster, F.front, door.x0 - 0.3, door.x0, 0.25, door.y1 + 0.3, 0, 0.14, white, undefined, 'k');
  slab(s.plaster, F.front, door.x1, door.x1 + 0.3, 0.25, door.y1 + 0.3, 0, 0.14, white, undefined, 'k');
  slab(s.plaster, F.front, door.x0 - 0.3, door.x1 + 0.3, door.y1, door.y1 + 0.3, 0, 0.14, white, undefined, 'k');
  const B = d / 2 + 0.5,
    eave = h - 0.3,
    rise = B * 0.6,
    ridge = eave + rise;
  for (const k of ['left', 'right']) {
    const Fk = F[k];
    s.plaster.tri(at(Fk, 0, h), at(Fk, d, h), at(Fk, d / 2, ridge - 0.06), white);
    // the house crest in the gable
    const cy = h + rise * 0.3;
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * 6.283,
        a1 = ((i + 1) / 10) * 6.283;
      s.detail.tri(at(Fk, d / 2, cy, 0.02), at(Fk, d / 2 + Math.cos(a0) * 0.32, cy + Math.sin(a0) * 0.32, 0.02), at(Fk, d / 2 + Math.cos(a1) * 0.32, cy + Math.sin(a1) * 0.32, 0.02), 0x22242c);
    }
  }
  roof(s.kawara, s.detail, { A: w / 2 + 0.35, B, y: eave, h: rise, type: 'gable', hollow: 0, thick: 0.3, col: tileC, edge: 0xe8e2d4, over: 0.5, under: 0xe0dacb });
  done(s);
  return { top: ridge };
}

// ---------------------------------------------------------------- minka
// A farmer's or fisherman's house: board and plaster walls on a stone footing, paper
// screens along a veranda, and a great hipped roof of thatch with poles crossed on its ridge.
// Heights are absolute here (y = floor level, lo = lowest ground under it), as the prints give them.
export function minka(kit, world, o) {
  const { w, d } = o;
  const h = o.h ?? 2.5;
  const y = o.y ?? world.heightAt(o.x, o.z) + 0.1,
    lo = o.lo ?? y - 0.5;
  const M = xf(o.x, 0, o.z, o.ry ?? 0);
  const s = soups(kit, M);
  const F = sides(w, d);
  const wallC = new THREE.Color(o.wall ?? 0xdccfa8),
    wood = new THREE.Color(EDO.TIMBER);
  cuboid(s.stone, [-w / 2 - 0.3, lo - 0.6, -d / 2 - 0.3], [w / 2 + 0.3, y, d / 2 + 0.3], EDO.STONE_D, undefined, 'b');
  for (const k of ALL) {
    const Fk = F[k];
    wallBand(s.boards, Fk, y, y + 0.85, [], wood);
    const ops = k === 'front' ? [{ x0: Fk.W * 0.42, x1: Fk.W - 0.45, y0: y + 0.85, y1: y + h - 0.35 }] : [];
    wallBand(s.plaster, Fk, y + 0.85, y + h, ops, wallC);
    for (const op of ops) {
      reveal(s.detail, Fk, op, 0.1, wood);
      if (o.lit === false) pane(s.shoji, Fk, op.x0, op.x1, op.y0, op.y1, -0.1, 0xe8e0cc);
      else pane(s.shoji, Fk, op.x0, op.x1, op.y0, op.y1, -0.1, EDO.PAPER, { em: 0.8 });
    }
    for (const x of [0.09, Fk.W - 0.09]) slab(s.detail, Fk, x - 0.09, x + 0.09, y, y + h, 0, 0.07, wood, undefined, 'k');
    slab(s.detail, Fk, 0, Fk.W, y + h - 0.2, y + h, 0, 0.08, wood, undefined, 'k');
  }
  // the door, and the veranda under the screens
  const dx = w / 2 + (o.door ?? -w * 0.2);
  slab(s.boards, F.front, dx - 0.5, dx + 0.5, y, y + 1.85, 0, 0.05, 0x3a2a1e, undefined, 'k');
  slab(s.boards, F.front, w * 0.4, w - 0.3, y - 0.3, y + 0.36, 0, 0.95, EDO.WEATHER, undefined, 'k');

  // the thatch: its ridge follows the longer side
  const turned = d > w;
  const rh = o.roofH ?? Math.min(w, d) * 0.6;
  const Mr = turned ? M.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)) : M;
  const tA = (turned ? d : w) / 2 + 0.9,
    tB = (turned ? w : d) / 2 + 0.9;
  s.thatch.set(Mr);
  s.detail.set(Mr);
  const ey = y + h - 0.15;
  const thC = (px, py) => _t.set(EDO.THATCH_D).lerp(_t2.set(EDO.THATCH), Math.min(1, Math.max(0, (py - ey) / rh + 0.25)));
  roof(s.thatch, s.detail, { A: tA, B: tB, y: ey, h: rh, type: 'hip', hollow: 0.12, lift: 0, thick: 0.45, col: thC, edge: EDO.THATCH_D, over: 0.9, under: 0x4a3a28, ridgeH: 0.3 });
  // poles crossed over the ridge
  const r0 = tA - tB;
  for (const k of r0 > 1.2 ? [-0.7, 0, 0.7] : [0])
    for (const sg of [1, -1]) {
      const a = [k * r0, ey + rh - 0.3, sg * 0.6],
        b = [k * r0, ey + rh + 0.75, -sg * 0.32];
      s.detail.quad([a[0] - 0.05, a[1], a[2]], [a[0] + 0.05, a[1], a[2]], [b[0] + 0.05, b[1], b[2]], [b[0] - 0.05, b[1], b[2]], wood);
      s.detail.quad([a[0] + 0.05, a[1], a[2]], [a[0] - 0.05, a[1], a[2]], [b[0] - 0.05, b[1], b[2]], [b[0] + 0.05, b[1], b[2]], wood);
    }
  done(s);
  return { y, top: ey + rh };
}

// ---------------------------------------------------------------- pagoda
// Storeys of white wall and vermilion post, each under a deep roof whose corners lift,
// and a bronze spire of rings.
export function pagoda(kit, world, o) {
  const tiers = o.tiers ?? 3,
    w0 = o.w ?? 7.4;
  const y = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, y, o.z, o.ry ?? 0);
  const s = soups(kit, M);
  const verm = new THREE.Color(EDO.VERM),
    white = new THREE.Color(EDO.PLASTER),
    tileC = new THREE.Color(0x3d4c5c);
  cuboid(s.stone, [-w0 / 2 - 1.2, -1.5, -w0 / 2 - 1.2], [w0 / 2 + 1.2, 0.5, w0 / 2 + 1.2], EDO.STONE, undefined, 'b');
  const step = 3.9,
    hh = 3.0;
  for (let i = 0; i < tiers; i++) {
    const wi = w0 * (1 - i * 0.17),
      by = 0.5 + i * step,
      F = sides(wi, wi);
    for (const k of ALL) {
      const Fk = F[k],
        op = { x0: wi / 2 - 0.7, x1: wi / 2 + 0.7, y0: by + 0.5, y1: by + 2.2 };
      wallBand(s.plaster, Fk, by, by + hh, [op], white);
      reveal(s.detail, Fk, op, 0.12, verm);
      if (i === 0) pane(s.boards, Fk, op.x0, op.x1, op.y0, op.y1, -0.12, 0x3a2a1e);
      else pane(s.shoji, Fk, op.x0, op.x1, op.y0, op.y1, -0.12, EDO.PAPER, { em: 0.7 });
      for (const x of [0.14, wi * 0.28, wi * 0.72, wi - 0.14]) slab(s.detail, Fk, x - 0.14, x + 0.14, by, by + hh, 0, 0.1, verm, undefined, 'k');
      slab(s.detail, Fk, -0.2, wi + 0.2, by + hh - 0.3, by + hh, 0, 0.22, verm, undefined, 'k');
      slab(s.detail, Fk, -0.3, wi + 0.3, by - 0.12, by + 0.1, 0, 0.5, verm, undefined, 'k');
    }
    const A = wi / 2 + 2.3;
    roof(s.kawara, s.detail, { A, B: A, y: by + hh - 0.1, h: 1.7, type: 'hip', hollow: 0.55, lift: 0.75, thick: 0.24, col: tileC, edge: 0x2f3b48, over: 2.2, under: verm.clone().multiplyScalar(0.8), ridgeH: 0.02 });
  }
  const top = 0.5 + (tiers - 1) * step + hh + 1.5;
  s.detail.add(new THREE.CylinderGeometry(0.07, 0.16, 5.2, 6), EDO.GOLD, new THREE.Matrix4().makeTranslation(0, top + 2.6, 0));
  for (let k = 0; k < 7; k++) s.detail.add(new THREE.CylinderGeometry(0.5 - k * 0.045, 0.5 - k * 0.045, 0.07, 10), EDO.GOLD, new THREE.Matrix4().makeTranslation(0, top + 1.2 + k * 0.5, 0));
  done(s);
  return { top: y + top + 5.2 };
}

// ---------------------------------------------------------------- tenshu
// The castle keep: a battered base of fitted stone, three white storeys each stepping in
// over the roof below, a hip-and-gable roof on top with golden fish on its ridge.
export function tenshu(kit, world, o) {
  const y = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, y, o.z, o.ry ?? 0);
  const s = soups(kit, M);
  const white = new THREE.Color(0xf4efe4),
    tileC = new THREE.Color(o.tile ?? 0x47606a),
    wood = new THREE.Color(0x2e2a28);
  // the base: shallow at the foot, upright at the top
  const b0 = [14, 12],
    b1 = [10.6, 8.6],
    bh = 7,
    N = 6;
  const hx = (t) => b1[0] + (b0[0] - b1[0]) * (1 - t) ** 2,
    hz = (t) => b1[1] + (b0[1] - b1[1]) * (1 - t) ** 2;
  s.stone.facing([0, bh / 2, 0]);
  for (let j = 0; j < N; j++) {
    const t0 = j / N,
      t1 = (j + 1) / N,
      y0 = -2 + (bh + 2) * t0,
      y1 = -2 + (bh + 2) * t1;
    const c0 = [[-hx(t0), y0, hz(t0)], [hx(t0), y0, hz(t0)], [hx(t0), y0, -hz(t0)], [-hx(t0), y0, -hz(t0)]];
    const c1 = [[-hx(t1), y1, hz(t1)], [hx(t1), y1, hz(t1)], [hx(t1), y1, -hz(t1)], [-hx(t1), y1, -hz(t1)]];
    for (let k = 0; k < 4; k++) s.stone.quad(c0[k], c0[(k + 1) % 4], c1[(k + 1) % 4], c1[k], EDO.STONE);
  }
  s.stone.facing(null);
  const tier = (ax, az, y0, hh) => {
    const F = sides(ax * 2, az * 2);
    for (const k of ALL) {
      const Fk = F[k],
        ops = [];
      const n = Math.max(2, Math.round(Fk.W / 2.6));
      for (let i = 0; i < n; i++) {
        const c = ((i + 0.5) * Fk.W) / n;
        ops.push({ x0: c - 0.3, x1: c + 0.3, y0: y0 + hh * 0.48, y1: y0 + hh * 0.48 + 0.95 });
      }
      wallBand(s.boards, Fk, y0, y0 + hh * 0.3, [], wood);
      wallBand(s.plaster, Fk, y0 + hh * 0.3, y0 + hh, ops, white);
      for (const op of ops) {
        reveal(s.detail, Fk, op, 0.15, 0xd8d2c4);
        pane(s.detail, Fk, op.x0, op.x1, op.y0, op.y1, -0.15, 0x1c1c22);
      }
    }
  };
  const rf = (A, B, yy, h, type = 'hip', more = {}) => roof(s.kawara, s.detail, { A, B, y: yy, h, type, hollow: 0.5, lift: 0.7, thick: 0.3, col: tileC, edge: 0xe8e2d4, over: 1.8, under: 0xe0dacb, ridgeH: 0.02, ...more });
  tier(10.2, 8.2, bh, 4.4);
  rf(12.2, 10.2, bh + 4.3, 3.2);
  tier(7.6, 5.8, bh + 5.0, 4.2);
  rf(9.4, 7.6, bh + 9.1, 2.9);
  tier(5.2, 4.0, bh + 9.8, 3.9);
  const topR = rf(6.9, 5.7, bh + 13.6, 3.6, 'irimoya', { tg: 0.5, ridgeH: 0.34 });
  // a triangular gable breaking the first roof, front and back
  for (const sg of [1, -1]) {
    const z0 = sg * 8.7,
      z1 = sg * 5.6,
      yb = bh + 4.3 + 0.5,
      ya = yb + 2.3;
    s.plaster.facing([0, yb, 0]);
    s.plaster.tri([-2.3, yb, z0], [2.3, yb, z0], [0, ya, z0], white);
    s.plaster.facing(null);
    s.kawara.facing([0, yb - 30, 0]);
    s.kawara.quad([-2.9, yb - 0.15, z0 + sg * 0.35], [0, ya + 0.3, z0 + sg * 0.35], [0, ya + 0.3, z1], [-2.9, yb + 1.4, z1], tileC);
    s.kawara.quad([2.9, yb - 0.15, z0 + sg * 0.35], [0, ya + 0.3, z0 + sg * 0.35], [0, ya + 0.3, z1], [2.9, yb + 1.4, z1], tileC);
    s.kawara.facing(null);
  }
  // golden fish on the ridge
  for (const sx of [1, -1]) {
    const x = sx * topR.ridgeHalf,
      ty = topR.ridgeY + 0.5;
    s.detail.facing([x, ty + 0.4, 0]);
    s.detail.quad([x - 0.2, ty, -0.14], [x + 0.2, ty, -0.14], [x + sx * 0.05, ty + 1.1, -0.05], [x - sx * 0.3, ty + 0.9, -0.05], EDO.GOLD, { em: 0.25 });
    s.detail.quad([x - 0.2, ty, 0.14], [x + 0.2, ty, 0.14], [x + sx * 0.05, ty + 1.1, 0.05], [x - sx * 0.3, ty + 0.9, 0.05], EDO.GOLD, { em: 0.25 });
    s.detail.facing(null);
  }
  done(s);
  return { top: y + topR.ridgeY + 1.6, base: [b0[0], b0[1]] };
}

export { rngAt };
