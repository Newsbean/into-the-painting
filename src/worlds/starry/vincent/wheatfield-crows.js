import * as THREE from 'three';
import { paintMaterial } from '../../../engine/paint.js';
import { smooth } from '../../../engine/gl.js';

// ---- Wheatfield with Crows: the forked tracks are laid above; here are the birds overhead (see tick)
export function wheatfieldCrows(world, { S, H, strokes, R }) {
  const [wx, wz] = world.wheat;
  const NC = 38,
    nv = NC * 24;
  const cg = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  const nrm = new Float32Array(nv * 3),
    col = new Float32Array(nv * 3),
    dat = new Float32Array(nv * 4);
  for (let i = 0; i < nv; i++) {
    nrm[i * 3 + 1] = 1;
    col.set([0.035, 0.04, 0.075], i * 3);
    dat[i * 4 + 3] = 1;
  }
  cg.setAttribute('position', pos);
  cg.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  cg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  cg.setAttribute('aData', new THREE.BufferAttribute(dat, 4));
  world.crowMesh = new THREE.Mesh(cg, paintMaterial({ stroke: strokes.dab, scale: 1.2, contrast: 0.2, hueVar: 0.2, rim: 0.04, band: 0.3, side: THREE.DoubleSide }));
  world.crowMesh.frustumCulled = false;
  world.crows = Array.from({ length: NC }, () => ({ r: 6 + R() * 26, a: R() * 6.283, w: (0.2 + R() * 0.22) * (R() < 0.75 ? 1 : -1), y: 5.5 + R() * 11, ph: R() * 6.283, s: 0.8 + R() * 0.5, e: 0.7 + R() * 0.5 }));
  world.crowHome = [wx - 6, H(wx, wz), wz];
  flyCrows(world, 0);
  S.add(world.crowMesh);
}

// the crows: one mesh, every bird rewritten each frame as it wheels and beats over the corn
export function flyCrows(world, t) {
  const attr = world.crowMesh.geometry.attributes.position,
    a = attr.array;
  const [cx, cy, cz] = world.crowHome;
  let o = 0;
  const put = (x, y, z) => {
    a[o++] = x;
    a[o++] = y;
    a[o++] = z;
  };
  for (const c of world.crows) {
    const ang = c.a + t * c.w,
      rad = c.r + Math.sin(t * 0.21 + c.ph) * 4,
      dir = Math.sign(c.w);
    const x = cx + Math.cos(ang) * rad * 1.3,
      z = cz + Math.sin(ang) * rad * 0.85,
      y = cy + c.y + Math.sin(t * 0.5 + c.ph * 2) * 1.4;
    // heading along the ellipse, wings out to either side
    let fx = -Math.sin(ang) * 1.3 * dir,
      fz = Math.cos(ang) * 0.85 * dir;
    const fl = Math.hypot(fx, fz);
    fx /= fl;
    fz /= fl;
    const s = c.s,
      rx = fz * s,
      rz = -fx * s;
    fx *= s;
    fz *= s;
    // a few beats, then a glide
    const beat = 0.25 + 0.75 * smooth(-0.2, 0.5, Math.sin(t * 0.6 + c.ph * 3));
    const wa = Math.sin(t * 7.5 * c.e + c.ph) * 0.75 * beat + 0.12;
    const my = Math.sin(wa) * 0.62 * s,
      ty = my + Math.sin(wa * 1.4 - 0.4) * 0.5 * s;
    put(x + fx * 0.5, y, z + fz * 0.5);
    put(x - rx * 0.12, y, z - rz * 0.12);
    put(x + rx * 0.12, y, z + rz * 0.12);
    put(x - fx * 0.55, y, z - fz * 0.55);
    put(x + rx * 0.12, y, z + rz * 0.12);
    put(x - rx * 0.12, y, z - rz * 0.12);
    for (const g of [-1, 1]) {
      const ax = x + rx * 0.1 * g,
        az = z + rz * 0.1 * g,
        mx = x + rx * 0.62 * g,
        mz = z + rz * 0.62 * g;
      const tx = x + rx * 1.15 * g - fx * 0.12,
        tz = z + rz * 1.15 * g - fz * 0.12;
      put(ax + fx * 0.22, y, az + fz * 0.22);
      put(ax - fx * 0.18, y, az - fz * 0.18);
      put(mx - fx * 0.22, y + my, mz - fz * 0.22);
      put(ax + fx * 0.22, y, az + fz * 0.22);
      put(mx - fx * 0.22, y + my, mz - fz * 0.22);
      put(mx + fx * 0.2, y + my, mz + fz * 0.2);
      put(mx + fx * 0.2, y + my, mz + fz * 0.2);
      put(mx - fx * 0.22, y + my, mz - fz * 0.22);
      put(tx, y + ty, tz);
    }
  }
  attr.needsUpdate = true;
}
