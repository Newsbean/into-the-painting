// What covers the ground, so that no stretch of it is bare: drifts of grass, patches of
// flowers, bushes and stones, the forest on the hills behind, the gear of a fishing
// beach, and the pines and moored boats of Edo's waterfront.
// None of it throws the world's dice: it has its own.
import * as THREE from 'three';
import { Builder, mix, xf } from '../../../engine/build.js';
import { rng, vnoise, clamp } from '../../../engine/gl.js';
import { keptClear } from '../ground-plan.js';
import { rod } from '../helpers.js';
import { matsu } from '../plants.js';
import { edoWeight, CASTLE } from '../edo/town.js';
import { Raw, instances, show, shoreZ } from '../../../engine/scatter.js';

const UP = [0, 1, 0];
const GREENS = [0x6f8a56, 0x8aa468, 0x5c7a4e, 0x7f9a6a, 0x4f7a5a, 0x96a86a];
const STRAW = [0xc9b877, 0xb8a868, 0xd6c68a];
const BLOOMS = [0xe8c84a, 0xe8c84a, 0xf0d860, 0xf3ecd8, 0x6a78c0, 0xd9482b, 0xe58aa6, 0xf3ecd8];
const AZALEA = [0xe58aa6, 0xd9482b, 0xf3ecd8, 0xc86a9a];
const FOREST = [0x25463a, 0x2f5a44, 0x3a6a4e, 0x2a5040, 0x45745a, 0x1f3f36];
const STONE = [0x8a8a84, 0x9a968c, 0x74807c, 0xa8a394];
const TIMBER = 0x4a3526,
  WOOD = 0xb89668,
  WOOD_L = 0xd9c690;
const pick = (R, a) => a[(R() * a.length) | 0];

// ---------------------------------------------------------------- what is scattered
// a clump of long grass: seven blades leaning out from one root
function tuftGeo(R) {
  const g = new Raw();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.283 + R() * 0.6,
      lean = 0.18 + R() * 0.3,
      h = 0.32 + R() * 0.36,
      w = 0.045 + R() * 0.03;
    const dx = Math.cos(a),
      dz = Math.sin(a),
      bx = dx * 0.08,
      bz = dz * 0.08,
      px = -dz * w,
      pz = dx * w;
    const mx = bx + dx * lean * 0.45 * h,
      mz = bz + dz * lean * 0.45 * h;
    const m0 = [mx - px * 0.7, h * 0.55, mz - pz * 0.7, 0xffffff, 0.3, 1],
      m1 = [mx + px * 0.7, h * 0.55, mz + pz * 0.7, 0xffffff, 0.3, 1];
    g.quad([bx - px, 0, bz - pz, 0x3a5a40, 0, 0.5], [bx + px, 0, bz + pz, 0x3a5a40, 0, 0.5], m1, m0, UP);
    g.tri(m0, m1, [bx + dx * lean * 1.25 * h, h, bz + dz * lean * 1.25 * h, 0xffffff, 0.9, 1], UP);
  }
  return g.geometry();
}
// five flowers on their stalks; the heads take the colour of the patch they grow in
function bloomGeo(R) {
  const g = new Raw();
  for (let i = 0; i < 5; i++) {
    const a = R() * 6.283,
      d = R() * 0.28,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      h = 0.32 + R() * 0.3,
      r = 0.085 + R() * 0.05;
    const cx = x + (R() - 0.5) * 0.12,
      cz = z + (R() - 0.5) * 0.12;
    g.tri([x - 0.02, 0, z, 0x4f7a4a, 0, 0], [x + 0.02, 0, z, 0x4f7a4a, 0, 0], [cx, h, cz, 0x6f9a5a, 0.5, 0], UP);
    for (let q = 0; q < 4; q++) {
      const a0 = (q / 4) * 6.283,
        a1 = ((q + 1) / 4) * 6.283;
      g.tri([cx, h - r * 0.1, cz, 0xffffff, 0.6, 1], [cx + Math.cos(a0) * r, h + r * 0.7, cz + Math.sin(a0) * r, 0xffffff, 0.6, 1], [cx + Math.cos(a1) * r, h + r * 0.7, cz + Math.sin(a1) * r, 0xffffff, 0.6, 1], UP);
    }
  }
  return g.geometry();
}
// a rounded bush; with `blossom`, a dark one sprinkled with flowers that take the instance colour
function bushGeo(blossom, R) {
  const g = new Raw();
  g.add(new THREE.IcosahedronGeometry(1, 1), (x, y) => [mix(0x24402f, blossom ? 0x4f7a4a : 0xffffff, clamp(y * 0.5 + 0.55)), 0.4 * Math.max(0, y + 0.3), blossom ? 0 : 0.8 * clamp(y * 0.5 + 0.6)], new THREE.Matrix4().makeScale(1, 0.72, 1));
  if (blossom)
    for (let i = 0; i < 30; i++) {
      const a = R() * 6.283,
        e = R() * 1.2,
        s = 0.1 + R() * 0.07;
      const n = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)];
      const p = [n[0] * 1.03, n[1] * 0.75, n[2] * 1.03],
        t1 = [-Math.sin(a) * s, 0, Math.cos(a) * s],
        t2 = [-n[0] * Math.sin(e) * s, Math.cos(e) * s, -n[2] * Math.sin(e) * s];
      const v = (k1, k2) => [p[0] + t1[0] * k1 + t2[0] * k2, p[1] + t1[1] * k1 + t2[1] * k2, p[2] + t1[2] * k1 + t2[2] * k2, 0xffffff, 0.4, 1];
      g.quad(v(1, 0), v(0, 1), v(-1, 0), v(0, -1), n);
    }
  return g.geometry();
}
// a stone: a faceted lump, darker where it sits in the ground
function rockGeo() {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i),
      y = P.getY(i),
      z = P.getZ(i);
    const k = 1 + 0.22 * Math.sin(x * 5.1 + y * 3.3) * Math.sin(z * 4.7 + y * 2.1);
    P.setXYZ(i, x * k * 1.15, y * k * 0.68, z * k * 0.9);
  }
  geo.computeVertexNormals();
  return new Raw().add(geo, (x, y) => [mix(0x3a3a3c, 0xffffff, clamp(y * 0.6 + 0.6)), 0, 0.85]).geometry();
}
// a cryptomeria for the hill forests: three skirts of needles on a short trunk, one unit tall
function sugiGeo() {
  const g = new Raw();
  for (let i = 0; i < 3; i++) {
    const r = 1 - i * 0.24,
      y0 = 0.16 + i * 0.25,
      hh = 0.5 - i * 0.03;
    g.add(new THREE.ConeGeometry(r, hh, 6, 1, true), (x, y) => [mix(0x16302a, 0xffffff, clamp(y / hh + 0.5) * 0.75 + 0.1), 1.8 * (y0 + hh / 2 + y), 0.85], new THREE.Matrix4().makeTranslation(0, y0 + hh / 2, 0));
  }
  g.add(new THREE.CylinderGeometry(0.07, 0.11, 0.3, 5, 1, true), () => [0x5a3a2a, 0, 0], new THREE.Matrix4().makeTranslation(0, 0.12, 0));
  return g.geometry();
}

// ---------------------------------------------------------------- what stands on the beach
// a net hung out to dry between two pairs of crossed poles
function rack(B, x, y, z, ry, R) {
  const M = xf(x, y, z, ry),
    L = 5 + R() * 3;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) rod(B, [(sx * L) / 2, -0.3, sz * 0.4], [(sx * L) / 2, 2.35, -sz * 0.06], 0.06, 0.045, TIMBER, 4, undefined, M);
  rod(B, [-L / 2 - 0.35, 2.25, 0], [L / 2 + 0.35, 2.25, 0], 0.045, 0.045, TIMBER, 4, undefined, M);
  const net = new THREE.BoxGeometry(L * 0.94, 1.75, 0.03, 10, 4, 1);
  const P = net.attributes.position;
  for (let i = 0; i < P.count; i++) P.setY(i, P.getY(i) - Math.sin((P.getX(i) / (L * 0.94) + 0.5) * Math.PI) * 0.22 * (0.5 - P.getY(i) / 1.75));
  B.add(net, (px, py) => mix(0x5a4030, 0x8a6a48, ((Math.floor(px * 3) + Math.floor(py * 3)) & 1) * 0.7), M.clone().multiply(xf(0, 1.36, 0)), { sway: (px, py) => (0.5 - py / 1.75) * 1.1 });
  // floats along its foot
  for (let i = 0; i < 6; i++) B.ball(0.09, 0xd9c690, ((i + 0.5) / 6 - 0.5) * L * 0.9, 0.46, 0.03, 1, 1, 1, 0, { sway: 1.1 }, M);
}
function baskets(B, x, y, z, R) {
  for (let i = 0, n = 2 + ((R() * 3) | 0); i < n; i++) {
    const bx = x + (R() - 0.5) * 1.5,
      bz = z + (R() - 0.5) * 1.5,
      r = 0.28 + R() * 0.12;
    B.cyl(r, r * 0.8, 0.42, pick(R, [0xc9a964, 0xb8985a, 0xd6bd7a]), bx, y - 0.02, bz, 8);
    B.cyl(r * 1.04, r * 1.04, 0.05, 0x8a6a44, bx, y + 0.38, bz, 8);
    if (R() < 0.5) B.ball(r * 0.7, 0x9ab0b8, bx, y + 0.42, bz, 1, 0.35, 1, 0); // the catch
  }
}
function driftwood(B, x, y, z, R) {
  for (let i = 0, n = 1 + ((R() * 3) | 0); i < n; i++) {
    const a = R() * 6.283,
      l = 1.2 + R() * 2.4,
      cx = x + (R() - 0.5) * 2,
      cz = z + (R() - 0.5) * 2;
    rod(B, [cx - Math.cos(a) * l * 0.5, y + 0.1, cz - Math.sin(a) * l * 0.5], [cx + Math.cos(a) * l * 0.5, y + 0.14 + R() * 0.2, cz + Math.sin(a) * l * 0.5], 0.11 + R() * 0.06, 0.05, pick(R, [0xb8a890, 0xa89878, 0xc8bca0]), 5);
  }
}
// a boat pulled up and turned over on two logs
function upturned(B, x, y, z, ry, R) {
  const M = xf(x, y, z, ry),
    L = 4.6 + R() * 1.6;
  B.add(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), (px, py) => mix(0x8a6a48, WOOD_L, clamp(py + 0.2)), M.clone().multiply(xf(0, 0.22, 0, 0, L / 2, 0.75, 0.85)));
  B.box(L * 0.9, 0.1, 0.12, TIMBER, 0, 0.92, 0, 0, undefined, M);
  for (const sx of [-1, 1]) rod(B, [sx * L * 0.28, 0.14, -1.1], [sx * L * 0.28, 0.14, 1.1], 0.12, 0.12, 0x6a4a36, 5, undefined, M);
}
// a coaster made fast off the quay: some with a mast and a furled sail, some with a cabin
function moored(B, x, z, ry, R) {
  const M = xf(x, -0.25, z, ry),
    L = 8 + R() * 5;
  B.box(L * 0.74, 0.9, 2.2, WOOD_L, 0, 0, 0, 0, undefined, M);
  B.box(L * 0.74, 0.14, 2.4, 0x8a6a48, 0, 0.9, 0, 0, undefined, M);
  for (const sgn of [-1, 1]) B.add(new THREE.CylinderGeometry(0.03, 1.15, L * 0.32, 4, 1), WOOD_L, M.clone().multiply(xf(sgn * L * 0.51, 0.85, 0, 0, 0.62, 1, 1, 0, -sgn * (Math.PI / 2 - 0.3))));
  if (R() < 0.6) {
    const h = 6 + R() * 2.5;
    rod(B, [0.4, 0.9, 0], [0.4, h, 0], 0.11, 0.07, TIMBER, 5, undefined, M);
    rod(B, [0.4, h * 0.82, -2.1], [0.4, h * 0.82, 2.1], 0.06, 0.06, TIMBER, 4, undefined, M);
    B.add(new THREE.CylinderGeometry(0.24, 0.24, 3.9, 6), 0xe9dfc6, M.clone().multiply(xf(0.4, h * 0.82 - 0.26, 0, 0, 1, 1, 1, Math.PI / 2, 0))); // the sail, furled along its yard
  }
  if (R() < 0.55) {
    B.box(2.6, 1.1, 1.8, WOOD, -L * 0.14, 1.0, 0, 0, undefined, M);
    B.gable(3.0, 2.1, 0.5, 0x4a5a72, -L * 0.14, 2.1, 0, 0, undefined, M);
  } else for (let i = 0; i < 3; i++) B.box(0.7, 0.55, 0.7, pick(R, [0xb89a5a, 0x8a6a44, 0xd8c48a]), -L * 0.2 + i * 0.8, 1.02, (R() - 0.5) * 0.8, R(), undefined, M); // cargo on deck
  return L;
}

// ---------------------------------------------------------------- laying it all out
export function addGroundCover(world, { S, H, maps, flat }) {
  const R = rng(4242);
  // everything already standing, sorted into squares of ground, so that asking
  // "is this spot taken?" tens of thousands of times stays quick
  const squares = new Map();
  for (const c of world.colliders) {
    const r = c.r ?? Math.hypot(c.hw, c.hd);
    for (let i = Math.floor((c.x - r - 1) / 16); i <= Math.floor((c.x + r + 1) / 16); i++)
      for (let j = Math.floor((c.z - r - 1) / 16); j <= Math.floor((c.z + r + 1) / 16); j++) {
        const k = i + ':' + j;
        if (!squares.has(k)) squares.set(k, []);
        squares.get(k).push(c);
      }
  }
  const taken = (x, z, pad = 0.2) => {
    const y = H(x, z) + 0.5;
    for (const c of squares.get(Math.floor(x / 16) + ':' + Math.floor(z / 16)) ?? []) {
      if (y > c.top || (c.bottom !== undefined && y < c.bottom)) continue;
      if (c.r !== undefined) {
        if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
        continue;
      }
      const cs = Math.cos(c.ry ?? 0),
        sn = Math.sin(c.ry ?? 0),
        dx = x - c.x,
        dz = z - c.z;
      if (Math.abs(dx * cs - dz * sn) < c.hw + pad && Math.abs(dx * sn + dz * cs) < c.hd + pad) return true;
    }
    return false;
  };
  const ok = (x, z, pad) => {
    if (keptClear(x, z, pad) || edoWeight(x, z) > 0.02) return false;
    if (Math.hypot(x - CASTLE.x, z - CASTLE.z) < 50) return false;
    return !taken(x, z);
  };

  // --- the gear of a fishing beach, strung along the high-water line
  const B = new Builder();
  for (let x = -236; x < 236; x += 8 + R() * 9) {
    const z = shoreZ(H, x, 1.1) + R() * 3,
      y = H(x, z),
      k = R();
    if (Math.abs(x - 10) < 9 || !ok(x, z, 2.4)) continue;
    if (k < 0.3) rack(B, x, y, z, (R() - 0.5) * 0.9, R);
    else if (k < 0.55) baskets(B, x, y, z, R);
    else if (k < 0.8) driftwood(B, x, y, z, R);
    else {
      upturned(B, x, y, z, R() * 3, R);
      world.colliders.push({ x, z, r: 1.3, top: y + 0.9 });
    }
    maps.blob(x, z, 2.6, 0.25);
  }
  // --- Edo's waterfront: coasters made fast off the quay, and old pines along it
  const T = new Builder();
  for (let x = -416; x < -252; x += 13 + R() * 9) {
    const ry = (R() - 0.5) * 0.5,
      z = shoreZ(H, x, 0) - 4.5 - R() * 5;
    const L = moored(B, x, z, ry, R);
    world.colliders.push({ x, z, hw: L * 0.5, hd: 1.3, ry, top: 1.0 });
    world.platforms.push({ minx: x - L * 0.3, maxx: x + L * 0.3, minz: z - 0.9, maxz: z + 0.9, y: 0.8 });
  }
  const pineAt = (x, z, h) => {
    const y = H(x, z);
    if (y < 1.2 || taken(x, z, 1)) return;
    matsu(T, x, y, z, h, R, { pads: 5 });
    world.colliders.push({ x, z, r: 0.4, top: y + h * 0.5 });
    maps.blob(x, z, h * 0.34, 0.3);
  };
  for (let x = -424; x < -250; x += 11 + R() * 10) pineAt(x, shoreZ(H, x, 1.9) + R() * 1.2, 8 + R() * 5);
  // the castle stands among pines, with the road up to it left open
  for (let i = 0; i < 26; i++) {
    const a = R() * 6.283,
      d = 27 + R() * 20;
    if (Math.abs(Math.sin(a)) > 0.86 && Math.sin(a) < 0) continue;
    pineAt(CASTLE.x + Math.cos(a) * d, CASTLE.z + Math.sin(a) * d, 9 + R() * 6);
  }
  S.add(B.meshes(flat({ scale: 0.25 })), T.meshes(flat({ scale: 0.2 })));

  // --- drifts of long grass; dry and sparse on the sand
  const grass = [];
  for (let i = 0; i < 110000 && grass.length < 24000; i++) {
    const x = -470 + R() * 830,
      z = 194 + R() * 190,
      y = H(x, z);
    if (y < 0.7) continue;
    const beach = y < 1.9;
    if (beach ? R() < 0.86 : vnoise(x * 0.045 + 7, z * 0.045) < 0.3 + 0.3 * R()) continue;
    if (!ok(x, z, 0.3)) continue;
    grass.push({ x, y: y - 0.04, z, ry: R() * 6.283, s: [0.8 + R() * 0.7, 0.7 + R() * 0.9, 0.8 + R() * 0.7], c: beach || R() < 0.16 ? pick(R, STRAW) : pick(R, GREENS) });
  }
  // --- patches of flowers, one colour to a patch
  const flowers = [];
  for (let k = 0, made = 0; k < 900 && made < 120; k++) {
    const cx = -450 + R() * 780,
      cz = 200 + R() * 150;
    if (H(cx, cz) < 2.2 || !ok(cx, cz, 2)) continue;
    made++;
    const col = pick(R, BLOOMS),
      rad = 3 + R() * 6;
    for (let i = 0, n = 18 + ((R() * 30) | 0); i < n; i++) {
      const a = R() * 6.283,
        d = Math.sqrt(R()) * rad,
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (ok(x, z, 0.3)) flowers.push({ x, y: H(x, z) - 0.02, z, ry: R() * 6.283, s: 0.8 + R() * 0.6, c: col });
    }
  }
  // --- bushes, in twos and threes; here and there an azalea in flower
  const bushes = [],
    azaleas = [];
  for (let k = 0; k < 2600 && bushes.length + azaleas.length < 760; k++) {
    const cx = -460 + R() * 810,
      cz = 204 + R() * 200;
    if (H(cx, cz) < 2.4 || !ok(cx, cz, 1.6)) continue;
    const az = R() < 0.3,
      col = az ? pick(R, AZALEA) : pick(R, FOREST);
    for (let i = 0, n = 1 + ((R() * 3) | 0); i < n; i++) {
      const x = cx + (R() - 0.5) * 3.4,
        z = cz + (R() - 0.5) * 3.4,
        r = 0.6 + R() * 0.9;
      if (!ok(x, z, 1)) continue;
      (az ? azaleas : bushes).push({ x, y: H(x, z) + r * 0.2, z, ry: R() * 6.283, s: [r * (1 + R() * 0.4), r * (0.8 + R() * 0.4), r * (1 + R() * 0.4)], c: col });
      maps.blob(x, z, r * 1.5, 0.22);
    }
  }
  // --- stones: scattered along the beach, and lying out on the slopes
  const rocks = [];
  for (let k = 0; k < 1500 && rocks.length < 460; k++) {
    const cx = -450 + R() * 790,
      cz = 188 + R() * 190,
      y = H(cx, cz);
    if (y < 0.2 || (y > 2 && R() < 0.6) || !ok(cx, cz, 1.2)) continue;
    for (let i = 0, n = 1 + ((R() * 4) | 0); i < n; i++) {
      const x = cx + (R() - 0.5) * 2.6,
        z = cz + (R() - 0.5) * 2.6,
        r = 0.18 + R() * R() * 0.9;
      if (ok(x, z, 0.5)) rocks.push({ x, y: H(x, z) + r * 0.15, z, ry: R() * 6.283, rx: (R() - 0.5) * 0.4, s: r, c: pick(R, STONE) });
    }
  }
  // --- the forest on the hills: stands of cryptomeria with clearings between them
  const trees = [];
  for (let i = 0; i < 40000 && trees.length < 2800; i++) {
    const x = -470 + R() * 830,
      z = 250 + R() * 230,
      y = H(x, z);
    const stand = vnoise(x * 0.02 + 3, z * 0.02 + 9);
    if (y < 9 || stand < (z < 300 ? 0.56 : 0.4) || !ok(x, z, 3)) continue;
    const h = 9 + R() * 9,
      r = h * (0.2 + R() * 0.07);
    trees.push({ x, y: y - 0.5, z, ry: R() * 6.283, s: [r, h, r], c: pick(R, FOREST) });
    world.colliders.push({ x, z, r: 0.45, top: y + h * 0.5 });
    maps.blob(x, z, r * 1.5, 0.28);
  }

  const mat = flat({ scale: 0.3, side: THREE.DoubleSide });
  const layers = [
    [instances(grass, tuftGeo(R), mat, 64), 170],
    [instances(flowers, bloomGeo(R), mat, 64), 190],
    [instances(bushes, bushGeo(false, R), mat), 340],
    [instances(azaleas, bushGeo(true, R), mat), 340],
    [instances(rocks, rockGeo(), mat), 260],
    [instances(trees, sugiGeo(), mat, 128), 0],
  ];
  for (const [l] of layers) S.add(l.group);
  console.log('wave: cover', grass.length, 'tufts,', flowers.length, 'flowers,', bushes.length + azaleas.length, 'bushes,', rocks.length, 'stones,', trees.length, 'trees');
  return {
    tick(cam) {
      for (const [l, far] of layers) if (far) show(l.chunks, cam, far);
    },
  };
}
