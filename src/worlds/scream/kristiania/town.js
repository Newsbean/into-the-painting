// Kristiania, 1893: the town at the foot of the hill. Karl Johan with its lamps and its
// evening crowd, running west to the church; warehouses shoulder to shoulder along the
// quay; the pier; barques at anchor and small boats under sail on the fjord; gulls,
// chimney smoke, leaves coming down off the birches.
//
//   const town = addKristiania(world, kit)     each frame: town.tick(dt, time, camera.position)
//
// TOWN is the level ground it stands on; the world's heightAt flattens it (index.js).
import * as THREE from 'three';
import { Builder, ribbon, mix, xf } from '../../../engine/build.js';
import { rng, vnoise, smooth } from '../../../engine/gl.js';
import { layLots, along } from '../../../engine/plan.js';
import { Soup } from '../../../engine/soup.js';
import { weld } from '../../../engine/weld.js';
import { Walkers, way } from '../../../engine/walkers.js';
import { birdFlocks, wheel } from '../../../engine/flock.js';
import { addSmoke, addPetals } from '../../../engine/air.js';
import { KristianiaKit, kristianiaMaterials, KR } from './kit.js';
import { townHouse, warehouse } from './house.js';
import { church, barque, sjekteGeo } from './landmarks.js';
import { kristianiaPerson, kristianiaCrowd } from './people.js';

export const TOWN = { x0: -306, x1: -124, z0: -110, z1: -50, y: 2.8 };
export const SQUARE = { x0: -186, x1: -158, z0: -92, z1: -66 };
export const KIRKE = { x: -268, z: -80 };
export const PIER = { x: -158, z0: -112, z1: -150, y: 2.5 };
// 1 on the town's ground, fading out over 26 m up the hill; the quay drops straight into the water
export function townWeight(x, z) {
  const dx = Math.max(TOWN.x0 - x, 0, x - TOWN.x1),
    dz = Math.max(0, z - TOWN.z1);
  return (1 - smooth(0, 26, Math.hypot(dx, dz))) * (1 - smooth(0, 2.5, TOWN.z0 - z));
}

const CHUNK = 80;
const pick = (R, a) => a[(R() * a.length) | 0];
const _t = new THREE.Color();

export function addKristiania(world, { S, H, maps, strokes, wavy }) {
  const R = rng(1863); // the year Munch was born
  const mats = kristianiaMaterials(strokes);
  const lk = new KristianiaKit(mats);
  const streets = [
    { name: 'quay', pts: [[-280, -104], [-200, -104], [-126, -104]], w: 8, sides: [1], main: true, quay: true },
    { name: 'karl johan', pts: [[-258, -80], [-220, -80], [SQUARE.x0, -80]], w: 9, main: true },
    { name: 'karl johan east', pts: [[SQUARE.x1, -80], [-128, -80]], w: 9, main: true },
    { name: 'upper street', pts: [[-282, -58], [-200, -58], [-176, -57]], w: 6, sides: [1] },
    { name: 'west lane', pts: [[-232, -100], [-232, -62]], w: 5.5 },
    { name: 'east lane', pts: [[-146, -100], [-146, -90]], w: 5.5 },
  ];
  const keep = [SQUARE, { x0: KIRKE.x - 40, x1: KIRKE.x + 6, z0: KIRKE.z - 10, z1: KIRKE.z + 10 }, { x0: -172, x1: -122, z0: -76, z1: -56 }, { x0: PIER.x - 5, x1: PIER.x + 5, z0: -112, z1: -100 }];
  const inside = (x, z) => x > TOWN.x0 + 4 && x < TOWN.x1 - 1 && z > TOWN.z0 + 1.2 && z < TOWN.z1 + 4;
  const { lots, traces } = layLots(streets, { R, keep, inside, widths: [6.5, 11], depths: [7, 9.5], setback: 0.3 });
  const chunks = new Map();
  const chunkOf = (x, z) => {
    const k = Math.floor(x / CHUNK);
    let c = chunks.get(k);
    if (!c) chunks.set(k, (c = { kit: new KristianiaKit(mats), sx: 0, sz: 0, n: 0 }));
    c.sx += x;
    c.sz += z;
    c.n++;
    return c;
  };
  const hearths = [];
  lots.forEach((lot, i) => {
    const st = streets[lot.street],
      c = chunkOf(lot.x, lot.z),
      gy = H(lot.x, lot.z);
    const o = { x: lot.x, z: lot.z, ry: lot.ry, w: lot.w, d: lot.d, R };
    const res = st.quay ? warehouse(c.kit, world, { ...o, d: Math.max(lot.d, 9) }) : townHouse(c.kit, world, { ...o, clad: st.main && R() < 0.45 ? 'plaster' : 'boards', floors: st.main ? 2 + (R() < 0.4 ? 1 : 0) : 1 + (R() < 0.5 ? 1 : 0) });
    world.colliders.push({ x: lot.x, z: lot.z, hw: lot.w / 2 + 0.1, hd: lot.d / 2 + 0.1, ry: lot.ry, top: gy + res.top });
    maps.blob(lot.x, lot.z, Math.max(lot.w, lot.d) * 0.9, 0.4);
    if (!st.quay && i % 3 === 0) hearths.push([lot.x, gy + res.ridge + 1.2, lot.z]);
  });
  church(lk, world, { x: KIRKE.x, z: KIRKE.z, ry: Math.PI / 2 });

  // ---------------------------------------------------------------- streets, quay, pier
  const SB = new Builder();
  const cob = (x, y, z) => mix(0x5a4a4a, 0x9a846a, vnoise(x * 0.3, z * 0.3)).lerp(_t.set(0x4a4468), vnoise(x * 0.08 + 3, z * 0.08) * 0.5);
  streets.forEach((st, i) => SB.parts.push(ribbon(st.pts, st.w + 1.2, H, cob, { lift: 0.06 + i * 0.005, across: 4, step: 2.2 })));
  SB.parts.push(ribbon([[KIRKE.x - 36, KIRKE.z], [KIRKE.x, KIRKE.z], [KIRKE.x + 12, KIRKE.z]], 22, H, cob, { lift: 0.05, across: 6, step: 3 }));
  S.add(SB.meshes(mats.stone, 150));
  // the quay wall, and what stands along its edge
  const qs = lk.s('stone');
  for (let x = TOWN.x0 + 2; x < TOWN.x1; x += 6) {
    const sh = 0.7 + R() * 0.35;
    qs.facing([x + 3, 0, TOWN.z0 + 9]);
    qs.quad([x, -2.6, TOWN.z0 - 0.4], [x + 6, -2.6, TOWN.z0 - 0.4], [x + 6, TOWN.y + 0.12, TOWN.z0 - 0.4], [x, TOWN.y + 0.12, TOWN.z0 - 0.4], (px, py) => _t.set(KR.STONE_D).multiplyScalar(sh * (0.6 + 0.4 * smooth(-2, 2.5, py))));
    qs.facing([x + 3, -30, TOWN.z0]);
    qs.quad([x, TOWN.y + 0.12, TOWN.z0 - 0.4], [x + 6, TOWN.y + 0.12, TOWN.z0 - 0.4], [x + 6, TOWN.y + 0.12, TOWN.z0 + 0.5], [x, TOWN.y + 0.12, TOWN.z0 + 0.5], KR.STONE);
    qs.facing(null);
  }
  for (let x = TOWN.x0 + 8; x < TOWN.x1 - 4; x += 9 + R() * 6) {
    if (Math.abs(x - PIER.x) < 5) continue;
    lk.place('bollard', xf(x, TOWN.y + 0.12, TOWN.z0 + 0.3), 0xffffff);
    const gx = x + 2 + R() * 3,
      gz = TOWN.z0 + 1.6 + R() * 1.2;
    if (R() < 0.7) for (let k = 0, n = 1 + ((R() * 3) | 0); k < n; k++) lk.place(R() < 0.5 ? 'barrel' : 'crate', xf(gx + k * 0.8, TOWN.y + 0.06, gz + (R() - 0.5) * 0.6, R() * 3), pick(R, [0x6a4a34, 0x8a6a44, 0x5a4030, 0x7a5a3a]));
  }
  // the pier, on its piles, with a lamp at the head and another at the foot
  const PB = new Builder();
  for (let z = PIER.z0; z >= PIER.z1; z -= 1.3) PB.box(4, 0.2, 1.15, mix(0x6a4a34, 0x8a6a48, R()), PIER.x, PIER.y - 0.2, z);
  for (let z = PIER.z0 - 2; z >= PIER.z1; z -= 6) for (const sx of [-1, 1]) PB.cyl(0.16, 0.18, 5.4, 0x2a1c14, PIER.x + sx * 1.9, -2.8, z, 6);
  for (const sx of [-1, 1]) {
    for (let z = PIER.z0 - 1; z >= PIER.z1; z -= 2.6) PB.box(0.1, 1.0, 0.1, 0x3a2418, PIER.x + sx * 1.9, PIER.y, z);
    PB.box(0.07, 0.07, PIER.z0 - PIER.z1, 0x5a3320, PIER.x + sx * 1.9, PIER.y + 0.95, (PIER.z0 + PIER.z1) / 2);
    world.colliders.push({ x: PIER.x + sx * 2.0, z: (PIER.z0 + PIER.z1) / 2, hw: 0.15, hd: (PIER.z0 - PIER.z1) / 2, ry: 0, top: PIER.y + 1.1 });
  }
  (world.platforms ??= []).push({ minx: PIER.x - 2.2, maxx: PIER.x + 2.2, minz: PIER.z1 - 0.8, maxz: PIER.z0 + 1, y: PIER.y });
  // the lighthouse on the island
  {
    const y = H(-40, -190);
    PB.cyl(1.4, 2.2, 11, (x, yy) => new THREE.Color(Math.floor((yy + 5.5) / 2.75) % 2 ? 0xd9d0c0 : 0x9a3a2a), -40, y, -190, 10);
    PB.cyl(1.0, 1.0, 1.6, 0xffc060, -40, y + 11, -190, 8, { emissive: 1 });
    PB.cyl(0.1, 1.5, 1.4, 0x2a2a34, -40, y + 12.6, -190, 8);
    world.glows.push({ p: [-40, y + 11.8, -190], c: 0xffc060, size: 7 });
    world.colliders.push({ x: -40, z: -190, r: 2.3, top: y + 13 });
    maps.lamp(-40, -190, 22, 0xffc060, 0.7);
  }
  // a bench at the viewpoint on the road
  {
    const y = H(62, 34);
    PB.box(3, 0.16, 0.9, 0x5a3a26, 62, y + 0.5, 34, 0.4);
    PB.box(3, 0.9, 0.12, 0x5a3a26, 62.15, y + 0.5, 34.4, 0.4);
  }
  // ships riding at anchor off the town
  barque(PB, world, { x: -214, z: -168, ry: 0.3, s: 1 });
  barque(PB, world, { x: -112, z: -196, ry: -0.5, s: 0.9 });
  barque(PB, world, { x: -36, z: -132, ry: 0.15, s: 0.8 });
  S.add(PB.meshes(wavy({ stroke: strokes.oil, scale: 0.3, warp: 0.15, contrast: 0.45, hueVar: 0.4, emissive: 2.0, big: 0.5, wallStretch: 0.6 }), 160));

  // ---------------------------------------------------------------- lamps
  const lampAt = (x, z) => {
    const y = H(x, z);
    if (y < 1 || world.blocked(x, y + 1, z)) return;
    chunkOf(x, z).kit.place('lamp', xf(x, y, z), 0xffb860);
    world.glows.push({ p: [x, y + 3.55, z], c: 0xffa850, size: 2.6 });
    maps.lamp(x, z, 10, 0xffa850, 0.9);
    world.colliders.push({ x, z, r: 0.18, top: y + 4 });
  };
  streets.forEach((st, si) => {
    if (!st.main) return;
    let k = 0;
    for (let s = 6; s < traces[si].length_ - 3; s += 17, k++) {
      const p = along(traces[si], s),
        side = st.quay ? -1 : k % 2 ? 1 : -1,
        off = st.w / 2 - 0.8;
      lampAt(p.x - p.tz * side * off, p.z + p.tx * side * off);
    }
  });
  for (const [x, z] of [[SQUARE.x0 + 2, SQUARE.z0 + 2], [SQUARE.x1 - 2, SQUARE.z1 - 2], [SQUARE.x0 + 2, SQUARE.z1 - 2], [SQUARE.x1 - 2, SQUARE.z0 + 2], [PIER.x + 2.6, -113], [-150, -66], [-134, -62]]) lampAt(x, z);
  world.glows.push({ p: [PIER.x, PIER.y + 2.4, PIER.z1 + 1], c: 0xffa850, size: 2.4 });
  maps.lamp(PIER.x, PIER.z1 + 2, 9, 0xffa850, 0.8);

  // ---------------------------------------------------------------- the people
  const standing = kristianiaCrowd(world, traces, streets, (x, z) => chunkOf(x, z).kit.s('detail'), R, 46);
  const figures = ['man', 'woman', 'gentleman', 'woman', 'man', 'woman', 'child', 'man'].map((kind) => {
    const s = new Soup();
    kristianiaPerson(s, { x: 0, y: 0, z: 0, ry: 0, R, kind });
    return weld(s.geometry());
  });
  const folk = new Walkers(S, mats.detail, figures);
  // the evening walk: up and down Karl Johan, across the square, along the quay, out along the pier
  folk.add(way(world, [[-258, -80], [-220, -80], [SQUARE.x0, -80], [-172, -79], [SQUARE.x1, -80], [-130, -80]]), 30, R, { wide: 2.4, speed: [0.6, 1.1] });
  folk.add(way(world, streets[0].pts), 12, R, { wide: 1.8, speed: [0.6, 1.1] });
  folk.add(way(world, [[PIER.x, -106], [PIER.x, PIER.z1 + 2]]), 3, R, { wide: 0.6, speed: [0.5, 0.8] });
  folk.add(way(world, [[-170, -70], [-150, -65.5], [-138, -62], [-96, -44]]), 4, R, { wide: 1.2, speed: [0.7, 1.1] });
  folk.build();

  // ---------------------------------------------------------------- on the water, in the air
  const sj = sjekteGeo();
  const boats = [[-150, -180, 70, 22, 0.02, 0], [-250, -150, 34, 16, -0.026, 2], [-40, -230, 90, 30, 0.014, 4], [60, -150, 50, 24, -0.018, 1], [-190, -235, 60, 18, 0.016, 3]];
  const fleet = new THREE.InstancedMesh(weld(sj), wavy({ stroke: strokes.oil, scale: 0.4, warp: 0.1, contrast: 0.4 }), boats.length);
  fleet.frustumCulled = false;
  S.add(fleet);
  const birds = birdFlocks(S, R, [{ kind: 'gull', birds: [...wheel(R, 9, PIER.x, 14, -140, 24), ...wheel(R, 7, -230, 16, -128, 26), ...wheel(R, 6, -60, 18, -150, 34), ...wheel(R, 5, KIRKE.x, 30, KIRKE.z, 12)] }]);
  addSmoke(S, hearths, { color: 0x6a6480, wind: [1.3, 0, -0.4] });
  // birch leaves coming down, over the land
  addPetals(S, { count: 500, colors: [0xff9a3a, 0xffc85a], wind: [1.8, 0, -0.6], landZ: [-112, -100] });

  const list = [];
  for (const c of chunks.values()) {
    const b = c.kit.build();
    S.add(b.base, b.detail);
    list.push({ detail: b.detail, x: c.sx / c.n, z: c.sz / c.n });
  }
  const lb = lk.build();
  S.add(lb.base, lb.detail);
  console.log('scream: kristiania', lots.length, 'houses,', standing, 'standing,', folk.all.length, 'walking');
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    p = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1);
  return {
    lots,
    tick(dt, time, cam) {
      for (const c of list) c.detail.visible = Math.hypot(cam.x - c.x, cam.z - c.z) < 150;
      folk.tick(dt, time, cam);
      birds.tick(dt, time);
      boats.forEach(([cx, cz, rx, rz, w, ph], i) => {
        const th = time * w + ph;
        e.set(Math.sin(time * 0.8 + ph) * 0.05, Math.atan2(-rz * Math.cos(th) * w, -rx * Math.sin(th) * w), 0.12 * Math.sign(w), 'YXZ');
        fleet.setMatrixAt(i, m4.compose(p.set(cx + rx * Math.cos(th), Math.sin(time * 0.9 + ph) * 0.12, cz + rz * Math.sin(th)), q.setFromEuler(e), one));
      });
      fleet.instanceMatrix.needsUpdate = true;
    },
  };
}
