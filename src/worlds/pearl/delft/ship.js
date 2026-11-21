// The trader moored in the harbour: a Dutch fluyt of the 1660s, round in the bow and
// full in the belly, with a high narrow stern, three masts and the tricolour over the rail.
//
//   trader(B, world, { x, z })    B: a Builder. The bow points west (-x); the main deck is
//                                 1.8 m above the canal bed's datum, and you can stand on it.
// Returns where the main top is (the round platform up the main mast).
import * as THREE from 'three';
import { xf, mix } from '../../../engine/build.js';
import { clamp, smooth, vnoise } from '../../../engine/gl.js';
import { cuboid } from '../../../engine/facade.js';

const _up = new THREE.Vector3(0, 1, 0);
function rod(B, a, b, r0, r1, col, seg = 5, data) {
  const va = new THREE.Vector3(...a),
    vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va),
    L = d.length() || 0.001;
  const m = new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_up, d.normalize()), new THREE.Vector3(1, 1, 1));
  B.add(new THREE.CylinderGeometry(r1, r0, L, seg, 1, true), col, m, data);
}

export function trader(B, world, o) {
  const X = o.x,
    Z = o.z ?? 0,
    L = 23.5,
    DECK = 1.8,
    QD = 3.1; // the quarterdeck
  // the hull, lofted through its sections: u -1 at the stem .. 1 at the stern, t 0 at the keel .. 1 at the rail
  const beam = (u) => (u < 0.72 ? 2.95 * Math.pow(1 - Math.pow(Math.abs(u) / (u < 0 ? 1 : 1.15), 2.3), 0.5) : 2.2 - (u - 0.72) * 3.2);
  const keel = (u) => -2.0 + 1.3 * Math.pow(Math.abs(u), 5);
  const rail = (u) => DECK + 0.75 + 1.9 * Math.pow(Math.max(u, 0), 2.2) + 0.9 * Math.pow(Math.max(-u, 0), 3);
  const NS = 22,
    NT = 8;
  const pos = [],
    idx = [];
  for (let side = 0; side < 2; side++)
    for (let i = 0; i <= NS; i++) {
      const u = (i / NS) * 2 - 1;
      for (let j = 0; j <= NT; j++) {
        const t = j / NT;
        const w = beam(u) * Math.pow(Math.sin((t * Math.PI) / 2), 0.62) * (1 - 0.16 * smooth(0.62, 1, t)); // round in the bilge, drawn in at the rail
        pos.push(u * (L / 2), keel(u) + (rail(u) - keel(u)) * Math.pow(t, 1.35), (side ? -1 : 1) * w);
      }
    }
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < NS; i++)
      for (let j = 0; j < NT; j++) {
        const a = side * (NS + 1) * (NT + 1) + i * (NT + 1) + j,
          b = a + NT + 1;
        if (side) idx.push(a, a + 1, b, b, a + 1, b + 1);
        else idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hull.setIndex(idx);
  hull.computeVertexNormals();
  const M = xf(X, 0, Z);
  // tar below the water, oak above it, one pale wale and a band of green under the rail
  B.add(
    hull,
    (x, y, z) => {
      const u = x / (L / 2),
        t = clamp((y - keel(u)) / (rail(u) - keel(u)));
      const c = mix(0x4a3424, 0x7a5636, 0.35 + 0.5 * vnoise(x * 0.35, y * 3.5));
      if (y < -0.9) c.set(0x241c18);
      if (t > 0.6 && t < 0.67) c.set(0xc9a868);
      if (t > 0.86 && t < 0.94) c.set(0x3a5a44);
      return c;
    },
    M
  );
  // the transom: flat, with the cabin's windows across it
  const ty0 = keel(1),
    ty1 = rail(1),
    tb = beam(1);
  const tr = new THREE.BufferGeometry();
  tr.setAttribute('position', new THREE.Float32BufferAttribute([L / 2, ty0, 0.1, L / 2, ty0, -0.1, L / 2, ty1, -tb * 0.86, L / 2, ty1, tb * 0.86], 3));
  tr.setIndex([0, 1, 2, 0, 2, 3]);
  tr.computeVertexNormals();
  B.add(tr, (x, y) => mix(0x5a3e28, 0x8a6238, clamp((y - ty0) / (ty1 - ty0))), M);
  for (const wz of [-0.9, 0, 0.9]) B.box(0.06, 0.7, 0.62, 0xffd590, L / 2 + 0.03, QD + 0.25, wz, 0, { emissive: 0.5 }, M);
  B.box(0.1, 0.16, tb * 1.8, 0xc9a868, L / 2 + 0.02, ty1 - 0.1, 0, 0, undefined, M);
  // decks: the long main deck, the quarterdeck aft with its bulkhead, a small forecastle
  for (const [u0, u1, y] of [[-0.9, 0.5, DECK], [0.5, 0.99, QD], [-0.98, -0.8, DECK + 0.75]]) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = u0 + ((u1 - u0) * i) / n,
        b = u0 + ((u1 - u0) * (i + 1)) / n,
        wa = beam(a) * 0.86,
        wb = beam(b) * 0.86;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([a * (L / 2), y, wa, b * (L / 2), y, wb, b * (L / 2), y, -wb, a * (L / 2), y, -wa], 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.computeVertexNormals();
      B.add(g, (x, y2, z) => mix(0x9a8058, 0xb89a6a, vnoise(x * 0.5, z * 4)), M);
    }
  }
  B.box(0.16, QD - DECK, beam(0.5) * 1.7, 0x6a4a30, 0.5 * (L / 2), DECK, 0, 0, undefined, M);
  B.box(0.06, 1.5, 0.8, 0x3a2a1e, 0.5 * (L / 2) - 0.1, DECK, 0, 0, undefined, M); // the cabin door
  B.box(0.16, 0.75, beam(-0.8) * 1.7, 0x6a4a30, -0.8 * (L / 2), DECK, 0, 0, undefined, M);
  // hatches, the capstan, a boat stowed on deck, casks
  B.box(2.6, 0.3, 1.9, 0x5a4230, -2, DECK, 0, 0, undefined, M);
  B.box(1.6, 0.3, 1.4, 0x5a4230, 2.6, DECK, 0, 0, undefined, M);
  B.cyl(0.32, 0.42, 0.9, 0x6a4a30, -6.4, DECK, 0, 8, undefined, M);
  for (const [bx, bz] of [[0.6, 1.5], [1.3, 1.6], [0.9, -1.6]]) B.cyl(0.3, 0.26, 0.8, 0x8a6a44, bx, DECK, bz, 8, undefined, M);
  // the stern lantern and the flag: red, white and blue
  rod(B, [X + L / 2 - 0.2, rail(1), Z], [X + L / 2 + 0.5, rail(1) + 3.6, Z], 0.05, 0.035, 0x3a2a1e, 4);
  const FL = ['#b0282a', '#f1ebdc', '#24407a'];
  for (let k = 0; k < 3; k++) B.box(2.6, 0.5, 0.05, FL[k], L / 2 + 1.75, rail(1) + 3.2 - k * 0.5 - 0.4, 0, 0, { sway: (px) => 0.25 + (px + 1.3) * 0.35 }, M);
  B.box(0.3, 0.42, 0.3, 0xffd590, L / 2 - 0.5, rail(1) + 0.5, 0, 0, { emissive: 0.9 }, M);
  world.glows?.push({ p: [X + L / 2 - 0.5, rail(1) + 0.7, Z], c: 0xffd08a, size: 1.4 });

  // masts: fore, main and mizzen; yards; the sails loosed and bellying
  const cloth = (px, py, pz) => mix(0xcdc3a8, 0xefe6cf, 0.5 + 0.5 * Math.sin(pz * 3.9)).multiplyScalar(0.9 + 0.1 * Math.sin(py * 2.2));
  const sail = (mx, y, w, h, belly) => {
    const g = new THREE.BoxGeometry(0.06, h, w, 1, 5, 7);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) - belly * Math.cos((P.getZ(i) / w) * Math.PI) * Math.sin((0.5 - P.getY(i) / h) * Math.PI * 0.85 + 0.25));
    g.computeVertexNormals();
    B.add(g, cloth, M.clone().multiply(xf(mx - 0.15, y, 0)), { sway: 0.3 });
  };
  const mast = (mx, top, yards) => {
    rod(B, [X + mx, DECK - 0.5, Z], [X + mx, top, Z], 0.19, 0.08, 0x4a3626, 6);
    for (const [y, w] of yards) rod(B, [X + mx, y, Z - w / 2], [X + mx, y, Z + w / 2], 0.07, 0.07, 0x4a3626, 4);
    // shrouds down to the rail on either side
    for (const sz of [-1, 1]) for (const dx of [-0.9, 0.1, 1.1]) rod(B, [X + mx, top * 0.78, Z], [X + mx + dx, rail((mx + dx) / (L / 2)) - 0.1, Z + sz * beam((mx + dx) / (L / 2)) * 0.84], 0.018, 0.018, 0x2a221c, 3);
  };
  const MAIN = -2.5; // 101 in the world, where the story looks for it
  mast(MAIN, 21.2, [[11.2, 9.4], [17.4, 6.4]]);
  sail(MAIN, 7.3, 8.8, 7.2, 0.9);
  sail(MAIN, 14.4, 6.0, 5.4, 0.6);
  mast(-8.4, 16.5, [[9.4, 7.4], [14.2, 5]]);
  sail(-8.4, 6.2, 7.0, 5.8, 0.75);
  sail(-8.4, 11.9, 4.6, 4.2, 0.45);
  mast(5.6, 13.5, []);
  // the mizzen carries a lateen: one long yard aslant, a three-cornered sail under it
  rod(B, [X + 3.2, 5.2, Z], [X + 9.4, 12.6, Z], 0.06, 0.05, 0x4a3626, 4);
  const lat = new THREE.BufferGeometry();
  lat.setAttribute('position', new THREE.Float32BufferAttribute([3.3, 5.3, 0.03, 9.3, 12.5, 0.03, 9.0, 4.4, 0.03, 3.3, 5.3, -0.03, 9.0, 4.4, -0.03, 9.3, 12.5, -0.03], 3));
  lat.computeVertexNormals();
  B.add(lat, cloth, M, { sway: 0.25 });
  // the bowsprit, and a pennant at the main truck
  rod(B, [X - L / 2 + 1.2, rail(-0.9), Z], [X - L / 2 - 4.2, rail(-1) + 2.4, Z], 0.14, 0.06, 0x4a3626, 5);
  B.box(1.9, 0.3, 0.04, 0xb0282a, MAIN + 1.0, 21.0, 0, 0, { sway: (px) => 0.3 + (px + 0.95) * 0.5 }, M);
  // the round tops
  const top = [X + MAIN, 18.2, Z];
  B.cyl(0.85, 0.7, 0.3, 0x5a4230, MAIN, 17.9, 0, 10, undefined, M);
  B.cyl(0.6, 0.5, 0.25, 0x5a4230, -8.4, 13.9, 0, 9, undefined, M);

  world.platforms.push({ minx: X - L * 0.45, maxx: X + L * 0.25, minz: Z - 2.4, maxz: Z + 2.4, y: DECK }, { minx: X + L * 0.25, maxx: X + L * 0.49, minz: Z - 1.9, maxz: Z + 1.9, y: QD });
  world.colliders.push({ x: X, z: Z, hw: L * 0.48, hd: 2.9, ry: 0, top: DECK - 0.4 });
  world.maps?.blob(X, Z, 10, 0.3);
  return { top, crowNest: [X + MAIN, 19.4, Z] };
}

// ---------------------------------------------------------------- a canal barge
// Flat, blunt at both ends, low enough to pass under the bridges. Drawn into a Soup about
// its own middle, lying along x. cargo: 'peat' | 'barrels' | 'tilt' (a cloth stretched over the hold)
const _t = new THREE.Color();
export function barge(S, cargo, R) {
  cuboid(S, [-3.4, -0.25, -1.0], [3.4, 0.55, 1.0], (x, y) => _t.set(0x5a4030).multiplyScalar(0.8 + 0.4 * clamp(y + 0.3)), undefined, '');
  for (const sx of [-1, 1]) {
    S.facing([0, 0.2, 0]);
    S.tri([sx * 3.4, -0.25, -1.0], [sx * 3.4, -0.25, 1.0], [sx * 4.5, 0.6, 0], 0x4a3626);
    S.tri([sx * 3.4, 0.55, -1.0], [sx * 3.4, 0.55, 1.0], [sx * 4.5, 0.6, 0], 0x6a4a36);
    S.tri([sx * 3.4, -0.25, -1.0], [sx * 3.4, 0.55, -1.0], [sx * 4.5, 0.6, 0], 0x5a4030);
    S.tri([sx * 3.4, -0.25, 1.0], [sx * 3.4, 0.55, 1.0], [sx * 4.5, 0.6, 0], 0x5a4030);
    S.facing(null);
  }
  cuboid(S, [-3.5, 0.55, -1.08], [3.5, 0.66, 1.08], 0x8a6a48, undefined, 'b');
  if (cargo === 'peat') for (let i = 0; i < 5; i++) cuboid(S, [-2.4 + i * 0.9, 0.66, -0.7], [-1.6 + i * 0.9, 1.0 + (i % 2) * 0.2, 0.7], i % 2 ? 0x4a3a2c : 0x5a4634, undefined, 'b');
  else if (cargo === 'barrels') for (let i = 0; i < 6; i++) cuboid(S, [-2.2 + (i % 3) * 1.3, 0.66, i < 3 ? -0.75 : 0.1], [-1.5 + (i % 3) * 1.3, 1.5, i < 3 ? -0.1 : 0.75], i % 2 ? 0x8a6a44 : 0x7a5a3a, undefined, 'b');
  else cuboid(S, [-1.6, 0.66, -0.8], [1.2, 1.25, 0.8], [0xb2452f, 0xd9c890, 0x4a6a8a][(R() * 3) | 0], undefined, 'b');
}
