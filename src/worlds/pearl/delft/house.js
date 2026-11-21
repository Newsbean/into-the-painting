// A Delft canal house, about 1660: narrow, deep and tall, its gable to the street.
// Brick with bands of pale stone, a tall ground floor behind a door and one or two
// cross-windows (or a shop window under a wooden awning), lower floors above, and a
// stepped or a spout gable with a hoist at the top. Some are whitewashed to the height
// of a man, as in The Little Street.
//
//   canalHouse(kit, world, { x, z, ry, w, d, R, floors, gable, shop, wash, lit })
//     front: true        only the street front (to dress a building that already stands)
//     open: { w, h }     an open doorway in the middle instead of a door
//     gH, rise           the height of the ground floor, and of the gable above the eaves
//
// The front is local +z. kit is a DelftKit (kit.js). Every house throws its own dice (R).
// Lab: /?debug&look=pearl&lab=worlds/pearl/delft/lab.js
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { at, wallBand, reveal, pane, slab, cuboid, partMatrix } from '../../../engine/facade.js';
import { vnoise } from '../../../engine/gl.js';
import { DELFT } from './kit.js';

const pick = (R, a) => a[(R() * a.length) | 0];
const _t = new THREE.Color();
const SKY = new THREE.Color(0x9fb4c4); // what lies in old glass by day
const SOUPS = ['brick', 'plaster', 'stone', 'tile', 'slate', 'wood', 'detail'];
const sides = (w, d) => ({
  front: { o: [-w / 2, 0, d / 2], u: [1, 0, 0], n: [0, 0, 1], W: w },
  back: { o: [w / 2, 0, -d / 2], u: [-1, 0, 0], n: [0, 0, -1], W: w },
  left: { o: [-w / 2, 0, -d / 2], u: [0, 0, 1], n: [-1, 0, 0], W: d },
  right: { o: [w / 2, 0, d / 2], u: [0, 0, -1], n: [1, 0, 0], W: d },
});
const BASE = -1.2; // walls go into the ground, so a slope never shows daylight under them

export function canalHouse(kit, world, o) {
  const R = o.R,
    { w, d } = o;
  const floors = Math.max(1, o.floors ?? 3);
  const gable = o.gable ?? (R() < 0.62 ? 'step' : 'spout');
  const shop = !!o.shop && w > 5.2;
  const gH = o.gH ?? 3.75,
    fH = 3.0;
  const hW = gH + (floors - 1) * fH; // the eaves
  const rise = o.rise ?? (w / 2) * (1.42 + R() * 0.2); // a steep roof
  const ridge = hW + rise;
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const M = xf(o.x, gy, o.z, o.ry ?? 0);
  const W3 = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const s = {};
  for (const n of SOUPS) s[n] = kit.s(n).set(M).facing(null).warp(null);
  const F = sides(w, d),
    zf = d / 2;

  const brickC = new THREE.Color(o.brick ?? pick(R, DELFT.BRICK));
  const seed = o.x * 0.37 + o.z * 0.61;
  // old brick: darker and damper towards the ground, never one even red
  const brick = (x, y, z) => _t.copy(brickC).multiplyScalar((0.8 + 0.2 * Math.min(1, Math.max(0, (y + 0.5) / 3.5))) * (0.9 + 0.2 * vnoise(x * 0.6 + z * 0.5 + seed, y * 0.5 + seed)));
  const dark = brickC.clone().multiplyScalar(0.55);
  const roofC = new THREE.Color(o.roof ?? pick(R, DELFT.ROOF));
  const roofCol = (x, y, z) => _t.copy(roofC).multiplyScalar(0.84 + 0.3 * vnoise(x * 0.5 + seed, z * 0.7 + y * 0.4));
  const stone = new THREE.Color(DELFT.STONE).multiplyScalar(0.92 + R() * 0.12);
  const shutterC = pick(R, DELFT.SHUTTER),
    doorC = pick(R, DELFT.DOOR);
  const litP = o.lit ?? 0.1;
  const wash = o.wash ?? R() < 0.3;

  // ---------------------------------------------------------------- an opening, glazed and dressed
  const glaze = (Fc, op, depth = 0.2) => {
    reveal(s.detail, Fc, op, depth, dark, stone);
    const lit = op.kind !== 'door' && R() < litP;
    // (a lit window by day is no lamp: only a room with the sun in it)
    const c = new THREE.Color(lit ? pick(R, DELFT.LIT) : pick(R, DELFT.GLASS)).multiplyScalar(lit ? 0.5 + R() * 0.16 : 0.8 + R() * 0.5);
    // old glass by day: dark, with the sky lying in the upper panes
    const col = lit ? c : (x, y) => _t.copy(c).lerp(SKY, 0.35 * Math.min(1, Math.max(0, (y - op.y0) / (op.y1 - op.y0))));
    pane(s.detail, Fc, op.x0, op.x1, op.y0, op.y1, -depth, col, { em: lit ? 0.4 : 0 });
  };
  // the head of a window: wedges of stone and brick by turns, a keystone in the middle
  const head = (Fc, op) => {
    const n = 5,
      bw = (op.x1 - op.x0 + 0.24) / n;
    for (let i = 0; i < n; i++) slab(s.stone, Fc, op.x0 - 0.12 + i * bw, op.x0 - 0.12 + (i + 1) * bw, op.y1, op.y1 + (i === 2 ? 0.3 : 0.24), 0, i % 2 ? 0.02 : 0.045, i % 2 ? brickC.clone().multiplyScalar(0.8) : stone, undefined, 'kb');
  };

  // ---------------------------------------------------------------- the front, floor by floor
  const nb = w < 5.7 ? 2 : 3,
    bw = w / nb;
  const doorBay = o.open ? (nb / 2) | 0 : nb === 3 && R() < 0.4 ? 1 : R() < 0.5 ? 0 : nb - 1;
  const ground = [];
  for (let i = 0; i < nb; i++) {
    const cx = (i + 0.5) * bw;
    if (i === doorBay && o.open) ground.push({ x0: cx - o.open.w / 2, x1: cx + o.open.w / 2, y0: -0.2, y1: o.open.h, kind: 'open' });
    else if (i === doorBay) ground.push({ x0: cx - 0.6, x1: cx + 0.6, y0: 0.14, y1: 3.0, kind: 'door' });
    else if (!shop) ground.push({ x0: cx - 0.64, x1: cx + 0.64, y0: 0.95, y1: 3.1, kind: 'window' });
  }
  if (shop) {
    // one wide window for the goods, where the other bays would be
    const a = doorBay === 0 ? bw + 0.25 : 0.35,
      b = doorBay === nb - 1 ? w - bw - 0.25 : w - 0.35;
    if (doorBay === 1) ground.push({ x0: 0.3, x1: bw - 0.3, y0: 0.8, y1: 2.85, kind: 'shop' }, { x0: w - bw + 0.3, x1: w - 0.3, y0: 0.8, y1: 2.85, kind: 'shop' });
    else ground.push({ x0: a, x1: b, y0: 0.8, y1: 2.85, kind: 'shop' });
  }
  ground.sort((p, q) => p.x0 - q.x0);
  // whitewash to the height of a man, brick above
  const dado = wash ? 2.15 + R() * 0.5 : 0;
  if (wash) {
    const white = new THREE.Color(DELFT.WHITE).multiplyScalar(0.9 + R() * 0.1);
    wallBand(s.plaster, F.front, BASE, dado, ground, (x, y) => _t.copy(white).multiplyScalar(0.82 + 0.18 * Math.min(1, Math.max(0, y / 1.2)) + 0.05 * vnoise(x * 2 + seed, y * 2)));
    wallBand(s.brick, F.front, dado, gH, ground, brick);
  } else wallBand(s.brick, F.front, BASE, gH, ground, brick);
  for (const op of ground) {
    if (op.kind === 'open') {
      // a doorway you walk through: a stone frame, and a fanlight over it
      for (const [a, b] of [[op.x0 - 0.3, op.x0], [op.x1, op.x1 + 0.3]]) slab(s.stone, F.front, a, b, 0, op.y1 + 0.3, 0, 0.1, stone, undefined, 'kb');
      slab(s.stone, F.front, op.x0, op.x1, op.y1, op.y1 + 0.3, 0, 0.1, stone, undefined, 'k');
      continue;
    }
    glaze(F.front, op, op.kind === 'shop' ? 0.3 : 0.2);
    if (op.kind === 'door') kit.place('door', partMatrix(M, F.front, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), doorC);
    else if (op.kind === 'window') {
      kit.place('window', partMatrix(M, F.front, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), shutterC);
      if (!wash) head(F.front, op);
    } else {
      kit.place('windowBare', partMatrix(M, F.front, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), 0xffffff);
      kit.place('luifel', partMatrix(M, F.front, op.x0 - 0.2, op.y1 + 0.1 - 1.0, op.x1 - op.x0 + 0.4, 1.0), pick(R, [0x7a5a3c, 0x5a4230, 0x8a6a48, 0x6a4a36]));
      // what is for sale, on the sill
      for (let k = 0, n = Math.max(2, Math.round((op.x1 - op.x0) / 0.7)); k < n; k++) slab(s.detail, F.front, op.x0 + 0.12 + (k * (op.x1 - op.x0 - 0.24)) / n, op.x0 + 0.12 + ((k + 0.8) * (op.x1 - op.x0 - 0.24)) / n, op.y0, op.y0 + 0.18 + R() * 0.22, -0.26, -0.06, pick(R, [0xe8c84a, 0xd9443a, 0xb9c4cc, 0x9a5a2a, 0x2f5fd0, 0xf2f0e0, 0x6a8a4a]), undefined, 'kb');
    }
  }
  // upper floors: a cross-window to each bay
  for (let f = 1; f < floors; f++) {
    const base = gH + (f - 1) * fH;
    const ops = [];
    for (let i = 0; i < nb; i++) {
      const cx = (i + 0.5) * bw;
      ops.push({ x0: cx - 0.54, x1: cx + 0.54, y0: base + 0.72, y1: base + 0.72 + 1.95, kind: 'window' });
    }
    wallBand(s.brick, F.front, base, base + fH, ops, brick);
    for (const op of ops) {
      glaze(F.front, op);
      kit.place(R() < 0.7 ? 'window' : 'windowBare', partMatrix(M, F.front, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), shutterC);
      head(F.front, op);
    }
  }
  // bands of pale stone at every floor, and iron ties holding the beams
  for (let f = 0; f < floors; f++) {
    const y = gH + f * fH;
    slab(s.stone, F.front, -0.02, w + 0.02, y - 0.09, y + 0.09, 0, 0.04, stone, undefined, 'k');
    if (f) for (let i = 0; i <= nb; i++) kit.place('anchor', partMatrix(M, F.front, Math.min(w - 0.3, Math.max(0.3, i * bw)), y - 0.42, 1, 1), 0xffffff);
  }

  // ---------------------------------------------------------------- the gable
  // xl(y): how far in from each side the gable wall stands at height y
  const n = Math.max(3, Math.round(rise / 0.95)),
    sh = rise / (n + 0.55),
    topW = 0.95;
  const step = (y) => Math.min(n, Math.floor((y - hW) / sh + 1e-6));
  const xl = gable === 'step' ? (y) => (step(y) * (w - topW)) / 2 / n : (y) => (Math.min(1, (y - hW) / (rise - 0.75)) * (w - 0.8)) / 2;
  const top = gable === 'step' ? hW + (n + 1) * sh : ridge + 0.45;
  const attic = rise > 3.1 ? { x0: w / 2 - 0.45, x1: w / 2 + 0.45, y0: hW + 0.55, y1: hW + 0.55 + Math.min(1.5, rise * 0.34), kind: R() < 0.5 ? 'hatch' : 'window' } : null;
  const levels = [hW, top];
  if (gable === 'step') for (let i = 1; i <= n; i++) levels.push(hW + i * sh);
  else {
    for (let i = 1; i < 6; i++) levels.push(hW + ((top - hW) * i) / 6);
    levels.push(ridge - 0.75); // where the slope ends and the spout begins
  }
  if (attic) levels.push(attic.y0, attic.y1);
  levels.sort((a, b) => a - b);
  for (let i = 0; i < levels.length - 1; i++) {
    const ya = levels[i],
      yb = levels[i + 1];
    if (yb - ya < 0.01) continue;
    const mid = (ya + yb) / 2;
    // a stepped gable is upright between its ledges; a spout gable leans in with the roof
    const a0 = gable === 'step' ? xl(mid) : xl(ya),
      a1 = gable === 'step' ? xl(mid) : xl(yb);
    const q = (xa0, xb0, xa1, xb1) => {
      if (xb0 - xa0 > 0.01 || xb1 - xa1 > 0.01) s.brick.quad(at(F.front, xa0, ya), at(F.front, xb0, ya), at(F.front, xb1, yb), at(F.front, xa1, yb), brick);
    };
    if (attic && attic.y0 <= ya + 0.005 && attic.y1 >= yb - 0.005) {
      q(a0, attic.x0, a1, attic.x0);
      q(attic.x1, w - a0, attic.x1, w - a1);
    } else q(a0, w - a0, a1, w - a1);
  }
  if (gable === 'step') {
    // each step: its back, its two cheeks, and a stone slab on the ledge
    for (let i = 0; i <= n; i++) {
      const y0 = hW + i * sh,
        y1 = Math.min(top, y0 + sh),
        x0 = -w / 2 + xl(y0 + 0.01),
        x1 = w / 2 - xl(y0 + 0.01);
      s.brick.facing([0, y0, zf + 9]); // the back of the step looks down the roof
      s.brick.quad([x1, y0, zf - 0.32], [x0, y0, zf - 0.32], [x0, y1, zf - 0.32], [x1, y1, zf - 0.32], brick);
      s.brick.facing([0, y0, zf - 0.16]); // its cheeks look sideways
      for (const x of [x0, x1]) s.brick.quad([x, y0, zf - 0.32], [x, y0, zf], [x, y1, zf], [x, y1, zf - 0.32], brick);
      s.brick.facing(null);
      const lw = i < n ? (w - topW) / 2 / n : (x1 - x0) / 2;
      for (const sx of [-1, 1]) cuboid(s.stone, [sx < 0 ? x0 - 0.05 : x1 - lw - 0.03, y1, zf - 0.37], [sx < 0 ? x0 + lw + 0.03 : x1 + 0.05, y1 + 0.1, zf + 0.06], stone, undefined, 'b');
    }
    // a finial on the top step
    cuboid(s.stone, [-0.12, top + 0.1, zf - 0.28], [0.12, top + 0.55, zf - 0.04], stone, undefined, 'b');
  } else {
    // the spout: a square head of brick under a stone cap, and stone kneelers at the eaves
    s.brick.facing([0, hW, zf + 9]);
    s.brick.quad([w / 2 - xl(hW), hW, zf - 0.3], [-w / 2 + xl(hW), hW, zf - 0.3], [-0.4, top, zf - 0.3], [0.4, top, zf - 0.3], brick);
    s.brick.facing(null);
    cuboid(s.stone, [-0.5, top, zf - 0.36], [0.5, top + 0.12, zf + 0.06], stone, undefined, 'b');
    for (const sx of [-1, 1]) {
      cuboid(s.stone, [sx < 0 ? -w / 2 - 0.06 : w / 2 - 0.5, hW - 0.08, zf - 0.36], [sx < 0 ? -w / 2 + 0.5 : w / 2 + 0.06, hW + 0.16, zf + 0.07], stone, undefined, 'b');
      // the coping up each slope
      const a = [sx * (w / 2 - xl(hW)), hW + 0.16],
        b = [sx * 0.4, top];
      s.stone.facing([0, hW, zf - 0.15]);
      s.stone.quad([a[0], a[1], zf + 0.05], [b[0], b[1], zf + 0.05], [b[0], b[1], zf - 0.34], [a[0], a[1], zf - 0.34], stone);
      s.stone.quad([a[0], a[1] - 0.14, zf + 0.05], [b[0] - sx * 0.1, b[1] - 0.1, zf + 0.05], [b[0], b[1], zf + 0.05], [a[0], a[1], zf + 0.05], stone);
      s.stone.facing(null);
    }
  }
  // stone bands across the gable, the attic opening, the hoist above it
  for (const k of [0.36, 0.7]) {
    const y = hW + rise * k,
      a = xl(y + 0.1) + 0.02;
    if (w - 2 * a > 0.7 && !(attic && y > attic.y0 - 0.15 && y < attic.y1 + 0.15)) slab(s.stone, F.front, a, w - a, y - 0.07, y + 0.07, 0, 0.035, stone, undefined, 'k');
  }
  if (attic) {
    if (attic.kind === 'hatch') {
      // the loft door, shut
      reveal(s.detail, F.front, attic, 0.1, dark, stone);
      pane(s.wood, F.front, attic.x0, attic.x1, attic.y0, attic.y1, -0.1, new THREE.Color(shutterC).multiplyScalar(0.85));
      pane(s.detail, F.front, (attic.x0 + attic.x1) / 2 - 0.012, (attic.x0 + attic.x1) / 2 + 0.012, attic.y0, attic.y1, -0.09, DELFT.IRON);
    } else {
      glaze(F.front, attic, 0.16);
      kit.place('windowSmall', partMatrix(M, F.front, attic.x0, attic.y0, attic.x1 - attic.x0, attic.y1 - attic.y0), 0xffffff);
    }
    kit.place('hoist', M.clone().multiply(new THREE.Matrix4().makeTranslation(0, attic.y1 + 0.5, zf)), 0xffffff);
  }

  // ---------------------------------------------------------------- sides, back, roof
  if (o.front) {
    for (const k in s) s[k].set(null).facing(null);
    return { top: top + 0.5, hW, ridge };
  }
  for (const k of ['left', 'right']) wallBand(s.brick, F[k], BASE, hW, [], brick);
  const backOps = [];
  for (let f = 0; f < floors; f++)
    for (let i = 0; i < 2; i++) {
      const cx = (i + 0.5) * (w / 2),
        y0 = (f ? gH + (f - 1) * fH : 0) + (f ? 0.8 : 1.1);
      backOps.push({ x0: cx - 0.45, x1: cx + 0.45, y0, y1: y0 + 1.5, kind: 'window', f });
    }
  for (let f = 0; f < floors; f++) {
    const ops = backOps.filter((p) => p.f === f);
    wallBand(s.brick, F.back, f ? gH + (f - 1) * fH : BASE, f ? gH + f * fH : gH, ops, brick);
    for (const op of ops) {
      glaze(F.back, op, 0.14);
      kit.place('windowSmall', partMatrix(M, F.back, op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0), 0xffffff);
    }
  }
  s.brick.tri(at(F.back, 0, hW), at(F.back, w, hW), at(F.back, w / 2, ridge - 0.05), brick);
  // the roof runs back from the gable; its eaves just clear the side walls
  const ex = w / 2 + 0.14,
    z0 = -d / 2 - 0.2,
    z1 = zf - 0.3;
  s.tile.facing([0, hW - 30, 0]);
  for (const sx of [-1, 1]) s.tile.quad([sx * ex, hW - 0.1, z0], [sx * ex, hW - 0.1, z1], [0, ridge, z1], [0, ridge, z0], roofCol);
  s.tile.facing(null);
  cuboid(s.tile, [-0.13, ridge - 0.04, z0], [0.13, ridge + 0.12, z1], roofC.clone().multiplyScalar(1.15), undefined, 'b');
  // a chimney or two, brick under a stone cap
  for (let k = 0, nc = 1 + (R() < 0.45 ? 1 : 0); k < nc; k++) {
    const cz = z0 + (z1 - z0) * (nc === 1 ? 0.3 + R() * 0.4 : 0.22 + k * 0.5 + R() * 0.1),
      cx = (R() < 0.5 ? -1 : 1) * w * (0.12 + R() * 0.12),
      ct = ridge + 0.5 + R() * 0.6;
    cuboid(s.brick, [cx - 0.36, ridge - rise * 0.5, cz - 0.3], [cx + 0.36, ct, cz + 0.3], (x, y, z) => _t.copy(brickC).multiplyScalar(0.72), undefined, 'b');
    cuboid(s.stone, [cx - 0.43, ct, cz - 0.37], [cx + 0.43, ct + 0.1, cz + 0.37], stone, undefined, '');
  }

  // ---------------------------------------------------------------- what hangs on it and stands before it
  const door = ground.find((p) => p.kind === 'door');
  if (R() < (shop ? 0.75 : 0.3)) kit.place('sign', M.clone().multiply(new THREE.Matrix4().makeTranslation(-w / 2 + (door.x0 > w / 2 ? door.x0 - 0.4 : door.x1 + 0.4), 3.45, zf)), pick(R, [0xd9c9a0, 0x8a2a22, 0x24405a, 0xd9a83a, 0x2f5a3a]));
  if (R() < 0.42) {
    const lx = door.x0 > w / 2 ? door.x0 - 0.35 : door.x1 + 0.35;
    kit.place('lantern', M.clone().multiply(new THREE.Matrix4().makeTranslation(-w / 2 + lx, 2.9, zf)), 0xffd590);
    const p = W3(-w / 2 + lx, 2.75, zf + 0.5);
    world.glows?.push({ p: [p.x, p.y, p.z], c: 0xffd08a, size: 1.1 });
    const q = W3(-w / 2 + lx, 0, zf + 1.4);
    world.maps?.lamp(q.x, q.z, 4.5, 0xffc878, 0.4);
  }
  if (!shop && R() < 0.4) {
    const free = ground.find((p) => p.kind === 'window');
    if (free) kit.place('bench', M.clone().multiply(new THREE.Matrix4().makeTranslation(-w / 2 + (free.x0 + free.x1) / 2, 0.02, zf + 0.02)), 0xffffff);
  }
  for (const k in s) s[k].set(null).facing(null);
  return { top: Math.max(top + 0.5, ridge + 1), hW, ridge };
}
