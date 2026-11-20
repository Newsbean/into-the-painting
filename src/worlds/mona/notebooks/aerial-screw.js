import * as THREE from 'three';
import { Builder, gridGeo, mix, xf } from '../../../engine/build.js';
import { lerp } from '../../../engine/gl.js';
import { rod, disc, person } from '../helpers.js';
import { TIMBER, DARK, LINEN, stoneC, woodC } from '../palette.js';
import { LEO } from './layout.js';

// ================= the aerial screw: a linen helix on a round stage, turning
export function buildAerialScrew(world, kit) {
  const { S, maps, soft, Q, C, PL, LB, LP, span } = kit;
  const [ax, az] = LEO.screw;
  const g = span(ax, az, 7);
  const y0 = g.hi + 0.55,
    base = g.lo - 1;
  LB.cyl(6.6, 7, y0 - 0.03 - base, stoneC, ax, base, az, 20);
  disc(LB, 0.3, 6.45, y0, 28, (j) => mix(j & 1 ? 0x7c5c38 : 0x8e6c44, 0x5a4026, Q() * 0.35), xf(ax, 0, az));
  LB.add(new THREE.TorusGeometry(6.5, 0.14, 5, 28), DARK, xf(ax, y0 + 0.05, az, 0, 1, 1, 1, Math.PI / 2));
  for (let k = 0; k < 3; k++) LB.box(0.5, y0 - 0.16 - k * 0.17 - base, 2.6, stoneC, ax + 7 + k * 0.45, base, az);
  const AS = new Builder();
  AS.cyl(0.16, 0.22, 9.2, woodC, 0, 0, 0, 7);
  AS.add(new THREE.TorusGeometry(2.4, 0.07, 5, 22), DARK, xf(0, 1.0, 0, 0, 1, 1, 1, Math.PI / 2));
  for (let k = 0; k < 2; k++) AS.box(5.6, 0.12, 0.12, TIMBER, 0, 0.94, 0, (k * Math.PI) / 2);
  const turns = 2.2,
    rows = 66;
  const hel = (u, v) => {
    const a = u * turns * 6.2832,
      r = lerp(0.2, lerp(4.9, 1.5, Math.pow(u, 1.15)), v);
    return [Math.cos(a) * r, 2.7 + u * 5.9 - v * (1 - u * 0.6), Math.sin(a) * r];
  };
  AS.parts.push(gridGeo(rows, 2, hel, (u, v, i) => mix(LINEN, 0xc8bc9c, i % 6 === 0 ? 0.7 : Q() * 0.3), { sway: 0.04 }));
  for (let i = 0; i < rows; i += 2) rod(AS, hel(i / rows, 1), hel((i + 2) / rows, 1), 0.05, DARK, 4);
  for (let i = 0; i <= rows; i += 6) rod(AS, hel(i / rows, 0), hel(i / rows, 1), 0.04, TIMBER, 4);
  for (let k = 0; k < 4; k++) rod(AS, [0, 9.1, 0], hel(k / 4 / turns, 1), 0.02, 0x3a2a1c, 3);
  world.airscrew = AS.mesh(soft({ objSpace: 1, scale: 0.7, side: THREE.DoubleSide }));
  world.airscrew.position.set(ax, y0, az);
  S.add(world.airscrew);
  C.push({ x: ax, z: az, r: 0.5, top: y0 + 9.3 });
  PL.push({ minx: ax - 4.6, maxx: ax + 4.6, minz: az - 4.6, maxz: az + 4.6, y: y0 });
  maps.blob(ax, az, 8, 0.4);
  person(LP, xf(ax + 5.2, y0, az + 2.4, -1.2), { robe: 0x6a4a2a, hands: [[-0.1, 0.5, 0.2], [0.08, -0.5, 0.1]], nod: -0.4 });
}

export function tickAerialScrew(world, time) {
  world.airscrew.rotation.y = time * 0.4;
}
