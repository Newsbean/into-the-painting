// A town house, generated.
//
// Storeys of windows cut into the wall with real reveals, a ground floor with a
// door (and perhaps a shop under an awning), string course, cornice and quoins,
// a pitched roof with dormers, a sagging ridge and chimney pots. No two alike:
// width, height, bay rhythm, stone or plaster, colours, shutters, balconies and
// lit windows are all drawn from the seeded rng.
//
//   house(kit, world, { x, z, ry, w, d, floors, R, style, shop, ... })
//
// Local frame: x along the street front (width w), y up, +z out to the street.
// Lab: /?debug&lab=worlds/starry/town/street.js
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { clamp, lerp, smooth, vnoise } from '../../../engine/gl.js';
import { at, wallBand, reveal, pane, slab, partMatrix, gaps, cuboid } from '../../../engine/facade.js';
import { parts } from './kit.js';

// night-saturated, as in the painting's village and the cafés of Arles
export const WALL_COLOURS = [0xd9a84a, 0xd9763a, 0xb8523a, 0xc86a7a, 0x7a5ab0, 0x9a86c8, 0x3f5fb0, 0x5f8fc8, 0x3f8a8a, 0x6a9a6a, 0xe6c27a, 0x8f9ecb, 0xe8c85a, 0x4a6aa8, 0x8a4a8a, 0xc9864a, 0x5a7ab8];
export const ROOF_TILE = [0xc2512e, 0xd0432a, 0xb23a2c, 0xd0703a, 0x8a2f3a, 0xc8603a];
export const ROOF_SLATE = [0x2f3f9a, 0x3a55b8, 0x4a3a90, 0x2f6a7a, 0x3a4a8a, 0x5a4aa8, 0x263a80];
export const SHUTTERS = [0x2f5fa8, 0x3f7a58, 0x8a2f2a, 0xe0d2a8, 0x5a3a7a, 0xd9a83a, 0x2f7a8a, 0x1f3f6a, 0xb8523a];
export const WARM = [0xffd56b, 0xffb84d, 0xffe6a3, 0xffc861, 0xffa94a];
const STONE = 0xd9d0b4;
const IRON = 0x161a2c;

const pick = (R, a) => a[(R() * a.length) | 0];
const _t = new THREE.Color();
const _u = new THREE.Color();

// everything about a house that is a matter of taste
export function randomStyle(R, o = {}) {
  const wallMat = o.wallMat ?? (R() < 0.55 ? 'stone' : R() < 0.8 ? 'plaster' : 'brick');
  const slate = o.slate ?? R() < 0.55;
  return {
    wallMat,
    wall: o.wall ?? pick(R, WALL_COLOURS),
    roofMat: slate ? 'slate' : 'tile',
    roof: o.roof ?? pick(R, slate ? ROOF_SLATE : ROOF_TILE),
    shutter: o.shutter ?? pick(R, SHUTTERS),
    door: o.door ?? pick(R, SHUTTERS),
    shutters: o.shutters ?? R() < 0.7,
    balcony: o.balcony ?? R() < 0.3,
    quoins: o.quoins ?? (wallMat !== 'stone' && R() < 0.55),
    timber: o.timber ?? (wallMat === 'plaster' && R() < 0.22),
    attic: o.attic ?? R() < 0.3,
    dormers: o.dormers ?? R() < 0.55,
    pitch: o.pitch ?? lerp(0.66, 0.92, R()), // radians: 38 to 53 degrees
    bay: o.bay ?? lerp(2.45, 3.1, R()),
    floorH: o.floorH ?? lerp(2.85, 3.15, R()),
    ...o,
  };
}

export function house(kit, world, o) {
  const R = o.R;
  const st = o.style ?? randomStyle(R);
  const { w, d } = o;
  const floors = Math.max(1, o.floors ?? 3);
  const shop = !!o.shop;
  const gH = shop ? 3.6 : 3.2;
  const fH = st.floorH;
  const atticH = st.attic && floors > 1 ? 1.55 : 0;
  const hW = gH + (floors - 1) * fH + atticH; // the eaves
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const lit = o.lit ?? 0.6;
  const detail = o.detail !== false;
  const lib = parts();

  // never quite plumb
  const lean = o.lean ?? (R() - 0.5) * 0.028;
  const M = xf(o.x, gy, o.z, o.ry ?? 0).multiply(new THREE.Matrix4().set(1, lean, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
  const toWorld = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const wall = kit.s(st.wallMat).set(M).warp(null);
  const det = kit.s('detail').set(M).warp(null);
  const roof = kit.s(st.roofMat).set(M).warp(null);

  const wc = new THREE.Color(st.wall);
  const seed = o.x * 0.37 + o.z * 0.61;
  const wallCol = (x, y, z) => {
    const damp = 0.72 + 0.28 * smooth(-0.2, 2.6, y);
    const n = 0.9 + 0.2 * vnoise(x * 0.55 + z * 0.4 + seed, y * 0.45 + seed);
    return _t.copy(wc).multiplyScalar(damp * n);
  };
  const shade = (k) => _u.copy(wc).multiplyScalar(k).clone();
  const revealCol = shade(0.62);
  const stoneTrim = st.wallMat === 'stone' ? shade(1.22).lerp(new THREE.Color(STONE), 0.45) : new THREE.Color(STONE);
  const roofC = new THREE.Color(st.roof);
  const roofCol = (x, y, z) => _t.copy(roofC).multiplyScalar(0.86 + 0.28 * vnoise(x * 0.4 + seed, z * 0.6 + y * 0.3));

  const over = 0.42; // eaves overhang
  const tanP = Math.tan(st.pitch);
  const gableFront = !!o.gableFront;
  // roof run is across the depth (eaves to the street) or across the width (gable to the street)
  const run = (gableFront ? w : d) / 2 + over;
  const ridgeY = hW + run * tanP;
  const wallTop = hW + over * tanP; // where the wall meets the underside of the roof

  const F = {
    front: { o: [-w / 2, 0, d / 2], u: [1, 0, 0], n: [0, 0, 1], W: w },
    back: { o: [w / 2, 0, -d / 2], u: [-1, 0, 0], n: [0, 0, -1], W: w },
    left: { o: [-w / 2, 0, -d / 2], u: [0, 0, 1], n: [-1, 0, 0], W: d },
    right: { o: [w / 2, 0, d / 2], u: [0, 0, -1], n: [1, 0, 0], W: d },
  };
  const BASE = -1.4; // walls go into the ground so a slope never shows daylight under them

  // (kit.far, when the town gives one, collects a plain stand-in for this house to be drawn
  // from far away: see the end of this function. It takes no dice.)
  const farOps = kit.far ? [] : null,
    farStacks = [];

  // ---------------------------------------------------------------- one opening, finished
  const finish = (Fc, op, fine) => {
    const ow = op.x1 - op.x0,
      oh = op.y1 - op.y0;
    const depth = op.kind === 'shop' ? 0.52 : 0.22;
    reveal(det, Fc, op, depth, revealCol, op.kind === 'shop' || op.kind === 'door' ? revealCol : stoneTrim);
    const warm = new THREE.Color(op.lit ? pick(R, WARM) : 0x1a2444);
    if (op.lit) warm.multiplyScalar(0.82 + R() * 0.3);
    else warm.multiplyScalar(0.7 + R() * 0.6);
    const glow = (x, y) => _t.copy(warm).multiplyScalar(op.lit ? lerp(1.12, 0.74, clamp((y - op.y0) / oh)) : 1);
    const em = op.lit ? 1 : 0;
    if (farOps && (Fc === F.front || Fc === F.back || Fc === F.left || Fc === F.right)) farOps.push(op.kind === 'door' ? [Fc, op, new THREE.Color(0x10131f), 0] : [Fc, op, warm.clone(), em]);
    if (op.kind === 'door') {
      // only the fanlight is glass; the leaves come with the part
      pane(det, Fc, op.x0, op.x1, op.y0 + oh * 0.845, op.y1, -depth, glow, { em });
      pane(det, Fc, op.x0, op.x1, op.y0, op.y0 + oh * 0.845, -depth, 0x10131f);
    } else pane(det, Fc, op.x0, op.x1, op.y0, op.y1, -depth, glow, { em });

    if (op.lit && op.kind === 'window' && R() < 0.55) {
      // curtains tied back
      const cw = ow * 0.3,
        cc = _u.copy(warm).multiplyScalar(0.5).clone();
      const z = -depth + 0.03;
      det.quad(at(Fc, op.x0 + 0.05, op.y0 + 0.06, z), at(Fc, op.x0 + 0.05 + cw * 0.4, op.y0 + 0.06, z), at(Fc, op.x0 + 0.05 + cw, op.y1 - 0.05, z), at(Fc, op.x0 + 0.05, op.y1 - 0.05, z), cc, { em: 0.55 });
      det.quad(at(Fc, op.x1 - 0.05 - cw * 0.4, op.y0 + 0.06, z), at(Fc, op.x1 - 0.05, op.y0 + 0.06, z), at(Fc, op.x1 - 0.05, op.y1 - 0.05, z), at(Fc, op.x1 - 0.05 - cw, op.y1 - 0.05, z), cc, { em: 0.55 });
    }
    if (!detail) return;
    let name = null,
      col = st.shutter;
    if (op.kind === 'window') name = !fine ? 'windowPlain' : st.shutters ? (R() < 0.2 ? 'windowBox' : 'windowShut') : 'window';
    else if (op.kind === 'attic') name = 'windowPlain';
    else if (op.kind === 'balcony') name = 'balcony';
    else if (op.kind === 'door') {
      name = st.quoins || floors > 3 ? 'doorGrand' : 'door';
      col = st.door;
    } else if (op.kind === 'shop') {
      name = R() < 0.8 ? 'shop' : 'shopBare';
      col = st.door;
    }
    if (name) kit.place(name, partMatrix(M, Fc, op.x0, op.y0, ow, oh), col);
  };

  // ---------------------------------------------------------------- the street front
  const nb = clamp(Math.round(w / st.bay), 1, 7);
  const bw = w / nb;
  const doorBay = o.doorBay ?? (shop ? (R() < 0.5 ? 0 : nb - 1) : nb % 2 ? (nb - 1) / 2 : (R() * nb) | 0);
  const winW = Math.min(1.22, bw * 0.47);
  const front = []; // storeys: { y0, y1, ops }
  {
    const ops = [];
    for (let i = 0; i < nb; i++) {
      const cx = (i + 0.5) * bw;
      if (i === doorBay && o.door !== false) {
        const dw = Math.min(1.3, bw * 0.66);
        const y0 = shop ? 0.04 : 0.34;
        ops.push({ x0: cx - dw / 2, x1: cx + dw / 2, y0, y1: Math.min(gH - 0.42, y0 + 2.55), kind: 'door', lit: R() < 0.6 });
      } else if (shop) {
        const sw = Math.min(3.4, bw - 0.44);
        ops.push({ x0: cx - sw / 2, x1: cx + sw / 2, y0: 0.02, y1: 2.78, kind: 'shop', lit: true });
      } else ops.push({ x0: cx - winW / 2, x1: cx + winW / 2, y0: 1.08, y1: Math.min(gH - 0.42, 1.08 + 1.55), kind: 'window', lit: R() < lit });
    }
    front.push({ y0: BASE, y1: gH, ops });
  }
  for (let f = 1; f < floors; f++) {
    const base = gH + (f - 1) * fH;
    const ops = [];
    for (let i = 0; i < nb; i++) {
      const cx = (i + 0.5) * bw;
      if (R() < 0.05 && nb > 2) continue; // a blind bay now and then
      const french = st.balcony && f === 1 && (nb < 3 || i === Math.floor(nb / 2) || R() < 0.2);
      if (french) {
        const ww = Math.min(1.25, bw * 0.5);
        ops.push({ x0: cx - ww / 2, x1: cx + ww / 2, y0: base + 0.15, y1: Math.min(base + fH - 0.36, base + 0.15 + 2.3), kind: 'balcony', lit: R() < lit + 0.15 });
      } else {
        const hh = f === 1 ? 1.75 : 1.6;
        ops.push({ x0: cx - winW / 2, x1: cx + winW / 2, y0: base + 0.88, y1: Math.min(base + fH - 0.34, base + 0.88 + hh), kind: 'window', lit: R() < lit });
      }
    }
    front.push({ y0: base, y1: base + fH, ops });
  }
  if (atticH) {
    const base = gH + (floors - 1) * fH;
    const ops = [];
    for (let i = 0; i < nb; i++) {
      const cx = (i + 0.5) * bw;
      const ww = Math.min(0.8, bw * 0.34);
      ops.push({ x0: cx - ww / 2, x1: cx + ww / 2, y0: base + 0.42, y1: base + 1.12, kind: 'attic', lit: R() < lit * 0.6 });
    }
    front.push({ y0: base, y1: base + atticH, ops });
  }
  const frontTop = gableFront ? hW : wallTop;
  front[front.length - 1].y1 = frontTop;
  for (const s of front) {
    wallBand(wall, F.front, s.y0, s.y1, s.ops, wallCol);
    for (const op of s.ops) finish(F.front, op, true);
  }

  // dressings on the front: plinth, string course, cornice, quoins, a downpipe, a lantern
  const ground = front[0].ops;
  const plinthCol = shade(0.5).lerp(new THREE.Color(0x4a4a5a), 0.35);
  for (const [a, b] of gaps(w, ground.filter((p) => p.y0 < 0.6).map((p) => [p.x0 - (p.kind === 'door' ? 0.34 : 0.14), p.x1 + (p.kind === 'door' ? 0.34 : 0.14)])))
    slab(det, F.front, a, b, BASE, 0.56, 0, 0.06, plinthCol, undefined, 'kb');
  slab(det, F.front, -0.05, w + 0.05, gH - 0.13, gH + 0.07, 0, 0.075, stoneTrim, undefined, 'k');
  if (floors > 2) slab(det, F.front, -0.03, w + 0.03, gH + fH - 0.07, gH + fH + 0.05, 0, 0.045, stoneTrim, undefined, 'k');
  if (!gableFront) {
    slab(det, F.front, -0.06, w + 0.06, hW - 0.36, hW - 0.18, 0, 0.11, stoneTrim, undefined, 'k');
    slab(det, F.front, -0.1, w + 0.1, hW - 0.18, hW - 0.02, 0, 0.23, stoneTrim, undefined, 'k');
    slab(det, F.back, -0.06, w + 0.06, hW - 0.2, hW - 0.02, 0, 0.16, stoneTrim, undefined, 'k');
  }
  if (st.quoins && detail) {
    const qc = new THREE.Color(STONE);
    for (let k = 0, y = 0.6; y < hW - 0.5; k++, y += 0.37) {
      const bwid = k % 2 ? 0.34 : 0.56;
      slab(det, F.front, 0, bwid, y, y + 0.31, 0, 0.045, qc, undefined, 'k');
      slab(det, F.front, w - bwid, w, y, y + 0.31, 0, 0.045, qc, undefined, 'k');
    }
  }
  if (st.timber && detail && floors > 1) {
    // dark framing over the plaster of the upper floors
    const tc = 0x33241a;
    for (let i = 0; i <= nb; i++) {
      const x = clamp(i * bw, 0.09, w - 0.09);
      slab(det, F.front, x - 0.09, x + 0.09, gH + 0.07, hW - 0.36, 0, 0.04, tc, undefined, 'k');
    }
    for (let f = 1; f < floors; f++) slab(det, F.front, 0, w, gH + f * fH - 0.09, gH + f * fH + 0.09, 0, 0.045, tc, undefined, 'k');
    for (let f = 1; f < floors; f++)
      for (const i of [0, nb - 1]) {
        // a brace in the end bays, under the windows
        const x0 = i * bw + 0.09,
          x1 = (i + 1) * bw - 0.09,
          y0 = gH + (f - 1) * fH + 0.1,
          y1 = y0 + 0.74;
        const up = i === 0;
        const z = 0.035;
        const a = at(F.front, x0, up ? y0 : y1, z),
          b = at(F.front, x1, up ? y1 : y0, z);
        det.quad([a[0], a[1] - 0.07, a[2]], [b[0], b[1] - 0.07, b[2]], [b[0], b[1] + 0.07, b[2]], [a[0], a[1] + 0.07, a[2]], tc);
      }
  }
  if (detail && R() < 0.3) {
    // a zinc downpipe with its hopper
    const x = R() < 0.5 ? 0.16 : w - 0.16;
    slab(det, F.front, x - 0.045, x + 0.045, 0, hW - 0.36, 0.02, 0.11, 0x56607a, undefined, 'k');
    slab(det, F.front, x - 0.1, x + 0.1, hW - 0.5, hW - 0.36, 0.02, 0.2, 0x56607a, undefined, 'k');
  }
  const door = ground.find((p) => p.kind === 'door');
  if (detail && door && (o.lantern ?? R() < 0.5)) {
    const lx = door.x1 + 0.5 < w - 0.3 ? door.x1 + 0.5 : door.x0 - 0.5;
    if (lx > 0.3 && lx < w - 0.3) {
      kit.place('lantern', partMatrix(M, F.front, lx, 3.0, 1, 1), 0xffffff);
      const p = toWorld(F.front.o[0] + lx, 2.75, d / 2 + 0.56);
      world.glows?.push({ p: [p.x, p.y, p.z], c: 0xffc46a, size: 2.2 });
      const g = toWorld(F.front.o[0] + lx, 0, d / 2 + 1.6);
      world.maps?.lamp(g.x, g.z, 7.5, 0xffc46a, 0.75);
    }
  }
  // lit shops and doors spill onto the street
  for (const op of ground) {
    if (!op.lit || (op.kind !== 'shop' && op.kind !== 'door')) continue;
    const g = toWorld(F.front.o[0] + (op.x0 + op.x1) / 2, 0, d / 2 + (op.kind === 'shop' ? 2.2 : 1.2));
    world.maps?.lamp(g.x, g.z, op.kind === 'shop' ? 6.5 : 3.2, 0xffc46a, op.kind === 'shop' ? 0.8 : 0.4);
    if (op.kind === 'shop') {
      const p = toWorld(F.front.o[0] + (op.x0 + op.x1) / 2, 1.6, d / 2 + 0.2);
      world.glows?.push({ p: [p.x, p.y, p.z], c: 0xffc46a, size: 1.7 });
    }
  }

  // ---------------------------------------------------------------- back and sides
  {
    const backTop = gableFront ? hW : wallTop;
    for (let f = 0; f < floors; f++) {
      const base = f === 0 ? 0 : gH + (f - 1) * fH;
      const top = f === 0 ? gH : base + fH;
      const ops = [];
      for (let i = 0; i < nb; i++) {
        if (R() < 0.3) continue;
        const cx = (i + 0.5) * bw;
        const ww = winW * 0.86;
        if (f === 0 && i === (nb / 2) | 0) ops.push({ x0: cx - 0.55, x1: cx + 0.55, y0: 0.1, y1: 2.3, kind: 'backdoor', lit: false });
        else ops.push({ x0: cx - ww / 2, x1: cx + ww / 2, y0: base + 1.0, y1: Math.min(top - 0.4, base + 1.0 + 1.4), kind: 'window', lit: R() < lit * 0.8 });
      }
      const y1 = f === floors - 1 && !atticH ? backTop : top;
      wallBand(wall, F.back, f === 0 ? BASE : base, y1, ops, wallCol);
      for (const op of ops) {
        if (op.kind === 'backdoor') {
          reveal(det, F.back, op, 0.18, revealCol);
          pane(det, F.back, op.x0, op.x1, op.y0, op.y1, -0.18, st.door);
        } else finish(F.back, op, false);
      }
    }
    if (atticH) wallBand(wall, F.back, gH + (floors - 1) * fH, backTop, [], wallCol);
  }
  for (const side of ['left', 'right']) {
    const Fs = F[side];
    const open = o.open?.[side];
    const top = gableFront ? wallTop : hW;
    if (open && detail) {
      // a free side wall gets a few windows of its own
      for (let f = 0; f < floors; f++) {
        const base = f === 0 ? 0 : gH + (f - 1) * fH;
        const yTop = f === 0 ? gH : base + fH;
        const ops = [];
        const n = Math.max(1, Math.round(d / 4.2));
        for (let i = 0; i < n; i++) {
          if (R() < 0.35) continue;
          const cx = ((i + 0.5) * d) / n;
          ops.push({ x0: cx - winW * 0.45, x1: cx + winW * 0.45, y0: base + 1.0, y1: Math.min(yTop - 0.4, base + 1.0 + 1.5), kind: 'window', lit: R() < lit });
        }
        wallBand(wall, Fs, f === 0 ? BASE : base, f === floors - 1 && !atticH ? top : yTop, ops, wallCol);
        for (const op of ops) finish(Fs, op, true);
      }
      if (atticH) wallBand(wall, Fs, gH + (floors - 1) * fH, top, [], wallCol);
    } else wallBand(wall, Fs, BASE, top, [], wallCol);
  }
  // the gables: a triangle of wall under the roof at each end of the ridge
  for (const side of gableFront ? ['front', 'back'] : ['left', 'right']) {
    const Fs = F[side];
    const base = gableFront ? hW : hW;
    const half = Fs.W / 2;
    const yEdge = gableFront ? wallTop : wallTop; // the roof plane above the wall line
    wall.quad(at(Fs, 0, base), at(Fs, Fs.W, base), at(Fs, Fs.W, yEdge), at(Fs, 0, yEdge), wallCol);
    wall.tri(at(Fs, 0, yEdge), at(Fs, Fs.W, yEdge), at(Fs, half, ridgeY - 0.06), wallCol);
    if (gableFront && side === 'front') {
      // an attic light in the gable, and a cornice return under it
      const yy = hW + (ridgeY - hW) * 0.34;
      const on = R() < lit;
      const gc = new THREE.Color(on ? pick(R, WARM) : 0x1a2444);
      slab(det, Fs, half - 0.5, half + 0.5, yy - 0.12, yy + 0.98, 0, 0.05, stoneTrim, undefined, 'k');
      pane(det, Fs, half - 0.36, half + 0.36, yy, yy + 0.86, 0.056, gc, { em: on ? 1 : 0 });
      pane(det, Fs, half - 0.025, half + 0.025, yy, yy + 0.86, 0.06, 0xe9e2cc);
      slab(det, Fs, -0.06, Fs.W + 0.06, hW - 0.2, hW - 0.02, 0, 0.12, stoneTrim, undefined, 'k');
    }
  }

  // ---------------------------------------------------------------- the roof
  // built for a ridge along local x; a gable-front house turns the roof a quarter turn
  const RW = gableFront ? d : w; // length of the ridge
  const Mr = gableFront ? M.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)) : M;
  const sag = (0.05 + R() * 0.12) * Math.min(1, RW / 9);
  const bend = (p) => {
    const t = clamp((p[1] - hW) / (ridgeY - hW));
    const k = 1 - (2 * p[0]) / RW;
    const e = 1 - ((2 * p[0]) / RW) ** 2;
    return [p[0], p[1] - sag * e * t + k * 0, p[2]];
  };
  roof.set(Mr).warp(bend);
  det.set(Mr).warp(bend);
  const vo = 0.24; // verge overhang at the gable ends
  const x0 = -RW / 2 - vo,
    x1 = RW / 2 + vo;
  const SEG = Math.max(2, Math.round(RW / 3));
  const dark = _u.copy(roofC).multiplyScalar(0.5).clone();
  for (const sgn of [1, -1]) {
    for (let i = 0; i < SEG; i++) {
      const a = lerp(x0, x1, i / SEG),
        b = lerp(x0, x1, (i + 1) / SEG);
      const e0 = [a, hW, sgn * run],
        e1 = [b, hW, sgn * run],
        r0 = [a, ridgeY, 0],
        r1 = [b, ridgeY, 0];
      if (sgn > 0) roof.quad(e0, e1, r1, r0, roofCol);
      else roof.quad(e1, e0, r0, r1, roofCol);
      // the thickness of the roof at the eaves, and its underside
      const f0 = [a, hW - 0.17, sgn * run],
        f1 = [b, hW - 0.17, sgn * run];
      if (sgn > 0) roof.quad(f0, f1, e1, e0, dark);
      else roof.quad(f1, f0, e0, e1, dark);
      const s0 = [a, hW - 0.17, sgn * (run - over)],
        s1 = [b, hW - 0.17, sgn * (run - over)];
      if (sgn > 0) det.quad(s0, s1, f1, f0, 0x2a2233);
      else det.quad(s1, s0, f0, f1, 0x2a2233);
    }
    // verges: the edge of the roof over each gable
    for (const xe of [x0, x1]) {
      const e = [xe, hW, sgn * run],
        r = [xe, ridgeY, 0],
        e2 = [xe, hW - 0.17, sgn * run],
        r2 = [xe, ridgeY - 0.17, 0];
      const outward = xe > 0 ? sgn > 0 : sgn < 0;
      if (outward) roof.quad(e2, r2, r, e, dark);
      else roof.quad(r2, e2, e, r, dark);
    }
  }
  // ridge tiles
  cuboid(roof, [x0, ridgeY - 0.05, -0.15], [x1, ridgeY + 0.1, 0.15], (x, y, z) => _t.copy(roofC).multiplyScalar(1.18), undefined, 'b');

  // dormers on the street slope
  if (!gableFront && st.dormers && floors > 1) {
    roof.warp(null);
    det.warp(null);
    const n = nb >= 4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const cx = n === 1 ? (R() - 0.5) * w * 0.2 : (k === 0 ? -1 : 1) * w * 0.22;
      const zf = run - over - 0.55; // face of the dormer, a little back from the wall line
      const yb = hW + (run - zf) * tanP;
      const yt = yb + 1.25,
        yp = yt + 0.5,
        hw2 = 0.62;
      const ze = run - (yt - hW) / tanP,
        zr = run - (yp - hW) / tanP;
      const Fd = { o: [cx - hw2, 0, zf], u: [1, 0, 0], n: [0, 0, 1], W: hw2 * 2 };
      const op = { x0: 0.2, x1: hw2 * 2 - 0.2, y0: yb + 0.28, y1: yt - 0.12 };
      wallBand(wall.set(M), Fd, yb - 0.3, yt, [op], wallCol);
      wall.tri(at(Fd, 0, yt), at(Fd, hw2 * 2, yt), at(Fd, hw2, yp), wallCol);
      const on = R() < lit;
      const gc = new THREE.Color(on ? pick(R, WARM) : 0x1a2444);
      det.set(M);
      reveal(det, Fd, op, 0.12, revealCol, stoneTrim);
      pane(det, Fd, op.x0, op.x1, op.y0, op.y1, -0.12, gc, { em: on ? 1 : 0 });
      pane(det, Fd, hw2 - 0.025, hw2 + 0.025, op.y0, op.y1, -0.1, 0xe9e2cc);
      // cheeks
      wall.tri([cx - hw2, yb - 0.3, zf], [cx - hw2, yt, zf], [cx - hw2, yt, ze], wallCol);
      wall.tri([cx + hw2, yb - 0.3, zf], [cx + hw2, yt, ze], [cx + hw2, yt, zf], wallCol);
      // its own little roof
      const ov = 0.16;
      roof.set(M);
      roof.quad([cx - hw2 - ov, yt - 0.08, zf + ov], [cx, yp, zf + ov], [cx, yp, zr], [cx - hw2 - ov, yt - 0.08, ze], roofCol);
      roof.quad([cx, yp, zf + ov], [cx + hw2 + ov, yt - 0.08, zf + ov], [cx + hw2 + ov, yt - 0.08, ze], [cx, yp, zr], roofCol);
    }
  }

  // chimneys: a stack of the wall's own stone, a cap, two pots
  roof.set(Mr).warp(null);
  det.set(Mr).warp(null);
  wall.set(Mr);
  const nCh = 1 + (RW > 8.5 ? 1 : 0) + (R() < 0.25 ? 1 : 0);
  const pot = new THREE.CylinderGeometry(0.11, 0.14, 0.42, 7);
  for (let k = 0; k < nCh; k++) {
    const cx = (nCh === 1 ? (R() - 0.5) * 0.6 : (k / (nCh - 1) - 0.5) * 0.76 + (R() - 0.5) * 0.12) * RW;
    const cz = (R() < 0.5 ? -1 : 1) * run * (0.12 + R() * 0.26);
    const yBase = hW + (run - Math.abs(cz)) * tanP - 0.5;
    const top = ridgeY + 0.45 + R() * 0.7;
    const cw = 0.62 + R() * 0.3,
      cd = 0.5;
    cuboid(wall, [cx - cw / 2, yBase, cz - cd / 2], [cx + cw / 2, top, cz + cd / 2], (x, y, z) => _t.copy(wc).multiplyScalar(0.8), undefined, 'b');
    if (farOps) farStacks.push([cx, cz, cw, cd, yBase, top]);
    cuboid(det, [cx - cw / 2 - 0.07, top, cz - cd / 2 - 0.07], [cx + cw / 2 + 0.07, top + 0.12, cz + cd / 2 + 0.07], stoneTrim, undefined, '');
    for (const px of cw > 0.75 ? [-0.17, 0.17] : [0]) det.add(pot, 0xb8562e, new THREE.Matrix4().makeTranslation(cx + px, top + 0.33, cz));
  }
  wall.set(null).warp(null);
  det.set(null).warp(null);
  roof.set(null).warp(null);

  // ---------------------------------------------------------------- the same house, for far away
  // A block of the right size and colours with its windows painted on: a few dozen triangles
  // where the real one has a thousand. The town swaps a whole block of houses for these once
  // it is too far off to tell the difference (town.js).
  if (kit.far) {
    const fw = kit.far.s(st.wallMat).set(M).warp(null).facing([0, 1, 0]);
    for (const name of ['front', 'back', 'left', 'right']) {
      const Fc = F[name];
      fw.quad(at(Fc, 0, BASE), at(Fc, Fc.W, BASE), at(Fc, Fc.W, wallTop), at(Fc, 0, wallTop), wallCol);
      if (gableFront === (name === 'front' || name === 'back')) fw.tri(at(Fc, 0, wallTop), at(Fc, Fc.W, wallTop), at(Fc, Fc.W / 2, ridgeY - 0.06), wallCol);
    }
    // the chimney stacks keep the skyline
    fw.facing(null).set(Mr);
    for (const [cx, cz, cw, cd, yBase, top] of farStacks) cuboid(fw, [cx - cw / 2, yBase, cz - cd / 2], [cx + cw / 2, top + 0.3, cz + cd / 2], (x, y, z) => _t.copy(wc).multiplyScalar(0.8), undefined, 'b');
    fw.set(null);
    const fr = kit.far.s(st.roofMat).set(Mr).warp(null).facing([0, hW - 40, 0]);
    const L = RW / 2 + 0.3;
    for (const sgn of [-1, 1]) fr.quad([-L, hW, sgn * run], [L, hW, sgn * run], [L, ridgeY, 0], [-L, ridgeY, 0], roofCol);
    fr.facing(null).set(null);
    const fp = kit.far.s('detail').set(M).warp(null).facing([0, 1, 0]);
    for (const [Fc, op, col, em] of farOps) fp.quad(at(Fc, op.x0, op.y0, 0.15), at(Fc, op.x1, op.y0, 0.15), at(Fc, op.x1, op.y1, 0.15), at(Fc, op.x0, op.y1, 0.15), col, { em });
    fp.facing(null).set(null);
  }

  return { hW, top: ridgeY, gableFront };
}
