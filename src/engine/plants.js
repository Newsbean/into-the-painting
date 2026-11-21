// Plants and stones that grow anywhere, each one small geometry to be drawn thousands of
// times (engine/scatter.js). Corners that should take the colour of the instance carry a
// mask (see Raw), so one geometry gives straw and green grass, grey stones and brown.
//
//   tuftGeo(R)  fernGeo(R)  scrubGeo(R)  rockGeo(detail)
import * as THREE from 'three';
import { Raw } from './scatter.js';
import { mix } from './build.js';
import { clamp } from './gl.js';

const UP = [0, 1, 0];
const unit = (x, y, z) => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

// a clump of dry grass: five blades leaning out from one root
export function tuftGeo(R) {
  const g = new Raw();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.2832 + R() * 0.7,
      lean = 0.2 + R() * 0.32,
      h = 0.34 + R() * 0.4,
      w = 0.05 + R() * 0.03;
    const dx = Math.cos(a),
      dz = Math.sin(a),
      bx = dx * 0.07,
      bz = dz * 0.07,
      px = -dz * w,
      pz = dx * w;
    const mx = bx + dx * lean * 0.45 * h,
      mz = bz + dz * lean * 0.45 * h;
    const m0 = [mx - px * 0.7, h * 0.55, mz - pz * 0.7, 0xffffff, 0.3, 1],
      m1 = [mx + px * 0.7, h * 0.55, mz + pz * 0.7, 0xffffff, 0.3, 1];
    g.quad([bx - px, 0, bz - pz, 0x2a2a30, 0, 0.5], [bx + px, 0, bz + pz, 0x2a2a30, 0, 0.5], m1, m0, UP);
    g.tri(m0, m1, [bx + dx * lean * 1.25 * h, h, bz + dz * lean * 1.25 * h, 0xffffff, 0.9, 1], UP);
  }
  return g.geometry();
}
// bracken: six fronds arching out of the ground, a unit to their tips
export function fernGeo(R) {
  const g = new Raw();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.2832 + R() * 0.5,
      L = 0.75 + R() * 0.3,
      top = 0.3 + R() * 0.2;
    const dx = Math.cos(a),
      dz = Math.sin(a),
      n = unit(dx * 0.35, 0.9, dz * 0.35);
    const P = (s, y, w, side, col, sw, m) => [dx * s * L - dz * w * side, y, dz * s * L + dx * w * side, col, sw, m];
    const pts = [[0.02, 0.02, 0.03, 0x241c18, 0, 0.4], [0.35, top * 0.8, 0.14, 0xffffff, 0.3, 0.9], [0.72, top, 0.11, 0xffffff, 0.5, 1]];
    for (let k = 0; k < 2; k++) {
      const p = pts[k],
        q = pts[k + 1];
      g.quad(P(p[0], p[1], p[2], -1, p[3], p[4], p[5]), P(p[0], p[1], p[2], 1, p[3], p[4], p[5]), P(q[0], q[1], q[2], 1, q[3], q[4], q[5]), P(q[0], q[1], q[2], -1, q[3], q[4], q[5]), n);
    }
    g.tri(P(0.72, top, 0.11, -1, 0xffffff, 0.5, 1), P(0.72, top, 0.11, 1, 0xffffff, 0.5, 1), [dx * L, top * 0.55, dz * L, 0xffe0a0, 0.7, 0.75], n);
  }
  return g.geometry();
}
// low scrub, a unit across and half as high
export function scrubGeo(R) {
  const g = new Raw();
  // a low dome of small leaves, each a dab turned its own way
  for (let i = 0; i < 18; i++) {
    const a = R() * 6.2832,
      d = Math.sqrt(R()) * 0.9,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      y = 0.5 * Math.sqrt(Math.max(0, 1 - d * d)) + R() * 0.08,
      w = 0.1 + R() * 0.07,
      yaw = R() * 6.2832,
      sx = Math.cos(yaw) * w,
      sz = Math.sin(yaw) * w,
      n = unit(x * 0.6, 0.8, z * 0.6);
    g.quad([x, y + w * 1.1, z, 0xffffff, 0.45, 0.85], [x - sx, y, z - sz, 0xffffff, 0.4, 1], [x * 0.92, y - w * 1.2, z * 0.92, 0x1c1418, 0.3, 0.45], [x + sx, y, z + sz, 0xffffff, 0.4, 1], n);
  }
  return g.geometry();
}
// a stone: a faceted lump, darker where it sits in the ground. detail 0 for the small
// ones underfoot, 1 for boulders.
export function rockGeo(detail = 1) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i),
      y = P.getY(i),
      z = P.getZ(i);
    const k = 1 + 0.22 * Math.sin(x * 5.1 + y * 3.3) * Math.sin(z * 4.7 + y * 2.1);
    P.setXYZ(i, x * k * 1.15, y * k * 0.7, z * k * 0.9);
  }
  geo.computeVertexNormals();
  return new Raw().add(geo, (x, y) => [mix(0x24222c, 0xffffff, clamp(y * 0.6 + 0.6)), 0, 0.85]).geometry();
}
