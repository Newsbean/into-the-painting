import * as THREE from 'three';
import { waterMaterial } from '../../engine/paint.js';
import { Builder, terrain, ribbon, mountainRing, mix, xf } from '../../engine/build.js';
import { fbm, vnoise, smooth, clamp } from '../../engine/gl.js';
import { dust } from './palette.js';

// ---------------- land: umber and olive, cooling to blue-green with distance
export function buildLand(world, kit) {
  const { S, H, soft, strokes } = kit;
  const groundCol = (x, z, y) => {
    const n = vnoise(x * 0.025, z * 0.025);
    const c = mix(0x5a5a2c, 0x8a7a3c, n);
    c.lerp(new THREE.Color(0x3f5a3a), smooth(0.5, 0.85, vnoise(x * 0.01 + 7, z * 0.01)) * 0.7);
    if (y < 1.6) c.lerp(new THREE.Color(0x7a6a4a), 0.6);
    c.lerp(new THREE.Color(0x4a6a6a), smooth(160, 380, Math.hypot(x, z)) * 0.7);
    if (y > 30 && Math.hypot(x - 122, z + 44) < 60) c.lerp(new THREE.Color(0x6a6658), 0.8);
    return c;
  };
  S.add(new THREE.Mesh(terrain(H, 520, 250, groundCol, 0.7, 2.2, 0, -80), soft({ stroke: strokes.dab, scale: 0.12, contrast: 0.3, hueVar: 0.25, big: 0.7 })));

  const wg = new THREE.PlaneGeometry(1600, 1600, 40, 40);
  wg.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.soft, deep: 0x2f4a44, shallow: 0x5f8a7a, reflect: 0xb8c49a, glint: 0xfff0c0, scale: 0.05, glintAmt: 0.8, flow: 0.004 }));
  water.position.set(0, world.waterY, -80);
  S.add(water);
}

// ---------------- roads that wind the way his do
// Returns what the later parts need to keep clear of them: { roadSamples, nearRoad }.
export function buildRoads(world, kit) {
  const { S, H, soft, strokes } = kit;
  const roadA = [[-12, -10], [-30, -34], [-12, -66], [-36, -98], [-72, -104], [-98, -128], [-118, -144]];
  const roadB = [[-12, -66], [20, -98], [44, -116], [80, -122], [104, -108], [116, -72], [120, -56]];
  const roadC = [[0, 24], [2, 46], [-10, 74], [18, 104]];
  const RB = new Builder();
  for (const r of [roadA, roadC]) RB.parts.push(ribbon(r, 4.4, H, dust, { lift: 0.14, across: 4 }));
  RB.parts.push(ribbon(roadB.slice(0, 3), 4.2, H, dust, { lift: 0.14, across: 4 }));
  RB.parts.push(ribbon(roadB.slice(3), 4.2, H, dust, { lift: 0.14, across: 4 }));
  S.add(RB.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.36 })));
  const roadSamples = [];
  for (const r of [roadA, roadB, roadC]) {
    const c = new THREE.CatmullRomCurve3(r.map((p) => new THREE.Vector3(p[0], 0, p[1])));
    for (const p of c.getSpacedPoints(60)) roadSamples.push([p.x, p.z]);
  }
  const nearRoad = (x, z, d = 5) => roadSamples.some((s) => (s[0] - x) ** 2 + (s[1] - z) ** 2 < d * d);
  return { roadSamples, nearRoad };
}

// ---------------- the far rocks
// the fantastical rocks of his backgrounds
export function buildFarRocks(world, kit) {
  const { S, H, R, soft } = kit;
  const RK = new Builder();
  for (let i = 0; i < 46; i++) {
    const a = R() * 6.283,
      d = 190 + R() * 280;
    const x = Math.cos(a) * d,
      z = -80 + Math.sin(a) * d;
    const hh = 40 + R() * 110,
      rr = 8 + R() * 16;
    const geo = new THREE.CylinderGeometry(rr * 0.12, rr, hh, 6, 5);
    const p = geo.attributes.position;
    const sd = R() * 90;
    for (let k = 0; k < p.count; k++) {
      const t = p.getY(k) / hh + 0.5;
      p.setX(k, p.getX(k) * (1 + (vnoise(p.getY(k) * 0.08 + sd, k * 0.7) - 0.5) * 0.9) + Math.sin(t * 3 + sd) * rr * 0.25 * t);
      p.setZ(k, p.getZ(k) * (1 + (vnoise(p.getY(k) * 0.08 + sd + 9, k * 0.3) - 0.5) * 0.9));
    }
    geo.computeVertexNormals();
    RK.add(geo, (px, py) => mix(0x4a5a52, 0x8aa09a, clamp(py / hh + 0.5)), xf(x, H(x, z) + hh / 2 - 4, z));
  }
  S.add(RK.mesh(soft({ scale: 0.03, contrast: 0.5, rim: 0, big: 0.4, wallStretch: 0.5 })));
  const far = mountainRing({
    radius: 560,
    base: -6,
    profile: (a) => 60 + Math.abs(Math.sin(a * 9)) * 70 + Math.abs(Math.sin(a * 23 + 1)) * 40 + fbm(a * 5, 3, 3) * 60,
    colorFn: (x, y) => mix(0x4a6266, 0x9ab4b0, clamp(y / 200)),
    seg: 260,
    depth: 120,
  });
  const fmesh = new THREE.Mesh(far, soft({ scale: 0.012, side: THREE.DoubleSide, rim: 0, wallStretch: 2 }));
  fmesh.position.z = -80;
  fmesh.frustumCulled = false;
  S.add(fmesh);
}
