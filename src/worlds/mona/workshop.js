import { mix } from '../../engine/build.js';
import { clamp } from '../../engine/gl.js';
import { STONE, stoneC } from './palette.js';

// ---------------- the loggia where she sits
export function buildWorkshop(world, kit) {
  const { B, R, maps, LY } = kit;
  for (let i = -5; i <= 5; i++) for (let j = -4; j <= 5; j++) B.box(1.5, 0.3, 1.5, (i + j) & 1 ? 0x9a8a68 : 0xc6b892, i * 1.5, LY - 0.26, j * 1.5 - 0.6);
  // parapet behind her, with the two column bases the portrait just shows
  B.box(16.5, 0.95, 0.5, stoneC, 0, LY, -7.6);
  B.box(17, 0.16, 0.8, STONE, 0, LY + 0.95, -7.6);
  world.colliders.push({ x: 0, z: -7.6, hw: 8.3, hd: 0.4, ry: 0, top: LY + 1.2 });
  for (const sx of [-1, 1]) {
    B.cyl(0.36, 0.42, 4.6, stoneC, sx * 2.25, LY + 1.1, -7.6, 14);
    B.cyl(0.52, 0.56, 0.3, STONE, sx * 2.25, LY + 1.1, -7.6, 14);
    B.box(1.1, 0.3, 1.1, STONE, sx * 2.25, LY + 5.7, -7.6);
    for (const ox of [5.2, 8.1]) B.cyl(0.3, 0.36, 4.6, stoneC, sx * ox, LY + 1.1, -7.6, 12);
    world.colliders.push({ x: sx * 2.25, z: -7.6, r: 0.5, top: LY + 6 });
  }
  B.box(17.4, 0.7, 1.2, stoneC, 0, LY + 6.0, -7.6);
  // pergola over the working end
  for (const [px, pz] of [[-7.6, 6.6], [7.6, 6.6], [-7.6, -0.5], [7.6, -0.5]]) B.cyl(0.24, 0.28, 5.9, stoneC, px, LY, pz, 10);
  for (let x = -8; x <= 8; x += 1.6) B.box(0.22, 0.26, 15.2, 0x5a4026, x, LY + 6.4, -0.5);
  // the bottega: a long stone room that opens onto the loggia
  const WZ0 = -0.6,
    WZ1 = 22,
    WH = 6.6;
  for (let i = -5; i <= 5; i++) for (let j = 6; j <= 15; j++) B.box(1.5, 0.3, 1.5, (i + j) & 1 ? 0x8a7a5a : 0xb8a880, i * 1.5, LY - 0.26, j * 1.5 - 0.6);
  const plaster = (x, y) => mix(0xcdbf9c, 0xa8966e, clamp(0.45 - y * 0.08));
  for (const sx of [-1, 1]) {
    B.box(0.6, WH, WZ1 - WZ0, plaster, sx * 8.6, LY, (WZ0 + WZ1) / 2);
    world.colliders.push({ x: sx * 8.6, z: (WZ0 + WZ1) / 2, hw: 0.4, hd: (WZ1 - WZ0) / 2, ry: 0, top: LY + WH + 4 });
    // tall windows down each side
    for (const wz of [4, 10, 16]) {
      B.box(0.1, 3.0, 1.6, 0xffe6a8, sx * 8.26, LY + 1.6, wz, 0, { emissive: 0.8 });
      B.box(0.14, 3.0, 0.08, 0x5a4026, sx * 8.2, LY + 1.6, wz);
      B.box(0.14, 0.08, 1.6, 0x5a4026, sx * 8.2, LY + 3.1, wz);
      maps.lamp(sx * 5.6, wz, 4.5, 0xffe0a0, 0.6);
    }
    // the doorway at the south end
    B.box(6.6, WH, 0.6, plaster, sx * 5.5, LY, WZ1);
    world.colliders.push({ x: sx * 5.5, z: WZ1, hw: 3.3, hd: 0.4, ry: 0, top: LY + WH + 4 });
  }
  B.box(4.6, WH - 4.2, 0.6, plaster, 0, LY + 4.2, WZ1);
  B.box(5.0, 0.4, 0.9, 0x5a4026, 0, LY + 4.0, WZ1);
  // roof: beams you see from inside, tiles from outside
  for (let z = WZ0 + 1; z < WZ1; z += 2.4) B.box(17.4, 0.4, 0.34, 0x4a3420, 0, LY + WH - 0.4, z);
  B.box(17.6, 0.25, WZ1 - WZ0 + 0.6, 0x3a2a1c, 0, LY + WH, (WZ0 + WZ1) / 2);
  B.gable(19.4, WZ1 - WZ0 + 1.6, 3.6, 0xa8582e, 0, LY + WH + 0.25, (WZ0 + WZ1) / 2, 0);
  world.rooms.push({ minx: -8.1, maxx: 8.1, minz: WZ0 + 0.2, maxz: WZ1 - 0.5, ceil: LY + WH - 0.7 });
  world.colliders.push({ x: 0, z: (WZ0 + WZ1) / 2, hw: 9.2, hd: (WZ1 - WZ0) / 2 + 0.6, ry: 0, top: LY + WH + 4.5, bottom: LY + WH + 0.3 });
  // more of his distractions: shelves, a great wing hung from the beams, the aerial screw
  for (const [tx, tz] of [[-6.2, 11], [6.2, 12], [-6.2, 17.5], [6.2, 18]]) {
    B.box(2.6, 0.12, 1.2, 0x7a5a36, tx, LY + 0.85, tz);
    for (const [ox, oz] of [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]]) B.box(0.12, 0.85, 0.12, 0x5a4026, tx + ox, LY, tz + oz);
    world.colliders.push({ x: tx, z: tz, hw: 1.35, hd: 0.65, ry: 0, top: LY + 1.1 });
    for (let k = 0; k < 3; k++) B.box(0.5, 0.02, 0.36, 0xe8dcc0, tx - 0.8 + k * 0.7, LY + 0.97, tz + (R() - 0.5) * 0.4, R());
    B.ball(0.16, [0x2f5fd0, 0xb0362e, 0xd9a83a, 0x3a8a5a][(R() * 4) | 0], tx + 0.9, LY + 1.1, tz, 1, 1, 1, 1);
  }
  for (const sx of [-1, 1]) for (const sy of [1.6, 2.5, 3.4]) {
    B.box(0.4, 0.06, 3.2, 0x5a4026, sx * 8.05, LY + sy, 7);
    for (let k = 0; k < 5; k++) B.box(0.26, 0.34 + R() * 0.2, 0.2, [0x7a2f2a, 0x2f4a6a, 0x5a5a2a, 0x8a6a3a][(R() * 4) | 0], sx * 8.0, LY + sy + 0.06, 5.8 + k * 0.6);
  }
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 6; k++) B.box(4.2 - k * 0.3, 0.05, 0.06, 0x5a4026, sx * (2.3 - k * 0.1), LY + 5.0, 12.4 + k * 0.5, sx * 0.12);
    B.box(4.0, 0.02, 3.0, 0xe6dcc0, sx * 2.2, LY + 4.97, 13.6, sx * 0.12);
  }
  B.box(0.4, 0.3, 3.4, 0x7a5a36, 0, LY + 4.9, 13.6);
  for (const cx of [-1.4, 1.4]) B.cyl(0.015, 0.015, 1.3, 0x3a2a1c, cx, LY + 5.0, 13.6, 3);
  B.cyl(0.06, 0.06, 2.4, 0x5a4026, -6.6, LY, 3.2, 6);
  for (let k = 0; k < 14; k++) B.box(1.5 - k * 0.09, 0.03, 0.5, 0xe6dcc0, -6.6, LY + 1.0 + k * 0.1, 3.2, k * 0.5);
  // easel with the panel, and the stool he never sits on
  for (const [ox, rz] of [[-0.42, 0.13], [0.42, -0.13]]) B.cyl(0.04, 0.04, 2.3, 0x6a4a2a, 2.7 + ox, LY, -1.0, 5, undefined, undefined, 0, rz);
  B.cyl(0.04, 0.04, 2.3, 0x6a4a2a, 3.0, LY, -0.4, 5, undefined, undefined, 0.3, 0);
  B.box(0.06, 1.25, 0.86, 0x2c2a1c, 2.68, LY + 0.85, -1.0, -0.5);
  B.box(0.05, 1.1, 0.72, (x, y) => mix(0x3a3a24, 0xb8a878, clamp(0.5 - Math.abs(y) * 1.4)), 2.63, LY + 0.92, -1.02, -0.5, { emissive: 0.12 });
  B.cyl(0.26, 0.3, 0.55, 0x5a4026, 3.6, LY, 0.3, 8);
  // workbenches covered in his distractions
  for (const [tx, tz] of [[-5.4, 3.6], [5.2, 4.2], [-5.6, -2.2]]) {
    B.box(3.0, 0.12, 1.3, 0x7a5a36, tx, LY + 0.85, tz);
    for (const [ox, oz] of [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]]) B.box(0.12, 0.85, 0.12, 0x5a4026, tx + ox, LY, tz + oz);
    world.colliders.push({ x: tx, z: tz, hw: 1.55, hd: 0.7, ry: 0, top: LY + 1.1 });
    for (let k = 0; k < 4; k++) B.box(0.5, 0.02, 0.36, 0xe8dcc0, tx - 1 + k * 0.62, LY + 0.97, tz + (R() - 0.5) * 0.5, R());
  }
  // gears, a model wing, a mirror
  B.cyl(0.7, 0.7, 0.12, 0x8a6a3a, -5.4, LY + 0.98, 3.6, 12);
  for (let k = 0; k < 12; k++) B.box(0.16, 0.12, 0.2, 0x8a6a3a, -5.4 + Math.cos((k / 12) * 6.283) * 0.76, LY + 0.98, 3.6 + Math.sin((k / 12) * 6.283) * 0.76, -(k / 12) * 6.283);
  B.cyl(0.36, 0.36, 0.12, 0xa07a40, -4.5, LY + 1.0, 3.9, 10);
  B.cyl(0.5, 0.5, 0.05, 0xc9d6d0, 5.6, LY + 1.5, 4.2, 20, { emissive: 0.5 }, undefined, 1.3, 0);
  B.box(0.08, 0.6, 0.08, 0x5a4026, 5.6, LY + 0.97, 4.2);
  world.mirror = [5.6, LY + 1.5, 4.2];
}
