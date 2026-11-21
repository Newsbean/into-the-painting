// Delft itself: houses along both canals and round the market, the Nieuwe Kerk and the
// town hall facing each other across it, the mill and the gate at the edge of town, brick
// quays and bridges, lime trees along the water, the market in full swing, and the people.
//
//   const delft = addDelft(world, kit)     each frame: delft.tick(dt, time, camera.position)
//
// The ground plan is plan.js. Everything here throws its own dice.
import * as THREE from 'three';
import { Builder, ribbon, mix, xf } from '../../../engine/build.js';
import { rng, vnoise, clamp } from '../../../engine/gl.js';
import { layLots, along, trace, inKeep } from '../../../engine/plan.js';
import { Soup } from '../../../engine/soup.js';
import { weld } from '../../../engine/weld.js';
import { Walkers, way } from '../../../engine/walkers.js';
import { birdFlocks, wheel } from '../../../engine/flock.js';
import { addSmoke } from '../../../engine/air.js';
import { cuboid } from '../../../engine/facade.js';
import { DelftKit, delftMaterials, DELFT } from './kit.js';
import { canalHouse } from './house.js';
import { nieuweKerk, stadhuis, mill, millSails, gate, bridge } from './landmarks.js';
import { delftPerson, delftCrowd } from './people.js';
import { barge } from './ship.js';
import { BRIDGES, MARKET, CHURCH, HALL, MILL, GATE, VERMEER, SIDE, CANAL, wetAt, quayLines, streets as planStreets } from './plan.js';

const CHUNK = 72;
const pick = (R, a) => a[(R() * a.length) | 0];
const _t = new THREE.Color();

// a lime tree as the Dutch painters have it: a clean stem under one broad rounded head
function linden(B, x, y, z, h, R) {
  const lx = (R() - 0.5) * 0.5,
    lz = (R() - 0.5) * 0.5;
  B.add(new THREE.CylinderGeometry(h * 0.018 + 0.05, h * 0.03 + 0.09, h * 0.52, 6, 1, true), 0x4a3626, xf(x + lx * 0.3, y + h * 0.26 - 0.2, z + lz * 0.3));
  const r = h * 0.25,
    cy = y + h * 0.68;
  const blob = (bx, by, bz, br, lift) => B.add(new THREE.IcosahedronGeometry(br, 1), (px, py) => mix(0x3a5a28, 0xb4b64c, clamp((py / br) * 0.5 + 0.5 + lift)), xf(bx, by, bz, R() * 6, 1, 0.8, 1), { sway: 0.2 });
  blob(x + lx, cy, z + lz, r, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.283 + R(),
      d = r * (0.5 + R() * 0.2);
    blob(x + lx + Math.cos(a) * d, cy + (R() - 0.6) * r * 0.5, z + lz + Math.sin(a) * d, r * (0.55 + R() * 0.15), -0.1);
  }
  blob(x + lx, cy + r * 0.62, z + lz, r * 0.62, 0.2);
}

export function addDelft(world, { S, H, maps, strokes, soft }) {
  const R = rng(1632);
  const mats = delftMaterials(strokes);
  const lk = new DelftKit(mats); // the landmarks and the quays: always drawn in full
  const streets = planStreets();

  // ---------------------------------------------------------------- the houses
  const keep = [
    VERMEER,
    { x0: MARKET.x - MARKET.hw, x1: MARKET.x + MARKET.hw, z0: MARKET.z - MARKET.hd, z1: MARKET.z + MARKET.hd },
    { x0: CHURCH.x - 17, x1: CHURCH.x + 17, z0: CHURCH.z - 9, z1: CHURCH.z + 56 },
    { x0: HALL.x - 9, x1: HALL.x + 12, z0: HALL.z - 15, z1: HALL.z + 15 },
    { x: MILL.x, z: MILL.z, r: 16 },
    { x: GATE.x, z: GATE.z, r: 11 },
    ...BRIDGES.map((b) => ({ x: b.x, z: b.z, r: b.half + 2 })),
  ];
  const inside = (x, z) => Math.hypot(x, z * 1.05) < 168 && wetAt(x, z) < 0.02;
  const { lots, traces } = layLots(streets, { R, keep, inside, widths: [4.7, 7.6], depths: [9, 12.5], setback: 0.3 });
  const chunks = new Map();
  const chunkOf = (x, z) => {
    const k = Math.floor(x / CHUNK) + ':' + Math.floor(z / CHUNK);
    let c = chunks.get(k);
    if (!c) chunks.set(k, (c = { kit: new DelftKit(mats), sx: 0, sz: 0, n: 0 }));
    c.sx += x;
    c.sz += z;
    c.n++;
    return c;
  };
  const hearths = [];
  lots.forEach((lot, i) => {
    const st = streets[lot.street];
    const floors = st.market ? 3 + (R() < 0.3 ? 1 : 0) : st.main ? 2 + ((R() * 2.2) | 0) : 2 + (R() < 0.35 ? 1 : 0);
    const res = canalHouse(chunkOf(lot.x, lot.z).kit, world, { x: lot.x, z: lot.z, ry: lot.ry, w: lot.w, d: lot.d, R, floors, shop: R() < (st.market ? 0.75 : st.main ? 0.3 : 0.12) });
    const gy = H(lot.x, lot.z);
    world.colliders.push({ x: lot.x, z: lot.z, hw: lot.w / 2 + 0.1, hd: lot.d / 2 + 0.1, ry: lot.ry, top: gy + res.top });
    maps.blob(lot.x, lot.z, Math.max(lot.w, lot.d) * 0.9, 0.35);
    if (i % 6 === 2) hearths.push([lot.x, gy + res.ridge + 1.2, lot.z]);
  });
  // Vermeer's own front: three bays of brick under a stepped gable, with the doorway you came out of
  canalHouse(lk, world, { x: 34, z: -24.48, ry: 0, w: 12.6, d: 1, R, floors: 3, gH: 3.4, rise: 5.9, gable: 'step', front: true, open: { w: 2.8, h: 3.0 }, wash: false, shop: false, brick: 0x9c5238 });

  // ---------------------------------------------------------------- the great buildings
  const kerk = nieuweKerk(lk, world, { x: CHURCH.x, z: CHURCH.z, ry: Math.PI });
  stadhuis(lk, world, { x: HALL.x, z: HALL.z, ry: Math.PI / 2 });
  const m = mill(lk, world, { x: MILL.x, z: MILL.z, ry: 0 });
  world.sails = millSails(soft({ objSpace: 1, scale: 0.5 }));
  world.sails.position.copy(m.hub);
  S.add(world.sails);
  gate(lk, world, { x: GATE.x, z: GATE.z, ry: Math.PI / 2 });
  for (const b of BRIDGES) bridge(lk, world, b);

  // ---------------------------------------------------------------- the quays
  // a brick wall down into the water under a stone coping, and a mooring post every few paces
  const QS = lk.s('brick'),
    QC = lk.s('stone'),
    QD = lk.s('detail');
  const posts = [];
  for (const line of quayLines())
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i],
        [bx, bz] = line[i + 1];
      const L = Math.hypot(bx - ax, bz - az),
        tx = (bx - ax) / L,
        tz = (bz - az) / L,
        nx = -tz,
        nz = tx; // towards the land
      const n = Math.max(1, Math.round(L / 6));
      for (let k = 0; k < n; k++) {
        const s0 = (k / n) * L - (k ? 0 : 0.5),
          s1 = ((k + 1) / n) * L + (k === n - 1 ? 0.5 : 0);
        const P = (s, o, y) => [ax + tx * s + nx * o, y, az + tz * s + nz * o];
        const shade = 0.82 + R() * 0.3;
        const col = (x, y, z) => _t.set(0x7a4a38).multiplyScalar(shade * (0.75 + 0.25 * clamp((y + 2.6) / 2.6)));
        QS.facing(P((s0 + s1) / 2, 6, -1));
        QS.quad(P(s0, 0, -2.9), P(s1, 0, -2.9), P(s1, 0, 0.12), P(s0, 0, 0.12), col);
        QS.facing(null);
        QC.facing(P((s0 + s1) / 2, 0.5, -30));
        QC.quad(P(s0, -0.08, 0.2), P(s1, -0.08, 0.2), P(s1, 0.5, 0.2), P(s0, 0.5, 0.2), (x, y, z) => _t.set(DELFT.STONE_D).multiplyScalar(0.72 + 0.2 * vnoise(x * 1.3, z * 1.3)));
        QC.facing(P((s0 + s1) / 2, -6, 0));
        QC.quad(P(s0, 0.5, 0.06), P(s1, 0.5, 0.06), P(s1, 0.5, 0.2), P(s0, 0.5, 0.2), DELFT.STONE_D);
        QC.facing(P((s0 + s1) / 2, 6, 0));
        QC.quad(P(s0, -0.08, 0.12), P(s1, -0.08, 0.12), P(s1, -0.08, 0.2), P(s0, -0.08, 0.2), DELFT.STONE_D);
        QC.facing(null);
      }
      for (let s = 4 + R() * 4; s < L - 3; s += 10 + R() * 5) posts.push([ax + tx * s + nx * 0.5, az + tz * s + nz * 0.5]);
    }
  for (const [x, z] of posts) cuboid(QD, [x - 0.11, 0.18, z - 0.11], [x + 0.11, 1.05, z + 0.11], 0x3a2c22, undefined, 'b');

  // ---------------------------------------------------------------- paving
  const SB = new Builder();
  const cob = (x, y, z) => mix(0x9a8a70, 0xc4b08c, vnoise(x * 0.35, z * 0.35)).lerp(_t.set(0x8a6a52), vnoise(x * 0.09 + 5, z * 0.09) * 0.4);
  streets.forEach((st, i) => SB.parts.push(ribbon(st.pts, st.w + 1.2, H, cob, { lift: 0.05 + (i % 7) * 0.004, across: 4, step: 2.2 })));
  // the market, the yard before Vermeer's door, the church's own ground
  const slabAt = (x0, x1, z0, z1, lift, col = cob) => SB.parts.push(ribbon([[x0, (z0 + z1) / 2], [(x0 + x1) / 2, (z0 + z1) / 2], [x1, (z0 + z1) / 2]], z1 - z0, H, col, { lift, across: 8, step: 3 }));
  slabAt(MARKET.x - MARKET.hw - 5, MARKET.x + MARKET.hw + 5, MARKET.z - MARKET.hd - 5, MARKET.z + MARKET.hd + 6, 0.085, (x, y, z) => mix(0xb09a78, 0xd0bb92, vnoise(x * 0.4, z * 0.4)).lerp(_t.set(0x8a7258), vnoise(x * 0.08, z * 0.08) * 0.3));
  slabAt(VERMEER.x0 + 2, VERMEER.x1 - 2, -24.2, -15.4, 0.075);
  slabAt(CHURCH.x - 20, CHURCH.x + 20, CHURCH.z + 4, CHURCH.z + 60, 0.03, (x, y, z) => mix(0x7f9a4a, 0xa8ac58, vnoise(x * 0.1, z * 0.1)));
  S.add(SB.meshes(mats.cobble, 150));

  // ---------------------------------------------------------------- the market
  const marketKit = chunkOf(MARKET.x, MARKET.z).kit;
  const GOODS = [[0xe8c84a, 0xf0d870], [0xd9443a, 0xf0b0c0, 0xf2d04a], [0xb9c4cc, 0x8fa0aa], [0x9a5a2a, 0xc98a4a], [0x6a8a4a, 0x9ab05a], [0xf2f0e0, 0xe8d8a0]];
  world.stalls = [];
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 5; i++) {
      const x = MARKET.x + (row ? 9 : -9) + (R() - 0.5) * 1.5,
        z = MARKET.z - 20 + i * 9.6 + (R() - 0.5) * 1.5;
      if (Math.hypot(x - (MARKET.x + 4), z - (MARKET.z - 4)) < 5) continue; // leave the colour its place
      const ry = (row ? -1 : 1) * Math.PI * 0.5 + (R() - 0.5) * 0.2;
      const M = xf(x, H(x, z), z, ry);
      marketKit.place('stall', M, pick(R, DELFT.CLOTH));
      const goods = GOODS[(i + row * 3) % GOODS.length];
      for (let k = 0; k < 4; k++) marketKit.place('crate', M.clone().multiply(xf(-1.25 + k * 0.82, 0.92, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3)), pick(R, goods));
      for (let k = 0, nb = (R() * 3) | 0; k < nb; k++) marketKit.place('barrel', M.clone().multiply(xf(-2.3 - k * 0.7, 0, -0.5 + R())), pick(R, [0x8a6a44, 0x7a5a3a, 0x9a7a50]));
      world.colliders.push({ x, z, hw: 1.9, hd: 0.9, ry, top: H(x, z) + 2.6 });
      maps.blob(x, z, 3.5, 0.35);
      world.stalls.push([x, z]);
      // someone selling, someone buying
      const SP = marketKit.s('detail');
      const back = [x - Math.sin(ry) * 1.25, z - Math.cos(ry) * 1.25],
        front = [x + Math.sin(ry) * (1.5 + R() * 0.5) + (R() - 0.5) * 1.6, z + Math.cos(ry) * (1.5 + R() * 0.5) + (R() - 0.5) * 1.6];
      delftPerson(SP, { x: back[0], y: H(back[0], back[1]), z: back[1], ry, R, kind: R() < 0.5 ? 'woman' : 'burgher' });
      delftPerson(SP, { x: front[0], y: H(front[0], front[1]), z: front[1], ry: ry + Math.PI + (R() - 0.5), R, kind: R() < 0.6 ? 'maid' : 'woman' });
    }
  // the town pump, in the middle
  {
    const s = marketKit.s('stone').set(null),
      d = marketKit.s('detail').set(null);
    const px = MARKET.x,
      pz = MARKET.z,
      y = H(px, pz);
    cuboid(s, [px - 1.5, y, pz - 1.5], [px + 1.5, y + 0.42, pz + 1.5], DELFT.STONE, undefined, 'b');
    cuboid(s, [px - 0.4, y + 0.42, pz - 0.4], [px + 0.4, y + 2.6, pz + 0.4], DELFT.STONE_D, undefined, 'b');
    cuboid(s, [px - 0.52, y + 2.6, pz - 0.52], [px + 0.52, y + 2.8, pz + 0.52], DELFT.STONE, undefined, '');
    cuboid(d, [px - 0.04, y + 1.5, pz + 0.4], [px + 0.04, y + 1.58, pz + 1.0], DELFT.IRON, undefined, '');
    cuboid(d, [px - 0.3, y + 3.2, pz - 0.04], [px + 0.3, y + 3.28, pz + 0.04], DELFT.IRON, undefined, '');
    world.colliders.push({ x: px, z: pz, r: 1.7, top: y + 2.8 });
  }

  // ---------------------------------------------------------------- trees
  const T = new Builder();
  const tree = (x, z, h) => {
    const y = H(x, z);
    if (y < -0.3 || world.blocked(x, y + 1, z) || inKeep([VERMEER], x, z, -1) || BRIDGES.some((b) => Math.hypot(x - b.x, z - b.z) < b.half + 1.5)) return;
    linden(T, x, y, z, h, R);
    world.colliders.push({ x, z, r: 0.35, top: y + h * 0.45 });
    maps.blob(x, z, h * 0.3, 0.3);
  };
  // a row along every quay, between the roadway and the water
  for (const sz of [-1, 1]) for (let x = -146; x < 94; x += 10.5 + R() * 2.5) tree(x, sz * (CANAL + 2.3), 8 + R() * 3);
  for (const sx of [-1, 1]) for (let z = 22; z < 146; z += 10.5 + R() * 2.5) tree(SIDE.x + sx * (SIDE.hw + 2.3), z, 7.5 + R() * 3);
  // the market's own trees, the churchyard, and whatever green the back gardens have
  for (const sx of [-1, 1]) for (let z = MARKET.z - 22; z < MARKET.z + 26; z += 12) tree(MARKET.x + sx * (MARKET.hw - 2.5), z + R() * 2, 7 + R() * 2.5);
  for (let i = 0; i < 16; i++) tree(CHURCH.x + (R() < 0.5 ? -1 : 1) * (15 + R() * 4), CHURCH.z + 8 + R() * 48, 8 + R() * 4);
  for (let i = 0; i < 46; i++) {
    const a = R() * 6.283,
      d = 40 + R() * 125;
    const x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    if (wetAt(x, z) < 0.02 && !streets.some((st, si) => traces[si].some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < (st.w / 2 + 1.5) ** 2))) tree(x, z, 7 + R() * 4);
  }
  S.add(T.meshes(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5, hueVar: 0.45, rim: 0.25 }), 120));

  // ---------------------------------------------------------------- the people
  const standing = delftCrowd(world, traces, streets, (x, z) => chunkOf(x, z).kit.s('detail'), R, 70);
  // those out walking: a dozen figures, each drawn wherever one of them is
  const figures = ['burgher', 'woman', 'maid', 'woman', 'burgher', 'boy', 'woman', 'burgher', 'maid', 'woman'].map((kind) => {
    const s = new Soup();
    delftPerson(s, { x: 0, y: 0, z: 0, ry: 0, R, kind });
    return weld(s.geometry());
  });
  const folk = new Walkers(S, mats.detail, figures);
  streets.forEach((st) => folk.add(way(world, st.pts), Math.max(2, Math.round(trace(st.pts, 4).length_ / (st.main ? 13 : 24))), R, { wide: Math.max(0.4, st.w / 2 - 2.9) }));
  // round the market, in and out among the stalls
  folk.add(way(world, [[MARKET.x - 15, MARKET.z - 24], [MARKET.x - 3, MARKET.z - 8], [MARKET.x - 14, MARKET.z + 8], [MARKET.x - 2, MARKET.z + 22], [MARKET.x + 14, MARKET.z + 10], [MARKET.x + 3, MARKET.z - 4], [MARKET.x + 15, MARKET.z - 22]]), 14, R, { wide: 1.6 });
  folk.build();

  // ---------------------------------------------------------------- on the water
  // barges tied up along the quays, and three more poled slowly up and down the canal
  const moored = lk.s('wood');
  const tie = (x, sz, cargo) => {
    moored.set(xf(x, world.waterY, sz * (CANAL - 1.5), (R() - 0.5) * 0.08));
    barge(moored, cargo, R);
    world.platforms.push({ minx: x - 3.4, maxx: x + 3.4, minz: sz * (CANAL - 1.5) - 1, maxz: sz * (CANAL - 1.5) + 1, y: world.waterY + 0.66 });
  };
  // (the first of these is the boat one of the colours has settled on: story.js)
  tie(-22, -1, 'tilt');
  tie(38, 1, 'barrels');
  tie(-92, 1, 'peat');
  for (let x = -138; x < 86; x += 24 + R() * 22) {
    const sz = R() < 0.5 ? -1 : 1;
    if (BRIDGES.some((b) => Math.abs(x - b.x) < 9 && b.ry === 0) || [-22, 38, -92].some((bx) => Math.abs(x - bx) < 10)) continue;
    tie(x, sz, pick(R, ['peat', 'barrels', 'tilt']));
  }
  for (let z = 30; z < 140; z += 26 + R() * 16) {
    if (BRIDGES.some((b) => Math.abs(z - b.z) < 8 && b.ry !== 0)) continue;
    moored.set(xf(SIDE.x + (R() < 0.5 ? -1 : 1) * (SIDE.hw - 1.4), world.waterY, z, Math.PI / 2 + (R() - 0.5) * 0.08));
    barge(moored, pick(R, ['peat', 'barrels', 'tilt']), R);
  }
  moored.set(null);
  const sailing = [-0.9, 0.5, 2.6].map((ph, i) => {
    const s = new Soup();
    barge(s, ['tilt', 'barrels', 'peat'][i], R);
    delftPerson(s, { x: -3.0, y: 0.66, z: 0, ry: Math.PI / 2, R, kind: 'burgher' });
    cuboid(s, [-2.9, 0.4, 0.5], [-2.84, 3.4, 0.56], 0x6a4a36, undefined, ''); // his pole
    const mesh = s.mesh(mats.detail, false);
    S.add(mesh);
    return { mesh, ph, lane: i === 1 ? -2.4 : 2.4, speed: 0.016 + i * 0.004 };
  });

  // ---------------------------------------------------------------- in the air
  const birds = birdFlocks(S, R, [
    { kind: 'gull', birds: [...wheel(R, 9, 118, 14, 0, 26), ...wheel(R, 6, 20, 13, 0, 18), ...wheel(R, 5, SIDE.x, 12, 80, 16)] },
    { kind: 'pigeon', birds: [...wheel(R, 12, CHURCH.x, kerk.towerTop - 4, CHURCH.z, 13, 0.5), ...wheel(R, 9, MARKET.x, 9, MARKET.z, 16, 0.5), ...wheel(R, 6, HALL.x, 20, HALL.z, 11, 0.5)] },
  ]);
  addSmoke(S, hearths, { color: 0xd9d0c0, wind: [1.1, 0, 0.4] });

  // ---------------------------------------------------------------- finish
  const list = [];
  for (const c of chunks.values()) {
    const b = c.kit.build();
    S.add(b.base, b.detail);
    list.push({ detail: b.detail, x: c.sx / c.n, z: c.sz / c.n });
  }
  const lb = lk.build();
  S.add(lb.base, lb.detail);
  console.log('pearl: delft', lots.length, 'houses,', standing, 'standing,', folk.all.length, 'walking');
  return {
    lots,
    tick(dt, time, cam) {
      for (const c of list) c.detail.visible = Math.hypot(cam.x - c.x, cam.z - c.z) < 135;
      folk.tick(dt, time, cam);
      birds.tick(dt, time);
      for (const b of sailing) {
        // up the canal and back, under both bridges, turning round at each end
        const u = Math.sin(time * b.speed + b.ph),
          dir = Math.cos(time * b.speed + b.ph) >= 0 ? 0 : Math.PI;
        b.mesh.position.set(-22 + u * 108, world.waterY + Math.sin(time * 0.9 + b.ph) * 0.03, b.lane);
        b.mesh.rotation.set(0, dir, Math.sin(time * 0.7 + b.ph) * 0.015);
      }
    },
  };
}
