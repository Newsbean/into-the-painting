import { HAIR, SKIN, STONE, THATCH_D, TIMBER, WOOD_D, WOOD_L } from '../palette.js';
import { rod } from '../helpers.js';
import { person, horse } from '../figures.js';
import { matsu } from '../plants.js';

// ---------------- Hodogaya on the Tokaido: the mountain seen between roadside pines, and who passes under them
export function hodogaya(world, { H, Q, X, P, maps, solid, jizo }) {
  for (let k = 0; k < 9; k++) {
    const x = 103 + k * 5.6 + (Q() - 0.5) * 1.2,
      z = 216.7 + (Q() - 0.5) * 0.7;
    matsu(P, x, H(x, z), z, 9.5 + Q() * 3, Q, { pads: 3 });
    solid(x, z, 0.45, H(x, z) + 5);
    maps.blob(x, z, 3.2, 0.3);
  }
  // a palanquin and its two bearers
  const kx = 116,
    kz = 219.7,
    ky = H(kx, kz);
  rod(X, [kx - 2.1, ky + 1.36, kz], [kx + 2.1, ky + 1.36, kz], 0.05, 0.05, WOOD_D, 4);
  X.box(1.25, 0.85, 0.85, 0xcdb880, kx, ky + 0.36, kz);
  X.box(1.5, 0.07, 1.05, THATCH_D, kx, ky + 1.44, kz);
  for (const ox of [-0.58, 0.58]) for (const oz of [-0.38, 0.38]) rod(X, [kx + ox, ky + 1.2, kz + oz], [kx + ox, ky + 1.44, kz + oz], 0.02, 0.02, TIMBER, 3);
  X.ball(0.17, SKIN, kx + 0.05, ky + 1.02, kz, 1, 1.05, 1, 1);
  X.ball(0.175, HAIR, kx + 0.02, ky + 1.07, kz, 1.03, 0.85, 1.03, 0);
  for (const ox of [-1.8, 1.8]) person(X, kx + ox, ky, kz + 0.23, Math.PI / 2, { coat: ox < 0 ? 0x3a628f : 0x5a6a4a, legs: SKIN, hat: 'cloth', lean: 0.12, stride: ox < 0 ? 0.2 : -0.2, armR: [2.4, 0.1, 1.0] });
  // a loaded horse, its rider and the groom who leads it
  const hx = 128,
    hz = 219.7,
    hy = H(hx, hz);
  horse(X, hx, hy, hz, Math.PI / 2, { load: 0xcdbb98 });
  person(X, hx - 0.05, hy + 1.98, hz, Math.PI / 2, { pose: 'kneel', coat: 0x4a5560, hat: 'cone', armL: [0.7, 0.1], armR: [0.7, 0.1] });
  const gr = person(X, hx + 2.4, H(hx + 2.4, hz + 0.5), hz + 0.5, Math.PI / 2, { coat: 0x8a6a48, legs: SKIN, hat: 'cone', stride: 0.2, lean: 0.1, armL: [-0.5, 0.2] });
  rod(X, [gr.handL.x, gr.handL.y, gr.handL.z], [hx + 1.44, hy + 1.56, hz], 0.012, 0.012, TIMBER, 3);
  // a flute-monk under his reed hood, and two travellers going the other way
  const km = person(X, 140, H(140, 220.4), 220.4, -Math.PI / 2, { robe: true, coat: 0x4a5560, sash: 0xe9dfc6, hat: 'basket', armL: [1.0, -0.2, 1.3], armR: [1.0, -0.2, 1.3] });
  rod(X, [km.handR.x, km.handR.y - 0.3, km.handR.z + 0.1], [km.handR.x + 0.1, km.handR.y + 0.25, km.handR.z + 0.1], 0.025, 0.02, WOOD_L, 4);
  person(X, 107.4, H(107.4, 220.3), 220.3, -Math.PI / 2, { coat: 0x2f548a, legs: 0xe2d6b4, hat: 'cone', carry: 'pack', stride: 0.2, lean: 0.1, staff: true });
  person(X, 105.8, H(105.8, 219.3), 219.3, -Math.PI / 2, { robe: true, coat: 0x7f9aa8, sash: 0x9a4a3a, hat: 'flat', carry: 'bundle', lean: 0.06 });
  X.box(0.42, 1.2, 0.32, STONE, 100.6, H(100.6, 217.2) - 0.1, 217.2, 0.2);
  for (let k = 0; k < 3; k++) jizo(153.4 + k * 0.75, 217.4, Math.PI);
}
