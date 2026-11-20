import * as THREE from 'three';
import { tint, mix, xf, gridGeo } from '../../engine/build.js';
import { vnoise, clamp, lerp } from '../../engine/gl.js';

// Shapes this world builds with beyond the engine's own: poles and timbers between two
// points, loose flat-coloured triangles, rocks, a cheap cypress, staved drums and discs,
// and robed figures. Each adds to whatever Builder it is handed.

const _pd = new THREE.Vector3(),
  _px = new THREE.Vector3(),
  _pz = new THREE.Vector3(),
  _qc = new THREE.Color();
export const _UP = new THREE.Vector3(0, 1, 0);
// a frame whose Y runs from a to b, with X kept level
export function spanM(a, b) {
  _pd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _pd.length() || 1e-4;
  _pd.divideScalar(len);
  _px.crossVectors(_pd, _UP);
  if (_px.lengthSq() < 1e-8) _px.set(1, 0, 0);
  else _px.normalize();
  _pz.crossVectors(_px, _pd);
  const m = new THREE.Matrix4().makeBasis(_px, _pd, _pz);
  m.setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return [m, len];
}
// a round pole from a to b (r at a, r2 at b)
export function rod(B, a, b, r, col, seg = 5, r2 = r, data, M, capped = false) {
  const [m, len] = spanM(a, b);
  return B.add(new THREE.CylinderGeometry(r2, r, len, seg, 1, !capped), col, M ? M.clone().multiply(m) : m, data);
}
// a squared timber from a to b: w across (level), t through
export function beam(B, a, b, w, t, col, data, M) {
  const [m, len] = spanM(a, b);
  return B.add(new THREE.BoxGeometry(w, len, t), col, M ? M.clone().multiply(m) : m, data);
}
// loose triangles, each with its own flat colour
export class Quads {
  constructor() {
    this.v = [];
    this.c = [];
  }
  tri(a, b, c, col) {
    const k = col.isColor ? col : _qc.set(col);
    this.v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) this.c.push(k.r, k.g, k.b);
  }
  // counter-clockwise seen from the lit side
  quad(a, b, c, d, col, both = false) {
    this.tri(a, b, c, col);
    this.tri(a, c, d, col);
    if (both) {
      this.tri(a, c, b, col);
      this.tri(a, d, c, col);
    }
  }
  geometry(data = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.v, 3));
    g.computeVertexNormals();
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    const n = this.v.length / 3;
    const dat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      dat[i * 4] = data.emissive ?? 0;
      dat[i * 4 + 1] = data.sway ?? 0;
      dat[i * 4 + 3] = 1;
    }
    g.setAttribute('aData', new THREE.BufferAttribute(dat, 4));
    this.v = [];
    this.c = [];
    return g;
  }
}
// a lumpy ball: rocks, olive crowns, clay
export function lump(B, x, y, z, sx, sy, sz, seed, col, detail = 1, amp = 0.5, data, M, ry = seed) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const px = p.getX(k),
      py = p.getY(k),
      pz = p.getZ(k);
    const m = 1 + (vnoise(px * 1.7 + seed, pz * 1.7 + py * 1.3 + seed * 0.37) - 0.5) * amp;
    p.setXYZ(k, px * m, py * m, pz * m);
  }
  geo.computeVertexNormals();
  const m = xf(x, y, z, ry, sx, sy, sz);
  return B.add(geo, col, M ? M.clone().multiply(m) : m, data);
}
// a leaning stack of rock, as in the backgrounds of his paintings
export function spire(B, x, y, z, h, r, seed, lo, hi, topR = 0.3) {
  const geo = new THREE.CylinderGeometry(r * topR, r, h, 7, 4);
  const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const t = p.getY(k) / h + 0.5;
    const a = Math.atan2(p.getZ(k), p.getX(k));
    const m = 1 + (vnoise(a * 1.9 + seed, t * 3.1 + seed) - 0.5) * 0.8;
    p.setX(k, p.getX(k) * m + Math.sin(t * 2.6 + seed) * r * 0.22 * t);
    p.setZ(k, p.getZ(k) * m + Math.cos(t * 2.1 + seed * 1.7) * r * 0.18 * t);
  }
  geo.computeVertexNormals();
  return B.add(geo, (px, py, pz) => mix(lo, hi, clamp(py / h + 0.5) * 0.75 + vnoise(px * 0.6 + seed, pz * 0.6 + py * 0.4) * 0.25), xf(x, y + h / 2, z));
}
// a cypress in few triangles
export function flame(B, x, y, z, h, r, seed) {
  const rings = 6,
    seg = 7;
  const v = [],
    idx = [];
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const prof = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - t * 0.25) + 0.02;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * 6.283 + t * 2.4 + seed;
      const rr = r * prof * (1 + (vnoise(s * 1.7 + seed, k * 0.9) - 0.5) * 0.6);
      v.push(x + Math.cos(a) * rr + Math.sin(t * 3 + seed) * r * 0.2 * t, y + t * h, z + Math.sin(a) * rr);
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
        return mix(0x1a2a1a, n > 0.72 ? 0x5a5a2a : 0x3a5a34, n);
      },
      { sway: (px, py) => Math.pow(clamp((py - y) / h), 2) * 0.3 }
    )
  );
}
// the side of a cone or drum, one flat colour per stave (y1 above y0)
export function shell(B, r0, y0, r1, y1, n, colFn, M) {
  const g = gridGeo(1, n, (u, v) => [Math.cos(v * 6.2832) * lerp(r0, r1, u), lerp(y0, y1, u), Math.sin(v * 6.2832) * lerp(r0, r1, u)], (u, v, i, j) => colFn(j));
  if (M) g.applyMatrix4(M);
  B.parts.push(g);
}
// a flat ring of boards, facing up
export function disc(B, r0, r1, y, n, colFn, M) {
  const g = gridGeo(1, n, (u, v) => [Math.cos(-v * 6.2832) * lerp(r0, r1, u), y, Math.sin(-v * 6.2832) * lerp(r0, r1, u)], (u, v, i, j) => colFn(j));
  if (M) g.applyMatrix4(M);
  B.parts.push(g);
}
// a robed figure that can stand, sit or kneel and gesture. Faces +z; hands are [right, left], measured from each shoulder.
export function person(B, M, o = {}) {
  const robe = o.robe ?? 0x6a4a3a,
    mantle = o.mantle,
    skin = o.skin ?? 0xdcb48e,
    hair = o.hair ?? 0x3a2a1c;
  const pose = o.pose ?? 'stand';
  const hip = pose === 'sit' ? 0.5 : pose === 'kneel' ? 0.42 : 0.88;
  if (pose === 'sit') {
    B.box(0.5, 0.2, 0.56, mantle ?? robe, 0, hip - 0.14, 0.22, 0, undefined, M);
    B.box(0.46, hip - 0.1, 0.2, mantle ?? robe, 0, 0, 0.42, 0, undefined, M);
  } else if (pose === 'kneel') {
    B.cyl(0.24, 0.52, hip, mantle ?? robe, 0, 0, -0.14, 7, undefined, M);
    B.box(0.44, 0.22, 0.52, robe, 0, 0.02, 0.14, 0, undefined, M);
  } else B.cyl(0.2, 0.4, hip + 0.06, robe, 0, 0, 0, 7, undefined, M);
  // everything above the hips leans and turns together
  const U = M.clone().multiply(xf(0, hip, 0, o.turn ?? 0, 1, 1, 1, o.lean ?? 0, o.tilt ?? 0));
  B.cyl(0.19, 0.24, 0.6, robe, 0, -0.06, 0, 7, undefined, U);
  B.ball(0.21, mantle ?? robe, 0, 0.54, 0, 1.08, 0.5, 0.8, 1, undefined, U);
  if (mantle) B.ball(0.24, mantle, -0.1, 0.36, -0.06, 0.9, 1.1, 0.75, 1, undefined, U);
  B.cyl(0.06, 0.07, 0.14, skin, 0, 0.6, 0, 5, undefined, U);
  const HM = U.clone().multiply(xf(0, 0.84, 0.01, o.look ?? 0, 1, 1, 1, o.nod ?? 0, o.cock ?? 0));
  B.ball(0.18, skin, 0, 0, 0, 1, 1.1, 1, 1, undefined, HM);
  if (o.hair !== null) B.ball(0.19, hair, 0, 0.045, -0.04, 1.02, 1, 1, 1, undefined, HM);
  if (o.longHair) B.ball(0.17, hair, 0, -0.14, -0.1, 1.15, 1.5, 0.6, 1, undefined, HM);
  if (o.beard) B.ball(0.11, o.beard === true ? hair : o.beard, 0, -0.15, 0.1, 1, 1.2, 0.7, 0, undefined, HM);
  if (o.veil) B.ball(0.215, o.veil, 0, 0.03, -0.045, 1.06, 1.06, 1.06, 1, undefined, HM);
  const hands = o.hands ?? [[-0.08, -0.5, 0.12], [0.08, -0.5, 0.12]];
  [-1, 1].forEach((sx, i) => {
    const sh = [sx * 0.25, 0.5, 0],
      h = hands[i];
    const hp = [sh[0] + h[0], sh[1] + h[1], sh[2] + h[2]];
    const el = [(sh[0] + hp[0]) / 2 + sx * 0.06, (sh[1] + hp[1]) / 2 - 0.1, (sh[2] + hp[2]) / 2 - 0.04];
    rod(B, sh, el, 0.075, o.sleeve ?? robe, 5, 0.065, undefined, U);
    rod(B, el, hp, 0.065, o.sleeve ?? robe, 5, 0.05, undefined, U);
    B.ball(0.06, skin, hp[0], hp[1], hp[2], 1, 1, 1, 0, undefined, U);
  });
  return U;
}
// two feathered wings on a figure's back (U is the frame person() returns)
export function wings(B, U, s = 1) {
  for (const sx of [-1, 1])
    B.add(new THREE.IcosahedronGeometry(1, 1), (x, y) => mix(0xdccdaa, 0x6a4c32, clamp(y * 0.6 + 0.45)), U.clone().multiply(xf(sx * 0.2, 0.72 * s + 0.1, -0.42 * s, sx * 0.35, 0.09 * s, 0.82 * s, 0.3 * s, -0.5, 0)));
}
