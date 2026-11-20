import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, vnoise, fbm, lerp, clamp } from './gl.js';

// Everything in the game is built from code. A Builder collects tinted
// pieces and bakes them into a single mesh so a whole village is one draw.

const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function xf(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

export const mix = (a, b, t) => _c2.set(a).lerp(_c.set(b), t).clone();
export const jitter = (hex, r, amt = 0.08) => {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h + (r() - 0.5) * amt * 0.5, clamp(hsl.s + (r() - 0.5) * amt), clamp(hsl.l + (r() - 0.5) * amt));
  return c;
};

// give a geometry the attributes the paint shader wants
export function tint(geo, col, data = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  const pos = g.attributes.position;
  const n = pos.count;
  const colors = new Float32Array(n * 3);
  const dat = new Float32Array(n * 4);
  const em = data.emissive ?? 0;
  const sway = data.sway ?? 0;
  const fn = typeof col === 'function';
  if (!fn) _c.set(col);
  for (let i = 0; i < n; i++) {
    const c = fn ? col(pos.getX(i), pos.getY(i), pos.getZ(i)) : _c;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    dat[i * 4] = em;
    dat[i * 4 + 1] = typeof sway === 'function' ? sway(pos.getX(i), pos.getY(i), pos.getZ(i)) : sway;
    dat[i * 4 + 3] = 1;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('aData', new THREE.BufferAttribute(dat, 4));
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  return g;
}

// ---------------------------------------------------------------- primitives
function gableGeo(w, d, h) {
  const x = w / 2,
    z = d / 2;
  const v = [
    // left slope
    -x, 0, -z, -x, 0, z, 0, h, z, -x, 0, -z, 0, h, z, 0, h, -z,
    // right slope
    x, 0, z, x, 0, -z, 0, h, -z, x, 0, z, 0, h, -z, 0, h, z,
    // gables
    -x, 0, z, x, 0, z, 0, h, z, x, 0, -z, -x, 0, -z, 0, h, -z,
    // underside
    -x, 0, -z, x, 0, -z, x, 0, z, -x, 0, -z, x, 0, z, -x, 0, z,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}
function hipGeo(w, d, h, ridge = 0.45) {
  const x = w / 2,
    z = d / 2,
    r = (d / 2) * ridge;
  const v = [
    -x, 0, -z, -x, 0, z, 0, h, r, -x, 0, -z, 0, h, r, 0, h, -r,
    x, 0, z, x, 0, -z, 0, h, -r, x, 0, z, 0, h, -r, 0, h, r,
    -x, 0, z, x, 0, z, 0, h, r, x, 0, -z, -x, 0, -z, 0, h, -r,
    -x, 0, -z, x, 0, -z, x, 0, z, -x, 0, -z, x, 0, z, -x, 0, z,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export class Builder {
  constructor() {
    this.parts = [];
  }
  add(geo, col, m, data) {
    const g = tint(geo, col, data);
    if (m) g.applyMatrix4(m);
    this.parts.push(g);
    return this;
  }
  // y is always the base of the piece
  box(w, h, d, col, x, y, z, ry = 0, data, M) {
    const m = xf(x, y + h / 2, z, ry);
    return this.add(new THREE.BoxGeometry(w, h, d), col, M ? M.clone().multiply(m) : m, data);
  }
  cyl(rt, rb, h, col, x, y, z, seg = 8, data, M, rx = 0, rz = 0) {
    const m = xf(x, y, z, 0, 1, 1, 1, rx, rz).multiply(xf(0, h / 2, 0));
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), col, M ? M.clone().multiply(m) : m, data);
  }
  ball(r, col, x, y, z, sx = 1, sy = 1, sz = 1, detail = 1, data, M) {
    const m = xf(x, y, z, 0, sx, sy, sz);
    return this.add(new THREE.IcosahedronGeometry(r, detail), col, M ? M.clone().multiply(m) : m, data);
  }
  gable(w, d, h, col, x, y, z, ry = 0, data, M) {
    const m = xf(x, y, z, ry);
    return this.add(gableGeo(w, d, h), col, M ? M.clone().multiply(m) : m, data);
  }
  hip(w, d, h, col, x, y, z, ry = 0, data, M, ridge) {
    const m = xf(x, y, z, ry);
    return this.add(hipGeo(w, d, h, ridge), col, M ? M.clone().multiply(m) : m, data);
  }
  geometry() {
    const g = mergeGeometries(this.parts, false);
    this.parts.length = 0;
    return g;
  }
  mesh(material) {
    const m = new THREE.Mesh(this.geometry(), material);
    m.frustumCulled = false;
    return m;
  }
}

// ---------------------------------------------------------------- ground
// focus > 0 packs the grid tighter around the centre, where the player walks
export function terrain(heightAt, extent, seg, colorFn, focus = 0.7, pow = 2.3, cx = 0, cz = 0) {
  const g = new THREE.PlaneGeometry(2, 2, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const warp = (u) => extent * ((1 - focus) * u + focus * Math.sign(u) * Math.abs(u) ** pow);
  for (let i = 0; i < p.count; i++) {
    const x = cx + warp(p.getX(i)),
      z = cz + warp(p.getZ(i));
    p.setXYZ(i, x, heightAt(x, z), z);
  }
  g.computeVertexNormals();
  return tint(g, (x, y, z) => colorFn(x, z, y));
}

// a path laid over the ground: points [[x,z],...]
export function ribbon(points, width, heightAt, col, { lift = 0.07, closed = false, across = 3, step = 1.6 } = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    closed,
    'catmullrom',
    0.5
  );
  const n = Math.max(4, Math.ceil(curve.getLength() / step));
  const pts = curve.getSpacedPoints(n);
  const v = [];
  const idx = [];
  const wFn = typeof width === 'function' ? width : () => width;
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(n, i + 1)];
    let tx = b.x - a.x,
      tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    const w = wFn(i / n);
    for (let k = 0; k <= across; k++) {
      const s = (k / across - 0.5) * w;
      const x = pts[i].x - tz * s,
        z = pts[i].z + tx * s;
      v.push(x, heightAt(x, z) + lift, z);
    }
  }
  const row = across + 1;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < across; k++) {
      const a = i * row + k,
        b = a + 1,
        c = a + row,
        d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return tint(g, col);
}

// an irregular patch (plaza, field, pond) draped on the ground
export function patch(cx, cz, radius, heightAt, col, { lift = 0.06, rings = 6, seg = 40, wobble = 0.12, sx = 1, sz = 1, ry = 0 } = {}) {
  const v = [],
    idx = [];
  const ca = Math.cos(ry),
    sa = Math.sin(ry);
  v.push(cx, heightAt(cx, cz) + lift, cz);
  for (let r = 1; r <= rings; r++)
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      const rr = (r / rings) * radius * (1 + (vnoise(Math.cos(a) * 2 + cx, Math.sin(a) * 2 + cz) - 0.5) * 2 * wobble * (r / rings));
      const lx = Math.cos(a) * rr * sx,
        lz = Math.sin(a) * rr * sz;
      const x = cx + lx * ca - lz * sa,
        z = cz + lx * sa + lz * ca;
      v.push(x, heightAt(x, z) + lift, z);
    }
  for (let s = 0; s < seg; s++) idx.push(0, 1 + ((s + 1) % seg), 1 + s);
  for (let r = 1; r < rings; r++)
    for (let s = 0; s < seg; s++) {
      const a = 1 + (r - 1) * seg + s,
        b = 1 + (r - 1) * seg + ((s + 1) % seg),
        c = a + seg,
        d = b + seg;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return tint(g, col);
}

// distant ranges: a ring wall whose silhouette is a height profile
export function mountainRing({ radius, base = -10, profile, colorFn, seg = 220, rows = 5, depth = 60, a0 = 0, a1 = Math.PI * 2 }) {
  const v = [],
    idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = lerp(a0, a1, i / seg);
    const h = profile(a);
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const rad = radius + depth * t;
      const y = base + (h - base) * Math.sin(t * Math.PI * 0.5);
      v.push(Math.sin(a) * rad, y, -Math.cos(a) * rad);
    }
  }
  const row = rows + 1;
  for (let i = 0; i < seg; i++)
    for (let r = 0; r < rows; r++) {
      const a = i * row + r,
        b = a + 1,
        c = a + row,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return tint(g, (x, y, z) => colorFn(x, y, z));
}

// ---------------------------------------------------------------- plants
export function cypress(B, x, y, z, h, r, R, o = {}) {
  const dark = o.dark ?? 0x0b1c1a,
    mid = o.mid ?? 0x1c4a38,
    warm = o.warm ?? 0x4a3a16;
  const flames = o.flames ?? 1;
  for (let f = 0; f < flames; f++) {
    const fh = f === 0 ? h : h * (0.45 + R() * 0.3);
    const fr = f === 0 ? r : r * (0.5 + R() * 0.3);
    const ox = f === 0 ? 0 : (R() - 0.5) * r * 2.2,
      oz = f === 0 ? 0 : (R() - 0.5) * r * 2.2;
    const rings = 16,
      seg = 12;
    const v = [],
      idx = [];
    const tw = R() * 6;
    for (let k = 0; k <= rings; k++) {
      const t = k / rings;
      // flame profile: full low down, licking to a point
      const prof = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - t * 0.25) + 0.02;
      for (let s = 0; s < seg; s++) {
        const a = (s / seg) * Math.PI * 2 + t * 2.4 + tw;
        const nz = 1 + (vnoise(s * 1.7 + tw, k * 0.9 + f * 9) - 0.5) * 0.7;
        const rr = fr * prof * nz;
        const lean = Math.sin(t * 3 + tw) * fr * 0.25 * t;
        v.push(x + ox + Math.cos(a) * rr + lean, y + t * fh, z + oz + Math.sin(a) * rr);
      }
    }
    for (let k = 0; k < rings; k++)
      for (let s = 0; s < seg; s++) {
        const a = k * seg + s,
          b = k * seg + ((s + 1) % seg),
          c = a + seg,
          d = b + seg;
        idx.push(a, c, b, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    B.parts.push(
      tint(
        g,
        (px, py, pz) => {
          const n = vnoise(px * 0.9 + pz * 0.7, py * 0.35);
          const c = mix(dark, mid, n);
          if (n > 0.72) c.lerp(_c.set(warm), 0.6);
          return c;
        },
        { sway: (px, py) => Math.pow(clamp((py - y) / fh), 2) * (o.sway ?? 0.5) }
      )
    );
  }
}

export function blobTree(B, x, y, z, h, r, R, o = {}) {
  const trunk = o.trunk ?? 0x2a2233,
    lo = o.lo ?? 0x1a3a5a,
    hi = o.hi ?? 0x3f7fa8;
  const th = h * (o.trunkH ?? 0.45);
  const lean = (R() - 0.5) * 0.3;
  B.cyl(r * 0.09, r * 0.16, th + r * 0.3, trunk, x, y - 0.2, z, 6, undefined, undefined, lean, lean * 0.6);
  const n = o.blobs ?? 4;
  for (let i = 0; i < n; i++) {
    const a = R() * 6.283,
      d = i === 0 ? 0 : r * (0.35 + R() * 0.4);
    const br = r * (i === 0 ? 0.78 : 0.42 + R() * 0.26);
    const bx = x + Math.cos(a) * d + lean * th,
      bz = z + Math.sin(a) * d,
      by = y + th + (i === 0 ? r * 0.35 : R() * r * 0.55);
    const geo = new THREE.IcosahedronGeometry(br, 2);
    const p = geo.attributes.position;
    const sd = R() * 50;
    for (let k = 0; k < p.count; k++) {
      const px = p.getX(k),
        py = p.getY(k),
        pz = p.getZ(k);
      const m = 1 + (vnoise(px * 1.3 + sd, pz * 1.3 + py) - 0.5) * 0.55;
      p.setXYZ(k, px * m, py * m * (o.squash ?? 0.8), pz * m);
    }
    geo.computeVertexNormals();
    const top = by + br;
    B.add(
      geo,
      (px, py, pz) => mix(lo, hi, clamp((py + br * 0.5) / (br * 1.3)) * 0.75 + vnoise(px * 2 + sd, pz * 2) * 0.35),
      xf(bx, by, bz),
      { sway: (px, py) => 0.12 + clamp((py + br) / (2 * br)) * (o.sway ?? 0.25) }
    );
  }
}

export function pine(B, x, y, z, h, r, R, o = {}) {
  const trunk = o.trunk ?? 0x3a2a22,
    lo = o.lo ?? 0x1d3b34,
    hi = o.hi ?? 0x2f6a55;
  const bend = (R() - 0.5) * 0.5;
  B.cyl(r * 0.07, r * 0.13, h * 0.95, trunk, x, y - 0.2, z, 6, undefined, undefined, bend * 0.4, bend);
  const tiers = o.tiers ?? 4;
  for (let i = 0; i < tiers; i++) {
    const t = (i + 1) / tiers;
    const ty = y + h * (0.42 + 0.56 * t);
    const tr = r * (1.05 - t * 0.55);
    const ox = -bend * (ty - y) + (R() - 0.5) * r * 0.7,
      oz = bend * 0.4 * (ty - y) + (R() - 0.5) * r * 0.7;
    const geo = new THREE.IcosahedronGeometry(tr, 1);
    B.add(geo, (px, py) => mix(lo, hi, clamp(py / tr * 0.5 + 0.5)), xf(x + ox, ty, z + oz, R() * 6, 1, 0.3, 1), {
      sway: 0.12,
    });
  }
}

// ---------------------------------------------------------------- buildings
const WARM = [0xffd56b, 0xffb84d, 0xffe6a3, 0xffc861];

export function house(B, W, o) {
  const R = o.R;
  const { x, z, w, d, h } = o;
  const y = o.y ?? W.heightAt(x, z);
  const ry = o.ry ?? 0;
  const M = xf(x, y, z, ry);
  const roofH = o.roofH ?? w * 0.42;
  const over = o.over ?? 0.5;
  const wall = o.wall,
    roof = o.roof,
    trim = o.trim ?? 0x2a2433;

  // walls with a darker footing
  B.box(w, h, d, (px, py) => mix(wall, 0x000000, clamp(0.28 - (py + h / 2) * 0.22, 0, 0.28)), 0, -0.4, 0, 0, undefined, M);
  if (o.roofType === 'hip') {
    if (w > d) B.hip(d + over * 2, w + over * 2, roofH, roof, 0, h - 0.4, 0, Math.PI / 2, undefined, M, o.ridge);
    else B.hip(w + over * 2, d + over * 2, roofH, roof, 0, h - 0.4, 0, 0, undefined, M, o.ridge);
  }
  else if (o.roofType === 'flat') B.box(w + 0.4, 0.5, d + 0.4, roof, 0, h - 0.4, 0, 0, undefined, M);
  else {
    // ridge runs along the long side unless told otherwise
    const along = o.ridgeAlongX ?? w > d;
    if (along) B.gable(d + over * 2, w + over * 1.2, roofH, roof, 0, h - 0.4, 0, Math.PI / 2, undefined, M);
    else B.gable(w + over * 2, d + over * 1.2, roofH, roof, 0, h - 0.4, 0, 0, undefined, M);
    if (o.roofType === 'step') {
      // Dutch stepped gables on the narrow ends
      const steps = 4;
      for (const sgn of [-1, 1])
        for (let s = 0; s < steps; s++) {
          const sw = w * (1 - s / steps) + 0.2;
          const sh = roofH / steps + 0.25;
          B.box(sw, sh, 0.35, wall, 0, h - 0.4 + (s * roofH) / steps, sgn * (d / 2 + 0.05), 0, undefined, M);
        }
    }
  }
  if (o.chimney !== false && R() < (o.chimneyChance ?? 0.7))
    B.box(0.7, roofH * 0.9 + 0.8, 0.7, o.chimneyCol ?? mix(wall, 0x000000, 0.35), (R() - 0.5) * w * 0.5, h + roofH * 0.25, (R() - 0.5) * d * 0.4, 0, undefined, M);

  // openings
  const floors = Math.max(1, Math.round((h - 0.6) / 3));
  const fh = (h - 0.6) / floors;
  const lit = o.lit ?? 0.75;
  const winW = o.winW ?? 0.95,
    winH = o.winH ?? 1.25;
  const placeRow = (len, axis, sign) => {
    const cols = Math.max(1, Math.floor(len / 2.3));
    for (let f = 0; f < floors; f++)
      for (let c = 0; c < cols; c++) {
        const u = ((c + 0.5) / cols - 0.5) * len;
        const wy = f * fh + fh * 0.42;
        const isDoor = axis === 'z' && sign === 1 && f === 0 && c === Math.floor(cols / 2) && o.door !== false;
        const on = R() < lit;
        const col = on ? WARM[(R() * WARM.length) | 0] : 0x18203a;
        const data = on ? { emissive: 1 } : undefined;
        const t = 0.12;
        const place = (bw, bh, bd, cc, ou, oy, off, dt) => {
          if (axis === 'z') B.box(bw, bh, bd, cc, u + ou, oy, sign * (d / 2 + off), 0, dt, M);
          else B.box(bd, bh, bw, cc, sign * (w / 2 + off), oy, u + ou, 0, dt, M);
        };
        if (isDoor) {
          place(1.15, 2.15, t, o.doorCol ?? 0x3a2418, 0, -0.3, 0.03);
          place(1.45, 0.16, t * 1.6, trim, 0, 1.85, 0.05);
          continue;
        }
        place(winW + 0.22, winH + 0.22, t, trim, 0, wy - 0.11, 0.02);
        place(winW, winH, t, col, 0, wy, 0.06, data);
        if (o.mullion !== false) {
          place(0.07, winH, t, trim, 0, wy, 0.09);
          place(winW, 0.07, t, trim, 0, wy + winH * 0.5, 0.09);
        }
        if (o.shutters) {
          place(0.34, winH + 0.1, t, o.shutters, -(winW / 2 + 0.26), wy - 0.05, 0.05);
          place(0.34, winH + 0.1, t, o.shutters, winW / 2 + 0.26, wy - 0.05, 0.05);
        }
        if (o.flowerBox && f > 0 && R() < 0.45) {
          place(winW + 0.2, 0.22, 0.3, 0x4a2c1c, 0, wy - 0.34, 0.16);
          place(winW, 0.2, 0.26, [0xd9344a, 0xf2c530, 0xe07ac0][(R() * 3) | 0], 0, wy - 0.16, 0.16);
        }
        if (on && f === 0 && W.maps) {
          const lx = axis === 'z' ? u : sign * (w / 2 + 1.6),
            lz = axis === 'z' ? sign * (d / 2 + 1.6) : u;
          const cs = Math.cos(ry),
            sn = Math.sin(ry);
          W.maps.lamp(x + lx * cs + lz * sn, z - lx * sn + lz * cs, 4.2, col, 0.5);
        }
      }
  };
  placeRow(w, 'z', 1);
  placeRow(w, 'z', -1);
  placeRow(d, 'x', 1);
  placeRow(d, 'x', -1);

  W.colliders?.push({ x, z, hw: w / 2 + 0.3, hd: d / 2 + 0.3, ry, top: y + h + roofH });
  W.maps?.blob(x, z, Math.max(w, d) * 0.95, 0.4);
  return { top: y + h + roofH };
}

export function lampPost(B, W, x, z, o = {}) {
  const y = W.heightAt(x, z);
  const h = o.h ?? 3.3;
  const col = o.col ?? 0xffc46a;
  B.cyl(0.06, 0.1, h, o.pole ?? 0x14161f, x, y, z, 6);
  B.box(0.34, 0.42, 0.34, col, x, y + h, z, 0, { emissive: 1 });
  B.hip(0.5, 0.5, 0.2, o.pole ?? 0x14161f, x, y + h + 0.42, z, 0, undefined, undefined, 0);
  W.glows.push({ p: [x, y + h + 0.2, z], c: col, size: o.glow ?? 2.4 });
  W.maps?.lamp(x, z, o.radius ?? 9, col, o.strength ?? 0.85);
}

// ---------------------------------------------------------------- people
// a small standing figure made of a few soft shapes
export function figure(B, x, y, z, ry, o = {}) {
  const s = o.scale ?? 1;
  const M = xf(x, y, z, ry, s, s, s);
  const coat = o.coat ?? 0x2a3350,
    skin = o.skin ?? 0xe0b090,
    hair = o.hair ?? 0x2a1c14,
    legs = o.legs ?? 0x1c1c26;
  const lean = o.lean ?? 0;
  const L = xf(0, 0, 0, 0, 1, 1, 1, lean, 0);
  const ML = M.clone().multiply(L);
  if (o.dress) B.cyl(0.2, 0.42, 1.05, coat, 0, 0, 0, 8, undefined, ML);
  else {
    B.cyl(0.09, 0.1, 0.85, legs, -0.11, 0, 0, 6, undefined, ML);
    B.cyl(0.09, 0.1, 0.85, legs, 0.11, 0, 0, 6, undefined, ML);
  }
  B.cyl(0.19, 0.25, 0.62, coat, 0, 0.82, 0, 8, undefined, ML);
  B.ball(0.2, coat, 0, 1.42, 0, 1.05, 0.55, 0.8, 1, undefined, ML);
  // arms
  const ar = o.arms ?? 0.12;
  B.cyl(0.065, 0.07, 0.62, coat, -0.26, 0.86, 0, 6, undefined, ML, 0, -ar);
  B.cyl(0.065, 0.07, 0.62, coat, 0.26, 0.86, 0, 6, undefined, ML, 0, ar);
  B.ball(0.19, skin, 0, 1.68, 0, 1, 1.08, 1, 2, undefined, ML);
  if (o.hat === 'top') {
    B.cyl(0.16, 0.17, 0.3, o.hatCol ?? 0x15151c, 0, 1.82, 0, 10, undefined, ML);
    B.cyl(0.27, 0.27, 0.03, o.hatCol ?? 0x15151c, 0, 1.81, 0, 12, undefined, ML);
  } else if (o.hat === 'straw') {
    B.cyl(0.14, 0.17, 0.14, o.hatCol ?? 0xe2c46a, 0, 1.82, 0, 10, undefined, ML);
    B.cyl(0.36, 0.36, 0.025, o.hatCol ?? 0xe2c46a, 0, 1.81, 0, 14, undefined, ML);
  } else if (o.hat === 'cone') {
    B.cyl(0.02, 0.4, 0.2, o.hatCol ?? 0xd9c28a, 0, 1.8, 0, 12, undefined, ML);
  } else {
    B.ball(0.2, hair, 0, 1.73, -0.02, 1.02, 0.95, 1.04, 2, undefined, ML);
  }
}

export { rng, vnoise, fbm, lerp, clamp };

// a sheet of rows x cols points where every quad can carry its own flat
// colour (stripes on a printed wave, bands of a sunset, tiles of a floor)
export function gridGeo(rows, cols, posFn, colFn, { sway = 0, emissive = 0 } = {}) {
  const v = [],
    idx = [];
  for (let i = 0; i <= rows; i++)
    for (let j = 0; j <= cols; j++) {
      const p = posFn(i / rows, j / cols, i, j);
      v.push(p[0], p[1], p[2]);
    }
  const row = cols + 1;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * row + j,
        b = a + 1,
        c = a + row,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g = g.toNonIndexed();
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  const dat = new Float32Array(n * 4);
  for (let q = 0; q < rows * cols; q++) {
    const i = Math.floor(q / cols),
      j = q % cols;
    const c = colFn(i / rows, j / cols, i, j);
    for (let k = 0; k < 6; k++) {
      const o = q * 6 + k;
      colors[o * 3] = c.r;
      colors[o * 3 + 1] = c.g;
      colors[o * 3 + 2] = c.b;
      dat[o * 4] = emissive;
      dat[o * 4 + 1] = sway;
      dat[o * 4 + 3] = 1;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('aData', new THREE.BufferAttribute(dat, 4));
  return g;
}
