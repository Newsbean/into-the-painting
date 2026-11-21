// The country round the town: hill farms on their terraces, each a row of buildings with
// its fence, its hay racks and its animals; the tracks up to them from the road; boathouses
// under the hill; spruce and pine on the heights, birch and rowan lower down, and the
// heather, bracken, scrub, dry grass and stones that cover everything between.
//
//   const country = addCountry(world, kit)      each frame: country.tick(dt, time, camera.position)
//
// None of it throws the world's dice: it has its own. It is called after everything else
// is standing, so that nothing grows through a wall.
import * as THREE from 'three';
import { Builder, ribbon, mix, xf } from '../../../engine/build.js';
import { rng, vnoise } from '../../../engine/gl.js';
import { instances, show, footprints } from '../../../engine/scatter.js';
import { trace, Hash } from '../../../engine/plan.js';
import { Soup } from '../../../engine/soup.js';
import { weld } from '../../../engine/weld.js';
import { Walkers, way } from '../../../engine/walkers.js';
import { addSmoke } from '../../../engine/air.js';
import { townHouse } from '../kristiania/house.js';
import { kristianiaPerson } from '../kristiania/people.js';
import { townWeight } from '../kristiania/town.js';
import { YARDS, yardAt, local } from './plan.js';
import { spruceGeo, pineGeo, birchGeo, juniperGeo, scrubGeo, heatherGeo, tuftGeo, fernGeo, rockGeo } from './plants.js';
import { barn, stabbur, naust, skigard, hesje, cart, rowboat } from './farm.js';
import { horse, cow, sheep } from './animals.js';

const SPRUCE = [0x16302c, 0x1c3a34, 0x12282c, 0x24443a, 0x1a2c3a, 0x2a4a3a];
const PINE = [0x1c3a30, 0x24443a, 0x2a4a34];
const BIRCH = [0xf2c230, 0xe8a030, 0xffd45a, 0xd9782a, 0xc9b040];
const ROWAN = [0xc8382c, 0xe0642a, 0xb8502a];
const JUNIPER = [0x1c3434, 0x24403a, 0x2a4a4a];
const SCRUB = [0x8a2a24, 0xa8442a, 0x6a2a3a, 0x3a4a34, 0xb8642a];
const HEATHER = [0x8a4a8a, 0x6a3a6a, 0xa85a8a, 0x5a3a5a, 0x7a4a6a];
const STRAW = [0xa89a5a, 0x8a8a4a, 0xb8a060, 0x6a7a4a, 0x9a6a3a];
const FERN = [0xa8562a, 0xc98a3a, 0x8a4a2a, 0x6a7a3a];
const STONE = [0x6a6878, 0x7a7684, 0x5a5a6c, 0x8a8490];
const COWS = [0x8a3a22, 0x7a3020, 0x9a4a2a, 0x2a2420];

// what stands on each farm's terrace: [what, along the hill, down the hill, how]
const FARMS = {
  haugen: [['stabbur', -25, -2], ['house', -9, -2, { w: 11, floors: 2, wall: 0xdcd4c0 }], ['barn', 14.5, -2.5, { w: 14 }]],
  plassen: [['house', -8.5, -1.5, { w: 8, d: 6, floors: 1, wall: 0x8a2f2a }], ['barn', 7.5, -2, { w: 9.5, d: 6.5, h: 2.6 }]],
  ostgard: [['house', -13, -2, { w: 10.5, floors: 2, wall: 0xc9a24a }], ['barn', 6.5, -2.5, { w: 13 }], ['stabbur', 22, -2]],
  vestgard: [['stabbur', -20.5, -2], ['house', -6, -2, { w: 10, floors: 2, wall: 0x8a2f2a }], ['barn', 13, -2.5, { w: 13 }]],
  // the big farm: the house across the top of its yard, barn and storehouse facing in
  ekeberg: [['house', 0, -9.5, { w: 15, d: 8, floors: 2, wall: 0xe8e2d6 }], ['barn', 24, 3, { w: 17, d: 9.5, turn: -Math.PI / 2 }], ['stabbur', -25, 2, { bell: true, turn: Math.PI / 2 }]],
};

export function addCountry(world, kit) {
  const { S, H, maps, wavy, ck, krMats: mats, hearths, oldTrees } = kit;
  const R = rng(1944); // the year he died
  const pick = (a) => a[(R() * a.length) | 0];
  const D = ck.s('detail'),
    W = ck.s('boards');
  const roadDn = (x, z) => world._roadZ(x) - z; // how far to the fjord side of the road
  const fields = world.fields ?? [];
  const inField = (x, z, pad = 0) => fields.some((f) => Math.hypot(f[0] - x, f[1] - z) < f[2] * 1.2 + pad);
  const yard = (name) => YARDS.find((y) => y.name === name);
  const person = (x, z, ry, o) => kristianiaPerson(D, { x, y: H(x, z), z, ry, R, ...o });

  // ---------------------------------------------------------------- tracks from the road
  const TB = new Builder();
  const lanes = new Hash(8);
  const dirt = (x, y, z) => mix(0x5a4638, 0x8a6a48, vnoise(x * 0.4, z * 0.4)).lerp(new THREE.Color(0x4a4468), vnoise(x * 0.09 + 3, z * 0.09) * 0.4);
  const lane = (pts, w = 2.4) => {
    TB.parts.push(ribbon(pts, w, H, dirt, { lift: 0.1, across: 2, step: 2.2 }));
    for (const p of trace(pts, 2)) lanes.add(p.x, p.z, w);
  };
  const onLane = (x, z, pad = 0) => lanes.any(x, z, 3 + pad, (px, pz, w) => Math.hypot(px - x, pz - z) < w / 2 + 0.5 + pad);
  const roadAt = (x) => [x, world._roadZ(x) + 2.6];
  // each lane leaves the road well along from its farm and climbs to it slantwise
  for (const [name, from] of [['haugen', 28], ['plassen', 76], ['vestgard', -62]]) {
    const y = yard(name),
      a = roadAt(from),
      b = local(y, -(y.len + 1), 1.5),
      c = local(y, -(y.len - 8), 2);
    lane([a, [a[0] * 0.45 + b[0] * 0.55, a[1] * 0.45 + b[1] * 0.55 + 4], b, c]);
  }
  {
    // the big farm's own road: up past his garden, in at the east end of the yard; the
    // farm to the east of it is reached by a lane off that road
    const y = yard('ekeberg'),
      o = yard('ostgard');
    lane([roadAt(96), [93, 50], [84, 82], [72, 112], local(y, -(y.len + 2), 6), local(y, -y.len + 10, 5)], 3);
    lane([[84, 82], [91, 87], local(o, o.len + 1, 1.5), local(o, o.len - 8, 2)]);
  }
  // a steep path down to the boathouses
  const sz = (x) => kit.shoreZ(x);
  lane([[104, world._roadZ(104) - 3], [112, world._roadZ(112) - 14], [98, sz(98) + 13], [88, sz(88) + 4.5]], 1.6);
  lane([[88, sz(88) + 4.5], [106, sz(106) + 4], [124, sz(124) + 4.5]], 1.6);
  S.add(TB.meshes(wavy({ scale: 0.12, warp: 0.25, angle: 1.2, contrast: 0.5 })));

  // ---------------------------------------------------------------- the farms
  const wood = (x, z, r, top) => world.colliders.push({ x, z, r, top });
  const birches = [[], [], []],
    lime = [],
    rowans = [],
    spruces = [],
    pines = [],
    junipers = [];
  const trees = new Hash(8);
  const tree = (list, x, z, h, o = {}) => {
    const y = H(x, z);
    list.push({ x, y: y - 0.25, z, ry: R() * 6.283, s: o.s ?? h, c: o.c, rz: (R() - 0.5) * 0.06 });
    trees.add(x, z, o.clear ?? 2.4);
    wood(x, z, o.trunk ?? 0.3, y + Math.min(h * 0.5, 6));
    maps.blob(x, z, o.shade ?? h * 0.3, 0.3);
  };
  const birch = (x, z, h = 7 + R() * 5) => tree(birches[(R() * 3) | 0], x, z, h, { c: pick(BIRCH) });
  const farmFolk = [
    { kind: 'man', hat: 'cap', col: 0x3a3440, sleeve: 0xd9d0c0 },
    { kind: 'woman', hat: 'scarf', col: 0x5a2a2a, hatCol: 0xd9d0c0 },
    { kind: 'child', hat: 'none', col: 0x4a5a6a },
    { kind: 'woman', hat: 'scarf', col: 0x2a3a4a, hatCol: 0x8a3a2a },
  ];
  let nFarm = 0,
    nBeast = 0;
  for (const y of YARDS) {
    if (!y.farm) continue;
    nFarm++;
    let door = null;
    for (const [what, u, v, o = {}] of FARMS[y.name]) {
      const [x, z] = local(y, u, v),
        ry = y.ry + (o.turn ?? 0);
      let res, hw, hd;
      if (what === 'house') {
        res = townHouse(ck, world, { x, z, ry, y: y.y, w: o.w, d: o.d ?? 7, R, floors: o.floors, clad: 'boards', wall: o.wall, lit: 0.85 });
        hw = o.w / 2;
        hd = (o.d ?? 7) / 2;
        hearths.push([x, y.y + res.ridge + 1.3, z]);
        door = local(y, u + res.doorX, v + hd + 1.4);
        world.glows.push({ p: [door[0], y.y + 2.5, door[1]], c: 0xffb060, size: 1.5 });
        maps.lamp(door[0], door[1], 6.5, 0xffb060, 0.7);
      } else if (what === 'barn') {
        res = barn(ck, world, { x, z, ry, y: y.y, R, w: o.w, d: o.d, h: o.h });
        hw = res.w / 2;
        hd = res.d / 2;
      } else {
        res = stabbur(ck, world, { x, z, ry, y: y.y, R, bell: o.bell });
        hw = hd = 2.6;
      }
      world.colliders.push({ x, z, hw: hw + 0.2, hd: hd + 0.2, ry, top: y.y + res.top });
      maps.blob(x, z, Math.max(hw, hd) * 1.9, 0.4);
    }
    // the fence along the lip of the terrace and down both ends, open where the lane comes in
    const rim = [local(y, -y.len, -y.dep * 0.5)];
    for (let u = -y.len; u <= y.len; u += 3.4) rim.push(local(y, u, y.dep + 1));
    rim.push(local(y, y.len, -y.dep * 0.5));
    let run = [];
    for (const p of [...rim, null]) {
      if (p && !onLane(p[0], p[1], 1.4)) run.push(p);
      else {
        if (run.length > 1) skigard(W, run, H);
        run = [];
      }
    }
    // people by the door, a cart in the yard, the tree every farmyard has
    if (door) {
      const n = 2 + ((R() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const a = R() * 6.283,
          px = door[0] + Math.cos(a) * (0.8 + i * 0.9),
          pz = door[1] + Math.sin(a) * (0.8 + i * 0.9);
        person(px, pz, Math.atan2(door[0] - px, door[1] - pz) + (R() - 0.5), farmFolk[(nFarm + i) % farmFolk.length]);
      }
    }
    const c = local(y, y.name === 'ekeberg' ? -6 : 2.5, y.name === 'ekeberg' ? 3 : 3.5);
    cart(D, xf(c[0], y.y, c[1], y.ry + R() * 2), { hay: R() < 0.6 });
    wood(c[0], c[1], 1.3, y.y + 1.2);
    const t = local(y, y.name === 'ekeberg' ? 6 : -1.5 + (R() - 0.5) * 3, y.name === 'ekeberg' ? 6 : 5);
    birch(t[0], t[1], 13 + R() * 3);
    // hay on the racks below the terrace, cattle and sheep on the slope under them
    const below = y.dep + y.blend;
    for (let k = 0, n = y.name === 'plassen' ? 1 : 2; k <= n; k++) {
      const [hx, hz] = local(y, (k - n / 2) * (y.len * 0.62) + (R() - 0.5) * 4, below + 5 + R() * 3);
      if (roadDn(hx, hz) > -9 || onLane(hx, hz, 2)) continue;
      hesje(D, hx, hz, y.ry + (R() - 0.5) * 0.12, 10 + R() * 4, H, R);
      world.colliders.push({ x: hx, z: hz, hw: 6, hd: 0.5, ry: y.ry, top: H(hx, hz) + 1.7 });
    }
    for (let k = 0, n = y.name === 'plassen' ? 2 : 3 + ((R() * 3) | 0); k < n; k++) {
      const [bx, bz] = local(y, (R() - 0.5) * y.len * 1.7, below + 13 + R() * 12);
      if (roadDn(bx, bz) > -8 || onLane(bx, bz, 2)) continue;
      cow(D, { x: bx, y: H(bx, bz), z: bz, ry: R() * 6.283, graze: R() < 0.7, coat: pick(COWS), R });
      wood(bx, bz, 0.9, H(bx, bz) + 1.4);
      nBeast++;
    }
    // a horse by the barn, looking over the fence
    {
      const [bx, bz] = local(y, y.len * 0.55 * (y.name === 'ekeberg' ? -0.2 : 1), y.dep - 1.2);
      horse(D, { x: bx, y: H(bx, bz), z: bz, ry: y.ry + (R() - 0.5) * 0.8, coat: pick([0xc9a878, 0xd9b98a, 0x6a3a22, 0xe8e2d4]) });
      wood(bx, bz, 0.9, H(bx, bz) + 1.6);
      nBeast++;
    }
    // birches round the yard
    for (let i = 0, n = 5 + ((R() * 4) | 0); i < n; i++) {
      const [bx, bz] = local(y, (R() - 0.5) * 2 * (y.len + 6), R() < 0.6 ? -(y.dep + 3 + R() * 7) : y.dep + 4 + R() * 5);
      if (!onLane(bx, bz, 2) && Math.abs(roadDn(bx, bz)) > 7) birch(bx, bz);
    }
  }
  // sheep on two of the pastures
  for (const f of fields.filter((q) => q[3] === 0x6f9a4a || q[3] === 0x3f6a5a).slice(0, 3)) {
    if (yardAt(f[0], f[1], 0.05)) continue;
    for (let i = 0, n = 6 + ((R() * 5) | 0); i < n; i++) {
      const a = R() * 6.283,
        d = Math.sqrt(R()) * f[2] * 0.8,
        x = f[0] + Math.cos(a) * d * 1.3,
        z = f[1] + Math.sin(a) * d * 0.7;
      if (onLane(x, z, 1)) continue;
      sheep(D, { x, y: H(x, z), z, ry: R() * 6.283, graze: R() < 0.75, wool: pick([0xd9d0b8, 0xc8c0a8, 0xe8e0c8, 0x4a4038]), s: 0.9 + R() * 0.25 });
      nBeast++;
    }
  }

  // ---------------------------------------------------------------- the shore under the hill
  for (const [x, ry] of [[88, 2.868], [124, 2.868]]) {
    const z = sz(x) - 2.2;
    naust(ck, world, { x, z, ry, R });
    maps.blob(x, z, 9, 0.35);
  }
  // a man out fishing off each landing, and a boat left at the dancing green
  for (const [x, z, ry] of [[70, sz(70) - 26, 0.6], [142, sz(142) - 20, -0.9], [-52, sz(-52) - 30, 2.2]]) {
    rowboat(D, xf(x, -0.18, z, ry), pick([0x7a5a3a, 0x3a4a5a, 0x8a3226]));
    kristianiaPerson(D, { x: x - Math.cos(ry) * 0.5, y: -0.08, z: z + Math.sin(ry) * 0.5, ry: ry + 1.2, R, kind: 'man', hat: 'cap', col: 0x2a3440, arms: 0.7, scale: 0.9 });
    world.colliders.push({ x, z, r: 2.2, top: 0.9 });
  }

  // ---------------------------------------------------------------- trees
  const taken = footprints(world.colliders, H);
  const crowded = (x, z, r) => trees.any(x, z, r + 3, (px, pz, c) => Math.hypot(px - x, pz - z) < Math.max(r, c));
  const open = (x, z, pad = 0) => H(x, z) > 1.2 && townWeight(x, z) < 0.02 && !onLane(x, z, pad) && !taken(x, z, pad + 0.4);
  // the view from where he stood: nothing tall on the bank between that stretch of road and the fjord
  const inView = (x, z) => x > -85 && x < 48 && roadDn(x, z) > 0;
  // ... and just over the railing there, only short grass and heather
  const fringe = (x, z) => inView(x, z) && roadDn(x, z) < 13;
  // (the trees the hill had, redrawn where they stood)
  const ride = (x, z) => Math.hypot(x - 70, z - 64) < 32 && Math.abs((x - 70) * Math.cos(0.15) - (z - 64) * Math.sin(0.15)) < 4; // where the felled trunk lies
  const stands = (t) => !yardAt(t.x, t.z, 0.1) && !onLane(t.x, t.z, 1) && !taken(t.x, t.z, 0.6) && !ride(t.x, t.z);
  for (const t of oldTrees.birches) if (stands(t)) birch(t.x, t.z, t.h + 1);
  for (const t of oldTrees.spruces) {
    if (!stands(t)) continue;
    const r = t.h * (0.17 + R() * 0.06);
    tree(spruces, t.x, t.z, t.h, { s: [r, t.h, r], c: pick(SPRUCE), trunk: 0.4, shade: r * 1.4, clear: r * 0.9 });
  }
  // the forest: thick on the heights, in stands lower down, pine on the dry knolls
  for (let i = 0, made = 0; i < 70000 && made < 1050; i++) {
    const x = -290 + R() * 500,
      z = -75 + R() * 285,
      dn = roadDn(x, z);
    if (Math.abs(dn) < 13 || !open(x, z, 2)) continue;
    const up = -dn,
      stand = vnoise(x * 0.018 + 3, z * 0.018 + 9);
    if (dn > 0 ? inView(x, z) || stand < 0.64 : stand < (up > 80 ? 0.34 : up > 40 ? 0.5 : 0.62)) continue;
    if (yardAt(x, z, 0.01) || inField(x, z, 2)) continue;
    const log = Math.hypot(x - 70, z - 64) < 32,
      isPine = log || vnoise(x * 0.05 + 40, z * 0.05) > 0.66;
    if (ride(x, z)) continue;
    const h = (isPine ? 14 : 10) + R() * (isPine ? 8 : 10) + (up > 80 ? 3 : 0) - (dn > 0 ? 3 : 0),
      r = h * (isPine ? 0.13 + R() * 0.05 : 0.17 + R() * 0.07);
    if (crowded(x, z, isPine ? 3.2 : 2.6)) continue;
    tree(isPine ? pines : spruces, x, z, h, { s: [r, h, r], c: pick(isPine ? PINE : SPRUCE), trunk: 0.4, shade: r * 1.4, clear: r * 0.9 });
    made++;
  }
  // birch: by the road on the uphill side, in groves on the open slopes, down the banks
  for (let i = 0, made = 0; i < 6000 && made < 170; i++) {
    const x = -280 + R() * 480,
      z = -75 + R() * 250,
      dn = roadDn(x, z);
    if (Math.abs(dn) < 7 || !open(x, z, 2.5) || yardAt(x, z, 0.3) || inField(x, z, 1)) continue;
    if (dn > 0 ? inView(x, z) : -dn > 75 && R() < 0.8) continue;
    if (vnoise(x * 0.03 + 21, z * 0.03 + 5) < 0.5) continue;
    for (let k = 0, n = 2 + ((R() * 4) | 0); k < n; k++) {
      const bx = x + (R() - 0.5) * 9,
        bz = z + (R() - 0.5) * 9;
      if (Math.abs(roadDn(bx, bz)) < 6 || !open(bx, bz, 1.5) || crowded(bx, bz, 2.6) || (roadDn(bx, bz) > 0 && inView(bx, bz))) continue;
      if (R() < 0.18) tree(rowans, bx, bz, 4.5 + R() * 2.5, { c: pick(ROWAN) });
      else birch(bx, bz);
      made++;
    }
  }
  // the great lime beside the white house, and birches along the green
  {
    const y = yard('shore green');
    const [lx, lz] = local(y, 6.5, 0.5);
    tree(lime, lx, lz, 15, { c: 0x2f6a44, trunk: 0.7, shade: 8 });
    for (const [u, v] of [[-25, -6], [-17, -8.5], [-3, -8], [24, -7]]) {
      const [bx, bz] = local(y, u, v);
      birch(bx, bz, 8 + R() * 3);
    }
  }
  // juniper on the bare slopes
  for (let i = 0, made = 0; i < 9000 && made < 300; i++) {
    const x = -280 + R() * 480,
      z = -80 + R() * 250,
      dn = roadDn(x, z);
    if (Math.abs(dn) < 5 || !open(x, z, 1.5) || yardAt(x, z, 0.4) || inField(x, z) || crowded(x, z, 1.6) || fringe(x, z)) continue;
    if (vnoise(x * 0.04 + 9, z * 0.04 + 31) < 0.52) continue;
    const h = dn > 0 && inView(x, z) ? 1 + R() * 0.7 : 1.6 + R() * 2.2,
      w = 0.8 + R() * 0.7,
      y = H(x, z);
    junipers.push({ x, y: y - 0.1, z, ry: R() * 6.283, s: [w, h, w], c: pick(JUNIPER) });
    trees.add(x, z, 1.2);
    maps.blob(x, z, w * 1.6, 0.25);
    made++;
  }

  // ---------------------------------------------------------------- what covers the ground
  const bare = (x, z, pad) => H(x, z) < 0.6 || townWeight(x, z) > 0.02 || Math.abs(roadDn(x, z)) < 3.7 + pad || onLane(x, z, pad) || taken(x, z, pad);
  const tufts = [],
    heather = [],
    ferns = [],
    scrub = [],
    stones = [],
    boulders = [];
  for (let i = 0; i < 90000 && tufts.length < 17000; i++) {
    const x = -290 + R() * 500,
      z = -110 + R() * 320;
    if (bare(x, z, 0.3) || inField(x, z, -1)) continue;
    const inYard = yardAt(x, z, 0.6);
    if (inYard ? R() < 0.8 : vnoise(x * 0.05 + 7, z * 0.05) < 0.26 + 0.3 * R()) continue;
    const low = fringe(x, z) ? 0.6 : 1;
    tufts.push({ x, y: H(x, z) - 0.04, z, ry: R() * 6.283, s: [0.8 + R() * 0.6, (0.6 + R() * 0.7) * low, 0.8 + R() * 0.6], c: pick(STRAW) });
  }
  for (let i = 0; i < 30000 && heather.length < 4600; i++) {
    const x = -290 + R() * 500,
      z = -110 + R() * 320;
    if (bare(x, z, 0.5) || yardAt(x, z, 0.3) || inField(x, z, 0)) continue;
    if (vnoise(x * 0.035 + 50, z * 0.035 + 12) < 0.5 + 0.2 * R()) continue;
    const s = 0.5 + R() * 0.7;
    heather.push({ x, y: H(x, z) - 0.03, z, ry: R() * 6.283, s: [s, s * (0.8 + R() * 0.6), s], c: pick(HEATHER) });
  }
  for (let i = 0; i < 26000 && ferns.length < 2800; i++) {
    const x = -290 + R() * 500,
      z = -110 + R() * 320;
    if (bare(x, z, 0.6) || yardAt(x, z, 0.3) || inField(x, z, 0) || fringe(x, z)) continue;
    // bracken likes the edge of the trees and the damp of the banks
    if (!trees.any(x, z, 7, (px, pz) => Math.hypot(px - x, pz - z) < 7) && vnoise(x * 0.04 + 80, z * 0.04) < 0.66) continue;
    const s = 0.6 + R() * 0.7;
    ferns.push({ x, y: H(x, z) - 0.02, z, ry: R() * 6.283, s: [s, s * (0.8 + R() * 0.5), s], c: pick(FERN) });
  }
  for (let i = 0; i < 16000 && scrub.length < 1100; i++) {
    const x = -290 + R() * 500,
      z = -110 + R() * 320;
    if (bare(x, z, 0.8) || yardAt(x, z, 0.4) || inField(x, z, 0) || fringe(x, z)) continue;
    if (vnoise(x * 0.03 + 110, z * 0.03 + 60) < 0.5) continue;
    const col = pick(SCRUB);
    for (let k = 0, n = 1 + ((R() * 3) | 0); k < n; k++) {
      const bx = x + (R() - 0.5) * 3,
        bz = z + (R() - 0.5) * 3,
        s = 0.6 + R() * 0.9;
      if (!bare(bx, bz, 0.8)) scrub.push({ x: bx, y: H(bx, bz) - 0.03, z: bz, ry: R() * 6.283, s: [s, s * (0.7 + R() * 0.6), s], c: col });
    }
  }
  for (let i = 0; i < 9000 && stones.length < 900; i++) {
    const x = -290 + R() * 500,
      z = -110 + R() * 320,
      y = H(x, z);
    if (y < -0.3 || townWeight(x, z) > 0.02 || Math.abs(roadDn(x, z)) < 4 || onLane(x, z, 0.5) || taken(x, z, 0.6) || yardAt(x, z, 0.5) || inField(x, z, 0)) continue;
    if (y > 3 && vnoise(x * 0.06 + 140, z * 0.06 + 77) < 0.55) continue;
    for (let k = 0, n = 1 + ((R() * 3) | 0); k < n; k++) {
      const bx = x + (R() - 0.5) * 2.6,
        bz = z + (R() - 0.5) * 2.6,
        r = 0.16 + R() * R() * 0.7;
      stones.push({ x: bx, y: H(bx, bz) + r * 0.12, z: bz, ry: R() * 6.283, rx: (R() - 0.5) * 0.4, s: r, c: pick(STONE) });
    }
    // now and then one the ice left behind
    if (R() < 0.07 && y > 2 && !crowded(x, z, 3) && !fringe(x, z)) {
      const r = 1.1 + R() * 1.5;
      boulders.push({ x, y: y + r * 0.15, z, ry: R() * 6.283, rx: (R() - 0.5) * 0.3, s: [r, r * (0.7 + R() * 0.4), r * (0.8 + R() * 0.3)], c: pick(STONE) });
      wood(x, z, r * 0.8, y + r * 0.7);
      maps.blob(x, z, r * 1.6, 0.35);
    }
  }

  // ---------------------------------------------------------------- on the road
  const figures = ['man', 'woman', 'gentleman', 'woman', 'man', 'child'].map((kind) => {
    const s = new Soup();
    kristianiaPerson(s, { x: 0, y: 0, z: 0, ry: 0, R, kind });
    return weld(s.geometry());
  });
  const folk = new Walkers(S, mats.detail, figures);
  const east = way(world, [[146, 43], [100, 30], [56, 16]]),
    west = way(world, [[-50, -23], [-96, -44], [-136, -61]]);
  folk.add(east, 7, R, { wide: 1.6, speed: [0.6, 1.1] });
  folk.add(west, 6, R, { wide: 1.6, speed: [0.6, 1.1] });
  folk.build();
  // a load of hay going home behind a fjord horse
  const rig = new Soup();
  cart(rig, xf(0, 0, 0, -Math.PI / 2), { hay: true, up: true });
  horse(rig, { z: 2.05 });
  kristianiaPerson(rig, { x: 0, y: 0.44, z: 0.95, ry: 0, R, kind: 'man', hat: 'cap', col: 0x3a3440, arms: 0.5, scale: 0.95 });
  const carts = new Walkers(S, mats.detail, [weld(rig.geometry())]);
  carts.add(east, 1, R, { wide: 0.8, speed: [1.5, 1.9] });
  carts.add(west, 1, R, { wide: 0.8, speed: [1.5, 1.9] });
  carts.build();

  // ---------------------------------------------------------------- into the scene
  addSmoke(S, hearths, { color: 0x6a6480, wind: [1.3, 0, -0.4], seed: 44 });
  const b = ck.build();
  S.add(b.base, b.detail);
  const leaf = wavy({ scale: 0.2, warp: 0.4, rim: 0.3, wallStretch: 0.5, angle: 1.57, side: THREE.DoubleSide });
  const LEAF = [0xf2c230, 0xe8a030, 0xffd45a, 0xd9782a];
  const layers = [
    [instances(tufts, tuftGeo(R), leaf, 64), 100],
    [instances(heather, heatherGeo(R), leaf, 64), 130],
    [instances(ferns, fernGeo(R), leaf, 64), 110],
    [instances(scrub, scrubGeo(R), leaf, 96), 190],
    [instances(stones, rockGeo(0), leaf, 96), 170],
    [instances(boulders, rockGeo(1), leaf, 128), 0],
    [instances(junipers, juniperGeo(R), leaf, 96), 300],
    ...birches.map((list) => [instances(list, birchGeo(R, { leaf: LEAF }), leaf, 96), 260]),
    [instances(rowans, birchGeo(R, { leaf: [0xc8382c, 0xe0642a, 0xb8502a, 0xd9782a], bark: 0x6a6468, scar: 0x4a4448, sprays: 34, berries: true }), leaf, 96), 220],
    [instances(lime, birchGeo(R, { leaf: [0x2f6a44, 0x24523a, 0x3a7a4a, 0x1c4030], bark: 0x3a2c2a, scar: 0x2a2020, sprays: 260, glow: 0.04, spread: 0.34 }), leaf, 96), 0],
    [instances(pines, pineGeo(R), leaf, 96), 0],
  ];
  for (const [l] of layers) S.add(l.group);
  // the spruce is drawn in full near by, and as a few broad boughs far off
  const near = instances(spruces, spruceGeo(R), leaf, 96),
    far = instances(spruces, spruceGeo(R, { tiers: 4, boughs: 6, ridge: false }), leaf, 96);
  S.add(near.group, far.group);
  console.log('scream: country', nFarm, 'farms,', nBeast, 'beasts,', spruces.length + pines.length, 'conifers,', birches.reduce((n, l) => n + l.length, 0) + rowans.length, 'birch and rowan,', junipers.length, 'juniper,', tufts.length, 'tufts,', heather.length, 'heather,', ferns.length, 'ferns,', scrub.length, 'scrub,', stones.length + boulders.length, 'stones');

  return {
    tick(dt, time, cam) {
      for (const [l, range] of layers) if (range) show(l.chunks, cam, range);
      for (let i = 0; i < near.chunks.length; i++) {
        const c = near.chunks[i],
          d = Math.hypot(cam.x - c.x, cam.z - c.z);
        c.mesh.visible = d < 115;
        far.chunks[i].mesh.visible = d >= 115;
      }
      folk.tick(dt, time, cam);
      carts.tick(dt, time, cam);
    },
  };
}
