// Tuscany about 1503, as far as the eye goes from her loggia: the walled town of towers on
// its hill, the farms of the valley with their olive groves, vineyards and haystacks,
// cypress along the roads, umbrella pines on the ridges, oxen at the plough, people on
// the road, pigeons round the bell tower, and grass and poppies over all of it.
//
//   const tuscany = addTuscany(world, kit)      each frame: tuscany.tick(dt, time, camera.position)
//
// It has its own dice and is built last, so nothing grows through a wall and nothing else moves.
import * as THREE from 'three';
import { xf } from '../../../engine/build.js';
import { rng, vnoise } from '../../../engine/gl.js';
import { instances, show, footprints } from '../../../engine/scatter.js';
import { Hash } from '../../../engine/plan.js';
import { Soup } from '../../../engine/soup.js';
import { weld } from '../../../engine/weld.js';
import { Walkers, way } from '../../../engine/walkers.js';
import { birdFlocks, wheel } from '../../../engine/flock.js';
import { addSmoke } from '../../../engine/air.js';
import { townHouse } from '../../../engine/townhouse.js';
import { cow, sheep } from '../../../engine/animals.js';
import { tuftGeo, scrubGeo, rockGeo } from '../../../engine/plants.js';
import { leoKeep } from '../notebooks/layout.js';
import { ROADS } from '../terrain.js';
import { TU } from './kit.js';
import { torre, pieve, mura } from './build.js';
import { tuscanPerson, cypressGeo, olivoGeo, pinoGeo, viteGeo, fioreGeo, pagliaio } from './life.js';

const CYPRESS = [0x1f3324, 0x26402c, 0x1a2c22, 0x2c4a30];
const OLIVE = [0x8a9a7a, 0x9aa888, 0x7a8a6a, 0xa8b494];
const PINE = [0x2a4a30, 0x34563a, 0x24402c];
const VINE = [0x5a7a34, 0x7a8a3a, 0x9a9a3a, 0x6a8a3a];
const GRASS = [0x8a9a52, 0x9aa85a, 0x7a8a48, 0xb8a85a, 0xa8b060];
const BLOOM = [0xd9382a, 0xd9382a, 0xe8c84a, 0x7a8ad0, 0xf0e8d8];
const BROOM = [0x6a7a3a, 0x8a8a3a, 0xc9b040, 0x5a6a34];
const STONE = [0xa89a80, 0xb8aa90, 0x9a8a72];
const VINEYARDS = [[-52, -30, 0.3], [46, -36, -0.4], [-30, 44, 1.2], [58, 40, 0.8], [-90, -60, 0.1]]; // where the old rows were

export function addTuscany(world, kit) {
  const { S, H, maps, soft, TX, TZ, nearRoad, tk, tuMats: mats, oldCypress, oldOlives } = kit;
  const R = rng(1519); // the year he died
  const pick = (a) => a[(R() * a.length) | 0];
  const D = tk.s('detail');
  const hearths = [];
  const person = (x, z, ry, o) => tuscanPerson(D, { x, y: world.groundAt(x, z, H(x, z) + 3), z, ry, R, ...o });
  const house = (x, z, ry, o) => {
    const w = o.w ?? 6.2 + R() * 1.6,
      d = o.d ?? 5.2 + R() * 1.2;
    const res = townHouse(tk, world, { x, z, ry, w, d, R, floors: o.floors ?? 2 + (R() < 0.45 ? 1 : 0), clad: 'plaster', wall: pick(TU.PLASTER), roof: pick(TU.ROOF), pitch: 0.36, chimneys: R() < 0.6 ? 1 : 0, shutter: pick(TU.SHUTTER), lit: o.lit ?? 0.4 });
    world.colliders.push({ x, z, hw: w / 2 + 0.15, hd: d / 2 + 0.15, ry, top: H(x, z) + res.top });
    maps.blob(x, z, Math.max(w, d) * 0.9, 0.4);
    if (R() < 0.5) hearths.push([x, H(x, z) + res.ridge + 1.2, z]);
    return { ...res, w, d };
  };

  // ---------------------------------------------------------------- the town on its hill
  const wall = mura(tk, world, { x: TX, z: TZ, r: 31, gate: Math.atan2(-144 - TZ, -118 - TX), n: 44 });
  const face = (x, z) => Math.atan2(TX - x, TZ - z); // a front that looks at the middle of the town
  const from = (a, b) => {
    let d = a - b;
    while (d > Math.PI) d -= 6.2832;
    while (d < -Math.PI) d += 6.2832;
    return Math.abs(d);
  };
  const church = pieve(tk, world, { x: TX + 2, z: TZ - 15, ry: 0, R });
  let nHouse = 0,
    nTower = 0;
  for (const [r, n, a0, skipGate, skipChurch] of [[13, 9, 0.35, 0.34, 0.8], [23.5, 16, 0.1, 0.26, 0.62]]) {
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * 6.2832,
        x = TX + Math.cos(a) * r,
        z = TZ + Math.sin(a) * r;
      if (from(a, wall.angle) < skipGate || from(a, -Math.PI / 2 + 0.25) < skipChurch) continue;
      if ((r < 20 && i % 4 === 1) || (r > 20 && i % 4 === 2)) {
        const t = torre(tk, world, { x, z, ry: face(x, z), R, h: r < 20 ? 25 + R() * 9 : 16 + R() * 10 });
        world.colliders.push({ x, z, hw: t.w / 2 + 0.15, hd: t.w / 2 + 0.15, ry: face(x, z), top: H(x, z) + t.top });
        maps.blob(x, z, 6, 0.45);
        nTower++;
      } else {
        const res = house(x, z, face(x, z), {});
        // a lantern by some doors
        if (R() < 0.4) {
          const lx = x + Math.sin(face(x, z)) * (res.d / 2 + 0.6),
            lz = z + Math.cos(face(x, z)) * (res.d / 2 + 0.6);
          world.glows.push({ p: [lx, H(lx, lz) + 2.6, lz], c: 0xffc070, size: 1.3 });
          maps.lamp(lx, lz, 5, 0xffc070, 0.5);
        }
        nHouse++;
      }
    }
  }
  // the piazza: a well, the market, people
  {
    const wy = H(TX, TZ + 1.5),
      st = tk.s('stone').set(null);
    st.add(new THREE.CylinderGeometry(1.0, 1.1, 0.9, 10, 1, true), TU.STONE, xf(TX, wy + 0.45, TZ + 1.5));
    st.add(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 10), TU.TRIM, xf(TX, wy + 0.92, TZ + 1.5));
    for (const sx of [-1, 1]) st.add(new THREE.BoxGeometry(0.26, 2.3, 0.26), TU.TRIM, xf(TX + sx * 0.95, wy + 1.15, TZ + 1.5));
    st.add(new THREE.BoxGeometry(2.5, 0.26, 0.3), TU.TRIM, xf(TX, wy + 2.42, TZ + 1.5));
    world.colliders.push({ x: TX, z: TZ + 1.5, r: 1.3, top: wy + 2.4 });
    for (const [a, c] of [[0.9, 0x8a2f2a], [2.4, 0x3a5a7a], [3.7, 0xc9a24a], [5.4, 0x4a6a3a]]) {
      const x = TX + Math.cos(a) * 6.2,
        z = TZ + 1.5 + Math.sin(a) * 6.2;
      tk.place('stall', xf(x, H(x, z), z, face(x, z)), c);
      world.colliders.push({ x, z, r: 1.3, top: H(x, z) + 2.4 });
      for (let k = 0; k < 2; k++) tk.place(R() < 0.5 ? 'jar' : 'barrel', xf(x + (R() - 0.5) * 2.4, H(x, z), z + (R() - 0.5) * 2.4), pick([0xb8663a, 0xa8582e, 0x8a6a44, 0x6a4a34]));
      person(x + Math.sin(face(x, z)) * 1.3, z + Math.cos(face(x, z)) * 1.3, face(x, z) + Math.PI, {});
    }
  }
  let standing = 4;
  for (let i = 0; i < 40 && standing < 22; i++) {
    const a = R() * 6.2832,
      d = 3 + R() * 26,
      x = TX + Math.cos(a) * d,
      z = TZ + Math.sin(a) * d;
    if (world.blocked(x, H(x, z) + 1, z)) continue;
    person(x, z, R() * 6.2832, {});
    standing++;
  }

  // ---------------------------------------------------------------- the farms of the valley
  const flat = (x, z) => Math.max(Math.abs(H(x + 6, z) - H(x - 6, z)), Math.abs(H(x, z + 6) - H(x, z - 6))) < 1.6;
  const site = (x, z) => H(x, z) > 2.4 && flat(x, z) && !nearRoad(x, z, 9) && Math.hypot(x, z) > 96 && Math.hypot(x - TX, z - TZ) > 66 && Math.hypot(x - 122, z + 44) > 50 && !leoKeep(x, z) && Math.hypot(x, z + 80) < 235;
  const farms = [];
  const vines = [],
    olives = [],
    cypresses = [],
    pines = [];
  const trees = new Hash(8);
  const plant = (list, x, z, s, c, trunk = 0.3, top = 4) => {
    const y = H(x, z);
    list.push({ x, y: y - 0.15, z, ry: R() * 6.283, s, c });
    trees.add(x, z, 1);
    if (trunk) world.colliders.push({ x, z, r: trunk, top: y + top });
    maps.blob(x, z, Array.isArray(s) ? s[0] * 1.6 : s * 0.4, 0.3);
  };
  const cypress = (x, z, h = 9 + R() * 6) => plant(cypresses, x, z, [0.9 + R() * 0.5, h, 0.9 + R() * 0.5], pick(CYPRESS), 0.6, h * 0.6);
  const rows = (cx, cz, ry, nx, nz, gx, gz, fn) => {
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const lx = (i - (nx - 1) / 2) * gx,
          lz = (j - (nz - 1) / 2) * gz,
          x = cx + lx * Math.cos(ry) + lz * Math.sin(ry),
          z = cz - lx * Math.sin(ry) + lz * Math.cos(ry);
        if (H(x, z) > 1.8 && !nearRoad(x, z, 3) && !world.blocked(x, H(x, z) + 1, z)) fn(x, z);
      }
  };
  let beasts = 0;
  for (const [sx, sz] of [[-62, 18], [78, 26], [-158, -52], [14, -182], [148, -150], [-196, -118], [168, 44], [-60, -210]]) {
    let at = null;
    for (let k = 0; k < 60 && !at; k++) {
      const x = sx + (k ? (R() - 0.5) * 50 : 0),
        z = sz + (k ? (R() - 0.5) * 50 : 0);
      if (site(x, z) && !farms.some((f) => Math.hypot(f[0] - x, f[1] - z) < 60)) at = [x, z];
    }
    if (!at) continue;
    farms.push(at);
    const [x, z] = at,
      ry = Math.atan2(-x, -80 - z) + (R() - 0.5) * 0.5, // it looks down the valley
      cs = Math.cos(ry),
      sn = Math.sin(ry),
      L = (u, v) => [x + u * cs + v * sn, z - u * sn + v * cs];
    const res = house(x, z, ry, { w: 10 + R() * 2, d: 7, floors: 2, lit: 0.55 });
    hearths.push([x, H(x, z) + res.ridge + 1.2, z]);
    // its dovecote at one end, haystacks behind, two cypresses at the door
    const [tx, tz] = L(res.w / 2 + 1.9, -0.6);
    const t = torre(tk, world, { x: tx, z: tz, ry, R, w: 3.3, h: 8.6, roofed: true });
    world.colliders.push({ x: tx, z: tz, hw: 1.8, hd: 1.8, ry, top: H(tx, tz) + t.top });
    for (const [u, v, s] of [[-res.w / 2 - 3.5, -5, 1], [-res.w / 2 - 7.5, -3, 0.8]]) {
      const [hx, hz] = L(u, v);
      pagliaio(D, hx, H(hx, hz), hz, s);
      world.colliders.push({ x: hx, z: hz, r: 1.5 * s, top: H(hx, hz) + 3.4 * s });
    }
    for (const u of [-3.2, 3.2]) cypress(...L(u, 8.5));
    const [dx, dz] = L(res.doorX, 5.4);
    world.glows.push({ p: [dx, H(dx, dz) + 2.4, dz], c: 0xffc070, size: 1.4 });
    maps.lamp(dx, dz, 6, 0xffc070, 0.55);
    person(...L(res.doorX + 1.2, 6.2), ry + 2.6, { kind: 'woman' });
    // an olive grove on one hand, vines on the other
    rows(...L(-22, 6), ry, 4, 5, 6.4, 6.4, (px, pz) => plant(olives, px + (R() - 0.5), pz + (R() - 0.5), 4.2 + R() * 1.8, pick(OLIVE)));
    rows(...L(23, 4), ry, 6, 10, 2.6, 2.2, (px, pz) => vines.push({ x: px, y: H(px, pz) - 0.05, z: pz, ry: R() * 6.283, s: 1.5 + R() * 0.4, c: pick(VINE) }));
    // a pair of white oxen and the man who works them; on some farms a few sheep
    const [ox, oz] = L(-6, 22),
      oa = ry + 1.2;
    if (H(ox, oz) > 2 && !nearRoad(ox, oz, 4)) {
      for (const k of [-0.55, 0.55]) cow(D, { x: ox + Math.cos(oa) * k, y: H(ox, oz), z: oz - Math.sin(oa) * k, ry: oa, coat: 0xe8e0d0, s: 1.12, R });
      person(ox - Math.sin(oa) * 2.8, oz - Math.cos(oa) * 2.8, oa, { kind: 'man' });
      world.colliders.push({ x: ox, z: oz, r: 1.5, top: H(ox, oz) + 1.6 });
      beasts += 2;
    }
    if (farms.length % 2) {
      const [fx, fz] = L(14, 26);
      for (let i = 0; i < 6; i++) {
        const px = fx + (R() - 0.5) * 12,
          pz = fz + (R() - 0.5) * 12;
        if (H(px, pz) > 2 && !nearRoad(px, pz, 3)) {
          sheep(D, { x: px, y: H(px, pz), z: pz, ry: R() * 6.283, graze: R() < 0.7, wool: pick([0xe0d8c0, 0xd0c8b0, 0xe8e0c8]) });
          beasts++;
        }
      }
      person(fx - 5, fz - 4, R() * 6.283, { kind: 'man' });
    }
  }

  // ---------------------------------------------------------------- trees, vines
  const taken = footprints(world.colliders, H);
  for (const t of oldCypress) if (!taken(t.x, t.z, 0.8)) cypress(t.x, t.z, t.h);
  for (const t of oldOlives) if (!taken(t.x, t.z, 0.8) && !nearRoad(t.x, t.z, 3)) plant(olives, t.x, t.z, 3.6 + t.r, pick(OLIVE));
  for (const [vx, vz, ry] of VINEYARDS) rows(vx, vz, ry, 12, 9, 2.4, 3, (px, pz) => vines.push({ x: px, y: H(px, pz) - 0.05, z: pz, ry: R() * 6.283, s: 1.5 + R() * 0.4, c: pick(VINE) }));
  const open = (x, z, pad = 0) => H(x, z) > 1.6 && !nearRoad(x, z, 3.2 + pad) && Math.hypot(x - TX, z - TZ) > 34 && !(Math.abs(x) < 15 && z > -14 && z < 28) && !leoKeep(x, z) && !taken(x, z, pad + 0.3);
  // cypress round the town, and up the slope to its gate
  for (let i = 0; i < 26; i++) {
    const a = R() * 6.2832,
      d = 36 + R() * 16,
      x = TX + Math.cos(a) * d,
      z = TZ + Math.sin(a) * d;
    if (open(x, z, 1.5) && !trees.any(x, z, 3, (px, pz) => Math.hypot(px - x, pz - z) < 3)) cypress(x, z);
  }
  // umbrella pines on the shoulders of the hills
  for (let i = 0, made = 0; i < 900 && made < 44; i++) {
    const x = (R() - 0.5) * 520,
      z = -80 + (R() - 0.5) * 520,
      y = H(x, z);
    if (y < 7 || y > 34 || !open(x, z, 3) || Math.hypot(x, z + 80) > 245 || trees.any(x, z, 9, (px, pz) => Math.hypot(px - x, pz - z) < 9)) continue;
    const h = 11 + R() * 6;
    plant(pines, x, z, h, pick(PINE), 0.45, h * 0.7);
    made++;
  }

  // ---------------------------------------------------------------- what covers the ground
  const tufts = [],
    flowers = [],
    broom = [],
    stones = [];
  for (let i = 0; i < 90000 && tufts.length < 15000; i++) {
    const x = (R() - 0.5) * 540,
      z = -80 + (R() - 0.5) * 540;
    if (!open(x, z) || vnoise(x * 0.05 + 7, z * 0.05) < 0.24 + 0.3 * R()) continue;
    tufts.push({ x, y: H(x, z) - 0.04, z, ry: R() * 6.283, s: [0.8 + R() * 0.6, 0.6 + R() * 0.7, 0.8 + R() * 0.6], c: pick(GRASS) });
  }
  for (let k = 0, made = 0; k < 900 && made < 150; k++) {
    const cx = (R() - 0.5) * 520,
      cz = -80 + (R() - 0.5) * 520;
    if (!open(cx, cz, 1)) continue;
    made++;
    const col = pick(BLOOM),
      rad = 3 + R() * 7;
    for (let i = 0, n = 10 + ((R() * 22) | 0); i < n; i++) {
      const a = R() * 6.283,
        d = Math.sqrt(R()) * rad,
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (open(x, z)) flowers.push({ x, y: H(x, z) - 0.02, z, ry: R() * 6.283, s: 0.8 + R() * 0.6, c: col });
    }
  }
  for (let i = 0; i < 12000 && broom.length < 900; i++) {
    const x = (R() - 0.5) * 540,
      z = -80 + (R() - 0.5) * 540;
    if (!open(x, z, 0.8) || vnoise(x * 0.03 + 110, z * 0.03 + 60) < 0.55) continue;
    const s = 0.7 + R() * 1.0;
    broom.push({ x, y: H(x, z) - 0.03, z, ry: R() * 6.283, s: [s, s * (0.8 + R() * 0.6), s], c: pick(BROOM) });
  }
  for (let i = 0; i < 6000 && stones.length < 520; i++) {
    const x = (R() - 0.5) * 540,
      z = -80 + (R() - 0.5) * 540;
    // (on dry land only where nothing stands; along the water's edge anywhere)
    if (H(x, z) < 0.2 || (H(x, z) > 1.6 && !open(x, z, 0.5)) || vnoise(x * 0.06 + 140, z * 0.06 + 77) < 0.5) continue;
    const r = 0.18 + R() * R() * 0.8;
    stones.push({ x, y: H(x, z) + r * 0.12, z, ry: R() * 6.283, rx: (R() - 0.5) * 0.4, s: r, c: pick(STONE) });
  }

  // ---------------------------------------------------------------- on the roads, in the air
  const figures = ['man', 'woman', 'man', 'friar', 'woman', 'child'].map((kind) => {
    const s = new Soup();
    tuscanPerson(s, { x: 0, y: 0, z: 0, ry: 0, R, kind });
    return weld(s.geometry());
  });
  const folk = new Walkers(S, mats.detail, figures);
  folk.add(way(world, ROADS.A), 9, R, { wide: 1.1, speed: [0.7, 1.2] });
  folk.add(way(world, ROADS.B), 6, R, { wide: 1.1, speed: [0.7, 1.2] });
  folk.add(way(world, ROADS.C), 3, R, { wide: 1.1, speed: [0.7, 1.2] });
  folk.add(way(world, [wall.gate, [TX + 6, TZ + 3], [TX + 2, TZ + 8], [TX - 7, TZ + 5], [TX - 6, TZ - 3]]), 5, R, { wide: 0.8, speed: [0.5, 0.9] });
  folk.build();
  const birds = birdFlocks(S, R, [{ kind: 'pigeon', birds: [...wheel(R, 11, church.bell[0], church.bell[1] + 4, church.bell[2], 16), ...wheel(R, 6, TX - 12, H(TX, TZ) + 30, TZ + 8, 22)] }]);
  addSmoke(S, hearths, { color: 0xc8c0b0, wind: [0.7, 0, 0.3], seed: 15 });

  // ---------------------------------------------------------------- into the scene
  const b = tk.build();
  S.add(b.base, b.detail);
  const leaf = soft({ scale: 0.24, contrast: 0.3, hueVar: 0.3, rim: 0.12, side: THREE.DoubleSide });
  const layers = [
    [instances(tufts, tuftGeo(R), leaf, 64), 105],
    [instances(flowers, fioreGeo(R), leaf, 64), 120],
    [instances(broom, scrubGeo(R), leaf, 96), 190],
    [instances(stones, rockGeo(0), leaf, 96), 160],
    [instances(vines, viteGeo(R), leaf, 64), 210],
    [instances(olives, olivoGeo(R), leaf, 96), 0],
    [instances(cypresses, cypressGeo(R), leaf, 96), 0],
    [instances(pines, pinoGeo(R), leaf, 128), 0],
  ];
  for (const [l] of layers) S.add(l.group);
  console.log('mona: tuscany', nHouse, 'houses and', nTower, 'towers in the town,', farms.length, 'farms,', beasts, 'beasts,', cypresses.length, 'cypress,', olives.length, 'olives,', pines.length, 'pines,', vines.length, 'vines,', tufts.length, 'tufts,', flowers.length, 'flowers');
  return {
    farms,
    tick(dt, time, cam) {
      for (const [l, range] of layers) if (range) show(l.chunks, cam, range);
      folk.tick(dt, time, cam);
      birds.tick(dt, time);
    },
  };
}
