// What grows on a Norwegian hillside in autumn, each as one small geometry to be drawn
// thousands of times (engine/scatter.js). Foliage is made of flat dabs, like strokes of a
// loaded brush, never of blobs: a spruce is tiers of drooping boughs, a birch a white
// trunk under curtains of yellow leaves.
//
// Corners that should take the colour of the instance carry a mask (see Raw); the rest
// keep their own colour, so one geometry gives a green spruce and a blue one, a yellow
// birch and a rusty one.
//
//   spruceGeo(R, { tiers, boughs, ridge })   one unit tall, one unit out to its lowest boughs
//   pineGeo(R)                               one unit tall, one unit out at its crown
//   birchGeo(R, { leaf, bark, berries })     one unit tall
//   juniperGeo(R)  scrubGeo(R)  heatherGeo(R)  tuftGeo(R)  fernGeo(R)  rockGeo(detail)
import * as THREE from 'three';
import { Raw } from '../../../engine/scatter.js';
import { mix } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';

const UP = [0, 1, 0];
const pick = (R, a) => a[(R() * a.length) | 0];
const unit = (x, y, z) => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

// a round pole through stations [x, y, z, radius]; col(i, k) -> [colour, sway, mask] for face k of length i
function pole(g, st, sides, col) {
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i],
      b = st[i + 1];
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * 6.2832,
        a1 = ((k + 1) / sides) * 6.2832,
        am = (a0 + a1) / 2,
        c = col(i, k);
      const P = (s, ang) => [s[0] + Math.cos(ang) * s[3], s[1], s[2] + Math.sin(ang) * s[3], c[0], c[1], c[2]];
      g.quad(P(a, a0), P(a, a1), P(b, a1), P(b, a0), unit(Math.cos(am), 0.12, Math.sin(am)));
    }
  }
}
// a thin three-sided twig from a to b
function twig(g, a, b, r0, r1, colour, sway = 0.2) {
  const d = unit(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  // two directions square to it
  const u = Math.abs(d[1]) < 0.99 ? unit(-d[2], 0, d[0]) : [1, 0, 0],
    v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  for (let k = 0; k < 3; k++) {
    const a0 = (k / 3) * 6.2832,
      a1 = ((k + 1) / 3) * 6.2832;
    const P = (p, r, ang, sw) => [p[0] + (u[0] * Math.cos(ang) + v[0] * Math.sin(ang)) * r, p[1] + (u[1] * Math.cos(ang) + v[1] * Math.sin(ang)) * r, p[2] + (u[2] * Math.cos(ang) + v[2] * Math.sin(ang)) * r, colour, sw, 0];
    g.quad(P(a, r0, a0, sway * 0.5), P(a, r0, a1, sway * 0.5), P(b, r1, a1, sway), P(b, r1, a0, sway), unit(u[0] * Math.cos((a0 + a1) / 2) + v[0] * Math.sin((a0 + a1) / 2), 0.2, u[2] * Math.cos((a0 + a1) / 2) + v[2] * Math.sin((a0 + a1) / 2)));
  }
}

// ---------------------------------------------------------------- spruce
// Tiers of boughs that sweep down and out from the trunk, each a long leaf-shaped dab with
// a bright spine and dark edges, thinning to a single leader at the top.
export function spruceGeo(R, { tiers = 7, boughs = 9, ridge = true } = {}) {
  const g = new Raw();
  pole(g, [[0, 0, 0, 0.085], [0, 0.34, 0, 0.055], [0, 0.66, 0, 0.022]], ridge ? 5 : 3, () => [0x241a1c, 0, 0]);
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y = 0.13 + 0.78 * Math.pow(t, 0.92),
      rad = (1 - 0.84 * t) * (0.9 + 0.2 * R()),
      droop = 0.1 * (1 - 0.55 * t),
      n = Math.max(4, Math.round(boughs - 3.5 * t)),
      ph = R() * 6.2832,
      sw = 0.2 + 0.45 * t;
    for (let k = 0; k < n; k++) {
      const a = ph + (k / n) * 6.2832 + (R() - 0.5) * 0.35,
        ca = Math.cos(a),
        sa = Math.sin(a);
      const len = rad * (0.76 + 0.36 * R()),
        w = len * (0.25 + 0.1 * R()),
        yt = y - droop * (0.55 + 0.8 * R());
      const root = [0, y + 0.035, 0, 0x0a1416, sw * 0.2, 0.3],
        spine = [ca * len * 0.58, y + 0.022 - droop * 0.2, sa * len * 0.58, 0xffffff, sw * 0.6, 0.92],
        lf = [ca * len * 0.5 - sa * w, y - droop * 0.6, sa * len * 0.5 + ca * w, 0x0c1a1c, sw * 0.6, 0.5],
        rt = [ca * len * 0.5 + sa * w, y - droop * 0.6, sa * len * 0.5 - ca * w, 0x0c1a1c, sw * 0.6, 0.5],
        tip = [ca * len, yt, sa * len, 0xa8bc90, sw, 0.62];
      if (ridge) {
        const nl = unit(ca * 0.5 - sa * 0.5, 0.8, sa * 0.5 + ca * 0.5),
          nr = unit(ca * 0.5 + sa * 0.5, 0.8, sa * 0.5 - ca * 0.5);
        g.tri(root, lf, spine, nl).tri(lf, tip, spine, nl).tri(root, spine, rt, nr).tri(spine, tip, rt, nr);
      } else {
        const n0 = unit(ca * 0.5, 0.85, sa * 0.5);
        g.tri(root, lf, tip, n0).tri(root, tip, rt, n0);
      }
    }
  }
  // the leader
  for (let k = 0; k < 3; k++) {
    const a0 = (k / 3) * 6.2832,
      a1 = ((k + 1) / 3) * 6.2832;
    g.tri([Math.cos(a0) * 0.07, 0.88, Math.sin(a0) * 0.07, 0x0c1a1c, 0.5, 0.5], [Math.cos(a1) * 0.07, 0.88, Math.sin(a1) * 0.07, 0x0c1a1c, 0.5, 0.5], [0, 1, 0, 0xa8bc90, 0.8, 0.7], unit(Math.cos((a0 + a1) / 2), 0.5, Math.sin((a0 + a1) / 2)));
  }
  return g.geometry();
}

// ---------------------------------------------------------------- pine
// A Scots pine: a tall bare trunk, red towards the top, holding a flat crown high up.
export function pineGeo(R) {
  const g = new Raw();
  const lean = (R() - 0.5) * 0.7;
  const at = (t) => [lean * t * t * 0.5, Math.sin(t * 2.4) * 0.12];
  const st = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5,
      c = at(t * 0.86);
    st.push([c[0], t * 0.86, c[1], 0.11 * (1 - 0.55 * t)]);
  }
  pole(g, st, 5, (i) => [i < 2 ? 0x2c2428 : i < 4 ? 0x5a3a34 : 0x8a4a34, 0.02 * i, 0]);
  for (let i = 0; i < 4; i++) {
    const t = i / 3,
      y = 0.6 + 0.34 * t,
      c = at(y),
      rad = (0.7 + 0.5 * Math.sin(t * 2.6)) * (0.9 + 0.2 * R()),
      n = 6 - i,
      ph = R() * 6.2832,
      sw = 0.3 + 0.3 * t;
    for (let k = 0; k < n; k++) {
      const a = ph + (k / n) * 6.2832 + (R() - 0.5) * 0.5,
        ca = Math.cos(a),
        sa = Math.sin(a);
      const len = rad * (0.7 + 0.4 * R()),
        w = len * (0.34 + 0.12 * R()),
        yt = y + 0.015 + R() * 0.05;
      const root = [c[0], y, c[1], 0x0a1416, sw * 0.2, 0.3],
        lf = [c[0] + ca * len * 0.55 - sa * w, y - 0.012, c[1] + sa * len * 0.55 + ca * w, 0x0c1a1c, sw * 0.6, 0.5],
        rt = [c[0] + ca * len * 0.55 + sa * w, y - 0.012, c[1] + sa * len * 0.55 - ca * w, 0x0c1a1c, sw * 0.6, 0.5],
        tip = [c[0] + ca * len, yt, c[1] + sa * len, 0xa8bc90, sw, 0.7],
        hump = [c[0] + ca * len * 0.5, y + 0.05, c[1] + sa * len * 0.5, 0xffffff, sw * 0.6, 0.92];
      const nl = unit(ca * 0.3 - sa * 0.4, 0.85, sa * 0.3 + ca * 0.4),
        nr = unit(ca * 0.3 + sa * 0.4, 0.85, sa * 0.3 - ca * 0.4);
      g.tri(root, lf, hump, nl).tri(lf, tip, hump, nl).tri(root, hump, rt, nr).tri(hump, tip, rt, nr);
    }
  }
  return g.geometry();
}

// ---------------------------------------------------------------- birch, rowan
// A slender trunk that leans and forks, and leaves that hang from the twigs in strings
// of small dabs. With berries, a rowan: grey bark and bunches of red.
export function birchGeo(R, { leaf = [0xf2c230, 0xe8a030, 0xffd45a, 0xd9782a], bark = 0xe8e2d4, scar = 0x1c1a1e, sprays = 40, berries = false, glow = 0.14, spread = 0.26 } = {}) {
  const g = new Raw();
  const lx = (R() - 0.5) * 0.14,
    lz = (R() - 0.5) * 0.14;
  const sp = (t) => [lx * t + Math.sin(t * 3.1) * 0.022, t * 0.74, lz * t + Math.cos(t * 2.3) * 0.016 - 0.016];
  const st = [];
  for (let i = 0; i <= 6; i++) {
    const p = sp(i / 6);
    st.push([p[0], p[1], p[2], 0.03 * (1 - 0.7 * (i / 6))]);
  }
  pole(g, st, 5, (i, k) => [i === 0 && k % 2 ? 0x3a302c : (i * 5 + k * 3) % 7 === 0 ? scar : bark, 0.03 * i, 0]);
  // the limbs, and where leaves may hang from
  const hang = [sp(1), sp(0.86)];
  const nl = 3 + (R() < 0.5 ? 1 : 0);
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * 6.2832 + R() * 0.9,
      p0 = sp(0.48 + 0.24 * (i / nl) + R() * 0.05),
      r = 0.13 + R() * 0.1;
    const p1 = [p0[0] + Math.cos(a) * r, 0.8 + R() * 0.17, p0[2] + Math.sin(a) * r];
    twig(g, p0, p1, 0.012, 0.004, 0x3a2c2a, 0.3);
    hang.push(p1, [(p0[0] + p1[0]) / 2 + Math.cos(a) * 0.03, (p0[1] + p1[1]) / 2 + 0.04, (p0[2] + p1[2]) / 2 + Math.sin(a) * 0.03]);
  }
  const cx = lx * 0.85,
    cz = lz * 0.85;
  for (let j = 0; j < sprays; j++) {
    const h = hang[j % hang.length];
    let x = h[0] + (R() - 0.5) * spread,
      y = h[1] + (R() - 0.3) * spread * 0.62,
      z = h[2] + (R() - 0.5) * spread;
    const out = unit(x - cx, 0.6, z - cz),
      yaw = R() * 6.2832,
      dx = (R() - 0.5) * 0.014,
      dz = (R() - 0.5) * 0.014;
    let sx = 1,
      sz = 0;
    for (let k = 0, n = 3 + ((R() * 3) | 0); k < n; k++) {
      const c = pick(R, leaf),
        w = 0.011 + R() * 0.008,
        hh = 0.026 + R() * 0.018,
        sw = 0.5 + 0.1 * k;
      // each leaf is turned a little from the one above it
      sx = Math.cos(yaw + k * 1.3);
      sz = Math.sin(yaw + k * 1.3);
      g.quad([x, y + hh * 0.7, z, mix(c, 0xffffff, 0.18), sw * 0.7, 0.45, glow], [x - sx * w, y, z - sz * w, c, sw, 0.5, glow], [x + dx, y - hh, z + dz, mix(c, 0x3a2010, 0.25), sw, 0.5, glow], [x + sx * w, y, z + sz * w, c, sw, 0.5, glow], out);
      x += dx * 2 + out[0] * 0.008;
      y -= hh * 1.3;
      z += dz * 2 + out[2] * 0.008;
    }
    if (berries && j % 4 === 0) {
      const r = 0.02;
      g.quad([x, y + r, z, 0xe0341e, 0.5, 0, 0.12], [x - sx * r, y, z - sz * r, 0xc8281a, 0.5, 0, 0.12], [x, y - r, z, 0x8a1c14, 0.5, 0, 0.12], [x + sx * r, y, z + sz * r, 0xc8281a, 0.5, 0, 0.12], out);
    }
  }
  return g.geometry();
}

// ---------------------------------------------------------------- bushes
// a juniper: a narrow flame of upright sprays, one unit tall
export function juniperGeo(R) {
  const g = new Raw();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 6.2832 * 2.3 + R(),
      t = i / 13,
      r = 0.36 * (1 - t * 0.75),
      y0 = t * 0.55,
      h = 0.34 + R() * 0.2,
      w = 0.13 * (1 - t * 0.4);
    const cx = Math.cos(a) * r,
      cz = Math.sin(a) * r,
      n = unit(Math.cos(a), 0.6, Math.sin(a));
    g.tri([cx * 0.4 - Math.sin(a) * w, y0, cz * 0.4 + Math.cos(a) * w, 0x0c1a1c, 0.1, 0.45], [cx * 0.4 + Math.sin(a) * w, y0, cz * 0.4 - Math.cos(a) * w, 0x0c1a1c, 0.1, 0.45], [cx * 1.15, y0 + h, cz * 1.15, 0xffffff, 0.45, 0.9], n);
    g.tri([cx * 0.4 - Math.sin(a) * w, y0, cz * 0.4 + Math.cos(a) * w, 0x0c1a1c, 0.1, 0.45], [cx * 1.15, y0 + h, cz * 1.15, 0xffffff, 0.45, 0.9], [cx * 1.3, y0 + h * 0.35, cz * 1.3, 0x1c2c2a, 0.3, 0.6], n);
  }
  return g.geometry();
}
// low scrub: bilberry and dwarf birch turned red, a unit across and half as high
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
// a cushion of heather: short spikes in flower over a dark mat
export function heatherGeo(R) {
  const g = new Raw();
  // a crowd of short sprigs, in flower at the tip
  for (let i = 0; i < 18; i++) {
    const a = R() * 6.2832,
      d = Math.sqrt(R()) * 0.85,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      h = 0.16 + R() * 0.2,
      w = 0.05 + R() * 0.035,
      yaw = R() * 6.2832,
      lx = Math.cos(a) * 0.08,
      lz = Math.sin(a) * 0.08;
    g.tri([x - Math.cos(yaw) * w, 0.02, z - Math.sin(yaw) * w, 0x2a2030, 0.05, 0.4], [x + Math.cos(yaw) * w, 0.02, z + Math.sin(yaw) * w, 0x2a2030, 0.05, 0.4], [x + lx, h, z + lz, 0xffffff, 0.4, 1], UP);
  }
  return g.geometry();
}
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
