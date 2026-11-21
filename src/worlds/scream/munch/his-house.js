import { house } from '../../../engine/build.js';
import { townHouse } from '../kristiania/house.js';

// --- his own little house, ochre with white trim under red tiles, an easel in the garden,
// four girls by the wall
export function addHisHouse(world, kit) {
  const { R, R2, H, maps, MB, ck, person, burn } = kit;
  const hx = 106,
    hz = 48;
  // (the box this house used to be: its dice)
  house(burn.B, burn.W, { R, x: hx, z: hz, y: 0, ry: Math.PI, w: 8.5, d: 6.5, h: 4.2, wall: 0xd9a83a, roof: 0x8a3a2a, trim: 0xf2efe6, lit: 1, roofH: 3.2 });
  const res = townHouse(ck, world, { x: hx, z: hz, ry: Math.PI, w: 8.5, d: 6.5, R: R2, floors: 1, clad: 'boards', wall: 0xd9a83a, roof: 0x8a3a2a, lit: 1 });
  world.colliders.push({ x: hx, z: hz, hw: 4.45, hd: 3.45, ry: Math.PI, top: H(hx, hz) + res.top });
  maps.blob(hx, hz, 8, 0.4);
  kit.hearths.push([hx, H(hx, hz) + res.ridge + 1.3, hz]);
  // the garden paling, with a gate left open in the middle
  const S = ck.s('detail');
  for (let x = hx - 8; x <= hx + 8; x += 0.4) {
    if (Math.abs(x - hx) < 0.9) continue;
    S.box(0.09, 0.95, 0.04, 0xf2efe6, x, H(x, hz - 7.5), hz - 7.5, 0, undefined, 'b');
  }
  for (const sx of [-1, 1]) for (const hh of [0.28, 0.72]) S.box(7.1, 0.07, 0.04, 0xe8e2d4, hx + sx * 4.45, H(hx + sx * 4.45, hz - 7.5) + hh, hz - 7.46, 0, undefined, '');
  // the easel, a picture begun on it
  const ey = H(hx - 5, hz - 5);
  for (const [ox, rz] of [[-0.4, 0.13], [0.4, -0.13]]) MB.cyl(0.035, 0.035, 2.0, 0x5a3a22, hx - 5 + ox, ey, hz - 5, 5, undefined, undefined, 0, rz);
  MB.cyl(0.03, 0.03, 1.9, 0x5a3a22, hx - 5, ey, hz - 4.4, 5, undefined, undefined, -0.32, 0);
  MB.box(1.1, 0.9, 0.05, 0xc8382c, hx - 5, ey + 1.0, hz - 5.02, 0, { emissive: 0.2 });
  // four girls in a row against the wall, the smallest first
  [0xf4f0e6, 0x8a5a3a, 0xc8382c, 0x3a4a6a].forEach((c, i) => person(hx + 1 + i * 0.8, hz - 4.2, Math.PI + (i - 1.5) * 0.12, { kind: 'woman', col: c, hair: 0xb8863a, hat: i % 2 ? 'straw' : 'none', scale: 0.6 + i * 0.07 }));
}
