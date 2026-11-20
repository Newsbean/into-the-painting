import { Builder, mix, xf } from '../../../engine/build.js';
import { rng, clamp, lerp } from '../../../engine/gl.js';
import { CLOTH, PALE, SKIN, STONE, STONE_D, THATCH, THATCH_D, TIMBER, VERM } from '../palette.js';
import { nearRoute, keptClear } from '../ground-plan.js';
import { rod } from '../helpers.js';
import { tuft } from '../plants.js';
import { minka as edoMinka } from '../edo/house.js';

// What every print is handed: the dice, the builders they all draw into, and
// the small tools for standing something on the land (a footing, a lantern, a
// farmhouse, a terrace of fields, a grove). The prints share one seeded dice (Q)
// and three builders, so the order they are called in is part of the picture.
// (X and SPARE here are the prints' own builders, not the ones of the same name
// in the kit of ../index.js.)
export function printKit(world, flat) {
  const S = world.scene,
    maps = world.maps;
  const H = (x, z) => world.heightAt(x, z);
  const Q = rng(3636);
  const X = new Builder(); // wood, stone, cloth and people
  const P = new Builder(); // things that grow
  const GR = new Builder(); // roads, paths and running water, laid on the ground
  const SPARE = new Builder(); // never shown: takes pieces that would have cut through something
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  const toFuji = (x, z) => face(x, z, 178, -1120);
  const pick = (a) => a[(Q() * a.length) | 0];
  const solid = (x, z, r, top) => world.colliders.push({ x, z, r, top });
  const wall = (x, z, hw, hd, ry, top, bottom) => world.colliders.push(bottom === undefined ? { x, z, hw, hd, ry, top } : { x, z, hw, hd, ry, top, bottom });
  const deck = (minx, maxx, minz, maxz, y) => world.platforms.push({ minx, maxx, minz, maxz, y });
  const glow = (x, y, z, size = 1.8, c = 0xffc878) => world.glows.push({ p: [x, y, z], c, size });
  const near = (x, z, r) => {
    for (const c of world.colliders) if (Math.hypot(x - c.x, z - c.z) < (c.r !== undefined ? c.r : Math.hypot(c.hw, c.hd)) + r) return true;
    return false;
  };
  // lowest and highest ground under a footprint
  const spanY = (x, z, w, d, ry = 0) => {
    const c = Math.cos(ry),
      s = Math.sin(ry);
    let lo = 1e9,
      hi = -1e9;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const y = H(x + (a * w * c) / 2 + (b * d * s) / 2, z - (a * w * s) / 2 + (b * d * c) / 2);
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
    return [lo, hi];
  };
  const thatch = (px, py) => mix(THATCH_D, THATCH, clamp(py * 0.45));
  const dress = (o = {}) => ({ coat: pick(CLOTH), legs: pick([0x3a4a5a, 0x4a5560, SKIN, 0x2f548a]), ...o });

  // a thatched farmhouse on a stone footing, levelled into the slope; its door faces local +z
  const minka = (x, z, ry, w, d, o = {}) => {
    const [lo, hi] = spanY(x, z, w + 0.6, d + 0.6, ry);
    const y = hi + 0.1,
      h = o.h ?? 2.5,
      rh = o.roofH ?? Math.min(w, d) * 0.6;
    edoMinka(world.edoKit, world, { x, z, ry, w, d, y, lo, h, roofH: rh, wall: o.wall, door: o.door, lit: o.lit });
    wall(x, z, w / 2 + 0.3, d / 2 + 0.3, ry, y + h + rh);
    maps.blob(x, z, Math.max(w, d) * 0.95, 0.4);
    return y;
  };
  const lanternAt = (x, z, lit = true) => {
    const y = H(x, z);
    X.cyl(0.2, 0.28, 1.4, STONE, x, y - 0.1, z, 6);
    X.box(0.7, 0.12, 0.7, STONE_D, x, y + 1.3, z);
    X.box(0.46, 0.46, 0.46, lit ? 0xffc878 : 0xcfc8b0, x, y + 1.42, z, 0, lit ? { emissive: 1 } : undefined);
    X.hip(0.95, 0.95, 0.42, STONE_D, x, y + 1.88, z, 0, undefined, undefined, 0);
    if (lit) {
      glow(x, y + 1.7, z);
      maps.lamp(x, z, 7, 0xffc878, 0.8);
    }
  };
  // a wayside stone figure in a red bib
  const jizo = (x, z, ry) => {
    const M = xf(x, H(x, z), z, ry);
    X.box(0.5, 0.2, 0.5, STONE_D, 0, -0.06, 0, 0, undefined, M);
    rod(X, [0, 0.12, 0], [0, 0.78, 0], 0.2, 0.14, STONE, 5, undefined, M);
    X.ball(0.16, STONE, 0, 0.92, 0, 1, 1, 1, 0, undefined, M);
    X.box(0.3, 0.2, 0.06, VERM, 0, 0.56, 0.15, 0, undefined, M);
  };
  // stepped fields: each one a low banked shelf cut into the slope, small enough to climb like a stair
  const fields = (x0, x1, z0, z1, colW, kind) => {
    const made = [];
    for (let xa = x0; xa < x1 - 2; xa += colW) {
      const xb = Math.min(x1, xa + colW),
        xc = (xa + xb) / 2,
        w = xb - xa;
      let z = z0 + Q() * 1.5;
      while (z < z1 - 3) {
        const top = Math.max(H(xa, z), H(xc, z), H(xb, z)) + 0.55;
        let d = 3;
        while (d < 9 && z + d < z1 && Math.max(H(xa, z + d), H(xc, z + d), H(xb, z + d)) < top - 0.05) d += 0.5;
        const zc = z + d / 2,
          big = Math.max(w, d) * 0.5;
        if (top > 1.95 && !nearRoute(xc, zc, big - 1.2) && !near(xc, zc, big)) {
          const lo = Math.min(H(xa, z), H(xb, z)) - 0.6;
          const odd = (made.length + Math.round(xa / colW)) % 2;
          X.box(w - 0.12, top - lo, d - 0.08, kind === 'rice' ? 0x7d9470 : 0x8f9a72, xc, lo, zc);
          X.box(w - 0.8, 0.07, d - 0.7, kind === 'rice' ? (odd ? PALE : 0xb9cfd0) : 0xcdbf94, xc, top - 0.02, zc);
          deck(xa, xb, z, z + d, top + 0.05);
          made.push({ x: xc, z: zc, w: w - 1.4, d: d - 1.2, y: top + 0.05 });
          if (kind === 'rice') {
            for (let px = xa + 1.0; px < xb - 0.7; px += 1.5) for (let pz = z + 0.8; pz < z + d - 0.6; pz += 1.3) tuft(P, px + (Q() - 0.5) * 0.3, top + 0.12, pz + (Q() - 0.5) * 0.3, 0.55, Q, 0x5f8a4a, 0.25, 1);
          } else {
            let k = 0;
            for (let pz = z + 0.95; pz < z + d - 0.7; pz += 1.25) X.box(w - 1.6, 0.26, 0.5, (odd + k++) % 2 ? 0x6f9a5a : 0x86aa66, xc, top + 0.03, pz);
          }
        }
        z += d;
      }
    }
    return made;
  };
  // scatter something that grows over a rectangle of open hillside
  const grove = (n, x0, x1, z0, z1, plant, gap = 2.4, minY = 2.2) => {
    let k = 0,
      guard = 0;
    while (k < n && guard++ < n * 40) {
      const x = lerp(x0, x1, Q()),
        z = lerp(z0, z1, Q());
      const y = H(x, z);
      if (y < minY || keptClear(x, z, 1.5) || near(x, z, gap)) continue;
      plant(x, y, z);
      k++;
    }
  };

  return { S, H, maps, flat, Q, X, P, GR, SPARE, face, toFuji, pick, solid, wall, deck, glow, near, spanY, thatch, dress, minka, lanternAt, jizo, fields, grove };
}
