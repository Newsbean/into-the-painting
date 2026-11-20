import * as THREE from 'three';
import { Builder, xf } from '../../../engine/build.js';
import { Quads, rod, person } from '../helpers.js';
import { DARK } from '../palette.js';

// ================= the pyramid parachute, and someone trusting it
export function buildParachute(world, kit) {
  const { S, soft } = kit;
  const PB = new Builder(),
    pq = new Quads();
  const hw = 3.6,
    top = [0, 6.2, 0];
  const cn = [[-hw, 0, -hw], [hw, 0, -hw], [hw, 0, hw], [-hw, 0, hw]];
  for (let k = 0; k < 4; k++) {
    const a = cn[k],
      b = cn[(k + 1) % 4];
    const m = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
    pq.tri(a, top, m, k & 1 ? 0xe6dcc0 : 0xdcd0b0);
    pq.tri(m, top, b, k & 1 ? 0xd6caa8 : 0xeae1c8);
    rod(PB, a, top, 0.06, DARK, 4);
    rod(PB, a, b, 0.06, DARK, 4);
    rod(PB, a, [a[0] < 0 ? -0.28 : 0.28, -5.0, 0], 0.025, 0x3a2a1c, 3);
  }
  PB.parts.push(pq.geometry({ sway: 0.03 }));
  person(PB, xf(0, -7, 0), { robe: 0x7a3a2a, hands: [[-0.03, 0.62, 0.02], [0.03, 0.62, 0.02]], nod: -0.3 });
  world.chute = PB.mesh(soft({ objSpace: 1, scale: 0.7, side: THREE.DoubleSide }));
  S.add(world.chute);
}

export function tickParachute(world, time) {
  const pa = time * 0.03;
  world.chute.position.set(-72 + Math.cos(pa) * 62, 50 + Math.sin(pa * 2 + 1) * 9, 52 + Math.sin(pa) * 40);
  world.chute.rotation.set(Math.cos(time * 0.53) * 0.07, pa * 0.6, Math.sin(time * 0.7) * 0.09);
}
