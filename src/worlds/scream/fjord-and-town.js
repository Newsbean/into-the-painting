import * as THREE from 'three';
import { waterMaterial } from '../../engine/paint.js';
import { house, lampPost, mix, jitter, xf } from '../../engine/build.js';
import { rng } from '../../engine/gl.js';
import { kristianiaPerson } from './kristiania/people.js';

// The fjord, and the two friends on the road. (addTown is the town as it used to be: a
// ring of boxes. Nothing of it is drawn any more; index.js still runs it for its dice.)

// ---------------- fjord: dark water carrying the sky in orange ribbons
export function addFjord(world, kit) {
  const { strokes, S } = kit;
  const wg = new THREE.PlaneGeometry(2400, 2400, 120, 120);
  wg.rotateX(-Math.PI / 2);
  const fjord = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.wavy, deep: 0x121c44, shallow: 0x3a5a94, reflect: 0xd9b46a, glint: 0xffb050, scale: 0.035, glintAmt: 1.8, flow: 0.012, swell: 0.25 }));
  fjord.frustumCulled = false;
  S.add(fjord);
}

// ---------------- Kristiania by the water
// Everything here goes into kit.B, after the railing (index.js bakes it).
export function addTown(world, kit) {
  const { R, H, maps, B, TX, TZ } = kit;
  const proxy = { heightAt: H, colliders: world.colliders, maps, glows: world.glows };
  const NORDIC = [0x8a2f2a, 0xc9a24a, 0xdcd4c0, 0x6a3a2a, 0x9a4a34, 0x4a6a7a, 0xb86a3a];
  const placed = [];
  for (let i = 0; i < 34; i++) {
    const a = R() * 6.283,
      d = 16 + R() * 44;
    const x = TX + Math.cos(a) * d,
      z = TZ + Math.sin(a) * d * 0.8;
    if (H(x, z) < 1.6 || placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < 10) || Math.abs(z - world._roadZ(x)) < 6) continue;
    placed.push([x, z]);
    house(B, proxy, { R, x, z, ry: R() * 6.283, w: 6 + R() * 4, d: 5.5 + R() * 2.5, h: 4 + (R() < 0.4 ? 3 : 0) + R(), wall: jitter(NORDIC[(R() * NORDIC.length) | 0], R, 0.08), roof: [0x2a2a34, 0x3a2a2a, 0x4a3a34][(R() * 3) | 0], trim: 0xe8e0d0, lit: 0.8, roofH: 3.2 });
  }
  // the church whose tower shows in the painting
  {
    const cx = TX + 8,
      cz = TZ + 6,
      y = H(cx, cz);
    house(B, proxy, { R, x: cx, z: cz, y, w: 9, d: 20, h: 8, roofH: 6, wall: 0xcfc6b4, roof: 0x2a2a34, lit: 1, winH: 2.6, chimney: false, ridgeAlongX: false, trim: 0x3a3440 });
    B.box(5, 17, 5, 0xc9c0ae, cx, y, cz - 12);
    B.hip(6, 6, 15, 0x23232c, cx, y + 17, cz - 12, 0, undefined, undefined, 0);
    world.colliders.push({ x: cx, z: cz - 12, hw: 2.8, hd: 2.8, ry: 0, top: y + 32 });
    world.glows.push({ p: [cx, y + 12, cz - 14.6], c: 0xffc070, size: 3 });
  }
  // harbour: a pier, lamps, two boats out on the water as in the picture
  for (let z = -112; z >= -150; z -= 1.3) B.box(4, 0.2, 1.15, mix(0x6a4a34, 0x8a6a48, R()), TX + 14, 1.0, z);
  for (let z = -114; z >= -150; z -= 6) for (const sx of [-1, 1]) B.cyl(0.16, 0.18, 4, 0x2a1c14, TX + 14 + sx * 1.9, -2.6, z, 6);
  world.platforms = [{ minx: TX + 11.8, maxx: TX + 16.2, minz: -150.8, maxz: -111, y: 1.2 }];
  for (const [x, z, s, ry] of [[-74, -150, 1, 0.4], [-34, -128, 0.8, -0.3], [-120, -176, 1.1, 1.2], [20, -170, 0.9, 0.2], [-150, -210, 1.2, -0.8]]) {
    const M = xf(x, 0, z, ry, s, s, s);
    B.box(9, 1.3, 2.6, 0x3a2a22, 0, -0.3, 0, 0, undefined, M);
    B.cyl(0.1, 0.14, 9.5, 0x2a1c14, 0.4, 0.8, 0, 5, undefined, M);
    B.box(0.08, 6.6, 4.4, 0xd9c8a8, 0.2, 2.4, 0, 0, { sway: 0.06 }, M);
    world.colliders.push({ x, z, hw: 4.6 * s, hd: 1.4 * s, ry, top: 1.2 });
  }
  // lighthouse on the island
  {
    const y = H(-40, -190);
    B.cyl(1.4, 2.2, 11, (x, yy) => (Math.floor((yy + 5.5) / 2.75) % 2 ? new THREE.Color(0xd9d0c0) : new THREE.Color(0x9a3a2a)), -40, y, -190, 10);
    B.cyl(1.0, 1.0, 1.6, 0xffc060, -40, y + 11, -190, 8, { emissive: 1 });
    B.cyl(0.1, 1.5, 1.4, 0x2a2a34, -40, y + 12.6, -190, 8);
    world.glows.push({ p: [-40, y + 11.8, -190], c: 0xffc060, size: 7 });
    world.colliders.push({ x: -40, z: -190, r: 2.3, top: y + 13 });
    maps.lamp(-40, -190, 22, 0xffc060, 0.7);
  }
  // gas lamps down the road, a bench at the viewpoint, a cart
  for (const [x, z] of [[-150, -66], [-180, -84], [-160, -90], [-190, -62], [TX + 14, -116], [TX + 14, -148]]) lampPost(B, world, x, z, { col: 0xffa850, glow: 2.4, radius: 9 });
  {
    const x = 62,
      z = 34,
      y = H(x, z);
    B.box(3, 0.16, 0.9, 0x5a3a26, x, y + 0.5, z, 0.4);
    B.box(3, 0.9, 0.12, 0x5a3a26, x + 0.15, y + 0.5, z + 0.4, 0.4);
  }
}

// ---------------- people: the two friends who walked on, townsfolk
export function addPeople(world, kit) {
  const { R, H, cs, ck } = kit;
  const a = cs[78],
    b = cs[79],
    L = Math.hypot(b.x - a.x, b.z - a.z),
    R2 = rng(78);
  // the two friends who walked on: far down the road by now, beside the railing
  const fr = { x: a.x - ((b.z - a.z) / L) * 1.9, z: a.z + ((b.x - a.x) / L) * 1.9 };
  for (const [ox, oz] of [[-0.6, 0.3], [0.5, -0.3]]) kristianiaPerson(ck.s('detail'), { x: fr.x + ox, y: H(fr.x + ox, fr.z + oz), z: fr.z + oz, ry: -1.95 + ox * 0.2, R: R2, kind: 'gentleman', col: 0x17171f, scale: 1.04 });
  // five townsfolk stood about the old town: Kristiania has its own people now, but the
  // dice are thrown for them as before
  for (let i = 0; i < 15; i++) R();
}
