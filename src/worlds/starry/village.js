import * as THREE from 'three';
import { paintMaterial } from '../../engine/paint.js';
import { Builder, cypress, blobTree } from '../../engine/build.js';
import { rng, lerp } from '../../engine/gl.js';
import { ROADS, KEEP, riverAt } from './terrain.js';
import { Kit } from './town/kit.js';
import { house, randomStyle } from './town/house.js';
import { buildTown } from './town/town.js';
import { church } from './town/church.js';
import { strollers } from './town/people.js';
import { townStreets, townFloors, inTown, TOWN, FORUM, QUAY_FOOT } from './town/layout.js';

// ---------------- the village of the painting, and the town across the river
//
// Both are laid out by the town planner (town/plan.js): rows of generated houses along
// both sides of every street. The village keeps its old roads; the town has its own grid
// (town/layout.js). The church and the asylum are built by hand, here.
export function village(world, kit) {
  const { S, R, H, maps, B, placed, free, nearRoad, AX, AZ, mats, strokes } = kit;
  const keepRects = KEEP.map(([x0, x1, z0, z1]) => ({ x0, x1, z0, z1 }));
  const SQUARE = { x: 10, z: -32, r: 16 };

  // ---------------------------------------------------------------- the village
  const vStreets = ROADS.map((r, i) => ({ pts: r.pts, w: r.w + 2.6, main: i === 1 || i === 2, paved: false })); // terrain.js lays their cobbles
  const hamlet = buildTown(world, {
    streets: vStreets,
    R,
    mats,
    keep: [...keepRects, SQUARE, { x: AX + 4, z: AZ - 10, r: 27 }, { x: AX, z: AZ, r: 19 }],
    inside: (x, z) => Math.hypot(x - 8, z + 30) < 68 && z < 26 && !((riverAt(x, z)?.lev ?? 0) > 0.05),
    lots: { widths: [5.5, 9], depths: [6.5, 9] },
    floors: (x, z, r) => (Math.hypot(x - 10, z + 32) < 32 ? 2 + ((r() * 1.7) | 0) : 1 + ((r() * 2) | 0)),
    shops: (lot) => (Math.hypot(lot.x - 10, lot.z + 32) < 36 ? 0.5 : 0.06),
    lit: 0.7,
    populate: (t) => strollers(world, t, (x, z) => t.kitAt(x, z).s('detail'), R, 26, vStreets),
  });
  S.add(hamlet.group);
  for (const lot of hamlet.lots) placed.push([lot.x, lot.z, Math.max(lot.w, lot.d) * 0.55]);

  // the church, the asylum and the outlying farms share one kit; they are few, so their detail is always drawn
  const lk = new Kit(mats);

  // a looser outer ring of farmhouses
  for (let i = 0; i < 26; i++) {
    const a = R() * 6.283,
      d = 52 + R() * 34;
    const x = 8 + Math.cos(a) * d,
      z = -30 + Math.sin(a) * d * 0.9;
    const w = 7 + R() * 4,
      dd = 6.5 + R() * 2.5,
      ry = R() * 6.283;
    const rad = Math.max(w, dd) * 0.6;
    if (nearRoad(x, z, 7) || !free(x, z, rad + 1) || kit.inKeep(x, z, 6) || (riverAt(x, z)?.lev ?? 0) > 0.05) continue;
    placed.push([x, z, rad]);
    const res = house(lk, world, { x, z, ry, w, d: dd, floors: 1 + ((R() * 1.6) | 0), R, style: randomStyle(R, { wallMat: R() < 0.7 ? 'stone' : 'plaster', balcony: false, quoins: false }), shop: false, gableFront: R() < 0.3, open: { left: true, right: true }, lit: 0.55 });
    world.colliders.push({ x, z, hw: w / 2 + 0.1, hd: dd / 2 + 0.1, ry, top: H(x, z) + res.top });
    maps.blob(x, z, rad * 1.6, 0.4);
  }

  // church: the steeple that pierces the horizon
  church(lk, world, { x: 10, z: -54.2 });
  placed.push([10, -53, 14]);

  // the asylum of Saint-Paul: long monastery wing, cloister wall, a garden
  {
    const sty = (o = {}) => randomStyle(R, { wallMat: 'stone', wall: 0xd9c9a0, slate: false, roof: 0xb5532e, shutter: 0x5f8f9a, door: 0x5f8f9a, shutters: true, balcony: false, quoins: false, timber: false, attic: false, dormers: false, pitch: 0.62, bay: 3.3, ...o });
    const wings = [
      { x: AX + 4, z: AZ - 17, ry: 0, w: 34, d: 8 },
      { x: AX + 22, z: AZ - 2, ry: -Math.PI / 2, w: 22, d: 8 },
    ];
    for (const g of wings) {
      const res = house(lk, world, { ...g, floors: 2, R, style: sty(), shop: false, open: { left: true, right: true }, lit: 0.5, lantern: false });
      world.colliders.push({ x: g.x, z: g.z, hw: g.w / 2 + 0.2, hd: g.d / 2 + 0.2, ry: g.ry, top: H(g.x, g.z) + res.top });
      maps.blob(g.x, g.z, g.w * 0.6, 0.4);
    }
    // low garden wall
    for (const [wx, wz, ww, wd] of [[AX - 14, AZ, 0.7, 30], [AX + 2, AZ + 15, 32, 0.7]]) {
      B.box(ww, 1.5, wd, 0xb8ab8a, wx, H(wx, wz) - 0.3, wz);
      world.colliders.push({ x: wx, z: wz, hw: ww / 2, hd: wd / 2, ry: 0, top: H(wx, wz) + 1.2 });
    }
    placed.push([AX + 4, AZ - 10, 26], [AX, AZ, 18]);
  }
  const lb = lk.build();
  S.add(lb.base, lb.detail);

  // string of lights across the square
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = lerp(-3, 23, t),
      z = -22 + Math.sin(t * Math.PI) * -3;
    world.glows.push({ p: [x, 6.4 - Math.sin(t * Math.PI) * 1.6, z], c: [0xff8f5a, 0xffd56b, 0x8fd0ff, 0xff7ab0][i % 4], size: 0.9 });
  }
  maps.lamp(10, -24, 14, 0xffc47a, 0.5);

  // a fountain to anchor the square
  const fountain = (fx, fz, k = 1) => {
    const y = H(fx, fz);
    B.cyl(3.1 * k, 3.3 * k, 0.7, 0x8a94c0, fx, y, fz, 16);
    B.cyl(2.7 * k, 2.7 * k, 0.12, 0x5fb0d8, fx, y + 0.62, fz, 16, { emissive: 0.35 });
    B.cyl(0.35 * k, 0.5 * k, 2.2 * k, 0x9aa4cc, fx, y, fz, 8);
    B.cyl(1.1 * k, 0.4 * k, 0.3 * k, 0x9aa4cc, fx, y + 2.1 * k, fz, 10);
    world.colliders.push({ x: fx, z: fz, r: 3.3 * k, top: y + 2.5 * k });
  };
  fountain(10, -32);

  // ---------------------------------------------------------------- the town across the Rhône
  const RT = rng(1888);
  const streets = townStreets();
  const town = buildTown(world, {
    streets,
    R: RT,
    mats,
    keep: [FORUM, QUAY_FOOT],
    squares: [FORUM, QUAY_FOOT],
    inside: (x, z) => inTown(x, z),
    floors: townFloors,
    lit: 0.56,
    populate: (t) => {
      strollers(world, t, (x, z) => t.kitAt(x, z).s('detail'), RT, 170, streets);
      // the Forum: a ring of lamps round the fountain
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const x = FORUM.x + Math.cos(a) * 12.5,
          z = FORUM.z + Math.sin(a) * 12.5,
          y = H(x, z);
        t.kitAt(x, z).place('lampPost', new THREE.Matrix4().makeTranslation(x, y, z), 0xffffff);
        world.glows.push({ p: [x, y + 3.78, z], c: 0xffc46a, size: 3 });
        maps.lamp(x, z, 11, 0xffc46a, 0.85);
        world.colliders.push({ x, z, r: 0.2, top: y + 4.3 });
      }
    },
  });
  S.add(town.group);
  fountain(FORUM.x, FORUM.z, 1.5);
  maps.lamp(FORUM.x, FORUM.z, 26, 0xffc47a, 0.45);

  // trees in the courtyards, the gardens and along the edge of town
  {
    const TT = new Builder();
    let planted = 0,
      tries = 0;
    while (planted < 260 && tries++ < 9000) {
      const x = TOWN.x0 - 20 + RT() * (TOWN.x1 - TOWN.x0 + 40),
        z = TOWN.z0 - 20 + RT() * (TOWN.z1 - TOWN.z0 + 30);
      if (!inTown(x, z, 16) || town.occupied(x, z, 2.6) || Math.hypot(x - FORUM.x, z - FORUM.z) < FORUM.r + 2) continue;
      if ((riverAt(x, z)?.lev ?? 0) > 0.02) continue;
      const y = H(x, z);
      if (RT() < 0.3) {
        const h = 9 + RT() * 8;
        cypress(TT, x, y - 0.5, z, h, 1.1 + RT() * 0.6, RT, { flames: 1 });
        world.colliders.push({ x, z, r: 0.9, top: y + h * 0.7 });
      } else {
        const r = 2.3 + RT() * 1.7;
        blobTree(TT, x, y, z, r * 1.5, r, RT, { lo: [0x163a5c, 0x1b4a4a, 0x1f3f70][(RT() * 3) | 0], hi: [0x3f86a8, 0x4a9a86, 0x4f78c0][(RT() * 3) | 0], blobs: 3 });
        world.colliders.push({ x, z, r: 0.5, top: y + 3 });
      }
      maps.blob(x, z, 3.4, 0.4);
      planted++;
    }
    S.add(TT.mesh(paintMaterial({ stroke: strokes.wavy, scale: 0.16, contrast: 0.7, hueVar: 0.8, warp: 0.5, accent: 0xb9d06a, accentAmt: 0.3, impasto: 0.16, rim: 0.3, band: 0.26, wallStretch: 0.5, angle: 1.57 })));
  }

  world.town = {
    hamlet,
    town,
    tick(cam) {
      hamlet.tick(cam);
      town.tick(cam);
    },
  };
  console.log('starry: village', JSON.stringify(hamlet.stats), 'town', JSON.stringify(town.stats));
}
