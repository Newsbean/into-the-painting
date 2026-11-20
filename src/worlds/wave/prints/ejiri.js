import * as THREE from 'three';
import { Builder, mix, xf } from '../../../engine/build.js';
import { smooth, clamp, lerp } from '../../../engine/gl.js';
import { FOAM, SKIN, THATCH } from '../palette.js';
import { ZIGZAG, segDist } from '../ground-plan.js';
import { rod, beam } from '../helpers.js';
import { person } from '../figures.js';
import { tuft } from '../plants.js';

// ---------------- Ejiri in Suruga: a sudden wind on the path through the reeds
export function ejiri(world, { S, H, Q, X, P, SPARE, flat, deck, solid, wall }) {
  const tops = [];
  const zig = (x, z) => {
    let d = 1e9;
    for (let i = 0; i < ZIGZAG.length - 1; i++) d = Math.min(d, segDist(x, z, ZIGZAG[i][0], ZIGZAG[i][1], ZIGZAG[i + 1][0], ZIGZAG[i + 1][1]));
    return d;
  };
  for (let i = 0; i < ZIGZAG.length - 1; i++) {
    const [ax, az] = ZIGZAG[i],
      [bx, bz] = ZIGZAG[i + 1];
    const L = Math.hypot(bx - ax, bz - az),
      ux = (bx - ax) / L,
      uz = (bz - az) / L;
    const top = Math.max(H(ax, az), H(bx, bz), H((ax + bx) / 2, (az + bz) / 2), 0.95) + 0.32;
    tops.push(top);
    beam(X, [ax - ux * 1.2, top - 1.1, az - uz * 1.2], [bx + ux * 1.2, top - 1.1, bz + uz * 1.2], 2.5, 2.2, (px, py) => mix(0x8f9a72, 0xdccda4, clamp(py / 2.2 + 0.5)));
    for (let s = 0; s <= L; s += 2) deck(ax + ux * s - 1.3, ax + ux * s + 1.3, az + uz * s - 1.3, az + uz * s + 1.3, top);
  }
  const on = (i, t) => [lerp(ZIGZAG[i][0], ZIGZAG[i + 1][0], t), tops[i], lerp(ZIGZAG[i][1], ZIGZAG[i + 1][1], t)];
  // the reeds, all leaning one way
  let made = 0,
    guard = 0;
  while (made < 64 && guard++ < 900) {
    const cx = 159 + Q() * 49,
      cz = 198.5 + Q() * 21;
    if (H(cx, cz) < -1.2 || zig(cx, cz) < 2.3) continue;
    const col = mix(0xb9b070, 0x7f9a5a, Q());
    for (let k = 0; k < 6; k++) {
      const x = cx + (Q() - 0.5) * 3.2,
        z = cz + (Q() - 0.5) * 3.2;
      if (zig(x, z) < 1.8 || z > 219.6) continue;
      // none through the hull of the boat moored at the path's end (drawn to a spare builder, so the dice fall the same)
      const inBoat = segDist(x, z, 200.35, 202.57, 206.85, 199.03) < 1.8;
      tuft(inBoat ? SPARE : P, x, Math.max(H(x, z), -0.3), z, 1.9 + Q() * 1.0, Q, col, 1.7, 2);
    }
    made++;
  }
  // two thin trees giving up their leaves
  for (const [tx, tz, h] of [[188.6, 219.2, 14], [190.4, 214.2, 11.5]]) {
    const y = H(tx, tz);
    const m = [tx + 0.9, y + h * 0.5, tz],
      t = [tx + 2.6, y + h, tz - 0.4];
    rod(P, [tx, y - 0.4, tz], m, 0.2, 0.13, 0x6a4a36, 5, { sway: 0.1 });
    rod(P, m, t, 0.13, 0.04, 0x6a4a36, 5, { sway: 0.5 });
    for (let k = 0; k < 5; k++) {
      const f = 0.55 + k * 0.1;
      P.add(new THREE.IcosahedronGeometry(0.8 + Q() * 0.5, 0), k % 2 ? 0x7f9a5a : 0x9ab878, xf(lerp(tx, t[0], f * f) + 0.8 + Q() * 1.4, y + h * f, tz + (Q() - 0.5) * 1.6, Q() * 6, 1.5, 0.4, 0.8), { sway: 0.9 });
    }
    solid(tx, tz, 0.3, y + 5);
  }
  // the travellers: hats held on, heads down, and one hat already gone
  const w0 = on(1, 0.86);
  person(X, w0[0], w0[1], w0[2], -Math.PI / 2 + 0.3, { robe: true, coat: 0x7f9aa8, sash: 0x9a4a3a, hat: 'cloth', lean: 0.3, armL: [2.3, 0.3, 1.4], armR: [1.2, 0.2] });
  let p = on(1, 0.62);
  person(X, p[0], p[1], p[2], -Math.PI / 2 + 0.2, { coat: 0x2f548a, legs: 0xe2d6b4, hat: 'cone', hatTilt: 0.5, lean: 0.6, stride: 0.2, armL: [2.6, 0.2, 1.7], armR: [2.6, 0.2, 1.7], carry: 'pack' });
  p = on(1, 0.3);
  person(X, p[0], p[1], p[2], -Math.PI / 2 + 0.2, { coat: 0x5a6a4a, legs: SKIN, hat: 'cone', hatTilt: 0.6, lean: 0.75, stride: -0.2, armR: [2.6, 0.2, 1.7], carry: 'bundle' });
  p = on(2, 0.6);
  person(X, p[0], p[1], p[2], Math.PI / 2 - 0.1, { coat: 0x8a6a48, legs: 0x3a4a5a, lean: -0.15, armR: [2.8, 0.3], armL: [2.2, 0.4], stride: 0.15 });
  p = on(2, 0.84);
  person(X, p[0], p[1], p[2], Math.PI / 2 - 0.1, { coat: 0x3a628f, legs: SKIN, hat: 'cone', hatTilt: -0.5, lean: 0.3, stride: 0.2, carry: 'pole', armR: [2.3, 0.1, 1.2] });
  p = on(0, 0.68);
  person(X, p[0], p[1], p[2], -Math.PI / 2 - 0.15, { coat: 0x4a5560, legs: 0xe2d6b4, hat: 'cone', hatTilt: 0.6, lean: 0.55, stride: 0.2, armL: [2.6, 0.2, 1.7], staff: true });
  // a moored boat in the reeds at the path's end
  {
    const M = xf(203.6, -0.05, 200.8, 0.5);
    X.box(7, 0.8, 1.9, 0xd9c690, 0, 0, 0, 0, undefined, M);
    X.box(7.4, 0.14, 2.1, 0x8a6a48, 0, 0.8, 0, 0, undefined, M);
    X.gable(2.3, 3.4, 0.9, THATCH, -0.6, 0.94, 0, Math.PI / 2, undefined, M);
    // the boatman kneels in the bow (boat-local 2.2, 0.9, 0.1 turned into world space)
    person(X, 203.6 + 2.2 * Math.cos(0.5) + 0.1 * Math.sin(0.5), 0.85, 200.8 - 2.2 * Math.sin(0.5) + 0.1 * Math.cos(0.5), 1.7, { pose: 'kneel', coat: 0x3a628f, hat: 'cloth', lean: 0.5, armL: [0.9, 0.1], armR: [0.9, 0.1] });
    wall(203.6, 200.8, 3.7, 1.1, 0.5, 1.2);
  }
  // the papers torn from her sash, and the hats: one mesh, thrown about by the wind in tick()
  const PB = new Builder();
  const sheets = [];
  let start = 0;
  const piece = (geo, col, o) => {
    PB.add(geo, col);
    const n = PB.parts[PB.parts.length - 1].attributes.position.count;
    sheets.push({ start, n, ...o });
    start += n;
  };
  for (let i = 0; i < 36; i++) piece(new THREE.PlaneGeometry(0.5, 0.36), i % 4 === 0 ? 0xe9dfc6 : FOAM, { ph: Q(), sp: 0.06 + Q() * 0.035, spin: 2 + Q() * 4, side: (Q() - 0.5) * 2, lift: 0.55 + Q() * 0.75 });
  for (let i = 0; i < 2; i++) piece(new THREE.ConeGeometry(0.42, 0.2, 8, 1, true), 0xd9c28a, { ph: 0.3 + i * 0.45, sp: 0.05, spin: 1.6, side: i ? 0.8 : -0.3, lift: 1.1 });
  const pm = PB.mesh(flat({ scale: 0.5, side: THREE.DoubleSide }));
  pm.name = 'prints';
  S.add(pm);
  const pos = pm.geometry.attributes.position;
  pos.setUsage(THREE.DynamicDrawUsage);
  world.papers = { pos, base: pos.array.slice(), sheets, from: [w0[0], w0[1] + 1.2, w0[2]] };
  // until the first tick every sheet is folded to nothing at the place the wind takes them from
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, w0[0], w0[1] + 1.2, w0[2]);
}

const _pe = new THREE.Euler(),
  _pq = new THREE.Quaternion(),
  _pm = new THREE.Matrix4(),
  _pv = new THREE.Vector3(),
  _ps = new THREE.Vector3();

// every sheet of paper (and the two hats) rides the same gust, each tumbling its own way
// (called every frame from tick() in ../index.js, once the papers exist)
export function blowPapers(world, time) {
  const { pos, base, sheets, from } = world.papers;
  const arr = pos.array;
  for (const s of sheets) {
    const t = (time * s.sp + s.ph) % 1;
    const sc = smooth(0, 0.07, t) * (1 - smooth(0.86, 1, t));
    _pe.set(time * s.spin * 0.7 + s.ph * 9, time * s.spin + s.ph * 5, time * s.spin * 0.45);
    _pm.compose(_pv.set(from[0] + t * 48 + Math.sin(t * 9 + s.ph * 20) * 1.6, from[1] + Math.pow(t, 0.75) * 17 * s.lift + Math.sin(t * 14 + s.ph * 9) * 0.8, from[2] + s.side * (1.5 + t * 8) - t * 7), _pq.setFromEuler(_pe), _ps.setScalar(sc));
    for (let i = s.start * 3, e = (s.start + s.n) * 3; i < e; i += 3) {
      _pv.set(base[i], base[i + 1], base[i + 2]).applyMatrix4(_pm);
      arr[i] = _pv.x;
      arr[i + 1] = _pv.y;
      arr[i + 2] = _pv.z;
    }
  }
  pos.needsUpdate = true;
}
