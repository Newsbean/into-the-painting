import * as THREE from 'three';
import { paintMaterial } from '../../engine/paint.js';
import { Builder, cypress, blobTree, mix, jitter } from '../../engine/build.js';
import { rng, vnoise } from '../../engine/gl.js';
import { CENTER, riverAt } from './terrain.js';
import { townWeight } from './town/layout.js';
import { drape, haystack } from './helpers.js';
import { Kit } from './town/kit.js';
import { house, randomStyle } from './town/house.js';

// ---------------- the countryside beyond the old fields, out to the foot of the mountains
//
// Strips of crop, windbreaks of cypress, olive groves, haystacks, lit farms: one plot to a
// cell of a staggered grid, so nothing touches. Nothing is set down where the town, the
// river, a road or a landmark is. The land is cut into eight sectors round its middle so
// that what is behind the camera is not drawn; a farm's fine detail only shows close by.
export function outskirts(world, { S, H, maps, strokes, mats, nearRoad, nearTrack, inKeep }) {
  const R = rng(1890);
  const STRIP = [0x6a58c8, 0xd9b63a, 0x3f8f4a, 0x2f8f8a, 0xa8502a, 0x8fb84a, 0x7a4a9a, 0xc9a437, 0x4a9a6a, 0x5a78d0];
  const SEQ = ['strips', 'wind', 'strips', 'farm', 'strips', 'grove', 'hay', 'strips', 'wind', 'strips'];
  const OLIVE_LO = [0x163a5c, 0x1b4a4a, 0x1f3f70],
    OLIVE_HI = [0x3f86a8, 0x4a9a86, 0x4f78c0];
  const N = 8;
  const sectors = Array.from({ length: N }, () => ({ GP: new Builder(), T: new Builder(), P: new Builder(), kit: new Kit(mats), sx: 0, sz: 0, n: 0 }));
  const sectorOf = (x, z) => {
    const s = sectors[Math.min(N - 1, Math.floor(((Math.atan2(z - CENTER[1], x - CENTER[0]) + Math.PI) / (2 * Math.PI)) * N))];
    s.sx += x;
    s.sz += z;
    s.n++;
    return s;
  };
  const busy = (x, z) => Math.hypot(x, z) < 198 || townWeight(x, z, 44) > 0.02 || inKeep(x, z, 16) || nearRoad(x, z, 14) || nearTrack(x, z, 14) || !!riverAt(x, z);
  const solid = (x, z, r, top) => world.colliders.push({ x, z, r, top });

  let row = 0,
    kind = 0,
    plots = 0,
    farms = 0;
  for (let gz = CENTER[1] - 520; gz <= CENTER[1] + 520; gz += 40, row++)
    for (let gx = CENTER[0] - 520 + (row % 2) * 22; gx <= CENTER[0] + 520; gx += 44) {
      const x = gx + (R() - 0.5) * 10,
        z = gz + (R() - 0.5) * 8;
      const dc = Math.hypot(x - CENTER[0], z - CENTER[1]);
      if (dc > 505 || busy(x, z)) continue;
      const ry = (R() < 0.5 ? Math.PI / 2 : 0) + (R() - 0.5) * 0.24,
        c = Math.cos(ry),
        s = Math.sin(ry);
      const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      const sec = sectorOf(x, z);
      const k = dc > 445 ? (R() < 0.55 ? 'grove' : 'strips') : SEQ[kind++ % SEQ.length];
      plots++;
      if (k === 'strips' || k === 'wind') {
        const n = 3 + ((R() * 3) | 0),
          wid = 31 / n,
          c0 = (R() * STRIP.length) | 0;
        for (let i = 0; i < n; i++) {
          const col = STRIP[(c0 + i * 3) % STRIP.length],
            col2 = jitter(col, R, 0.2),
            lx = (i - (n - 1) / 2) * wid;
          sec.GP.parts.push(drape(H, ...at(lx, 0), ry, 30, wid - 0.5, (a, b) => mix(col, col2, vnoise(a * 0.9 + i * 7, b * 3.1 + x)), { lift: 0.24, step: 3.3, cols: 2 }));
        }
        if (k === 'wind') {
          // a windbreak of cypresses down one side
          const m = 5 + ((R() * 4) | 0);
          for (let i = 0; i < m; i++) {
            const [tx, tz] = at(-17.5, -14 + i * 3.7 + (R() - 0.5));
            const h = 8 + R() * 7,
              y = H(tx, tz);
            cypress(sec.T, tx, y - 0.5, tz, h, 1.1 + R() * 0.5, R, { flames: 1 });
            solid(tx, tz, 0.8, y + h * 0.7);
            maps.blob(tx, tz, 3, 0.4);
          }
        }
      } else if (k === 'grove') {
        // olives in rows
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++) {
            if (R() < 0.2) continue;
            const [tx, tz] = at(-10 + i * 10 + (R() - 0.5) * 2.4, -10 + j * 10 + (R() - 0.5) * 2.4);
            const r = 2.8 + R() * 1.6;
            blobTree(sec.T, tx, H(tx, tz), tz, r * 1.5, r, R, { lo: OLIVE_LO[(R() * 3) | 0], hi: OLIVE_HI[(R() * 3) | 0], blobs: 1 + (R() < 0.4 ? 1 : 0) });
            maps.blob(tx, tz, r * 1.5, 0.42);
          }
      } else if (k === 'hay') {
        sec.GP.parts.push(drape(H, x, z, ry, 30, 30, () => mix(0xc9a437, 0xe8cc5a, R()), { lift: 0.24, step: 3.4, cols: 4 }));
        const n = 3 + ((R() * 3) | 0);
        for (let i = 0; i < n; i++) {
          const [hx, hz] = at((R() - 0.5) * 24, (R() - 0.5) * 24);
          const r = 1.6 + R() * 0.9,
            h = 2.6 + R() * 1.6,
            y = H(hx, hz);
          haystack(sec.P, hx, y, hz, r, h, R);
          solid(hx, hz, r * 0.95, y + h);
          maps.blob(hx, hz, r * 2.2, 0.45);
        }
      } else {
        // a farm: the house, a barn at right angles to it, a cypress, a stack in the yard
        farms++;
        const w = 9 + R() * 4,
          d = 7 + R() * 2;
        const res = house(sec.kit, world, { x, z, ry, w, d, floors: 1 + ((R() * 1.7) | 0), R, style: randomStyle(R, { wallMat: R() < 0.75 ? 'stone' : 'plaster', balcony: false, quoins: false, slate: R() < 0.25 }), shop: false, gableFront: false, open: { left: true, right: true }, lit: 0.5, lantern: true });
        world.colliders.push({ x, z, hw: w / 2 + 0.1, hd: d / 2 + 0.1, ry, top: H(x, z) + res.top });
        maps.blob(x, z, w, 0.4);
        const [bx, bz] = at(-w / 2 - 5.5, -d / 2 - 2);
        const bw = 6 + R() * 2;
        const rb = house(sec.kit, world, { x: bx, z: bz, ry: ry + Math.PI / 2, w: bw, d: 6, floors: 1, R, style: randomStyle(R, { wallMat: 'stone', shutters: false, balcony: false, quoins: false, dormers: false, attic: false, slate: false }), shop: false, gableFront: true, open: { left: true, right: true }, lit: 0.15, lantern: false });
        world.colliders.push({ x: bx, z: bz, hw: bw / 2 + 0.1, hd: 3.1, ry: ry + Math.PI / 2, top: H(bx, bz) + rb.top });
        const [tx, tz] = at(w / 2 + 3.5, -d / 2 - 1);
        const h = 10 + R() * 6;
        cypress(sec.T, tx, H(tx, tz) - 0.5, tz, h, 1.3, R, { flames: 1 });
        solid(tx, tz, 0.9, H(tx, tz) + h * 0.7);
        const [hx, hz] = at(2, d / 2 + 6.5);
        haystack(sec.P, hx, H(hx, hz), hz, 1.8, 3, R);
        solid(hx, hz, 1.7, H(hx, hz) + 3);
      }
    }

  const treeMat = paintMaterial({ stroke: strokes.wavy, scale: 0.16, contrast: 0.7, hueVar: 0.8, warp: 0.5, accent: 0xb9d06a, accentAmt: 0.3, impasto: 0.16, rim: 0.3, band: 0.26, wallStretch: 0.5, angle: 1.57 });
  const fieldMat = paintMaterial({ stroke: strokes.oil, scale: 0.07, contrast: 0.6, hueVar: 0.55, warp: 0.9, accent: 0xf6e9a0, accentAmt: 0.25, impasto: 0.14, rim: 0.05, band: 0.3, side: THREE.DoubleSide });
  const smallMat = paintMaterial({ stroke: strokes.dab, scale: 0.6, contrast: 0.35, hueVar: 0.5, warp: 0.1, rim: 0.3, band: 0.25 });
  const add = (builder, mat) => {
    if (!builder.parts.length) return;
    const m = builder.mesh(mat);
    m.geometry.computeBoundingSphere();
    m.frustumCulled = true;
    S.add(m);
  };
  const details = [];
  for (const sec of sectors) {
    add(sec.GP, fieldMat);
    add(sec.T, treeMat);
    add(sec.P, smallMat);
    const b = sec.kit.build();
    S.add(b.base, b.detail);
    if (sec.n) details.push({ detail: b.detail, x: sec.sx / sec.n, z: sec.sz / sec.n });
  }
  console.log('starry: outskirts', plots, 'plots,', farms, 'farms');
  return {
    tick(cam) {
      for (const d of details) d.detail.visible = Math.hypot(cam.x - d.x, cam.z - d.z) < 330;
    },
  };
}
