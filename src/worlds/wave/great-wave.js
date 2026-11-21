import * as THREE from 'three';
import { smooth, clamp, rng } from '../../engine/gl.js';
import { waveMaterial, sprayPoints } from './wave-material.js';

// Every breaking wave on the sea: the great one, the swell in front of it and
// the crowd of smaller ones, with the spray and the footing on its shoulder.
// (How far the great wave has risen is applyRise() in index.js; how a wave is
// painted is wave-material.js.)
//
// A wave is two things in one mesh: the water, a cross-section swept along the
// crest, and the claws, hooked fingers of foam rooted on its lip.

// cross-section of the breaking wave, as the print shows it: a long back
// climbing from the left to a peak far over to the right, a lip that hooks
// down like a claw, and a deep hollow face underneath.
// u = towards the curl, v = up (unit height)
const PROFILE = [
  [-2.7, 0], [-1.95, 0.2], [-1.3, 0.45], [-0.7, 0.7], [-0.12, 0.91], [0.42, 1.0],
  [0.84, 0.97], [1.1, 0.85], [1.24, 0.66], [1.17, 0.45],
  [1.03, 0.57], [0.8, 0.7], [0.54, 0.72], [0.32, 0.6], [0.17, 0.4], [0.12, 0.22], [0.2, 0.08], [0.5, 0.01], [1.25, 0.0],
];
const profCurve = new THREE.CatmullRomCurve3(PROFILE.map((p) => new THREE.Vector3(p[0], p[1], 0)), false, 'catmullrom', 0.5);
const PROFS = new Map();
const profile = (n) => {
  if (!PROFS.has(n)) PROFS.set(n, profCurve.getPoints(n));
  return PROFS.get(n);
};

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// the vertices of one or more waves, with what wave-material.js needs to paint them
class WaveGeo {
  constructor() {
    this.p = [];
    this.n = [];
    this.uv = [];
    this.cl = [];
    this.pv = [];
    this.ix = [];
  }
  get count() {
    return this.p.length / 3;
  }
  vert(P, N, uv, cl, piv) {
    this.p.push(P[0], P[1], P[2]);
    this.n.push(N[0], N[1], N[2]);
    this.uv.push(uv[0], uv[1], uv[2], uv[3]);
    this.cl.push(cl[0], cl[1], cl[2], cl[3]);
    this.pv.push(piv[0], piv[1], piv[2]);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aUv', new THREE.Float32BufferAttribute(this.uv, 4));
    g.setAttribute('aCl', new THREE.Float32BufferAttribute(this.cl, 4));
    g.setAttribute('aPiv', new THREE.Float32BufferAttribute(this.pv, 3));
    g.setIndex(this.ix);
    g.computeBoundingSphere();
    return g;
  }
}

// One breaking wave, drawn into G. `big` is how much of the great wave's finery it
// gets (0 = a plain sea wave, 1 = lobed crest, claws upon claws); `claws` is how many
// hang along the lip. Returns where its crest and lip are, and at(s, k) for any point
// on it: s -1..1 along the crest, k 0..cols round the section.
function wave(G, o) {
  const { x = 0, z = 0, ry = 0, H = 40, len = 100, rows = 44, cols = 72, peak = 0, claws = 8, big = 0, seed = 1 } = o;
  const R = rng(seed);
  const PROF = profile(cols);
  const crestK = Math.round((cols * 5) / 18),
    tipK = Math.round((cols * 9) / 18);
  const cs = Math.cos(ry),
    sn = Math.sin(ry);
  const lobeW = 19 + R() * 9,
    lobePh = R() * 6.283,
    shift = R() * 400; // so no two waves carry the same streaks
  // how tall the wave stands along its crest; the near end plunges into the sea
  const hAt = (s) => Math.pow(Math.max(0, Math.cos((clamp(s - peak, -1, 1) * Math.PI) / 2)), 0.7) * smooth(1, 0.9, Math.abs(s));
  const at = (s, k) => {
    const hs = hAt(s);
    const k0 = Math.max(0, Math.min(cols - 1, Math.floor(k))),
      kf = k - k0;
    const p0 = PROF[k0],
      p1 = PROF[k0 + 1];
    const px = p0.x + (p1.x - p0.x) * kf;
    let py = p0.y + (p1.y - p0.y) * kf;
    const curl = smooth(0.08, 0.55, hs); // the lip only forms where the wave stands tall
    const a = (s * len) / 2;
    // the crest and the lip swell into lobes, like the knuckles of a hand
    const cap = smooth(0.2, 0.3, k / cols) * (1 - smooth(0.5, 0.6, k / cols)) * big;
    const L = Math.cos((a / lobeW) * 6.283 + lobePh);
    py *= 1 + cap * 0.05 * L;
    const pu = px > 0.42 ? 0.42 + (px - 0.42) * curl * (1 + cap * 0.07 * L) : px;
    const u = pu * H * (0.5 + 0.5 * hs) - (s - peak) * (s - peak) * H * 0.35;
    const v = py * H * hs;
    return [x + u * cs + a * sn, v - 0.7, z - u * sn + a * cs];
  };

  // ---- the water
  const base = G.count;
  const pts = [];
  for (let i = 0; i <= rows; i++) {
    const s = (i / rows) * 2 - 1;
    const row = [],
      arcs = [0];
    for (let k = 0; k <= cols; k++) {
      row.push(at(s, k));
      if (k) arcs.push(arcs[k - 1] + Math.hypot(row[k][0] - row[k - 1][0], row[k][1] - row[k - 1][1], row[k][2] - row[k - 1][2]));
    }
    row.arcs = arcs;
    pts.push(row);
  }
  // How far each point lies from the peak, measured over the surface the way the crest runs.
  // The streaks and scallops are drawn against this, so they keep their size where the
  // wave falls away at its ends, and fan out from the summit as they come down.
  const ip = Math.round(((peak + 1) / 2) * rows);
  const run = pts.map(() => new Float32Array(cols + 1));
  const gap = (i, j, k) => Math.hypot(pts[i][k][0] - pts[j][k][0], pts[i][k][1] - pts[j][k][1], pts[i][k][2] - pts[j][k][2]);
  for (let k = 0; k <= cols; k++) {
    for (let i = ip + 1; i <= rows; i++) run[i][k] = run[i - 1][k] + gap(i, i - 1, k);
    for (let i = ip - 1; i >= 0; i--) run[i][k] = run[i + 1][k] - gap(i, i + 1, k);
  }
  for (let i = 0; i <= rows; i++) {
    const s = (i / rows) * 2 - 1,
      hs = hAt(s),
      row = pts[i];
    for (let k = 0; k <= cols; k++) {
      const ts = sub(pts[Math.min(rows, i + 1)][k], pts[Math.max(0, i - 1)][k]);
      const tk = sub(row[Math.min(cols, k + 1)], row[Math.max(0, k - 1)]);
      const N = cross(ts, tk);
      G.vert(row[k], Math.hypot(N[0], N[1], N[2]) > 1e-6 ? norm(N) : [0, 1, 0], [run[i][k] + shift, k / cols, row.arcs[k] - row.arcs[crestK], row.arcs[k] - row.arcs[tipK]], [0, 0, 0, hs], [H / 66, 0, 0]);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let k = 0; k < cols; k++) {
      const a = base + i * (cols + 1) + k,
        b = a + cols + 1;
      G.ix.push(a, b, a + 1, b, b + 1, a + 1);
    }

  // ---- the claws
  // the surface at (s, k): where it is, the way the water is thrown (T), out of the water (N), along the crest (A)
  const frame = (s, k) => {
    const T = norm(sub(at(s, Math.min(cols, k + 0.5)), at(s, Math.max(0, k - 0.5))));
    const N = norm(cross(sub(at(Math.min(1, s + 0.01), k), at(Math.max(-1, s - 0.01), k)), T));
    return { P: at(s, k), T, N, A: norm(cross(T, N)) };
  };
  // A hooked finger of foam. It leaves the water along T, lifted `lift` radians off the
  // surface, and hooks back towards it through `hook` radians, tapering to a point; the
  // bigger ones carry smaller ones along the inside of the hook. Everything in one claw
  // bends about the same root, further the nearer the tip (w0..w1).
  const talon = (P, T, N, A, size, t) => {
    const { lift = 0.9, hook = 2.5, long = 7, seg = 11, sides = 6, lean = 0, phase = 0, root = P, w0 = 0, w1 = 1, kids = 0, depth = 0 } = t;
    const first = G.count,
      later = [];
    let c = add(P, N, -size * 0.35),
      phi = lift;
    for (let j = 0; j <= seg; j++) {
      const q = j / seg;
      const r = size * (Math.pow(1 - q, 0.6) * (1 + 0.25 * Math.sin(Math.min(1, q * 2.5) * Math.PI)) + 0.012);
      const cp = Math.cos(phi),
        sp = Math.sin(phi);
      const d = norm([T[0] * cp + N[0] * sp + A[0] * lean, T[1] * cp + N[1] * sp + A[1] * lean, T[2] * cp + N[2] * sp + A[2] * lean]);
      const b = [-T[0] * sp + N[0] * cp, -T[1] * sp + N[1] * cp, -T[2] * sp + N[2] * cp];
      for (let m = 0; m < sides; m++) {
        const th = (m / sides) * 6.283,
          ca = Math.cos(th),
          sa = Math.sin(th);
        const Q = [c[0] + A[0] * ca * r * 1.05 + b[0] * sa * r * 0.8, c[1] + A[1] * ca * r * 1.05 + b[1] * sa * r * 0.8, c[2] + A[2] * ca * r * 1.05 + b[2] * sa * r * 0.8];
        G.vert(Q, norm([A[0] * ca * 0.8 + b[0] * sa * 1.05, A[1] * ca * 0.8 + b[1] * sa * 1.05, A[2] * ca * 0.8 + b[2] * sa * 1.05]), [phase, q, 0, 0], [1, w0 + (w1 - w0) * q, phase, Math.max(0, -sa)], root);
      }
      if (later.length < kids && j >= 3 && j <= seg - 2 && j % 2 === 1) {
        const cw = w0 + (w1 - w0) * q;
        later.push([add(add(c, b, -r * 0.5), A, (R() - 0.5) * r * 1.3), d, b, r * (0.6 + R() * 0.2), { lift: -0.35 - R() * 0.5, hook: 2 + R() * 0.6, long: 4.6, seg: Math.max(6, seg - 3), sides: 5, lean: (R() - 0.5) * 0.7, phase, root, w0: cw, w1: Math.min(1, cw + 0.45), kids: depth > 0 ? 2 : 0, depth: depth - 1 }]);
      }
      c = add(c, d, (size * long) / seg);
      phi -= (hook / seg) * (0.55 + 0.9 * q);
    }
    for (let j = 0; j < seg; j++)
      for (let m = 0; m < sides; m++) {
        const a = first + j * sides + m,
          b2 = first + j * sides + ((m + 1) % sides);
        G.ix.push(a, a + sides, b2, b2, a + sides, b2 + sides);
      }
    for (const [p2, t2, n2, s2, o2] of later) talon(p2, t2, n2, A, s2, o2);
  };
  const unit = H * 0.022; // the girth of an ordinary claw
  const place = (s, k, size, t) => {
    const hs = hAt(s);
    if (hs < 0.26) return;
    const f = frame(s, k);
    talon(f.P, f.T, f.N, f.A, size * (0.45 + 0.55 * hs), { phase: R(), seg: big ? 11 : 7, sides: big ? 6 : 5, ...t });
  };
  const span = tipK - crestK;
  // the fringe that hangs from the edge of the lip, over the hollow
  for (let c = 0; c < claws; c++) {
    // on the great wave they stand shoulder to shoulder; a lesser wave breaks in ragged twos and threes
    const small = big < 1;
    const s = small ? (R() + R() - 1) * 0.85 + peak : ((c + 0.5 + (R() - 0.5) * 0.7) / claws) * 1.84 - 0.92;
    const giant = R() < 0.22;
    place(s, tipK - span * (0.03 + R() * 0.08), unit * (small ? 0.4 + R() * R() * 1.2 : giant ? 0.95 + R() * 0.3 : 0.45 + R() * 0.35), {
      lift: 0.8 + R() * 0.45,
      hook: 2.3 + R() * 0.6,
      long: small ? 4 + R() * 2.5 : 6.5 + R() * 2,
      lean: (R() - 0.5) * 0.3,
      kids: big > 0.5 ? (giant ? 3 : 2) : big > 0 ? 1 : 0,
      depth: big > 0.5 && giant ? 1 : 0,
    });
  }
  if (big > 0) {
    // a second rank thrown forward off the top of the lip
    for (let c = 0, n = Math.round(claws * 0.62); c < n; c++) {
      const s = ((c + 0.5 + (R() - 0.5) * 0.8) / n) * 1.7 - 0.85;
      place(s, crestK + span * (0.6 + R() * 0.25), unit * (0.5 + R() * 0.55), { lift: 0.6 + R() * 0.3, hook: 2.4 + R() * 0.5, long: 6 + R() * 1.5, lean: (R() - 0.5) * 0.4, kids: big > 0.5 ? 2 : 1, depth: R() < 0.3 ? 1 : 0 });
    }
    // and plumes standing on the crest itself, which give it its ragged skyline
    for (let c = 0, n = Math.round(claws * 0.45); c < n; c++) {
      const s = ((c + 0.5 + (R() - 0.5) * 0.8) / n) * 1.6 - 0.8;
      place(s, crestK + span * (0.0 + R() * 0.2), unit * (0.5 + R() * 0.7), { lift: 0.7 + R() * 0.3, hook: 2.6 + R() * 0.4, long: 6 + R() * 2, lean: (R() - 0.5) * 0.4, kids: big > 0.5 ? 2 : 0, depth: R() < 0.25 ? 1 : 0 });
    }
  }
  return { crest: at(peak, crestK), lip: at(peak, tipK), at, hAt, crestK, tipK };
}

// The waves used to be built with the world's own dice. They have their own now, but
// everything built after them was laid out with the dice thrown exactly that often,
// so this throws them the same number of times and keeps the rest of the world in place.
function burn(R, claws, hi, peak = 0) {
  const hAt = (s) => Math.pow(Math.max(0, Math.cos((clamp(s - peak, -1, 1) * Math.PI) / 2)), 0.7);
  for (let c = 0; c < claws; c++) {
    const s = (c / Math.max(1, claws - 1)) * 1.8 - 0.9 + (R() - 0.5) * 0.03;
    if (hAt(s) < 0.2) continue;
    for (let f = 0; f < 5; f++)
      if (R() >= 0.12) {
        R();
        R();
        R();
      }
  }
  for (let i = 0; i < claws * (hi ? 2.6 : 0.8); i++) for (let k = 0; k < 7; k++) R();
}

// where the great wave stands
export const WX = -34,
  WZ = -4;

// ---------------- waves
export function addWaves(world, { R, S, strokes }) {
  // The great wave is its own piece. Until the print is finished it is just the
  // biggest swell on a living sea; with the last block it rears up into the picture.
  const GG = new WaveGeo();
  burn(R, 64, true, 0.12);
  const gw = wave(GG, { H: 66, len: 170, rows: 120, cols: 72, claws: 70, peak: 0.12, big: 1, seed: 1831 });
  world.crest = [gw.crest[0] + WX, gw.crest[1], gw.crest[2] + WZ];
  world.greatMesh = new THREE.Mesh(GG.geometry(), waveMaterial({ stroke: strokes.wood, surge: [1.5, 1, 0, 0.55], pulse: 1, curl: 0.16 }));
  world.greatMesh.position.set(WX, 0, WZ);
  world.greatMesh.frustumCulled = false;
  S.add(world.greatMesh);

  const WG = new WaveGeo();
  // a second swell rising in front, shaped like the mountain it hides
  burn(R, 20, true);
  wave(WG, { x: -40, z: 74, ry: 0.22, H: 13, len: 60, rows: 28, cols: 36, claws: 12, big: 0.5, seed: 7 });
  // and a whole sea of them, so there is always another crest to walk towards
  const seaWaves = [[72, -70, -0.3, 11], [108, 16, 0.4, 8], [-96, 96, 0.2, 9], [48, 100, -0.2, 5], [136, -150, 0.1, 12], [-128, -150, -0.2, 15], [150, 84, 0.5, 7], [-170, 20, -0.1, 12], [200, -40, 0.2, 10], [-60, -190, 0.1, 17], [-10, -260, -0.2, 12]];
  for (let i = 0; i < 38; i++) {
    const a = R() * 6.283,
      d = 150 + R() * 430;
    const x = Math.cos(a) * d,
      z = -30 + Math.sin(a) * d;
    if (z > 150 || (Math.abs(x - 50) < 55 && z < -40)) continue;
    seaWaves.push([x, z, (R() - 0.5) * 1.0, 5 + R() * 13]);
  }
  seaWaves.forEach(([x, z, ry, h], i) => {
    burn(R, 10 + Math.round(h * 0.7), false);
    wave(WG, { x, z, ry, H: h, len: 40 + h * 4, rows: 16, cols: 36, claws: 5 + Math.round(h * 0.4), seed: 100 + i });
  });
  const seaMesh = new THREE.Mesh(WG.geometry(), waveMaterial({ stroke: strokes.wood, surge: [2.2, 1, 0, 0.55], pulse: 1 }));
  seaMesh.frustumCulled = false;
  S.add(seaMesh);

  // spindrift torn off the crest once it stands: it rides with the wave, so it is the wave's child
  for (let i = 0; i < 440; i++) R();
  const Q = rng(77);
  const spray = [];
  for (let i = 0; i < 1000; i++) {
    const s = 0.12 + (Q() + Q() + Q() - 1.5) * 0.62;
    if (gw.hAt(s) < 0.3) continue;
    const p = gw.at(s, gw.crestK + (gw.tipK - gw.crestK) * (0.2 + Q() * 0.8));
    spray.push({ p, v: [3 + Q() * 9, 1 + Q() * 8.5, (Q() - 0.5) * 5], size: 0.5 + Q() * Q() * 1.3, life: 6 + Q() * 4 });
  }
  world.spray = sprayPoints(spray, { boost: 0, gravity: 2.2, seedOf: Q });
  world.greatMesh.add(world.spray);

  // you can stand on the shoulder of the great wave, and not swim through it
  world.wavePlat = { minx: WX - 8, maxx: WX + 34, minz: WZ - 34, maxz: WZ + 50, y: 62 };
  world.platforms = [world.wavePlat];
  world.waveCols = [];
  for (let s = -0.7; s <= 0.9; s += 0.14) {
    const hs = Math.pow(Math.max(0, Math.cos(((s - 0.12) * Math.PI) / 2)), 0.7);
    const col = { x: WX - 4 - (s - 0.12) ** 2 * 23, z: WZ + s * 85, r: 17 * hs, top: 66 * hs - 6, full: 66 * hs - 6 };
    world.waveCols.push(col);
    world.colliders.push(col);
  }
}
