// The church whose tower stands over the roofs in the picture, and the ships on the fjord.
//
//   church(kit, world, { x, z, ry })        the tower is at local +z, the nave runs back from it
//   barque(B, world, { x, z, ry, s })       a three-master riding at anchor, sails furled (B: a Builder)
//   sjekteGeo()                             a small open boat under a spritsail, as one geometry, bow towards +x
//
// kit is a KristianiaKit.
import * as THREE from 'three';
import { Builder, xf, mix } from '../../../engine/build.js';
import { vnoise, clamp } from '../../../engine/gl.js';
import { at, wallBand, reveal, pane, slab, cuboid } from '../../../engine/facade.js';
import { KR } from './kit.js';

const _t = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const box4 = (cx, cz, w, d) => ({
  front: { o: [cx - w / 2, 0, cz + d / 2], u: [1, 0, 0], n: [0, 0, 1], W: w },
  back: { o: [cx + w / 2, 0, cz - d / 2], u: [-1, 0, 0], n: [0, 0, -1], W: w },
  left: { o: [cx - w / 2, 0, cz - d / 2], u: [0, 0, 1], n: [-1, 0, 0], W: d },
  right: { o: [cx + w / 2, 0, cz + d / 2], u: [0, 0, -1], n: [1, 0, 0], W: d },
});
const ring = (cx, cz, r, n, rot = Math.PI / n) => Array.from({ length: n }, (_, i) => [cx + Math.sin(rot + (i / n) * 6.2832) * r, cz + Math.cos(rot + (i / n) * 6.2832) * r]);
function prism(S, cx, cz, r0, r1, y0, y1, n, col, rot) {
  const a = ring(cx, cz, r0, n, rot),
    b = ring(cx, cz, r1, n, rot);
  S.facing([cx, (y0 + y1) / 2, cz]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (r1 > 0.02) S.quad([a[i][0], y0, a[i][1]], [a[j][0], y0, a[j][1]], [b[j][0], y1, b[j][1]], [b[i][0], y1, b[i][1]], col);
    else S.tri([a[i][0], y0, a[i][1]], [a[j][0], y0, a[j][1]], [cx, y1, cz], col);
  }
  S.facing(null);
}
// a round-headed window: a rectangular hole with its top corners filled back in
function arched(wall, det, F, op, wallCol, glass, em) {
  const xm = (op.x0 + op.x1) / 2,
    yh = op.y1 - (op.x1 - op.x0) * 0.5;
  reveal(det, F, op, 0.3, 0x2a2430);
  pane(det, F, op.x0, op.x1, op.y0, op.y1, -0.3, glass, { em });
  for (const sx of [-1, 1]) {
    const xe = sx < 0 ? op.x0 : op.x1;
    wall.facing(at(F, xm, op.y0, -9));
    wall.tri(at(F, xe, yh, 0.002), at(F, xe, op.y1, 0.002), at(F, xe + (xm - xe) * 0.62, op.y1, 0.002), wallCol);
    wall.facing(null);
  }
  pane(det, F, xm - 0.05, xm + 0.05, op.y0, op.y1, -0.26, 0x2a2430);
}

export function church(kit, world, o) {
  const gy = o.y ?? world.heightAt(o.x, o.z);
  const ry = o.ry ?? 0;
  const M = xf(o.x, gy, o.z, ry);
  const s = {};
  for (const n of ['plaster', 'stone', 'roof', 'detail', 'brick']) s[n] = kit.s(n).set(M).facing(null).warp(null);
  const wc = new THREE.Color(0xcfc6b4);
  const wallCol = (x, y, z) => _t.copy(wc).multiplyScalar((0.72 + 0.28 * Math.min(1, Math.max(0, y / 8))) * (0.88 + 0.24 * vnoise(x * 0.4 + z * 0.3, y * 0.35)));
  const roofCol = (x, y, z) => _t.set(0x2a2a34).multiplyScalar(0.8 + 0.5 * vnoise(x * 0.5, z * 0.5 + y * 0.3));
  const copper = (x, y, z) => _t.set(0x2f5a52).multiplyScalar(0.7 + 0.6 * vnoise(x * 0.8 + z, y * 0.5));
  const glass = (x, y) => _t.set(0xffc861).multiplyScalar(0.8 + 0.4 * vnoise(x * 3, y * 2));
  // the nave: 12 m wide, 28 long, tall round-headed windows lit from inside
  const NW = 12,
    NL = 28,
    NH = 10.5,
    TW = 7;
  const N = box4(0, -TW / 2 - NL / 2, NW, NL);
  for (const k of ['left', 'right']) {
    const ops = Array.from({ length: 5 }, (_, i) => ({ x0: (i + 0.5) * (NL / 5) - 0.9, x1: (i + 0.5) * (NL / 5) + 0.9, y0: 2.6, y1: NH - 1.3 }));
    wallBand(s.plaster, N[k], -1.4, NH, ops, wallCol);
    for (const op of ops) arched(s.plaster, s.detail, N[k], op, wallCol, glass, 1);
    for (let i = 0; i <= 5; i++) slab(s.stone, N[k], i * (NL / 5) - 0.3, i * (NL / 5) + 0.3, -1.4, NH - 0.6, 0, 0.5, KR.STONE, undefined, 'kb');
  }
  const E = { x0: NW / 2 - 1.3, x1: NW / 2 + 1.3, y0: 3, y1: NH - 0.8 };
  wallBand(s.plaster, N.back, -1.4, NH, [E], wallCol);
  arched(s.plaster, s.detail, N.back, E, wallCol, glass, 1);
  wallBand(s.plaster, N.front, -1.4, NH, [], wallCol);
  const RH = 6.5;
  for (const k of ['front', 'back']) s.plaster.tri(at(N[k], 0, NH), at(N[k], NW, NH), at(N[k], NW / 2, NH + RH - 0.05), wallCol);
  s.roof.facing([0, -40, -NL / 2]);
  for (const sx of [-1, 1]) s.roof.quad([sx * (NW / 2 + 0.35), NH, -TW / 2 + 0.2], [sx * (NW / 2 + 0.35), NH, -TW / 2 - NL - 0.3], [0, NH + RH, -TW / 2 - NL - 0.3], [0, NH + RH, -TW / 2 + 0.2], roofCol);
  s.roof.facing(null);
  // the tower: square, a clock on every face, a belfry, then the copper spire
  const TH = 23;
  const Tw = box4(0, 0, TW, TW);
  for (const k of ['front', 'back', 'left', 'right']) {
    const F = Tw[k];
    const door = k === 'front' ? [{ x0: TW / 2 - 1.1, x1: TW / 2 + 1.1, y0: 0, y1: 4.2 }] : [];
    wallBand(s.plaster, F, -1.4, 7, door, wallCol);
    if (door.length) {
      arched(s.plaster, s.detail, F, door[0], wallCol, 0x2a1c14, 0);
      pane(s.detail, F, door[0].x0, door[0].x1, 0, 3.0, -0.28, 0x3a2418);
    }
    const bel = { x0: TW / 2 - 0.8, x1: TW / 2 + 0.8, y0: TH - 6.2, y1: TH - 1.6 };
    const mid = { x0: TW / 2 - 0.6, x1: TW / 2 + 0.6, y0: 8.4, y1: 11.4 };
    wallBand(s.plaster, F, 7, 13.5, [mid], wallCol);
    arched(s.plaster, s.detail, F, mid, wallCol, glass, 1);
    wallBand(s.plaster, F, 13.5, TH, [bel], wallCol);
    arched(s.plaster, s.detail, F, bel, wallCol, 0x14141c, 0);
    for (let y = bel.y0 + 0.4; y < bel.y1 - 1; y += 0.6) slab(s.detail, F, bel.x0, bel.x1, y, y + 0.1, -0.26, -0.06, 0x3a3440, undefined, 'k');
    for (const y of [7, 13.5, TH]) slab(s.stone, F, -0.12, TW + 0.12, y - 0.14, y + 0.14, 0, 0.14, KR.STONE, undefined, 'k');
    // the clock, lit from behind
    for (let i = 0; i < 14; i++) {
      const a0 = (i / 14) * 6.2832,
        a1 = ((i + 1) / 14) * 6.2832;
      s.detail.tri(at(F, TW / 2, 14.9, 0.06), at(F, TW / 2 + Math.cos(a0) * 1.0, 14.9 + Math.sin(a0) * 1.0, 0.06), at(F, TW / 2 + Math.cos(a1) * 1.0, 14.9 + Math.sin(a1) * 1.0, 0.06), 0xffe6a3, { em: 0.85 });
    }
    pane(s.detail, F, TW / 2 - 0.035, TW / 2 + 0.035, 14.9, 15.7, 0.08, KR.IRON);
    pane(s.detail, F, TW / 2, TW / 2 + 0.55, 14.86, 14.94, 0.08, KR.IRON);
  }
  prism(s.roof, 0, 0, TW * 0.74, 3.0, TH + 0.14, TH + 3.2, 4, copper, Math.PI / 4);
  prism(s.plaster, 0, 0, 2.5, 2.5, TH + 3.2, TH + 6.6, 8, wallCol);
  prism(s.roof, 0, 0, 2.9, 1.2, TH + 6.6, TH + 9, 8, copper);
  prism(s.roof, 0, 0, 1.2, 0.08, TH + 9, TH + 21, 8, copper);
  cuboid(s.detail, [-0.05, TH + 21, -0.05], [0.05, TH + 22.6, 0.05], 0xc9a24a, undefined, 'b');
  cuboid(s.detail, [-0.4, TH + 21.9, -0.04], [0.4, TH + 22.0, 0.04], 0xc9a24a, undefined, '');
  const top = gy + TH + 22.6;
  const place = (lx, lz, hw, hd, t) => {
    const p = new THREE.Vector3(lx, 0, lz).applyMatrix4(M);
    world.colliders.push({ x: p.x, z: p.z, hw, hd, ry, top: t });
  };
  place(0, 0, TW / 2 + 0.3, TW / 2 + 0.3, top);
  place(0, -TW / 2 - NL / 2, NW / 2 + 0.6, NL / 2 + 0.3, gy + NH + RH);
  const c = new THREE.Vector3(0, 14.9, TW / 2 + 0.5).applyMatrix4(M);
  world.glows?.push({ p: [c.x, c.y, c.z], c: 0xffc070, size: 3 });
  const g = new THREE.Vector3(0, 0, -NL / 2).applyMatrix4(M);
  world.maps?.blob(g.x, g.z, 18, 0.4);
  world.maps?.lamp(g.x, g.z, 22, 0xffb860, 0.35);
  for (const k in s) s[k].set(null).facing(null);
  return { top };
}

function rod(B, a, b, r0, r1, col, seg = 4, data, M) {
  const va = new THREE.Vector3(...a),
    vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va),
    L = d.length() || 0.001;
  const m = new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_up, d.normalize()), new THREE.Vector3(1, 1, 1));
  B.add(new THREE.CylinderGeometry(r1, r0, L, seg, 1, true), col, M ? M.clone().multiply(m) : m, data);
}

// ---------------------------------------------------------------- a barque at anchor
export function barque(B, world, o) {
  const s = o.s ?? 1,
    M = xf(o.x, 0, o.z, o.ry ?? 0, s, s, s),
    L = 30;
  // the hull: the lower half of a long ball, black with a white strake, and a deck on top
  const hull = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  B.add(hull, (x, y) => (y > -0.18 ? new THREE.Color(0xd9d0c0) : mix(0x14141c, 0x2a2430, clamp(y + 1))), M.clone().multiply(xf(0, 2.2, 0, 0, L / 2, 3.4, 3.1)));
  B.add(new THREE.CylinderGeometry(1, 1, 0.12, 16), (x, y, z) => mix(0x6a5438, 0x8a6e4a, vnoise(x * 6, z * 6)), M.clone().multiply(xf(0, 2.2, 0, 0, L / 2 - 0.2, 1, 2.95)));
  B.box(4.2, 1.5, 3.2, 0x5a4634, -L * 0.34, 2.26, 0, 0, undefined, M); // the deckhouse aft
  B.box(3.0, 1.1, 2.6, 0x5a4634, L * 0.2, 2.26, 0, 0, undefined, M);
  rod(B, [L / 2 - 1.5, 2.6, 0], [L / 2 + 6.5, 5.2, 0], 0.16, 0.06, KR.TIMBER, 5, undefined, M);
  // three masts, crossed with yards, the canvas rolled up along them
  for (const [mx, h, yards] of [[L * 0.27, 24, 3], [0, 26, 3], [-L * 0.28, 20, 1]]) {
    rod(B, [mx, 2.2, 0], [mx, h, 0], 0.2, 0.07, KR.TIMBER, 6, undefined, M);
    for (let k = 0; k < yards; k++) {
      const y = 8.5 + k * ((h - 11) / Math.max(1, yards - 0.4)),
        w = 5.6 - k * 1.3;
      rod(B, [mx, y, -w], [mx, y, w], 0.08, 0.08, KR.TIMBER, 4, undefined, M);
      rod(B, [mx + 0.12, y - 0.22, -w * 0.9], [mx + 0.12, y - 0.22, w * 0.9], 0.2, 0.2, 0xc9bfa8, 5, { sway: 0.05 }, M);
    }
    for (const sz of [-1, 1]) for (const dx of [-1.2, 1.2]) rod(B, [mx, h * 0.8, 0], [mx + dx, 2.3, sz * 2.9], 0.02, 0.02, 0x14141c, 3, undefined, M);
    if (yards === 1) rod(B, [mx - 0.2, 6, 0], [mx - 7.5, 13, 0], 0.07, 0.05, KR.TIMBER, 4, undefined, M); // the gaff of the mizzen
  }
  rod(B, [L * 0.27, 24, 0], [L / 2 + 6.5, 5.2, 0], 0.018, 0.018, 0x14141c, 3, undefined, M);
  // a riding light at the bow, lamplight in the deckhouse
  B.box(0.3, 0.4, 0.3, 0xffc060, L * 0.46, 4.4, 0, 0, { emissive: 1 }, M);
  for (const sz of [-1, 1]) B.box(0.9, 0.5, 0.06, 0xffc861, -L * 0.34, 2.9, sz * 1.62, 0, { emissive: 0.9 }, M);
  const p = new THREE.Vector3(L * 0.46, 4.6, 0).applyMatrix4(M);
  world.glows?.push({ p: [p.x, p.y, p.z], c: 0xffc060, size: 2.2 });
  world.colliders.push({ x: o.x, z: o.z, hw: (L / 2) * s, hd: 3.1 * s, ry: o.ry ?? 0, top: 3.4 * s });
  (world.platforms ??= []).push({ minx: o.x - 9 * s, maxx: o.x + 9 * s, minz: o.z - 2 * s, maxz: o.z + 2 * s, y: 2.3 * s });
}

// ---------------------------------------------------------------- a small boat under sail
export function sjekteGeo() {
  const B = new Builder();
  B.add(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), (x, y) => mix(0x2a1c14, 0x7a5a3a, clamp(y + 1)), xf(0, 0.55, 0, 0, 3.1, 0.9, 1.0));
  B.add(new THREE.CylinderGeometry(1, 1, 0.06, 10), 0x6a5438, xf(0, 0.36, 0, 0, 2.8, 1, 0.85));
  rod(B, [0.5, 0.3, 0], [0.5, 5.2, 0], 0.07, 0.04, KR.TIMBER, 5);
  rod(B, [0.5, 1.2, 0], [-2.1, 5.0, 0], 0.035, 0.03, KR.TIMBER, 4);
  // the spritsail: four corners, tan as bark-dyed canvas
  const g = new THREE.BufferGeometry();
  const P = [0.5, 1.1, 0, 0.5, 4.9, 0, -2.1, 5.0, 0, -2.3, 1.2, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute([...P.slice(0, 9), P[0], P[1], P[2], ...P.slice(6, 12), P[0], P[1], 0.02, ...P.slice(6, 9).map((v, i) => (i === 2 ? 0.02 : v)), ...P.slice(3, 6).map((v, i) => (i === 2 ? 0.02 : v)), P[0], P[1], 0.02, ...P.slice(9, 12).map((v, i) => (i === 2 ? 0.02 : v)), ...P.slice(6, 9).map((v, i) => (i === 2 ? 0.02 : v))], 3));
  g.computeVertexNormals();
  B.add(g, (x, y) => mix(0x8a5a34, 0xc98a4a, clamp(y / 5)), null, { sway: 0.25 });
  // someone at the tiller
  B.ball(0.3, 0x1c1a24, -1.9, 0.75, 0, 1, 1.3, 1, 0);
  B.ball(0.14, 0xe8dcc0, -1.9, 1.3, 0, 1, 1.1, 1, 0);
  return B.geometry();
}
