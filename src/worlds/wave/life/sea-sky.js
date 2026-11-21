// What moves over the water: skeins of cranes crossing the bay, gulls wheeling over the
// fishing grounds, and coasters under sail working along the shore.
import * as THREE from 'three';
import { Builder, xf } from '../../../engine/build.js';
import { rng } from '../../../engine/gl.js';
import { birdFlocks, skein, wheel } from '../../../engine/flock.js';
import { weld } from '../../../engine/weld.js';
import { rod } from '../helpers.js';
import { person } from '../figures.js';

// ---------------------------------------------------------------- birds
// (how a bird is drawn and flies is engine/flock.js; here is only who flies where)
export function addBirds(world, { S }) {
  const R = rng(905);
  return birdFlocks(S, R, [
    { kind: 'crane', birds: [...skein(11, { cx: -40, cy: 62, cz: 140, rx: 215, rz: 150, w: 0.055, ph: 0.4 }), ...skein(7, { cx: 60, cy: 84, cz: 60, rx: 260, rz: 210, w: -0.04, ph: 2.6 })] },
    { kind: 'gull', birds: [...wheel(R, 8, 10, 15, 172, 22), ...wheel(R, 7, -64, 13, 142, 18), ...wheel(R, 8, -330, 17, 192, 28), ...wheel(R, 6, 150, 14, 150, 20), ...wheel(R, 6, 20, 20, 40, 30)] },
  ]);
}

// ---------------------------------------------------------------- boats under sail
// a small coaster running before the wind, drawn lying along +x
function coaster(B, striped) {
  const L = 11,
    wood = 0xd9c690,
    dark = 0x8a6a48,
    timber = 0x4a3526;
  B.box(L * 0.72, 1.1, 2.6, wood, 0, -0.2, 0);
  B.box(L * 0.72, 0.16, 2.8, dark, 0, 0.9, 0);
  for (const sgn of [-1, 1]) B.add(new THREE.CylinderGeometry(0.03, 1.4, L * 0.34, 4, 1), wood, xf(sgn * L * 0.5, 0.85, 0, 0, 0.62, 1, 1, 0, -sgn * (Math.PI / 2 - 0.32)));
  B.box(2.4, 1.0, 2.2, 0xb89668, -L * 0.24, 1.0, 0);
  B.gable(2.2, 2.9, 0.45, 0x4a5a72, -L * 0.24, 2.0, 0, Math.PI / 2);
  rod(B, [0.6, 0.9, 0], [0.6, 9.2, 0], 0.13, 0.08, timber, 5);
  rod(B, [0.6, 8.6, -3.1], [0.6, 8.6, 3.1], 0.07, 0.07, timber, 4);
  // the sail: one tall sheet bellied by the wind, in panels
  const sail = new THREE.BoxGeometry(0.06, 6.6, 5.8, 1, 6, 8);
  const P = sail.attributes.position;
  for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) + 0.75 * Math.cos((P.getZ(i) / 5.8) * Math.PI) * Math.sin((P.getY(i) / 6.6 + 0.5) * Math.PI));
  sail.computeVertexNormals();
  B.add(sail, (x, y, z) => new THREE.Color(striped && Math.abs(Math.abs(z) - 1.5) < 0.42 ? 0x2f548a : Math.abs(((z + 2.9) % 1.45) - 0.72) > 0.68 ? 0xcfc7ae : 0xf3ecd8), xf(0.72, 5.15, 0), { sway: 0.5 });
  person(B, -1.2, 1.05, 0.5, 1.2, { pose: 'sit', coat: 0x2f548a, hat: 'cone' });
  person(B, 3.1, 1.05, -0.4, -1.5, { pose: 'sit', coat: 0x7f9aa8, hat: 'cone' });
}

export function addSailBoats(world, { S, flat }) {
  const mat = flat({ scale: 0.25 });
  const geo = [false, true].map((striped) => {
    const B = new Builder();
    coaster(B, striped);
    return weld(B.geometry());
  });
  // each beats up and down its own stretch of water: [centre x, z, reach in x, in z, turns per second, where it starts]
  const runs = [
    [185, 165, 40, 13, 0.021, 0.0],
    [-190, 164, 45, 13, -0.019, 2.0],
    [60, -330, 150, 40, 0.008, 1.0],
    [-322, 128, 58, 28, 0.017, 4.0],
    [262, 40, 28, 70, -0.014, 3.0],
    [-250, -160, 70, 50, 0.012, 5.2],
  ];
  const boats = runs.map((r, i) => ({ r, kind: i % 2 }));
  const ims = geo.map((g, k) => {
    const im = new THREE.InstancedMesh(g, mat, boats.filter((b) => b.kind === k).length);
    im.frustumCulled = false;
    S.add(im);
    return im;
  });
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    p = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1);
  return {
    tick(dt, time) {
      const n = [0, 0];
      for (const b of boats) {
        const [cx, cz, rx, rz, w, ph] = b.r;
        const th = time * w + ph,
          vx = -rx * Math.sin(th) * w,
          vz = rz * Math.cos(th) * w;
        e.set(Math.sin(time * 0.7 + ph) * 0.05, Math.atan2(-vz, vx), Math.cos(time * 0.6 + ph) * 0.04, 'YXZ');
        ims[b.kind].setMatrixAt(n[b.kind]++, m4.compose(p.set(cx + rx * Math.cos(th), Math.sin(time * 0.8 + ph) * 0.35 - 0.1, cz + rz * Math.sin(th)), q.setFromEuler(e), one));
      }
      for (const im of ims) im.instanceMatrix.needsUpdate = true;
    },
  };
}
