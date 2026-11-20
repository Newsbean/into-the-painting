import { house } from '../../../engine/build.js';

// --- his own little house, ochre with white trim, an easel in the garden, four girls by the wall
export function addHisHouse(world, kit) {
  const { R, H, MB, proxyM, person } = kit;
  const hx = 106,
    hz = 48;
  house(MB, proxyM, { R, x: hx, z: hz, ry: Math.PI, w: 8.5, d: 6.5, h: 4.2, wall: 0xd9a83a, roof: 0x8a3a2a, trim: 0xf2efe6, lit: 1, roofH: 3.2 });
  for (let i = 0; i < 14; i++) MB.box(0.1, 1.0, 0.1, 0xf2efe6, hx - 7.8 + i * 1.2, H(hx - 7.8 + i * 1.2, hz - 7.5), hz - 7.5);
  MB.box(16, 0.09, 0.09, 0xf2efe6, hx, H(hx, hz - 7.5) + 0.75, hz - 7.5);
  const ey = H(hx - 5, hz - 5);
  for (const [ox, rz] of [[-0.4, 0.13], [0.4, -0.13]]) MB.cyl(0.035, 0.035, 2.0, 0x5a3a22, hx - 5 + ox, ey, hz - 5, 5, undefined, undefined, 0, rz);
  MB.box(1.1, 0.9, 0.05, 0xc8382c, hx - 5, ey + 1.0, hz - 5.02, 0, { emissive: 0.2 });
  [0xf4f0e6, 0x8a5a3a, 0xc8382c, 0x3a4a6a].forEach((c, i) => person(hx + 1 + i * 0.8, hz - 4.2, Math.PI, { coat: c, dress: true, hair: 0xb8863a, hat: i % 2 ? 'straw' : undefined, scale: 0.62 + i * 0.07 }));
}
