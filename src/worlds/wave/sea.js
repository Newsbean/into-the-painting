import * as THREE from 'three';
import { paintMaterial, waterMaterial } from '../../engine/paint.js';
import { Builder, pine, figure, mix, xf } from '../../engine/build.js';
import { clamp } from '../../engine/gl.js';
import { PRUSSIAN, FOAM, VERMILION } from './palette.js';

// The sea itself and what is out on the water: the torii in the shallows, the
// islets, the trader at anchor, the fishing boats, the plovers, and the three
// boats of the print. (The waves are in great-wave.js.)

// ---------------- the sea
export function addSea(world, { S, strokes }) {
  const seaGeo = new THREE.PlaneGeometry(3200, 3200, 220, 220);
  seaGeo.rotateX(-Math.PI / 2);
  world.seaMat = waterMaterial({ stroke: strokes.wood, deep: 0x7f9aa8, shallow: 0xb9cfd0, reflect: 0xb9cfd0, foam: FOAM, scale: 0.03, stripe: 0.88, glintAmt: 0, swell: 0.75, flow: 0.004 });
  const sea = new THREE.Mesh(seaGeo, world.seaMat);
  sea.position.y = 0;
  sea.frustumCulled = false;
  S.add(sea);
  world.seaDeep = new THREE.Color(PRUSSIAN);
  world.seaPale = new THREE.Color(0x7f9aa8);
}

// --- a great torii standing in the shallows
export function addGreatTorii(world, { X }) {
  const tx = 66,
    tz = 152;
  for (const sx of [-1, 1]) {
    X.cyl(0.5, 0.62, 11.6, VERMILION, tx + sx * 4.3, -1, tz, 10);
    X.cyl(0.7, 0.75, 1.1, 0x1d1d22, tx + sx * 4.3, -0.6, tz, 10);
    world.colliders.push({ x: tx + sx * 4.3, z: tz, r: 0.7, top: 11 });
  }
  X.box(10.6, 0.6, 0.5, VERMILION, tx, 7.6, tz);
  X.box(12.2, 0.75, 0.8, VERMILION, tx, 9.9, tz);
  X.box(13.6, 0.4, 1.1, 0x1d1d22, tx, 10.65, tz);
  X.box(0.5, 1.7, 0.4, VERMILION, tx, 8.2, tz);
}

// --- islets: dark rock, a cap of moss, wind-bent pines
export function addIslets(world, { R, X, T2 }) {
  const islets = [[122, 112, 14, 7], [-112, 134, 11, 6], [174, -22, 16, 9], [-196, -64, 18, 11], [66, -262, 14, 8], [236, 124, 12, 6], [-246, 112, 15, 8], [-150, -230, 15, 9], [250, -180, 17, 10]];
  islets.forEach(([ix, iz, r, h], n) => {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 6.283 + R(),
        d = k === 0 ? 0 : r * (0.35 + R() * 0.3);
      const geo = new THREE.IcosahedronGeometry(r * (k === 0 ? 0.72 : 0.42 + R() * 0.18), 1);
      X.add(geo, (x, y) => mix(0x2c3848, 0x5f6f80, clamp(y / r + 0.5)), xf(ix + Math.cos(a) * d, h * (k === 0 ? 0.25 : 0.05), iz + Math.sin(a) * d, R() * 6, 1, (h / r) * (k === 0 ? 1.25 : 0.9 + R() * 0.5), 1));
    }
    X.cyl(r * 0.5, r * 0.62, 0.5, 0x6f8a5a, ix, h * 0.92, iz, 9);
    world.platforms.push({ minx: ix - r * 0.42, maxx: ix + r * 0.42, minz: iz - r * 0.42, maxz: iz + r * 0.42, y: h * 0.92 + 0.5 });
    world.colliders.push({ x: ix, z: iz, r: r * 0.7, top: h * 0.9 });
    for (let k = 0; k < 2 + (n % 2); k++) pine(T2, ix + (R() - 0.5) * r * 0.6, h * 0.9, iz + (R() - 0.5) * r * 0.6, 6 + R() * 5, 2.6 + R() * 1.4, R, { lo: 0x25463a, hi: 0x3f7a5a, trunk: 0x5a3a2a, tiers: 3 });
    if (n % 3 === 0) {
      // a wayside shrine
      X.box(1.4, 0.3, 1.2, 0x8a8a84, ix + 1.5, h * 0.92 + 0.5, iz);
      X.box(1.0, 1.0, 0.8, VERMILION, ix + 1.5, h * 0.92 + 0.8, iz);
      X.hip(1.9, 1.7, 0.6, 0x35424f, ix + 1.5, h * 0.92 + 1.8, iz, 0, undefined, undefined, 0.4);
      world.glows.push({ p: [ix + 1.5, h * 0.92 + 1.4, iz - 0.6], c: 0xffc878, size: 1.4 });
    }
  });
}

// --- a coastal trader riding at anchor, sail set
export function addTrader(world, { X }) {
  const jx = 124,
    jz = 44;
  X.box(21, 3.6, 6.2, (x, y) => mix(0x4a3020, 0x8a5a36, clamp(y / 3.6 + 0.5)), jx, -1.5, jz);
  X.box(5.5, 2.6, 5.8, 0x6a4530, jx + 8.5, 2.1, jz);
  X.box(21.6, 0.3, 6.6, 0x9a7a52, jx, 2.0, jz);
  X.cyl(0.2, 0.34, 21, 0x4a3626, jx - 1, 2.1, jz, 6);
  X.box(0.25, 0.25, 13.6, 0x4a3626, jx - 1, 21.6, jz);
  X.box(0.2, 14, 13, FOAM, jx - 0.7, 7.4, jz, 0, { sway: 0.04 });
  for (const oz of [-4.3, 0, 4.3]) X.box(0.26, 14, 0.5, 0x2f548a, jx - 0.7, 7.4, jz + oz, 0, { sway: 0.04 });
  world.platforms.push({ minx: jx - 10.5, maxx: jx + 5.6, minz: jz - 3, maxz: jz + 3, y: 2.3 });
  world.colliders.push({ x: jx + 8.5, z: jz, hw: 2.8, hd: 2.9, ry: 0, top: 4.7 });
  world.glows.push({ p: [jx + 8.5, 5.6, jz], c: 0xffb860, size: 2 });
}

// --- small fishing boats working the swell, each with its lantern
export function addFishingBoats(world, { X }) {
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
    world.glows.push({ p: [x - cs * 2.2, 2.1, z + sn * 2.2], c: 0xffb860, size: 1.5 });
    world.colliders.push({ x, z, hw: 2.8, hd: 0.9, ry, top: 1 });
  }
}

// --- plovers wheeling over the water
export function addPlovers(world, { R, S, flat }) {
  world.flocks = [[20, 30, 60, 46], [-96, 38, -30, 60], [128, 24, 150, 40], [40, 46, -160, 70]].map(([cx, cy, cz, rad], n) => {
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

// ---------------- the three boats
export function addBoats(world, { R, S, strokes }) {
  world.boats = [
    { x: 22, z: 30, ry: 0.35 },
    { x: 50, z: 54, ry: 0.2 },
    { x: 8, z: 82, ry: 0.45 },
  ].map((b, i) => {
    const m = buildBoat(strokes, R);
    m.position.set(b.x, 0, b.z);
    m.rotation.y = b.ry;
    S.add(m);
    world.colliders.push({ x: b.x, z: b.z, hw: 6.5, hd: 1.6, ry: b.ry, top: 1.4 });
    return { m, ...b, ph: i * 2.1 };
  });
}
