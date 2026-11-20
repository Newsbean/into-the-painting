import * as THREE from 'three';
import { Builder, mix, xf } from '../../../engine/build.js';
import { clamp } from '../../../engine/gl.js';
import { rod, person } from '../helpers.js';
import { TIMBER, DARK, woodC } from '../palette.js';
import { RIV, canalP } from './layout.js';

// ================= the paddle boat, cranked up and down the reach below the bridge
export function buildPaddleBoat(world, kit) {
  const { S, soft } = kit;
  const BT = new Builder();
  const hull = new THREE.IcosahedronGeometry(1, 1);
  const hp = hull.attributes.position;
  for (let k = 0; k < hp.count; k++) if (hp.getY(k) > 0.12) hp.setY(k, 0.12);
  hull.computeVertexNormals();
  BT.add(hull, (x, y) => mix(0x5a4026, 0x8e6c40, clamp(y + 0.9)), xf(0, 0, 0, 0, 3.9, 0.9, 1.2));
  const rim = (k) => [Math.cos((k / 14) * 6.2832) * 3.86, 0.2, Math.sin((k / 14) * 6.2832) * 1.18];
  for (let k = 0; k < 14; k++) rod(BT, rim(k), rim(k + 1), 0.055, DARK, 4);
  BT.box(0.35, 0.3, 1.7, TIMBER, -1.3, 0.1, 0);
  BT.box(0.5, 0.75, 0.5, woodC, 0.3, 0.1, 0);
  BT.cyl(0.5, 0.5, 0.1, 0x8a6a3a, 0.3, 0.9, -0.05, 12, undefined, undefined, Math.PI / 2, 0);
  BT.box(0.75, 0.75, 0.06, DARK, -4.05, -0.5, 0);
  rod(BT, [3.7, 0.1, 0], [4.25, 0.85, 0], 0.07, DARK, 4, 0.05);
  person(BT, xf(-1.25, 0.12, 0, Math.PI / 2), { pose: 'sit', robe: 0x3a557e, hair: 0x4a3422, hands: [[-0.05, -0.1, 0.5], [0.05, -0.1, 0.5]] });
  const WB = new Builder();
  WB.cyl(0.07, 0.07, 3.9, DARK, 0, 0, -1.95, 6, undefined, undefined, Math.PI / 2, 0);
  for (const side of [-1, 1]) {
    const wz = side * 1.62;
    for (const o of [-0.22, 0.22]) WB.add(new THREE.TorusGeometry(0.95, 0.04, 4, 14), DARK, xf(0, 0, wz + o));
    for (let k = 0; k < 8; k++) {
      const RZ = xf(0, 0, 0, 0, 1, 1, 1, 0, (k * Math.PI) / 4);
      if (k < 4) WB.box(0.07, 1.9, 0.07, TIMBER, 0, -0.95, wz, 0, undefined, RZ);
      WB.box(0.05, 0.36, 0.5, woodC, 0, 0.75, wz, 0, undefined, RZ);
    }
  }
  const mat = soft({ objSpace: 1, scale: 0.8 });
  world.boat = new THREE.Group();
  world.boat.add(BT.mesh(mat));
  world.boatWheels = WB.mesh(mat);
  world.boatWheels.position.set(0.3, 0.45, 0);
  world.boat.add(world.boatWheels);
  S.add(world.boat);
}

export function tickPaddleBoat(world, time) {
  const ba = time * 0.05,
    vs = -22 * Math.sin(ba),
    vd = 3.2 * Math.cos(ba);
  const bp = canalP(48 + 22 * Math.cos(ba), 3.2 * Math.sin(ba));
  world.boat.position.set(bp[0], world.waterY + 0.38 + Math.sin(time * 1.3) * 0.04, bp[1]);
  world.boat.rotation.set(Math.sin(time * 0.9) * 0.03, Math.atan2(-(RIV.uz * vs + RIV.ux * vd), RIV.ux * vs - RIV.uz * vd), 0);
  world.boatWheels.rotation.z = -time * 1.2;
}
