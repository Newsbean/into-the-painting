import * as THREE from 'three';
import { glowPoints } from '../../engine/paint.js';
import { Builder, gridGeo } from '../../engine/build.js';
import { smooth, clamp, lerp } from '../../engine/gl.js';
import { PRUSSIAN, MIDBLUE, PALE, FOAM } from './palette.js';

// Every breaking wave on the sea: the great one, the swell in front of it and
// the crowd of smaller ones, with the spray and the footing on its shoulder.
// (How far the great wave has risen is applyRise() in index.js.)

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

// where the great wave stands
export const WX = -34,
  WZ = -4;

// ---------------- waves
export function addWaves(world, { R, S, flat }) {
  const WB = new Builder();
  // The great wave is its own piece. Until the print is finished it is just the
  // biggest swell on a living sea; with the last block it rears up into the picture.
  const GB = new Builder();
  const gl = buildWave(GB, R, { x: 0, z: 0, ry: 0, H: 66, len: 170, claws: 64, peak: 0.12 });
  const great = { crest: [gl.crest[0] + WX, gl.crest[1], gl.crest[2] + WZ], lip: [gl.lip[0] + WX, gl.lip[1], gl.lip[2] + WZ] };
  world.crest = great.crest;
  world.greatMesh = GB.mesh(flat({ scale: 0.04, contrast: 0.1, side: THREE.DoubleSide, surge: [1.5, 1, 0, 0.55], pulse: 1 }));
  world.greatMesh.position.set(WX, 0, WZ);
  S.add(world.greatMesh);
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
  world.spray = glowPoints(spray, 0);
  S.add(world.spray);
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
