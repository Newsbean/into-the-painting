import * as THREE from 'three';
import { weld } from './weld.js';

// A Soup collects flat-shaded triangles straight into arrays. It is the fast
// path for things made of thousands of small faces (a town's worth of walls,
// window reveals and roof slopes), where the Builder's "one BufferGeometry per
// box" would cost seconds and hundreds of megabytes.
//
// The result carries what the paint shader wants, tightly packed:
//   position (float32)  normal (int8)  color (uint8)  aData (uint8: emissive, sway, mask, 1)
// `mask` marks faces that take the instance colour when the geometry is drawn
// with an InstancedMesh (shutters, doors, awnings); it is ignored otherwise.
//
// Points are [x, y, z]. Faces are counter-clockwise seen from outside.
// set(matrix) transforms everything that follows; warp(fn) bends it first.

const _c = new THREE.Color();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

export class Soup {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.dat = [];
    this.m = null;
    this.bend = null;
    this.away = null;
  }
  get triangles() {
    return this.pos.length / 9;
  }
  // everything added after this is placed by `matrix` (null = as given)
  set(matrix = null) {
    this.m = matrix;
    return this;
  }
  // fn([x, y, z]) -> [x, y, z], applied in local space before the matrix (a lean, a sag)
  warp(fn = null) {
    this.bend = fn;
    return this;
  }
  // Every face that follows is turned to look away from this point (given in the same local
  // space as the faces): the middle of a building for its walls, a point far below a roof
  // for its slopes. Saves working out which way round each face goes. null = as given.
  facing(p = null) {
    this.away = p;
    return this;
  }
  _where(p) {
    const q = this.bend ? this.bend(p) : p;
    if (!this.m) return q;
    _v.set(q[0], q[1], q[2]).applyMatrix4(this.m);
    return [_v.x, _v.y, _v.z];
  }
  _put(p) {
    const q = this.bend ? this.bend(p) : p;
    if (this.m) {
      _v.set(q[0], q[1], q[2]).applyMatrix4(this.m);
      this.pos.push(_v.x, _v.y, _v.z);
      return [_v.x, _v.y, _v.z];
    }
    this.pos.push(q[0], q[1], q[2]);
    return q;
  }
  _color(col, p) {
    const c = typeof col === 'function' ? col(p[0], p[1], p[2]) : col;
    if (c && c.isColor) return c;
    return _c.set(c);
  }
  // o: { em: emissive 0..1, sway, mask }
  tri(a, b, c, col, o) {
    const A = this._put(a),
      B = this._put(b),
      C = this._put(c);
    const ux = B[0] - A[0],
      uy = B[1] - A[1],
      uz = B[2] - A[2],
      vx = C[0] - A[0],
      vy = C[1] - A[1],
      vz = C[2] - A[2];
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    let order = [a, b, c];
    if (this.away) {
      const w = this._where(this.away);
      if (nx * ((A[0] + B[0] + C[0]) / 3 - w[0]) + ny * ((A[1] + B[1] + C[1]) / 3 - w[1]) + nz * ((A[2] + B[2] + C[2]) / 3 - w[2]) < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
        const n = this.pos.length;
        for (let k = 0; k < 3; k++) {
          const t = this.pos[n - 6 + k];
          this.pos[n - 6 + k] = this.pos[n - 3 + k];
          this.pos[n - 3 + k] = t;
        }
        order = [a, c, b];
      }
    }
    const em = o?.em ?? 0,
      sway = o?.sway ?? 0,
      mask = o?.mask ?? 0;
    for (const p of order) {
      const k = this._color(col, p);
      this.nor.push(nx, ny, nz);
      this.col.push(k.r, k.g, k.b);
      this.dat.push(em, sway, mask, 1);
    }
    return this;
  }
  quad(a, b, c, d, col, o) {
    this.tri(a, b, c, col, o);
    return this.tri(a, c, d, col, o);
  }
  // a rectangle given by a corner, two edge vectors: origin + s*U + t*V (U x V points outside)
  rect(o3, U, V, col, o) {
    const a = o3,
      b = [o3[0] + U[0], o3[1] + U[1], o3[2] + U[2]],
      c = [b[0] + V[0], b[1] + V[1], b[2] + V[2]],
      d = [o3[0] + V[0], o3[1] + V[1], o3[2] + V[2]];
    return this.quad(a, b, c, d, col, o);
  }
  // an upright box standing on y; ry turns it about its own centre. skip: 'b' no bottom, 't' no top, and so on (x- x+ z- z+ as 'l' 'r' 'k' 'f')
  box(w, h, d, col, x, y, z, ry = 0, o, skip = 'b') {
    const hw = w / 2,
      hd = d / 2;
    const cs = Math.cos(ry),
      sn = Math.sin(ry);
    const P = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
    const p000 = P(-hw, 0, -hd),
      p100 = P(hw, 0, -hd),
      p110 = P(hw, h, -hd),
      p010 = P(-hw, h, -hd),
      p001 = P(-hw, 0, hd),
      p101 = P(hw, 0, hd),
      p111 = P(hw, h, hd),
      p011 = P(-hw, h, hd);
    if (!skip.includes('f')) this.quad(p001, p101, p111, p011, col, o); // +z
    if (!skip.includes('k')) this.quad(p100, p000, p010, p110, col, o); // -z
    if (!skip.includes('r')) this.quad(p101, p100, p110, p111, col, o); // +x
    if (!skip.includes('l')) this.quad(p000, p001, p011, p010, col, o); // -x
    if (!skip.includes('t')) this.quad(p011, p111, p110, p010, col, o); // top
    if (!skip.includes('b')) this.quad(p000, p100, p101, p001, col, o); // bottom
    return this;
  }
  // any BufferGeometry, keeping its own (smooth) normals: columns, pots, arches
  add(geo, col, matrix, o) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position,
      N = g.attributes.normal;
    const em = o?.em ?? 0,
      sway = o?.sway ?? 0,
      mask = o?.mask ?? 0;
    const M = matrix && this.m ? this.m.clone().multiply(matrix) : matrix || this.m;
    if (M) _m3.getNormalMatrix(M);
    for (let i = 0; i < P.count; i++) {
      const lp = [P.getX(i), P.getY(i), P.getZ(i)];
      const k = this._color(col, lp);
      _v.set(lp[0], lp[1], lp[2]);
      _n.set(N.getX(i), N.getY(i), N.getZ(i));
      if (M) {
        _v.applyMatrix4(M);
        _n.applyMatrix3(_m3).normalize();
      }
      this.pos.push(_v.x, _v.y, _v.z);
      this.nor.push(_n.x, _n.y, _n.z);
      this.col.push(k.r, k.g, k.b);
      this.dat.push(em, sway, mask, 1);
    }
    return this;
  }
  empty() {
    return this.pos.length === 0;
  }
  geometry() {
    const n = this.pos.length / 3;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    const nor = new Int8Array(n * 3);
    for (let i = 0; i < n * 3; i++) nor[i] = Math.round(this.nor[i] * 127);
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true));
    const col = new Uint8Array(n * 3);
    for (let i = 0; i < n * 3; i++) col[i] = Math.max(0, Math.min(255, Math.round(this.col[i] * 255)));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
    const dat = new Uint8Array(n * 4);
    for (let i = 0; i < n * 4; i++) dat[i] = Math.max(0, Math.min(255, Math.round(this.dat[i] * 255)));
    g.setAttribute('aData', new THREE.BufferAttribute(dat, 4, true));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.dat = [];
    return g;
  }
  // culled: let three skip it when it is off screen (give static town chunks this)
  mesh(material, culled = true) {
    const m = new THREE.Mesh(weld(this.geometry()), material);
    m.frustumCulled = culled;
    return m;
  }
}
