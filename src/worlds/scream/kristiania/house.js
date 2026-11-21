// The houses of Kristiania in the 1890s.
//
//   townHouse(kit, world, { x, z, ry, w, d, R, floors, clad, lit, wall, roof })
//       eaves to the street: a board house painted ochre, ox-blood or white with white
//       frames (clad 'boards'), or a plastered block of flats with a cornice ('plaster')
//   warehouse(kit, world, { x, z, ry, w, d, R })
//       a tall wooden shed on the quay, gable to the water, loading doors one above another
//       under a hoist
//
// The front is local +z. kit is a KristianiaKit. Lab: /?debug&look=scream&lab=worlds/scream/kristiania/lab.js
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { at, wallBand, reveal, pane, slab, cuboid, partMatrix } from '../../../engine/facade.js';
import { vnoise } from '../../../engine/gl.js';
import { KR } from './kit.js';

const pick = (R, a) => a[(R() * a.length) | 0];
const _t = new THREE.Color();
const SOUPS = ['boards', 'plaster', 'brick', 'roof', 'stone', 'detail'];
export const sides = (w, d) => ({
  front: { o: [-w / 2, 0, d / 2], u: [1, 0, 0], n: [0, 0, 1], W: w },
  back: { o: [w / 2, 0, -d / 2], u: [-1, 0, 0], n: [0, 0, -1], W: w },
  left: { o: [-w / 2, 0, -d / 2], u: [0, 0, 1], n: [-1, 0, 0], W: d },
  right: { o: [w / 2, 0, d / 2], u: [0, 0, -1], n: [1, 0, 0], W: d },
});
const BASE = -1.4;
// the kit's soups, set to draw at M; shut() hands them back as they were
export const open = (kit, M) => {
  const s = {};
  for (const n of SOUPS) s[n] = kit.s(n).set(M).facing(null).warp(null);
  return s;
};
export const shut = (s) => {
  for (const k in s) s[k].set(null).facing(null);
};
// a lit window, or a dark one with the last of the sky in it
function glaze(s, R, F, op, lit, depth = 0.1) {
  const on = R() < lit;
  const c = new THREE.Color(on ? pick(R, KR.LIT) : KR.DARK).multiplyScalar(on ? 0.85 + R() * 0.3 : 0.7 + R() * 0.7);
  reveal(s.detail, F, op, depth, 0x2a2430);
  pane(s.detail, F, op.x0, op.x1, op.y0, op.y1, -depth, on ? (x, y) => _t.copy(c).multiplyScalar(1.1 - 0.3 * ((y - op.y0) / (op.y1 - op.y0))) : c, { em: on ? 1 : 0 });
  return on;
}

// ---------------------------------------------------------------- a house on a street
export function townHouse(kit, world, o) {
  const R = o.R,
    { w, d } = o;
  const plaster = (o.clad ?? 'boards') === 'plaster';
  const floors = Math.max(1, o.floors ?? (plaster ? 3 : 2));
  const fH = plaster ? 3.4 : 2.9,
    plinth = 0.55,
    hW = plinth + floors * fH + 0.35;
  const pitch = plaster ? 0.5 : 0.62 + R() * 0.2,
    over = 0.4,
    rise = (d / 2 + over) * Math.tan(pitch);
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const lean = (R() - 0.5) * 0.03; // nothing in this picture stands quite straight
  const M = xf(o.x, gy, o.z, o.ry ?? 0).multiply(new THREE.Matrix4().set(1, lean, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
  const W3 = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const s = open(kit, M);
  const F = sides(w, d),
    zf = d / 2;
  const wc = new THREE.Color(o.wall ?? pick(R, plaster ? KR.PLASTER : KR.BOARD));
  const seed = o.x * 0.31 + o.z * 0.57;
  const wallCol = (x, y, z) => _t.copy(wc).multiplyScalar((0.8 + 0.2 * Math.min(1, Math.max(0, y / 3))) * (0.88 + 0.24 * vnoise(x * 0.5 + z * 0.4 + seed, y * 0.5 + seed)));
  const wall = plaster ? s.plaster : s.boards;
  const slate = pick(R, KR.ROOF),
    roofC = new THREE.Color(o.roof ?? slate);
  const roofCol = (x, y, z) => _t.copy(roofC).multiplyScalar(0.8 + 0.4 * vnoise(x * 0.5 + seed, z * 0.6 + y * 0.4));
  const lit = o.lit ?? 0.55;
  const doorC = pick(R, [0x3a2a22, 0x2a3a4a, 0x5a2a24, 0x2f4a3a, 0x4a3a2a]);

  // a stone plinth under everything
  for (const k of ['front', 'back', 'left', 'right']) wallBand(s.stone, { ...F[k], o: at(F[k], 0, 0, 0.04) }, BASE, plinth, [], (x, y) => _t.set(KR.STONE).multiplyScalar(0.75 + 0.3 * vnoise(x * 1.2, y * 1.2)));
  // the front: windows in even bays, a door in one of them at street level
  const nb = Math.max(2, Math.round(w / (plaster ? 2.3 : 2.1))),
    bw = w / nb,
    doorBay = (R() * nb) | 0;
  const ww = plaster ? 1.0 : 0.95;
  for (let f = 0; f < floors; f++) {
    const y0 = plinth + f * fH,
      ops = [];
    for (let i = 0; i < nb; i++) {
      const cx = (i + 0.5) * bw;
      if (f === 0 && i === doorBay) ops.push({ x0: cx - 0.52, x1: cx + 0.52, y0: plinth + 0.02, y1: plinth + 2.25, kind: 'door' });
      else ops.push({ x0: cx - ww / 2, x1: cx + ww / 2, y0: y0 + 0.85, y1: y0 + 0.85 + (plaster ? 1.75 : 1.45), kind: 'window' });
    }
    wallBand(wall, F.front, f ? y0 : plinth, f === floors - 1 ? hW : y0 + fH, ops, wallCol);
    for (const op of ops) {
      if (op.kind === 'door') {
        reveal(s.detail, F.front, op, 0.1, 0x2a2430);
        kit.place('door', partMatrix(M, F.front, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), doorC);
      } else {
        const on = glaze(s, R, F.front, op, lit);
        kit.place('window', partMatrix(M, F.front, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), 0xffffff);
        // lamplight from a ground-floor window lies on the street
        if (on && f === 0 && R() < 0.5) {
          const q = W3(-w / 2 + (op.x0 + op.x1) / 2, 0, zf + 1.6);
          world.maps?.lamp(q.x, q.z, 3.6, 0xffb860, 0.45);
        }
      }
    }
    // a plastered front has a moulding at every floor; a board house only its corner boards
    if (plaster) slab(s.detail, F.front, -0.04, w + 0.04, y0 + fH - 0.12, y0 + fH + 0.08, 0, 0.08, KR.TRIM, undefined, 'k');
  }
  for (const k of ['front', 'back']) for (const x of [0, F[k].W - 0.16]) slab(s.detail, F[k], x, x + 0.16, plinth, hW, 0, 0.05, KR.TRIM, undefined, 'kb');
  if (plaster) slab(s.detail, F.front, -0.12, w + 0.12, hW - 0.3, hW, 0, 0.26, KR.TRIM, undefined, 'k');
  // the back and the ends: fewer windows, and the gables
  const backOps = [];
  for (let f = 0; f < floors; f++) for (let i = 0; i < Math.max(1, nb - 1); i++) backOps.push({ f, x0: ((i + 0.5) * w) / Math.max(1, nb - 1) - 0.42, x1: ((i + 0.5) * w) / Math.max(1, nb - 1) + 0.42, y0: plinth + f * fH + 0.95, y1: plinth + f * fH + 2.25 });
  for (let f = 0; f < floors; f++) {
    const ops = backOps.filter((p) => p.f === f);
    wallBand(wall, F.back, plinth + f * fH, f === floors - 1 ? hW : plinth + (f + 1) * fH, ops, wallCol);
    for (const op of ops) glaze(s, R, F.back, op, lit * 0.7);
  }
  for (const k of ['left', 'right']) {
    const op = floors > 1 ? [{ x0: d / 2 - 0.42, x1: d / 2 + 0.42, y0: plinth + fH + 0.95, y1: plinth + fH + 2.25 }] : [];
    wallBand(wall, F[k], plinth, hW, op, wallCol);
    for (const p of op) glaze(s, R, F[k], p, lit * 0.6);
    wall.tri(at(F[k], -over * 0.2, hW), at(F[k], d + over * 0.2, hW), at(F[k], d / 2, hW + rise - 0.06), wallCol);
    // an attic window in the gable
    if (rise > 2.4) {
      const a = { x0: d / 2 - 0.38, x1: d / 2 + 0.38, y0: hW + 0.35, y1: hW + 1.35 };
      pane(s.detail, F[k], a.x0, a.x1, a.y0, a.y1, 0.02, R() < lit * 0.5 ? pick(R, KR.LIT) : KR.DARK, { em: 0.9 });
      for (const [p, q, r2, t] of [[a.x0 - 0.08, a.x0, a.y0, a.y1], [a.x1, a.x1 + 0.08, a.y0, a.y1], [a.x0 - 0.08, a.x1 + 0.08, a.y1, a.y1 + 0.08]]) pane(s.detail, F[k], p, q, r2, t, 0.04, KR.TRIM);
    }
  }
  // the roof: its eaves to the street, a board along each verge
  const ex = w / 2 + 0.3,
    ez = d / 2 + over;
  s.roof.facing([0, hW - 30, 0]);
  for (const sz of [-1, 1]) s.roof.quad([-ex, hW, sz * ez], [ex, hW, sz * ez], [ex, hW + rise, 0], [-ex, hW + rise, 0], roofCol);
  s.roof.facing(null);
  cuboid(s.roof, [-ex, hW + rise - 0.04, -0.14], [ex, hW + rise + 0.1, 0.14], roofC.clone().multiplyScalar(0.7), undefined, 'b');
  for (const sz of [-1, 1]) cuboid(s.detail, [-ex, hW - 0.16, sz > 0 ? ez - 0.06 : -ez], [ex, hW + 0.02, sz > 0 ? ez : -ez + 0.06], plaster ? KR.TRIM : wc.clone().multiplyScalar(0.6), undefined, '');
  // a dormer looking over the street, on some
  if (floors < 3 && w > 7 && R() < 0.5) {
    const dw = 1.5,
      dy = hW + rise * 0.28,
      dz = ez * (1 - 0.28) + 0.02,
      dh = 1.5;
    const Fd = { o: [-dw / 2, 0, dz], u: [1, 0, 0], n: [0, 0, 1], W: dw };
    const op = { x0: 0.3, x1: dw - 0.3, y0: dy + 0.25, y1: dy + dh - 0.15 };
    wallBand(wall, Fd, dy - 0.2, dy + dh, [op], wallCol);
    wall.tri(at(Fd, 0, dy + dh), at(Fd, dw, dy + dh), at(Fd, dw / 2, dy + dh + 0.65), wallCol);
    glaze(s, R, Fd, op, lit);
    kit.place('window', partMatrix(M, Fd, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), 0xffffff);
    for (const sx of [-1, 1]) {
      wall.facing([0, dy, dz - 0.5]);
      wall.quad([sx * dw * 0.5, dy - 0.2, dz], [sx * dw * 0.5, dy - 0.2, dz - 2.2], [sx * dw * 0.5, dy + dh, dz - 2.2], [sx * dw * 0.5, dy + dh, dz], wallCol);
      wall.facing(null);
      s.roof.facing([0, dy - 9, dz - 1]);
      s.roof.quad([sx * (dw / 2 + 0.2), dy + dh - 0.05, dz + 0.2], [0, dy + dh + 0.7, dz + 0.2], [0, dy + dh + 0.7, dz - 2.4], [sx * (dw / 2 + 0.2), dy + dh - 0.05, dz - 2.4], roofCol);
      s.roof.facing(null);
    }
  }
  // chimneys of brick, with a pot
  for (let k = 0, nc = 1 + (w > 8 ? 1 : 0); k < nc; k++) {
    const cx = (nc === 1 ? (R() - 0.5) * 0.4 : (k - 0.5) * 0.6) * w,
      cz = (R() - 0.5) * 1.2,
      ct = hW + rise + 0.7 + R() * 0.5;
    cuboid(s.brick, [cx - 0.34, hW + rise - 1.2, cz - 0.3], [cx + 0.34, ct, cz + 0.3], (x, y, z) => _t.set(0x7a3a2a).multiplyScalar(0.8 + 0.3 * vnoise(x * 3, y * 3)), undefined, 'b');
    cuboid(s.stone, [cx - 0.4, ct, cz - 0.36], [cx + 0.4, ct + 0.1, cz + 0.36], KR.STONE_D, undefined, '');
  }
  shut(s);
  return { top: hW + rise + 0.6, hW, ridge: hW + rise, doorX: -w / 2 + (doorBay + 0.5) * bw };
}

// ---------------------------------------------------------------- a warehouse on the quay
export function warehouse(kit, world, o) {
  const R = o.R,
    { w, d } = o;
  const floors = o.floors ?? 3 + (R() < 0.4 ? 1 : 0),
    fH = 2.7,
    hW = 0.4 + floors * fH,
    rise = (w / 2) * (0.85 + R() * 0.25);
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const lean = (R() - 0.5) * 0.035;
  const M = xf(o.x, gy, o.z, o.ry ?? 0).multiply(new THREE.Matrix4().set(1, lean, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
  const s = open(kit, M);
  const F = sides(w, d),
    zf = d / 2;
  const wc = new THREE.Color(o.wall ?? pick(R, KR.SHED));
  const seed = o.x * 0.31 + o.z * 0.57;
  const wallCol = (x, y, z) => _t.copy(wc).multiplyScalar((0.75 + 0.25 * Math.min(1, Math.max(0, y / 4))) * (0.85 + 0.3 * vnoise(x * 0.5 + z * 0.4 + seed, y * 0.4 + seed)));
  const roofC = new THREE.Color(pick(R, KR.ROOF));
  const roofCol = (x, y, z) => _t.copy(roofC).multiplyScalar(0.8 + 0.4 * vnoise(x * 0.5 + seed, z * 0.6 + y * 0.4));
  const doorC = wc.clone().multiplyScalar(0.62);
  for (const k of ['front', 'back', 'left', 'right']) wallBand(s.stone, { ...F[k], o: at(F[k], 0, 0, 0.04) }, BASE, 0.4, [], KR.STONE_D);
  // gable ends: a loading door on every floor, one above another, a small window either side
  for (const k of ['front', 'back']) {
    for (let f = 0; f < floors; f++) {
      const y0 = 0.4 + f * fH;
      const ops = [];
      if (w > 6.5) ops.push({ x0: 0.7, x1: 1.5, y0: y0 + 1.0, y1: y0 + 1.9, kind: 'window' });
      ops.push({ x0: w / 2 - 0.9, x1: w / 2 + 0.9, y0: y0 + 0.05, y1: y0 + 2.1, kind: 'gate' });
      if (w > 6.5) ops.push({ x0: w - 1.5, x1: w - 0.7, y0: y0 + 1.0, y1: y0 + 1.9, kind: 'window' });
      wallBand(s.boards, F[k], y0, y0 + fH, ops, wallCol);
      for (const op of ops) {
        if (op.kind === 'gate') {
          reveal(s.detail, F[k], op, 0.08, 0x2a2430);
          if (k === 'front' || f === 0) kit.place('gate', partMatrix(M, F[k], op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), doorC);
          else pane(s.boards, F[k], op.x0, op.x1, op.y0, op.y1, -0.08, doorC);
        } else glaze(s, R, F[k], op, 0.25, 0.06);
      }
    }
    s.boards.tri(at(F[k], 0, hW), at(F[k], w, hW), at(F[k], w / 2, hW + rise - 0.05), wallCol);
    if (k === 'front') {
      pane(s.boards, F[k], w / 2 - 0.6, w / 2 + 0.6, hW + 0.2, hW + Math.min(1.7, rise - 1.2), 0.02, doorC);
      kit.place('hoist', M.clone().multiply(new THREE.Matrix4().makeTranslation(0, hW + rise - 0.75, zf)), 0xffffff);
    }
  }
  for (const k of ['left', 'right']) wallBand(s.boards, F[k], 0.4, hW, [], wallCol);
  s.roof.facing([0, hW - 30, 0]);
  for (const sx of [-1, 1]) s.roof.quad([sx * (w / 2 + 0.3), hW - 0.12, -zf - 0.35], [sx * (w / 2 + 0.3), hW - 0.12, zf + 0.35], [0, hW + rise, zf + 0.35], [0, hW + rise, -zf - 0.35], roofCol);
  s.roof.facing(null);
  shut(s);
  return { top: hW + rise, hW, ridge: hW + rise };
}
