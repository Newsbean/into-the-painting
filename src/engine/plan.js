// Town planning, for any world. Streets are polylines with a width; houses are laid in rows along
// both sides of every street, facing it, wherever nothing is in the way: another
// street, a square or a monument that must be kept clear, a house already standing.
//
//   const { lots, traces, inRoad } = layLots(streets, { R, keep, inside })
//   streets: [{ pts: [[x, z], ...], w: wall-to-wall width, houses?: false, sides?: [-1, 1], main?: true }]
//   keep:    [{ x, z, r }] or [{ x0, x1, z0, z1 }]   ground that stays open
//   inside:  (x, z) => boolean                         the edge of town
//   lot:     { x, z, ry, w, d, street, side, s, before, after }   (before/after: is there a gap along the row)
import * as THREE from 'three';
import { lerp } from './gl.js';

// points about every `step` metres along a smoothed polyline, with the direction of travel
export function trace(pts, step = 1) {
  const c = new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    false,
    'catmullrom',
    0.5
  );
  const L = c.getLength();
  const n = Math.max(2, Math.ceil(L / step));
  const P = c.getSpacedPoints(n);
  const T = P.map((p, i) => {
    const a = P[Math.max(0, i - 1)],
      b = P[Math.min(n, i + 1)];
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { x: p.x, z: p.z, tx: (b.x - a.x) / l, tz: (b.z - a.z) / l, s: (i / n) * L };
  });
  T.length_ = L;
  return T;
}
export const along = (T, s) => T[Math.max(0, Math.min(T.length - 1, Math.round((s / T.length_) * (T.length - 1))))];

// a coarse grid for "what is near this point"
export class Hash {
  constructor(cell = 16) {
    this.cell = cell;
    this.map = new Map();
  }
  key(i, j) {
    return i * 73856093 + j * 19349663;
  }
  add(x, z, v) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(z / this.cell));
    let a = this.map.get(k);
    if (!a) this.map.set(k, (a = []));
    a.push([x, z, v]);
  }
  // does fn(x, z, v) hold for anything within r of the point?
  any(x, z, r, fn) {
    const c = this.cell;
    const i0 = Math.floor((x - r) / c),
      i1 = Math.floor((x + r) / c),
      j0 = Math.floor((z - r) / c),
      j1 = Math.floor((z + r) / c);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const a = this.map.get(this.key(i, j));
        if (!a) continue;
        for (const e of a) if (fn(e[0], e[1], e[2])) return true;
      }
    return false;
  }
}

// do two turned rectangles { x, z, ry, w, d } overlap?
export function overlap(a, b) {
  const axes = [
    [Math.cos(a.ry), -Math.sin(a.ry)],
    [Math.sin(a.ry), Math.cos(a.ry)],
    [Math.cos(b.ry), -Math.sin(b.ry)],
    [Math.sin(b.ry), Math.cos(b.ry)],
  ];
  const dx = b.x - a.x,
    dz = b.z - a.z;
  for (const n of axes) {
    const ra = (a.w / 2) * Math.abs(axes[0][0] * n[0] + axes[0][1] * n[1]) + (a.d / 2) * Math.abs(axes[1][0] * n[0] + axes[1][1] * n[1]);
    const rb = (b.w / 2) * Math.abs(axes[2][0] * n[0] + axes[2][1] * n[1]) + (b.d / 2) * Math.abs(axes[3][0] * n[0] + axes[3][1] * n[1]);
    if (Math.abs(dx * n[0] + dz * n[1]) > ra + rb) return false;
  }
  return true;
}

export function inKeep(keep, x, z, pad = 0) {
  for (const k of keep) {
    if (k.r !== undefined) {
      if ((x - k.x) ** 2 + (z - k.z) ** 2 < (k.r + pad) ** 2) return true;
    } else if (x > k.x0 - pad && x < k.x1 + pad && z > k.z0 - pad && z < k.z1 + pad) return true;
  }
  return false;
}

export function layLots(streets, o) {
  const { R, keep = [], inside = () => true, widths = [6, 11.5], depths = [9, 13], setback = 0.45 } = o;
  const traces = streets.map((st) => trace(st.pts, 1));
  const roads = new Hash(14);
  let widest = 0;
  traces.forEach((T, i) => {
    widest = Math.max(widest, streets[i].w / 2);
    for (const p of T) roads.add(p.x, p.z, streets[i].w / 2);
  });
  const inRoad = (x, z, pad = 0.15) => roads.any(x, z, widest + pad + 1, (px, pz, hw) => (x - px) ** 2 + (z - pz) ** 2 < (hw + pad) ** 2);

  const lots = [];
  const placed = new Hash(26);
  const fits = (x, z, ry, w, d) => {
    const cs = Math.cos(ry),
      sn = Math.sin(ry);
    const P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const hw = w / 2,
      hd = d / 2;
    for (const [px, pz] of [P(-hw, -hd), P(hw, -hd), P(hw, hd), P(-hw, hd), P(0, -hd), P(0, hd), P(-hw, 0), P(hw, 0), [x, z]]) {
      if (!inside(px, pz) || inKeep(keep, px, pz) || inRoad(px, pz)) return false;
    }
    const me = { x, z, ry, w: w - 0.35, d: d - 0.35 };
    return !placed.any(x, z, 30, (ox, oz, lot) => overlap(lot, me));
  };

  streets.forEach((st, si) => {
    if (st.houses === false) return;
    const T = traces[si];
    const L = T.length_;
    for (const side of st.sides ?? [-1, 1]) {
      let s = 1 + R() * 2;
      let last = null;
      while (s < L - 3) {
        let ok = false;
        let w = lerp(widths[0], widths[1], R());
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          if (s + w <= L) {
            const p = along(T, s + w / 2);
            const nx = -p.tz * side,
              nz = p.tx * side; // away from the street on this side
            const d = lerp(depths[0], depths[1], R());
            const off = st.w / 2 + setback + d / 2;
            const x = p.x + nx * off,
              z = p.z + nz * off;
            const ry = Math.atan2(-nx, -nz); // the front door looks back at the street
            if (fits(x, z, ry, w, d)) {
              const lot = { x, z, ry, w, d, street: si, side, s: s + w / 2, s0: s, s1: s + w, before: true, after: true, main: !!st.main };
              if (last && s - last.s1 < 0.6) {
                lot.before = false;
                last.after = false;
              }
              lots.push(lot);
              placed.add(x, z, lot);
              last = lot;
              s += w + (R() < 0.05 ? 2.6 + R() * 2 : 0.02);
              ok = true;
            }
          }
          if (!ok) w = Math.max(widths[0] - 1.2, w * 0.72);
        }
        if (!ok) s += 2.2;
      }
    }
  });
  // is this spot (a circle of radius r) on a street or under a house?
  const occupied = (x, z, r = 1) => inRoad(x, z, r) || placed.any(x, z, 30, (ox, oz, lot) => overlap(lot, { x, z, ry: 0, w: 2 * r, d: 2 * r }));
  return { lots, traces, inRoad, occupied };
}
