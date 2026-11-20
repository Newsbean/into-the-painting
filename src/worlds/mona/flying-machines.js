import * as THREE from 'three';
import { Builder, xf } from '../../engine/build.js';

// the flying machine waits on the crag
export function buildFlyingMachine(world, kit) {
  const { B, S, soft, CX, CZ, CY } = kit;
  B.box(9, 0.3, 4, 0x7a5a36, CX, CY + 0.1, CZ);
  for (const [ox, oz] of [[-4, -1.6], [4, -1.6], [-4, 1.6], [4, 1.6]]) B.box(0.25, 1.2, 0.25, 0x5a4026, CX + ox, CY - 0.9, CZ + oz);
  const fm = new Builder();
  fm.box(0.5, 0.4, 3.4, 0x7a5a36, 0, 0, 0);
  for (const sx of [-1, 1])
    for (let k = 0; k < 5; k++) {
      const M = xf(sx * 0.3, 0.3, -0.9 + k * 0.5, 0, 1, 1, 1, 0, -sx * (0.25 + k * 0.02));
      fm.box(5.4 - k * 0.5, 0.06, 0.07, 0x5a4026, sx * (2.7 - k * 0.25), 0, 0, 0, undefined, M);
      fm.box(5.0 - k * 0.5, 0.02, 0.5, 0xe6dcc0, sx * (2.7 - k * 0.25), -0.02, 0.25, 0, { sway: 0.05 }, M);
    }
  fm.box(1.6, 0.03, 1.6, 0xe6dcc0, 0, 0.25, -2.2, Math.PI / 4);
  world.machine = fm.mesh(soft({ objSpace: 1, scale: 0.7 }));
  world.machine.position.set(CX, CY + 1.9, CZ);
  world.machine.rotation.y = -0.6;
  S.add(world.machine);
  world.crag = [CX, CY, CZ];
}

// two more of them already out over the valley
export function buildFlyers(world, kit) {
  const { S, soft } = kit;
  world.flyers = [0, 1].map((i) => {
    const fm = new Builder();
    fm.box(0.4, 0.3, 2.6, 0x7a5a36, 0, 0, 0);
    for (const sx of [-1, 1]) fm.add(new THREE.BoxGeometry(4.6, 0.04, 1.7), 0xe6dcc0, xf(sx * 2.4, 0.5, 0, 0, 1, 1, 1, 0, sx * 0.22));
    const m = fm.mesh(soft({ objSpace: 1, scale: 0.7 }));
    S.add(m);
    return { m, r: 90 + i * 70, y: 52 + i * 16, sp: 0.09 - i * 0.03, ph: i * 2.4, cx: 20 - i * 60, cz: -130 };
  });
}

export function tickFlyers(world, time) {
  for (const f of world.flyers) {
    const a = time * f.sp + f.ph;
    f.m.position.set(f.cx + Math.cos(a) * f.r, f.y + Math.sin(a * 2.3) * 5, f.cz + Math.sin(a) * f.r);
    f.m.rotation.set(0, -a, Math.sin(a * 2.3) * 0.2 - 0.25);
  }
}
