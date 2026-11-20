import * as THREE from 'three';
import { xf } from '../../engine/build.js';
import { VERM, INK } from './palette.js';

// ====================================================================
// The land behind the wave is built from Hokusai's other prints: the
// rest of the Thirty-Six Views, the waterfalls, the bridges. What
// follows are the small pieces those scenes are assembled from.
// ====================================================================
// (Here: rod, beam and the torii gate. The people and animals are in figures.js,
// the trees in plants.js, the colours in palette.js, the routes in ground-plan.js.)

const _up = new THREE.Vector3(0, 1, 0);
// a tapered open tube from point a (radius r0) to point b (radius r1)
export function rod(B, a, b, r0, r1, col, seg = 4, data, M) {
  const va = new THREE.Vector3(a[0], a[1], a[2]),
    vb = new THREE.Vector3(b[0], b[1], b[2]);
  const d = vb.clone().sub(va);
  const L = d.length() || 0.001;
  const q = new THREE.Quaternion().setFromUnitVectors(_up, d.normalize());
  const m = new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  B.add(new THREE.CylinderGeometry(r1, r0, L, seg, 1, true), col, M ? M.clone().multiply(m) : m, data);
}
// a squared timber from a to b: w across, h upright
export function beam(B, a, b, w, h, col, data, M) {
  const va = new THREE.Vector3(a[0], a[1], a[2]),
    vb = new THREE.Vector3(b[0], b[1], b[2]);
  const zz = vb.clone().sub(va);
  const L = zz.length() || 0.001;
  zz.normalize();
  const xx = new THREE.Vector3(0, 1, 0).cross(zz);
  if (xx.lengthSq() < 1e-6) xx.set(1, 0, 0);
  xx.normalize();
  const yy = zz.clone().cross(xx);
  const m = new THREE.Matrix4().makeBasis(xx, yy, zz).setPosition(va.add(vb).multiplyScalar(0.5));
  B.add(new THREE.BoxGeometry(w, h, L), col, M ? M.clone().multiply(m) : m, data);
}

export function toriiGate(B, x, y, z, ry, s = 1) {
  const M = xf(x, y, z, ry, s, s, s);
  for (const sx of [-1, 1]) {
    rod(B, [sx * 1.15, -0.5, 0], [sx * 1.05, 2.9, 0], 0.13, 0.11, VERM, 5, undefined, M);
    B.box(0.36, 0.34, 0.36, INK, sx * 1.15, -0.12, 0, 0, undefined, M);
  }
  B.box(2.5, 0.16, 0.14, VERM, 0, 2.2, 0, 0, undefined, M);
  B.box(3.1, 0.2, 0.2, VERM, 0, 2.85, 0, 0, undefined, M);
  B.box(3.4, 0.12, 0.3, INK, 0, 3.05, 0, 0, undefined, M);
}
