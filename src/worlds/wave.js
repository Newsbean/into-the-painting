import * as THREE from 'three';
import { World, ghostMaterial } from '../engine/world.js';
import { Sky } from '../engine/sky.js';
import { paintMaterial, waterMaterial, glowPoints, GroundMaps } from '../engine/paint.js';
import { Builder, terrain, ribbon, patch, gridGeo, mountainRing, pine, blobTree, house, figure, mix, jitter, xf } from '../engine/build.js';
import { rng, fbm, vnoise, smooth, clamp, lerp } from '../engine/gl.js';

// A woodblock print: flat fields of colour, a dark blue key line, paper
// showing through. The sky is one long gradation wiped on with a rag.
const SKY = /* glsl */ `
vec3 skyColor(vec3 dIn){
  vec3 d = normalize(vec3(dIn.x, abs(dIn.y) + 0.002, dIn.z));
  float el = asin(d.y);
  float az = atan(d.x, -d.z);
  float grain = texture(uNoise3, vec3(az * 0.9, el * 14.0, 0.3)).r;
  vec3 paperC = vec3(0.94, 0.88, 0.74);
  vec3 dusk = vec3(0.36, 0.40, 0.46);
  // bokashi: dark at the horizon, fading up into bare paper
  float g = exp(-el * 5.2) * (0.86 + 0.2 * grain);
  vec3 col = mix(paperC, dusk, clamp(g, 0.0, 1.0));
  // one great pale cloud standing over the mountain
  float cl = texture(uNoise3, vec3(az * 0.055 + uTime * 0.0006, el * 0.16, 0.7)).g * 0.75 + texture(uNoise3, vec3(az * 0.21, el * 0.5, 0.2)).b * 0.25;
  float cloud = smoothstep(0.5, 0.53, cl + (0.3 - abs(el - 0.42)) * 0.55) * smoothstep(0.1, 0.2, el);
  col = mix(col, vec3(0.97, 0.93, 0.82), cloud * 0.85);
  col = mix(col, vec3(0.99, 0.84, 0.72), smoothstep(0.5, 1.2, el) * 0.35);
  col *= 0.97 + 0.06 * grain;
  // unprinted paper with the faintest pencil plan
  vec3 sk = uPaper * (0.98 - 0.05 * grain - cloud * 0.04);
  float m = paintedIn(d, grain);
  col = mix(sk, col, m);
  return col;
}
`;

const PRUSSIAN = 0x173a6e;
const MIDBLUE = 0x3f77a8;
const PALE = 0xa9c4cc;
const FOAM = 0xf3ecd8;

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
const PROF_HI = profCurve.getPoints(72);
const PROF_LO = profCurve.getPoints(36);

// one breaking wave; returns where its crest and lip end up
function buildWave(B, R, { x, z, ry = 0, H = 40, len = 100, claws = 44, rows = 44, hi = true, peak = 0 }) {
  const PROF = hi ? PROF_HI : PROF_LO;
  const cols = PROF.length - 1;
  const crestK = Math.round(cols * (5 / 18)),
    tipK = Math.round(cols * (9 / 18));
  const cs = Math.cos(ry),
    sn = Math.sin(ry);
  const hAt = (s) => Math.pow(Math.max(0, Math.cos((clamp(s - peak, -1, 1) * Math.PI) / 2)), 0.7);
  const at = (s, k) => {
    const hs = hAt(s);
    const p = PROF[k];
    const curl = smooth(0.08, 0.55, hs); // the lip only forms where the wave stands tall
    const pu = p.x > 0.42 ? 0.42 + (p.x - 0.42) * curl : p.x;
    const u = pu * H * (0.5 + 0.5 * hs) - (s - peak) * (s - peak) * H * 0.35;
    const v = p.y * H * hs;
    const lz = (s * len) / 2;
    return [x + u * cs + lz * sn, v - 0.7, z - u * sn + lz * cs];
  };
  B.parts.push(
    gridGeo(
      rows,
      cols,
      (a, b, i, j) => at((i / rows) * 2 - 1, j),
      (a, b, i, j) => {
        const t = j / cols;
        const band = Math.floor(i / (hi ? 2 : 1));
        // foam on the crest and lip, with tongues of it licking down the back
        const drip = 0.268 - 0.035 * Math.abs(Math.sin(i * 1.3)) - 0.02 * Math.abs(Math.sin(i * 0.37 + 1));
        const tall = hAt((i / rows) * 2 - 1);
        const edge = (tall > 0.6 ? 0.43 : 0.49) - 0.06 * tall * Math.abs(Math.sin(i * 1.3)) - 0.03 * tall * Math.abs(Math.sin(i * 0.37 + 1));
        if (t > edge && t < 0.52) return new THREE.Color(i % 3 ? FOAM : 0xdde5d8);
        if (t > drip && t <= edge) return new THREE.Color(band % 3 === 0 ? PALE : band % 2 ? MIDBLUE : 0x2c5a8c);
        // the hollow face: long stripes sweeping up towards the crest
        if (t >= 0.52) {
          if (t > 0.93) return new THREE.Color(band % 2 ? MIDBLUE : PALE);
          return new THREE.Color(band % 4 === 0 ? PALE : band % 2 ? PRUSSIAN : MIDBLUE);
        }
        return new THREE.Color(band % 4 === 0 ? PALE : band % 2 ? 0x2c5a8c : PRUSSIAN);
      }
    )
  );
  // the claws: hooked fingers of foam, each with smaller fingers of its own
  const detail = hi ? 1 : 0;
  const finger = (px, py, pz, r0, th, n, side, depth, det) => {
    for (let q = 0; q < n; q++) {
      const u = q / (n - 1);
      const r = r0 * (1 - u * 0.92) + r0 * 0.03;
      B.ball(r, q % 4 === 3 ? 0xdde5d8 : FOAM, px, py, pz, 1, 1, 1, det);
      const st = Math.max(r, r0 * 0.3) * 0.66;
      px += cs * Math.cos(th) * st + sn * side * st;
      pz += -sn * Math.cos(th) * st + cs * side * st;
      py -= Math.sin(th) * st;
      th += 0.19;
      if (depth > 0 && (q === 2 || q === 4)) finger(px, py, pz, r0 * 0.52, th + (q === 2 ? -0.8 : 0.55), Math.max(4, n - 4), side + (q === 2 ? 0.7 : -0.7), depth - 1, 0);
    }
  };
  for (let c = 0; c < claws; c++) {
    const s = (c / Math.max(1, claws - 1)) * 1.8 - 0.9 + (R() - 0.5) * 0.03;
    const hs = hAt(s);
    if (hs < 0.2) continue;
    for (const f of [0.05, 0.3, 0.55, 0.8, 1.0]) {
      if (R() < 0.12) continue;
      const k = Math.round(lerp(crestK, tipK, f));
      const p0 = at(s, k);
      const r0 = H * (0.014 + R() * 0.013) * (0.5 + 0.9 * f) * (0.45 + 0.55 * hs);
      finger(p0[0], p0[1], p0[2], r0, -0.35 + f * 1.3 + (R() - 0.5) * 0.3, hi ? 11 : 6, (R() - 0.5) * 0.5, hi && f > 0.25 ? 1 : 0, hi && f > 0.5 ? 1 : 0);
    }
  }
  // spray: the snow of dots that hangs in the air ahead of the wave
  for (let i = 0; i < claws * (hi ? 2.6 : 0.8); i++) {
    const s = peak + R() * 1.5 - 0.75;
    const p0 = at(s, tipK);
    const d = H * (0.15 + R() * 1.0);
    B.ball(H * (0.005 + R() * 0.008), FOAM, p0[0] + cs * d + (R() - 0.5) * 8, p0[1] - R() * H * 0.6 + R() * 6, p0[2] - sn * d + (R() - 0.5) * 8, 1, 1, 1, detail);
  }
  return { crest: at(peak, crestK), lip: at(peak, tipK) };
}

function buildBoat(strokes, R) {
  const B = new Builder();
  const wood = 0xe9d6a2,
    dark = 0x9a7a4a;
  const L = 15;
  B.box(L * 0.74, 0.9, 2.1, wood, 0, 0.1, 0);
  B.box(L * 0.74, 0.16, 2.3, dark, 0, 0.95, 0);
  // long raked bow and stern
  for (const sgn of [-1, 1])
    B.add(new THREE.CylinderGeometry(0.03, 1.2, L * 0.34, 4, 1), wood, xf(sgn * L * 0.52, 0.95, 0, 0, 0.62, 1, 1, 0, -sgn * (Math.PI / 2 - 0.3)));
  // rowers bent low over the oars
  for (let i = 0; i < 4; i++)
    for (const side of [-1, 1]) {
      const x = -3.4 + i * 2.2,
        z = side * 0.55;
      B.ball(0.42, 0x2f548a, x, 1.25, z, 1.25, 0.8, 0.9, 1);
      B.ball(0.25, 0xe8c9a0, x - 0.55, 1.42, z, 1, 1, 1, 1);
      B.cyl(0.05, 0.05, 3.2, dark, x - 0.2, 1.15, z + side * 0.3, 5, undefined, undefined, side * 1.25, 0.2);
    }
  for (const x of [4.6, 5.3]) {
    B.ball(0.4, 0x3a628f, x, 1.2, 0, 1.1, 0.85, 1, 1);
    B.ball(0.24, 0xe8c9a0, x - 0.4, 1.45, 0, 1, 1, 1, 1);
  }
  const m = B.mesh(paintMaterial({ stroke: strokes.wood, scale: 0.6, contrast: 0.12, hueVar: 0.08, flat: 0.75, objSpace: 1, rim: 0, band: 0.1, big: 0 }));
  return m;
}

// ====================================================================
// The land behind the wave is built from Hokusai's other prints: the
// rest of the Thirty-Six Views, the waterfalls, the bridges. What
// follows are the small pieces those scenes are assembled from.
// ====================================================================
const VERM = 0xc8432c,
  INK = 0x1d1d22,
  TIMBER = 0x3a2a1e;
const WOOD = 0xb89668,
  WOOD_D = 0x6a4a2a,
  WOOD_L = 0xe0c890;
const THATCH = 0xc6ac6c,
  THATCH_D = 0x8a7446;
const STONE = 0x9a9a92,
  STONE_D = 0x74807c;
const SKIN = 0xe8c9a0,
  HAIR = 0x2a1c14,
  INDIGO = 0x2f548a;
const CLOTH = [0x2f548a, 0x3a628f, 0x5a6a4a, 0x7f9aa8, 0x8a6a48, 0x4a5560, 0xa9c4cc, 0x9a4a3a, 0xcdbb98];

// the coast road, two streams and the footpaths that tie the scenes together
const ROAD_W = [[-229, 226], [-200, 223], [-170, 221], [-140, 220.5], [-129, 220], [-100, 219], [-70, 217], [-46, 215.5], [-27, 213]];
const ROAD_M = [[22, 214.5], [30, 219.5], [37, 221]];
const ROAD_E = [[53, 221], [64, 221.5], [96, 219.5], [112, 219.5], [150, 220], [162, 221.5], [196, 223], [229, 227]];
const STREAM1 = [[10, 305.5], [12, 297], [20, 283], [31, 269], [37, 257], [38, 246], [38, 236], [41, 228], [45, 221], [47.5, 213], [49.5, 205], [50.5, 199.5]];
const STREAM2 = [[-126, 296], [-127, 281], [-130, 265], [-133.5, 250], [-134, 238], [-134, 229.5], [-131.5, 220], [-128, 209], [-126, 200]];
const PATH_FALL = [[-22, 216], [-24, 228], [-14, 240], [-8, 247], [-5, 262], [-6, 280], [-7, 298], [-6, 310], [-3.5, 317.5]];
const PATH_SHRINE = [[62, 223], [62, 240], [63, 254], [64.5, 265]];
const STAIR = [[64.5, 265.5], [71, 308]];
const PATH_HALL = [[134, 221.5], [134, 238], [135, 252], [137, 268], [138, 282], [139, 291]];
const PATH_PASS = [[-126.3, 221.5], [-126.3, 237], [-126, 251], [-124, 266], [-121.5, 281], [-128, 289.5], [-141, 296], [-153, 300.5], [-166, 303]];
const ZIGZAG = [[160, 221], [186, 216.6], [168, 212.6], [194, 209.2], [176, 206], [199, 203.6]];

// ground the scenes stand on; the scattered trees keep off it
const KEEP_LINES = [[ROAD_W, 4], [ROAD_M, 4], [ROAD_E, 4], [STREAM1, 4], [STREAM2, 4], [PATH_FALL, 2.6], [PATH_SHRINE, 2.6], [STAIR, 3.6], [PATH_HALL, 2.6], [PATH_PASS, 2.6], [ZIGZAG, 3]];
const KEEP_DISCS = [
  [-2, 211, 9], [-16, 211, 9], [12, 211, 9], // the forecourt
  [-50, 221, 9], [-66, 203.5, 12], [-97, 206, 11], [-172, 195, 9], [-206, 213, 8], // tea house, cranes, nets, the fishing rock
  [-134, 228, 10], [-150, 292.5, 10], // drum bridge garden, the great cedar
  [10, 312, 15], [10, 331, 16], [33, 248, 8], [34, 262, 6], // waterfall, water wheel and its flume
  [45, 221, 10], [55, 213.5, 5], [70, 211, 7], [80, 211.5, 7], [90, 211, 7], // bridge, storehouse, timber yard
  [72, 314, 7], [149, 287, 15], [130.6, 277.5, 5], [214, 210, 7], // shrine, the viewing hall, tea store, the hut on the point
];
const KEEP_RECTS = [
  [-224, -158, 227, 263], [180, 228, 228, 260], // rice terraces west and east
  [-41, -10, 266, 300], [0, 16, 230, 244], [84, 128, 271, 301], // bamboo, kitchen plots, tea rows
  [158, 208, 198, 220], [100, 152, 215, 218.5], // the reed marsh, the pine avenue
  [-89, -66, 244, 266], [94, 113, 239, 259], [143, 163, 249, 271], // terraced plots between the houses
];
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
function nearRoute(x, z, pad = 0) {
  for (const [pts, r] of KEEP_LINES) for (let i = 0; i < pts.length - 1; i++) if (segDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < r + pad) return true;
  return false;
}
function keptClear(x, z, pad = 0) {
  for (const [cx, cz, r] of KEEP_DISCS) if (Math.hypot(x - cx, z - cz) < r + pad) return true;
  for (const [x0, x1, z0, z1] of KEEP_RECTS) if (x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) return true;
  return nearRoute(x, z, pad);
}

const _up = new THREE.Vector3(0, 1, 0);
// a tapered open tube from point a (radius r0) to point b (radius r1)
function rod(B, a, b, r0, r1, col, seg = 4, data, M) {
  const va = new THREE.Vector3(a[0], a[1], a[2]),
    vb = new THREE.Vector3(b[0], b[1], b[2]);
  const d = vb.clone().sub(va);
  const L = d.length() || 0.001;
  const q = new THREE.Quaternion().setFromUnitVectors(_up, d.normalize());
  const m = new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  B.add(new THREE.CylinderGeometry(r1, r0, L, seg, 1, true), col, M ? M.clone().multiply(m) : m, data);
}
// a squared timber from a to b: w across, h upright
function beam(B, a, b, w, h, col, data, M) {
  const va = new THREE.Vector3(a[0], a[1], a[2]),
    vb = new THREE.Vector3(b[0], b[1], b[2]);
  const zz = vb.clone().sub(va);
  const L = zz.length() || 0.001;
  zz.normalize();
  const xx = new THREE.Vector3(0, 1, 0).cross(zz);
  if (xx.lengthSq() < 1e-6) xx.set(1, 0, 0);
  xx.normalize();
  const yy = zz.clone().cross(xx);
  const m = new THREE.Matrix4().makeBasis(xx, yy, zz).setPosition(va.add(vb).multiplyScalar(0.5));
  B.add(new THREE.BoxGeometry(w, h, L), col, M ? M.clone().multiply(m) : m, data);
}

// A small poseable figure in plain Edo dress. Faces +z before ry, like figure().
// arms are [raise forward, spread sideways, bend at the elbow] from hanging.
function person(B, x, y, z, ry, o = {}) {
  const s = o.s ?? 0.92;
  const coat = o.coat ?? INDIGO,
    legs = o.legs ?? 0x3a4a5a,
    skin = o.skin ?? SKIN,
    hair = o.hair ?? HAIR;
  const M = xf(x, y, z, ry, s, s, s);
  const low = o.robe ? coat : legs;
  let hip = 0.84;
  if (o.pose === 'kneel') {
    hip = 0.3;
    B.box(0.5, 0.3, 0.62, low, 0, 0, -0.06, 0, undefined, M);
  } else if (o.pose === 'sit') {
    hip = o.seat ?? 0.45;
    for (const sx of [-0.11, 0.11]) {
      rod(B, [sx, hip, 0], [sx, hip, 0.42], 0.1, 0.085, low, 4, undefined, M);
      rod(B, [sx, hip, 0.42], [sx, 0, 0.46], 0.08, 0.07, low, 4, undefined, M);
    }
  } else if (o.robe) rod(B, [0, 0, 0], [0, hip + 0.04, 0], 0.34, 0.2, coat, 6, undefined, M);
  else {
    const st = o.stride ?? 0;
    rod(B, [-0.11, 0, st], [-0.1, hip + 0.04, 0], 0.08, 0.11, legs, 4, undefined, M);
    rod(B, [0.11, 0, -st], [0.1, hip + 0.04, 0], 0.08, 0.11, legs, 4, undefined, M);
  }
  // everything above the hips leans and turns together
  const U = M.clone().multiply(xf(0, hip, 0, o.twist ?? 0, 1, 1, 1, o.lean ?? 0, 0));
  rod(B, [0, -0.08, 0], [0, 0.58, 0], 0.25, 0.19, coat, 6, undefined, U);
  B.ball(0.2, coat, 0, 0.57, 0, 1.15, 0.5, 0.8, 0, undefined, U);
  if (o.sash) rod(B, [0, 0.06, 0], [0, 0.18, 0], 0.247, 0.237, o.sash, 6, undefined, U);
  const arm = (side, a = [0.1, 0.12]) => {
    const A = U.clone().multiply(xf(side * 0.25, 0.55, 0, 0, 1, 1, 1, -a[0], side * a[1]));
    rod(B, [0, 0, 0], [0, -0.34, 0], 0.075, 0.06, coat, 4, undefined, A);
    const F = A.multiply(xf(0, -0.34, 0, 0, 1, 1, 1, -(a[2] ?? 0), 0));
    rod(B, [0, 0, 0], [0, -0.28, 0], 0.05, 0.04, skin, 4, undefined, F);
    return new THREE.Vector3(0, -0.28, 0).applyMatrix4(F);
  };
  const handL = arm(-1, o.armL),
    handR = arm(1, o.armR);
  const hy = 0.84;
  const hat = o.hat ?? 'none';
  B.ball(0.18, skin, 0, hy, 0.01, 1, 1.08, 1, hat === 'none' ? 1 : 0, undefined, U);
  if (hat === 'cone') B.add(new THREE.ConeGeometry(0.42, 0.22, 8, 1, true), o.hatCol ?? 0xd9c28a, U.clone().multiply(xf(0, hy + 0.2, 0, 0, 1, 1, 1, o.hatTilt ?? 0, 0)));
  else if (hat === 'flat') B.add(new THREE.ConeGeometry(0.5, 0.13, 8, 1, true), o.hatCol ?? 0xcdb880, U.clone().multiply(xf(0, hy + 0.19, 0)));
  else if (hat === 'cloth') B.ball(0.19, o.hatCol ?? 0xe9dfc6, 0, hy + 0.05, -0.02, 1.05, 0.85, 1.05, 0, undefined, U);
  else if (hat === 'basket') {
    // the deep reed hood of a wandering flute-monk
    rod(B, [0, hy - 0.24, 0], [0, hy + 0.22, 0], 0.27, 0.21, 0xcdb880, 7, undefined, U);
    B.ball(0.21, 0xcdb880, 0, hy + 0.22, 0, 1, 0.35, 1, 0, undefined, U);
  } else {
    B.ball(0.185, hair, 0, hy + 0.05, -0.035, 1.03, 0.85, 1.03, 0, undefined, U);
    if (o.robe) B.ball(0.1, hair, 0, hy + 0.2, -0.08, 1, 0.8, 1, 0, undefined, U);
    else B.box(0.06, 0.06, 0.17, hair, 0, hy + 0.17, -0.03, 0, undefined, U);
  }
  if (o.hatBack) B.add(new THREE.ConeGeometry(0.4, 0.2, 8, 1, true), 0xd9c28a, U.clone().multiply(xf(0, 0.42, -0.27, 0, 1, 1, 1, -1.35, 0)));
  const c = o.carry;
  if (c === 'pack') B.box(0.44, 0.42, 0.26, o.load ?? 0x5a6a4a, 0, 0.14, -0.33, 0, undefined, U);
  else if (c === 'basket') rod(B, [0, 0.06, -0.35], [0, 0.56, -0.37], 0.15, 0.23, o.load ?? 0xc9a86a, 6, undefined, U);
  else if (c === 'sack') B.ball(0.27, o.load ?? 0xe6dcc0, 0.15, 0.82, -0.02, 0.85, 0.72, 1.55, 1, undefined, U);
  else if (c === 'bundle') B.ball(0.25, o.load ?? 0x5f8a7a, 0, 0.36, -0.31, 1.2, 0.9, 0.8, 0, undefined, U);
  else if (c === 'pole') {
    // a shoulder pole with a load at either end
    rod(B, [0.2, 0.68, -0.85], [0.2, 0.68, 0.85], 0.022, 0.022, WOOD_D, 3, undefined, U);
    for (const e of [-0.8, 0.8]) {
      rod(B, [0.2, 0.68, e], [0.2, 0.22, e], 0.01, 0.01, TIMBER, 3, undefined, U);
      B.box(0.34, 0.28, 0.34, o.load ?? 0xc9a86a, 0.2, -0.06, e, 0, undefined, U);
    }
  }
  if (o.staff) rod(B, [0.36, 0, 0.2], [0.36, 1.55, 0.2], 0.022, 0.018, WOOD_D, 3, undefined, M);
  return { M, U, handL, handR };
}

function horse(B, x, y, z, ry, o = {}) {
  const s = o.s ?? 1,
    col = o.col ?? 0x8a6a48;
  const M = xf(x, y, z, ry, s, s, s);
  B.ball(0.5, col, 0, 1.22, 0, 0.78, 0.76, 1.7, 1, undefined, M);
  rod(B, [0, 1.3, 0.62], [0, 1.92, 1.08], 0.27, 0.15, col, 5, undefined, M);
  rod(B, [0, 2.0, 1.02], [0, 1.58, 1.42], 0.16, 0.09, col, 5, undefined, M);
  B.ball(0.1, col, 0, 1.56, 1.44, 1, 1, 1, 0, undefined, M);
  rod(B, [0, 1.5, 0.5], [0, 2.1, 0.98], 0.06, 0.05, TIMBER, 3, undefined, M);
  for (const [lx, lz, k] of [[-0.2, 0.62, 0.1], [0.2, 0.6, -0.08], [-0.2, -0.62, -0.1], [0.2, -0.6, 0.08]]) rod(B, [lx, 0, lz + k], [lx, 1.05, lz], 0.055, 0.1, col, 4, undefined, M);
  rod(B, [0, 1.4, -0.8], [0, 0.6, -0.98], 0.07, 0.02, TIMBER, 4, undefined, M);
  if (o.load) {
    B.box(0.92, 0.08, 0.9, o.cloth ?? INDIGO, 0, 1.6, -0.05, 0, undefined, M);
    for (const sx of [-1, 1]) B.box(0.38, 0.5, 0.8, o.load, sx * 0.54, 1.12, -0.05, 0, undefined, M);
    B.box(0.5, 0.3, 0.6, o.load, 0, 1.68, -0.05, 0, undefined, M);
  }
}

// a red-crowned crane: 0 standing, 1 feeding, 2 calling
function crane(B, x, y, z, ry, pose = 0, s = 1) {
  const M = xf(x, y, z, ry, s, s, s);
  const W = 0xf6f1e2;
  rod(B, [-0.06, 0, 0.02], [-0.05, 0.9, 0], 0.016, 0.024, INK, 3, undefined, M);
  rod(B, [0.06, 0, -0.03], [0.05, 0.9, 0], 0.016, 0.024, INK, 3, undefined, M);
  B.ball(0.3, W, 0, 1.08, 0, 0.72, 0.7, 1.25, 1, undefined, M);
  B.ball(0.22, INK, 0, 1.02, -0.36, 0.6, 0.62, 1.1, 0, undefined, M);
  const n = pose === 1 ? [[0, 1.15, 0.3], [0, 0.72, 0.72], [0, 0.32, 0.86], [0, 0.06, 0.98], [0, 0.05, 0.07]] : pose === 2 ? [[0, 1.2, 0.26], [0, 1.72, 0.36], [0, 2.05, 0.3], [0, 2.38, 0.36], [0, 0.02, -0.07]] : [[0, 1.2, 0.28], [0, 1.7, 0.42], [0, 1.94, 0.44], [0, 1.9, 0.78], [0, 0.07, -0.01]];
  rod(B, n[0], n[1], 0.085, 0.05, W, 4, undefined, M);
  rod(B, n[1], n[2], 0.05, 0.045, INK, 4, undefined, M);
  B.ball(0.078, W, n[2][0], n[2][1], n[2][2], 1, 1, 1.15, 0, undefined, M);
  B.ball(0.05, VERM, n[2][0] + n[4][0], n[2][1] + n[4][1], n[2][2] + n[4][2], 1, 1, 1, 0, undefined, M);
  rod(B, n[2], n[3], 0.03, 0.006, 0x8a8a5a, 3, undefined, M);
}

// a cryptomeria: the dark pointed tree of the hill forests
function sugi(B, x, y, z, h, R, o = {}) {
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
function matsu(B, x, y, z, h, R, o = {}) {
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
    B.add(new THREE.IcosahedronGeometry(pr, 1), (qx, qy) => mix(lo, hi, clamp((qy / pr) * 0.5 + 0.5)), xf(px, py, pz, R() * 6, 1, 0.3, 1), { sway: 0.12 });
  }
}

// a round-headed tree for gardens and field edges
function leafy(B, x, y, z, h, R, o = {}) {
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

function bamboo(B, x, y, z, h, R) {
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
function tuft(B, x, y, z, h, R, col, sway = 1.2, n = 2) {
  for (let k = 0; k < n; k++) {
    const hh = h * (0.7 + R() * 0.3);
    B.add(new THREE.ConeGeometry(0.1 + h * 0.05 + R() * 0.06, hh, 3, 1, true), col, xf(x + (R() - 0.5) * 0.5, y + hh / 2 - 0.1, z + (R() - 0.5) * 0.5, R() * 6, 1, 1, 1, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3), { sway: (px, py) => (py / hh + 0.5) * sway });
  }
}

function toriiGate(B, x, y, z, ry, s = 1) {
  const M = xf(x, y, z, ry, s, s, s);
  for (const sx of [-1, 1]) {
    rod(B, [sx * 1.15, -0.5, 0], [sx * 1.05, 2.9, 0], 0.13, 0.11, VERM, 5, undefined, M);
    B.box(0.36, 0.34, 0.36, INK, sx * 1.15, -0.12, 0, 0, undefined, M);
  }
  B.box(2.5, 0.16, 0.14, VERM, 0, 2.2, 0, 0, undefined, M);
  B.box(3.1, 0.2, 0.2, VERM, 0, 2.85, 0, 0, undefined, M);
  B.box(3.4, 0.12, 0.3, INK, 0, 3.05, 0, 0, undefined, M);
}

const _pe = new THREE.Euler(),
  _pq = new THREE.Quaternion(),
  _pm = new THREE.Matrix4(),
  _pv = new THREE.Vector3(),
  _ps = new THREE.Vector3();

export class WaveWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'wave';
    this.index = 1;
    this.kicker = 'II · Edo, Japan, about 1831';
    this.title = 'The Great Wave';
    this.sub = 'Katsushika Hokusai';
    this.aspect = 37.9 / 25.7;
    this.extent = 280;
    this.boundary = 290;
    this.center = { x: 0, z: 60 };
    this.ceiling = 105;
    this.waterY = 0;
    this.env = {
      sunDir: new THREE.Vector3(0.45, 0.7, 0.5),
      sunColor: 0x4a4a48,
      skyColor: 0xc9c6bc,
      groundColor: 0x9a968c,
      fogColor: 0x7a858c,
      fog: [0.001, 0, 0.0, 0.5],
      paper: 0xf0e7d0,
      ink: 0x35405a,
      rim: 0x6fb0e0,
      lamp: 0.9,
      sway: 0.15,
    };
    this.style = { kuwahara: 0.6, outline: 0.92, sketchLine: 0.1, ink: 0x14244a, bloom: 0.25, threshold: 1.1, grain: 0.03, paper: 0.13, saturation: 1.02, contrast: 1.04, vignette: 0.32, tint: [1.0, 0.985, 0.95] };
    this.spawn = { pos: [10, 196], yaw: Math.PI };
    this.view = { pos: [16, 2.3, 104], target: [9, 25, 4], fov: 52 };
    this.music = 'wave';
    this.build();
  }

  heightAt(x, z) {
    const edge = z + (fbm(x * 0.018, 3.3, 2) - 0.5) * 34;
    const shore = smooth(170, 200, edge);
    return -7 + shore * 8.4 + smooth(205, 330, edge) * 34 * (0.4 + fbm(x * 0.008 + 5, z * 0.008, 3));
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1831);
    const S = this.scene;
    const H = (x, z) => this.heightAt(x, z);
    const maps = (this.maps = new GroundMaps(this.extent, H));

    this.sky = new Sky({ body: SKY, noise3 });
    S.add(this.sky.mesh);

    const flat = (o = {}) => paintMaterial({ stroke: strokes.wood, scale: 0.05, contrast: 0.14, hueVar: 0.1, warp: 0.05, flat: 0.72, rim: 0, band: 0.08, impasto: 0, big: 0, ...o });

    // ---------------- the sea
    const seaGeo = new THREE.PlaneGeometry(3200, 3200, 220, 220);
    seaGeo.rotateX(-Math.PI / 2);
    this.seaMat = waterMaterial({ stroke: strokes.wood, deep: 0x7f9aa8, shallow: 0xb9cfd0, reflect: 0xb9cfd0, foam: FOAM, scale: 0.03, stripe: 0.88, glintAmt: 0, swell: 0.75, flow: 0.004 });
    const sea = new THREE.Mesh(seaGeo, this.seaMat);
    sea.position.y = 0;
    sea.frustumCulled = false;
    S.add(sea);
    this.seaDeep = new THREE.Color(PRUSSIAN);
    this.seaPale = new THREE.Color(0x7f9aa8);

    // ---------------- waves
    const WB = new Builder();
    const WX = -34,
      WZ = -4;
    // The great wave is its own piece. Until the print is finished it is just the
    // biggest swell on a living sea; with the last block it rears up into the picture.
    const GB = new Builder();
    const gl = buildWave(GB, R, { x: 0, z: 0, ry: 0, H: 66, len: 170, claws: 64, peak: 0.12 });
    const great = { crest: [gl.crest[0] + WX, gl.crest[1], gl.crest[2] + WZ], lip: [gl.lip[0] + WX, gl.lip[1], gl.lip[2] + WZ] };
    this.crest = great.crest;
    this.greatMesh = GB.mesh(flat({ scale: 0.04, contrast: 0.1, side: THREE.DoubleSide, surge: [1.5, 1, 0, 0.55], pulse: 1 }));
    this.greatMesh.position.set(WX, 0, WZ);
    S.add(this.greatMesh);
    // a second swell rising in front, shaped like the mountain it hides
    buildWave(WB, R, { x: -40, z: 74, ry: 0.22, H: 13, len: 60, claws: 20, rows: 20 });
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
    for (const [x, z, ry, h] of seaWaves) buildWave(WB, R, { x, z, ry, H: h, len: 40 + h * 4, claws: 10 + Math.round(h * 0.7), rows: 14, hi: false });
    S.add(WB.mesh(flat({ scale: 0.04, contrast: 0.1, side: THREE.DoubleSide, surge: [2.2, 1, 0, 0.55], pulse: 1 })));
    // spindrift torn off the crest once it stands
    const spray = [];
    for (let i = 0; i < 110; i++) spray.push({ p: [great.lip[0] + (R() - 0.3) * 46, great.lip[1] - 16 + R() * 44, great.lip[2] + (R() - 0.5) * 120], c: 0xf6f2e4, size: 0.5 + R() * 0.7, drift: 4.5 });
    this.spray = glowPoints(spray, 0);
    S.add(this.spray);
    // you can stand on the shoulder of the great wave, and not swim through it
    this.wavePlat = { minx: WX - 8, maxx: WX + 34, minz: WZ - 34, maxz: WZ + 50, y: 62 };
    this.platforms = [this.wavePlat];
    this.waveCols = [];
    for (let s = -0.7; s <= 0.9; s += 0.14) {
      const hs = Math.pow(Math.max(0, Math.cos(((s - 0.12) * Math.PI) / 2)), 0.7);
      const col = { x: WX - 4 - (s - 0.12) ** 2 * 23, z: WZ + s * 85, r: 17 * hs, top: 66 * hs - 6, full: 66 * hs - 6 };
      this.waveCols.push(col);
      this.colliders.push(col);
    }

    // ---------------- Fuji, small and patient
    {
      const FX = 178,
        FZ = -1120;
      const g = gridGeo(
        26,
        48,
        (a, b) => {
          const ang = b * Math.PI * 2;
          const r = 330 * Math.pow(1 - a, 1.5) + 16;
          const y = 132 * Math.pow(a, 0.85) - 4;
          return [FX + Math.cos(ang) * r, y, FZ + Math.sin(ang) * r];
        },
        (a, b, i, j) => {
          const snow = a > 0.62 + Math.sin(j * 1.9) * 0.07 + Math.sin(j * 0.7) * 0.05;
          return new THREE.Color(snow ? 0xf6f1e2 : a > 0.3 ? 0x2c4a7a : 0x3f6a8c);
        }
      );
      const m = new THREE.Mesh(g, flat({ scale: 0.004, side: THREE.DoubleSide }));
      // the mountain is printed, not seen through air: no haze on it
      m.material.uniforms.uFog = { value: new THREE.Vector4(0, 0, 0, 0) };
      m.frustumCulled = false;
      S.add(m);
    }

    // ---------------- shore
    const sand = 0xe2d2a4,
      grass = 0x7f9a6a,
      hill = 0x4f7a6a;
    const land = terrain(
      H,
      230,
      150,
      (x, z, y) => {
        const c = mix(sand, grass, smooth(1.6, 4.5, y + vnoise(x * 0.1, z * 0.1) * 1.5));
        return c.lerp(new THREE.Color(hill), smooth(7, 22, y));
      },
      0.5,
      2,
      0,
      300
    );
    S.add(new THREE.Mesh(land, flat({ scale: 0.03 })));

    const B = new Builder();
    const proxy = { heightAt: H, colliders: this.colliders, maps, glows: this.glows };
    // Hokusai's workshop and a few neighbours
    const edo = (x, z, ry, w, d, h, o = {}) =>
      house(B, proxy, { R, x, z, ry, w, d, h, roofType: 'hip', roofH: 2.6, over: 1.1, ridge: 0.5, wall: 0xe9dfc6, roof: 0x3d4c5c, trim: 0x3a2a1e, doorCol: 0x243a6a, lit: 0.9, winW: 1.3, winH: 1.5, chimney: false, mullion: true, ...o });
    edo(-6, 222, Math.PI, 15, 8.5, 4.2);
    edo(24, 232, Math.PI + 0.3, 8, 6.5, 3.8, { roof: 0x4a5560 });
    edo(-38, 236, Math.PI - 0.25, 9, 6.5, 3.8, { roof: 0x35455a });
    edo(50, 246, Math.PI + 0.5, 7, 6, 3.6, { roof: 0x4a4a55, lit: 0.6 });
    // timber frame and porch on the workshop
    {
      const y = H(-6, 222);
      for (let i = -3; i <= 3; i++) B.box(0.22, 4.2, 0.22, 0x3a2a1e, -6 + i * 2.5, y - 0.3, 217.6);
      B.box(16, 0.3, 2.6, 0x8a6a48, -6, y + 0.2, 216.4);
      for (let i = -3; i <= 3; i++) B.box(0.18, 2.9, 0.18, 0x3a2a1e, -6 + i * 2.5, y + 0.2, 215.3);
      B.box(16.6, 0.2, 3.2, 0x3d4c5c, -6, y + 3.1, 216.2);
      // noren over the door
      for (let i = -1; i <= 1; i++) B.box(0.62, 0.9, 0.05, 0x1f3f7a, -6 + i * 0.68, y + 1.9, 217.5, 0, { sway: 0.06 });
      this.platforms.push({ minx: -14, maxx: 2, minz: 215.1, maxz: 217.7, y: y + 0.5 });
    }
    // the day's prints hung out to dry
    const PRINTS = [0x2f5f9a, 0xe9dfc6, 0xd9644a, 0x7fa0a8, 0xe8c66a, 0x2f5f9a, 0xf3ecd8, 0x9ab08a];
    for (const [x0, z0, x1, z1] of [[6, 214, 20, 210], [-22, 212, -32, 206]]) {
      const y = Math.max(H(x0, z0), H(x1, z1)) + 2.6;
      B.cyl(0.07, 0.09, 3, 0x3a2a1e, x0, H(x0, z0), z0, 5);
      B.cyl(0.07, 0.09, 3, 0x3a2a1e, x1, H(x1, z1), z1, 5);
      const ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
      for (let i = 1; i < 8; i++) {
        const t = i / 8;
        B.box(1.1, 1.5, 0.04, PRINTS[(i + (x0 > 0 ? 0 : 3)) % PRINTS.length], lerp(x0, x1, t), y - 1.6 - Math.sin(t * Math.PI) * 0.25, lerp(z0, z1, t), ry, { sway: 0.1 });
      }
    }
    // pier
    for (let z = 168; z <= 204; z += 1.2) B.box(4.4, 0.18, 1.05, mix(0x9a7a52, 0xb89668, R()), 10, 1.25, z);
    for (let z = 169; z <= 204; z += 5) for (const sx of [-1, 1]) B.cyl(0.16, 0.18, 4.6, 0x4a3626, 10 + sx * 2.1, -2.6, z, 6);
    this.platforms.push({ minx: 7.7, maxx: 12.3, minz: 167.4, maxz: 204.6, y: 1.43 });
    // stone lanterns
    for (const [x, z] of [[4, 206], [16, 206], [-14, 214], [30, 224]]) {
      const y = H(x, z);
      B.cyl(0.22, 0.3, 1.5, 0x9a9a92, x, y, z, 6);
      B.box(0.75, 0.12, 0.75, 0x8a8a84, x, y + 1.5, z);
      B.box(0.5, 0.5, 0.5, 0xffc878, x, y + 1.62, z, 0, { emissive: 1 });
      B.hip(1.0, 1.0, 0.45, 0x7a7a76, x, y + 2.12, z, 0, undefined, undefined, 0);
      this.glows.push({ p: [x, y + 1.9, z], c: 0xffc878, size: 2 });
      maps.lamp(x, z, 7, 0xffc878, 0.8);
    }
    // beached boats
    for (const [x, z, ry] of [[34, 200, 0.5], [-26, 198, -0.4], [58, 208, 1.2]]) {
      const y = H(x, z);
      B.box(6.5, 0.8, 1.7, 0xd9c690, x, y + 0.1, z, ry);
      B.box(6.9, 0.14, 1.9, 0x8a6a48, x, y + 0.9, z, ry);
    }
    S.add(B.mesh(flat({ scale: 0.25, emissive: 1.5 })));

    // pines along the shore and on the hills
    const T = new Builder();
    // a tree that lands on ground one of the other prints needs is drawn into this
    // spare builder and thrown away, so the dice fall exactly as they always did
    const SPARE = new Builder();
    let n = 0;
    while (n < 70) {
      const x = (R() - 0.5) * 420,
        z = 205 + R() * 110;
      const y = H(x, z);
      if (y < 2.2 || (Math.abs(x + 6) < 26 && z < 238) || (Math.abs(x - 10) < 6 && z < 212)) continue;
      const h = 7 + R() * 8;
      const open = !keptClear(x, z, 1.5);
      pine(open ? T : SPARE, x, y, z, h, 3 + R() * 2, R, { lo: 0x25463a, hi: 0x3f7a5a, trunk: 0x5a3a2a, tiers: 3 + ((R() * 3) | 0) });
      this.colliders.push({ x, z, r: 0.5, top: y + h * 0.5, spare: !open });
      if (open) maps.blob(x, z, 4, 0.3);
      n++;
    }
    S.add(T.mesh(flat({ scale: 0.2 })));

    // ================= a world worth crossing =================
    const X = new Builder(); // more things made of wood, stone and paper
    const T2 = new Builder(); // more things that grow
    const VERMILION = 0xc8432c;

    // --- the fishing village strung along the shore
    const lots = [[-70, 228], [-94, 238], [-118, 231], [74, 238], [98, 229], [122, 240], [146, 232], [-58, 252], [86, 256], [18, 256], [-22, 250], [-146, 240], [170, 244], [-98, 262], [120, 264]];
    for (const [x, z] of lots) {
      if (H(x, z) < 1.3) continue;
      house(X, proxy, {
        R, x, z, ry: Math.PI + (R() - 0.5) * 0.7, w: 7 + R() * 4, d: 5.5 + R() * 2, h: 3.5 + R() * 0.8,
        roofType: 'hip', roofH: 2.3, over: 1.0, ridge: 0.5, wall: R() < 0.5 ? 0xe9dfc6 : 0xcdbb98, roof: [0x3d4c5c, 0x4a5560, 0x55504a, 0x35455a][(R() * 4) | 0],
        trim: 0x3a2a1e, doorCol: [0x243a6a, 0x7a2f2a, 0x3a2a1e][(R() * 3) | 0], lit: 0.85, winW: 1.3, winH: 1.4, chimney: false,
      });
      // a paper lantern by every door
      const lx = x + (R() - 0.5) * 3,
        lz = z - 5;
      X.cyl(0.04, 0.04, 2.4, 0x3a2a1e, lx, H(lx, lz), lz, 5);
      X.ball(0.34, [0xf2a04a, 0xe8604a, 0xf6e0a0][(R() * 3) | 0], lx, H(lx, lz) + 2.3, lz, 1, 1.25, 1, 1, { emissive: 1 });
      this.glows.push({ p: [lx, H(lx, lz) + 2.3, lz], c: 0xffb860, size: 1.6 });
      maps.lamp(lx, lz, 6, 0xffb860, 0.7);
    }

    // --- a three-storey pagoda above the roofs
    {
      const px = -78,
        pz = 276,
        y = H(px, pz);
      for (let i = 0; i < 3; i++) {
        const w = 7.4 - i * 1.5,
          by = y + i * 4.5;
        X.box(w, 3.3, w, 0xe9dfc6, px, by, pz);
        for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) X.box(0.36, 3.3, 0.36, VERMILION, px + (ox * w) / 2, by, pz + (oz * w) / 2);
        X.box(w + 0.5, 0.3, w + 0.5, VERMILION, px, by + 3.3, pz);
        X.hip(w + 4.2, w + 4.2, 1.5, 0x35424f, px, by + 3.5, pz, 0, undefined, undefined, 0);
        X.box(1.5, 1.2, 0.1, 0xffd58a, px, by + 1.2, pz - w / 2 - 0.04, 0, { emissive: 0.9 });
      }
      X.cyl(0.05, 0.22, 5, 0xd9a93a, px, y + 14.6, pz, 6);
      this.colliders.push({ x: px, z: pz, hw: 4, hd: 4, ry: 0, top: y + 15 });
      this.glows.push({ p: [px, y + 19.6, pz], c: 0xffd58a, size: 2 });
      maps.blob(px, pz, 9, 0.4);
    }

    // --- a great torii standing in the shallows
    {
      const tx = 66,
        tz = 152;
      for (const sx of [-1, 1]) {
        X.cyl(0.5, 0.62, 11.6, VERMILION, tx + sx * 4.3, -1, tz, 10);
        X.cyl(0.7, 0.75, 1.1, 0x1d1d22, tx + sx * 4.3, -0.6, tz, 10);
        this.colliders.push({ x: tx + sx * 4.3, z: tz, r: 0.7, top: 11 });
      }
      X.box(10.6, 0.6, 0.5, VERMILION, tx, 7.6, tz);
      X.box(12.2, 0.75, 0.8, VERMILION, tx, 9.9, tz);
      X.box(13.6, 0.4, 1.1, 0x1d1d22, tx, 10.65, tz);
      X.box(0.5, 1.7, 0.4, VERMILION, tx, 8.2, tz);
    }

    // --- islets: dark rock, a cap of moss, wind-bent pines
    const islets = [[122, 112, 14, 7], [-112, 134, 11, 6], [174, -22, 16, 9], [-196, -64, 18, 11], [66, -262, 14, 8], [236, 124, 12, 6], [-246, 112, 15, 8], [-150, -230, 15, 9], [250, -180, 17, 10]];
    islets.forEach(([ix, iz, r, h], n) => {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 6.283 + R(),
          d = k === 0 ? 0 : r * (0.35 + R() * 0.3);
        const geo = new THREE.IcosahedronGeometry(r * (k === 0 ? 0.72 : 0.42 + R() * 0.18), 1);
        X.add(geo, (x, y) => mix(0x2c3848, 0x5f6f80, clamp(y / r + 0.5)), xf(ix + Math.cos(a) * d, h * (k === 0 ? 0.25 : 0.05), iz + Math.sin(a) * d, R() * 6, 1, (h / r) * (k === 0 ? 1.25 : 0.9 + R() * 0.5), 1));
      }
      X.cyl(r * 0.5, r * 0.62, 0.5, 0x6f8a5a, ix, h * 0.92, iz, 9);
      this.platforms.push({ minx: ix - r * 0.42, maxx: ix + r * 0.42, minz: iz - r * 0.42, maxz: iz + r * 0.42, y: h * 0.92 + 0.5 });
      this.colliders.push({ x: ix, z: iz, r: r * 0.7, top: h * 0.9 });
      for (let k = 0; k < 2 + (n % 2); k++) pine(T2, ix + (R() - 0.5) * r * 0.6, h * 0.9, iz + (R() - 0.5) * r * 0.6, 6 + R() * 5, 2.6 + R() * 1.4, R, { lo: 0x25463a, hi: 0x3f7a5a, trunk: 0x5a3a2a, tiers: 3 });
      if (n % 3 === 0) {
        // a wayside shrine
        X.box(1.4, 0.3, 1.2, 0x8a8a84, ix + 1.5, h * 0.92 + 0.5, iz);
        X.box(1.0, 1.0, 0.8, VERMILION, ix + 1.5, h * 0.92 + 0.8, iz);
        X.hip(1.9, 1.7, 0.6, 0x35424f, ix + 1.5, h * 0.92 + 1.8, iz, 0, undefined, undefined, 0.4);
        this.glows.push({ p: [ix + 1.5, h * 0.92 + 1.4, iz - 0.6], c: 0xffc878, size: 1.4 });
      }
    });

    // --- a coastal trader riding at anchor, sail set
    {
      const jx = 124,
        jz = 44;
      X.box(21, 3.6, 6.2, (x, y) => mix(0x4a3020, 0x8a5a36, clamp(y / 3.6 + 0.5)), jx, -1.5, jz);
      X.box(5.5, 2.6, 5.8, 0x6a4530, jx + 8.5, 2.1, jz);
      X.box(21.6, 0.3, 6.6, 0x9a7a52, jx, 2.0, jz);
      X.cyl(0.2, 0.34, 21, 0x4a3626, jx - 1, 2.1, jz, 6);
      X.box(0.25, 0.25, 13.6, 0x4a3626, jx - 1, 21.6, jz);
      X.box(0.2, 14, 13, FOAM, jx - 0.7, 7.4, jz, 0, { sway: 0.04 });
      for (const oz of [-4.3, 0, 4.3]) X.box(0.26, 14, 0.5, 0x2f548a, jx - 0.7, 7.4, jz + oz, 0, { sway: 0.04 });
      this.platforms.push({ minx: jx - 10.5, maxx: jx + 5.6, minz: jz - 3, maxz: jz + 3, y: 2.3 });
      this.colliders.push({ x: jx + 8.5, z: jz, hw: 2.8, hd: 2.9, ry: 0, top: 4.7 });
      this.glows.push({ p: [jx + 8.5, 5.6, jz], c: 0xffb860, size: 2 });
    }

    // --- small fishing boats working the swell, each with its lantern
    for (const [x, z, ry] of [[52, 132, 0.6], [-64, 140, -0.3], [-70, 18, 1.2], [84, -30, 0.2], [150, 150, -0.8], [-150, 70, 0.4], [20, -110, 1.0], [-20, 118, -1.1], [196, 60, 0.3], [-110, -60, 0.7]]) {
      const M = xf(x, -0.15, z, ry);
      X.box(5.2, 0.7, 1.5, 0xd9c690, 0, 0, 0, 0, undefined, M);
      X.box(5.6, 0.12, 1.7, 0x8a6a48, 0, 0.7, 0, 0, undefined, M);
      X.cyl(0.03, 0.03, 1.5, 0x3a2a1e, -2.2, 0.7, 0, 4, undefined, M);
      X.ball(0.24, 0xf2a04a, -2.2, 2.2, 0, 1, 1.2, 1, 1, { emissive: 1 }, M);
      X.cyl(0.025, 0.035, 4.2, 0x6a4a2a, 0.9, 1.4, 0.2, 4, undefined, M, 0.9, 0);
      const cs = Math.cos(ry),
        sn = Math.sin(ry);
      figure(X, x + 0.6 * cs, 0.6, z - 0.6 * sn, ry + Math.PI / 2, { coat: 0x2f548a, legs: 0x2f548a, hat: 'cone', scale: 0.85, lean: 0.2 });
      this.glows.push({ p: [x - cs * 2.2, 2.1, z + sn * 2.2], c: 0xffb860, size: 1.5 });
      this.colliders.push({ x, z, hw: 2.8, hd: 0.9, ry, top: 1 });
    }

    // --- the cooper's unfinished barrel: a hoop big enough to frame the mountain
    {
      const bx = 38,
        bz = 213,
        y = H(bx, bz);
      X.add(new THREE.TorusGeometry(3.1, 0.34, 8, 30), (x, y2) => mix(0xb08a50, 0xe0c080, clamp(y2 / 6 + 0.5)), xf(bx, y + 3.2, bz, 0.25));
      X.add(new THREE.TorusGeometry(3.1, 0.2, 6, 30), 0x6a4a2a, xf(bx, y + 3.2, bz + 0.5, 0.25));
      for (const sx of [-1, 1]) X.box(0.5, 0.6, 1.6, 0x6a4a2a, bx + sx * 2, y, bz);
      figure(X, bx + 0.4, y + 0.35, bz + 0.2, 2.6, { coat: 0x7f9aa8, legs: 0x3a4a5a, lean: 0.5, arms: 0.7, scale: 0.9 });
      for (const sx of [-1, 1]) this.colliders.push({ x: bx + sx * 3, z: bz, r: 0.5, top: y + 5 });
    }

    // --- kites over the village
    const KITE = [VERMILION, 0x2f5f9a, FOAM, 0xe8c66a, VERMILION, 0x7fa0a8];
    KITE.forEach((col, i) => {
      const ax = -110 + i * 46 + R() * 14,
        az = 232 + R() * 22;
      const kx = ax + (R() - 0.5) * 16,
        ky = 26 + R() * 18,
        kz = az - 16 - R() * 14;
      const M = xf(kx, ky, kz, R() * 0.6, 1, 1, 1, 0.5, Math.PI / 4);
      X.box(2.0, 2.0, 0.06, col, 0, -1, 0, 0, { sway: 0.5 }, M);
      X.box(0.12, 2.6, 0.08, 0x3a2a1e, 0, -1.3, 0.02, 0, { sway: 0.5 }, M);
      for (let k = 1; k <= 3; k++) X.box(0.5, 0.3, 0.05, k % 2 ? FOAM : col, kx + k * 0.3, ky - 1.6 - k * 0.9, kz + k * 0.3, 0, { sway: 0.6 });
      // the flyer steps aside from ground the other prints stand on; the kite itself stays where it was
      let fx = ax;
      for (let s = 0; s < 14 && (keptClear(fx, az, 2) || this.blocked(fx, H(fx, az) + 1, az)); s++) fx -= 2.5;
      const a = new THREE.Vector3(fx, H(fx, az) + 1.4, az),
        b = new THREE.Vector3(kx, ky - 1, kz);
      const dir = b.clone().sub(a);
      const L = dir.length();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      X.add(new THREE.CylinderGeometry(0.02, 0.02, L, 3), 0x3a2a1e, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
      if (H(fx, az) > 1.2) figure(X, fx, H(fx, az), az, Math.PI, { coat: [0x2f548a, 0x8a2f2f, 0x5a6a4a][i % 3], scale: 0.72, arms: 0.8 });
    });

    // --- cherry trees in blossom between the houses
    let cn = 0,
      guard = 0;
    while (cn < 34 && guard++ < 600) {
      const x = (R() - 0.5) * 400,
        z = 212 + R() * 80;
      const y = H(x, z);
      if (y < 2 || this.blocked(x, y + 1, z) || (Math.abs(x - 10) < 7 && z < 214)) continue;
      const open = !keptClear(x, z, 2);
      blobTree(open ? T2 : SPARE, x, y, z, 5.2 + R() * 1.6, 2.5 + R() * 0.9, R, { lo: 0xe58aa6, hi: 0xffe0ea, trunk: 0x3a2622, blobs: 4, trunkH: 0.5 });
      this.colliders.push({ x, z, r: 0.4, top: y + 2.5, spare: !open });
      if (open) maps.blob(x, z, 3.6, 0.3);
      cn++;
    }
    for (let i = this.colliders.length - 1; i >= 0; i--) if (this.colliders[i].spare) this.colliders.splice(i, 1);

    // --- bands of printed mist lying across the distance
    for (let i = 0; i < 22; i++) {
      const far = i < 9;
      const x = far ? -260 + R() * 620 : (R() - 0.5) * 900,
        z = far ? -420 - R() * 520 : i < 15 ? 340 + R() * 130 : -160 - R() * 200,
        y = far ? 16 + R() * 60 : i < 15 ? 30 + R() * 46 : 60 + R() * 30;
      const w = 50 + R() * 90;
      X.ball(1, R() < 0.3 ? 0xf2d6c4 : 0xf6ecd4, x, y, z, w, 2.2 + R() * 2, 9 + R() * 8, 2, { emissive: 0.55 });
    }

    S.add(X.mesh(flat({ scale: 0.25, emissive: 1.5 })));
    S.add(T2.mesh(flat({ scale: 0.2 })));

    // --- plovers wheeling over the water
    this.flocks = [[20, 30, 60, 46], [-96, 38, -30, 60], [128, 24, 150, 40], [40, 46, -160, 70]].map(([cx, cy, cz, rad], n) => {
      const FB = new Builder();
      for (let i = 0; i < 15; i++) {
        const ox = rad + (R() - 0.5) * 16,
          oy = (R() - 0.5) * 6,
          oz = (R() - 0.5) * 12;
        for (const sx of [-1, 1]) FB.add(new THREE.BoxGeometry(0.95, 0.06, 0.34), i % 4 ? FOAM : 0xdde5d8, xf(ox + sx * 0.44, oy + 0.14, oz, 0, 1, 1, 1, 0, sx * 0.35));
        FB.ball(0.16, 0x35405a, ox, oy, oz + 0.1, 0.8, 0.8, 1.6, 0);
      }
      const m = FB.mesh(flat({ scale: 0.5, objSpace: 1 }));
      m.material.uniforms.uRestore = { value: 1 };
      m.position.set(cx, cy, cz);
      S.add(m);
      return { m, sp: 0.16 + n * 0.04, ph: n * 1.7 };
    });

    // far coast behind the village
    const coast = mountainRing({
      radius: 520,
      base: -6,
      profile: (a) => 40 + fbm(a * 4, 1.5, 3) * 70,
      colorFn: (x, y) => mix(0x5f8090, 0x3a5a78, clamp(y / 80)),
      a0: Math.PI * 0.55,
      a1: Math.PI * 1.45,
      seg: 120,
      depth: 120,
    });
    const cm = new THREE.Mesh(coast, flat({ scale: 0.006, side: THREE.DoubleSide }));
    cm.position.z = 120;
    cm.frustumCulled = false;
    S.add(cm);

    // ---------------- the three boats
    this.boats = [
      { x: 22, z: 30, ry: 0.35 },
      { x: 50, z: 54, ry: 0.2 },
      { x: 8, z: 82, ry: 0.45 },
    ].map((b, i) => {
      const m = buildBoat(strokes, R);
      m.position.set(b.x, 0, b.z);
      m.rotation.y = b.ry;
      S.add(m);
      this.colliders.push({ x: b.x, z: b.z, hw: 6.5, hd: 1.6, ry: b.ry, top: 1.4 });
      return { m, ...b, ph: i * 2.1 };
    });

    // gulls of light over the water, lanterns far along the coast
    for (let i = 0; i < 60; i++) this.glows.push({ p: [(R() - 0.5) * 700, 3, 330 + R() * 120], c: 0xffc878, size: 2.4 + R() * 2 });
    // the land behind the wave: scenes from the other prints
    this.buildPrints(flat);
    S.add(glowPoints(this.glows, 1));
    maps.finish();

    // ---------------- story
    const hok = new Builder();
    figure(hok, 0, 0, 0, 0, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, dress: true, lean: 0.25, arms: 0.35, scale: 0.92 });
    figure(hok, 1.5, 0, 0.4, -0.5, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, dress: true, arms: 0.15, scale: 0.98 });
    const packet = new Builder();
    packet.box(0.7, 0.5, 0.5, 0xe9dfc6, 0, -0.25, 0);
    packet.box(0.74, 0.14, 0.54, 0x8a2f2f, 0, -0.07, 0);
    packet.ball(0.3, 0x1f4fb0, 0, 0.42, 0, 1, 0.6, 1, 1, { emissive: 0.5 });
    const pm = packet.mesh(paintMaterial({ stroke: strokes.wood, scale: 2, contrast: 0.1, objSpace: 1, flat: 0.5, emissive: 1.6 }));
    pm.material.uniforms.uRestore = { value: 1 };
    pm.scale.setScalar(1.8);
    const ey = H(-9, 213) + 0.02;

    this.setupStory({
      wisps: [
        { pos: [10, 3.2, 176], color: 0x2f6fd0, name: 'Indigo', fact: 'The wave belongs to Thirty-Six Views of Mount Fuji, a series Hokusai began at about seventy.' },
        { pos: [14, H(14, 211) + 1.6, 211], color: 0xf0c060, name: 'Paper gold', fact: 'A print is pressed from several carved blocks, one for each colour: the outline first, then light blue, then deep blue.' },
        { pos: [22, 3.2, 30], color: 0xe8b060, name: 'Boat ochre', fact: 'Its Japanese title means Under the Wave off Kanagawa. Three boats of rowers face the sea, heads down.' },
        { pos: [-40, 16, 74], color: 0xd8f0ff, name: 'Foam white', fact: 'Hokusai wrote that nothing he had drawn before seventy was worth counting.' },
        { pos: [174, 12, -22], color: 0x8fb8d8, name: 'Mountain grey', fact: 'Thousands of copies were printed. About a hundred originals survive today.', radius: 150 },
      ],
      memento: {
        pos: [WX + 16, 26, WZ + 6],
        color: 0x6fb0ff,
        model: pm,
        name: 'the packet of Prussian blue',
        text: 'Prussian blue was invented in Europe in 1706, and had only just become affordable in Japan. Hokusai spent money he barely had on it.',
      },
      echo: {
        pos: [-9, ey, 213],
        ry: Math.PI,
        color: 0xfff0c8,
        model: hok.mesh(ghostMaterial(0xffe2b0, 1.0)),
        name: 'Hokusai',
        greet: ['Ha! A guest from the sea. Sit, sit. I am seventy, and only now beginning to learn how to draw.', 'My daughter Ōi keeps the workshop. I have lost my new blue to that wave. Would you look?'],
        thanks: ['The blue from across the world! Ōi, the last block, quickly.', 'When I am a hundred and ten, every dot and line will be alive.'],
      },
      exit: { pos: [2, H(2, 208), 208], ry: 0 },
    });
    this.finalFact = 'Under the Wave off Kanagawa travelled the whole world. Today it is even an emoji: 🌊';
    this.finalLine = 'The last layer: the deep blue. And the sea stands up into the picture.';
    this.hints = {
      start: 'The sea is only a print: you can walk on it. Follow the pier out towards the great wave.',
      memento: 'The packet of blue is tumbling in the spray above the biggest swell, out past the boats. Hold Space and ride up to it.',
      echo: 'Bring the blue back to Hokusai at his workshop on the shore.',
    };
  }

  // ================================================================
  // The other prints. Each block below is one picture Hokusai made,
  // set down where the land suits it.
  // ================================================================
  buildPrints(flat) {
    const S = this.scene,
      maps = this.maps;
    const H = (x, z) => this.heightAt(x, z);
    const Q = rng(3636);
    const X = new Builder(); // wood, stone, cloth and people
    const P = new Builder(); // things that grow
    const GR = new Builder(); // roads, paths and running water, laid on the ground
    const SPARE = new Builder(); // never shown: takes pieces that would have cut through something
    const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
    const toFuji = (x, z) => face(x, z, 178, -1120);
    const pick = (a) => a[(Q() * a.length) | 0];
    const solid = (x, z, r, top) => this.colliders.push({ x, z, r, top });
    const wall = (x, z, hw, hd, ry, top, bottom) => this.colliders.push(bottom === undefined ? { x, z, hw, hd, ry, top } : { x, z, hw, hd, ry, top, bottom });
    const deck = (minx, maxx, minz, maxz, y) => this.platforms.push({ minx, maxx, minz, maxz, y });
    const glow = (x, y, z, size = 1.8, c = 0xffc878) => this.glows.push({ p: [x, y, z], c, size });
    const near = (x, z, r) => {
      for (const c of this.colliders) if (Math.hypot(x - c.x, z - c.z) < (c.r !== undefined ? c.r : Math.hypot(c.hw, c.hd)) + r) return true;
      return false;
    };
    // lowest and highest ground under a footprint
    const spanY = (x, z, w, d, ry = 0) => {
      const c = Math.cos(ry),
        s = Math.sin(ry);
      let lo = 1e9,
        hi = -1e9;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
        const y = H(x + (a * w * c) / 2 + (b * d * s) / 2, z - (a * w * s) / 2 + (b * d * c) / 2);
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
      return [lo, hi];
    };
    const thatch = (px, py) => mix(THATCH_D, THATCH, clamp(py * 0.45));
    const dress = (o = {}) => ({ coat: pick(CLOTH), legs: pick([0x3a4a5a, 0x4a5560, SKIN, 0x2f548a]), ...o });

    // a thatched farmhouse on a stone footing, levelled into the slope; its door faces local +z
    const minka = (x, z, ry, w, d, o = {}) => {
      const [lo, hi] = spanY(x, z, w + 0.6, d + 0.6, ry);
      const y = hi + 0.1,
        h = o.h ?? 2.5,
        rh = o.roofH ?? Math.min(w, d) * 0.6;
      const M = xf(x, 0, z, ry);
      X.box(w + 0.6, y - lo + 0.6, d + 0.6, STONE_D, 0, lo - 0.6, 0, 0, undefined, M);
      X.box(w, h, d, (px, py) => mix(o.wall ?? 0xdccfa8, 0x7a6a4a, clamp(0.3 - (py + h / 2) * 0.25, 0, 0.3)), 0, y, 0, 0, undefined, M);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) X.box(0.2, h, 0.2, TIMBER, (a * w) / 2, y, (b * d) / 2, 0, undefined, M);
      X.box(w + 0.16, 0.18, d + 0.16, TIMBER, 0, y + h - 0.18, 0, 0, undefined, M);
      if (w >= d) {
        X.hip(d + 1.8, w + 1.8, rh, thatch, 0, y + h, 0, Math.PI / 2, undefined, M, 0.5);
        X.box((w + 1.8) * 0.5 + 0.5, 0.22, 0.55, THATCH_D, 0, y + h + rh - 0.08, 0, 0, undefined, M);
      } else {
        X.hip(w + 1.8, d + 1.8, rh, thatch, 0, y + h, 0, 0, undefined, M, 0.5);
        X.box(0.55, 0.22, (d + 1.8) * 0.5 + 0.5, THATCH_D, 0, y + h + rh - 0.08, 0, 0, undefined, M);
      }
      X.box(1.0, 1.85, 0.1, TIMBER, o.door ?? -w * 0.2, y, d / 2 + 0.03, 0, undefined, M);
      if (o.lit !== false) X.box(1.0, 0.8, 0.08, 0xffd58a, w * 0.24, y + 1.0, d / 2 + 0.03, 0, { emissive: 0.8 }, M);
      wall(x, z, w / 2 + 0.3, d / 2 + 0.3, ry, y + h + rh);
      maps.blob(x, z, Math.max(w, d) * 0.95, 0.4);
      return y;
    };
    const lanternAt = (x, z, lit = true) => {
      const y = H(x, z);
      X.cyl(0.2, 0.28, 1.4, STONE, x, y - 0.1, z, 6);
      X.box(0.7, 0.12, 0.7, STONE_D, x, y + 1.3, z);
      X.box(0.46, 0.46, 0.46, lit ? 0xffc878 : 0xcfc8b0, x, y + 1.42, z, 0, lit ? { emissive: 1 } : undefined);
      X.hip(0.95, 0.95, 0.42, STONE_D, x, y + 1.88, z, 0, undefined, undefined, 0);
      if (lit) {
        glow(x, y + 1.7, z);
        maps.lamp(x, z, 7, 0xffc878, 0.8);
      }
    };
    // a wayside stone figure in a red bib
    const jizo = (x, z, ry) => {
      const M = xf(x, H(x, z), z, ry);
      X.box(0.5, 0.2, 0.5, STONE_D, 0, -0.06, 0, 0, undefined, M);
      rod(X, [0, 0.12, 0], [0, 0.78, 0], 0.2, 0.14, STONE, 5, undefined, M);
      X.ball(0.16, STONE, 0, 0.92, 0, 1, 1, 1, 0, undefined, M);
      X.box(0.3, 0.2, 0.06, VERM, 0, 0.56, 0.15, 0, undefined, M);
    };
    // stepped fields: each one a low banked shelf cut into the slope, small enough to climb like a stair
    const fields = (x0, x1, z0, z1, colW, kind) => {
      const made = [];
      for (let xa = x0; xa < x1 - 2; xa += colW) {
        const xb = Math.min(x1, xa + colW),
          xc = (xa + xb) / 2,
          w = xb - xa;
        let z = z0 + Q() * 1.5;
        while (z < z1 - 3) {
          const top = Math.max(H(xa, z), H(xc, z), H(xb, z)) + 0.55;
          let d = 3;
          while (d < 9 && z + d < z1 && Math.max(H(xa, z + d), H(xc, z + d), H(xb, z + d)) < top - 0.05) d += 0.5;
          const zc = z + d / 2,
            big = Math.max(w, d) * 0.5;
          if (top > 1.95 && !nearRoute(xc, zc, big - 1.2) && !near(xc, zc, big)) {
            const lo = Math.min(H(xa, z), H(xb, z)) - 0.6;
            const odd = (made.length + Math.round(xa / colW)) % 2;
            X.box(w - 0.12, top - lo, d - 0.08, kind === 'rice' ? 0x7d9470 : 0x8f9a72, xc, lo, zc);
            X.box(w - 0.8, 0.07, d - 0.7, kind === 'rice' ? (odd ? PALE : 0xb9cfd0) : 0xcdbf94, xc, top - 0.02, zc);
            deck(xa, xb, z, z + d, top + 0.05);
            made.push({ x: xc, z: zc, w: w - 1.4, d: d - 1.2, y: top + 0.05 });
            if (kind === 'rice') {
              for (let px = xa + 1.0; px < xb - 0.7; px += 1.5) for (let pz = z + 0.8; pz < z + d - 0.6; pz += 1.3) tuft(P, px + (Q() - 0.5) * 0.3, top + 0.12, pz + (Q() - 0.5) * 0.3, 0.55, Q, 0x5f8a4a, 0.25, 1);
            } else {
              let k = 0;
              for (let pz = z + 0.95; pz < z + d - 0.7; pz += 1.25) X.box(w - 1.6, 0.26, 0.5, (odd + k++) % 2 ? 0x6f9a5a : 0x86aa66, xc, top + 0.03, pz);
            }
          }
          z += d;
        }
      }
      return made;
    };
    // scatter something that grows over a rectangle of open hillside
    const grove = (n, x0, x1, z0, z1, plant, gap = 2.4, minY = 2.2) => {
      let k = 0,
        guard = 0;
      while (k < n && guard++ < n * 40) {
        const x = lerp(x0, x1, Q()),
          z = lerp(z0, z1, Q());
        const y = H(x, z);
        if (y < minY || keptClear(x, z, 1.5) || near(x, z, gap)) continue;
        plant(x, y, z);
        k++;
      }
    };

    // ---------------- the coast road, and the paths that leave it for the hills
    const dirt = (x, y, z) => mix(0xdccda4, 0xc6b48a, vnoise(x * 0.35, z * 0.35));
    for (const pts of [ROAD_W, ROAD_M, ROAD_E]) GR.parts.push(ribbon(pts, 3.8, H, dirt, { lift: 0.14, across: 3, step: 2 }));
    GR.parts.push(patch(-2, 211.3, 26, H, dirt, { lift: 0.13, wobble: 0.08, sz: 0.22, rings: 4, seg: 28 }));
    for (const pts of [PATH_FALL, PATH_SHRINE, PATH_HALL, PATH_PASS]) GR.parts.push(ribbon(pts, 2.2, H, dirt, { lift: 0.13, across: 2, step: 2 }));

    // running water, printed in stripes
    const water = (pts, w0, w1) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5);
      const n = Math.ceil(curve.getLength() / 1.6);
      const c = curve.getSpacedPoints(n);
      GR.parts.push(
        gridGeo(
          n,
          4,
          (a, b, i) => {
            const p0 = c[Math.max(0, i - 1)],
              p1 = c[Math.min(n, i + 1)];
            const l = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
            const s = (b - 0.5) * lerp(w0, w1, a) * (1 + 0.18 * Math.sin(i * 0.9));
            const x = c[i].x + ((p1.z - p0.z) / l) * s,
              z = c[i].z - ((p1.x - p0.x) / l) * s;
            return [x, H(x, z) + 0.11, z];
          },
          (a, b, i, j) => new THREE.Color((i * 5 + j * 3) % 11 < 2 ? FOAM : j === 1 || j === 2 ? (i % 2 ? PALE : 0x8fb4c4) : MIDBLUE)
        )
      );
    };
    water(STREAM1, 2.6, 4.6);
    water(STREAM2, 2.0, 3.6);

    // ---------------- Amida Falls: a round hollow in the rock, then one straight striped drop
    {
      const CX = 10,
        CZ = 331,
        RR = 13.5,
        y0 = 24,
        HT = 25;
      const T = H(CX, 317.5) + 0.25; // the level shelf the pool lies on
      const crag = (phi, b, out = 0) => {
        const lump = 1 + 0.1 * Math.sin(3 * phi) + 0.06 * Math.sin(7 * phi) + 0.05 * Math.sin(5 * phi + b * 9) * (1 - Math.exp(-phi * phi * 30));
        const r = RR * lump * Math.pow(1 - b * b * b, 0.6) + out;
        return [CX + Math.sin(phi) * r, y0 + HT * Math.pow(b, 0.9), CZ - Math.cos(phi) * r];
      };
      const ROCK = [0x5a7a80, 0x86a08a, 0xbca97c, 0x4a6470, 0x93a583];
      X.parts.push(gridGeo(30, 10, (a, b) => crag(Math.PI - a * Math.PI * 2, b), (a, b, i, j) => new THREE.Color(j > 8 ? 0x6f8a5a : ROCK[(i * 2 + j * 3 + (i >> 2)) % 5])));
      solid(CX, CZ, 12.4, y0 + HT - 3);
      // the headwall the hollow is cut into
      const hy = y0 + HT - 1.3,
        hz = CZ - 5.6;
      X.add(new THREE.IcosahedronGeometry(4.7, 1), (px, py) => mix(0x4a6470, 0x93a583, clamp(py / 9 + 0.5)), xf(CX, hy, hz, 0.3, 1.45, 1.0, 0.72));
      const HM = xf(CX, hy - 0.4, hz - 3.6, Math.PI, 1, 1, 1, -0.18, 0);
      X.add(new THREE.CircleGeometry(2.7, 18), PALE, HM, { emissive: 0.3 });
      for (const [r0, r1] of [[0.6, 0.85], [1.35, 1.6], [2.1, 2.3]]) X.add(new THREE.RingGeometry(r0, r1, 18, 1), MIDBLUE, HM.clone().multiply(xf(0.15 * r0, -0.1 * r0, 0.03)));
      for (let k = 0; k < 9; k++) {
        const a = -0.55 + (k / 8) * (Math.PI + 1.1); // rocks round the top and sides, open below where the water leaves
        X.ball(0.95 + Q() * 0.5, ROCK[k % 5], Math.cos(a) * 3.1, Math.sin(a) * 3.1, -0.45, 1, 1, 0.8, 0, undefined, HM);
      }
      // the fall itself
      const b0 = Math.pow((T - y0) / HT, 1 / 0.9);
      const STR = [MIDBLUE, FOAM, PALE, FOAM, FOAM, MIDBLUE, FOAM, PALE, FOAM, MIDBLUE];
      X.parts.push(gridGeo(10, 12, (a, b) => crag((0.5 - a) * 0.27 * (1.3 - 0.3 * b), lerp(b0, 0.8, b), 0.45), (a, b, i, j) => new THREE.Color((i * 3 + j) % 9 === 0 ? PALE : STR[i]), { emissive: 0.35 }));
      for (let k = 0; k < 6; k++) X.ball(0.7 + Q() * 0.5, FOAM, CX + (k - 2.5) * 0.85 + (Q() - 0.5) * 0.4, T + 0.25 + Q() * 0.4, 316.7 + Q() * 0.5, 1.3, 0.6, 1, 1, { emissive: 0.35 });
      // the shelf, the pool on it, and the spill down its front into the stream
      const tlo = spanY(CX, 312, 24, 11)[0];
      X.box(24, T - tlo + 0.9, 11, 0x7a8a84, CX, tlo - 1, 312);
      X.box(24.3, 0.14, 11.3, 0xa4ae8e, CX, T - 0.12, 312);
      wall(CX, 312, 12, 5.5, 0, T);
      deck(-2, 22, 306.5, 317.5, T + 0.02);
      const flatM = (x, y, z) => xf(x, y, z, 0, 1, 1, 1, -Math.PI / 2, 0);
      X.add(new THREE.CircleGeometry(3.7, 20), PALE, flatM(CX, T + 0.08, 313.6));
      for (const [r0, r1] of [[1.3, 1.7], [2.5, 2.85]]) X.add(new THREE.RingGeometry(r0, r1, 20, 1), MIDBLUE, flatM(CX, T + 0.1, 313.9 - r0 * 0.2));
      X.box(1.7, 0.1, 3.8, MIDBLUE, CX, T, 308.3);
      const yb = H(CX, 305.6) + 0.1;
      X.parts.push(gridGeo(4, 3, (a, b) => [CX + (a - 0.5) * 1.9, lerp(T + 0.08, yb, b), 306.42 - b * 0.9], (a, b, i) => new THREE.Color(i % 2 ? FOAM : PALE), { emissive: 0.3 }));
      for (let x = -1.5; x <= 21.6; x += 2.3) if (Math.abs(x - CX) > 1.6) X.box(0.14, 0.9, 0.14, TIMBER, x, T, 306.9);
      for (const cx of [3.45, 16.55]) X.box(9.9, 0.1, 0.1, TIMBER, cx, T + 0.82, 306.9);
      // pilgrims come to stand under it; a few have spread a mat
      const pil = { coat: 0xe9e2cc, legs: 0xe9e2cc, hat: 'cone', staff: true, lean: -0.12 };
      for (const [px, pz, arms, carry] of [[3, 311.2, [2.3, 0.2], 'pack'], [4.7, 312.9, undefined, undefined], [15.6, 310.8, undefined, 'pack'], [17.3, 312.7, [2.0, 0.1, 1.8], undefined], [6.3, 309.3, undefined, 'bundle']]) person(X, px, T + 0.02, pz, face(px, pz, CX, 326), { ...pil, armL: arms, carry });
      X.box(2.6, 0.04, 1.9, VERM, 19.2, T + 0.02, 309.2);
      person(X, 18.3, T + 0.06, 308.9, face(18.3, 308.9, 19.6, 309.4), { pose: 'kneel', coat: 0x3a628f, armR: [1.0, 0.1, 0.9] });
      person(X, 20.1, T + 0.06, 308.8, face(20.1, 308.8, CX, 326), { pose: 'kneel', robe: true, coat: 0x9a4a3a, sash: 0xe8c66a });
      person(X, 19.4, T + 0.06, 310, face(19.4, 310, CX, 326), { pose: 'kneel', coat: 0x5a6a4a, armL: [2.0, 0.3] });
      X.ball(0.16, INK, 19.2, T + 0.2, 309.2, 1, 0.8, 1, 0);
      X.box(0.4, 0.24, 0.3, TIMBER, 19.7, T + 0.06, 309.6);
      lanternAt(-4.6, 315.4);
      // pines cling to the rock
      for (const [px, pz, b] of [[-1.5, 327, 0.55], [21.5, 328, 0.5], [2.5, 336, 0.9], [17, 337, 0.88]]) matsu(P, px, y0 + HT * b - 0.5, pz, 6 + Q() * 2.5, Q, { pads: 3 });
    }

    // ---------------- the water wheel at Onden: a long flume, a slow wheel, sacks going up, washing going on
    {
      const wx = 36.7,
        wz = 247.3,
        gy = H(wx, wz),
        r = 3.1,
        wy = gy + 2.9;
      const WB = new Builder();
      for (const sx of [-0.42, 0.42]) {
        for (let k = 0; k < 16; k++) {
          const a0 = (k / 16) * 6.283,
            a1 = ((k + 1) / 16) * 6.283;
          beam(WB, [sx, Math.cos(a0) * r, Math.sin(a0) * r], [sx, Math.cos(a1) * r, Math.sin(a1) * r], 0.16, 0.26, k % 2 ? WOOD : 0xa07e52);
        }
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * 6.283;
          beam(WB, [sx, 0, 0], [sx, Math.cos(a) * (r - 0.1), Math.sin(a) * (r - 0.1)], 0.1, 0.12, WOOD_D);
        }
      }
      for (let k = 0; k < 16; k++) WB.add(new THREE.BoxGeometry(1.0, 0.6, 0.06), 0xc9a878, xf(0, 0, 0, 0, 1, 1, 1, ((k + 0.5) / 16) * 6.283, 0).multiply(xf(0, r - 0.05, 0)));
      WB.add(new THREE.CylinderGeometry(0.2, 0.2, 2.8, 8), TIMBER, xf(-0.6, 0, 0, 0, 1, 1, 1, 0, Math.PI / 2));
      const wm = WB.mesh(flat({ scale: 0.5, objSpace: 1, side: THREE.DoubleSide }));
      wm.name = 'prints';
      wm.position.set(wx, wy, wz);
      S.add(wm);
      this.wheel = wm;
      // its bearing out in the stream, and the mill it turns
      for (const sz of [-1.3, 1.3]) rod(X, [wx + 0.85, gy - 0.4, wz + sz], [wx + 0.8, wy + 0.1, wz], 0.14, 0.11, TIMBER, 5);
      X.box(0.4, 0.3, 0.5, TIMBER, wx + 0.8, wy - 0.15, wz);
      minka(32.4, 248.2, Math.PI, 5, 5.4, { h: 2.9 });
      // the flume, down from where the stream runs higher
      const A = [30.6, Math.max(wy + r + 1.2, H(30.6, 272) + 0.35), 272],
        Bq = [wx, wy + r + 0.4, wz + 1.7];
      beam(X, A, Bq, 0.9, 0.1, WOOD);
      for (const sx of [-0.45, 0.45]) beam(X, [A[0] + sx, A[1] + 0.2, A[2]], [Bq[0] + sx, Bq[1] + 0.2, Bq[2]], 0.08, 0.4, WOOD_D);
      beam(X, [A[0], A[1] + 0.14, A[2]], [Bq[0], Bq[1] + 0.14, Bq[2]], 0.7, 0.04, PALE);
      for (const t of [0.14, 0.3, 0.46, 0.62, 0.78, 0.93]) {
        const px = lerp(A[0], Bq[0], t),
          py = lerp(A[1], Bq[1], t),
          pz = lerp(A[2], Bq[2], t),
          g = H(px, pz);
        if (py - g < 0.6) continue;
        for (const sx of [-1, 1]) rod(X, [px + sx * (0.5 + (py - g) * 0.12), g - 0.3, pz], [px + sx * 0.4, py - 0.05, pz], 0.09, 0.07, TIMBER, 4);
        X.box(1.3, 0.14, 0.16, TIMBER, px, py - 0.2, pz);
      }
      beam(X, [Bq[0], Bq[1] + 0.1, Bq[2]], [wx, wy + r * 0.92, wz + 0.75], 0.62, 0.06, FOAM, { emissive: 0.3 });
      // men carrying sacks up to the mill, women washing in the stream, a boy looking on
      person(X, 31.2, H(31.2, 243.3), 243.3, face(31.2, 243.3, 31.6, 246), { coat: 0x3a628f, legs: SKIN, hat: 'cloth', carry: 'sack', lean: 0.35, stride: 0.2, armR: [2.6, 0.1, 1.2] });
      person(X, 29.6, H(29.6, 240.6), 240.6, face(29.6, 240.6, 31.2, 243.3), { coat: 0x8a6a48, legs: SKIN, carry: 'sack', lean: 0.4, stride: -0.2, armR: [2.6, 0.1, 1.2] });
      for (const [px, pz, c2] of [[35.1, 240.7, 0x9a4a3a], [34.9, 238.5, 0x7f9aa8]]) person(X, px, H(px, pz), pz, Math.PI / 2, { pose: 'kneel', robe: true, coat: c2, hat: 'cloth', lean: 0.55, armL: [1.0, 0.1], armR: [1.0, 0.1] });
      X.cyl(0.42, 0.36, 0.3, WOOD, 35.2, H(35.2, 239.6) + 0.02, 239.6, 8);
      person(X, 34, H(34, 243.8), 243.8, face(34, 243.8, wx, wz), { s: 0.6, coat: 0x5a6a4a, legs: SKIN, armR: [1.9, 0.3] });
      solid(wx, wz, 1.2, gy + 5.5);
    }

    // ---------------- Nihonbashi: the arched bridge where the road meets the stream, shoulder to shoulder with porters
    {
      const bx = 45,
        bz = 221,
        half = 8,
        rise = 2.3,
        wd = 4.2,
        N = 14;
      const yb = Math.max(H(bx - half, bz), H(bx + half, bz)) + 0.12;
      const arc = (u) => yb + rise * (1 - u * u);
      for (let i = 0; i < N; i++) {
        const u0 = (i / N) * 2 - 1,
          u1 = ((i + 1) / N) * 2 - 1;
        beam(X, [bx + u0 * half, arc(u0), bz], [bx + u1 * half, arc(u1), bz], wd, 0.24, i % 2 ? WOOD : 0xc9a878);
        deck(bx + u0 * half, bx + u1 * half, bz - wd / 2, bz + wd / 2, arc((u0 + u1) / 2) + 0.14);
      }
      for (const sz of [-1, 1]) {
        const rz = bz + sz * (wd / 2 - 0.12);
        for (let i = 0; i <= N; i += 2) {
          const u = (i / N) * 2 - 1,
            x = bx + u * half,
            y = arc(u);
          X.box(0.2, 1.15, 0.2, WOOD_D, x, y, rz);
          X.ball(0.15, 0x6a7a5a, x, y + 1.3, rz, 1, 1.3, 1, 0);
          if (i < N) {
            const u2 = ((i + 2) / N) * 2 - 1;
            for (const hh of [0.5, 0.95]) beam(X, [x, y + hh, rz], [bx + u2 * half, arc(u2) + hh, rz], 0.1, 0.12, WOOD_D);
          }
        }
      }
      for (const u of [-0.55, 0, 0.55]) {
        const x = bx + u * half;
        for (const sz of [-1.5, 1.5]) rod(X, [x, H(x, bz + sz) - 0.6, bz + sz], [x, arc(u) - 0.1, bz + sz * 0.9], 0.2, 0.17, TIMBER, 6);
        X.box(0.24, 0.24, 3.6, TIMBER, x, arc(u) - 0.5, bz);
      }
      for (const sx of [-1, 1]) X.box(1.8, 1.2, wd + 1.4, STONE, bx + sx * (half + 0.4), yb - 1.05, bz);
      const loads = ['pack', 'pole', 'basket', undefined, 'bundle', 'sack', 'pole', undefined];
      const hats = ['cone', 'none', 'cloth', 'cone', 'flat', 'none'];
      for (let i = 0; i < 15; i++) {
        const u = -0.88 + (i / 14) * 1.76,
          robe = i % 5 === 3;
        person(X, bx + u * half, arc(u) + 0.14, bz + (((i * 2) % 3) - 1) * 1.2 + (Q() - 0.5) * 0.3, ((i % 2 ? 1 : -1) * Math.PI) / 2, {
          coat: CLOTH[i % CLOTH.length],
          legs: i % 3 ? 0x3a4a5a : SKIN,
          hat: robe ? 'none' : hats[i % hats.length],
          carry: robe ? undefined : loads[i % loads.length],
          robe,
          lean: robe ? 0.05 : 0.14,
          stride: 0.16,
          s: 0.88 + Q() * 0.08,
        });
      }
      // a white-walled storehouse on the bank, bales stacked at its door
      const kx = 55.4,
        kz = 213.4,
        ky = spanY(kx, kz, 4.6, 6)[1] + 0.05;
      X.box(4.6, 1.1, 6, 0x4a5560, kx, ky - 0.3, kz);
      X.box(4.5, 2.5, 5.9, 0xf3ecd8, kx, ky + 0.8, kz);
      X.gable(5.6, 6.8, 1.7, 0x35424f, kx, ky + 3.3, kz);
      X.box(0.1, 1.5, 1.0, 0x1d2a44, kx - 2.3, ky + 0.8, kz);
      X.box(0.7, 0.6, 0.1, INK, kx, ky + 2.5, kz - 3.0);
      wall(kx, kz, 2.5, 3.2, 0, ky + 5);
      maps.blob(kx, kz, 5, 0.4);
      for (const [ox, oy] of [[-0.7, 0], [0, 0], [0.7, 0], [-0.35, 0.6], [0.35, 0.6], [0, 1.2]]) X.cyl(0.33, 0.33, 0.95, oy === 0.6 ? THATCH_D : THATCH, 57.6 + ox, H(57.6, 217.6) + 0.33 + oy, 217.2, 7, undefined, undefined, Math.PI / 2, 0);
      lanternAt(35.6, 218.2);
    }

    // ---------------- the timber yard at Honjo Tatekawa: stacked high, sawn by hand
    {
      const sx = 68,
        sz = 211,
        sy = H(sx, sz),
        LAY = 14,
        th = 0.44;
      for (let l = 0; l < LAY; l++)
        for (let k = 0; k < 5; k++) {
          const o = (k - 2) * 1.02,
            col = mix(0xdcc48c, 0xb8935a, Q());
          if (l % 2) X.box(4.9, th - 0.03, 0.9, col, sx, sy + l * th, sz + o);
          else X.box(0.9, th - 0.03, 4.9, col, sx + o, sy + l * th, sz);
        }
      const top = sy + LAY * th;
      wall(sx, sz, 2.5, 2.5, 0, top);
      deck(sx - 2.5, sx + 2.5, sz - 2.5, sz + 2.5, top);
      // one man up on the stack catching, one below throwing, a board in the air between them
      person(X, sx + 1.5, top, sz + 0.9, face(sx + 1.5, sz + 0.9, 73, 212.6), { coat: 0x3a628f, legs: SKIN, hat: 'cloth', armL: [2.5, 0.25], armR: [2.5, 0.25], lean: 0.25 });
      person(X, 73, H(73, 212.6), 212.6, face(73, 212.6, sx + 1.5, sz + 0.9), { coat: 0x8a6a48, legs: SKIN, armL: [2.7, 0.2], armR: [2.7, 0.2], lean: -0.15 });
      beam(X, [72.3, sy + 3.0, 212.4], [70.9, sy + 5.3, 212.0], 0.5, 0.06, WOOD_L);
      // the sawyer on his propped beam, and his mate setting a blade below
      const gy = H(80, 212.5);
      const p0 = [77.3, gy + 0.3, 212.5],
        p1 = [83.2, gy + 3.7, 212.5];
      beam(X, p0, p1, 0.34, 1.15, 0xdcc48c);
      rod(X, [81.7, gy - 0.3, 211.5], [82.5, gy + 3.5, 213.3], 0.1, 0.08, TIMBER, 5);
      rod(X, [81.7, gy - 0.3, 213.5], [82.5, gy + 3.5, 211.7], 0.1, 0.08, TIMBER, 5);
      const sp = [lerp(p0[0], p1[0], 0.5), lerp(p0[1], p1[1], 0.5) + 0.66, 212.5];
      const sw = person(X, sp[0], sp[1], sp[2], -Math.PI / 2, { coat: 0x2f548a, legs: SKIN, hat: 'cloth', lean: 0.55, armL: [0.9, -0.1], armR: [0.9, -0.1], stride: 0.15 });
      beam(X, [sw.handR.x, sw.handR.y + 0.1, 212.5], [sw.handR.x - 0.75, sw.handR.y - 1.5, 212.5], 0.03, 0.42, 0x9aa4a6);
      person(X, 79.4, gy + 0.05, 209.8, 2.6, { pose: 'sit', seat: 0.4, coat: 0x5a6a4a, legs: SKIN, hat: 'none', lean: 0.45, armL: [0.9, 0.1], armR: [0.9, 0.1] });
      X.box(0.7, 0.36, 0.5, WOOD_D, 79.4, gy, 209.6);
      beam(X, [78.9, gy + 0.62, 210.5], [80.1, gy + 0.62, 210.1], 0.4, 0.03, 0x9aa4a6);
      // poles stood on end against a rail
      const ry0 = H(90.2, 211);
      for (const px of [86.9, 93.6]) rod(X, [px, ry0 - 0.4, 211], [px, ry0 + 5.2, 211], 0.14, 0.12, TIMBER, 5);
      rod(X, [86.6, ry0 + 5, 211], [93.9, ry0 + 5, 211], 0.09, 0.09, TIMBER, 5);
      for (let k = 0; k < 28; k++) {
        const px = 87.2 + k * 0.235,
          side = k % 2 ? 1 : -1;
        rod(X, [px, ry0 - 0.2, 211 + side * (1.0 + Q() * 0.5)], [px + (Q() - 0.5) * 0.2, ry0 + 6.4 + Q() * 2.4, 211 - side * 0.12], 0.075, 0.04, mix(0xdcc890, 0xb8a060, Q()), 4);
      }
      wall(90.2, 211, 3.5, 1.5, 0, ry0 + 5);
      // boards laid up to season, and logs waiting at the water's edge
      for (const [px, pz, ry] of [[74.6, 208.3, 0.1], [76.2, 215.6, -0.2], [85.4, 215.8, 0.15], [64.6, 215.4, 1.4]]) {
        const y = H(px, pz);
        for (let l = 0; l < 6; l++) X.box(3.7 - (l % 2) * 0.2, 0.09, 0.95, mix(0xdcc48c, 0xc0a068, Q()), px + (Q() - 0.5) * 0.12, y + 0.08 + l * 0.14, pz, ry);
      }
      for (let k = 0; k < 6; k++) {
        const x0 = 63.5 + k * 3.3,
          z0 = 205.4 - (k % 2) * 0.9;
        const ly = Math.max(H(x0 + 2.2, z0), 0.8) + 0.25; // resting on the sand, not sunk in it
        rod(X, [x0, ly, z0], [x0 + 4.4, ly, z0 + (Q() - 0.5) * 0.6], 0.3, 0.26, mix(0xb08a58, 0x8a6a48, Q()), 6);
      }
      person(X, 76.5, H(76.5, 211.5), 211.5, 1.2, { coat: 0x4a5560, legs: 0x3a4a5a, sash: 0xcdbb98, armL: [0.9, -0.5, 1.6], armR: [0.9, -0.5, 1.6] });
      const cp = person(X, 85.6, H(85.6, 213), 213, -1.9, { coat: 0x7f9aa8, legs: SKIN, hat: 'cloth', stride: 0.2, lean: 0.12, armR: [2.5, 0.1, 1.0] });
      beam(X, [cp.handR.x - 1.6, cp.handR.y + 0.12, cp.handR.z + 0.6], [cp.handR.x + 1.5, cp.handR.y + 0.02, cp.handR.z - 0.55], 0.3, 0.05, WOOD_L);
      maps.blob(sx, sz, 6, 0.4);
    }

    // ---------------- Hodogaya on the Tokaido: the mountain seen between roadside pines, and who passes under them
    {
      for (let k = 0; k < 9; k++) {
        const x = 103 + k * 5.6 + (Q() - 0.5) * 1.2,
          z = 216.7 + (Q() - 0.5) * 0.7;
        matsu(P, x, H(x, z), z, 9.5 + Q() * 3, Q, { pads: 3 });
        solid(x, z, 0.45, H(x, z) + 5);
        maps.blob(x, z, 3.2, 0.3);
      }
      // a palanquin and its two bearers
      const kx = 116,
        kz = 219.7,
        ky = H(kx, kz);
      rod(X, [kx - 2.1, ky + 1.36, kz], [kx + 2.1, ky + 1.36, kz], 0.05, 0.05, WOOD_D, 4);
      X.box(1.25, 0.85, 0.85, 0xcdb880, kx, ky + 0.36, kz);
      X.box(1.5, 0.07, 1.05, THATCH_D, kx, ky + 1.44, kz);
      for (const ox of [-0.58, 0.58]) for (const oz of [-0.38, 0.38]) rod(X, [kx + ox, ky + 1.2, kz + oz], [kx + ox, ky + 1.44, kz + oz], 0.02, 0.02, TIMBER, 3);
      X.ball(0.17, SKIN, kx + 0.05, ky + 1.02, kz, 1, 1.05, 1, 1);
      X.ball(0.175, HAIR, kx + 0.02, ky + 1.07, kz, 1.03, 0.85, 1.03, 0);
      for (const ox of [-1.8, 1.8]) person(X, kx + ox, ky, kz + 0.23, Math.PI / 2, { coat: ox < 0 ? 0x3a628f : 0x5a6a4a, legs: SKIN, hat: 'cloth', lean: 0.12, stride: ox < 0 ? 0.2 : -0.2, armR: [2.4, 0.1, 1.0] });
      // a loaded horse, its rider and the groom who leads it
      const hx = 128,
        hz = 219.7,
        hy = H(hx, hz);
      horse(X, hx, hy, hz, Math.PI / 2, { load: 0xcdbb98 });
      person(X, hx - 0.05, hy + 1.98, hz, Math.PI / 2, { pose: 'kneel', coat: 0x4a5560, hat: 'cone', armL: [0.7, 0.1], armR: [0.7, 0.1] });
      const gr = person(X, hx + 2.4, H(hx + 2.4, hz + 0.5), hz + 0.5, Math.PI / 2, { coat: 0x8a6a48, legs: SKIN, hat: 'cone', stride: 0.2, lean: 0.1, armL: [-0.5, 0.2] });
      rod(X, [gr.handL.x, gr.handL.y, gr.handL.z], [hx + 1.44, hy + 1.56, hz], 0.012, 0.012, TIMBER, 3);
      // a flute-monk under his reed hood, and two travellers going the other way
      const km = person(X, 140, H(140, 220.4), 220.4, -Math.PI / 2, { robe: true, coat: 0x4a5560, sash: 0xe9dfc6, hat: 'basket', armL: [1.0, -0.2, 1.3], armR: [1.0, -0.2, 1.3] });
      rod(X, [km.handR.x, km.handR.y - 0.3, km.handR.z + 0.1], [km.handR.x + 0.1, km.handR.y + 0.25, km.handR.z + 0.1], 0.025, 0.02, WOOD_L, 4);
      person(X, 107.4, H(107.4, 220.3), 220.3, -Math.PI / 2, { coat: 0x2f548a, legs: 0xe2d6b4, hat: 'cone', carry: 'pack', stride: 0.2, lean: 0.1, staff: true });
      person(X, 105.8, H(105.8, 219.3), 219.3, -Math.PI / 2, { robe: true, coat: 0x7f9aa8, sash: 0x9a4a3a, hat: 'flat', carry: 'bundle', lean: 0.06 });
      X.box(0.42, 1.2, 0.32, STONE, 100.6, H(100.6, 217.2) - 0.1, 217.2, 0.2);
      for (let k = 0; k < 3; k++) jizo(153.4 + k * 0.75, 217.4, Math.PI);
    }

    // ---------------- Ejiri in Suruga: a sudden wind on the path through the reeds
    {
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
      this.papers = { pos, base: pos.array.slice(), sheets, from: [w0[0], w0[1] + 1.2, w0[2]] };
      // until the first tick every sheet is folded to nothing at the place the wind takes them from
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, w0[0], w0[1] + 1.2, w0[2]);
    }

    // ---------------- the Sazai hall: a broad balcony, and everyone on it looking the same way
    {
      const hx = 150,
        F = H(hx, 292) + 0.3;
      const lo = spanY(hx, 292, 14, 8)[0];
      X.box(14.4, F - lo + 0.6, 8.4, STONE_D, hx, lo - 0.6, 292);
      X.box(14, 4.4, 8, 0xe9dfc6, hx, F, 292);
      for (let k = 0; k <= 6; k++) X.box(0.28, 4.4, 0.28, TIMBER, 143 + k * 2.333, F, 287.95);
      for (let k = 0; k < 6; k++) if (k !== 2 && k !== 3) X.box(1.7, 2.5, 0.08, 0xf6e6b8, 144.17 + k * 2.333, F + 0.5, 287.94, 0, { emissive: 0.5 });
      X.box(4.3, 2.9, 0.08, 0x3a2a1e, hx, F, 287.94);
      X.box(14.3, 0.3, 0.3, TIMBER, hx, F + 4.1, 287.9);
      X.hip(12.6, 18.6, 4.2, (px, py) => mix(0x2c3848, 0x4a5a6a, clamp(py / 4.2)), hx, F + 4.4, 292, Math.PI / 2, undefined, undefined, 0.55);
      X.box(10.8, 0.4, 0.6, INK, hx, F + 8.5, 292);
      wall(hx, 292, 7.2, 4.2, 0, F + 8.6);
      // the balcony, out over the slope on tall posts
      X.box(19.5, 0.3, 8.5, WOOD, 149.25, F - 0.3, 283.75);
      X.box(3.5, 0.3, 8, WOOD, 141.25, F - 0.3, 292);
      for (let k = 1; k < 7; k++) X.box(19.5, 0.02, 0.07, WOOD_D, 149.25, F, 279.5 + k * 1.21);
      deck(139.5, 159, 279.5, 288, F + 0.02);
      deck(139.5, 143, 288, 296, F + 0.02);
      for (const px of [140, 143.8, 147.6, 151.4, 155.2, 158.6]) {
        for (const pz of [279.9, 283.7, 287.6]) {
          const g = H(px, pz);
          X.box(0.34, F - 0.3 - g + 0.5, 0.34, TIMBER, px, g - 0.5, pz);
        }
        X.box(0.2, 0.22, 7.9, TIMBER, px, F - 1.3, 283.75);
        beam(X, [px, H(px, 279.9) + 0.9, 279.9], [px, F - 0.5, 283.7], 0.16, 0.16, TIMBER);
      }
      for (const [pz, dy] of [[279.9, 1.7], [279.9, 3.3], [283.7, 1.7]]) X.box(18.8, 0.22, 0.2, TIMBER, 149.3, F - dy, pz);
      for (let x = 139.6; x <= 159; x += 1.76) X.box(0.16, 1.05, 0.16, TIMBER, x, F, 279.6);
      for (const hh of [0.5, 0.98]) X.box(19.5, 0.1, 0.12, TIMBER, 149.25, F + hh, 279.6);
      for (let z = 281.3; z <= 288; z += 1.68) X.box(0.16, 1.05, 0.16, TIMBER, 158.9, F, z);
      for (const hh of [0.5, 0.98]) X.box(0.12, 0.1, 8.4, TIMBER, 158.9, F + hh, 283.8);
      for (let z = 281.3; z <= 290; z += 1.74) X.box(0.16, 1.05, 0.16, TIMBER, 139.6, F, z);
      for (const hh of [0.5, 0.98]) X.box(0.12, 0.1, 10.4, TIMBER, 139.6, F + hh, 284.8);
      wall(149.25, 279.6, 9.75, 0.15, 0, F + 1.0, F - 0.4);
      wall(158.9, 283.8, 0.15, 4.2, 0, F + 1.0, F - 0.4);
      wall(139.6, 284.8, 0.15, 5.2, 0, F + 1.0, F - 0.4);
      // visitors: pointing, shading their eyes, resting with their bundles
      const fy = F + 0.02;
      person(X, 146.2, fy, 280.5, toFuji(146.2, 280.5), { coat: 0x2f548a, legs: 0xe2d6b4, hatBack: true, armR: [1.5, 0.2] });
      person(X, 147.7, fy, 280.7, toFuji(147.7, 280.7) + 0.1, { coat: 0x8a6a48, legs: 0x3a4a5a, hat: 'cone', armL: [2.0, 0.1, 1.9] });
      person(X, 151.6, fy, 280.35, toFuji(151.6, 280.35), { coat: 0x5a6a4a, legs: SKIN, lean: 0.4, armL: [1.15, 0.15], armR: [1.15, 0.15] });
      person(X, 154.6, fy, 282.2, toFuji(154.6, 282.2), { pose: 'kneel', coat: 0x4a5560, hat: 'none' });
      person(X, 155.9, fy, 282.7, toFuji(155.9, 282.7) - 0.4, { pose: 'kneel', robe: true, coat: 0x9a4a3a, sash: 0xe8c66a, armR: [1.5, 0.3] });
      X.ball(0.3, 0x5f8a7a, 153.3, fy + 0.22, 282.4, 1.2, 0.75, 1, 0);
      X.add(new THREE.ConeGeometry(0.42, 0.22, 8, 1, true), 0xd9c28a, xf(153.2, fy + 0.11, 283.3));
      person(X, 143.3, fy, 281.3, toFuji(143.3, 281.3), { robe: true, coat: 0x7f9aa8, sash: 0x2f548a, armR: [0.5, 0.5] });
      person(X, 144.1, fy, 280.8, toFuji(144.1, 280.8), { s: 0.55, coat: 0x9a4a3a, legs: SKIN, armR: [1.7, 0.2] });
      person(X, 141.2, fy, 290.8, Math.PI / 2, { coat: 0xe9e2cc, legs: 0xe9e2cc, hat: 'cone', carry: 'pack', staff: true });
      person(X, 149.2, fy, 286.9, Math.PI, { robe: true, coat: 0x6f7670, hat: 'cloth', hatCol: SKIN, armL: [1.2, -0.25, 0.6], armR: [1.2, -0.25, 0.6] });
      lanternAt(137.6, 293.2);
      glow(hx, F + 2.2, 287.6, 2.2);
    }

    // ---------------- the tea plantation of Katakura: clipped rows along the hill, pickers between them
    {
      for (let r = 0; r < 7; r++) {
        const zc = 273.5 + r * 4.2,
          x0 = 86 + (r % 2) * 2,
          x1 = 127 - (r % 3) * 2;
        const n = Math.round((x1 - x0) / 1.4);
        const zAt = (x) => zc + Math.sin(x * 0.11 + r) * 1.1;
        P.parts.push(
          gridGeo(
            n,
            4,
            (a, b, i) => {
              const x = lerp(x0, x1, a),
                th = b * Math.PI,
                zz = zAt(x);
              const bump = (0.78 + 0.22 * Math.abs(Math.sin(i * 1.05))) * Math.min(1, Math.sin(a * Math.PI) * 6 + 0.25);
              return [x, H(x, zz) - 0.15 + Math.sin(th) * 1.1 * bump, zz - Math.cos(th) * 0.95 * bump];
            },
            (a, b, i, j) => new THREE.Color(j === 1 || j === 2 ? (i % 2 ? 0x6f9a5a : 0x7fa866) : 0x4f7a4a),
            { sway: 0.04 }
          )
        );
        if (r < 6) {
          const px = 91 + ((r * 13) % 31),
            pz = zAt(px) + 2.1;
          person(X, px, H(px, pz), pz, r % 2 ? Math.PI : 0, { robe: true, coat: CLOTH[(r * 2 + 1) % CLOTH.length], sash: 0x9a4a3a, hat: 'cloth', lean: 0.45, armL: [0.9, 0.15], armR: [0.9, 0.15], carry: 'basket' });
        }
      }
      const sy = minka(130.6, 277.5, Math.PI, 4.6, 4, { lit: false });
      for (const [bx, bz] of [[127.4, 274.6], [128.3, 274.2], [127.8, 275.4]]) rod(X, [bx, H(bx, bz) - 0.1, bz], [bx, H(bx, bz) + 0.55, bz], 0.3, 0.4, 0xc9a86a, 7);
      const px = 122,
        pz = 270.6;
      person(X, px, H(px, pz), pz, Math.PI / 2, { coat: 0x3a628f, legs: SKIN, hat: 'cone', carry: 'pole', load: 0x86aa66, stride: 0.2, lean: 0.12, armR: [2.3, 0.1, 1.2] });
      horse(X, 131.5, H(131.5, 271.4), 271.4, -1.2, { load: 0x86aa66, col: 0x6a5240 });
      person(X, 130.2, H(130.2, 272.4), 272.4, 2.2, { coat: 0x8a6a48, legs: SKIN, hat: 'cone', armR: [1.2, 0.2] });
      void sy;
    }

    // ---------------- vermilion gates climbing to a hill shrine
    {
      const [A, Bq] = STAIR;
      const ry = Math.atan2(Bq[0] - A[0], Bq[1] - A[1]);
      const cs = Math.cos(ry),
        sn = Math.sin(ry);
      for (let i = 0; i < 40; i++) {
        const t = (i + 0.5) / 40,
          x = lerp(A[0], Bq[0], t),
          z = lerp(A[1], Bq[1], t);
        const top = H(x, z + 0.5) + 0.12;
        X.box(2.5, 0.5, 1.12, i % 2 ? STONE : 0xa8a89c, x, top - 0.5, z, ry);
        deck(x - 1.3, x + 1.3, z - 0.56, z + 0.56, top);
      }
      for (let i = 0; i < 20; i++) {
        const t = (i + 0.35) / 20,
          x = lerp(A[0], Bq[0], t),
          z = lerp(A[1], Bq[1], t),
          y = H(x, z) + 0.15;
        toriiGate(X, x, y, z, ry, 1 + (i === 0 || i === 19 ? 0.18 : 0));
        for (const s of [-1.15, 1.15]) solid(x + s * cs, z - s * sn, 0.22, y + 3);
      }
      // the shrine at the top
      const sx = 71.8,
        sz = 315,
        [slo, shi] = spanY(sx, sz, 4.8, 4.4);
      const py = shi + 0.15;
      X.box(4.8, py - slo + 0.6, 4.4, STONE, sx, slo - 0.6, sz);
      for (let k = 0; k < 4; k++) X.box(2.2, 0.4, 0.5, STONE_D, sx, py - (k + 1) * 0.36 - 0.4 + 0.36, sz - 2.45 - k * 0.5);
      X.box(2.6, 2.0, 2.2, 0xe9dfc6, sx, py, sz + 0.5);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) X.box(0.2, 2.0, 0.2, VERM, sx + a * 1.3, py, sz + 0.5 + b * 1.1);
      X.box(2.9, 0.16, 2.5, VERM, sx, py + 2.0, sz + 0.5);
      X.gable(3.8, 4.2, 1.3, 0x35424f, sx, py + 2.16, sz + 0.3, Math.PI / 2);
      X.box(4.4, 0.18, 0.3, INK, sx, py + 3.4, sz + 0.3);
      X.box(1.1, 1.3, 0.06, 0x7a2f2a, sx, py + 0.3, sz - 0.62);
      X.box(0.9, 0.5, 0.5, WOOD_D, sx, py, sz - 1.5);
      rod(X, [sx - 1.3, py + 1.85, sz - 0.9], [sx + 1.3, py + 1.85, sz - 0.9], 0.06, 0.06, THATCH, 5);
      for (const ox of [-0.7, 0, 0.7]) X.box(0.16, 0.3, 0.03, FOAM, sx + ox, py + 1.5, sz - 0.9, 0, { sway: 0.3 });
      wall(sx, sz, 2.4, 2.2, 0, py);
      wall(sx, sz + 0.5, 1.5, 1.3, 0, py + 3.4);
      deck(sx - 2.4, sx + 2.4, sz - 2.2, sz + 2.2, py);
      lanternAt(68.6, 311.4);
      lanternAt(75.2, 311.8);
      person(X, sx, py, sz - 1.95, 0, { robe: true, coat: 0x3a628f, sash: 0xe8c66a, lean: 0.25, armL: [1.3, -0.3, 0.9], armR: [1.3, -0.3, 0.9] });
      const [vx, vz] = [lerp(A[0], Bq[0], 0.42), lerp(A[1], Bq[1], 0.42)];
      person(X, vx, H(vx, vz + 0.5) + 0.12, vz, ry, { coat: 0x5a6a4a, legs: 0xe2d6b4, hat: 'cone', lean: 0.25, stride: 0.2, staff: true });
      lanternAt(62.3, 263.4);
    }

    // ---------------- the bamboo grove on the way up to the falls
    {
      let k = 0,
        guard = 0;
      while (k < 64 && guard++ < 1500) {
        const x = -39 + Q() * 27,
          z = 267.5 + Q() * 31;
        if (segDist(x, z, -5, 262, -6, 280) < 2.4 || segDist(x, z, -6, 280, -7, 298) < 2.4 || near(x, z, 0.7)) continue;
        const y = H(x, z);
        bamboo(P, x, y, z, 9 + Q() * 5.5, Q);
        solid(x, z, 0.2, y + 6);
        if (z < 280) maps.blob(x, z, 2, 0.25);
        k++;
      }
      for (let i = 0; i < 7; i++) {
        const x = -34 + Q() * 20,
          z = 270 + Q() * 26;
        P.add(new THREE.ConeGeometry(0.16, 0.5, 5, 1, true), 0x8a6a48, xf(x, H(x, z) + 0.2, z));
      }
      const wx = -15.5,
        wz = 284;
      person(X, wx, H(wx, wz), wz, 2.4, { coat: 0x5a6a4a, legs: SKIN, hat: 'cloth', carry: 'basket', lean: 0.5, armL: [0.8, 0.1], armR: [0.8, 0.1] });
      for (let i = 0; i < 5; i++) jizo(-8.3 - i * 0.12, 262.5 + i * 0.85, Math.PI / 2);
      lanternAt(-9.2, 299);
      // a traveller with his pack partway up
      person(X, -6.4, H(-6.4, 290), 290, 0, { coat: 0x2f548a, legs: 0xe2d6b4, hat: 'cone', carry: 'pack', lean: 0.2, stride: 0.2, staff: true });
    }

    // ---------------- a tea house on the road: banners out, travellers resting with the mountain in view
    {
      const tx = -50,
        tz = 222,
        w = 9,
        d = 5;
      const [lo, hi] = spanY(tx, tz, w, d);
      const fy = hi + 0.4;
      X.box(w - 0.4, fy - lo + 0.1, d - 0.4, 0x6a5a48, tx, lo - 0.3, tz);
      X.box(w, 0.22, d, WOOD, tx, fy - 0.22, tz);
      for (const px of [-4.35, -1.45, 1.45, 4.35]) for (const pz of [-2.4, 2.4]) X.box(0.2, 2.9, 0.2, TIMBER, tx + px, fy, tz + pz);
      X.box(w - 0.2, 2.7, 0.12, 0xe2d6b4, tx, fy, tz + 2.4);
      for (const sx of [-4.4, 4.4]) X.box(0.12, 2.7, 2.5, 0xe2d6b4, tx + sx, fy, tz + 1.2);
      for (const pz of [-2.4, 2.4]) X.box(w + 0.3, 0.2, 0.2, TIMBER, tx, fy + 2.75, tz + pz);
      X.hip(d + 3.2, w + 2.8, 2.5, thatch, tx, fy + 2.9, tz - 0.4, Math.PI / 2, undefined, undefined, 0.5);
      X.box((w + 2.8) * 0.5 + 0.5, 0.22, 0.55, THATCH_D, tx, fy + 5.32, tz - 0.4);
      for (let k = -2; k <= 2; k++) X.box(1.55, 0.75, 0.05, k % 2 ? 0x243a6a : INDIGO, tx + k * 1.72, fy + 1.95, tz - 2.46, 0, { sway: 0.5 });
      X.box(1.3, 0.75, 0.9, 0x8a6a48, tx + 3.2, fy, tz + 1.5);
      X.box(0.5, 0.3, 0.06, 0xffb060, tx + 3.2, fy + 0.15, tz + 1.02, 0, { emissive: 1 });
      X.ball(0.22, INK, tx + 3.2, fy + 0.95, tz + 1.5, 1, 0.8, 1, 0);
      X.box(0.4, 0.55, 0.4, 0xffd58a, tx + 4.35, fy + 1.3, tz - 2.75, 0, { emissive: 1 });
      glow(tx + 4.35, fy + 1.6, tz - 2.9);
      maps.lamp(tx + 4.35, tz - 3.2, 7, 0xffc878, 0.7);
      wall(tx, tz + 2.4, 4.5, 0.2, 0, fy + 2.7);
      for (const sx of [-4.4, 4.4]) wall(tx + sx, tz + 1.2, 0.2, 1.3, 0, fy + 2.7);
      deck(tx - 4.5, tx + 4.5, tz - 2.5, tz + 2.5, fy);
      maps.blob(tx, tz, 8, 0.4);
      // benches under red felt, a big paper umbrella, banners on tall poles
      for (const bx of [tx - 2.5, tx + 2.3]) {
        const by = H(bx, tz - 3.9);
        X.box(2.3, 0.08, 0.9, WOOD, bx, by + 0.4, tz - 3.9);
        X.box(2.1, 0.03, 0.8, VERM, bx, by + 0.48, tz - 3.9);
        for (const a of [-1, 1]) for (const b of [-0.35, 0.35]) X.box(0.1, 0.4, 0.1, WOOD_D, bx + a, by, tz - 3.9 + b);
      }
      const ux = tx - 5.9,
        uz = tz - 3.5,
        uy = H(ux, uz);
      rod(X, [ux, uy - 0.2, uz], [ux, uy + 2.9, uz], 0.05, 0.04, TIMBER, 4);
      X.add(new THREE.ConeGeometry(1.7, 0.55, 10, 1, true), VERM, xf(ux, uy + 2.75, uz));
      for (const [bx, c1, c2] of [[tx + 5.8, INDIGO, FOAM], [tx + 7.1, 0xe9dfc6, VERM], [tx - 7.6, 0xe9dfc6, INDIGO]]) {
        const bz = tz - 4.0,
          by = H(bx, bz);
        rod(X, [bx, by - 0.3, bz], [bx, by + 4.9, bz], 0.045, 0.035, TIMBER, 4);
        X.box(0.85, 0.05, 0.05, TIMBER, bx + 0.4, by + 4.6, bz);
        X.box(0.72, 2.8, 0.03, c1, bx + 0.43, by + 1.25, bz, 0, { sway: 0.7 });
        X.box(0.72, 0.52, 0.035, c2, bx + 0.43, by + 4.05, bz, 0, { sway: 0.7 });
      }
      // the people of the house and of the road
      person(X, tx + 0.6, fy, tz - 1.7, Math.PI, { robe: true, coat: 0x9a4a3a, sash: INDIGO, armL: [1.1, 0.1], armR: [1.1, 0.1] });
      X.box(0.45, 0.04, 0.3, INK, tx + 0.6, fy + 0.98, tz - 2.2);
      const by = H(tx - 2.5, tz - 3.9) + 0.1;
      person(X, tx - 3.1, by, tz - 3.85, Math.PI, { pose: 'sit', coat: 0x3a628f, legs: 0xe2d6b4, hatBack: true, armR: [1.2, 0.1, 1.5] });
      person(X, tx - 2.0, by, tz - 3.85, Math.PI - 0.2, { pose: 'sit', coat: 0x5a6a4a, legs: SKIN, hat: 'cone' });
      person(X, tx + 2.4, H(tx + 2.4, tz - 3.9) + 0.1, tz - 3.85, toFuji(tx + 2.4, tz - 3.85), { pose: 'sit', coat: 0x8a6a48, legs: 0x3a4a5a, armR: [1.5, 0.2] });
      person(X, tx - 0.9, fy, tz - 2.1, Math.PI, { pose: 'sit', seat: 0.02, robe: true, coat: 0x7f9aa8, sash: 0xcdbb98 });
      person(X, tx + 5.2, H(tx + 5.2, tz - 6), tz - 6, -Math.PI / 2 + 0.3, { coat: 0x2f548a, legs: 0xe2d6b4, hat: 'cone', carry: 'pack', stride: 0.2, staff: true });
    }

    // ---------------- cranes on the shore, as at Umezawa
    for (const [x, z, ry, pose, s] of [[-74, 203.2, 0.4, 0, 1], [-71.4, 205.1, 2.1, 1, 0.95], [-69, 202.5, -0.6, 0, 1.05], [-66.2, 204.5, 1.2, 2, 1], [-63.4, 203, 3.0, 1, 1], [-60.8, 205.5, 0.2, 0, 0.95], [-58.5, 202.6, -1.4, 0, 1], [-67.6, 200.7, 0.9, 1, 1], [-72.8, 201, -2.2, 2, 1.05]]) crane(X, x, H(x, z), z, ry, pose, s);

    // ---------------- nets drying on the beach, and the people who mend them
    {
      for (const [nx, nz, ry] of [[-101, 204.6, 0.2], [-93, 207.6, -0.25]]) {
        const M = xf(nx, H(nx, nz), nz, ry);
        for (const sx of [-2.6, 2.6]) rod(X, [sx, -0.3, 0], [sx, 2.5, 0], 0.07, 0.06, WOOD_D, 4, undefined, M);
        rod(X, [-2.9, 2.45, 0], [2.9, 2.45, 0], 0.045, 0.045, WOOD_D, 4, undefined, M);
        for (const sz of [-1, 1]) beam(X, [0, 2.45, 0], [0, 0.1, sz * 1.5], 5.0, 0.03, sz > 0 ? 0x4a6a80 : 0x5f8298, { sway: 0.15 }, M);
      }
      person(X, -97.4, H(-97.4, 205.9), 205.9, 2.4, { pose: 'kneel', coat: 0x3a628f, hat: 'cloth', lean: 0.4, armL: [0.9, 0.1], armR: [0.9, 0.1] });
      person(X, -89.6, H(-89.6, 210.6), 210.6, 0.3, { coat: 0x5a6a4a, legs: SKIN, hat: 'cone', carry: 'pole', stride: 0.2, lean: 0.12, armR: [2.3, 0.1, 1.2] });
      for (const [bx, bz] of [[-98.6, 207.3], [-97.7, 207.9], [-104.5, 206.6]]) rod(X, [bx, H(bx, bz) - 0.05, bz], [bx, H(bx, bz) + 0.5, bz], 0.26, 0.36, 0xc9a86a, 7);
      const by = H(-107, 208.6);
      X.box(5.2, 0.75, 1.5, 0xd9c690, -107, by + 0.05, 208.6, 0.9);
      X.box(5.5, 0.12, 1.7, 0x8a6a48, -107, by + 0.8, 208.6, 0.9);
    }

    // ---------------- the drum bridge at Kameido, and wisteria on its trellis
    {
      const cx = -134,
        cz = 229.5;
      const yp = H(cx, cz + 1.6),
        lo = H(cx, cz - 2.6) - 0.6;
      X.box(11.6, yp - lo, 5.2, STONE, cx, lo, cz);
      X.box(9.6, 0.07, 4.2, PALE, cx, yp - 0.03, cz);
      for (const [ox, oz, r0] of [[-2.6, 0.9, 0.5], [2.9, -0.8, 0.65], [0.4, 1.2, 0.4]]) X.add(new THREE.RingGeometry(r0, r0 + 0.14, 12, 1), MIDBLUE, xf(cx + ox, yp + 0.06, cz + oz, 0, 1, 1, 1, -Math.PI / 2, 0));
      deck(cx - 5.8, cx + 5.8, cz - 2.6, cz + 2.6, yp + 0.04);
      const half = 4.7,
        rise = 3,
        N = 12;
      const Rr = (half * half + rise * rise) / (2 * rise),
        th0 = Math.asin(half / Rr);
      const pt = (k) => {
        const th = lerp(-th0, th0, k / N);
        return [cx + Rr * Math.sin(th), yp + 0.1 + Rr * Math.cos(th) - (Rr - rise), cz];
      };
      for (let k = 0; k < N; k++) {
        const a = pt(k),
          b = pt(k + 1);
        beam(X, a, b, 2.3, 0.16, k % 2 ? WOOD : 0xc9a878);
        deck(Math.min(a[0], b[0]), Math.max(a[0], b[0]), cz - 1.15, cz + 1.15, Math.max(a[1], b[1]) + 0.08);
      }
      for (const sz of [-1.08, 1.08])
        for (let k = 0; k <= N; k++) {
          const a = pt(k);
          X.box(0.13, 0.85, 0.13, k % 3 === 0 ? TIMBER : WOOD_D, a[0], a[1], cz + sz);
          if (k % 3 === 0) X.ball(0.11, 0x6a7a5a, a[0], a[1] + 0.95, cz + sz, 1, 1.3, 1, 0);
          if (k < N) {
            const b = pt(k + 1);
            beam(X, [a[0], a[1] + 0.82, cz + sz], [b[0], b[1] + 0.82, cz + sz], 0.09, 0.09, WOOD_D);
          }
        }
      for (const k of [3, 9]) {
        const a = pt(k);
        for (const sz of [-0.9, 0.9]) X.box(0.2, a[1] - yp, 0.2, TIMBER, a[0], yp, cz + sz);
        X.box(0.16, 0.16, 2.2, TIMBER, a[0], yp + (a[1] - yp) * 0.55, cz);
      }
      // the trellis, heavy with flower
      const tx0 = -145,
        tx1 = -137,
        tz0 = 223.7,
        tz1 = 225.9;
      const ty = spanY(-141, 224.8, 8, 2.2)[1] + 2.6;
      for (const x of [tx0, -141, tx1]) for (const z of [tz0, tz1]) X.box(0.16, ty - H(x, z) + 0.3, 0.16, TIMBER, x, H(x, z) - 0.3, z);
      for (const z of [tz0, tz1]) X.box(8.6, 0.12, 0.12, TIMBER, -141, ty, z);
      for (let x = tx0; x <= tx1 + 0.01; x += 1) X.box(0.08, 0.08, 2.7, WOOD_D, x, ty + 0.1, 224.8);
      for (let i = 0; i < 56; i++) {
        const len = 0.6 + Q() * 0.9;
        P.add(new THREE.ConeGeometry(0.13, len, 4, 1, true), (px, py) => mix(0x7a78b8, 0xdcd6ee, clamp(py / len + 0.5)), xf(tx0 + Q() * 8, ty - len / 2 - 0.02, tz0 + Q() * 2.2, Q() * 6, 1, 1, 1, Math.PI, 0), { sway: (px, py) => (py / len + 0.5) * 0.9 });
      }
      for (let i = 0; i < 7; i++) P.add(new THREE.IcosahedronGeometry(0.9 + Q() * 0.4, 0), i % 2 ? 0x6f9a5a : 0x86aa66, xf(tx0 + 0.6 + i * 1.15, ty + 0.3, 224.8 + (Q() - 0.5) * 1.2, Q() * 6, 1, 0.3, 1.2), { sway: 0.2 });
      rod(P, [-141.6, H(-141.6, 226.1) - 0.2, 226.1], [-141.2, ty, 225.6], 0.14, 0.08, 0x6a4a36, 5);
      // people crossing, people looking
      const top = pt(6);
      person(X, top[0] - 0.5, top[1] + 0.08, cz + 0.3, toFuji(top[0], cz), { robe: true, coat: 0x9a4a3a, sash: 0xe8c66a, armR: [1.4, 0.3] });
      person(X, top[0] + 0.7, top[1] + 0.08, cz - 0.2, toFuji(top[0], cz) + 0.3, { coat: 0x3a628f, legs: 0xe2d6b4, hat: 'cone' });
      person(X, -140.3, H(-140.3, 226.6), 226.6, 2.6, { robe: true, coat: 0x7f9aa8, sash: 0x9a4a3a, lean: -0.1, armR: [2.4, 0.2] });
      person(X, -139.4, H(-139.4, 227), 227, 2.9, { s: 0.55, coat: 0x5a6a4a, legs: SKIN, armL: [2.2, 0.3] });
      lanternAt(-141.2, 230.2);
      // where the road crosses the stream: a plain slab bridge and a way-stone, as at Nakahara
      const sy = H(-131.4, 220.1);
      X.box(4.8, 0.3, 4.6, STONE, -131.4, sy - 0.04, 220.1);
      deck(-133.8, -129, 217.8, 222.4, sy + 0.26);
      for (const a of [-1, 1]) for (const b of [-1, 1]) X.box(0.24, 0.7, 0.24, STONE_D, -131.4 + a * 2.2, sy, 220.1 + b * 2.1);
      X.box(0.4, 1.1, 0.3, STONE, -135.6, H(-135.6, 222.6) - 0.1, 222.6, 0.3);
      person(X, -130.6, sy + 0.26, 220.4, -Math.PI / 2, { coat: 0x4a5560, legs: SKIN, hat: 'cone', carry: 'pole', stride: 0.2, lean: 0.1, armR: [2.3, 0.1, 1.2] });
    }

    // ---------------- rice terraces west and east, planters bent over the water
    const planters = (list, n) => {
      const big = list.filter((f) => f.d > 2.6).sort((a, b) => b.d * b.w - a.d * a.w);
      for (let i = 0; i < Math.min(n, big.length); i++) {
        const f = big[(i * 3) % big.length];
        for (let k = 0; k < 2; k++) {
          const x = f.x + (k - 0.5) * 2.2 + (Q() - 0.5) * 0.6,
            z = f.z + (Q() - 0.5) * (f.d - 1.4);
          person(X, x, f.y - 0.12, z, Math.PI + (Q() - 0.5) * 0.5, { coat: pick([0x2f548a, 0x3a628f, 0x7f9aa8, 0x9a4a3a]), legs: SKIN, hat: 'cone', lean: 1.2, armL: [0.25, 0.08], armR: [0.25, 0.08] });
        }
      }
    };
    planters(fields(-222, -160, 229, 262, 8.9, 'rice'), 4);
    planters(fields(181, 227, 229.5, 259, 9.2, 'rice'), 2);
    planters(fields(144, 162, 250, 270, 9, 'rice'), 1);
    fields(1, 15, 231, 243, 7, 'veg');
    fields(-88, -67, 245, 265, 7, 'veg');
    fields(95, 112, 240, 258, 8.5, 'veg');
    // racks of cut rice, farmhouses above the fields
    const hasa = (x, z, ry) => {
      const M = xf(x, H(x, z), z, ry);
      for (const sx of [-1.8, 1.8]) rod(X, [sx, -0.2, 0], [sx, 1.9, 0], 0.05, 0.04, WOOD_D, 4, undefined, M);
      rod(X, [-2.1, 1.8, 0], [2.1, 1.8, 0], 0.04, 0.04, WOOD_D, 4, undefined, M);
      X.box(3.7, 1.15, 0.3, (px, py) => mix(THATCH_D, 0xdcc880, clamp(py / 1.15 + 0.5)), 0, 0.62, 0, 0, undefined, M);
    };
    for (const [x, z, ry] of [[-176, 265.4, 0.1], [-198, 264.6, -0.15], [203, 262.6, 0.1], [154, 272.6, 0.2]]) hasa(x, z, ry);
    minka(-190, 271.5, Math.PI + 0.15, 7.5, 5.2);
    minka(-168.5, 279.5, Math.PI - 0.2, 6, 4.6);
    minka(210, 267.5, Math.PI - 0.15, 7, 5);
    minka(178, 273, Math.PI + 0.2, 6, 4.6);
    minka(166.5, 262, Math.PI + 0.4, 5.2, 4.2, { lit: false });

    // ---------------- Kajikazawa: the fisherman out on his rock, lines fanned to the water
    {
      const base = [-175.5, 200.5],
        tip = [-168.5, 185.5],
        N = 7;
      const rockCol = (px, py) => mix(0x2f5068, 0x86a8a0, clamp(py * 0.5 + 0.5));
      let prev = 1.4;
      for (let k = 0; k < N; k++) {
        const t = k / (N - 1);
        const x = lerp(base[0], tip[0], t),
          z = lerp(base[1], tip[1], t);
        const top = lerp(1.7, 5.4, Math.pow(t, 0.8)),
          rad = lerp(4.6, 2.4, t),
          bot = Math.min(H(x, z), 0) - 1.4;
        X.add(new THREE.IcosahedronGeometry(1, 1), rockCol, xf(x + (Q() - 0.5) * 0.8, (top + bot) / 2 - 0.1, z, Q() * 6, rad, ((top - bot) / 2) * 1.02, rad * 0.9));
        X.cyl(rad * 0.6, rad * 0.72, 0.4, k % 2 ? 0x7f9a6a : 0x6f8a5a, x, top - 0.36, z, 7);
        deck(x - rad * 0.55, x + rad * 0.55, z - rad * 0.55, z + rad * 0.55, top + 0.04);
        if (k) solid(x, z, rad * 0.5, prev - 0.05);
        prev = top;
      }
      // the lip that hangs out over the water
      X.add(new THREE.IcosahedronGeometry(1, 1), rockCol, xf(tip[0] + 1.0, 3.9, tip[1] - 1.6, 0.4, 2.0, 1.6, 2.6, 0.5, 0));
      X.cyl(1.3, 1.6, 0.36, 0x7f9a6a, tip[0] + 0.8, 5.08, tip[1] - 1.7, 7);
      deck(tip[0] - 0.5, tip[0] + 2.1, tip[1] - 3, tip[1] - 0.4, 5.48);
      const fx = tip[0] + 1.1,
        fz = tip[1] - 2.4;
      const ends = [[-181, 174.8], [-178.4, 172.8], [-175.6, 171.3], [-172.7, 170.4], [-169.8, 170.1]];
      const f = person(X, fx, 5.46, fz, face(fx, fz, -175.6, 171.3), { coat: 0x2f548a, legs: SKIN, hat: 'cloth', lean: 0.8, stride: 0.12, armR: [0.75, 0.05], armL: [0.3, 0.1] });
      for (const [ex, ez] of ends) rod(X, [f.handR.x, f.handR.y, f.handR.z], [ex, 0.05, ez], 0.02, 0.02, TIMBER, 3);
      for (const [ex, ez] of ends) X.ball(0.5, FOAM, ex, 0.15, ez, 1.3, 0.35, 1, 0);
      // the boy with the basket behind him
      person(X, tip[0] - 0.6, 5.44, tip[1] + 0.6, 2.4, { s: 0.62, pose: 'kneel', coat: 0x5a6a4a, lean: 0.3, armL: [0.8, 0.1], armR: [0.8, 0.1] });
      rod(X, [tip[0] + 0.3, 5.42, tip[1] + 1.1], [tip[0] + 0.3, 5.95, tip[1] + 1.1], 0.24, 0.34, 0xc9a86a, 7);
      for (let k = 0; k < 9; k++) {
        const a = -2.2 + k * 0.5;
        X.ball(0.7 + Q() * 0.5, FOAM, tip[0] + 0.6 + Math.cos(a) * (3.4 + Q()), 0.2, tip[1] - 1 + Math.sin(a) * (3.4 + Q()), 1.3, 0.5, 1, 0);
      }
      // a fisherman's hut and boat up the beach from the rock
      minka(-206, 213.5, Math.PI - 0.3, 5, 4, { h: 2.2, lit: false });
      const by = H(-199.5, 208.5);
      X.box(5.6, 0.75, 1.5, 0xd9c690, -199.5, by + 0.05, 208.5, -0.5);
      X.box(5.9, 0.12, 1.7, 0x8a6a48, -199.5, by + 0.8, 208.5, -0.5);
      person(X, -202.6, H(-202.6, 210.4), 210.4, 0.6, { coat: 0x4a5560, legs: SKIN, hat: 'cone', carry: 'basket' });
    }

    // ---------------- Mishima Pass: three travellers with their arms about a cedar too big to measure
    {
      const cx = -150,
        cz = 292.5,
        gy = H(cx, cz),
        TH = 66;
      const rAt = (y) => 2.6 * (1 - 0.8 * (y / TH)) + 1.1 * Math.exp(-y / 1.8);
      X.parts.push(
        gridGeo(
          14,
          7,
          (a, b) => {
            const yy = b * b * (TH + 1.5) - 1.5,
              an = a * 6.283,
              r = rAt(Math.max(yy, 0));
            return [cx + Math.cos(an) * r, gy + yy, cz + Math.sin(an) * r];
          },
          (a, b, i) => new THREE.Color(i % 2 ? 0xa4603c : 0x7c4830)
        )
      );
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + 0.4;
        rod(X, [cx + Math.cos(a) * 2.5, gy + 2.2, cz + Math.sin(a) * 2.5], [cx + Math.cos(a) * 5.4, H(cx + Math.cos(a) * 5.4, cz + Math.sin(a) * 5.4) - 0.3, cz + Math.sin(a) * 5.4], 0.6, 0.22, 0x7c4830, 5);
      }
      solid(cx, cz, 3.0, gy + 30);
      // its own weather of branches, far overhead
      for (let k = 0; k < 9; k++) {
        const y = gy + 25 + k * 4.4,
          spread = 9.5 - k * 0.85;
        for (let j = 0; j < 3; j++) {
          const a = k * 1.9 + j * 2.09 + Q() * 0.5,
            d = spread * (0.45 + Q() * 0.2),
            br = spread * (0.42 + Q() * 0.12);
          rod(P, [cx, y - 0.6, cz], [cx + Math.cos(a) * d, y - 0.8, cz + Math.sin(a) * d], 0.3, 0.16, 0x7c4830, 4);
          P.add(new THREE.IcosahedronGeometry(br, 1), (px, py) => mix(0x21453a, 0x4a8062, clamp((py / br) * 0.5 + 0.5)), xf(cx + Math.cos(a) * d, y - 1 - Q() * 0.8, cz + Math.sin(a) * d, Q() * 6, 1, 0.3, 1), { sway: 0.1 });
        }
      }
      P.add(new THREE.ConeGeometry(3.2, 9, 7, 1, true), 0x2f5a48, xf(cx, gy + TH + 1.5, cz), { sway: 0.15 });
      // the three who try to span it, seen from behind
      const r1 = rAt(1.2) + 0.3;
      [-0.5, 0, 0.5].forEach((a, i) => {
        const x = cx + Math.sin(a) * r1,
          z = cz + Math.cos(a) * r1;
        person(X, x, H(x, z), z, a + Math.PI, { coat: [0x2f548a, 0x8a6a48, 0x5a6a4a][i], legs: i === 1 ? SKIN : 0xe2d6b4, hat: i === 1 ? 'cloth' : 'none', hatBack: i !== 1, lean: 0.1, armL: [0.3, 1.42], armR: [0.3, 1.42] });
      });
      // the rest of the party: one craning up at it, one sitting with his pipe, their loads set down
      let px = cx + 5.6,
        pz = cz + 5.2;
      person(X, px, H(px, pz), pz, face(px, pz, cx, cz), { coat: 0x4a5560, legs: 0xe2d6b4, hat: 'cone', hatTilt: -0.5, lean: -0.3, armL: [2.1, 0.1, 1.9], staff: true });
      px = cx - 5.4;
      pz = cz + 5.8;
      X.box(0.9, 0.42, 0.6, STONE_D, px, H(px, pz) - 0.05, pz - 0.1, 0.4);
      person(X, px, H(px, pz) + 0.08, pz, 0.6, { pose: 'sit', seat: 0.42, coat: 0x7f9aa8, legs: SKIN, hat: 'cloth', armR: [1.3, 0.1, 1.6] });
      X.box(0.5, 0.45, 0.36, 0x5a6a4a, px + 1.1, H(px + 1.1, pz + 0.5), pz + 0.5, 0.5);
      X.add(new THREE.ConeGeometry(0.42, 0.22, 8, 1, true), 0xd9c28a, xf(px + 1.7, H(px + 1.7, pz - 0.3) + 0.12, pz - 0.3));
      horse(X, cx + 9, H(cx + 9, cz + 8.6), cz + 8.6, -1.9, { load: 0x8a6a48, col: 0x6a5240 });
      person(X, cx + 7.2, H(cx + 7.2, cz + 9.4), cz + 9.4, -1.7, { coat: 0x3a628f, legs: SKIN, hat: 'cone', lean: 0.1 });
      // the spring the west stream starts from, and stones across it
      for (let k = 0; k < 5; k++) X.ball(0.8 + Q() * 0.6, k % 2 ? 0x5a7a80 : 0x86a08a, -126 + Math.cos(k * 1.3) * 1.6, H(-126, 297) + 0.2, 297.2 + Math.sin(k * 1.3) * 1.3, 1, 0.7, 1, 0);
      for (let k = 0; k < 3; k++) X.cyl(0.45, 0.5, 0.3, STONE, -125.7 - k * 0.95, H(-126.6, 287.6) - 0.05, 287 + k * 0.75, 6);
    }

    // ---------------- the hills: cryptomeria, pine, a hut here and there, so no slope stands empty
    minka(-100, 296, Math.PI + 0.2, 6, 4.6);
    minka(-58, 303, Math.PI - 0.25, 5.4, 4.2, { lit: false });
    minka(41, 297, Math.PI + 0.3, 6, 4.6);
    minka(101, 311, Math.PI - 0.1, 6.4, 4.8);
    minka(196, 284, Math.PI + 0.1, 5.6, 4.4, { lit: false });
    minka(-34, 318, Math.PI + 0.35, 5, 4, { lit: false });
    for (const [x, z] of [[-96, 292.4], [-54.6, 300.6], [44.6, 294], [105, 307.6], [-30.6, 315]]) {
      // split wood stacked by the door
      const y = H(x, z);
      for (let l = 0; l < 3; l++) X.box(1.5 - l * 0.3, 0.26, 0.7, l % 2 ? 0xb89668 : 0xa07e52, x, y - 0.05 + l * 0.26, z, 0.3);
    }
    // a charcoal burner's smoke above the trees
    for (let k = 0; k < 4; k++) X.ball(0.8 + k * 0.45, 0xf6ecd4, -61.5 + k * 0.7, H(-61.5, 306.5) + 2.2 + k * 1.7, 306.5, 1.2, 0.8, 1, 1, { emissive: 0.5, sway: 1.5 });
    X.ball(1.3, 0x6a5a48, -61.5, H(-61.5, 306.5) + 0.2, 306.5, 1, 0.75, 1, 1);
    // the hut under two pines on its point, as at Lake Suwa
    minka(214, 210.4, Math.PI + 0.4, 4.4, 3.6, { h: 2.1, lit: false });
    for (const [x, z, h] of [[217.6, 208.2, 11], [219.2, 211.2, 8.5]]) {
      matsu(P, x, H(x, z), z, h, Q, { pads: 4 });
      solid(x, z, 0.4, H(x, z) + 5);
    }
    const tree = (r) => (x, y, z) => {
      const h = 9 + Q() * 9;
      sugi(P, x, y, z, h, Q);
      solid(x, z, 0.5, y + h * 0.5);
      if (z < 279) maps.blob(x, z, r, 0.3);
    };
    grove(40, -122, -38, 284, 334, tree(3));
    grove(16, -204, -152, 264, 304, tree(3));
    grove(20, 26, 62, 268, 332, tree(3));
    grove(24, 76, 138, 302, 334, tree(3));
    grove(26, 156, 226, 258, 304, tree(3));
    grove(18, -44, 62, 336, 352, tree(3));
    grove(10, -146, -100, 262, 284, tree(3));
    const pines = (x, y, z) => {
      const h = 7 + Q() * 5;
      matsu(P, x, y, z, h, Q);
      solid(x, z, 0.45, y + h * 0.5);
      maps.blob(x, z, 3, 0.3);
    };
    grove(7, -228, -110, 203, 217, pines, 5, 1.35);
    grove(5, 96, 228, 203, 216, pines, 5, 1.35);
    grove(12, -220, 220, 262, 330, pines, 5);
    grove(
      16,
      -165,
      176,
      226,
      270,
      (x, y, z) => {
        const h = 4.5 + Q() * 2.5;
        leafy(P, x, y, z, h, Q, Q() < 0.3 ? { lo: 0xb8863a, hi: 0xe8c66a } : {});
        solid(x, z, 0.35, y + 2.5);
        maps.blob(x, z, 2.6, 0.3);
      },
      4.5
    );
    // way-stones and stone figures where the paths leave the road
    for (const [x, z, ry] of [[-20, 218.6, 1.2], [136.4, 223.4, -1.4], [59.8, 224.6, 1.5], [-124.4, 223.2, -1.5]]) jizo(x, z, ry);

    const show = (b, mat) => {
      const m = b.mesh(mat);
      m.name = 'prints';
      S.add(m);
    };
    show(GR, flat({ scale: 0.05, side: THREE.DoubleSide }));
    show(X, flat({ scale: 0.25, emissive: 1.5, side: THREE.DoubleSide }));
    show(P, flat({ scale: 0.2, side: THREE.DoubleSide }));
  }

  // 0 = an ordinary swell on a moving sea, 1 = the wave of the print
  applyRise(r) {
    const sy = lerp(0.17, 1, r);
    this.greatMesh.scale.set(lerp(0.55, 1, r), sy, 1);
    const u = this.greatMesh.material.uniforms;
    u.uPulse.value = 1 - r;
    u.uSurge.value.x = lerp(1.5, 3.4, r);
    this.wavePlat.y = 62 * sy;
    for (const c of this.waveCols) c.top = c.full * sy;
    this.spray.material.uniforms.uBoost.value = r;
  }
  onRestore(v) {
    this.applyRise(this.thumbMode ? 1 : v);
  }

  tick(dt, time) {
    this.applyRise(this.thumbMode ? 1 : smooth(0.05, 1, this.final));
    // the sea stays pale until the final block is printed
    this.seaMat.uniforms.uDeep.value.copy(this.seaPale).lerp(this.seaDeep, this.final);
    this.seaMat.uniforms.uShallow.value.set(0xb9cfd0).lerp(new THREE.Color(MIDBLUE), this.final);
    for (const f of this.flocks) f.m.rotation.y = time * f.sp + f.ph;
    for (const b of this.boats) {
      b.m.position.y = Math.sin(time * 0.8 + b.ph) * 0.45 - 0.1;
      b.m.rotation.z = Math.sin(time * 0.7 + b.ph) * 0.07;
      b.m.rotation.x = Math.cos(time * 0.6 + b.ph) * 0.05;
    }
    // the mill wheel at Onden turns under its flume
    if (this.wheel) this.wheel.rotation.x = -time * 0.55;
    // Ejiri: every sheet of paper (and the two hats) rides the same gust, each tumbling its own way
    if (this.papers) {
      const { pos, base, sheets, from } = this.papers;
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
  }
}
