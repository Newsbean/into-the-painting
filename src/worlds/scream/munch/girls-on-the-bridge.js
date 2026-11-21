import { blobTree, house } from '../../../engine/build.js';
import { townHouse } from '../../../engine/townhouse.js';
import { PIER } from '../kristiania/town.js';
import { YARDS, local } from '../country/plan.js';

// --- The Girls on the Bridge: three dresses at the railing of the pier, and across the
// water from them the big white house under its great round lime
export function addGirlsOnTheBridge(world, kit) {
  const { R, R2, H, maps, ck, person, burn } = kit;
  const girls = [[0xf4f0e6, 0xf4f0e6], [0xc8382c, 0xe9c96a], [0x3f7a4a, 0xf4f0e6]];
  girls.forEach(([dress, hat], i) => {
    const x = PIER.x - 1.42,
      z = -124 - i * 1.1;
    person(x, z, -Math.PI / 2 + (i - 1) * 0.18, { y: PIER.y, kind: 'woman', col: dress, hat: 'straw', hatCol: hat, hair: 0xb8863a, scale: 0.9, lean: 0.14, arms: 0.75 });
  });
  // (the blob of a tree and the box of a house that stood here once: their dice)
  blobTree(burn.B, -146, 0, -104, 12, 7.5, R, { blobs: 6, trunkH: 0.35 });
  house(burn.B, burn.W, { R, x: -134, z: -98, y: 0, ry: Math.PI + 0.3, w: 12, d: 8, h: 6.6, wall: 0xf2efe6, roof: 0x7a2f2a, trim: 0x6f7a8a, lit: 0.9, roofH: 4.2 });
  // the white house on the green by the water (the lime beside it is grown in country/)
  const y = YARDS.find((q) => q.name === 'shore green'),
    [x, z] = local(y, 17, -1.5);
  const res = townHouse(ck, world, { x, z, ry: y.ry, y: y.y, w: 13, d: 8.5, R: R2, floors: 2, clad: 'boards', wall: 0xf2efe6, roof: 0x7a2f2a, lit: 0.9 });
  world.colliders.push({ x, z, hw: 6.7, hd: 4.45, ry: y.ry, top: y.y + res.top });
  maps.blob(x, z, 12, 0.4);
  kit.hearths.push([x, y.y + res.ridge + 1.3, z]);
  // a white paling along the water's side of its garden
  const S = ck.s('detail');
  for (let u = 8; u <= 26; u += 0.42) {
    const [px, pz] = local(y, u, y.dep - 0.4),
      py = H(px, pz);
    S.box(0.09, 1.0, 0.04, 0xf2efe6, px, py, pz, y.ry, undefined, 'b');
  }
  for (const hh of [0.3, 0.78]) {
    const [ax, az] = local(y, 17, y.dep - 0.44);
    S.box(18.4, 0.07, 0.04, 0xe8e2d4, ax, H(ax, az) + hh, az, y.ry, undefined, '');
  }
}
