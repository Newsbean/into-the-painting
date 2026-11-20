// A town from a plan: houses along every street, cobbles under them, gas lamps down
// the pavements, strings of lights over the festive streets.
//
//   const town = buildTown(world, { streets, squares, keep, inside, R, floors, style })
//   world.scene.add(town.group);   each frame: town.tick(camera.position)
//
// The houses are gathered into chunks of about a block. Each chunk is a few merged
// meshes (always drawn when in view) plus its instanced details (window surrounds,
// shutters, doors, shopfronts, lamp posts), which are only switched on near the camera.
// Lab: /?debug&bare&lab=worlds/starry/town/district.js
import * as THREE from 'three';
import { Builder, ribbon, patch, mix, xf } from '../../../engine/build.js';
import { vnoise } from '../../../engine/gl.js';
import { Kit, townMaterials } from './kit.js';
import { house, randomStyle } from './house.js';
import { layLots, inKeep, along, Hash } from './plan.js';

const CHUNK = 96;
const LAMP = 0xffc46a;

export function buildTown(world, o) {
  const { streets, R, keep = [], inside = () => true, squares = [] } = o;
  const H = (x, z) => world.heightAt(x, z);
  const mats = o.mats ?? townMaterials(world.ctx.strokes);
  const { lots, traces, inRoad, occupied } = layLots(streets, { R, keep, inside, ...(o.lots ?? {}) });

  const chunks = new Map();
  const chunkOf = (x, z) => {
    const k = Math.floor(x / CHUNK) + ':' + Math.floor(z / CHUNK);
    let c = chunks.get(k);
    if (!c) chunks.set(k, (c = { kit: new Kit(mats), sx: 0, sz: 0, n: 0, pts: [] }));
    c.sx += x;
    c.sz += z;
    c.n++;
    c.pts.push([x, z]);
    return c;
  };

  // ---------------------------------------------------------------- houses
  for (const lot of lots) {
    const ch = chunkOf(lot.x, lot.z);
    const p = along(traces[lot.street], lot.s);
    // which way the row runs, seen from the house: is "after" on its right hand?
    const dir = Math.cos(lot.ry) * p.tx - Math.sin(lot.ry) * p.tz;
    const open = { right: dir > 0 ? lot.after : lot.before, left: dir > 0 ? lot.before : lot.after };
    const floors = o.floors ? o.floors(lot.x, lot.z, R, lot) : 2 + ((R() * 3) | 0);
    const shop = R() < (o.shops ? o.shops(lot) : lot.main ? 0.62 : 0.14);
    const style = randomStyle(R, o.style ? o.style(lot, R) : {});
    const res = house(ch.kit, world, { x: lot.x, z: lot.z, ry: lot.ry, w: lot.w, d: lot.d, floors, R, style, shop, gableFront: lot.w < 8.5 && R() < 0.16, open, lit: o.lit ?? 0.58 });
    const gy = H(lot.x, lot.z);
    world.colliders.push({ x: lot.x, z: lot.z, hw: lot.w / 2 + 0.1, hd: lot.d / 2 + 0.1, ry: lot.ry, top: gy + res.top });
    world.maps?.blob(lot.x, lot.z, Math.max(lot.w, lot.d) * 0.9, 0.35);
    lot.top = gy + res.top;
  }

  // ---------------------------------------------------------------- lamps and strings of lights
  const lamps = new Hash(20);
  let nLamps = 0;
  streets.forEach((st, si) => {
    const T = traces[si];
    if (st.lamps !== false) {
      const gap = st.main ? 19 : 26;
      let k = (R() * 2) | 0;
      for (let s = 5 + R() * 6; s < T.length_ - 4; s += gap, k++) {
        const p = along(T, s);
        const side = k % 2 ? 1 : -1;
        const off = st.w / 2 - 0.9;
        const x = p.x - p.tz * side * off,
          z = p.z + p.tx * side * off;
        if (!inside(x, z) || lamps.any(x, z, 9, (lx, lz) => (lx - x) ** 2 + (lz - z) ** 2 < 81)) continue;
        // not in the middle of a crossing street
        if (inRoad(x, z, -1.6)) continue;
        const y = H(x, z);
        chunkOf(x, z).kit.place('lampPost', xf(x, y, z, R() * 6.283), 0xffffff);
        world.glows?.push({ p: [x, y + 3.78, z], c: LAMP, size: 3 });
        world.maps?.lamp(x, z, 11, LAMP, 0.9);
        world.colliders.push({ x, z, r: 0.2, top: y + 4.3 });
        lamps.add(x, z, 1);
        nLamps++;
      }
    }
    if (st.festive) {
      for (let s = 9 + R() * 5; s < T.length_ - 8; s += 15 + R() * 7) {
        const p = along(T, s);
        if (inKeep(keep, p.x, p.z)) continue;
        const nx = -p.tz,
          nz = p.tx;
        const span = st.w + 0.5;
        const ax = p.x + (nx * span) / 2,
          az = p.z + (nz * span) / 2;
        const y = H(p.x, p.z) + 5.7;
        const m = new THREE.Matrix4().set(-nx * span, 0, p.tx, ax, 0, 1, 0, y, -nz * span, 0, p.tz, az, 0, 0, 0, 1);
        chunkOf(p.x, p.z).kit.place('bulbs', m, 0xffffff);
        world.glows?.push({ p: [p.x, y - 0.9, p.z], c: 0xffd27a, size: 2.2 });
      }
    }
  });

  // ---------------------------------------------------------------- the ground of the town
  const SB = new Builder();
  const cob = (x, y, z) => mix(0x6c5fa6, 0xa57cb6, vnoise(x * 0.35, z * 0.35)).lerp(new THREE.Color(0x4a5cae), vnoise(x * 0.11 + 7, z * 0.11) * 0.5);
  streets.forEach((st, i) => {
    if (st.paved === false) return;
    SB.parts.push(ribbon(st.pts, st.w + 1.3, H, cob, { lift: 0.1 + (i % 9) * 0.005, across: 4, step: 2.2 }));
  });
  for (const sq of squares) SB.parts.push(patch(sq.x, sq.z, sq.r, H, cob, { lift: 0.16, wobble: sq.wobble ?? 0.04 }));

  // ---------------------------------------------------------------- finish
  const group = new THREE.Group();
  if (SB.parts.length) group.add(SB.mesh(mats.cobble));
  const list = [];
  let tris = 0;
  for (const c of chunks.values()) {
    const b = c.kit.build();
    const x = c.sx / c.n,
      z = c.sz / c.n;
    let r = 0;
    for (const [px, pz] of c.pts) r = Math.max(r, Math.hypot(px - x, pz - z));
    group.add(b.base, b.detail);
    list.push({ detail: b.detail, x, z, r: r + 8 });
    tris += b.tris;
  }
  const range = o.detailRange ?? 130;
  return {
    group,
    lots,
    traces,
    mats,
    inRoad,
    occupied, // (x, z, r): on a street or under a house? for planting courtyards and gardens
    stats: { houses: lots.length, lamps: nLamps, chunks: list.length, triangles: Math.round(tris) },
    // switch the fine detail on only where it can be seen
    tick(cam) {
      for (const c of list) c.detail.visible = Math.hypot(cam.x - c.x, cam.z - c.z) < range + c.r;
    },
  };
}
