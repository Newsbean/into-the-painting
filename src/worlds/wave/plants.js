import * as THREE from 'three';
import { mix, xf } from '../../engine/build.js';
import { clamp, lerp } from '../../engine/gl.js';
import { rod } from './helpers.js';

// What grows in the prints: cryptomeria, pine, a round garden tree, bamboo,
// reeds and rice. Each takes the dice (R) it is given, in a fixed order.

// a cryptomeria: the dark pointed tree of the hill forests
export function sugi(B, x, y, z, h, R, o = {}) {
  const r = h * (0.15 + R() * 0.05);
  const lo = o.lo ?? 0x25463a,
    hi = o.hi ?? 0x3f7a5a;
  rod(B, [x, y - 0.4, z], [x, y + h * 0.5, z], h * 0.02 + 0.1, h * 0.012, o.trunk ?? 0x6a3f2c, 5);
  for (let i = 0; i < 3; i++) {
    const ch = h * 0.42,
      cr = r * (1 - i * 0.2);
    B.add(new THREE.ConeGeometry(cr, ch, 7, 1, true), (px, py) => mix(lo, hi, clamp(py / ch + 0.5)), xf(x, y + h * (0.18 + i * 0.2) + ch / 2, z, R() * 6), { sway: 0.08 + i * 0.05 });
  }
}

// a pine as the prints draw it: bare leaning trunk, flat pads of needles
export function matsu(B, x, y, z, h, R, o = {}) {
  const trunk = o.trunk ?? 0x6a4a36,
    lo = o.lo ?? 0x25463a,
    hi = o.hi ?? 0x4f8a66;
  const lx = (R() - 0.5) * h * 0.3,
    lz = (R() - 0.5) * h * 0.14;
  const mid = [x + lx * 0.8, y + h * 0.5, z + lz],
    top = [x + lx * 0.35, y + h * 0.9, z - lz];
  const tr = h * 0.026 + 0.1;
  rod(B, [x, y - 0.4, z], mid, tr, tr * 0.7, trunk, 6);
  rod(B, mid, top, tr * 0.7, tr * 0.4, trunk, 5);
  const pads = o.pads ?? 4;
  for (let i = 0; i < pads; i++) {
    const a = R() * 6.283,
      d = i === 0 ? 0 : h * (0.13 + R() * 0.12);
    const pr = h * (i === 0 ? 0.24 : 0.15 + R() * 0.07);
    const px = top[0] + Math.cos(a) * d,
      py = top[1] - (i === 0 ? -pr * 0.1 : R() * h * 0.26),
      pz = top[2] + Math.sin(a) * d;
    if (i) rod(B, [lerp(mid[0], top[0], 0.5), lerp(mid[1], top[1], 0.5) - h * 0.04, lerp(mid[2], top[2], 0.5)], [px, py - pr * 0.15, pz], tr * 0.32, tr * 0.2, trunk, 4);
    // one broad pad with three smaller ones lapping its edge, as the prints build a pine out of cloud shapes
    const rot = R() * 6;
    for (let k = 0; k < 4; k++) {
      const a = rot + k * 2.1 + Math.sin(px * 3.1 + k) * 0.5,
        dd = k ? pr * 0.62 : 0,
        rr = pr * (k ? 0.52 : 0.78);
      B.add(new THREE.IcosahedronGeometry(rr, k ? 0 : 1), (qx, qy) => mix(lo, hi, clamp((qy / rr) * 0.5 + 0.5)), xf(px + Math.cos(a) * dd, py + (k ? -rr * 0.12 : rr * 0.1), pz + Math.sin(a) * dd, a, 1, k ? 0.5 : 0.4, 1), { sway: 0.12 });
    }
  }
}

// a round-headed tree for gardens and field edges
export function leafy(B, x, y, z, h, R, o = {}) {
  const lo = o.lo ?? 0x4f7a4a,
    hi = o.hi ?? 0x9ab878;
  const r = h * 0.3;
  rod(B, [x, y - 0.3, z], [x + (R() - 0.5) * 0.6, y + h * 0.55, z + (R() - 0.5) * 0.6], h * 0.035 + 0.06, h * 0.02, o.trunk ?? 0x4a3626, 5);
  for (let i = 0; i < 3; i++) {
    const a = R() * 6.283,
      d = i ? r * (0.5 + R() * 0.3) : 0,
      br = r * (i ? 0.62 + R() * 0.2 : 0.95);
    B.add(new THREE.IcosahedronGeometry(br, 1), (qx, qy) => mix(lo, hi, clamp((qy / br) * 0.5 + 0.5)), xf(x + Math.cos(a) * d, y + h * (i ? 0.56 + R() * 0.14 : 0.72), z + Math.sin(a) * d, R() * 6, 1, 0.78, 1), { sway: 0.2 });
  }
}

export function bamboo(B, x, y, z, h, R) {
  const lx = (R() - 0.5) * h * 0.22,
    lz = (R() - 0.5) * h * 0.22;
  const col = mix(0x7f9a5a, 0xb4c084, R());
  const m = [x + lx * 0.3, y + h * 0.6, z + lz * 0.3];
  rod(B, [x, y - 0.3, z], m, 0.1, 0.075, col, 4, { sway: 0.12 });
  rod(B, m, [x + lx, y + h, z + lz], 0.075, 0.02, col, 4, { sway: 0.5 });
  for (let i = 0; i < 3; i++) {
    const t = 0.56 + i * 0.16 + R() * 0.05;
    const br = 0.9 + R() * 0.7;
    // sprays of leaf hang at their own angles (set from position, so the random sequence is untouched)
    B.add(new THREE.IcosahedronGeometry(br, 0), (qx, qy) => mix(0x4f7a4a, 0x9ab878, clamp(qy / br + 0.5)), xf(x + lx * t * t + (R() - 0.5) * 1.3, y + h * t, z + lz * t * t + (R() - 0.5) * 1.3, R() * 6, 1, 0.42, 1, Math.sin(x * 7.3 + i * 2.1) * 0.45, Math.cos(z * 5.1 + i * 1.7) * 0.45), { sway: 0.6 });
  }
}

// a clump of reeds or rice
export function tuft(B, x, y, z, h, R, col, sway = 1.2, n = 2) {
  for (let k = 0; k < n; k++) {
    const hh = h * (0.7 + R() * 0.3);
    B.add(new THREE.ConeGeometry(0.1 + h * 0.05 + R() * 0.06, hh, 3, 1, true), col, xf(x + (R() - 0.5) * 0.5, y + hh / 2 - 0.1, z + (R() - 0.5) * 0.5, R() * 6, 1, 1, 1, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3), { sway: (px, py) => (py / hh + 0.5) * sway });
  }
}
