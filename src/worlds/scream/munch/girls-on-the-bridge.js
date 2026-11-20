import { figure, blobTree, house } from '../../../engine/build.js';

// --- The Girls on the Bridge: three dresses at the railing, the great round tree, the white house
export function addGirlsOnTheBridge(world, kit) {
  const { R, H, MB, MT, proxyM, TX } = kit;
  const px = TX + 14;
  for (let z = -112; z >= -150; z -= 2.4) MB.box(0.14, 1.1, 0.14, 0xe8e2d4, px - 2, 1.2, z);
  for (const hh of [0.55, 1.05]) MB.box(0.1, 0.08, 38, 0xe8e2d4, px - 2, 1.2 + hh, -131);
  world.colliders.push({ x: px - 2.1, z: -131, hw: 0.15, hd: 19, ry: 0, top: 2.4 });
  const girls = [[0xf4f0e6, 0xf4f0e6], [0xc8382c, 0xe9c96a], [0x3f7a4a, 0xf4f0e6]];
  girls.forEach(([dress, hat], i) => figure(MB, px - 1.5, 1.4, -124 - i * 1.15, -Math.PI / 2 + (i - 1) * 0.15, { coat: dress, dress: true, hat: 'straw', hatCol: hat, hair: 0xb8863a, scale: 0.92, lean: 0.18, arms: 0.5 }));
  blobTree(MT, -146, H(-146, -104), -104, 12, 7.5, R, { lo: 0x12301f, hi: 0x2f6a44, trunk: 0x2a1c18, blobs: 6, trunkH: 0.35 });
  world.colliders.push({ x: -146, z: -104, r: 1.2, top: H(-146, -104) + 6 });
  house(MB, proxyM, { R, x: -134, z: -98, ry: Math.PI + 0.3, w: 12, d: 8, h: 6.6, wall: 0xf2efe6, roof: 0x7a2f2a, trim: 0x6f7a8a, lit: 0.9, roofH: 4.2 });
  for (let i = 0; i < 16; i++) MB.box(0.12, 1.1, 0.12, 0xf2efe6, -143 + i * 1.2, H(-143 + i * 1.2, -108), -108);
  MB.box(18.4, 0.1, 0.1, 0xf2efe6, -134, H(-134, -108) + 0.8, -108);
}
