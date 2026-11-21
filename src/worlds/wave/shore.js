import * as THREE from 'three';
import { Builder, terrain, house, pine, mix } from '../../engine/build.js';
import { vnoise, fbm, smooth, lerp } from '../../engine/gl.js';
import { keptClear } from './ground-plan.js';
import { machiya, rngAt } from './edo/house.js';
import { matsu, sugi } from './plants.js';

// The land you arrive on: the ground itself, Hokusai's workshop and its
// neighbours, the pier, and the pines along the shore.

const MEADOW = new THREE.Color(0x9fae66),
  SHADE = new THREE.Color(0x3f6a55),
  DAMP = new THREE.Color(0xb9a67c);

// ---------------- shore
export function addShore(world, { R, S, H, maps, flat, proxy }) {
  const sand = 0xe2d2a4,
    grass = 0x7f9a6a,
    hill = 0x4f7a6a;
  const land = terrain(
    H,
    470,
    250,
    (x, z, y) => {
      const c = mix(sand, grass, smooth(1.6, 4.5, y + vnoise(x * 0.1, z * 0.1) * 1.5));
      c.lerp(new THREE.Color(hill), smooth(7, 22, y));
      // the green is not one green: sunlit meadow here, deeper shade there, in broad patches
      c.lerp(MEADOW, smooth(0.5, 0.68, fbm(x * 0.021 + 11, z * 0.021, 3)) * smooth(2.5, 5, y) * (1 - smooth(18, 32, y)) * 0.65);
      c.lerp(SHADE, smooth(0.52, 0.7, fbm(x * 0.017 + 40, z * 0.019 + 7, 3)) * smooth(3, 6, y) * 0.5);
      // and the sand is damp and darker where the sea has just been
      return c.lerp(DAMP, (1 - smooth(0.15, 1.0, y)) * 0.55);
    },
    0.6,
    2,
    -60,
    300
  );
  S.add(new THREE.Mesh(land, flat({ scale: 0.03 })));

  const B = new Builder();
  // Hokusai's workshop and a few neighbours
  const edo = (x, z, ry, w, d, h, o = {}) => {
    // the box house these used to be still throws its dice (into a builder that is thrown away),
    // so that everything random built after it stays exactly where it was
    house(new Builder(), { heightAt: H }, { R, x, z, ry, w, d, h, roofType: 'hip', roofH: 2.6, over: 1.1, ridge: 0.5, wall: 0xe9dfc6, roof: 0x3d4c5c, trim: 0x3a2a1e, doorCol: 0x243a6a, lit: 0.9, winW: 1.3, winH: 1.5, chimney: false, mullion: true, ...o });
    const res = machiya(world.edoKit, world, { x, z, ry, w, d, R: rngAt(x, z), shop: true, floors: 2, ...(o.edo ?? {}) });
    world.colliders.push({ x, z, hw: w / 2 + 0.3, hd: d / 2 + 0.3, ry, top: H(x, z) + res.top });
    maps.blob(x, z, Math.max(w, d) * 0.95, 0.4);
  };
  edo(-6, 222, Math.PI, 15, 8.5, 4.2, { edo: { cloth: 0x1f3f7a } });
  edo(24, 232, Math.PI + 0.3, 8, 6.5, 3.8, { roof: 0x4a5560 });
  edo(-38, 236, Math.PI - 0.25, 9, 6.5, 3.8, { roof: 0x35455a });
  edo(50, 246, Math.PI + 0.5, 7, 6, 3.6, { roof: 0x4a4a55, lit: 0.6 });
  // timber frame and porch on the workshop
  {
    const y = H(-6, 222);
    // the boarded forecourt in front of the shop (the house brings its own posts, pent roof and curtain)
    B.box(16, 0.3, 2.6, 0x8a6a48, -6, y + 0.2, 216.4);
    world.platforms.push({ minx: -14, maxx: 2, minz: 215.1, maxz: 217.7, y: y + 0.5 });
  }
  // the day's prints hung out to dry
  const PRINTS = [0x2f5f9a, 0xe9dfc6, 0xd9644a, 0x7fa0a8, 0xe8c66a, 0x2f5f9a, 0xf3ecd8, 0x9ab08a];
  for (const [x0, z0, x1, z1] of [[6, 214, 20, 210], [-22, 212, -32, 206]]) {
    const y = Math.max(H(x0, z0), H(x1, z1)) + 2.6;
    B.cyl(0.07, 0.09, 3, 0x3a2a1e, x0, H(x0, z0), z0, 5);
    B.cyl(0.07, 0.09, 3, 0x3a2a1e, x1, H(x1, z1), z1, 5);
    const ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      B.box(1.1, 1.5, 0.04, PRINTS[(i + (x0 > 0 ? 0 : 3)) % PRINTS.length], lerp(x0, x1, t), y - 1.6 - Math.sin(t * Math.PI) * 0.25, lerp(z0, z1, t), ry, { sway: 0.1 });
    }
  }
  // pier
  for (let z = 168; z <= 204; z += 1.2) B.box(4.4, 0.18, 1.05, mix(0x9a7a52, 0xb89668, R()), 10, 1.25, z);
  for (let z = 169; z <= 204; z += 5) for (const sx of [-1, 1]) B.cyl(0.16, 0.18, 4.6, 0x4a3626, 10 + sx * 2.1, -2.6, z, 6);
  world.platforms.push({ minx: 7.7, maxx: 12.3, minz: 167.4, maxz: 204.6, y: 1.43 });
  // stone lanterns
  for (const [x, z] of [[4, 206], [16, 206], [-14, 214], [30, 224]]) {
    const y = H(x, z);
    B.cyl(0.22, 0.3, 1.5, 0x9a9a92, x, y, z, 6);
    B.box(0.75, 0.12, 0.75, 0x8a8a84, x, y + 1.5, z);
    B.box(0.5, 0.5, 0.5, 0xffc878, x, y + 1.62, z, 0, { emissive: 1 });
    B.hip(1.0, 1.0, 0.45, 0x7a7a76, x, y + 2.12, z, 0, undefined, undefined, 0);
    world.glows.push({ p: [x, y + 1.9, z], c: 0xffc878, size: 2 });
    maps.lamp(x, z, 7, 0xffc878, 0.8);
  }
  // beached boats
  for (const [x, z, ry] of [[34, 200, 0.5], [-26, 198, -0.4], [58, 208, 1.2]]) {
    const y = H(x, z);
    B.box(6.5, 0.8, 1.7, 0xd9c690, x, y + 0.1, z, ry);
    B.box(6.9, 0.14, 1.9, 0x8a6a48, x, y + 0.9, z, ry);
  }
  S.add(B.meshes(flat({ scale: 0.25, emissive: 1.5 })));
}

// pines along the shore and on the hills
export function addShorePines(world, { R, S, H, maps, flat, SPARE }) {
  const T = new Builder();
  // (SPARE is the throw-away builder made in index.js: a tree on kept ground is drawn there and never shown)
  let n = 0;
  while (n < 70) {
    const x = (R() - 0.5) * 420,
      z = 205 + R() * 110;
    const y = H(x, z);
    if (y < 2.2 || (Math.abs(x + 6) < 26 && z < 238) || (Math.abs(x - 10) < 6 && z < 212)) continue;
    const h = 7 + R() * 8;
    const open = !keptClear(x, z, 1.5);
    // the cone tree this used to be still throws its dice, into the builder that is thrown away;
    // what stands here now is a pine as the prints draw one (a cryptomeria, up on the hills)
    pine(SPARE, x, y, z, h, 3 + R() * 2, R, { lo: 0x25463a, hi: 0x3f7a5a, trunk: 0x5a3a2a, tiers: 3 + ((R() * 3) | 0) });
    if (open) (y > 13 ? sugi : matsu)(T, x, y, z, h * 1.1, rngAt(x, z), { pads: 5 });
    world.colliders.push({ x, z, r: 0.5, top: y + h * 0.5, spare: !open });
    if (open) maps.blob(x, z, 4, 0.3);
    n++;
  }
  S.add(T.meshes(flat({ scale: 0.2 })));
}
