import * as THREE from 'three';
import { paintMaterial } from '../../engine/paint.js';
import { Builder, terrain, ribbon, patch, mountainRing, mix } from '../../engine/build.js';
import { fbm, vnoise, smooth, clamp, lerp } from '../../engine/gl.js';
import { FIELD } from './palette.js';
import { townWeight, townLevel, inTown } from './town/layout.js';

// The lie of the land: how high it stands, where the water is cut into it, where the roads
// and footpaths run and what ground is spoken for, the fields, and the hills on the horizon.

export const WL = -5; // water level of the canal and of the Rhône
export const BRIDGE_X = 26.5;
// the middle of the land: the valley floor lies within about 430 m of it, then climbs to the Alpilles
export const CENTER = [10, -120];

// the canal runs east-west north of the village and widens into the river
export function channel(x) {
  const t = smooth(40, 64, x);
  const e = smooth(-64, -46, x) * (1 - smooth(108, 124, x));
  return { e, zc: -123 - 11 * t, hw: (4.5 + 13.5 * t) * e, bk: 4 + 3 * t };
}
export function riverAt(x, z) {
  if (x < -64 || x > 124 || z < -178 || z > -90) return null;
  const c = channel(x);
  if (c.e <= 0) return null;
  const d = Math.abs(z - c.zc);
  c.carve = (1 - smooth(c.hw, c.hw + c.bk, d)) * smooth(0, 0.25, c.e);
  c.lev = (1 - smooth(c.hw + c.bk, c.hw + c.bk + 16, d)) * c.e;
  return c;
}

// the land rolls, lies flat under the village and on a terrace under the asylum, heaps up into
// the cypress hill, levels out into the plain the town stands on beyond the river, and climbs
// towards the mountains at the rim
export function heightAt(x, z) {
  const hill = 17 * Math.exp(-((x + 24) ** 2 + (z - 72) ** 2) / (2 * 22 * 22));
  const roll = (fbm(x * 0.011 + 3.1, z * 0.011 + 7.7, 3) - 0.5) * 17;
  const flatV = smooth(60, 104, Math.hypot(x - 8, z + 30));
  const flatA = smooth(26, 48, Math.hypot(x - 80, z - 46));
  const far = smooth(430, 760, Math.hypot(x - CENTER[0], z - CENTER[1])) * 90;
  let h = roll * flatV * flatA + far + hill * flatA + (1 - flatA) * 1.2;
  const tw = townWeight(x, z);
  if (tw > 0) h = lerp(h, townLevel(x, z) + far, tw);
  // the canal and the Rhône: a low levee, the bed cut into it, and a rise where the drawbridge lands
  const rv = riverAt(x, z);
  if (rv) {
    const bump = Math.exp(-((x - BRIDGE_X) ** 2) / 40);
    h = lerp(h, Math.max(h, WL + 0.8 + 1.3 * bump), rv.lev);
    h = lerp(h, WL - 1, rv.carve);
  }
  return h;
}

// ---------------- roads
export const ROADS = [
  { pts: [[-4, 96], [-5, 72], [-2, 46], [1, 22], [6, -4], [10, -30]], w: 5.2 },
  { pts: [[10, -30], [-8, -32], [-42, -35], [-70, -30], [-104, -18]], w: 4.6 },
  { pts: [[10, -30], [30, -31], [62, -28], [92, -34]], w: 4.6 },
  { pts: [[32, -31], [36.5, -48], [33, -68], [25, -90], [26, -112]], w: 4.2 }, // north to the drawbridge, round the café and the church
  { pts: [[6, -4], [-10, -3], [-32, -9], [-50, -6]], w: 3.6 },
  { pts: [[6, -6], [24, -6], [48, 4], [62, 26], [76, 40]], w: 3.8 },
];
// footpaths of my own, kept apart from the cobbled roads
export const TRACKS = [
  { pts: [[-2, 83], [10, 89], [24, 99], [50, 104], [76, 102], [90, 90], [104, 82]], w: 2.6 }, // through the sunflowers to the orchard
  { pts: [[26, -110], [26.5, -116]], w: 3.4 }, // down to the drawbridge
  { pts: [[26.5, -131], [29, -142], [42, -156], [62, -162], [86, -162], [102, -158]], w: 2.8 }, // the far bank of the Rhône
  { pts: [[92, -34], [100, -33], [108, -30], [128, -29], [150, -27]], w: 2.4 }, // into the vineyard
  { pts: [[-56, -34], [-57, -50], [-63, -62], [-71, -79], [-71.9, -81.8]], w: 2.4 }, // past the haystacks to the sower's field
  // Wheatfield with Crows: three red tracks forking into the corn
  { pts: [[-103, -18], [-118, -21], [-127, -17], [-138, -22]], w: 2.6, red: 1 },
  { pts: [[-103, -18], [-112, -29], [-116, -40], [-126, -49]], w: 2.4, red: 1 },
  { pts: [[-103, -18], [-112, -8], [-122, -3], [-130, 6]], w: 2.4, red: 1 },
];
// ground reserved for a landmark: the scattered trees stay out of it  [x0, x1, z0, z1]
export const KEEP = [
  [16, 30.5, -49, -34.5], // café terrace
  [18.5, 30.7, -28.2, -17.4], // the Yellow House
  [2.5, 17.5, -73, -40.5], // the church
  [23, 82, 83, 126], // sunflowers
  [86, 126, 63, 101], // almond orchard
  [105, 152, -53, -7], // red vineyard
  [-110, -66, -113, -79], // the sower's field
  [-82, -58, -80, -54], // haystacks
  [18, 36, -138, -106], // drawbridge
];

// who is near a road or a footpath, and what ground is spoken for
export function ways() {
  const samples = [];
  for (const r of ROADS) {
    const c = new THREE.CatmullRomCurve3(r.pts.map((p) => new THREE.Vector3(p[0], 0, p[1])));
    for (const p of c.getSpacedPoints(Math.ceil(c.getLength() / 2))) samples.push([p.x, p.z, r.w]);
  }
  const nearRoad = (x, z, pad = 0) => samples.some((s) => (x - s[0]) ** 2 + (z - s[1]) ** 2 < (s[2] / 2 + pad) ** 2);
  // my footpaths, and the ground the new landmarks need. Trees that the old scatter puts there
  // are still rolled (so nothing else moves) but drawn into VOID.
  const tsamples = [];
  for (const t of TRACKS) {
    const c = new THREE.CatmullRomCurve3(t.pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5);
    for (const p of c.getSpacedPoints(Math.ceil(c.getLength() / 2))) tsamples.push([p.x, p.z, t.w]);
  }
  const nearTrack = (x, z, pad = 0) => tsamples.some((s) => (x - s[0]) ** 2 + (z - s[1]) ** 2 < (s[2] / 2 + pad) ** 2);
  const inKeep = (x, z, pad = 0) => KEEP.some((k) => x > k[0] - pad && x < k[1] + pad && z > k[2] - pad && z < k[3] + pad);
  const cleared = (x, z, pad = 0) => inKeep(x, z, pad) || (riverAt(x, z)?.carve ?? 0) > 0.02 || nearTrack(x, z, 2 + pad) || inTown(x, z, 14 + pad);
  const VOID = new Builder();
  return { nearRoad, nearTrack, inKeep, cleared, VOID };
}

// ---------------- ground: a patchwork of night fields
export function ground(world, { S, H, strokes, mats }) {
  const groundCol = (x, z, y) => {
    const wx = x + (vnoise(x * 0.02, z * 0.02) - 0.5) * 34,
      wz = z + (vnoise(x * 0.02 + 9, z * 0.02 + 4) - 0.5) * 34;
    const cx = Math.floor(wx / 46),
      cz = Math.floor(wz / 38);
    const hsh = vnoise(cx * 7.31 + 0.5, cz * 5.17 + 0.5);
    const c = new THREE.Color(FIELD[Math.floor(hsh * FIELD.length) % FIELD.length]);
    // hedges between fields
    const ex = Math.abs(((wx / 46) % 1 + 1) % 1 - 0.5),
      ez = Math.abs(((wz / 38) % 1 + 1) % 1 - 0.5);
    const edge = Math.max(ex, ez);
    if (edge > 0.465) c.lerp(new THREE.Color(0x122c40), 0.75);
    const dv = Math.hypot(x - 8, z + 30);
    c.lerp(new THREE.Color(0x245848), 1 - smooth(46, 70, dv)); // village green
    const far = smooth(400, 700, Math.hypot(x - CENTER[0], z - CENTER[1]));
    c.lerp(new THREE.Color(0x1c3f86), far * 0.6);
    // the town's own ground: gardens and yards between the houses
    c.lerp(new THREE.Color(0x1f5560), townWeight(x, z, 20) * 0.7);
    const rv = riverAt(x, z);
    if (rv) c.lerp(new THREE.Color(0x3a6a52), rv.lev * 0.45).lerp(new THREE.Color(0x14285a), rv.carve);
    return c;
  };
  const groundMat = paintMaterial({ stroke: strokes.oil, scale: 0.052, contrast: 0.55, hueVar: 0.75, warp: 0.85, accent: 0xb9c95a, accentAmt: 0.3, impasto: 0.1, rim: 0.05, band: 0.3 });
  const ground = new THREE.Mesh(terrain(H, 1000, 330, groundCol, 0.74, 2.2, CENTER[0], CENTER[1] - 10), groundMat);
  ground.frustumCulled = false;
  S.add(ground);

  // cobbles: lilac, rose and blue like a lamplit terrace
  const cob = (x, y, z) => mix(0x6c5fa6, 0xa57cb6, vnoise(x * 0.35, z * 0.35)).lerp(new THREE.Color(0x4a5cae), vnoise(x * 0.11 + 7, z * 0.11) * 0.5);
  const roadB = new Builder();
  for (const r of ROADS) roadB.parts.push(ribbon(r.pts, r.w, H, cob, { lift: 0.13, across: 4 }));
  roadB.parts.push(patch(10, -32, 15, H, cob, { lift: 0.15, wobble: 0.06 }));
  roadB.parts.push(patch(78, 44, 13, H, (x, y, z) => mix(0x9a8a6a, 0xc7b58a, vnoise(x * 0.3, z * 0.3)), { lift: 0.14, wobble: 0.1 }));
  S.add(roadB.mesh(mats.cobble));
}

// ---------------- the Alpilles
export function alpilles(world, { S, strokes }) {
  const prof = (a) => {
    const right = Math.exp(-((a - 0.75) ** 2) / 0.35);
    return 34 + right * 52 + Math.sin(a * 5.0 + 1.0) * 9 + Math.sin(a * 11.0) * 5 + fbm(a * 3.1, 2.2, 3) * 22;
  };
  const mcol = (x, y, z) => mix(0x16307a, 0x3f73c8, clamp((y + 5) / 95)).lerp(new THREE.Color(0x0c1a52), vnoise(x * 0.02, y * 0.08) * 0.4);
  // the same range as the painting's, set further back and proportionally higher now that the valley is wider
  const K = 3.0;
  const mg = mountainRing({ radius: 800, base: -30, profile: (a) => prof(a) * K, colorFn: (x, y, z) => mcol(x / K, y / K, z / K), depth: 220 });
  const mm = new THREE.Mesh(mg, paintMaterial({ stroke: strokes.wavy, scale: 0.006 / K, contrast: 0.85, hueVar: 0.5, warp: 0.2, accent: 0x8fc0f0, accentAmt: 0.35, rim: 0, band: 0.4, side: THREE.DoubleSide, wallStretch: 2.6, bigScale: 0.4, big: 0.9 }));
  mm.position.set(CENTER[0], 0, CENTER[1]);
  mm.frustumCulled = false;
  S.add(mm);
}
