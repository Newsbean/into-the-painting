// Tools for the things that fill a landscape and move about in it.
//
//   Raw          a list of triangles with a colour, a sway and a tint mask at every corner
//                (what the paint shader wants), for a blade of grass or a flower
//   instances()  one geometry drawn in thousands of places, cut into squares of ground
//                so that only what is in view, and near enough to matter, is drawn
//   shoreZ()     where the land reaches a given height above the sea, going inland
import * as THREE from 'three';
import { weld } from './weld.js';

const _c = new THREE.Color();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

export class Raw {
  constructor() {
    this.p = [];
    this.n = [];
    this.c = [];
    this.d = [];
  }
  // each corner is [x, y, z, colour, sway, mask, emissive]. `mask` is how much of an
  // instance's own colour the corner takes. Flat-shaded unless a normal is given.
  tri(a, b, c, nrm) {
    let n = nrm;
    if (!n) {
      const ux = b[0] - a[0],
        uy = b[1] - a[1],
        uz = b[2] - a[2],
        vx = c[0] - a[0],
        vy = c[1] - a[1],
        vz = c[2] - a[2];
      n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      n = [n[0] / l, n[1] / l, n[2] / l];
    }
    for (const v of [a, b, c]) {
      this.p.push(v[0], v[1], v[2]);
      this.n.push(n[0], n[1], n[2]);
      _c.set(v[3] ?? 0xffffff);
      this.c.push(_c.r, _c.g, _c.b);
      this.d.push(v[6] ?? 0, v[4] ?? 0, v[5] ?? 0, 1);
    }
    return this;
  }
  quad(a, b, c, d, nrm) {
    this.tri(a, b, c, nrm);
    return this.tri(a, c, d, nrm);
  }
  // any BufferGeometry, keeping its own normals; fn(x, y, z) -> [colour, sway, mask, emissive] at each corner
  add(geo, fn, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position,
      N = g.attributes.normal;
    if (matrix) _m3.getNormalMatrix(matrix);
    for (let i = 0; i < P.count; i++) {
      const k = fn(P.getX(i), P.getY(i), P.getZ(i));
      _v.set(P.getX(i), P.getY(i), P.getZ(i));
      _n.set(N.getX(i), N.getY(i), N.getZ(i));
      if (matrix) {
        _v.applyMatrix4(matrix);
        _n.applyMatrix3(_m3).normalize();
      }
      this.p.push(_v.x, _v.y, _v.z);
      this.n.push(_n.x, _n.y, _n.z);
      _c.set(k[0]);
      this.c.push(_c.r, _c.g, _c.b);
      this.d.push(k[3] ?? 0, k[1] ?? 0, k[2] ?? 0, 1);
    }
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aData', new THREE.Float32BufferAttribute(this.d, 4));
    g.computeBoundingSphere();
    return weld(g);
  }
}

// items: [{ x, y, z, ry?, rx?, rz?, s?: number | [sx, sy, sz], c?: colour }]
// Returns { group, chunks: [{ mesh, x, z }] }; show(chunks, cam, far) hides the squares beyond `far`.
export function instances(items, geometry, material, cell = 96) {
  const cells = new Map();
  for (const it of items) {
    const k = Math.floor(it.x / cell) + ':' + Math.floor(it.z / cell);
    let a = cells.get(k);
    if (!a) cells.set(k, (a = []));
    a.push(it);
  }
  const group = new THREE.Group(),
    chunks = [];
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    p = new THREE.Vector3(),
    s = new THREE.Vector3();
  for (const list of cells.values()) {
    const im = new THREE.InstancedMesh(geometry, material, list.length);
    let cx = 0,
      cz = 0;
    list.forEach((it, i) => {
      q.setFromEuler(e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0, 'YXZ'));
      const sc = it.s ?? 1;
      if (Array.isArray(sc)) s.set(sc[0], sc[1], sc[2]);
      else s.setScalar(sc);
      im.setMatrixAt(i, m.compose(p.set(it.x, it.y, it.z), q, s));
      im.setColorAt(i, _c.set(it.c ?? 0xffffff));
      cx += it.x;
      cz += it.z;
    });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.frustumCulled = true;
    group.add(im);
    chunks.push({ mesh: im, x: cx / list.length, z: cz / list.length });
  }
  return { group, chunks };
}
export function show(chunks, cam, far) {
  for (const c of chunks) c.mesh.visible = Math.hypot(cam.x - c.x, cam.z - c.z) < far;
}

// going inland along x, the z at which the land first stands `level` above the sea
export function shoreZ(H, x, level = 0, z0 = 140, z1 = 240) {
  let a = z0,
    b = z1;
  for (let i = 0; i < 18; i++) {
    const m = (a + b) / 2;
    if (H(x, m) < level) a = m;
    else b = m;
  }
  return (a + b) / 2;
}
