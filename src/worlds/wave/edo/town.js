// Edo: the town at the west end of the coast road. Rows of merchant houses along the
// Tokaido, storehouses along the quay, a five-storey pagoda, and the castle keep on its
// mound behind them.
//
// The land it stands on is levelled in the world's heightAt (index.js) with edoWeight
// and edoLevel from this file.
import { Builder, ribbon, mix } from '../../../engine/build.js';
import { rng, smooth, vnoise } from '../../../engine/gl.js';
import { layLots } from '../../../engine/plan.js';
import { EdoKit } from './kit.js';
import { machiya, kura, pagoda, tenshu } from './house.js';
import { edoCrowd } from './people.js';

export const EDO_TOWN = { x0: -430, x1: -246, z0: 204, z1: 300 };
export const CASTLE = { x: -338, z: 334 };
export const PAGODA = { x: -402, z: 283 };

// 1 on the town's ground, fading to 0 over 24 m outside it
export function edoWeight(x, z) {
  const dx = Math.max(EDO_TOWN.x0 - x, 0, x - EDO_TOWN.x1),
    dz = Math.max(EDO_TOWN.z0 - z, 0, z - EDO_TOWN.z1);
  return 1 - smooth(0, 24, Math.hypot(dx, dz));
}
// the town rises gently from the quay
export const edoLevel = (x, z) => 2.4 + (z - EDO_TOWN.z0) * 0.022;

export function edoStreets() {
  return [
    // the quay is laid out first, so the waterfront is its own row of storehouses and shops
    { name: 'quay', pts: [[-250, 210.5], [-300, 210], [-350, 210.5], [-422, 211.5]], w: 7, main: true, sides: [-1] }, // traced east to west: -1 is the land side
    { name: 'tokaido', pts: [[-236, 227], [-256, 234], [-290, 240], [-340, 241], [-380, 242], [-428, 243]], w: 9, main: true },
    { name: 'back', pts: [[-252, 271], [-300, 272], [-350, 273], [-424, 274]], w: 6 },
    { name: 'lane', pts: [[-276, 207], [-276, 240], [-277, 272], [-278, 296]], w: 6 },
    { name: 'castle road', pts: [[-326, 207], [-326, 241], [-325, 273], [-324, 296]], w: 6.5, main: true },
    { name: 'lane', pts: [[-376, 208], [-376, 242], [-377, 273], [-378, 296]], w: 6 },
  ];
}

export function addEdoTown(world, { S, H, maps, flat }) {
  const R = rng(1603);
  const streets = edoStreets();
  const { lots, traces } = layLots(streets, {
    R,
    keep: [{ x: CASTLE.x, z: CASTLE.z, r: 48 }, { x: PAGODA.x, z: PAGODA.z, r: 9 }],
    inside: (x, z) => x > EDO_TOWN.x0 + 3 && x < EDO_TOWN.x1 - 1 && z > 205.5 && z < 297,
    widths: [5.6, 9.2],
    depths: [7.5, 10],
    setback: 0.5,
  });
  const mats = world.edoKit.mats;
  // houses gathered by stretch of town, so the small things on them are only drawn near the camera
  const chunks = new Map();
  const chunkOf = (x, z) => {
    const k = Math.floor(x / 64);
    let c = chunks.get(k);
    if (!c) chunks.set(k, (c = { kit: new EdoKit(mats), sx: 0, sz: 0, n: 0 }));
    c.sx += x;
    c.sz += z;
    c.n++;
    return c;
  };
  for (const lot of lots) {
    const st = streets[lot.street];
    const c = chunkOf(lot.x, lot.z);
    const o = { x: lot.x, z: lot.z, ry: lot.ry, w: lot.w, d: lot.d, R };
    const res = st.name === 'quay' && R() < 0.6 ? kura(c.kit, world, o) : machiya(c.kit, world, { ...o, shop: R() < (st.main ? 0.7 : 0.25), floors: R() < (st.main ? 0.85 : 0.55) ? 2 : 1 });
    world.colliders.push({ x: lot.x, z: lot.z, hw: lot.w / 2 + 0.15, hd: lot.d / 2 + 0.15, ry: lot.ry, top: H(lot.x, lot.z) + res.top });
    maps.blob(lot.x, lot.z, Math.max(lot.w, lot.d) * 0.9, 0.3);
  }

  const people = edoCrowd(world, traces, streets, (x, z) => chunkOf(x, z).kit.s('detail'), R, 80);

  // the keep and the pagoda are seen from across the bay: they are always drawn in full
  const lk = new EdoKit(mats);
  const ks = tenshu(lk, world, { x: CASTLE.x, z: CASTLE.z, ry: Math.PI });
  world.colliders.push({ x: CASTLE.x, z: CASTLE.z, hw: 13, hd: 11, ry: 0, top: ks.top });
  maps.blob(CASTLE.x, CASTLE.z, 20, 0.35);
  const pg = pagoda(lk, world, { x: PAGODA.x, z: PAGODA.z, tiers: 5, w: 6.6 });
  world.colliders.push({ x: PAGODA.x, z: PAGODA.z, hw: 3.6, hd: 3.6, ry: 0, top: pg.top - 5 });
  world.glows.push({ p: [PAGODA.x, pg.top, PAGODA.z], c: 0xffd58a, size: 2 });
  maps.blob(PAGODA.x, PAGODA.z, 9, 0.35);

  // streets of beaten earth
  const SB = new Builder();
  const earth = (x, y, z) => mix(0xd9c9a0, 0xc9b88c, vnoise(x * 0.2, z * 0.2));
  streets.forEach((st, i) => SB.parts.push(ribbon(st.pts, st.w + 1.2, H, earth, { lift: 0.07 + i * 0.004, across: 3, step: 2.4 })));
  S.add(SB.mesh(flat({ scale: 0.08 })));

  const list = [];
  for (const c of chunks.values()) {
    const b = c.kit.build();
    S.add(b.base, b.detail);
    list.push({ detail: b.detail, x: c.sx / c.n, z: c.sz / c.n });
  }
  const lb = lk.build();
  S.add(lb.base, lb.detail);
  console.log('wave: edo', lots.length, 'houses,', people, 'people');
  return {
    lots,
    tick(cam) {
      for (const c of list) c.detail.visible = Math.hypot(cam.x - c.x, cam.z - c.z) < 190;
    },
  };
}
